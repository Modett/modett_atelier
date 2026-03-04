/**
 * Inventory schema — product_variants, variant_stock, inventory_units, movements
 * Mirrors packages/db/migrations/0001_initial.sql
 */
import { pgSchema, uuid, text, integer, timestamp, unique, check, } from 'drizzle-orm/pg-core';
import { sql } from 'drizzle-orm';
import { products } from './catalog.schema';
import { admins } from './iam.schema';
const inventory = pgSchema('inventory');
export const unitStatusEnum = inventory.enum('unit_status', [
    'IN_STOCK',
    'HELD',
    'SOLD',
    'RETURNED',
    'DAMAGED',
    'ADJUSTED_OUT',
]);
export const productVariants = inventory.table('product_variants', {
    id: uuid('id').primaryKey().defaultRandom(),
    product_id: uuid('product_id')
        .notNull()
        .references(() => products.id, { onDelete: 'restrict' }),
    color: text('color').notNull(),
    size: text('size').notNull(),
    sku_group: text('sku_group').notNull(),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    deleted_at: timestamp('deleted_at', { withTimezone: true }),
}, (t) => [
    unique('uq_variant_product_color_size').on(t.product_id, t.color, t.size),
]);
export const variantStock = inventory.table('variant_stock', {
    variant_id: uuid('variant_id')
        .primaryKey()
        .references(() => productVariants.id),
    in_stock_qty: integer('in_stock_qty').notNull().default(0),
    held_qty: integer('held_qty').notNull().default(0),
    available_qty: integer('available_qty').generatedAlwaysAs(sql `(in_stock_qty - held_qty)`),
    low_stock_threshold: integer('low_stock_threshold').notNull().default(3),
    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
}, (t) => [
    check('chk_held_not_exceed_stock', sql `${t.held_qty} <= ${t.in_stock_qty}`),
]);
export const inventoryUnits = inventory.table('inventory_units', {
    id: uuid('id').primaryKey().defaultRandom(),
    variant_id: uuid('variant_id')
        .notNull()
        .references(() => productVariants.id),
    unit_sku: text('unit_sku').notNull().unique(),
    barcode_value: text('barcode_value').notNull().unique(),
    status: unitStatusEnum('status').notNull().default('IN_STOCK'),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    updated_at: timestamp('updated_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const inventoryMovements = inventory.table('inventory_movements', {
    id: uuid('id').primaryKey().defaultRandom(),
    variant_id: uuid('variant_id')
        .notNull()
        .references(() => productVariants.id),
    delta_qty: integer('delta_qty').notNull(),
    reason: text('reason').notNull(),
    reference_type: text('reference_type'),
    reference_id: uuid('reference_id'),
    created_by_admin_id: uuid('created_by_admin_id').references(() => admins.id, {
        onDelete: 'set null',
    }),
    created_at: timestamp('created_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
});
export const inventoryReconciliationLog = inventory.table('inventory_reconciliation_log', {
    id: uuid('id').primaryKey().defaultRandom(),
    variant_id: uuid('variant_id')
        .notNull()
        .references(() => productVariants.id),
    actual_count: integer('actual_count').notNull(),
    aggregate_count: integer('aggregate_count').notNull(),
    delta: integer('delta').generatedAlwaysAs(sql `(actual_count - aggregate_count)`),
    detected_at: timestamp('detected_at', { withTimezone: true })
        .notNull()
        .defaultNow(),
    resolved_at: timestamp('resolved_at', { withTimezone: true }),
    resolved_note: text('resolved_note'),
});
