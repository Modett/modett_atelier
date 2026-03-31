/**
 * Direct Resend sends — contact form and other immediate (non-queue) email.
 * Queue / outbox notifications are separate.
 */

import { Resend } from 'resend'

const apiKey = process.env.RESEND_API_KEY
const resend = apiKey?.startsWith('re_') ? new Resend(apiKey) : null

/**
 * From header for Resend. Prefer EMAIL_FROM (bare address → wrapped as Modett <…>).
 * Falls back to RESEND_FROM (full string, same as password reset).
 */
function getResendFromHeader(): string {
  const emailFrom = process.env.EMAIL_FROM?.trim()
  if (emailFrom) {
    if (emailFrom.includes('<')) return emailFrom
    return `Modett <${emailFrom}>`
  }
  const resendFrom = process.env.RESEND_FROM?.trim()
  if (resendFrom) return resendFrom
  return 'Modett <onboarding@resend.dev>'
}

/** Where contact-form staff notifications are delivered (not the sender). */
export const CONTACT_INBOX =
  process.env.EMAIL_CONTACT_INBOX?.trim() || 'hello@modett.com'

export async function sendEmail({
  to,
  subject,
  html,
  text,
  replyTo,
}: {
  to: string | string[]
  subject: string
  html: string
  text?: string
  replyTo?: string
}): Promise<void> {
  if (!resend) {
    console.error('[email] RESEND_API_KEY missing or invalid — skip send')
    throw new Error('Resend is not configured')
  }

  const { error } = await resend.emails.send({
    from: getResendFromHeader(),
    to: Array.isArray(to) ? to : [to],
    subject,
    html,
    text,
    ...(replyTo ? { replyTo } : {}),
  })

  if (error) {
    console.error('[email] Resend error:', error)
    throw new Error(error.message)
  }
}
