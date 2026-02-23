/**
 * Catalog schema — categories, products, prices, images, styling guides, banners
 * Mirrors packages/db/migrations/0001_initial.sql
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  integer,
  timestamp,
  jsonb,
  primaryKey,
  unique,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
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
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const products = catalog.table('products', {
  id: uuid('id').primaryKey().defaultRandom(),
  category_id: uuid('category_id').references(() => categories.id),
  slug: text('slug').notNull().unique('uq_products_slug'),
  display_name: text('display_name').notNull(),
  short_name: text('short_name').notNull(),
  description: text('description'),
  fabric_info: text('fabric_info'),
  product_code: text('product_code').notNull().unique('uq_products_product_code'),
  active: boolean('active').notNull().default(true),
  is_sale: boolean('is_sale').notNull().default(false),
  key_image_id: uuid('key_image_id'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  deleted_at: timestamp('deleted_at', { withTimezone: true }),
})

export const productImages = catalog.table('product_images', {
  id: uuid('id').primaryKey().defaultRandom(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  url: text('url').notNull(),
  alt_text: text('alt_text'),
  sort_order: integer('sort_order').notNull().default(0),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
export const productPrices = catalog.table('product_prices', {
  product_id: uuid('product_id')
    .primaryKey()
    .references(() => products.id, { onDelete: 'cascade' }),
  lkr_amount: text('lkr_amount').notNull(), // NUMERIC(12,2) — use string or customType for number
  sgd_amount: text('sgd_amount').notNull(),
  usd_amount: text('usd_amount').notNull(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const productRelations = catalog.table(
  'product_relations',
  {
    product_id: uuid('product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    related_product_id: uuid('related_product_id')
      .notNull()
      .references(() => products.id, { onDelete: 'cascade' }),
    relation_type: text('relation_type').notNull().default('SIMILAR'),
  },
  (t) => [
    primaryKey({ columns: [t.product_id, t.related_product_id] }),
    check('chk_no_self_relation', sql`${t.product_id} <> ${t.related_product_id}`),
  ],
)

export const productStylingGuides = catalog.table('product_styling_guides', {
  id: uuid('id').primaryKey().defaultRandom(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' }),
  type: stylingGuideTypeEnum('type').notNull(),
  link_url: text('link_url'),
  content_json: jsonb('content_json'),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const bestsellerList = catalog.table('bestseller_list', {
  id: uuid('id').primaryKey().defaultRandom(),
  product_id: uuid('product_id')
    .notNull()
    .references(() => products.id, { onDelete: 'cascade' })
    .unique(),
  sort_order: integer('sort_order').notNull().default(0),
  added_by_admin_id: uuid('added_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  added_at: timestamp('added_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const banners = catalog.table('banners', {
  id: uuid('id').primaryKey().defaultRandom(),
  message: text('message').notNull(),
  link_url: text('link_url'),
  enabled: boolean('enabled').notNull().default(false),
  start_at: timestamp('start_at', { withTimezone: true }),
  end_at: timestamp('end_at', { withTimezone: true }),
  created_by: uuid('created_by').references(() => admins.id, {
    onDelete: 'set null',
  }),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
