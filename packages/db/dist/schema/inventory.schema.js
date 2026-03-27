"use strict";
/**
 * Inventory schema — product_variants, variant_stock, inventory_units, movements
 * Mirrors packages/db/migrations/0001_initial.sql
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryReconciliationLog = exports.inventoryMovements = exports.inventoryUnits = exports.variantStock = exports.productVariants = exports.unitStatusEnum = void 0;
const pg_core_1 = require("drizzle-orm/pg-core");
const drizzle_orm_1 = require("drizzle-orm");
const catalog_schema_1 = require("./catalog.schema");
const iam_schema_1 = require("./iam.schema");
const inventory = (0, pg_core_1.pgSchema)('inventory');
exports.unitStatusEnum = inventory.enum('unit_status', [
    'IN_STOCK',
    'HELD',
    'SOLD',
    'RETURNED',
    'DAMAGED',
    'ADJUSTED_OUT',
]);
exports.productVariants = inventory.table('product_variants', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    product_id: (0, pg_core_1.uuid)('product_id')
        .notNull()
        .references(() => catalog_schema_1.products.id, { onDelete: 'restrict' }),
    color: (0, pg_core_1.text)('color').notNull(),
    size: (0, pg_core_1.text)('size').notNull(),
    sku_group: (0, pg_core_1.text)('sku_group').notNull(),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    deleted_at: (0, pg_core_1.timestamp)('deleted_at', { withTimezone: true }),
}, (t) => [
    (0, pg_core_1.unique)('uq_variant_product_color_size').on(t.product_id, t.color, t.size),
]);
exports.variantStock = inventory.table('variant_stock', {
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .primaryKey()
        .references(() => exports.productVariants.id),
    in_stock_qty: (0, pg_core_1.integer)('in_stock_qty').notNull().default(0),
    held_qty: (0, pg_core_1.integer)('held_qty').notNull().default(0),
    available_qty: (0, pg_core_1.integer)('available_qty').generatedAlwaysAs((0, drizzle_orm_1.sql) `(in_stock_qty - held_qty)`),
    low_stock_threshold: (0, pg_core_1.integer)('low_stock_threshold').notNull().default(3),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    (0, pg_core_1.check)('chk_held_not_exceed_stock', (0, drizzle_orm_1.sql) `${t.held_qty} <= ${t.in_stock_qty}`),
]);
exports.inventoryUnits = inventory.table('inventory_units', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => exports.productVariants.id),
    unit_sku: (0, pg_core_1.text)('unit_sku').notNull().unique(),
    barcode_value: (0, pg_core_1.text)('barcode_value').notNull().unique(),
    status: (0, exports.unitStatusEnum)('status').notNull().default('IN_STOCK'),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: (0, pg_core_1.timestamp)('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.inventoryMovements = inventory.table('inventory_movements', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => exports.productVariants.id),
    delta_qty: (0, pg_core_1.integer)('delta_qty').notNull(),
    reason: (0, pg_core_1.text)('reason').notNull(),
    reference_type: (0, pg_core_1.text)('reference_type'),
    reference_id: (0, pg_core_1.uuid)('reference_id'),
    created_by_admin_id: (0, pg_core_1.uuid)('created_by_admin_id').references(() => iam_schema_1.admins.id, {
        onDelete: 'set null',
    }),
    created_at: (0, pg_core_1.timestamp)('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
exports.inventoryReconciliationLog = inventory.table('inventory_reconciliation_log', {
    id: (0, pg_core_1.uuid)('id').primaryKey().defaultRandom(),
    variant_id: (0, pg_core_1.uuid)('variant_id')
        .notNull()
        .references(() => exports.productVariants.id),
    actual_count: (0, pg_core_1.integer)('actual_count').notNull(),
    aggregate_count: (0, pg_core_1.integer)('aggregate_count').notNull(),
    delta: (0, pg_core_1.integer)('delta').generatedAlwaysAs((0, drizzle_orm_1.sql) `(actual_count - aggregate_count)`),
    detected_at: (0, pg_core_1.timestamp)('detected_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    resolved_at: (0, pg_core_1.timestamp)('resolved_at', { withTimezone: true }),
    resolved_note: (0, pg_core_1.text)('resolved_note'),
});
