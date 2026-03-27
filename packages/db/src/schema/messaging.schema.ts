/**
 * Messaging schema — inbox, outbox, campaigns, subscriptions, delivery log
 * Mirrors packages/db/migrations/0001_initial.sql
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  smallint,
  timestamp,
  jsonb,
  numeric,
  unique,
  check,
} from 'drizzle-orm/pg-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { users } from './iam.schema'
import { admins } from './iam.schema'
import { productVariants } from './inventory.schema'

const messaging = pgSchema('messaging')

export const channelEnum = messaging.enum('channel', [
  'EMAIL',
  'SMS',
  'WHATSAPP',
  'PUSH',
])
export const outboxStatusEnum = messaging.enum('outbox_status', [
  'PENDING',
  'SENDING', // worker-only intermediate state; not returned by API
  'SENT',
  'FAILED',
])
export const campaignStatusEnum = messaging.enum('campaign_status', [
  'DRAFT',
  'SCHEDULED',
  'SENT',
  'CANCELLED',
])
export const deliveryStatusEnum = messaging.enum('delivery_status', [
  'QUEUED',
  'SENT',
  'FAILED',
  'BOUNCED',
])

export const inboxMessages = messaging.table('inbox_messages', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  type: text('type').notNull(),
  title: text('title').notNull(),
  body: text('body').notNull(),
  cta_label: text('cta_label'),
  cta_url: text('cta_url'),
  metadata_json: jsonb('metadata_json').notNull().default({}),
  is_read: boolean('is_read').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const notificationPreferences = messaging.table(
  'notification_preferences',
  {
    user_id: uuid('user_id')
      .primaryKey()
      .references(() => users.id, { onDelete: 'cascade' }),
    email_opt_in: boolean('email_opt_in').notNull().default(true),
    sms_opt_in: boolean('sms_opt_in').notNull().default(false),
    whatsapp_opt_in: boolean('whatsapp_opt_in').notNull().default(false),
    push_opt_in: boolean('push_opt_in').notNull().default(false),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
)

export const notificationOutbox = messaging.table('notification_outbox', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  channel: channelEnum('channel').notNull(),
  template_key: text('template_key').notNull(),
  payload_json: jsonb('payload_json').notNull(),
  dedupe_key: text('dedupe_key').notNull().unique(),
  status: outboxStatusEnum('status').notNull().default('PENDING'),
  attempts: smallint('attempts').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  failed_at: timestamp('failed_at', { withTimezone: true }),
})

export const emailDeliveryLog = messaging.table('email_delivery_log', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  notification_outbox_id: uuid('notification_outbox_id')
    .notNull()
    .references(() => notificationOutbox.id),
  provider_message_id: text('provider_message_id'),
  status: deliveryStatusEnum('status').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const backInStockSubscriptions = messaging.table(
  'back_in_stock_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    variant_id: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    channels_json: jsonb('channels_json').notNull().default(['EMAIL']),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    notified_at: timestamp('notified_at', { withTimezone: true }),
  },
  (t) => [unique('uq_bis_user_variant').on(t.user_id, t.variant_id)],
)

export const priceDropSubscriptions = messaging.table(
  'price_drop_subscriptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    variant_id: uuid('variant_id')
      .notNull()
      .references(() => productVariants.id, { onDelete: 'cascade' }),
    target_price: numeric('target_price', { precision: 12, scale: 2 }),
    channels_json: jsonb('channels_json').notNull().default(['EMAIL']),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('uq_price_drop_user_variant').on(t.user_id, t.variant_id),
    check('chk_price_drop_target_positive', sql`(${t.target_price} IS NULL OR ${t.target_price} > 0)`),
  ],
)

export const campaigns = messaging.table('campaigns', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  content_json: jsonb('content_json').notNull(),
  channels_json: jsonb('channels_json').notNull().default(['EMAIL']),
  audience_filter_json: jsonb('audience_filter_json').notNull().default({}),
  status: campaignStatusEnum('status').notNull().default('DRAFT'),
  created_by_admin_id: uuid('created_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  scheduled_at: timestamp('scheduled_at', { withTimezone: true }),
  sent_at: timestamp('sent_at', { withTimezone: true }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const campaignDeliveries = messaging.table('campaign_deliveries', {
  id: uuid('id').primaryKey().defaultRandom(),
  campaign_id: uuid('campaign_id')
    .notNull()
    .references(() => campaigns.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  channel: channelEnum('channel').notNull(),
  status: deliveryStatusEnum('status').notNull().default('QUEUED'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const notifyMeEvents = messaging.table('notify_me_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  variant_id: uuid('variant_id')
    .notNull()
    .references(() => productVariants.id, { onDelete: 'cascade' }),
  user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
  session_id: text('session_id').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Inferred types
export type InboxMessage = InferSelectModel<typeof inboxMessages>
export type NewInboxMessage = InferInsertModel<typeof inboxMessages>
export type NotificationPreferences = InferSelectModel<typeof notificationPreferences>
export type NewNotificationPreferences = InferInsertModel<typeof notificationPreferences>
export type NotificationOutboxRow = InferSelectModel<typeof notificationOutbox>
export type NewNotificationOutboxRow = InferInsertModel<typeof notificationOutbox>
export type EmailDeliveryLogRow = InferSelectModel<typeof emailDeliveryLog>
export type NewEmailDeliveryLogRow = InferInsertModel<typeof emailDeliveryLog>
export type BackInStockSubscription = InferSelectModel<typeof backInStockSubscriptions>
export type NewBackInStockSubscription = InferInsertModel<typeof backInStockSubscriptions>
export type PriceDropSubscription = InferSelectModel<typeof priceDropSubscriptions>
export type NewPriceDropSubscription = InferInsertModel<typeof priceDropSubscriptions>
export type Campaign = InferSelectModel<typeof campaigns>
export type NewCampaign = InferInsertModel<typeof campaigns>
export type CampaignDelivery = InferSelectModel<typeof campaignDeliveries>
export type NewCampaignDelivery = InferInsertModel<typeof campaignDeliveries>
export type NotifyMeEvent = InferSelectModel<typeof notifyMeEvents>
export type NewNotifyMeEvent = InferInsertModel<typeof notifyMeEvents>
