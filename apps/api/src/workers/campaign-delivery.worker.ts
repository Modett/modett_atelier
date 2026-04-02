/**
 * Polls due scheduled campaigns and sends bulk email + inbox rows.
 * Claim is atomic (SCHEDULED → SENT) so concurrent workers do not double-send.
 */

import type { CampaignContent } from '@modett/types'
import {
  getScheduledCampaignsDue,
  getCampaignById,
  claimCampaignForSending,
  resolveCampaignAudienceRecipients,
  insertCampaignDeliveryRows,
  updateCampaignDeliveryStatus,
  createInboxMessage,
} from '@modett/db'
import { sendEmail } from '../infrastructure/email/email.service'
import { renderCampaignEmail } from '../modules/messaging/campaign-renderer'

function inboxPreviewFromBody(body: string, maxLen: number): string {
  const plain = body.replace(/\s+/g, ' ').trim()
  if (plain.length <= maxLen) return plain
  return `${plain.slice(0, maxLen)}…`
}

export async function processDueCampaigns(): Promise<void> {
  const due = await getScheduledCampaignsDue()
  for (const row of due) {
    await deliverCampaignRow(row)
  }
}

interface CampaignRowLike {
  id: string
  name: string
  content_json: unknown
  audience_filter_json: unknown
  channels_json: unknown
}

export async function deliverCampaignRow(
  campaign: CampaignRowLike,
): Promise<{ recipientCount: number; sentCount: number }> {
  const claimed = await claimCampaignForSending({ id: campaign.id })
  if (!claimed) {
    return { recipientCount: 0, sentCount: 0 }
  }

  const audienceFilter =
    (campaign.audience_filter_json as Record<string, unknown>) ?? {}
  const recipients = await resolveCampaignAudienceRecipients({
    audienceFilterJson: audienceFilter,
  })

  const content = campaign.content_json as CampaignContent
  const html = renderCampaignEmail({
    subject: content.subject ?? '',
    preheader: content.preheader,
    heroImageUrl: content.heroImageUrl,
    heroVideoUrl: content.heroVideoUrl,
    heading: content.heading ?? '',
    body: content.body ?? '',
    ctaLabel: content.ctaLabel,
    ctaUrl: content.ctaUrl,
    footerNote: content.footerNote,
  })

  const channels = (campaign.channels_json as string[]) ?? ['EMAIL']
  const emailChannel = channels.includes('EMAIL')

  if (emailChannel && recipients.length > 0) {
    await insertCampaignDeliveryRows({
      rows: recipients.map((r) => ({
        campaignId: campaign.id,
        userId: r.id,
        channel: 'EMAIL',
      })),
    })
  }

  let sentCount = 0
  if (!emailChannel) {
    return { recipientCount: recipients.length, sentCount: 0 }
  }

  const subjectLine = content.subject ?? 'Modett Atelier'

  for (const recipient of recipients) {
    try {
      await sendEmail({
        to: recipient.email,
        subject: subjectLine,
        html,
      })
      await updateCampaignDeliveryStatus({
        campaignId: campaign.id,
        userId: recipient.id,
        channel: 'EMAIL',
        status: 'SENT',
        fromStatus: 'QUEUED',
      })
      sentCount += 1

      const inboxBody = inboxPreviewFromBody(content.body ?? '', 300)
      await createInboxMessage({
        userId: recipient.id,
        type: 'CAMPAIGN',
        title: content.heading ?? subjectLine,
        body: inboxBody || content.heading || 'Campaign message',
        ctaLabel: content.ctaLabel ?? null,
        ctaUrl: content.ctaUrl ?? null,
        metadataJson: { campaignId: campaign.id },
      })
    } catch (err) {
      console.error(
        `[campaign-worker] Failed to send to ${recipient.email}:`,
        err,
      )
      await updateCampaignDeliveryStatus({
        campaignId: campaign.id,
        userId: recipient.id,
        channel: 'EMAIL',
        status: 'FAILED',
        fromStatus: 'QUEUED',
      })
    }
  }

  console.log(
    `[campaign-worker] Campaign ${campaign.id} delivered to ${sentCount}/${recipients.length} recipients`,
  )
  return { recipientCount: recipients.length, sentCount }
}

export async function deliverCampaignById(
  campaignId: string,
): Promise<{ recipientCount: number; sentCount: number }> {
  const row = await getCampaignById({ id: campaignId })
  if (!row) {
    return { recipientCount: 0, sentCount: 0 }
  }
  return deliverCampaignRow(row as CampaignRowLike)
}
