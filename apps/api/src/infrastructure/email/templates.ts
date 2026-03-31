/**
 * HTML email bodies for direct Resend sends.
 */

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

// ── Contact form: notification to inbox ──────────────────

export function contactNotificationEmail({
  name,
  email,
  message,
}: {
  name: string
  email: string
  message: string
}) {
  const safeName = escapeHtml(name || '—')
  const safeEmail = escapeHtml(email)
  const safeMessage = escapeHtml(message)
  const mailHref = `mailto:${encodeURIComponent(email)}`

  return {
    subject: `New contact form message from ${name.trim() || email}`,
    html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;
                    padding:24px;color:#3D2E26;">
          <h2 style="font-size:20px;margin-bottom:16px;">
            New message via Modett contact form
          </h2>
          <table style="width:100%;border-collapse:collapse;">
            <tr>
              <td style="padding:8px 0;font-weight:600;width:80px;">Name:</td>
              <td style="padding:8px 0;">${safeName}</td>
            </tr>
            <tr>
              <td style="padding:8px 0;font-weight:600;">Email:</td>
              <td style="padding:8px 0;">
                <a href="${mailHref}" style="color:#3D2E26;">${safeEmail}</a>
              </td>
            </tr>
          </table>
          <hr style="border:none;border-top:1px solid #E5E0D8;margin:16px 0;" />
          <p style="font-weight:600;margin-bottom:8px;">Message:</p>
          <p style="line-height:1.6;white-space:pre-wrap;">${safeMessage}</p>
          <hr style="border:none;border-top:1px solid #E5E0D8;margin:16px 0;" />
          <p style="font-size:12px;color:#888;">
            Reply directly to this email to respond to the customer.
          </p>
        </div>
      `,
    text: `New contact form message\n\nFrom: ${name || '—'} (${email})\n\nMessage:\n${message}`,
  }
}

// ── Contact form: confirmation to customer ────────────────

export function contactConfirmationEmail({ name }: { name: string }) {
  const greeting = name.trim() ? `Hi ${escapeHtml(name.trim())},` : 'Hello,'
  const textGreeting = name.trim() ? `Hi ${name.trim()},` : 'Hello,'

  return {
    subject: 'We received your message — Modett',
    html: `
        <div style="font-family:sans-serif;max-width:600px;margin:0 auto;
                    padding:24px;color:#3D2E26;">
          <img src="https://modett.com/images/logo.png"
               alt="Modett" style="height:40px;margin-bottom:24px;" />
          <h2 style="font-size:20px;margin-bottom:12px;">
            Thank you for reaching out.
          </h2>
          <p style="line-height:1.6;">${greeting}</p>
          <p style="line-height:1.6;">
            We've received your message and will get back to you
            within 1–2 business days.
          </p>
          <p style="line-height:1.6;margin-top:16px;">
            In the meantime, feel free to explore our latest collection.
          </p>
          <a href="https://modett.com/collections"
             style="display:inline-block;margin-top:20px;
                    padding:12px 28px;background:#3D2E26;color:#fff;
                    text-decoration:none;font-size:13px;
                    letter-spacing:0.15em;text-transform:uppercase;">
            Shop Collection
          </a>
          <hr style="border:none;border-top:1px solid #E5E0D8;margin:32px 0 16px;" />
          <p style="font-size:12px;color:#888;line-height:1.6;">
            Modett Atelier · 345 Galle Road, Colombo 00300, Sri Lanka<br/>
            <a href="https://modett.com" style="color:#888;">modett.com</a>
          </p>
        </div>
      `,
    text: `${textGreeting}\n\nThank you for reaching out to Modett. We've received your message and will get back to you within 1-2 business days.\n\n— The Modett Team\nhttps://modett.com`,
  }
}
