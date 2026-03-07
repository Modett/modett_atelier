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
  markInboxMessageRead,
  markAllInboxRead,
  createCampaign,
  getCampaignById,
  listCampaigns,
  getCampaignCount,
  updateCampaign,
  scheduleCampaign,
  cancelCampaign,
} from '@modett/db'
import type { NotificationPreferences } from '@modett/db'

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
}: {
  userId: string
  orderItemId: string
  productName: string
  plainToken: string
}): Promise<void> {
  await queueNotification({
    userId,
    channel: 'EMAIL',
    templateKey: TemplateKey.REVIEW_REQUEST,
    payloadJson: { orderItemId, productName, plainToken },
    dedupeKey: `review:${orderItemId}:REVIEW_REQUEST:EMAIL`,
    isTransactional: false,
    inboxMessage: {
      type: 'REVIEW_REQUEST',
      title: `How was your ${productName}?`,
      body: 'Share your experience to help other shoppers.',
      ctaLabel: 'Write a Review',
      ctaUrl: `/review?token=${plainToken}&orderItemId=${orderItemId}`,
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
      ctaUrl: '/loyalty',
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
  return { campaigns: campaignsList, page, limit, total }
}

export async function adminGetCampaign({
  id,
}: {
  id: string
}): Promise<Awaited<ReturnType<typeof getCampaignById>>> {
  const campaign = await getCampaignById({ id })
  if (!campaign) throw new AppError('CAMPAIGN_NOT_FOUND', 404)
  return campaign
}
