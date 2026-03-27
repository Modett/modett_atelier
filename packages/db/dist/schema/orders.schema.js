"use strict";
/**
 * Orders schema — promo_codes, orders, order_items, addresses, contacts, events, unit_allocations
 * Mirrors packages/db/migrations/0001_initial.sql
 * Checkout module spec: fulfillment_state and return_state enums aligned with Section 1.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.orders = exports.orderUnitAllocations = exports.orderEvents = exports.orderContacts = exports.orderAddresses = exports.orderItems = exports.promoRedemptions = exports.ordersTable = exports.promoCodes = exports.promoTypeEnum = exports.currencyCodeEnum = exports.addressKindEnum = exports.returnStateEnum = exports.fulfillmentStateEnum = exports.paymentStateEnum = exports.orderStateEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const iam_schema_1 = require("./iam.schema");
const inventory_schema_1 = require("./inventory.schema");
const shipping_schema_1 = require("./shipping.schema");
const orders = (0, pg_core_1.pgSchema)('orders');
exports.orderStateEnum = orders.enum('order_state', [
    'DRAFT',
    'PLACED',
    'CANCELLED',
]);
exports.paymentStateEnum = orders.enum('payment_state', [
    'UNPAID',
    'PAID',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
]);
exports.fulfillmentStateEnum = orders.enum('fulfillment_state', [
    'NOT_STARTED',
    'IN_PROGRESS',
    'PARTIALLY_FULFILLED',
    'FULFILLED',
    'CANCELLED',
]);
exports.returnStateEnum = orders.enum('return_state', [
    'NONE',
    'REQUESTED',
    'PARTIAL',
    'RETURNED',
]);
exports.addressKindEnum = orders.enum('address_kind', [
    'SHIPPING',
    'BILLING',
]);
exports.currencyCodeEnum = orders.enum('currency_code', [
    'LKR',
    'SGD',
    'USD',
]);
exports.promoTypeEnum = orders.enum('promo_type', ['PERCENT', 'FIXED']);
exports.promoCodes = orders.table('promo_codes', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    code: (0, pg_core_1.text)('code').notNull().unique('uq_promo_code'),
    type: (0, exports.promoTypeEnum)('type').notNull(),
    value: (0, pg_core_1.text)('value').notNull(),
    currency: (0, exports.currencyCodeEnum)('currency'),
    min_order_amount: (0, pg_core_1.text)('min_order_amount'),
    max_uses: (0, pg_core_1.integer)('max_uses'),
    uses_count: (0, pg_core_1.integer)('uses_count').notNull().default(0),
    valid_from: (0, pg_core_1.timestamp)('valid_from', { withTimezone: true }),
    valid_until: (0, pg_core_1.timestamp)('valid_until', { withTimezone: true }),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.ordersTable = orders.table('orders', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_ref: (0, pg_core_1.text)('order_ref').notNull().unique('uq_orders_ref'),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, {
        onDelete: 'set null',
    }),
    guest_email: (0, pg_core_1.text)('guest_email'),
    order_state: (0, exports.orderStateEnum)('order_state').notNull().default('DRAFT'),
    payment_state: (0, exports.paymentStateEnum)('payment_state')
        .notNull()
        .default('UNPAID'),
    fulfillment_state: (0, exports.fulfillmentStateEnum)('fulfillment_state')
        .notNull()
        .default('NOT_STARTED'),
    return_state: (0, exports.returnStateEnum)('return_state').notNull().default('NONE'),
    currency: (0, exports.currencyCodeEnum)('currency').notNull(),
    country_code: (0, pg_core_1.text)('country_code').notNull(),
    subtotal: (0, pg_core_1.numeric)('subtotal', { precision: 12, scale: 2 }).notNull(),
    discount_amount: (0, pg_core_1.numeric)('discount_amount', {
        precision: 12,
        scale: 2,
    })
        .notNull()
        .default('0'),
    shipping_cost: (0, pg_core_1.numeric)('shipping_cost', {
        precision: 12,
        scale: 2,
    })
        .notNull()
        .default('0'),
    tax_amount: (0, pg_core_1.numeric)('tax_amount', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    tax_rate_snapshot: (0, pg_core_1.numeric)('tax_rate_snapshot', {
        precision: 5,
        scale: 4,
    })
        .notNull()
        .default('0'),
    total: (0, pg_core_1.numeric)('total', { precision: 12, scale: 2 }).notNull(),
    shipping_method_id: (0, pg_core_1.uuid)('shipping_method_id').references(() => shipping_schema_1.shippingMethods.id, { onDelete: 'set null' }),
    shipping_method_snapshot: (0, pg_core_1.text)('shipping_method_snapshot'),
    promo_code_id: (0, pg_core_1.uuid)('promo_code_id').references(() => exports.promoCodes.id, {
        onDelete: 'set null',
    }),
    is_gift: (0, pg_core_1.boolean)('is_gift').notNull().default(false),
    placed_at: (0, pg_core_1.timestamp)('placed_at', { withTimezone: true }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.check)('chk_order_identity', (0, drizzle_orm_1.sql) `(${t.user_id} IS NOT NULL OR ${t.guest_email} IS NOT NULL)`),
    (0, pg_core_1.check)('chk_orders_subtotal_non_neg', (0, drizzle_orm_1.sql) `${t.subtotal} >= 0`),
    (0, pg_core_1.check)('chk_orders_discount_non_neg', (0, drizzle_orm_1.sql) `${t.discount_amount} >= 0`),
    (0, pg_core_1.check)('chk_orders_shipping_non_neg', (0, drizzle_orm_1.sql) `${t.shipping_cost} >= 0`),
    (0, pg_core_1.check)('chk_orders_tax_non_neg', (0, drizzle_orm_1.sql) `${t.tax_amount} >= 0`),
    (0, pg_core_1.check)('chk_orders_total_non_neg', (0, drizzle_orm_1.sql) `${t.total} >= 0`),
]);
exports.orders = exports.ordersTable;
exports.promoRedemptions = orders.table('promo_redemptions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    promo_code_id: (0, pg_core_1.uuid)('promo_code_id')
        .notNull()
        .references(() => exports.promoCodes.id),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => exports.ordersTable.id),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, {
        onDelete: 'set null',
    }),
    discount_amount: (0, pg_core_1.text)('discount_amount').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.unique)('uq_promo_redemption_order').on(t.promo_code_id, t.order_id),
]);
exports.orderItems = orders.table('order_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => exports.ordersTable.id, { onDelete: 'cascade' }),
    variant_id: (0, pg_core_1.uuid)('variant_id').references(() => inventory_schema_1.productVariants.id, {
        onDelete: 'set null',
    }),
    qty: (0, pg_core_1.integer)('qty').notNull(),
    unit_price_snapshot_amount: (0, pg_core_1.numeric)('unit_price_snapshot_amount', {
        precision: 12,
        scale: 2,
    }).notNull(),
    unit_price_snapshot_currency: (0, exports.currencyCodeEnum)('unit_price_snapshot_currency').notNull(),
    tax_amount: (0, pg_core_1.numeric)('tax_amount', { precision: 12, scale: 2 })
        .notNull()
        .default('0'),
    product_snapshot_json: (0, pg_core_1.jsonb)('product_snapshot_json').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [(0, pg_core_1.check)('chk_order_items_qty_positive', (0, drizzle_orm_1.sql) `${t.qty} > 0`)]);
exports.orderAddresses = orders.table('order_addresses', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => exports.ordersTable.id, { onDelete: 'cascade' }),
    kind: (0, exports.addressKindEnum)('kind').notNull(),
    address_json: (0, pg_core_1.jsonb)('address_json').notNull(),
    country_code: (0, pg_core_1.text)('country_code').notNull(),
}, (t) => [(0, pg_core_1.unique)('uq_order_address_kind').on(t.order_id, t.kind)]);
exports.orderContacts = orders.table('order_contacts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => exports.ordersTable.id, { onDelete: 'cascade' })
        .unique(),
    primary_phone: (0, pg_core_1.text)('primary_phone').notNull(),
    extra_phones_json: (0, pg_core_1.jsonb)('extra_phones_json').notNull().default([]),
    gift_receiver_json: (0, pg_core_1.jsonb)('gift_receiver_json'),
});
exports.orderEvents = orders.table('order_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => exports.ordersTable.id, { onDelete: 'cascade' }),
    event_type: (0, pg_core_1.text)('event_type').notNull(),
    payload_json: (0, pg_core_1.jsonb)('payload_json').notNull().default({}),
    created_by_admin_id: (0, pg_core_1.uuid)('created_by_admin_id').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
    admin_note: (0, pg_core_1.text)('admin_note'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.orderUnitAllocations = orders.table('order_unit_allocations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_item_id: (0, pg_core_1.uuid)('order_item_id')
        .notNull()
        .references(() => exports.orderItems.id, { onDelete: 'cascade' }),
    inventory_unit_id: (0, pg_core_1.uuid)('inventory_unit_id').notNull().unique(),
    scanned_by_admin_id: (0, pg_core_1.uuid)('scanned_by_admin_id').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
    scanned_by_name_snapshot: (0, pg_core_1.text)('scanned_by_name_snapshot').notNull(),
    scanned_at: (0, pg_core_1.timestamp)('scanned_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
