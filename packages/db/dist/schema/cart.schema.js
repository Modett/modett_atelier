/**
 * Cart schema — carts, cart_items, reservations, reservation_items
 * Mirrors packages/db/migrations/0001_initial.sql
 */
import { pgSchema, uuid, text, integer, timestamp, unique, check, } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { users } from './iam.schema';
import { productVariants } from './inventory.schema';
const cart = pgSchema('cart');
export const cartStatusEnum = cart.enum('cart_status', [
    'ACTIVE',
    'ABANDONED',
    'CHECKED_OUT',
]);
export const reservationStatusEnum = cart.enum('reservation_status', [
    'HELD',
    'CONSUMED',
    'EXPIRED',
]);
export const carts = cart.table('carts', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, { onDelete: 'set null' }),
    session_id: text('session_id').notNull(),
    status: cartStatusEnum('status').notNull().default('ACTIVE'),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const cartItems = cart.table('cart_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    cart_id: uuid('cart_id')
        .notNull()
        .references(() => carts.id, { onDelete: 'cascade' }),
    variant_id: uuid('variant_id')
        .notNull()
        .references(() => productVariants.id),
    qty: integer('qty').notNull().default(1),
    added_at: timestamp('added_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [unique('uq_cart_items_cart_variant').on(t.cart_id, t.variant_id)]);
export const reservations = cart.table('reservations', {
    id: uuid('id').primaryKey().defaultRandom(),
    user_id: uuid('user_id').references(() => users.id, {
        onDelete: 'set null',
    }),
    cart_id: uuid('cart_id')
        .notNull()
        .references(() => carts.id),
    status: reservationStatusEnum('status').notNull().default('HELD'),
    expires_at: timestamp('expires_at', { withTimezone: true }).notNull(),
    payment_submitted_at: timestamp('payment_submitted_at', {
        withTimezone: true,
    }),
    grace_expires_at: timestamp('grace_expires_at', { withTimezone: true }),
    worker_lock_id: uuid('worker_lock_id'),
    processed_at: timestamp('processed_at', { withTimezone: true }),
    hold_released_at: timestamp('hold_released_at', { withTimezone: true }),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    check('chk_grace_set_together', sql `((${t.payment_submitted_at} IS NULL AND ${t.grace_expires_at} IS NULL) OR (${t.payment_submitted_at} IS NOT NULL AND ${t.grace_expires_at} IS NOT NULL))`),
]);
export const reservationItems = cart.table('reservation_items', {
    id: uuid('id').primaryKey().defaultRandom(),
    reservation_id: uuid('reservation_id')
        .notNull()
        .references(() => reservations.id, { onDelete: 'cascade' }),
    variant_id: uuid('variant_id')
        .notNull()
        .references(() => productVariants.id),
    qty: integer('qty').notNull(),
});
