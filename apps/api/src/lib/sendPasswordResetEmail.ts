/**
 * Sends password reset email via Resend when RESEND_API_KEY is configured.
 * RORO. Does not throw on Resend failure — caller logs outcome.
 */

export interface SendPasswordResetEmailParams {
  to: string
  resetUrl: string
}

export interface SendPasswordResetEmailResult {
  sent: boolean
  reason?: string
}

export async function sendPasswordResetEmail({
  to,
  resetUrl,
}: SendPasswordResetEmailParams): Promise<SendPasswordResetEmailResult> {
  const apiKey = process.env.RESEND_API_KEY
  if (!apiKey?.startsWith('re_')) {
    return { sent: false, reason: 'RESEND_NOT_CONFIGURED' }
  }

  const from =
    process.env.RESEND_FROM ?? 'Modett <onboarding@resend.dev>'

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({
      from,
      to: [to],
      subject: 'Reset your Modett password',
      html: `<p>You requested a password reset for your Modett account.</p>
<p><a href="${resetUrl}">Choose a new password</a></p>
<p>This link expires in one hour. If you did not request a reset, you can ignore this email.</p>`,
    }),
  })

  if (!res.ok) {
    const text = await res.text()
    console.error('[sendPasswordResetEmail] Resend error', res.status, text)
    return { sent: false, reason: 'RESEND_API_ERROR' }
  }

  return { sent: true }
}
