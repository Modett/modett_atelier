/**
 * Orders schema — promo_codes, orders, order_items, addresses, contacts, events, unit_allocations
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
  unique,
  check,
} from 'drizzle-orm/pg-core'
import { sql } from 'drizzle-orm'
import { users, admins } from './iam.schema'
import { productVariants } from './inventory.schema'
import { shippingMethods } from './shipping.schema'

const orders = pgSchema('orders')

export const orderStateEnum = orders.enum('order_state', [
  'DRAFT',
  'PLACED',
  'CANCELLED',
])
export const paymentStateEnum = orders.enum('payment_state', [
  'UNPAID',
  'PAID',
  'FAILED',
  'REFUNDED',
  'PARTIALLY_REFUNDED',
])
export const fulfillmentStateEnum = orders.enum('fulfillment_state', [
  'NOT_STARTED',
  'PACKED',
  'SHIPPED',
  'OUT_FOR_DELIVERY',
  'DELIVERED',
])
export const returnStateEnum = orders.enum('return_state', [
  'NONE',
  'REQUESTED',
  'PENDING_REVIEW',
  'APPROVED',
  'FULFILLED',
  'REJECTED',
])
export const addressKindEnum = orders.enum('address_kind', [
  'SHIPPING',
  'BILLING',
])
export const currencyCodeEnum = orders.enum('currency_code', [
  'LKR',
  'SGD',
  'USD',
])
export const promoTypeEnum = orders.enum('promo_type', ['PERCENT', 'FIXED'])

export const promoCodes = orders.table('promo_codes', {
  id: uuid('id').primaryKey().defaultRandom(),
  code: text('code').notNull().unique('uq_promo_code'),
  type: promoTypeEnum('type').notNull(),
  value: text('value').notNull(),
  currency: currencyCodeEnum('currency'),
  min_order_amount: text('min_order_amount'),
  max_uses: integer('max_uses'),
  uses_count: integer('uses_count').notNull().default(0),
  valid_from: timestamp('valid_from', { withTimezone: true }),
  valid_until: timestamp('valid_until', { withTimezone: true }),
  active: boolean('active').notNull().default(true),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const ordersTable = orders.table(
  'orders',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    order_ref: text('order_ref').notNull().unique('uq_orders_ref'),
    user_id: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    guest_email: text('guest_email'),
    order_state: orderStateEnum('order_state').notNull().default('DRAFT'),
    payment_state: paymentStateEnum('payment_state')
      .notNull()
      .default('UNPAID'),
    fulfillment_state: fulfillmentStateEnum('fulfillment_state')
      .notNull()
      .default('NOT_STARTED'),
    return_state: returnStateEnum('return_state').notNull().default('NONE'),
    currency: currencyCodeEnum('currency').notNull(),
    country_code: text('country_code').notNull(),
    subtotal: text('subtotal').notNull(),
    discount_amount: text('discount_amount').notNull().default('0'),
    shipping_cost: text('shipping_cost').notNull().default('0'),
    tax_amount: text('tax_amount').notNull().default('0'),
    tax_rate_snapshot: text('tax_rate_snapshot').notNull().default('0'),
    total: text('total').notNull(),
    shipping_method_id: uuid('shipping_method_id').references(
      () => shippingMethods.id,
      { onDelete: 'set null' },
    ),
    shipping_method_snapshot: text('shipping_method_snapshot'),
    promo_code_id: uuid('promo_code_id').references(() => promoCodes.id, {
      onDelete: 'set null',
    }),
    is_gift: boolean('is_gift').notNull().default(false),
    placed_at: timestamp('placed_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    check(
      'chk_order_identity',
      sql`(${t.user_id} IS NOT NULL OR ${t.guest_email} IS NOT NULL)`,
    ),
  ],
)

export const promoRedemptions = orders.table(
  'promo_redemptions',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    promo_code_id: uuid('promo_code_id')
      .notNull()
      .references(() => promoCodes.id),
    order_id: uuid('order_id')
      .notNull()
      .references(() => ordersTable.id),
    user_id: uuid('user_id').references(() => users.id, {
      onDelete: 'set null',
    }),
    discount_amount: text('discount_amount').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
      .notNull()
      .defaultNow(),
  },
  (t) => [
    unique('uq_promo_redemption_order').on(t.promo_code_id, t.order_id),
  ],
)

export const orderItems = orders.table('order_items', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id, { onDelete: 'cascade' }),
  variant_id: uuid('variant_id').references(() => productVariants.id, {
    onDelete: 'set null',
  }),
  qty: integer('qty').notNull(),
  unit_price_snapshot_amount: text('unit_price_snapshot_amount').notNull(),
  unit_price_snapshot_currency: currencyCodeEnum(
    'unit_price_snapshot_currency',
  ).notNull(),
  tax_amount: text('tax_amount').notNull().default('0'),
  product_snapshot_json: jsonb('product_snapshot_json').notNull(),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const orderAddresses = orders.table(
  'order_addresses',
  {
    id: uuid('id').primaryKey().defaultRandom(),
    order_id: uuid('order_id')
      .notNull()
      .references(() => ordersTable.id, { onDelete: 'cascade' }),
    kind: addressKindEnum('kind').notNull(),
    address_json: jsonb('address_json').notNull(),
    country_code: text('country_code').notNull(),
  },
  (t) => [unique('uq_order_address_kind').on(t.order_id, t.kind)],
)

export const orderContacts = orders.table('order_contacts', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id, { onDelete: 'cascade' })
    .unique(),
  primary_phone: text('primary_phone').notNull(),
  extra_phones_json: jsonb('extra_phones_json').notNull().default([]),
  gift_receiver_json: jsonb('gift_receiver_json'),
})

export const orderEvents = orders.table('order_events', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_id: uuid('order_id')
    .notNull()
    .references(() => ordersTable.id, { onDelete: 'cascade' }),
  event_type: text('event_type').notNull(),
  payload_json: jsonb('payload_json').notNull().default({}),
  created_by_admin_id: uuid('created_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  admin_note: text('admin_note'),
  created_at: timestamp('created_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})

export const orderUnitAllocations = orders.table('order_unit_allocations', {
  id: uuid('id').primaryKey().defaultRandom(),
  order_item_id: uuid('order_item_id')
    .notNull()
    .references(() => orderItems.id, { onDelete: 'cascade' }),
  inventory_unit_id: uuid('inventory_unit_id').notNull().unique(),
  scanned_by_admin_id: uuid('scanned_by_admin_id').references(() => admins.id, {
    onDelete: 'set null',
  }),
  scanned_by_name_snapshot: text('scanned_by_name_snapshot').notNull(),
  scanned_at: timestamp('scanned_at', { withTimezone: true })
    .notNull()
    .defaultNow(),
})
