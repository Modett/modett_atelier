/**
 * Renders campaign.content_json into a single HTML email document.
 * Escapes dynamic text for safe insertion into HTML.
 */

import type { CampaignContent } from '@modett/types'

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
}

function formatBodyForEmail(body: string): string {
  return escapeHtml(body).replace(/\n/g, '<br/>')
}

export function renderCampaignEmail(content: CampaignContent): string {
  const subject = escapeHtml(content.subject || '')
  const preheader = content.preheader ? escapeHtml(content.preheader) : ''
  const heading = escapeHtml(content.heading || '')
  const bodyHtml = formatBodyForEmail(content.body || '')
  const heroImageUrl = content.heroImageUrl?.trim() ?? ''
  const heroVideoUrl = content.heroVideoUrl?.trim() ?? ''
  const ctaLabel = content.ctaLabel?.trim() ?? ''
  const ctaUrl = content.ctaUrl?.trim() ?? ''
  const footerNote = content.footerNote ? escapeHtml(content.footerNote) : ''

  const preheaderBlock = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;mso-hide:all;">${preheader}</div>`
    : ''

  const heroImageBlock =
    heroImageUrl !== ''
      ? `<tr>
                <td style="padding:0;">
                  <img src="${escapeHtml(heroImageUrl)}" alt="" width="600"
                       style="display:block;width:100%;max-width:600px;
                              height:auto;border:0;" />
                </td>
              </tr>`
      : ''

  const heroVideoBlock =
    heroVideoUrl !== '' && heroImageUrl === ''
      ? `<tr>
                <td align="center" style="padding:0;">
                  <a href="${escapeHtml(heroVideoUrl)}" target="_blank"
                     style="display:block;text-decoration:none;">
                    <div style="background:#1A1914;padding:60px 40px;text-align:center;">
                      <p style="margin:0;color:#FAFAF8;font-size:14px;
                           letter-spacing:0.15em;text-transform:uppercase;">
                        ▶ Watch the video
                      </p>
                    </div>
                  </a>
                </td>
              </tr>`
      : ''

  const ctaBlock =
    ctaLabel !== '' && ctaUrl !== ''
      ? `<table cellpadding="0" cellspacing="0" border="0">
                    <tr>
                      <td style="background-color:#3D2E26;">
                        <a href="${escapeHtml(ctaUrl)}"
                           style="display:inline-block;padding:14px 32px;
                                  font-family:Arial,sans-serif;font-size:12px;
                                  letter-spacing:0.2em;text-transform:uppercase;
                                  color:#FAFAF8;text-decoration:none;">
                          ${escapeHtml(ctaLabel)}
                        </a>
                      </td>
                    </tr>
                  </table>`
      : ''

  const footerNoteBlock = footerNote
    ? `<p style="margin:24px 0 0;font-size:12px;color:#8B8480;
                       line-height:1.5;">
                    ${footerNote}
                  </p>`
    : ''

  return `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <meta name="x-apple-disable-message-reformatting" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background-color:#FAFAF8;font-family:Arial,sans-serif;">
  ${preheaderBlock}
  <table width="100%" cellpadding="0" cellspacing="0" border="0"
         style="background-color:#FAFAF8;">
    <tr>
      <td align="center" style="padding:40px 20px;">
        <table width="600" cellpadding="0" cellspacing="0" border="0"
               style="max-width:600px;background-color:#FFFFFF;">

          <tr>
            <td align="center" style="padding:32px 40px 24px;
                 border-bottom:1px solid #E8E2DC;">
              <p style="margin:0;font-family:Georgia,serif;font-size:20px;
                   letter-spacing:0.3em;color:#1A1914;text-transform:uppercase;">
                M O D E T T
              </p>
              <p style="margin:4px 0 0;font-size:10px;letter-spacing:0.2em;
                   color:#8B8480;text-transform:uppercase;">
                A T E L I E R
              </p>
            </td>
          </tr>

          ${heroImageBlock}
          ${heroVideoBlock}

          <tr>
            <td style="padding:40px 40px 32px;">
              <h1 style="margin:0 0 20px;font-family:Georgia,serif;
                   font-size:28px;font-weight:normal;color:#1A1914;
                   line-height:1.3;">
                ${heading}
              </h1>

              <div style="font-size:14px;line-height:1.7;color:#1A1914;
                          margin:0 0 28px;">
                ${bodyHtml}
              </div>

              ${ctaBlock}

              ${footerNoteBlock}
            </td>
          </tr>

          <tr>
            <td style="padding:24px 40px;border-top:1px solid #E8E2DC;
                 text-align:center;">
              <p style="margin:0;font-size:11px;color:#8B8480;line-height:1.6;">
                You received this because you are subscribed to Modett updates.<br />
                <a href="%unsubscribe_url%"
                   style="color:#8B8480;text-decoration:underline;">
                  Unsubscribe
                </a>
              </p>
            </td>
          </tr>

        </table>
      </td>
    </tr>
  </table>
</body>
</html>`
}
