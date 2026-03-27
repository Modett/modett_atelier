"use strict";
/**
 * Shipping schema — shipping_zones, shipping_methods
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.shippingSettings = exports.shippingMethods = exports.shippingZones = exports.rateTypeEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const iam_schema_1 = require("./iam.schema");
const shipping = (0, pg_core_1.pgSchema)('shipping');
exports.rateTypeEnum = shipping.enum('rate_type', [
    'FLAT',
    'FREE',
    'CALCULATED',
]);
exports.shippingZones = shipping.table('shipping_zones', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    name: (0, pg_core_1.text)('name').notNull(),
    countries_json: (0, pg_core_1.jsonb)('countries_json').notNull().default([]),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.shippingMethods = shipping.table('shipping_methods', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    zone_id: (0, pg_core_1.uuid)('zone_id')
        .notNull()
        .references(() => exports.shippingZones.id),
    name: (0, pg_core_1.text)('name').notNull(),
    carrier: (0, pg_core_1.text)('carrier'),
    rate_type: (0, exports.rateTypeEnum)('rate_type').notNull().default('FLAT'),
    flat_rate_lkr: (0, pg_core_1.text)('flat_rate_lkr'),
    flat_rate_sgd: (0, pg_core_1.text)('flat_rate_sgd'),
    flat_rate_usd: (0, pg_core_1.text)('flat_rate_usd'),
    estimated_days: (0, pg_core_1.text)('estimated_days'),
    active: (0, pg_core_1.boolean)('active').notNull().default(true),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.shippingSettings = shipping.table('shipping_settings', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    freeThresholdLkr: (0, pg_core_1.numeric)('free_threshold_lkr', { precision: 12, scale: 2 }),
    freeThresholdSgd: (0, pg_core_1.numeric)('free_threshold_sgd', { precision: 12, scale: 2 }),
    freeThresholdUsd: (0, pg_core_1.numeric)('free_threshold_usd', { precision: 12, scale: 2 }),
    freeShippingLabel: (0, pg_core_1.text)('free_shipping_label').notNull().default('Free Shipping'),
    updatedAt: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updatedByAdminId: (0, pg_core_1.uuid)('updated_by_admin_id')
        .references(() => iam_schema_1.admins.id),
});
