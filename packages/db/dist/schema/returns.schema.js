"use strict";
/**
 * Returns schema — return_requests, return_request_items, return_events
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.returnEvents = exports.returnRequestItems = exports.returnRequests = exports.returnStatusEnum = exports.returnTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const orders_schema_1 = require("./orders.schema");
const orders_schema_2 = require("./orders.schema");
const iam_schema_1 = require("./iam.schema");
const returns = (0, pg_core_1.pgSchema)('returns');
exports.returnTypeEnum = returns.enum('return_type', ['REFUND', 'EXCHANGE']);
exports.returnStatusEnum = returns.enum('return_status', [
    'SUBMITTED',
    'PENDING_REVIEW',
    'APPROVED',
    'REJECTED',
    'FULFILLED',
]);
exports.returnRequests = returns.table('return_requests', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    order_id: (0, pg_core_1.uuid)('order_id')
        .notNull()
        .references(() => orders_schema_1.ordersTable.id),
    type: (0, exports.returnTypeEnum)('type').notNull(),
    status: (0, exports.returnStatusEnum)('status').notNull().default('SUBMITTED'),
    reason: (0, pg_core_1.text)('reason').notNull(),
    policy_accepted_at: (0, pg_core_1.timestamp)('policy_accepted_at', {
        withTimezone: true,
    }).notNull(),
    policy_version: (0, pg_core_1.text)('policy_version').notNull(),
    eligible_until: (0, pg_core_1.timestamp)('eligible_until', { withTimezone: true }).notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.returnRequestItems = returns.table('return_request_items', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    return_request_id: (0, pg_core_1.uuid)('return_request_id')
        .notNull()
        .references(() => exports.returnRequests.id, { onDelete: 'cascade' }),
    order_item_id: (0, pg_core_1.uuid)('order_item_id')
        .notNull()
        .references(() => orders_schema_2.orderItems.id),
    qty: (0, pg_core_1.integer)('qty').notNull(),
    requested_variant_change_json: (0, pg_core_1.jsonb)('requested_variant_change_json'),
    request_status: (0, exports.returnStatusEnum)('request_status')
        .notNull()
        .default('SUBMITTED'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.returnEvents = returns.table('return_events', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    return_request_id: (0, pg_core_1.uuid)('return_request_id')
        .notNull()
        .references(() => exports.returnRequests.id, { onDelete: 'cascade' }),
    event_type: (0, pg_core_1.text)('event_type').notNull(),
    payload_json: (0, pg_core_1.jsonb)('payload_json').notNull().default({}),
    admin_id: (0, pg_core_1.uuid)('admin_id').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
    admin_note: (0, pg_core_1.text)('admin_note'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
