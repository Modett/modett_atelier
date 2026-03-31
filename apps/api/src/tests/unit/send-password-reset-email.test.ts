import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest'
import { sendPasswordResetEmail } from '../../lib/sendPasswordResetEmail'

describe('sendPasswordResetEmail', () => {
  const originalKey   = process.env.RESEND_API_KEY
  const originalFrom  = process.env.RESEND_FROM
  const originalFetch = globalThis.fetch

  beforeEach(() => {
    delete process.env.RESEND_API_KEY
    delete process.env.RESEND_FROM
  })

  afterEach(() => {
    process.env.RESEND_API_KEY = originalKey
    process.env.RESEND_FROM = originalFrom
    globalThis.fetch = originalFetch
    vi.restoreAllMocks()
  })

  it('returns RESEND_NOT_CONFIGURED when RESEND_API_KEY is missing', async () => {
    const result = await sendPasswordResetEmail({
      to: 'user@example.com',
      resetUrl: 'http://localhost:3000/auth/reset-password?token=abc',
    })
    expect(result.sent).toBe(false)
    expect(result.reason).toBe('RESEND_NOT_CONFIGURED')
  })

  it('returns RESEND_NOT_CONFIGURED when key does not look like a Resend key', async () => {
    process.env.RESEND_API_KEY = 'not-a-resend-key'
    const result = await sendPasswordResetEmail({
      to: 'user@example.com',
      resetUrl: 'http://localhost:3000/auth/reset-password?token=abc',
    })
    expect(result.sent).toBe(false)
    expect(result.reason).toBe('RESEND_NOT_CONFIGURED')
  })

  it('calls Resend and returns sent when API responds 200', async () => {
    process.env.RESEND_API_KEY = 're_test_fake_key_for_unit_test'
    const fetchMock = vi.fn().mockResolvedValue(new Response(null, { status: 200 }))
    globalThis.fetch = fetchMock as unknown as typeof fetch

    const result = await sendPasswordResetEmail({
      to: 'user@example.com',
      resetUrl: 'http://localhost:3000/auth/reset-password?token=xyz',
    })

    expect(result.sent).toBe(true)
    expect(fetchMock).toHaveBeenCalledTimes(1)
    const [, init] = fetchMock.mock.calls[0]!
    expect(init?.method).toBe('POST')
    const body = JSON.parse((init?.body as string) ?? '{}') as {
      to: string[]
      subject: string
    }
    expect(body.to).toEqual(['user@example.com'])
    expect(body.subject).toContain('Reset')
  })
})
