"use strict";
/**
 * Cart schema — carts, cart_items, reservations, reservation_items
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.reservationItems = exports.reservations = exports.cartItems = exports.carts = exports.reservationStatusEnum = exports.cartStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const iam_schema_1 = require("./iam.schema");
const inventory_schema_1 = require("./inventory.schema");
const cart = (0, pg_core_1.pgSchema)('cart');
exports.cartStatusEnum = cart.enum('cart_status', [
    'ACTIVE',
    'ABANDONED',
    'CHECKED_OUT',
]);
exports.reservationStatusEnum = cart.enum('reservation_status', [
    'HELD',
    'CONSUMED',
    'EXPIRED',
]);
exports.carts = cart.table('carts', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, { onDelete: 'set null' }),
    session_id: (0, pg_core_1.text)('session_id').notNull(),
    status: (0, exports.cartStatusEnum)('status').notNull().default('ACTIVE'),
    expires_at: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true })
        .notNull()
        .default((0, drizzle_orm_1.sql) `now() + interval '21 days'`),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.cartItems = cart.table('cart_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    cart_id: (0, pg_core_1.uuid)('cart_id')
        .notNull()
        .references(() => exports.carts.id, { onDelete: 'cascade' }),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => inventory_schema_1.productVariants.id),
    qty: (0, pg_core_1.integer)('qty').notNull().default(1),
    added_at: (0, pg_core_1.timestamp)('added_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.unique)('uq_cart_items_cart_variant').on(t.cart_id, t.variant_id),
    (0, pg_core_1.check)('chk_cart_items_qty_positive', (0, drizzle_orm_1.sql) `${t.qty} > 0`),
]);
exports.reservations = cart.table('reservations', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, {
        onDelete: 'set null',
    }),
    cart_id: (0, pg_core_1.uuid)('cart_id')
        .notNull()
        .references(() => exports.carts.id),
    status: (0, exports.reservationStatusEnum)('status').notNull().default('HELD'),
    expires_at: (0, pg_core_1.timestamp)('expires_at', { withTimezone: true }).notNull(),
    payment_submitted_at: (0, pg_core_1.timestamp)('payment_submitted_at', {
        withTimezone: true,
    }),
    grace_expires_at: (0, pg_core_1.timestamp)('grace_expires_at', { withTimezone: true }),
    worker_lock_id: (0, pg_core_1.uuid)('worker_lock_id'),
    processed_at: (0, pg_core_1.timestamp)('processed_at', { withTimezone: true }),
    hold_released_at: (0, pg_core_1.timestamp)('hold_released_at', { withTimezone: true }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.check)('chk_grace_set_together', (0, drizzle_orm_1.sql) `((${t.payment_submitted_at} IS NULL AND ${t.grace_expires_at} IS NULL) OR (${t.payment_submitted_at} IS NOT NULL AND ${t.grace_expires_at} IS NOT NULL))`),
]);
exports.reservationItems = cart.table('reservation_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    reservation_id: (0, pg_core_1.uuid)('reservation_id')
        .notNull()
        .references(() => exports.reservations.id, { onDelete: 'cascade' }),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => inventory_schema_1.productVariants.id),
    qty: (0, pg_core_1.integer)('qty').notNull(),
}, (t) => [(0, pg_core_1.check)('chk_reservation_items_qty_positive', (0, drizzle_orm_1.sql) `${t.qty} > 0`)]);
