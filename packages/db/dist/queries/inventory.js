"use strict";
/**
 * Inventory query functions — variant_stock, variant_availability view,
 * inventory_units, movements, reconciliation log. No business logic. RORO.
 * Atomic writes use db.execute(sql`...`); caller must hold lock where required.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getProductVariantById = getProductVariantById;
exports.getVariantStock = getVariantStock;
exports.getVariantAvailability = getVariantAvailability;
exports.getVariantAvailabilityForProduct = getVariantAvailabilityForProduct;
exports.getInventoryUnit = getInventoryUnit;
exports.getInventoryUnitByBarcode = getInventoryUnitByBarcode;
exports.getInventoryUnitBySku = getInventoryUnitBySku;
exports.listInventoryUnitsForVariant = listInventoryUnitsForVariant;
exports.listInventoryMovements = listInventoryMovements;
exports.listReconciliationLog = listReconciliationLog;
exports.listActiveVariantIds = listActiveVariantIds;
exports.countInStockUnits = countInStockUnits;
exports.atomicHoldStock = atomicHoldStock;
exports.atomicReleaseHold = atomicReleaseHold;
exports.atomicConfirmSale = atomicConfirmSale;
exports.atomicRestock = atomicRestock;
exports.createInventoryUnit = createInventoryUnit;
exports.createInventoryUnits = createInventoryUnits;
exports.updateInventoryUnitStatus = updateInventoryUnitStatus;
exports.createInventoryMovement = createInventoryMovement;
exports.updateVariantLowStockThreshold = updateVariantLowStockThreshold;
exports.createReconciliationLog = createReconciliationLog;
exports.markReconciliationResolved = markReconciliationResolved;
const drizzle_orm_1 = require("drizzle-orm");
const client_1 = require("../client");
const inventory_schema_1 = require("../schema/inventory.schema");
// —— READ QUERIES ——
async function getProductVariantById({ variantId, }) {
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.productVariants)
        .where((0, drizzle_orm_1.and)((0, drizzle_orm_1.eq)(inventory_schema_1.productVariants.id, variantId), (0, drizzle_orm_1.isNull)(inventory_schema_1.productVariants.deleted_at)));
    return rows[0] ?? null;
}
async function getVariantStock({ variantId, }) {
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.variantStock)
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.variantStock.variant_id, variantId));
    return rows[0] ?? null;
}
async function getVariantAvailability({ variantId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      variant_id AS "variantId",
      product_id AS "productId",
      color,
      size,
      in_stock_qty AS "inStockQty",
      held_qty AS "heldQty",
      available_qty AS "availableQty",
      low_stock_threshold AS "lowStockThreshold",
      stock_status AS "stockStatus"
    FROM inventory.variant_availability
    WHERE variant_id = ${variantId}
  `);
    const row = result.rows[0] ?? null;
    return row;
}
async function getVariantAvailabilityForProduct({ productId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT
      variant_id AS "variantId",
      product_id AS "productId",
      color,
      size,
      in_stock_qty AS "inStockQty",
      held_qty AS "heldQty",
      available_qty AS "availableQty",
      low_stock_threshold AS "lowStockThreshold",
      stock_status AS "stockStatus"
    FROM inventory.variant_availability
    WHERE product_id = ${productId}
  `);
    return result.rows ?? [];
}
async function getInventoryUnit({ unitId, }) {
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.inventoryUnits)
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryUnits.id, unitId));
    return rows[0] ?? null;
}
async function getInventoryUnitByBarcode({ barcodeValue, }) {
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.inventoryUnits)
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryUnits.barcode_value, barcodeValue));
    return rows[0] ?? null;
}
async function getInventoryUnitBySku({ unitSku, }) {
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.inventoryUnits)
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryUnits.unit_sku, unitSku));
    return rows[0] ?? null;
}
async function listInventoryUnitsForVariant({ variantId, status, }) {
    const conditions = [(0, drizzle_orm_1.eq)(inventory_schema_1.inventoryUnits.variant_id, variantId)];
    if (status != null) {
        conditions.push((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryUnits.status, status));
    }
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.inventoryUnits)
        .where((0, drizzle_orm_1.and)(...conditions))
        .orderBy((0, drizzle_orm_1.desc)(inventory_schema_1.inventoryUnits.created_at));
    return rows;
}
async function listInventoryMovements({ variantId, limit = 50, offset = 0, }) {
    const rows = await client_1.db
        .select()
        .from(inventory_schema_1.inventoryMovements)
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryMovements.variant_id, variantId))
        .orderBy((0, drizzle_orm_1.desc)(inventory_schema_1.inventoryMovements.created_at))
        .limit(limit)
        .offset(offset);
    return rows;
}
async function listReconciliationLog({ variantId, unresolvedOnly, limit, offset, }) {
    const conditions = [];
    if (variantId != null) {
        conditions.push((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryReconciliationLog.variant_id, variantId));
    }
    if (unresolvedOnly === true) {
        conditions.push((0, drizzle_orm_1.isNull)(inventory_schema_1.inventoryReconciliationLog.resolved_at));
    }
    const whereClause = conditions.length > 0 ? (0, drizzle_orm_1.and)(...conditions) : undefined;
    let q = client_1.db
        .select()
        .from(inventory_schema_1.inventoryReconciliationLog)
        .orderBy((0, drizzle_orm_1.desc)(inventory_schema_1.inventoryReconciliationLog.detected_at));
    if (whereClause != null) {
        q = q.where(whereClause);
    }
    if (limit != null) {
        q = q.limit(limit);
    }
    if (offset != null) {
        q = q.offset(offset);
    }
    return await q;
}
async function listActiveVariantIds() {
    const rows = await client_1.db
        .select({ variant_id: inventory_schema_1.variantStock.variant_id })
        .from(inventory_schema_1.variantStock);
    return rows.map((r) => r.variant_id);
}
async function countInStockUnits({ variantId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    SELECT COUNT(*)::int AS count
    FROM inventory.inventory_units
    WHERE variant_id = ${variantId}
      AND status = 'IN_STOCK'
  `);
    const row = result.rows[0];
    return row?.count ?? 0;
}
// —— WRITE QUERIES (atomic — handle with care) ——
async function atomicHoldStock({ variantId, qty, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE inventory.variant_stock
    SET held_qty   = held_qty + ${qty},
        updated_at = now()
    WHERE variant_id    = ${variantId}
      AND available_qty >= ${qty}
    RETURNING variant_id
  `);
    return result.rows.length > 0;
}
async function atomicReleaseHold({ variantId, qty, }) {
    const result = await client_1.db.execute((0, drizzle_orm_1.sql) `
    UPDATE inventory.variant_stock
    SET held_qty   = held_qty - ${qty},
        updated_at = now()
    WHERE variant_id = ${variantId}
      AND held_qty   >= ${qty}
    RETURNING variant_id
  `);
    return result.rows.length > 0;
}
async function atomicConfirmSale({ variantId, qty, tx, }) {
    const result = await tx.execute((0, drizzle_orm_1.sql) `
    UPDATE inventory.variant_stock
    SET in_stock_qty = in_stock_qty - ${qty},
        held_qty     = held_qty     - ${qty},
        updated_at   = now()
    WHERE variant_id   = ${variantId}
      AND held_qty     >= ${qty}
      AND in_stock_qty >= ${qty}
    RETURNING variant_id
  `);
    return result.rows.length > 0;
}
async function atomicRestock({ variantId, qty, tx, }) {
    const client = tx ?? client_1.db;
    const result = await client.execute((0, drizzle_orm_1.sql) `
    UPDATE inventory.variant_stock
    SET in_stock_qty = in_stock_qty + ${qty},
        updated_at   = now()
    WHERE variant_id = ${variantId}
    RETURNING variant_id
  `);
    return result.rows.length > 0;
}
async function createInventoryUnit({ variantId, unitSku, barcodeValue, }) {
    const [row] = await client_1.db
        .insert(inventory_schema_1.inventoryUnits)
        .values({
        variant_id: variantId,
        unit_sku: unitSku,
        barcode_value: barcodeValue,
    })
        .returning();
    if (!row)
        throw new Error('insert inventory unit failed');
    return row;
}
async function createInventoryUnits({ units, tx, }) {
    if (units.length === 0)
        return [];
    const client = tx ?? client_1.db;
    const rows = await client
        .insert(inventory_schema_1.inventoryUnits)
        .values(units.map((u) => ({
        variant_id: u.variantId,
        unit_sku: u.unitSku,
        barcode_value: u.barcodeValue,
    })))
        .returning();
    return rows;
}
async function updateInventoryUnitStatus({ unitId, status, tx, }) {
    const client = tx ?? client_1.db;
    const rows = await client
        .update(inventory_schema_1.inventoryUnits)
        .set({ status, updated_at: new Date() })
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryUnits.id, unitId))
        .returning();
    return rows[0] ?? null;
}
async function createInventoryMovement({ variantId, deltaQty, reason, referenceType, referenceId, createdByAdminId, tx, }) {
    const client = tx ?? client_1.db;
    const [row] = await client
        .insert(inventory_schema_1.inventoryMovements)
        .values({
        variant_id: variantId,
        delta_qty: deltaQty,
        reason,
        reference_type: referenceType ?? null,
        reference_id: referenceId ?? null,
        created_by_admin_id: createdByAdminId ?? null,
    })
        .returning();
    if (!row)
        throw new Error('insert inventory movement failed');
    return row;
}
async function updateVariantLowStockThreshold({ variantId, threshold, }) {
    const rows = await client_1.db
        .update(inventory_schema_1.variantStock)
        .set({
        low_stock_threshold: threshold,
        updated_at: new Date(),
    })
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.variantStock.variant_id, variantId))
        .returning();
    return rows[0] ?? null;
}
async function createReconciliationLog({ variantId, actualCount, aggregateCount, }) {
    const [row] = await client_1.db
        .insert(inventory_schema_1.inventoryReconciliationLog)
        .values({
        variant_id: variantId,
        actual_count: actualCount,
        aggregate_count: aggregateCount,
    })
        .returning();
    if (!row)
        throw new Error('insert reconciliation log failed');
    return row;
}
async function markReconciliationResolved({ id, resolvedNote, }) {
    const rows = await client_1.db
        .update(inventory_schema_1.inventoryReconciliationLog)
        .set({
        resolved_at: new Date(),
        resolved_note: resolvedNote,
    })
        .where((0, drizzle_orm_1.eq)(inventory_schema_1.inventoryReconciliationLog.id, id))
        .returning();
    return rows[0] ?? null;
}
