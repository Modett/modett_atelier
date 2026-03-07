/**
 * Inventory query functions — variant_stock, variant_availability view,
 * inventory_units, movements, reconciliation log. No business logic. RORO.
 * Atomic writes use db.execute(sql`...`); caller must hold lock where required.
 */

import { eq, and, isNull, desc, sql } from 'drizzle-orm'
import { db, type Database, type TransactionClient } from '../client'
import {
  productVariants,
  variantStock,
  inventoryUnits,
  inventoryMovements,
  inventoryReconciliationLog,
} from '../schema/inventory.schema'
import type {
  ProductVariant,
  VariantStock,
  InventoryUnit,
  InventoryMovement,
  ReconciliationLog,
} from '../schema/inventory.schema'

// —— Row type from variant_availability view ——

export interface VariantAvailabilityRow {
  variantId: string
  productId: string
  color: string
  size: string
  inStockQty: number
  heldQty: number
  availableQty: number
  lowStockThreshold: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
}

// —— READ QUERIES ——

export async function getProductVariantById({
  variantId,
}: {
  variantId: string
}): Promise<ProductVariant | null> {
  const rows = await db
    .select()
    .from(productVariants)
    .where(
      and(eq(productVariants.id, variantId), isNull(productVariants.deleted_at)),
    )
  return rows[0] ?? null
}

export async function getVariantStock({
  variantId,
}: {
  variantId: string
}): Promise<VariantStock | null> {
  const rows = await db
    .select()
    .from(variantStock)
    .where(eq(variantStock.variant_id, variantId))
  return rows[0] ?? null
}

export async function getVariantAvailability({
  variantId,
}: {
  variantId: string
}): Promise<VariantAvailabilityRow | null> {
  const result = await db.execute(sql`
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
  `)
  const row = (result.rows[0] as unknown as VariantAvailabilityRow | undefined) ?? null
  return row
}

export async function getVariantAvailabilityForProduct({
  productId,
}: {
  productId: string
}): Promise<VariantAvailabilityRow[]> {
  const result = await db.execute(sql`
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
  `)
  return (result.rows as unknown as VariantAvailabilityRow[]) ?? []
}

export async function getInventoryUnit({
  unitId,
}: {
  unitId: string
}): Promise<InventoryUnit | null> {
  const rows = await db
    .select()
    .from(inventoryUnits)
    .where(eq(inventoryUnits.id, unitId))
  return rows[0] ?? null
}

export async function getInventoryUnitByBarcode({
  barcodeValue,
}: {
  barcodeValue: string
}): Promise<InventoryUnit | null> {
  const rows = await db
    .select()
    .from(inventoryUnits)
    .where(eq(inventoryUnits.barcode_value, barcodeValue))
  return rows[0] ?? null
}

export async function getInventoryUnitBySku({
  unitSku,
}: {
  unitSku: string
}): Promise<InventoryUnit | null> {
  const rows = await db
    .select()
    .from(inventoryUnits)
    .where(eq(inventoryUnits.unit_sku, unitSku))
  return rows[0] ?? null
}

export async function listInventoryUnitsForVariant({
  variantId,
  status,
}: {
  variantId: string
  status?: 'IN_STOCK' | 'HELD' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'ADJUSTED_OUT'
}): Promise<InventoryUnit[]> {
  const conditions = [eq(inventoryUnits.variant_id, variantId)]
  if (status != null) {
    conditions.push(eq(inventoryUnits.status, status))
  }
  const rows = await db
    .select()
    .from(inventoryUnits)
    .where(and(...conditions))
    .orderBy(desc(inventoryUnits.created_at))
  return rows
}

export async function listInventoryMovements({
  variantId,
  limit = 50,
  offset = 0,
}: {
  variantId: string
  limit?: number
  offset?: number
}): Promise<InventoryMovement[]> {
  const rows = await db
    .select()
    .from(inventoryMovements)
    .where(eq(inventoryMovements.variant_id, variantId))
    .orderBy(desc(inventoryMovements.created_at))
    .limit(limit)
    .offset(offset)
  return rows
}

export async function listReconciliationLog({
  variantId,
  unresolvedOnly,
  limit,
  offset,
}: {
  variantId?: string
  unresolvedOnly?: boolean
  limit?: number
  offset?: number
}): Promise<ReconciliationLog[]> {
  const conditions = []
  if (variantId != null) {
    conditions.push(eq(inventoryReconciliationLog.variant_id, variantId))
  }
  if (unresolvedOnly === true) {
    conditions.push(isNull(inventoryReconciliationLog.resolved_at))
  }
  const whereClause =
    conditions.length > 0 ? and(...conditions) : undefined
  let q = db
    .select()
    .from(inventoryReconciliationLog)
    .orderBy(desc(inventoryReconciliationLog.detected_at))
  if (whereClause != null) {
    q = q.where(whereClause) as typeof q
  }
  if (limit != null) {
    q = q.limit(limit) as typeof q
  }
  if (offset != null) {
    q = q.offset(offset) as typeof q
  }
  return await q
}

export async function listActiveVariantIds(): Promise<string[]> {
  const rows = await db
    .select({ variant_id: variantStock.variant_id })
    .from(variantStock)
  return rows.map((r) => r.variant_id)
}

export async function countInStockUnits({
  variantId,
}: {
  variantId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS count
    FROM inventory.inventory_units
    WHERE variant_id = ${variantId}
      AND status = 'IN_STOCK'
  `)
  const row = result.rows[0] as { count: number } | undefined
  return row?.count ?? 0
}

// —— WRITE QUERIES (atomic — handle with care) ——

export async function atomicHoldStock({
  variantId,
  qty,
}: {
  variantId: string
  qty: number
}): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE inventory.variant_stock
    SET held_qty   = held_qty + ${qty},
        updated_at = now()
    WHERE variant_id    = ${variantId}
      AND available_qty >= ${qty}
    RETURNING variant_id
  `)
  return result.rows.length > 0
}

export async function atomicReleaseHold({
  variantId,
  qty,
}: {
  variantId: string
  qty: number
}): Promise<boolean> {
  const result = await db.execute(sql`
    UPDATE inventory.variant_stock
    SET held_qty   = held_qty - ${qty},
        updated_at = now()
    WHERE variant_id = ${variantId}
      AND held_qty   >= ${qty}
    RETURNING variant_id
  `)
  return result.rows.length > 0
}

export async function atomicConfirmSale({
  variantId,
  qty,
  tx,
}: {
  variantId: string
  qty: number
  tx: TransactionClient
}): Promise<boolean> {
  const result = await tx.execute(sql`
    UPDATE inventory.variant_stock
    SET in_stock_qty = in_stock_qty - ${qty},
        held_qty     = held_qty     - ${qty},
        updated_at   = now()
    WHERE variant_id   = ${variantId}
      AND held_qty     >= ${qty}
      AND in_stock_qty >= ${qty}
    RETURNING variant_id
  `)
  return result.rows.length > 0
}

export async function atomicRestock({
  variantId,
  qty,
  tx,
}: {
  variantId: string
  qty: number
  tx?: Database | TransactionClient
}): Promise<boolean> {
  const client = tx ?? db
  const result = await client.execute(sql`
    UPDATE inventory.variant_stock
    SET in_stock_qty = in_stock_qty + ${qty},
        updated_at   = now()
    WHERE variant_id = ${variantId}
    RETURNING variant_id
  `)
  return result.rows.length > 0
}

export async function createInventoryUnit({
  variantId,
  unitSku,
  barcodeValue,
}: {
  variantId: string
  unitSku: string
  barcodeValue: string
}): Promise<InventoryUnit> {
  const [row] = await db
    .insert(inventoryUnits)
    .values({
      variant_id: variantId,
      unit_sku: unitSku,
      barcode_value: barcodeValue,
    })
    .returning()
  if (!row) throw new Error('insert inventory unit failed')
  return row
}

export async function createInventoryUnits({
  units,
  tx,
}: {
  units: Array<{ variantId: string; unitSku: string; barcodeValue: string }>
  tx?: Database | TransactionClient
}): Promise<InventoryUnit[]> {
  if (units.length === 0) return []
  const client = tx ?? db
  const rows = await client
    .insert(inventoryUnits)
    .values(
      units.map((u) => ({
        variant_id: u.variantId,
        unit_sku: u.unitSku,
        barcode_value: u.barcodeValue,
      })),
    )
    .returning()
  return rows
}

export async function updateInventoryUnitStatus({
  unitId,
  status,
  tx,
}: {
  unitId: string
  status: 'IN_STOCK' | 'HELD' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'ADJUSTED_OUT'
  tx?: Database | TransactionClient
}): Promise<InventoryUnit | null> {
  const client = tx ?? db
  const rows = await client
    .update(inventoryUnits)
    .set({ status, updated_at: new Date() })
    .where(eq(inventoryUnits.id, unitId))
    .returning()
  return rows[0] ?? null
}

export async function createInventoryMovement({
  variantId,
  deltaQty,
  reason,
  referenceType,
  referenceId,
  createdByAdminId,
  tx,
}: {
  variantId: string
  deltaQty: number
  reason: string
  referenceType?: string | null
  referenceId?: string | null
  createdByAdminId?: string | null
  tx?: Database | TransactionClient
}): Promise<InventoryMovement> {
  const client = tx ?? db
  const [row] = await client
    .insert(inventoryMovements)
    .values({
      variant_id: variantId,
      delta_qty: deltaQty,
      reason,
      reference_type: referenceType ?? null,
      reference_id: referenceId ?? null,
      created_by_admin_id: createdByAdminId ?? null,
    })
    .returning()
  if (!row) throw new Error('insert inventory movement failed')
  return row
}

export async function updateVariantLowStockThreshold({
  variantId,
  threshold,
}: {
  variantId: string
  threshold: number
}): Promise<VariantStock | null> {
  const rows = await db
    .update(variantStock)
    .set({
      low_stock_threshold: threshold,
      updated_at: new Date(),
    })
    .where(eq(variantStock.variant_id, variantId))
    .returning()
  return rows[0] ?? null
}

export async function createReconciliationLog({
  variantId,
  actualCount,
  aggregateCount,
}: {
  variantId: string
  actualCount: number
  aggregateCount: number
}): Promise<ReconciliationLog> {
  const [row] = await db
    .insert(inventoryReconciliationLog)
    .values({
      variant_id: variantId,
      actual_count: actualCount,
      aggregate_count: aggregateCount,
    })
    .returning()
  if (!row) throw new Error('insert reconciliation log failed')
  return row
}

export async function markReconciliationResolved({
  id,
  resolvedNote,
}: {
  id: string
  resolvedNote: string
}): Promise<ReconciliationLog | null> {
  const rows = await db
    .update(inventoryReconciliationLog)
    .set({
      resolved_at: new Date(),
      resolved_note: resolvedNote,
    })
    .where(eq(inventoryReconciliationLog.id, id))
    .returning()
  return rows[0] ?? null
}
