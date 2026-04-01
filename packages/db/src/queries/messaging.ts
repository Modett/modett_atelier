/**
 * Messaging query functions — outbox, inbox, preferences, BIS/price-drop subscriptions,
 * notify-me events, campaigns. No business logic. RORO. Outbox claim uses withOutboxLock.
 */

import crypto from 'node:crypto'
import { eq, and, asc, desc, inArray, sql } from 'drizzle-orm'
import { db } from '../client'
import { redis } from '../redis'
import { MessagingError } from '../errors'
import {
  inboxMessages,
  notificationPreferences,
  notificationOutbox,
  emailDeliveryLog,
  backInStockSubscriptions,
  priceDropSubscriptions,
  campaigns,
  campaignDeliveries,
  notifyMeEvents,
} from '../schema/messaging.schema'
import type {
  InboxMessage,
  NotificationPreferences,
  NotificationOutboxRow,
  BackInStockSubscription,
  PriceDropSubscription,
  Campaign,
} from '../schema/messaging.schema'

// —— Template keys (code-defined, no DB table) ——

export const TemplateKey = {
  ORDER_RECEIPT: 'ORDER_RECEIPT',
  ORDER_SHIPPED: 'ORDER_SHIPPED',
  ORDER_DELIVERED: 'ORDER_DELIVERED',
  ORDER_CANCELLED: 'ORDER_CANCELLED',
  RETURN_SUBMITTED: 'RETURN_SUBMITTED',
  RETURN_APPROVED: 'RETURN_APPROVED',
  RETURN_REJECTED: 'RETURN_REJECTED',
  REVIEW_REQUEST: 'REVIEW_REQUEST',
  BACK_IN_STOCK: 'BACK_IN_STOCK',
  PRICE_DROP: 'PRICE_DROP',
  LOYALTY_POINTS_EARNED: 'LOYALTY_POINTS_EARNED',
  LOYALTY_TIER_UPGRADED: 'LOYALTY_TIER_UPGRADED',
  CAMPAIGN: 'CAMPAIGN',
} as const

export type TemplateKeyValue = (typeof TemplateKey)[keyof typeof TemplateKey]

// —— Lock helper (RULE 3) ——

export async function withOutboxLock<T>(
  outboxId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `lock:outbox:${outboxId}`
  const lockId = crypto.randomUUID()
  const acquired = await redis.set(key, lockId, 'EX', 30, 'NX')
  if (!acquired) {
    throw new MessagingError('OUTBOX_LOCK_NOT_ACQUIRED', 409)
  }
  try {
    return await fn()
  } finally {
    await redis.eval(
      `if redis.call('get',KEYS[1])==ARGV[1]
       then return redis.call('del',KEYS[1])
       else return 0 end`,
      1,
      key,
      lockId,
    )
  }
}

// —— Preferences ——

export async function createNotificationPreferences({
  userId,
}: {
  userId: string
}): Promise<void> {
  await db
    .insert(notificationPreferences)
    .values({
      user_id: userId,
      email_opt_in: true,
      sms_opt_in: false,
      whatsapp_opt_in: false,
      push_opt_in: false,
    })
    .onConflictDoNothing({ target: notificationPreferences.user_id })
}

export async function getNotificationPreferences({
  userId,
}: {
  userId: string
}): Promise<NotificationPreferences | null> {
  const rows = await db
    .select()
    .from(notificationPreferences)
    .where(eq(notificationPreferences.user_id, userId))
  return rows[0] ?? null
}

export async function updateNotificationPreferences({
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
  const updates: Record<string, boolean> = {}
  if (emailOptIn !== undefined) updates.email_opt_in = emailOptIn
  if (smsOptIn !== undefined) updates.sms_opt_in = smsOptIn
  if (whatsappOptIn !== undefined) updates.whatsapp_opt_in = whatsappOptIn
  if (pushOptIn !== undefined) updates.push_opt_in = pushOptIn
  if (Object.keys(updates).length === 0) {
    const prefs = await getNotificationPreferences({ userId })
    if (!prefs) throw new MessagingError('PREFERENCES_NOT_FOUND', 404)
    return prefs
  }
  const result = await db
    .update(notificationPreferences)
    .set({ ...updates, updated_at: new Date() })
    .where(eq(notificationPreferences.user_id, userId))
    .returning()
  if (result.length === 0) {
    throw new MessagingError('PREFERENCES_NOT_FOUND', 404)
  }
  return result[0]!
}

// —— Outbox ——

export async function enqueueNotification({
  userId,
  channel,
  templateKey,
  payloadJson,
  dedupeKey,
}: {
  userId?: string | null
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'
  templateKey: string
  payloadJson: Record<string, unknown>
  dedupeKey: string
}): Promise<void> {
  await db
    .insert(notificationOutbox)
    .values({
      user_id: userId ?? null,
      channel,
      template_key: templateKey,
      payload_json: payloadJson,
      dedupe_key: dedupeKey,
      status: 'PENDING',
      attempts: 0,
    })
    .onConflictDoNothing({ target: notificationOutbox.dedupe_key })
}

export async function enqueueNotificationBatch(
  notifications: Array<{
    userId?: string | null
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'
    templateKey: string
    payloadJson: Record<string, unknown>
    dedupeKey: string
  }>,
): Promise<void> {
  if (notifications.length === 0) return
  await db
    .insert(notificationOutbox)
    .values(
      notifications.map((n) => ({
        user_id: n.userId ?? null,
        channel: n.channel,
        template_key: n.templateKey,
        payload_json: n.payloadJson,
        dedupe_key: n.dedupeKey,
        status: 'PENDING' as const,
        attempts: 0,
      })),
    )
    .onConflictDoNothing({ target: notificationOutbox.dedupe_key })
}

export async function claimOutboxRow({
  id,
}: {
  id: string
}): Promise<NotificationOutboxRow> {
  return withOutboxLock(id, async () => {
    const result = await db.execute(sql`
      UPDATE messaging.notification_outbox
      SET    status   = 'SENDING',
             attempts = attempts + 1
      WHERE  id     = ${id}
        AND  status = 'PENDING'
      RETURNING *
    `)
    if (!result.rows.length) {
      throw new MessagingError('OUTBOX_NOT_PENDING', 409)
    }
    return result.rows[0] as unknown as NotificationOutboxRow
  })
}

export async function markOutboxSent({
  id,
  providerMessageId,
}: {
  id: string
  providerMessageId?: string | null
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE messaging.notification_outbox
    SET    status  = 'SENT',
           sent_at = now()
    WHERE  id     = ${id}
      AND  status = 'SENDING'
    RETURNING id, user_id
  `)
  if (result.rows.length === 0) {
    throw new MessagingError('OUTBOX_NOT_PENDING', 409)
  }
  const row = result.rows[0] as { id: string; user_id: string | null }
  if (providerMessageId != null && providerMessageId !== '') {
    await db.insert(emailDeliveryLog).values({
      user_id: row.user_id,
      notification_outbox_id: id,
      provider_message_id: providerMessageId,
      status: 'SENT',
    })
  }
}

export async function markOutboxFailed({ id }: { id: string }): Promise<void> {
  const result = await db.execute(sql`
    UPDATE messaging.notification_outbox
    SET    status    = 'FAILED',
           failed_at = now()
    WHERE  id     = ${id}
      AND  status = 'SENDING'
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new MessagingError('OUTBOX_NOT_PENDING', 409)
  }
}

export async function getPendingOutboxRows({
  limit = 50,
}: {
  limit?: number
} = {}): Promise<NotificationOutboxRow[]> {
  const result = await db
    .select()
    .from(notificationOutbox)
    .where(eq(notificationOutbox.status, 'PENDING'))
    .orderBy(asc(notificationOutbox.created_at))
    .limit(limit)
  return result
}

export async function retryFailedOutboxRows({
  maxAttempts = 3,
  limit = 20,
}: {
  maxAttempts?: number
  limit?: number
} = {}): Promise<number> {
  const result = await db.execute(sql`
    UPDATE messaging.notification_outbox
    SET    status = 'PENDING'
    WHERE  id IN (
      SELECT id FROM messaging.notification_outbox
      WHERE  status   = 'FAILED'
        AND  attempts < ${maxAttempts}
      ORDER BY failed_at ASC
      LIMIT  ${limit}
    )
    RETURNING id
  `)
  return result.rows.length
}

// —— Inbox ——

export async function createInboxMessage({
  userId,
  type,
  title,
  body,
  ctaLabel,
  ctaUrl,
  metadataJson,
}: {
  userId: string
  type: string
  title: string
  body: string
  ctaLabel?: string | null
  ctaUrl?: string | null
  metadataJson?: Record<string, unknown> | null
}): Promise<InboxMessage> {
  const [row] = await db
    .insert(inboxMessages)
    .values({
      user_id: userId,
      type,
      title,
      body,
      cta_label: ctaLabel ?? null,
      cta_url: ctaUrl ?? null,
      metadata_json: metadataJson ?? {},
    })
    .returning()
  if (!row) throw new Error('createInboxMessage: no row returned')
  return row
}

export async function getInboxForUser({
  userId,
  page = 1,
  limit = 20,
  unreadOnly = false,
}: {
  userId: string
  page?: number
  limit?: number
  unreadOnly?: boolean
}): Promise<{
  messages: InboxMessage[]
  unreadCount: number
  page: number
  limit: number
  total: number
}> {
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const offset = (page - 1) * safeLimit

  const condition = unreadOnly
    ? and(
        eq(inboxMessages.user_id, userId),
        eq(inboxMessages.is_read, false),
      )
    : eq(inboxMessages.user_id, userId)

  const messages = await db
    .select()
    .from(inboxMessages)
    .where(condition)
    .orderBy(desc(inboxMessages.created_at))
    .limit(safeLimit)
    .offset(offset)

  const totalResult = unreadOnly
    ? await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM messaging.inbox_messages
        WHERE user_id = ${userId} AND is_read = false
      `)
    : await db.execute(sql`
        SELECT COUNT(*)::int AS total
        FROM messaging.inbox_messages
        WHERE user_id = ${userId}
      `)
  const totalNum = Number((totalResult.rows[0] as { total: number } | undefined)?.total ?? 0)

  const unreadResult = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt
    FROM messaging.inbox_messages
    WHERE user_id = ${userId} AND is_read = false
  `)
  const unreadCount = (unreadResult.rows[0] as { cnt: number } | undefined)?.cnt ?? 0

  return { messages, unreadCount, page, limit: safeLimit, total: totalNum }
}

export async function markInboxMessageRead({
  id,
  userId,
}: {
  id: string
  userId: string
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE messaging.inbox_messages
    SET    is_read = true
    WHERE  id      = ${id}
      AND  user_id = ${userId}
      AND  is_read = false
    RETURNING id
  `)
  if (result.rows.length === 0) {
    const exists = await db
      .select({ id: inboxMessages.id })
      .from(inboxMessages)
      .where(
        and(
          eq(inboxMessages.id, id),
          eq(inboxMessages.user_id, userId),
        ),
      )
    if (exists.length === 0) {
      throw new MessagingError('MESSAGE_NOT_FOUND', 404)
    }
    throw new MessagingError('MESSAGE_ALREADY_READ', 409)
  }
}

export async function markAllInboxRead({
  userId,
}: {
  userId: string
}): Promise<void> {
  await db
    .update(inboxMessages)
    .set({ is_read: true })
    .where(
      and(
        eq(inboxMessages.user_id, userId),
        eq(inboxMessages.is_read, false),
      ),
    )
}

// —— Back-in-stock subscriptions ——

export async function subscribeBIS({
  userId,
  variantId,
  channelsJson,
}: {
  userId?: string | null
  variantId: string
  channelsJson?: string[] | null
}): Promise<void> {
  await db
    .insert(backInStockSubscriptions)
    .values({
      user_id: userId ?? null,
      variant_id: variantId,
      channels_json: channelsJson ?? ['EMAIL'],
    })
    .onConflictDoNothing({
      target: [
        backInStockSubscriptions.user_id,
        backInStockSubscriptions.variant_id,
      ],
    })
}

export async function unsubscribeBIS({
  userId,
  variantId,
}: {
  userId: string
  variantId: string
}): Promise<void> {
  const result = await db
    .delete(backInStockSubscriptions)
    .where(
      and(
        eq(backInStockSubscriptions.user_id, userId),
        eq(backInStockSubscriptions.variant_id, variantId),
      ),
    )
    .returning({ id: backInStockSubscriptions.id })
  if (result.length === 0) {
    throw new MessagingError('BIS_SUBSCRIPTION_NOT_FOUND', 404)
  }
}

export async function getActiveBISSubscribers({
  variantId,
}: {
  variantId: string
}): Promise<BackInStockSubscription[]> {
  const rows = await db
    .select()
    .from(backInStockSubscriptions)
    .where(
      and(
        eq(backInStockSubscriptions.variant_id, variantId),
        sql`${backInStockSubscriptions.notified_at} IS NULL`,
      ),
    )
  return rows
}

export async function stampBISNotified({ id }: { id: string }): Promise<void> {
  const result = await db.execute(sql`
    UPDATE messaging.back_in_stock_subscriptions
    SET    notified_at = now()
    WHERE  id          = ${id}
      AND  notified_at IS NULL
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new MessagingError('SUBSCRIPTION_ALREADY_NOTIFIED', 409)
  }
}

// —— Price-drop subscriptions ——

export async function subscribePriceDrop({
  userId,
  variantId,
  targetPrice,
  channelsJson,
}: {
  userId: string
  variantId: string
  targetPrice?: string | null
  channelsJson?: string[] | null
}): Promise<void> {
  await db
    .insert(priceDropSubscriptions)
    .values({
      user_id: userId,
      variant_id: variantId,
      target_price: targetPrice ?? null,
      channels_json: channelsJson ?? ['EMAIL'],
    })
    .onConflictDoUpdate({
      target: [
        priceDropSubscriptions.user_id,
        priceDropSubscriptions.variant_id,
      ],
      set: {
        target_price: targetPrice ?? null,
        channels_json: channelsJson ?? ['EMAIL'],
      },
    })
}

export async function unsubscribePriceDrop({
  userId,
  variantId,
}: {
  userId: string
  variantId: string
}): Promise<void> {
  const result = await db
    .delete(priceDropSubscriptions)
    .where(
      and(
        eq(priceDropSubscriptions.user_id, userId),
        eq(priceDropSubscriptions.variant_id, variantId),
      ),
    )
    .returning({ id: priceDropSubscriptions.id })
  if (result.length === 0) {
    throw new MessagingError('PRICE_DROP_SUBSCRIPTION_NOT_FOUND', 404)
  }
}

export async function getPriceDropSubscribers({
  variantId,
  newPrice,
  currency,
}: {
  variantId: string
  newPrice: string
  currency: string
}): Promise<PriceDropSubscription[]> {
  const rows = await db
    .select()
    .from(priceDropSubscriptions)
    .where(
      and(
        eq(priceDropSubscriptions.variant_id, variantId),
        sql`(target_price IS NULL OR target_price >= ${newPrice})`,
      ),
    )
  return rows
}

// —— Notify-me events (demand analytics) ——

export async function recordNotifyMeEvent({
  variantId,
  userId,
  sessionId,
}: {
  variantId: string
  userId?: string | null
  sessionId: string
}): Promise<void> {
  await db.insert(notifyMeEvents).values({
    variant_id: variantId,
    user_id: userId ?? null,
    session_id: sessionId,
  })
}

export interface NotifyMeDemandRow {
  variantId: string
  clickCount: number
  registeredUserCount: number
  lastClickAt: Date
}

export async function getNotifyMeDemand({
  limit = 50,
}: {
  limit?: number
} = {}): Promise<NotifyMeDemandRow[]> {
  const result = await db.execute(sql`
    SELECT
      variant_id AS "variantId",
      COUNT(*)::int AS "clickCount",
      COUNT(user_id) FILTER (WHERE user_id IS NOT NULL)::int AS "registeredUserCount",
      MAX(created_at) AS "lastClickAt"
    FROM messaging.notify_me_events
    GROUP BY variant_id
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `)
  const rows = result.rows ?? []
  return rows.map((row: Record<string, unknown>): NotifyMeDemandRow => ({
    variantId: String(row.variantId),
    clickCount: Number(row.clickCount),
    registeredUserCount: Number(row.registeredUserCount),
    lastClickAt:
      row.lastClickAt instanceof Date
        ? row.lastClickAt
        : new Date(String(row.lastClickAt)),
  }))
}

// —— Campaigns ——

export async function createCampaign({
  name,
  contentJson,
  channelsJson,
  audienceFilterJson,
  adminId,
}: {
  name: string
  contentJson: Record<string, unknown>
  channelsJson?: string[] | null
  audienceFilterJson?: Record<string, unknown> | null
  adminId?: string | null
}): Promise<Campaign> {
  const [row] = await db
    .insert(campaigns)
    .values({
      name,
      content_json: contentJson,
      channels_json: channelsJson ?? ['EMAIL'],
      audience_filter_json: audienceFilterJson ?? {},
      status: 'DRAFT',
      created_by_admin_id: adminId ?? null,
    })
    .returning()
  if (!row) throw new Error('createCampaign: no row returned')
  return row
}

export async function getCampaignById({
  id,
}: {
  id: string
}): Promise<Campaign | null> {
  const rows = await db
    .select()
    .from(campaigns)
    .where(eq(campaigns.id, id))
  return rows[0] ?? null
}

export async function getCampaignCount({
  status,
}: {
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
} = {}): Promise<number> {
  const condition = status ? eq(campaigns.status, status) : undefined
  const base = db.select({ count: sql<number>`count(*)::int` }).from(campaigns)
  const rows = condition ? await base.where(condition) : await base
  return rows[0]?.count ?? 0
}

export async function listCampaigns({
  page = 1,
  limit = 50,
  status,
}: {
  page?: number
  limit?: number
  status?: 'DRAFT' | 'SCHEDULED' | 'SENT' | 'CANCELLED'
}): Promise<Campaign[]> {
  const offset = (page - 1) * limit
  const base = db
    .select()
    .from(campaigns)
    .orderBy(desc(campaigns.created_at))
    .limit(limit)
    .offset(offset)
  const rows = status
    ? await base.where(eq(campaigns.status, status))
    : await base
  return rows
}

export async function updateCampaign({
  id,
  name,
  contentJson,
  channelsJson,
  audienceFilterJson,
}: {
  id: string
  name?: string
  contentJson?: Record<string, unknown>
  channelsJson?: string[]
  audienceFilterJson?: Record<string, unknown>
}): Promise<Campaign> {
  const updates: Record<string, unknown> = { updated_at: new Date() }
  if (name !== undefined) updates.name = name
  if (contentJson !== undefined) updates.content_json = contentJson
  if (channelsJson !== undefined) updates.channels_json = channelsJson
  if (audienceFilterJson !== undefined) {
    updates.audience_filter_json = audienceFilterJson
  }
  const result = await db
    .update(campaigns)
    .set(updates as Record<string, unknown>)
    .where(and(eq(campaigns.id, id), eq(campaigns.status, 'DRAFT')))
    .returning()
  if (result.length === 0) {
    throw new MessagingError('CAMPAIGN_NOT_DRAFT', 409)
  }
  return result[0]!
}

export async function scheduleCampaign({
  id,
  scheduledAt,
}: {
  id: string
  scheduledAt: Date
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE messaging.campaigns
    SET    status       = 'SCHEDULED',
           scheduled_at = ${scheduledAt},
           updated_at   = now()
    WHERE  id     = ${id}
      AND  status = 'DRAFT'
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new MessagingError('CAMPAIGN_NOT_DRAFT', 409)
  }
}

export async function cancelCampaign({ id }: { id: string }): Promise<void> {
  const result = await db.execute(sql`
    UPDATE messaging.campaigns
    SET    status     = 'CANCELLED',
           updated_at = now()
    WHERE  id     = ${id}
      AND  status IN ('DRAFT', 'SCHEDULED')
    RETURNING id
  `)
  if (result.rows.length === 0) {
    const campaign = await getCampaignById({ id })
    if (!campaign) throw new MessagingError('CAMPAIGN_NOT_FOUND', 404)
    throw new MessagingError('CAMPAIGN_ALREADY_SENT', 409)
  }
}

export async function markCampaignSent({ id }: { id: string }): Promise<void> {
  await db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      UPDATE messaging.campaigns
      SET    status     = 'SENT',
             sent_at    = now(),
             updated_at = now()
      WHERE  id     = ${id}
        AND  status = 'SCHEDULED'
      RETURNING id
    `)
    if (result.rows.length === 0) {
      throw new MessagingError('CAMPAIGN_NOT_SCHEDULED', 409)
    }
  })
}

export async function getScheduledCampaignsDue(): Promise<Campaign[]> {
  const result = await db.execute(sql`
    SELECT *
    FROM messaging.campaigns
    WHERE status       = 'SCHEDULED'
      AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
  `)
  return (result.rows ?? []) as Campaign[]
}

// —— Inbox unread (lightweight count for header badge) ——

export async function getInboxUnreadCount({
  userId,
}: {
  userId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt
    FROM messaging.inbox_messages
    WHERE user_id = ${userId} AND is_read = false
  `)
  const row = result.rows[0] as { cnt: number } | undefined
  return row?.cnt ?? 0
}

// —— Campaign send-now queue (atomic) ——

export async function queueCampaignForImmediateDelivery({
  id,
}: {
  id: string
}): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE messaging.campaigns
    SET    status       = 'SCHEDULED',
           scheduled_at = now(),
           updated_at   = now()
    WHERE  id     = ${id}
      AND  status IN ('DRAFT', 'SCHEDULED')
    RETURNING id
  `)
  return (result.rows?.length ?? 0) > 0
}

// —— Campaign deliveries ——

export async function countDeliveriesByCampaignIds({
  campaignIds,
}: {
  campaignIds: string[]
}): Promise<Map<string, number>> {
  const map = new Map<string, number>()
  if (campaignIds.length === 0) return map
  const rows = await db
    .select({
      campaignId: campaignDeliveries.campaign_id,
      cnt: sql<number>`count(*)::int`,
    })
    .from(campaignDeliveries)
    .where(inArray(campaignDeliveries.campaign_id, campaignIds))
    .groupBy(campaignDeliveries.campaign_id)
  for (const row of rows) {
    map.set(row.campaignId, row.cnt)
  }
  return map
}

export async function countDeliveriesForCampaign({
  campaignId,
}: {
  campaignId: string
}): Promise<number> {
  const rows = await db
    .select({ cnt: sql<number>`count(*)::int` })
    .from(campaignDeliveries)
    .where(eq(campaignDeliveries.campaign_id, campaignId))
  return rows[0]?.cnt ?? 0
}

export async function insertCampaignDeliveryRows({
  rows,
}: {
  rows: Array<{
    campaignId: string
    userId: string
    channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'
  }>
}): Promise<void> {
  if (rows.length === 0) return
  await db.insert(campaignDeliveries).values(
    rows.map((r) => ({
      campaign_id: r.campaignId,
      user_id: r.userId,
      channel: r.channel,
      status: 'QUEUED' as const,
    })),
  )
}

export async function updateCampaignDeliveryStatus({
  campaignId,
  userId,
  channel,
  status,
  fromStatus,
}: {
  campaignId: string
  userId: string
  channel: 'EMAIL' | 'SMS' | 'WHATSAPP' | 'PUSH'
  status: 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED'
  fromStatus: 'QUEUED' | 'SENT' | 'FAILED' | 'BOUNCED'
}): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE messaging.campaign_deliveries
    SET    status = ${status}
    WHERE  campaign_id = ${campaignId}
      AND  user_id     = ${userId}
      AND  channel     = ${channel}
      AND  status      = ${fromStatus}
    RETURNING id
  `)
  return (result.rows?.length ?? 0) > 0
}

// —— Campaign audience resolution ——

function audienceJoinAndExtraWhere(filter: Record<string, unknown>): {
  join: ReturnType<typeof sql>
  whereExtra: ReturnType<typeof sql>
} {
  const tier = filter.loyaltyTier
  const tierOk =
    tier === 'GOLD' || tier === 'SILVER' || tier === 'BRONZE'
  const noLoyalty = filter.noLoyaltyAccount === true

  if (tierOk) {
    return {
      join: sql`
        INNER JOIN loyalty.loyalty_accounts la
          ON la.user_id = u.id AND la.tier = ${tier}::loyalty.tier_level`,
      whereExtra: sql``,
    }
  }
  if (noLoyalty) {
    return {
      join: sql`
        LEFT JOIN loyalty.loyalty_accounts la ON la.user_id = u.id`,
      whereExtra: sql`AND la.user_id IS NULL`,
    }
  }
  return {
    join: sql`
      LEFT JOIN loyalty.loyalty_accounts la ON la.user_id = u.id`,
    whereExtra: sql``,
  }
}

function purchasedAfterClause(
  filter: Record<string, unknown>,
): ReturnType<typeof sql> {
  const raw = filter.purchasedAfter
  if (typeof raw !== 'string' || raw.length === 0) return sql``
  const d = new Date(raw)
  if (Number.isNaN(d.getTime())) return sql``
  return sql`AND EXISTS (
    SELECT 1 FROM orders.orders o
    WHERE o.user_id = u.id
      AND o.placed_at IS NOT NULL
      AND o.placed_at >= ${d}
  )`
}

export async function resolveCampaignAudienceRecipients({
  audienceFilterJson,
}: {
  audienceFilterJson: Record<string, unknown>
}): Promise<Array<{ id: string; email: string }>> {
  const filter = audienceFilterJson ?? {}
  const { join, whereExtra } = audienceJoinAndExtraWhere(filter)
  const purchased = purchasedAfterClause(filter)

  const result = await db.execute(sql`
    SELECT u.id, u.email
    FROM iam.users u
    JOIN messaging.notification_preferences np ON np.user_id = u.id
    ${join}
    WHERE np.email_opt_in = true
      AND u.deleted_at IS NULL
      ${whereExtra}
      ${purchased}
  `)
  return (result.rows ?? []) as Array<{ id: string; email: string }>
}

export async function countCampaignAudienceRecipients({
  audienceFilterJson,
}: {
  audienceFilterJson: Record<string, unknown>
}): Promise<number> {
  const filter = audienceFilterJson ?? {}
  const { join, whereExtra } = audienceJoinAndExtraWhere(filter)
  const purchased = purchasedAfterClause(filter)

  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS cnt
    FROM iam.users u
    JOIN messaging.notification_preferences np ON np.user_id = u.id
    ${join}
    WHERE np.email_opt_in = true
      AND u.deleted_at IS NULL
      ${whereExtra}
      ${purchased}
  `)
  const row = result.rows[0] as { cnt: number } | undefined
  return row?.cnt ?? 0
}

/** Atomically claim a scheduled due campaign as SENT (single winner). */
export async function claimCampaignForSending({
  id,
}: {
  id: string
}): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE messaging.campaigns
    SET    status     = 'SENT',
           sent_at    = now(),
           updated_at = now()
    WHERE  id     = ${id}
      AND  status = 'SCHEDULED'
      AND  scheduled_at <= now()
    RETURNING id
  `)
  return (result.rows?.length ?? 0) > 0
}
