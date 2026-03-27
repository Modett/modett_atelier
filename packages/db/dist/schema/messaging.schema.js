"use strict";
/**
 * Messaging schema — inbox, outbox, campaigns, subscriptions, delivery log
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.notifyMeEvents = exports.campaignDeliveries = exports.campaigns = exports.priceDropSubscriptions = exports.backInStockSubscriptions = exports.emailDeliveryLog = exports.notificationOutbox = exports.notificationPreferences = exports.inboxMessages = exports.deliveryStatusEnum = exports.campaignStatusEnum = exports.outboxStatusEnum = exports.channelEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const iam_schema_1 = require("./iam.schema");
const iam_schema_2 = require("./iam.schema");
const inventory_schema_1 = require("./inventory.schema");
const messaging = (0, pg_core_1.pgSchema)('messaging');
exports.channelEnum = messaging.enum('channel', [
    'EMAIL',
    'SMS',
    'WHATSAPP',
    'PUSH',
]);
exports.outboxStatusEnum = messaging.enum('outbox_status', [
    'PENDING',
    'SENDING', // worker-only intermediate state; not returned by API
    'SENT',
    'FAILED',
]);
exports.campaignStatusEnum = messaging.enum('campaign_status', [
    'DRAFT',
    'SCHEDULED',
    'SENT',
    'CANCELLED',
]);
exports.deliveryStatusEnum = messaging.enum('delivery_status', [
    'QUEUED',
    'SENT',
    'FAILED',
    'BOUNCED',
]);
exports.inboxMessages = messaging.table('inbox_messages', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => iam_schema_1.users.id, { onDelete: 'cascade' }),
    type: (0, pg_core_1.text)('type').notNull(),
    title: (0, pg_core_1.text)('title').notNull(),
    body: (0, pg_core_1.text)('body').notNull(),
    cta_label: (0, pg_core_1.text)('cta_label'),
    cta_url: (0, pg_core_1.text)('cta_url'),
    metadata_json: (0, pg_core_1.jsonb)('metadata_json').notNull().default({}),
    is_read: (0, pg_core_1.boolean)('is_read').notNull().default(false),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.notificationPreferences = messaging.table('notification_preferences', {
    user_id: (0, pg_core_1.uuid)('user_id')
        .primaryKey()
        .references(() => iam_schema_1.users.id, { onDelete: 'cascade' }),
    email_opt_in: (0, pg_core_1.boolean)('email_opt_in').notNull().default(true),
    sms_opt_in: (0, pg_core_1.boolean)('sms_opt_in').notNull().default(false),
    whatsapp_opt_in: (0, pg_core_1.boolean)('whatsapp_opt_in').notNull().default(false),
    push_opt_in: (0, pg_core_1.boolean)('push_opt_in').notNull().default(false),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.notificationOutbox = messaging.table('notification_outbox', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, { onDelete: 'set null' }),
    channel: (0, exports.channelEnum)('channel').notNull(),
    template_key: (0, pg_core_1.text)('template_key').notNull(),
    payload_json: (0, pg_core_1.jsonb)('payload_json').notNull(),
    dedupe_key: (0, pg_core_1.text)('dedupe_key').notNull().unique(),
    status: (0, exports.outboxStatusEnum)('status').notNull().default('PENDING'),
    attempts: (0, pg_core_1.smallint)('attempts').notNull().default(0),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    sent_at: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    failed_at: (0, pg_core_1.timestamp)('failed_at', { withTimezone: true }),
});
exports.emailDeliveryLog = messaging.table('email_delivery_log', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, { onDelete: 'set null' }),
    notification_outbox_id: (0, pg_core_1.uuid)('notification_outbox_id')
        .notNull()
        .references(() => exports.notificationOutbox.id),
    provider_message_id: (0, pg_core_1.text)('provider_message_id'),
    status: (0, exports.deliveryStatusEnum)('status').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.backInStockSubscriptions = messaging.table('back_in_stock_subscriptions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, {
        onDelete: 'set null',
    }),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => inventory_schema_1.productVariants.id, { onDelete: 'cascade' }),
    channels_json: (0, pg_core_1.jsonb)('channels_json').notNull().default(['EMAIL']),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    notified_at: (0, pg_core_1.timestamp)('notified_at', { withTimezone: true }),
}, (t) => [(0, pg_core_1.unique)('uq_bis_user_variant').on(t.user_id, t.variant_id)]);
exports.priceDropSubscriptions = messaging.table('price_drop_subscriptions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, {
        onDelete: 'set null',
    }),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => inventory_schema_1.productVariants.id, { onDelete: 'cascade' }),
    target_price: (0, pg_core_1.numeric)('target_price', { precision: 12, scale: 2 }),
    channels_json: (0, pg_core_1.jsonb)('channels_json').notNull().default(['EMAIL']),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.unique)('uq_price_drop_user_variant').on(t.user_id, t.variant_id),
    (0, pg_core_1.check)('chk_price_drop_target_positive', (0, drizzle_orm_1.sql) `(${t.target_price} IS NULL OR ${t.target_price} > 0)`),
]);
exports.campaigns = messaging.table('campaigns', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    content_json: (0, pg_core_1.jsonb)('content_json').notNull(),
    channels_json: (0, pg_core_1.jsonb)('channels_json').notNull().default(['EMAIL']),
    audience_filter_json: (0, pg_core_1.jsonb)('audience_filter_json').notNull().default({}),
    status: (0, exports.campaignStatusEnum)('status').notNull().default('DRAFT'),
    created_by_admin_id: (0, pg_core_1.uuid)('created_by_admin_id').references(() => iam_schema_2.admins.id, {
        onDelete: 'set null',
    }),
    scheduled_at: (0, pg_core_1.timestamp)('scheduled_at', { withTimezone: true }),
    sent_at: (0, pg_core_1.timestamp)('sent_at', { withTimezone: true }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.campaignDeliveries = messaging.table('campaign_deliveries', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    campaign_id: (0, pg_core_1.uuid)('campaign_id')
        .notNull()
        .references(() => exports.campaigns.id, { onDelete: 'cascade' }),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, { onDelete: 'set null' }),
    channel: (0, exports.channelEnum)('channel').notNull(),
    status: (0, exports.deliveryStatusEnum)('status').notNull().default('QUEUED'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.notifyMeEvents = messaging.table('notify_me_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => inventory_schema_1.productVariants.id, { onDelete: 'cascade' }),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, { onDelete: 'set null' }),
    session_id: (0, pg_core_1.text)('session_id').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
