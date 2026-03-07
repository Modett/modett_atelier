/**
 * Reviews schema — review_request_tokens, reviews, review_media, review_flags
 * Mirrors packages/db/migrations/0001_initial.sql
 * camelCase property names map to snake_case column names.
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  smallint,
  check,
  unique,
} from 'drizzle-orm/pg-core'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { users, admins } from './iam.schema'
import { ordersTable } from './orders.schema'
import { orderItems } from './orders.schema'
import { products } from './catalog.schema'
import { productVariants } from './inventory.schema'

const reviewsSchema = pgSchema('reviews')

export const reviewStatusEnum = reviewsSchema.enum('review_status', [
  'VISIBLE',
  'HIDDEN',
])
export const mediaTypeEnum = reviewsSchema.enum('media_type', ['IMAGE'])

export const reviewRequestTokens = reviewsSchema.table(
  'review_request_tokens',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id, { onDelete: 'cascade' }),
    tokenHash: text('token_hash').notNull().unique('uq_review_token_hash'),
    expiresAt: timestamp('expires_at', { withTimezone: true }).notNull(),
    usedAt: timestamp('used_at', { withTimezone: true }),
  },
  (t) => [unique('uq_review_request_tokens_order_item').on(t.orderItemId)],
)

export const reviewsTable = reviewsSchema.table(
  'reviews',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    userId: uuid('user_id')
      .notNull()
      .references(() => users.id, { onDelete: 'cascade' }),
    orderId: uuid('order_id')
      .notNull()
      .references(() => ordersTable.id),
    orderItemId: uuid('order_item_id')
      .notNull()
      .references(() => orderItems.id)
      .unique('uq_reviews_order_item'),
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id),
    variantId: uuid('variant_id').references(() => productVariants.id, {
      onDelete: 'set null',
    }),
    rating: smallint('rating').notNull(),
    body: text('body'),
    status: reviewStatusEnum('status').notNull().default('VISIBLE'),
    createdAt: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('chk_reviews_rating_range', sql`${t.rating} >= 1 AND ${t.rating} <= 5`),
  ],
)

export const reviewMedia = reviewsSchema.table('review_media', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviewsTable.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  type: mediaTypeEnum('type').notNull().default('IMAGE'),
  sortOrder: integer('sort_order').notNull().default(0),
})

export const reviewFlags = reviewsSchema.table('review_flags', {
  id: uuid('id').primaryKey().defaultRandom(),
  reviewId: uuid('review_id')
    .notNull()
    .references(() => reviewsTable.id, { onDelete: 'cascade' })
    .unique('uq_review_flags_review'),
  reason: text('reason').notNull(),
  autoFlagged: boolean('auto_flagged').notNull().default(false),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  resolvedAt: timestamp('resolved_at', { withTimezone: true }),
  resolvedByAdminId: uuid('resolved_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
})

export type ReviewRequestToken = InferSelectModel<typeof reviewRequestTokens>
export type NewReviewRequestToken = InferInsertModel<typeof reviewRequestTokens>
export type Review = InferSelectModel<typeof reviewsTable>
export type NewReview = InferInsertModel<typeof reviewsTable>
export type ReviewMedia = InferSelectModel<typeof reviewMedia>
export type NewReviewMedia = InferInsertModel<typeof reviewMedia>
export type ReviewFlag = InferSelectModel<typeof reviewFlags>
export type NewReviewFlag = InferInsertModel<typeof reviewFlags>

export { reviewsTable as reviews }
