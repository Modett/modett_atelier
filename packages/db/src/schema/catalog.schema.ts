/**
 * Catalog schema — categories, products, prices, images, styling guides, banners
 * Mirrors packages/db/migrations/0001_initial.sql
 * Column mapping: camelCase property → snake_case column
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  numeric,
  primaryKey,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import type { InferSelectModel, InferInsertModel } from 'drizzle-orm'
import { admins } from './iam.schema'

const catalog = pgSchema('catalog')

export const stylingGuideTypeEnum = catalog.enum('styling_guide_type', [
  'VIDEO',
  'GALLERY',
  'TEXT',
])

export const categories = catalog.table('categories', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  slug: text('slug').notNull().unique('uq_categories_slug'),
  active: boolean('active').notNull().default(true),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const products = catalog.table('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  categoryId: uuid('category_id').references(() => categories.id),
  slug: text('slug').notNull().unique('uq_products_slug'),
  displayName: text('display_name').notNull(),
  shortName: text('short_name').notNull(),
  description: text('description'),
  fabricInfo: text('fabric_info'),
  productCode: text('product_code').notNull().unique('uq_products_product_code'),
  active: boolean('active').notNull().default(true),
  isSale: boolean('is_sale').notNull().default(false),
  keyImageId: uuid('key_image_id'),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deletedAt: timestamp('deleted_at', { withTimezone: true }),
})

export const productImages = catalog.table('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  altText: text('alt_text'),
  sortOrder: integer('sort_order').notNull().default(0),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const productPrices = catalog.table(
  'product_prices',
  {
    productId: uuid('product_id')
      .primaryKey()
      .references(() => products.id, { onDelete: 'cascade' }),
    lkrAmount: numeric('lkr_amount', { precision: 12, scale: 2 }).notNull(),
    sgdAmount: numeric('sgd_amount', { precision: 12, scale: 2 }).notNull(),
    usdAmount: numeric('usd_amount', { precision: 12, scale: 2 }).notNull(),
    updatedAt: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check('chk_lkr_non_negative', sql`${t.lkrAmount} >= 0`),
    check('chk_sgd_non_negative', sql`${t.sgdAmount} >= 0`),
    check('chk_usd_non_negative', sql`${t.usdAmount} >= 0`),
  ],
)

export const productRelations = catalog.table(
  'product_relations',
  {
    productId: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relatedProductId: uuid('related_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relationType: text('relation_type').notNull().default('SIMILAR'),
  },
  (t) => [
    primaryKey({ columns: [t.productId, t.relatedProductId] }),
    check(
      'chk_no_self_relation',
      sql`${t.productId} <> ${t.relatedProductId}`,
    ),
  ],
)

export const productStylingGuides = catalog.table('product_styling_guides', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  type: stylingGuideTypeEnum('type').notNull(),
  linkUrl: text('link_url'),
  contentJson: jsonb('content_json'),
  active: boolean('active').notNull().default(true),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const bestsellerList = catalog.table('bestseller_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  productId: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' })
    .unique(),
  sortOrder: integer('sort_order').notNull().default(0),
  addedByAdminId: uuid('added_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  addedAt: timestamp('added_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const banners = catalog.table('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  message: text('message').notNull(),
  linkUrl: text('link_url'),
  enabled: boolean('enabled').notNull().default(false),
  startAt: timestamp('start_at', { withTimezone: true }),
  endAt: timestamp('end_at', { withTimezone: true }),
  createdBy: uuid('created_by').references(() => admins.id, {
    onDelete: 'set null',
  }),
  createdAt: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updatedAt: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

// Inferred types
export type Category = InferSelectModel<typeof categories>
export type NewCategory = InferInsertModel<typeof categories>
export type Product = InferSelectModel<typeof products>
export type NewProduct = InferInsertModel<typeof products>
export type ProductPrice = InferSelectModel<typeof productPrices>
export type NewProductPrice = InferInsertModel<typeof productPrices>
export type ProductImage = InferSelectModel<typeof productImages>
export type NewProductImage = InferInsertModel<typeof productImages>
export type ProductRelation = InferSelectModel<typeof productRelations>
export type ProductStylingGuide = InferSelectModel<typeof productStylingGuides>
export type NewProductStylingGuide = InferInsertModel<
  typeof productStylingGuides
>
export type BestsellerEntry = InferSelectModel<typeof bestsellerList>
export type NewBestsellerEntry = InferInsertModel<typeof bestsellerList>
export type Banner = InferSelectModel<typeof banners>
export type NewBanner = InferInsertModel<typeof banners>
