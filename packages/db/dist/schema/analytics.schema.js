"use strict";
/**
 * Analytics schema — events (partitioned), analytics_aggregates
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsAggregates = exports.events = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const iam_schema_1 = require("./iam.schema");
const orders_schema_1 = require("./orders.schema");
const analytics = (0, pg_core_1.pgSchema)('analytics');
exports.events = analytics.table('events', {
    id: (0, pg_core_1.uuid)('id').defaultRandom().notNull(),
    session_id: (0, pg_core_1.text)('session_id').notNull(),
    user_id: (0, pg_core_1.uuid)('user_id').references(() => iam_schema_1.users.id, { onDelete: 'set null' }),
    type: (0, pg_core_1.text)('type').notNull(),
    payload_json: (0, pg_core_1.jsonb)('payload_json').notNull().default({}),
    currency: (0, orders_schema_1.currencyCodeEnum)('currency'),
    country_code: (0, pg_core_1.text)('country_code'),
    device_type: (0, pg_core_1.text)('device_type'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.analyticsAggregates = analytics.table('analytics_aggregates', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    metric: (0, pg_core_1.text)('metric').notNull(),
    dimension_json: (0, pg_core_1.jsonb)('dimension_json').notNull().default({}),
    value: (0, pg_core_1.text)('value').notNull(),
    period: (0, pg_core_1.text)('period').notNull(),
    period_start: (0, pg_core_1.timestamp)('period_start', { withTimezone: true }).notNull(),
    computed_at: (0, pg_core_1.timestamp)('computed_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.unique)('uq_aggregate').on(t.metric, t.period, t.period_start, t.dimension_json),
]);
