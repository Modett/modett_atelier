/**
 * Messaging service — preferences, queue notification (opt-in gating),
 * transactional helpers, BIS/price-drop, notify-me, inbox, admin campaigns.
 * RORO. Uses AppError for service-level validation; db layer throws MessagingError.
 */

import { AppError } from '../../lib/errors'
import {
  TemplateKey,
  getNotificationPreferences,
  updateNotificationPreferences,
  enqueueNotification,
  createInboxMessage,
  getActiveBISSubscribers,
  stampBISNotified,
  getPriceDropSubscribers,
  subscribeBIS,
  unsubscribeBIS,
  subscribePriceDrop as subscribePriceDropQuery,
  unsubscribePriceDrop as unsubscribePriceDropQuery,
  recordNotifyMeEvent,
  getNotifyMeDemand as getNotifyMeDemandQuery,
  getInboxForUser,
  getInboxUnreadCount,
  markInboxMessageRead,
  markAllInboxRead,
  createCampaign,
  getCampaignById,
  listCampaigns,
  getCampaignCount,
  countDeliveriesByCampaignIds,
  countDeliveriesForCampaign,
  queueCampaignForImmediateDelivery,
  countCampaignAudienceRecipients,
  updateCampaign,
  scheduleCampaign,
  cancelCampaign,
  getNewsletterSubscriberByEmail,
  createNewsletterSubscriber,
  createPromoCode,
  deletePromoCodeById,
} from '@modett/db'
import type { NotificationPreferences } from '@modett/db'
import type { CampaignContent } from '@modett/types'
import { sendEmail } from '../../infrastructure/email/email.service'
import { renderCampaignEmail } from './campaign-renderer'
import { deliverCampaignById } from '../../workers/campaign-delivery.worker'

type Channel = 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'

function isChannelAllowed({
  prefs,
  channel,
  isTransactional,
}: {
  prefs: NotificationPreferences
  channel: Channel
  isTransactional: boolean
}): boolean {
  if (isTransactional) return true
  switch (channel) {
    case 'EMAIL':
      return prefs.email_opt_in
    case 'SMS':
      return prefs.sms_opt_in
    case 'WHATSAPP':
      return prefs.whatsapp_opt_in
    case 'PUSH':
      return prefs.push_opt_in
    default:
      return false
  }
}

// —— Preferences ——

export async function getMyPreferences({
  userId,
}: {
  userId: string
}): Promise<NotificationPreferences> {
  const prefs = await getNotificationPreferences({ userId })
  if (!prefs) throw new AppError('PREFERENCES_NOT_FOUND', 404)
  return prefs
}

export async function updateMyPreferences({
  userId,
  emailOptIn,
  smsOptIn,
  whatsappOptIn,
  pushOptIn,
}: {
  userId: string
  emailOptIn?: boolean
  smsOptIn?: boolean
  whatsappOptIn?: boolean
  pushOptIn?: boolean
}): Promise<NotificationPreferences> {
  return updateNotificationPreferences({
    userId,
    emailOptIn,
    smsOptIn,
    whatsappOptIn,
    pushOptIn,
  })
}

// —— Notification dispatch (used by all other modules) ——

export async function queueNotification({
  userId,
  channel,
  templateKey,
  payloadJson,
  dedupeKey,
  isTransactional = false,
  inboxMessage,
}: {
  userId: string | null | undefined
  channel: Channel
  templateKey: string
  payloadJson: Record<string, unknown>
  dedupeKey: string
  isTransactional?: boolean
  inboxMessage?: {
    type: string
    title: string
    body: string
    ctaLabel?: string
    ctaUrl?: string
    metadataJson?: Record<string, unknown>
  }
}): Promise<{ queued: true } | { queued: false; reason: 'OPT_OUT' }> {
  const prefs =
    userId != null && userId !== ''
      ? await getNotificationPreferences({ userId })
      : null

  if (
    prefs &&
    !isChannelAllowed({ prefs, channel, isTransactional })
  ) {
    return { queued: false, reason: 'OPT_OUT' }
  }

  await enqueueNotification({
    userId: userId ?? null,
    channel,
    templateKey,
    payloadJson,
    dedupeKey,
  })

  if (inboxMessage && userId != null && userId !== '') {
    await createInboxMessage({
      userId,
      type: inboxMessage.type,
      title: inboxMessage.title,
      body: inboxMessage.body,
      ctaLabel: inboxMessage.ctaLabel ?? null,
      ctaUrl: inboxMessage.ctaUrl ?? null,
      metadataJson: inboxMessage.metadataJson ?? null,
    })
  }

  return { queued: true }
}

// —— Transactional notification helpers ——

export async function notifyOrderReceipt({
  userId,
  orderId,
  orderRef,
  totalAmount,
  currency,
}: {
  userId: string
  orderId: string
  orderRef: string
  totalAmount: string
  currency: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.ORDER_RECEIPT,
    payloadJson: { orderId, orderRef, totalAmount, currency },
    dedupeKey: `order:${orderId}:ORDER_RECEIPT:EMAIL`,
    isTransactional: true,
    inboxMessage: {
      type: 'ORDER_UPDATE',
      title: `Order ${orderRef} confirmed`,
      body: `Your order of ${currency} ${totalAmount} has been confirmed.`,
      ctaLabel: 'View Order',
      ctaUrl: `/orders/${orderId}`,
    },
  })
}

export async function notifyOrderShipped({
  userId,
  orderId,
  orderRef,
  trackingNumber,
  carrier,
}: {
  userId: string
  orderId: string
  orderRef: string
  trackingNumber?: string
  carrier?: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.ORDER_SHIPPED,
    payloadJson: { orderId, orderRef, trackingNumber, carrier },
    dedupeKey: `order:${orderId}:ORDER_SHIPPED:EMAIL`,
    isTransactional: true,
    inboxMessage: {
      type: 'ORDER_UPDATE',
      title: `Order ${orderRef} shipped`,
      body: `Your order is on its way.${trackingNumber != null ? ` Tracking: ${trackingNumber}` : ''}`,
      ctaLabel: 'Track Order',
      ctaUrl: `/orders/${orderId}`,
    },
  })
}

export async function notifyOrderDelivered({
  userId,
  orderId,
  orderRef,
}: {
  userId: string
  orderId: string
  orderRef: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.ORDER_DELIVERED,
    payloadJson: { orderId, orderRef },
    dedupeKey: `order:${orderId}:ORDER_DELIVERED:EMAIL`,
    isTransactional: true,
    inboxMessage: {
      type: 'ORDER_UPDATE',
      title: `Order ${orderRef} delivered`,
      body: 'Your order has been delivered. Let us know how you liked it!',
      ctaLabel: 'Leave a Review',
      ctaUrl: `/orders/${orderId}`,
    },
  })
}

export async function notifyOrderCancelled({
  userId,
  orderId,
  orderRef,
  reason,
}: {
  userId: string
  orderId: string
  orderRef: string
  reason?: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.ORDER_CANCELLED,
    payloadJson: { orderId, orderRef, reason },
    dedupeKey: `order:${orderId}:ORDER_CANCELLED:EMAIL`,
    isTransactional: true,
    inboxMessage: {
      type: 'ORDER_UPDATE',
      title: `Order ${orderRef} cancelled`,
      body: reason ?? 'Your order has been cancelled.',
    },
  })
}

export async function notifyReviewRequest({
  userId,
  orderItemId,
  productName,
  plainToken,
  productImageUrl,
  productColor,
  productSize,
}: {
  userId: string
  orderItemId: string
  productName: string
  plainToken: string
  productImageUrl?: string | null
  productColor?: string | null
  productSize?: string | null
}): Promise<void> {
  const APP_URL = process.env.APP_URL ?? 'https://www.modett.com'
  const reviewUrl = `${APP_URL}/review?token=${plainToken}&item=${orderItemId}`
  const variantLine = [productColor, productSize].filter(Boolean).join(' · ')
  const safeName = productName.replace(/</g, '&lt;').replace(/>/g, '&gt;')

  const html = `
<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1.0" />
  <title>How has your ${safeName} been treating you?</title>
</head>
<body style="margin:0;padding:0;background:#F8F5F2;">
  <table width="100%" cellpadding="0" cellspacing="0"
         style="background:#F8F5F2;padding:40px 16px;">
    <tr><td align="center">
      <table width="100%" cellpadding="0" cellspacing="0"
             style="max-width:560px;width:100%;background:#ffffff;">

        <!-- Header -->
        <tr>
          <td style="padding:36px 40px 24px;border-bottom:1px solid #E8E4DF;">
            <p style="margin:0;font-family:Georgia,serif;font-size:10px;
                      letter-spacing:0.35em;text-transform:uppercase;color:#C1AB85;">
              Modett Atelier
            </p>
          </td>
        </tr>

        ${productImageUrl ? `
        <!-- Product image -->
        <tr>
          <td style="padding:0;line-height:0;">
            <img src="${productImageUrl}" alt="${safeName}"
                 width="560" style="display:block;width:100%;
                 max-height:300px;object-fit:cover;" />
          </td>
        </tr>` : ''}

        <!-- Body -->
        <tr>
          <td style="padding:40px 40px 0;">
            <p style="margin:0 0 20px;font-family:Georgia,serif;font-size:24px;
                      font-weight:700;color:#232D35;line-height:1.3;">
              How has the ${safeName} been<br />treating you?
            </p>

            ${variantLine ? `
            <p style="margin:0 0 20px;font-family:Helvetica,Arial,sans-serif;
                      font-size:11px;letter-spacing:0.15em;color:#8A8A8A;">
              ${variantLine}
            </p>` : ''}

            <p style="margin:0 0 16px;font-family:Helvetica,Arial,sans-serif;
                      font-size:14px;font-weight:300;color:#4A4A4A;line-height:1.8;">
              You've had it for a little while now — we'd genuinely love
              to know how it wears, how it feels, and whether it's found
              its place in your wardrobe.
            </p>

            <p style="margin:0 0 32px;font-family:Helvetica,Arial,sans-serif;
                      font-size:14px;font-weight:300;color:#4A4A4A;line-height:1.8;">
              If you've worn it somewhere worth remembering, we'd love
              to see — you can add photos too.
            </p>

            <!-- CTA -->
            <table cellpadding="0" cellspacing="0" style="margin-bottom:32px;">
              <tr>
                <td style="background:#232D35;">
                  <a href="${reviewUrl}"
                     style="display:inline-block;padding:15px 40px;
                            font-family:Helvetica,Arial,sans-serif;
                            font-size:11px;font-weight:300;
                            letter-spacing:0.28em;text-transform:uppercase;
                            color:#F8F5F2;text-decoration:none;">
                    Share Your Thoughts
                  </a>
                </td>
              </tr>
            </table>

            <p style="margin:0 0 40px;font-family:Helvetica,Arial,sans-serif;
                      font-size:12px;font-weight:300;color:#9A9A9A;line-height:1.7;">
              This link is personal to you and valid for 30 days.<br />
              Your review helps other women choose with intention.
            </p>
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:20px 40px 36px;border-top:1px solid #E8E4DF;">
            <p style="margin:0;font-family:Helvetica,Arial,sans-serif;
                      font-size:10px;letter-spacing:0.18em;text-transform:uppercase;
                      color:#AAAAAA;">
              Modett Atelier &nbsp;·&nbsp;
              <a href="mailto:hello@modett.com"
                 style="color:#AAAAAA;text-decoration:none;">hello@modett.com</a>
            </p>
          </td>
        </tr>

      </table>
    </td></tr>
  </table>
</body>
</html>
`

  const inboxCtaUrl = `/review?token=${plainToken}&item=${orderItemId}`

  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.REVIEW_REQUEST,
    payloadJson: {
      orderItemId,
      productName,
      plainToken,
      productImageUrl: productImageUrl ?? null,
      productColor: productColor ?? null,
      productSize: productSize ?? null,
      htmlBody: html,
      reviewUrl,
    },
    dedupeKey: `review:${orderItemId}:REVIEW_REQUEST:EMAIL`,
    isTransactional: false,
    inboxMessage: {
      type: 'REVIEW_REQUEST',
      title: `How was your ${productName}?`,
      body: 'Share your experience to help other shoppers.',
      ctaLabel: 'Write a Review',
      ctaUrl: inboxCtaUrl,
    },
  })
}

export async function notifyLoyaltyPointsEarned({
  userId,
  points,
  newBalance,
  orderRef,
}: {
  userId: string
  points: number
  newBalance: number
  orderRef: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.LOYALTY_POINTS_EARNED,
    payloadJson: { points, newBalance, orderRef },
    dedupeKey: `loyalty:${userId}:${orderRef}:POINTS_EARNED:EMAIL`,
    isTransactional: false,
    inboxMessage: {
      type: 'LOYALTY',
      title: `You earned ${points} points`,
      body: `Your loyalty balance is now ${newBalance} points.`,
      ctaLabel: 'View Balance',
      ctaUrl: '/account/loyalty',
    },
  })
}

export async function notifyLoyaltyTierUpgraded({
  userId,
  newTier,
  previousTier,
}: {
  userId: string
  newTier: string
  previousTier: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.LOYALTY_TIER_UPGRADED,
    payloadJson: { newTier, previousTier },
    dedupeKey: `loyalty:${userId}:${newTier}:TIER_UPGRADED:EMAIL`,
    isTransactional: false,
    inboxMessage: {
      type: 'LOYALTY',
      title: `You're now ${newTier} tier!`,
      body: `Congratulations — you've been upgraded from ${previousTier} to ${newTier}.`,
    },
  })
}

// —— Back-in-stock ——

export async function subscribeBackInStock({
  userId,
  variantId,
  channels,
}: {
  userId: string
  variantId: string
  channels?: Channel[]
}): Promise<void> {
  await subscribeBIS({
    userId,
    variantId,
    channelsJson: channels ?? ['EMAIL'],
  })
}

export async function unsubscribeBackInStock({
  userId,
  variantId,
}: {
  userId: string
  variantId: string
}): Promise<void> {
  await unsubscribeBIS({ userId, variantId })
}

export async function notifyBackInStockSubscribers({
  variantId,
  productName,
  variantLabel,
}: {
  variantId: string
  productName: string
  variantLabel: string
}): Promise<void> {
  const subscribers = await getActiveBISSubscribers({ variantId })
  for (const sub of subscribers) {
    const channels = (sub.channels_json as string[]) ?? ['EMAIL']
    for (const ch of channels) {
      const channel = ch as Channel
      await queueNotification({
        userId: sub.user_id ?? undefined,
        channel,
        templateKey: TemplateKey.BACK_IN_STOCK,
        payloadJson: { variantId, productName, variantLabel },
        dedupeKey: `bis:${sub.user_id ?? 'anon'}:${variantId}:BACK_IN_STOCK:${channel}`,
        isTransactional: false,
      }).catch(() => {})
      await stampBISNotified({ id: sub.id }).catch(() => {})
    }
  }
}

// —— Price-drop ——

export async function subscribePriceDrop({
  userId,
  variantId,
  targetPrice,
  channels,
}: {
  userId: string
  variantId: string
  targetPrice?: number
  channels?: Channel[]
}): Promise<void> {
  await subscribePriceDropQuery({
    userId,
    variantId,
    targetPrice: targetPrice != null ? String(targetPrice) : null,
    channelsJson: channels ?? ['EMAIL'],
  })
}

export async function unsubscribePriceDrop({
  userId,
  variantId,
}: {
  userId: string
  variantId: string
}): Promise<void> {
  await unsubscribePriceDropQuery({ userId, variantId })
}

export async function notifyPriceDropSubscribers({
  variantId,
  newPrice,
  currency,
  productName,
}: {
  variantId: string
  newPrice: string
  currency: string
  productName: string
}): Promise<void> {
  const subscribers = await getPriceDropSubscribers({
    variantId,
    newPrice,
    currency,
  })
  for (const sub of subscribers) {
    const channels = (sub.channels_json as string[]) ?? ['EMAIL']
    for (const ch of channels) {
      const channel = ch as Channel
      await queueNotification({
        userId: sub.user_id ?? undefined,
        channel,
        templateKey: TemplateKey.PRICE_DROP,
        payloadJson: { variantId, newPrice, currency, productName },
        dedupeKey: `pricedrop:${sub.user_id ?? 'anon'}:${variantId}:${newPrice}:${channel}`,
        isTransactional: false,
      }).catch(() => {})
    }
  }
}

// —— Notify-me demand ——

export async function recordNotifyMe({
  variantId,
  userId,
  sessionId,
}: {
  variantId: string
  userId?: string | null
  sessionId: string
}): Promise<void> {
  await recordNotifyMeEvent({ variantId, userId, sessionId })
}

export async function getNotifyMeDemand({
  limit,
}: {
  limit?: number
} = {}) {
  return getNotifyMeDemandQuery({ limit })
}

// —— Inbox ——

export async function getMyInbox({
  userId,
  page,
  limit,
  unreadOnly,
}: {
  userId: string
  page?: number
  limit?: number
  unreadOnly?: boolean
}) {
  return getInboxForUser({ userId, page, limit, unreadOnly })
}

export async function markRead({
  messageId,
  userId,
}: {
  messageId: string
  userId: string
}): Promise<void> {
  await markInboxMessageRead({ id: messageId, userId })
}

export async function markAllRead({ userId }: { userId: string }): Promise<void> {
  await markAllInboxRead({ userId })
}

export async function getMyInboxUnreadCount({
  userId,
}: {
  userId: string
}): Promise<number> {
  return getInboxUnreadCount({ userId })
}

// —— Admin campaigns ——

export async function adminCreateCampaign({
  name,
  contentJson,
  channelsJson,
  audienceFilterJson,
  adminId,
}: {
  name: string
  contentJson: Record<string, unknown>
  channelsJson?: Channel[]
  audienceFilterJson?: Record<string, unknown>
  adminId: string
}): Promise<Awaited<ReturnType<typeof createCampaign>>> {
  return createCampaign({
    name,
    contentJson,
    channelsJson: channelsJson ?? ['EMAIL'],
    audienceFilterJson: audienceFilterJson ?? {},
    adminId,
  })
}

export async function adminUpdateCampaign({
  id,
  name,
  contentJson,
  channelsJson,
  audienceFilterJson,
}: {
  id: string
  name?: string
  contentJson?: Record<string, unknown>
  channelsJson?: Channel[]
  audienceFilterJson?: Record<string, unknown>
}): Promise<Awaited<ReturnType<typeof updateCampaign>>> {
  return updateCampaign({
    id,
    name,
    contentJson,
    channelsJson,
    audienceFilterJson,
  })
}

export async function adminScheduleCampaign({
  id,
  scheduledAt,
}: {
  id: string
  scheduledAt: Date
}): Promise<void> {
  if (new Date(scheduledAt) <= new Date()) {
    throw new AppError('SCHEDULED_AT_MUST_BE_FUTURE', 400)
  }
  await scheduleCampaign({ id, scheduledAt })
}

export async function adminCancelCampaign({ id }: { id: string }): Promise<void> {
  await cancelCampaign({ id })
}

export async function adminListCampaigns({
  page = 1,
  limit = 50,
  status,
}: {
  page?: number
  limit?: number
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
}) {
  const [campaignsList, total] = await Promise.all([
    listCampaigns({ page, limit, status }),
    getCampaignCount({ status }),
  ])
  const ids = campaignsList.map((c) => c.id)
  const deliveryCounts = await countDeliveriesByCampaignIds({
    campaignIds: ids,
  })
  const campaigns = campaignsList.map((c) => ({
    ...c,
    delivery_count: deliveryCounts.get(c.id) ?? 0,
  }))
  return { campaigns, page, limit, total }
}

export async function adminGetCampaign({
  id,
}: {
  id: string
}): Promise<
  NonNullable<Awaited<ReturnType<typeof getCampaignById>>> & {
    delivery_count: number
  }
> {
  const campaign = await getCampaignById({ id })
  if (!campaign) throw new AppError('CAMPAIGN_NOT_FOUND', 404)
  const deliveryCount = await countDeliveriesForCampaign({ campaignId: id })
  return { ...campaign, delivery_count: deliveryCount }
}

export async function adminAudienceEstimate({
  audienceFilterJson,
}: {
  audienceFilterJson: Record<string, unknown>
}): Promise<{ count: number }> {
  const count = await countCampaignAudienceRecipients({
    audienceFilterJson,
  })
  return { count }
}

export async function adminSendTestEmail({
  campaignId,
  recipientEmail,
}: {
  campaignId: string
  recipientEmail: string
}): Promise<void> {
  const campaign = await getCampaignById({ id: campaignId })
  if (!campaign) throw new AppError('CAMPAIGN_NOT_FOUND', 404)
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
  const subjectBase = content.subject?.trim() || 'Modett Atelier'
  await sendEmail({
    to: recipientEmail,
    subject: `[TEST] ${subjectBase}`,
    html,
  })
}

export async function adminSendCampaignNow({
  campaignId,
}: {
  campaignId: string
}): Promise<{ recipientCount: number; sentCount: number }> {
  const existing = await getCampaignById({ id: campaignId })
  if (!existing) throw new AppError('CAMPAIGN_NOT_FOUND', 404)
  if (existing.status === 'SENT') {
    throw new AppError('CAMPAIGN_ALREADY_SENT', 409)
  }
  if (existing.status === 'CANCELLED') {
    throw new AppError('CAMPAIGN_ALREADY_SENT', 409)
  }

  const queued = await queueCampaignForImmediateDelivery({ id: campaignId })
  if (!queued) {
    const again = await getCampaignById({ id: campaignId })
    if (!again) throw new AppError('CAMPAIGN_NOT_FOUND', 404)
    if (again.status === 'SENT') {
      throw new AppError('CAMPAIGN_ALREADY_SENT', 409)
    }
    throw new AppError('CAMPAIGN_NOT_DRAFT', 409)
  }

  return deliverCampaignById(campaignId)
}

function generateNewsletterPromoCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = 'MODETT-'
  for (let i = 0; i < 6; i++) {
    code += chars[Math.floor(Math.random() * chars.length)]!
  }
  return code
}

function pgErrorCode(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as { code?: string; cause?: unknown }
  if (typeof e.code === 'string') return e.code
  const c = e.cause
  if (c && typeof c === 'object' && 'code' in c) {
    const code = (c as { code?: string }).code
    return typeof code === 'string' ? code : undefined
  }
  return undefined
}

function pgConstraintName(err: unknown): string | undefined {
  if (!err || typeof err !== 'object') return undefined
  const e = err as { constraint?: string; cause?: unknown }
  if (typeof e.constraint === 'string') return e.constraint
  const c = e.cause
  if (c && typeof c === 'object' && 'constraint' in c) {
    const name = (c as { constraint?: string }).constraint
    return typeof name === 'string' ? name : undefined
  }
  return undefined
}

export async function recordNewsletterSignup({
  email,
  ipAddress,
}: {
  email: string
  ipAddress?: string | null
}): Promise<{ promoCode: string }> {
  const normalized = email.toLowerCase().trim()
  const existing = await getNewsletterSubscriberByEmail({ email: normalized })
  if (existing) {
    throw new AppError(
      'ALREADY_SUBSCRIBED',
      409,
      'This email is already subscribed.',
    )
  }

  const validUntil = new Date(Date.now() + 90 * 24 * 60 * 60 * 1000)
  let lastError: unknown

  for (let attempt = 0; attempt < 8; attempt++) {
    const promoCode = generateNewsletterPromoCode()
    let createdPromoId: string | null = null
    try {
      const promoRow = await createPromoCode({
        code: promoCode,
        type: 'PERCENT',
        value: '15',
        maxUses: 1,
        validFrom: new Date(),
        validUntil,
      })
      createdPromoId = promoRow.id
      await createNewsletterSubscriber({
        email: normalized,
        promoCodeId: promoRow.id,
        ipAddress: ipAddress ?? undefined,
        source: 'POPUP',
      })
      return { promoCode }
    } catch (err) {
      if (createdPromoId) {
        await deletePromoCodeById({ id: createdPromoId }).catch(() => {})
      }
      if (pgErrorCode(err) === '23505') {
        const constraint = pgConstraintName(err)
        if (constraint === 'uq_newsletter_email') {
          throw new AppError(
            'ALREADY_SUBSCRIBED',
            409,
            'This email is already subscribed.',
          )
        }
        if (constraint === 'uq_promo_code' && attempt < 7) {
          lastError = err
          continue
        }
      }
      throw err
    }
  }

  throw lastError ?? new Error('NEWSLETTER_PROMO_GENERATION_FAILED')
}
