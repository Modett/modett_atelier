/**
 * Payments schema — payment_intents, payment_transactions
 * Mirrors packages/db/migrations/0001_initial.sql
 */
import { pgSchema, uuid, text, timestamp, jsonb } from 'drizzle-orm/pg-core';
import { ordersTable } from './orders.schema';
import { currencyCodeEnum } from './orders.schema';
const payments = pgSchema('payments');
export const paymentStatusEnum = payments.enum('payment_status', [
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
]);
export const paymentIntents = payments.table('payment_intents', {
    id: uuid('id').primaryKey().defaultRandom(),
    order_id: uuid('order_id')
        .notNull()
        .references(() => ordersTable.id),
    provider: text('provider').notNull(),
    provider_intent_id: text('provider_intent_id').notNull().unique(),
    amount: text('amount').notNull(),
    currency: currencyCodeEnum('currency').notNull(),
    status: paymentStatusEnum('status').notNull().default('PENDING'),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const paymentTransactions = payments.table('payment_transactions', {
    id: uuid('id').primaryKey().defaultRandom(),
    order_id: uuid('order_id')
        .notNull()
        .references(() => ordersTable.id),
    provider: text('provider').notNull(),
    provider_charge_id: text('provider_charge_id').notNull().unique(),
    status: paymentStatusEnum('status').notNull(),
    amount: text('amount').notNull(),
    currency: currencyCodeEnum('currency').notNull(),
    raw_payload_json: jsonb('raw_payload_json').notNull(),
    received_at: timestamp('received_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
