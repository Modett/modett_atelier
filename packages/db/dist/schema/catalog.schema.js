"use strict";
/**
 * Catalog schema — categories, products, prices, images, styling guides, banners
 * Mirrors packages/db/migrations/0001_initial.sql
 * Column mapping: camelCase property → snake_case column
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.banners = exports.bestsellerList = exports.productStylingGuides = exports.productRelations = exports.productPrices = exports.productImages = exports.products = exports.categories = exports.stylingGuideTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const iam_schema_1 = require("./iam.schema");
const catalog = (0, pg_core_1.pgSchema)('catalog');
exports.stylingGuideTypeEnum = catalog.enum('styling_guide_type', [
    'VIDEO',
    'GALLERY',
    'TEXT',
]);
exports.categories = catalog.table('categories', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    slug: (0, pg_core_1.text)('slug').notNull().unique('uq_categories_slug'),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.products = catalog.table('products', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    categoryId: (0, pg_core_1.uuid)('category_id').references(() => exports.categories.id),
    slug: (0, pg_core_1.text)('slug').notNull().unique('uq_products_slug'),
    displayName: (0, pg_core_1.text)('display_name').notNull(),
    shortName: (0, pg_core_1.text)('short_name').notNull(),
    description: (0, pg_core_1.text)('description'),
    fabricInfo: (0, pg_core_1.text)('fabric_info'),
    productCode: (0, pg_core_1.text)('product_code').notNull().unique('uq_products_product_code'),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    isSale: (0, pg_core_1.boolean)('is_sale').notNull().default(false),
    keyImageId: (0, pg_core_1.uuid)('key_image_id'),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    deletedAt: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
});
exports.productImages = catalog.table('product_images', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => exports.products.id, { onDelete: 'cascade' }),
    url: (0, pg_core_1.text)('url').notNull(),
    altText: (0, pg_core_1.text)('alt_text'),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.productPrices = catalog.table('product_prices', {
    productId: (0, pg_core_1.uuid)('product_id')
        .primaryKey()
        .references(() => exports.products.id, { onDelete: 'cascade' }),
    lkrAmount: (0, pg_core_1.numeric)('lkr_amount', { precision: 12, scale: 2 }).notNull(),
    sgdAmount: (0, pg_core_1.numeric)('sgd_amount', { precision: 12, scale: 2 }).notNull(),
    usdAmount: (0, pg_core_1.numeric)('usd_amount', { precision: 12, scale: 2 }).notNull(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.check)('chk_lkr_non_negative', (0, drizzle_orm_1.sql) `${t.lkrAmount} >= 0`),
    (0, pg_core_1.check)('chk_sgd_non_negative', (0, drizzle_orm_1.sql) `${t.sgdAmount} >= 0`),
    (0, pg_core_1.check)('chk_usd_non_negative', (0, drizzle_orm_1.sql) `${t.usdAmount} >= 0`),
]);
exports.productRelations = catalog.table('product_relations', {
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => exports.products.id, { onDelete: 'cascade' }),
    relatedProductId: (0, pg_core_1.uuid)('related_product_id')
        .notNull()
        .references(() => exports.products.id, { onDelete: 'cascade' }),
    relationType: (0, pg_core_1.text)('relation_type').notNull().default('SIMILAR'),
}, (t) => [
    (0, pg_core_1.primaryKey)({ columns: [t.productId, t.relatedProductId] }),
    (0, pg_core_1.check)('chk_no_self_relation', (0, drizzle_orm_1.sql) `${t.productId} <> ${t.relatedProductId}`),
]);
exports.productStylingGuides = catalog.table('product_styling_guides', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => exports.products.id, { onDelete: 'cascade' }),
    type: (0, exports.stylingGuideTypeEnum)('type').notNull(),
    linkUrl: (0, pg_core_1.text)('link_url'),
    contentJson: (0, pg_core_1.jsonb)('content_json'),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.bestsellerList = catalog.table('bestseller_list', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    productId: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => exports.products.id, { onDelete: 'cascade' })
        .unique(),
    sortOrder: (0, pg_core_1.integer)('sort_order').notNull().default(0),
    addedByAdminId: (0, pg_core_1.uuid)('added_by_admin_id').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
    addedAt: (0, pg_core_1.timestamp)('added_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.banners = catalog.table('banners', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    message: (0, pg_core_1.text)('message').notNull(),
    linkUrl: (0, pg_core_1.text)('link_url'),
    enabled: (0, pg_core_1.boolean)('enabled').notNull().default(false),
    startAt: (0, pg_core_1.timestamp)('start_at', { withTimezone: true }),
    endAt: (0, pg_core_1.timestamp)('end_at', { withTimezone: true }),
    createdBy: (0, pg_core_1.uuid)('created_by').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
    createdAt: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
