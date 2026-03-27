"use strict";
/**
 * Reviews schema — review_request_tokens, reviews, review_media, review_flags
 * Mirrors packages/db/migrations/0001_initial.sql
 * camelCase property names map to snake_case column names.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reviews = exports.reviewFlags = exports.reviewMedia = exports.reviewsTable = exports.reviewRequestTokens = exports.mediaTypeEnum = exports.reviewStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const iam_schema_1 = require("./iam.schema");
const orders_schema_1 = require("./orders.schema");
const orders_schema_2 = require("./orders.schema");
const catalog_schema_1 = require("./catalog.schema");
const inventory_schema_1 = require("./inventory.schema");
const reviewsSchema = (0, pg_core_1.pgSchema)('reviews');
exports.reviewStatusEnum = reviewsSchema.enum('review_status', [
    'VISIBLE',
    'HIDDEN',
]);
exports.mediaTypeEnum = reviewsSchema.enum('media_type', ['IMAGE']);
exports.reviewRequestTokens = reviewsSchema.table('review_request_tokens', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    orderItemId: (0, pg_core_1.uuid)('order_item_id')
        .notNull()
        .references(() => orders_schema_2.orderItems.id, { onDelete: 'cascade' }),
    tokenHash: (0, pg_core_1.text)('token_hash').notNull().unique('uq_review_token_hash'),
    expiresAt: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    usedAt: (0, pg_core_1.timestamp)('used_at', { withTimezone: true }),
}, (t) => [(0, pg_core_1.unique)('uq_review_request_tokens_order_item').on(t.orderItemId)]);
exports.reviewsTable = reviewsSchema.table('reviews', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    userId: (0, pg_core_1.uuid)('user_id')
        .notNull()
        .references(() => iam_schema_1.users.id, { onDelete: 'cascade' }),
    orderId: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.ordersTable.id),
    orderItemId: (0, pg_core_1.uuid)('order_item_id')
        .notNull()
        .references(() => orders_schema_2.orderItems.id)
        .unique('uq_reviews_order_item'),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => catalog_schema_1.products.id),
    variantId: (0, pg_core_1.uuid)('variant_id').references(() => inventory_schema_1.productVariants.id, {
        onDelete: 'set null',
    }),
    rating: (0, pg_core_1.smallint)('rating').notNull(),
    body: (0, pg_core_1.text)('body'),
    status: (0, exports.reviewStatusEnum)('status').notNull().default('VISIBLE'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.check)('chk_reviews_rating_range', (0, drizzle_orm_1.sql) `${t.rating} >= 1 AND ${t.rating} <= 5`),
]);
exports.reviews = exports.reviewsTable;
exports.reviewMedia = reviewsSchema.table('review_media', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    reviewId: (0, pg_core_1.uuid)('review_id')
        .notNull()
        .references(() => exports.reviewsTable.id, { onDelete: 'cascade' }),
    url: (0, pg_core_1.text)('url').notNull(),
    type: (0, exports.mediaTypeEnum)('type').notNull().default('IMAGE'),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
});
exports.reviewFlags = reviewsSchema.table('review_flags', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    reviewId: (0, pg_core_1.uuid)('review_id')
        .notNull()
        .references(() => exports.reviewsTable.id, { onDelete: 'cascade' })
        .unique('uq_review_flags_review'),
    reason: (0, pg_core_1.text)('reason').notNull(),
    autoFlagged: (0, pg_core_1.boolean)('auto_flagged').notNull().default(false),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    resolvedAt: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    resolvedByAdminId: (0, pg_core_1.uuid)('resolved_by_admin_id').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
});
