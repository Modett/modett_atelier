/**
 * Reviews schema — review_request_tokens, reviews, review_media, review_flags
 * Mirrors packages/db/migrations/0001_initial.sql
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  smallint,
} from 'drizzle-orm/pg-core'
import { users } from './iam.schema'
import { admins } from './iam.schema'
import { ordersTable } from './orders.schema'
import { orderItems } from './orders.schema'
import { products } from './catalog.schema'
import { productVariants } from './inventory.schema'

const reviews = pgSchema('reviews')

export const reviewStatusEnum = reviews.enum('review_status', [
  'VISIBLE',
  'HIDDEN',
])
export const mediaTypeEnum = reviews.enum('media_type', ['IMAGE'])

export const reviewRequestTokens = reviews.table('review_request_tokens', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_item_id: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  token_hash: text('token_hash').notNull().unique(),
  expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
  used_at: timestamp('used_at', { withTimezone: true }),
})

export const reviewsTable = reviews.table('reviews', {
  id: uuid('id').primaryKey().defaultRandom(),
  user_id: uuid('user_id')
    .notNull()
    .references(() => users.id, { onDelete: 'cascade' }),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id),
  order_item_id: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id)
    .unique(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id),
  variant_id: uuid('variant_id').references(() => productVariants.id, {
    onDelete: 'set null',
  }),
  rating: smallint('rating').notNull(),
  body: text('body'),
  status: reviewStatusEnum('status').notNull().default('VISIBLE'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const reviewMedia = reviews.table('review_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  review_id: uuid('review_id')
    .notNull()
    .references(() => reviewsTable.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: mediaTypeEnum('type').notNull().default('IMAGE'),
  sort_order: integer('sort_order').notNull().default(0),
})

export const reviewFlags = reviews.table('review_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  review_id: uuid('review_id')
    .notNull()
    .references(() => reviewsTable.id, { onDelete: 'cascade' })
    .unique(),
  reason: text('reason').notNull(),
  auto_flagged: boolean('auto_flagged').notNull().default(false),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolved_at: timestamp('resolved_at', { withTimezone: true }),
  resolved_by_admin_id: uuid('resolved_by_admin_id').references(
    () => admins.id,
    { onDelete: 'set null' },
  ),
})
