"use strict";
/**
 * Payments schema — payment_intents, payment_transactions
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.paymentTransactions = exports.paymentIntents = exports.paymentStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const orders_schema_1 = require("./orders.schema");
const orders_schema_2 = require("./orders.schema");
const payments = (0, pg_core_1.pgSchema)('payments');
exports.paymentStatusEnum = payments.enum('payment_status', [
    'PENDING',
    'SUCCEEDED',
    'FAILED',
    'REFUNDED',
    'PARTIALLY_REFUNDED',
]);
exports.paymentIntents = payments.table('payment_intents', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.ordersTable.id),
    provider: (0, pg_core_1.text)('provider').notNull(),
    provider_intent_id: (0, pg_core_1.text)('provider_intent_id').notNull().unique(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    currency: (0, orders_schema_2.currencyCodeEnum)('currency').notNull(),
    status: (0, exports.paymentStatusEnum)('status').notNull().default('PENDING'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.paymentTransactions = payments.table('payment_transactions', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.ordersTable.id),
    provider: (0, pg_core_1.text)('provider').notNull(),
    provider_charge_id: (0, pg_core_1.text)('provider_charge_id').notNull().unique(),
    status: (0, exports.paymentStatusEnum)('status').notNull(),
    amount: (0, pg_core_1.numeric)('amount', { precision: 12, scale: 2 }).notNull(),
    currency: (0, orders_schema_2.currencyCodeEnum)('currency').notNull(),
    raw_payload_json: (0, pg_core_1.jsonb)('raw_payload_json').notNull(),
    received_at: (0, pg_core_1.timestamp)('received_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
