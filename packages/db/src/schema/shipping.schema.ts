/**
 * Shipping schema — shipping_zones, shipping_methods
 * Mirrors packages/db/migrations/0001_initial.sql
 */

import {
  pgSchema,
  uuid,
  text,
  boolean,
  timestamp,
  jsonb,
} from 'drizzle-orm/pg-core'

const shipping = pgSchema('shipping')

export const rateTypeEnum = shipping.enum('rate_type', [
  'FLAT',
  'FREE',
  'CALCULATED',
])

export const shippingZones = shipping.table('shipping_zones', {
  id: uuid('id').primaryKey().defaultRandom(),
  name: text('name').notNull(),
  countries_json: jsonb('countries_json').notNull().default([]),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const shippingMethods = shipping.table('shipping_methods', {
  id: uuid('id').primaryKey().defaultRandom(),
  zone_id: uuid('zone_id')
    .notNull()
    .references(() => shippingZones.id),
  name: text('name').notNull(),
  carrier: text('carrier'),
  rate_type: rateTypeEnum('rate_type').notNull().default('FLAT'),
  flat_rate_lkr: text('flat_rate_lkr'),
  flat_rate_sgd: text('flat_rate_sgd'),
  flat_rate_usd: text('flat_rate_usd'),
  estimated_days: text('estimated_days'),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
  updated_at: timestamp('updated_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
