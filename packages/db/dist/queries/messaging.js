"use strict";
/**
 * Messaging query functions — outbox, inbox, preferences, BIS/price-drop subscriptions,
 * notify-me events, campaigns. No business logic. RORO. Outbox claim uses withOutboxLock.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.TemplateKey = void 0;
exports.withOutboxLock = withOutboxLock;
exports.createNotificationPreferences = createNotificationPreferences;
exports.getNotificationPreferences = getNotificationPreferences;
exports.updateNotificationPreferences = updateNotificationPreferences;
exports.enqueueNotification = enqueueNotification;
exports.enqueueNotificationBatch = enqueueNotificationBatch;
exports.claimOutboxRow = claimOutboxRow;
exports.markOutboxSent = markOutboxSent;
exports.markOutboxFailed = markOutboxFailed;
exports.getPendingOutboxRows = getPendingOutboxRows;
exports.retryFailedOutboxRows = retryFailedOutboxRows;
exports.createInboxMessage = createInboxMessage;
exports.getInboxForUser = getInboxForUser;
exports.markInboxMessageRead = markInboxMessageRead;
exports.markAllInboxRead = markAllInboxRead;
exports.subscribeBIS = subscribeBIS;
exports.unsubscribeBIS = unsubscribeBIS;
exports.getActiveBISSubscribers = getActiveBISSubscribers;
exports.stampBISNotified = stampBISNotified;
exports.subscribePriceDrop = subscribePriceDrop;
exports.unsubscribePriceDrop = unsubscribePriceDrop;
exports.getPriceDropSubscribers = getPriceDropSubscribers;
exports.recordNotifyMeEvent = recordNotifyMeEvent;
exports.getNotifyMeDemand = getNotifyMeDemand;
exports.createCampaign = createCampaign;
exports.getCampaignById = getCampaignById;
exports.getCampaignCount = getCampaignCount;
exports.listCampaigns = listCampaigns;
exports.updateCampaign = updateCampaign;
exports.scheduleCampaign = scheduleCampaign;
exports.cancelCampaign = cancelCampaign;
exports.markCampaignSent = markCampaignSent;
exports.getScheduledCampaignsDue = getScheduledCampaignsDue;
const node_crypto_1 = __importDefault(require("node:crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const redis_1 = require("../redis");
const errors_1 = require("../errors");
const messaging_schema_1 = require("../schema/messaging.schema");
// —— Template keys (code-defined, no DB table) ——
exports.TemplateKey = {
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
};
// —— Lock helper (RULE 3) ——
async function withOutboxLock(outboxId, fn) {
    const key = `lock:outbox:${outboxId}`;
    const lockId = node_crypto_1.default.randomUUID();
    const acquired = await redis_1.redis.set(key, lockId, 'EX', 30, 'NX');
    if (!acquired) {
        throw new errors_1.MessagingError('OUTBOX_LOCK_NOT_ACQUIRED', 409);
    }
    try {
        return await fn();
    }
    finally {
        await redis_1.redis.eval(`if redis.call('get',KEYS[1])==ARGV[1]
       then return redis.call('del',KEYS[1])
       else return 0 end`, 1, key, lockId);
    }
}
// —— Preferences ——
async function createNotificationPreferences({ userId, }) {
    await client_1.db
        .insert(messaging_schema_1.notificationPreferences)
        .values({
        user_id: userId,
        email_opt_in: true,
        sms_opt_in: false,
        whatsapp_opt_in: false,
        push_opt_in: false,
    })
        .onConflictDoNothing({ target: messaging_schema_1.notificationPreferences.user_id });
}
async function getNotificationPreferences({ userId, }) {
    const rows = await client_1.db
        .select()
        .from(messaging_schema_1.notificationPreferences)
        .where((0, drizzle_orm_1.eq)(messaging_schema_1.notificationPreferences.user_id, userId));
    return rows[0] ?? null;
}
async function updateNotificationPreferences({ userId, emailOptIn, smsOptIn, whatsappOptIn, pushOptIn, }) {
    const updates = {};
    if (emailOptIn !== undefined)
        updates.email_opt_in = emailOptIn;
    if (smsOptIn !== undefined)
        updates.sms_opt_in = smsOptIn;
    if (whatsappOptIn !== undefined)
        updates.whatsapp_opt_in = whatsappOptIn;
    if (pushOptIn !== undefined)
        updates.push_opt_in = pushOptIn;
    if (Object.keys(updates).length === 0) {
        const prefs = await getNotificationPreferences({ userId });
        if (!prefs)
            throw new errors_1.MessagingError('PREFERENCES_NOT_FOUND', 404);
        return prefs;
    }
    const result = await client_1.db
        .update(messaging_schema_1.notificationPreferences)
        .set({ ...updates, updated_at: new Date() })
        .where((0, drizzle_orm_1.eq)(messaging_schema_1.notificationPreferences.user_id, userId))
        .returning();
    if (result.length === 0) {
        throw new errors_1.MessagingError('PREFERENCES_NOT_FOUND', 404);
    }
    return result[0];
}
// —— Outbox ——
async function enqueueNotification({ userId, channel, templateKey, payloadJson, dedupeKey, }) {
    await client_1.db
        .insert(messaging_schema_1.notificationOutbox)
        .values({
        user_id: userId ?? null,
        channel,
        template_key: templateKey,
        payload_json: payloadJson,
        dedupe_key: dedupeKey,
        status: 'PENDING',
        attempts: 0,
    })
        .onConflictDoNothing({ target: messaging_schema_1.notificationOutbox.dedupe_key });
}
async function enqueueNotificationBatch(notifications) {
    if (notifications.length === 0)
        return;
    await client_1.db
        .insert(messaging_schema_1.notificationOutbox)
        .values(notifications.map((n) => ({
        user_id: n.userId ?? null,
        channel: n.channel,
        template_key: n.templateKey,
        payload_json: n.payloadJson,
        dedupe_key: n.dedupeKey,
        status: 'PENDING',
        attempts: 0,
    })))
        .onConflictDoNothing({ target: messaging_schema_1.notificationOutbox.dedupe_key });
}
async function claimOutboxRow({ id, }) {
    return withOutboxLock(id, async () => {
        const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
      UPDATE messaging.notification_outbox
      SET    status   = 'SENDING',
             attempts = attempts + 1
      WHERE  id     = ${id}
        AND  status = 'PENDING'
      RETURNING *
    `);
        if (!result.rows.length) {
            throw new errors_1.MessagingError('OUTBOX_NOT_PENDING', 409);
        }
        return result.rows[0];
    });
}
async function markOutboxSent({ id, providerMessageId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE messaging.notification_outbox
    SET    status  = 'SENT',
           sent_at = now()
    WHERE  id     = ${id}
      AND  status = 'SENDING'
    RETURNING id, user_id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.MessagingError('OUTBOX_NOT_PENDING', 409);
    }
    const row = result.rows[0];
    if (providerMessageId != null && providerMessageId !== '') {
        await client_1.db.insert(messaging_schema_1.emailDeliveryLog).values({
            user_id: row.user_id,
            notification_outbox_id: id,
            provider_message_id: providerMessageId,
            status: 'SENT',
        });
    }
}
async function markOutboxFailed({ id }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE messaging.notification_outbox
    SET    status    = 'FAILED',
           failed_at = now()
    WHERE  id     = ${id}
      AND  status = 'SENDING'
    RETURNING id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.MessagingError('OUTBOX_NOT_PENDING', 409);
    }
}
async function getPendingOutboxRows({ limit = 50, } = {}) {
    const result = await client_1.db
        .select()
        .from(messaging_schema_1.notificationOutbox)
        .where((0, drizzle_orm_1.eq)(messaging_schema_1.notificationOutbox.status, 'PENDING'))
        .orderBy((0, drizzle_orm_1.asc)(messaging_schema_1.notificationOutbox.created_at))
        .limit(limit);
    return result;
}
async function retryFailedOutboxRows({ maxAttempts = 3, limit = 20, } = {}) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
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
  `);
    return result.rows.length;
}
// —— Inbox ——
async function createInboxMessage({ userId, type, title, body, ctaLabel, ctaUrl, metadataJson, }) {
    const [row] = await client_1.db
        .insert(messaging_schema_1.inboxMessages)
        .values({
        user_id: userId,
        type,
        title,
        body,
        cta_label: ctaLabel ?? null,
        cta_url: ctaUrl ?? null,
        metadata_json: metadataJson ?? {},
    })
        .returning();
    if (!row)
        throw new Error('createInboxMessage: no row returned');
    return row;
}
async function getInboxForUser({ userId, page = 1, limit = 20, unreadOnly = false, }) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const offset = (page - 1) * safeLimit;
    const condition = unreadOnly
        ? (0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.user_id, userId), (0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.is_read, false))
        : (0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.user_id, userId);
    const messages = await client_1.db
        .select()
        .from(messaging_schema_1.inboxMessages)
        .where(condition)
        .orderBy((0, drizzle_orm_1.desc)(messaging_schema_1.inboxMessages.created_at))
        .limit(safeLimit)
        .offset(offset);
    const totalResult = unreadOnly
        ? await client_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COUNT(*)::int AS total
        FROM messaging.inbox_messages
        WHERE user_id = ${userId} AND is_read = false
      `)
        : await client_1.db.execute((0, drizzle_orm_1.sql) `
        SELECT COUNT(*)::int AS total
        FROM messaging.inbox_messages
        WHERE user_id = ${userId}
      `);
    const totalNum = Number(totalResult.rows[0]?.total ?? 0);
    const unreadResult = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT COUNT(*)::int AS cnt
    FROM messaging.inbox_messages
    WHERE user_id = ${userId} AND is_read = false
  `);
    const unreadCount = unreadResult.rows[0]?.cnt ?? 0;
    return { messages, unreadCount, page, limit: safeLimit, total: totalNum };
}
async function markInboxMessageRead({ id, userId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE messaging.inbox_messages
    SET    is_read = true
    WHERE  id      = ${id}
      AND  user_id = ${userId}
      AND  is_read = false
    RETURNING id
  `);
    if (result.rows.length === 0) {
        const exists = await client_1.db
            .select({ id: messaging_schema_1.inboxMessages.id })
            .from(messaging_schema_1.inboxMessages)
            .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.id, id), (0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.user_id, userId)));
        if (exists.length === 0) {
            throw new errors_1.MessagingError('MESSAGE_NOT_FOUND', 404);
        }
        throw new errors_1.MessagingError('MESSAGE_ALREADY_READ', 409);
    }
}
async function markAllInboxRead({ userId, }) {
    await client_1.db
        .update(messaging_schema_1.inboxMessages)
        .set({ is_read: true })
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.user_id, userId), (0, drizzle_orm_1.eq)(messaging_schema_1.inboxMessages.is_read, false)));
}
// —— Back-in-stock subscriptions ——
async function subscribeBIS({ userId, variantId, channelsJson, }) {
    await client_1.db
        .insert(messaging_schema_1.backInStockSubscriptions)
        .values({
        user_id: userId ?? null,
        variant_id: variantId,
        channels_json: channelsJson ?? ['EMAIL'],
    })
        .onConflictDoNothing({
        target: [
            messaging_schema_1.backInStockSubscriptions.user_id,
            messaging_schema_1.backInStockSubscriptions.variant_id,
        ],
    });
}
async function unsubscribeBIS({ userId, variantId, }) {
    const result = await client_1.db
        .delete(messaging_schema_1.backInStockSubscriptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.backInStockSubscriptions.user_id, userId), (0, drizzle_orm_1.eq)(messaging_schema_1.backInStockSubscriptions.variant_id, variantId)))
        .returning({ id: messaging_schema_1.backInStockSubscriptions.id });
    if (result.length === 0) {
        throw new errors_1.MessagingError('BIS_SUBSCRIPTION_NOT_FOUND', 404);
    }
}
async function getActiveBISSubscribers({ variantId, }) {
    const rows = await client_1.db
        .select()
        .from(messaging_schema_1.backInStockSubscriptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.backInStockSubscriptions.variant_id, variantId), (0, drizzle_orm_1.sql) `${messaging_schema_1.backInStockSubscriptions.notified_at} IS NULL`));
    return rows;
}
async function stampBISNotified({ id }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE messaging.back_in_stock_subscriptions
    SET    notified_at = now()
    WHERE  id          = ${id}
      AND  notified_at IS NULL
    RETURNING id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.MessagingError('SUBSCRIPTION_ALREADY_NOTIFIED', 409);
    }
}
// —— Price-drop subscriptions ——
async function subscribePriceDrop({ userId, variantId, targetPrice, channelsJson, }) {
    await client_1.db
        .insert(messaging_schema_1.priceDropSubscriptions)
        .values({
        user_id: userId,
        variant_id: variantId,
        target_price: targetPrice ?? null,
        channels_json: channelsJson ?? ['EMAIL'],
    })
        .onConflictDoUpdate({
        target: [
            messaging_schema_1.priceDropSubscriptions.user_id,
            messaging_schema_1.priceDropSubscriptions.variant_id,
        ],
        set: {
            target_price: targetPrice ?? null,
            channels_json: channelsJson ?? ['EMAIL'],
        },
    });
}
async function unsubscribePriceDrop({ userId, variantId, }) {
    const result = await client_1.db
        .delete(messaging_schema_1.priceDropSubscriptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.priceDropSubscriptions.user_id, userId), (0, drizzle_orm_1.eq)(messaging_schema_1.priceDropSubscriptions.variant_id, variantId)))
        .returning({ id: messaging_schema_1.priceDropSubscriptions.id });
    if (result.length === 0) {
        throw new errors_1.MessagingError('PRICE_DROP_SUBSCRIPTION_NOT_FOUND', 404);
    }
}
async function getPriceDropSubscribers({ variantId, newPrice, currency, }) {
    const rows = await client_1.db
        .select()
        .from(messaging_schema_1.priceDropSubscriptions)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.priceDropSubscriptions.variant_id, variantId), (0, drizzle_orm_1.sql) `(target_price IS NULL OR target_price >= ${newPrice})`));
    return rows;
}
// —— Notify-me events (demand analytics) ——
async function recordNotifyMeEvent({ variantId, userId, sessionId, }) {
    await client_1.db.insert(messaging_schema_1.notifyMeEvents).values({
        variant_id: variantId,
        user_id: userId ?? null,
        session_id: sessionId,
    });
}
async function getNotifyMeDemand({ limit = 50, } = {}) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      variant_id AS "variantId",
      COUNT(*)::int AS "clickCount",
      COUNT(user_id) FILTER (WHERE user_id IS NOT NULL)::int AS "registeredUserCount",
      MAX(created_at) AS "lastClickAt"
    FROM messaging.notify_me_events
    GROUP BY variant_id
    ORDER BY COUNT(*) DESC
    LIMIT ${limit}
  `);
    const rows = result.rows ?? [];
    return rows.map((row) => ({
        variantId: String(row.variantId),
        clickCount: Number(row.clickCount),
        registeredUserCount: Number(row.registeredUserCount),
        lastClickAt: row.lastClickAt instanceof Date
            ? row.lastClickAt
            : new Date(String(row.lastClickAt)),
    }));
}
// —— Campaigns ——
async function createCampaign({ name, contentJson, channelsJson, audienceFilterJson, adminId, }) {
    const [row] = await client_1.db
        .insert(messaging_schema_1.campaigns)
        .values({
        name,
        content_json: contentJson,
        channels_json: channelsJson ?? ['EMAIL'],
        audience_filter_json: audienceFilterJson ?? {},
        status: 'DRAFT',
        created_by_admin_id: adminId ?? null,
    })
        .returning();
    if (!row)
        throw new Error('createCampaign: no row returned');
    return row;
}
async function getCampaignById({ id, }) {
    const rows = await client_1.db
        .select()
        .from(messaging_schema_1.campaigns)
        .where((0, drizzle_orm_1.eq)(messaging_schema_1.campaigns.id, id));
    return rows[0] ?? null;
}
async function getCampaignCount({ status, } = {}) {
    const condition = status ? (0, drizzle_orm_1.eq)(messaging_schema_1.campaigns.status, status) : undefined;
    const base = client_1.db.select({ count: (0, drizzle_orm_1.sql) `count(*)::int` }).from(messaging_schema_1.campaigns);
    const rows = condition ? await base.where(condition) : await base;
    return rows[0]?.count ?? 0;
}
async function listCampaigns({ page = 1, limit = 50, status, }) {
    const offset = (page - 1) * limit;
    const base = client_1.db
        .select()
        .from(messaging_schema_1.campaigns)
        .orderBy((0, drizzle_orm_1.desc)(messaging_schema_1.campaigns.created_at))
        .limit(limit)
        .offset(offset);
    const rows = status
        ? await base.where((0, drizzle_orm_1.eq)(messaging_schema_1.campaigns.status, status))
        : await base;
    return rows;
}
async function updateCampaign({ id, name, contentJson, channelsJson, audienceFilterJson, }) {
    const updates = { updated_at: new Date() };
    if (name !== undefined)
        updates.name = name;
    if (contentJson !== undefined)
        updates.content_json = contentJson;
    if (channelsJson !== undefined)
        updates.channels_json = channelsJson;
    if (audienceFilterJson !== undefined) {
        updates.audience_filter_json = audienceFilterJson;
    }
    const result = await client_1.db
        .update(messaging_schema_1.campaigns)
        .set(updates)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(messaging_schema_1.campaigns.id, id), (0, drizzle_orm_1.eq)(messaging_schema_1.campaigns.status, 'DRAFT')))
        .returning();
    if (result.length === 0) {
        throw new errors_1.MessagingError('CAMPAIGN_NOT_DRAFT', 409);
    }
    return result[0];
}
async function scheduleCampaign({ id, scheduledAt, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE messaging.campaigns
    SET    status       = 'SCHEDULED',
           scheduled_at = ${scheduledAt},
           updated_at   = now()
    WHERE  id     = ${id}
      AND  status = 'DRAFT'
    RETURNING id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.MessagingError('CAMPAIGN_NOT_DRAFT', 409);
    }
}
async function cancelCampaign({ id }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE messaging.campaigns
    SET    status     = 'CANCELLED',
           updated_at = now()
    WHERE  id     = ${id}
      AND  status IN ('DRAFT', 'SCHEDULED')
    RETURNING id
  `);
    if (result.rows.length === 0) {
        const campaign = await getCampaignById({ id });
        if (!campaign)
            throw new errors_1.MessagingError('CAMPAIGN_NOT_FOUND', 404);
        throw new errors_1.MessagingError('CAMPAIGN_ALREADY_SENT', 409);
    }
}
async function markCampaignSent({ id }) {
    await client_1.db.transaction(async (tx) => {
        const result = await tx.execute((0, drizzle_orm_1.sql) `
      UPDATE messaging.campaigns
      SET    status     = 'SENT',
             sent_at    = now(),
             updated_at = now()
      WHERE  id     = ${id}
        AND  status = 'SCHEDULED'
      RETURNING id
    `);
        if (result.rows.length === 0) {
            throw new errors_1.MessagingError('CAMPAIGN_NOT_SCHEDULED', 409);
        }
    });
}
async function getScheduledCampaignsDue() {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT *
    FROM messaging.campaigns
    WHERE status       = 'SCHEDULED'
      AND scheduled_at <= now()
    ORDER BY scheduled_at ASC
  `);
    return (result.rows ?? []);
}
