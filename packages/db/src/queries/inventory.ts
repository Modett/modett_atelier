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

// —— Admin inventory (list, counts, movements with admin, bulk status) ——

export interface AdminInventoryListRow {
  variantId: string
  productId: string
  productName: string
  productCode: string
  keyImageUrl: string | null
  color: string
  colorHex: string | null
  size: string
  skuGroup: string
  inStockQty: number
  heldQty: number
  availableQty: number
  lowStockThreshold: number
  stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  stockUpdatedAt: Date
}

function adminInventoryFilterFragments({
  productId,
  stockStatus,
  search,
}: {
  productId?: string
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  search?: string
}): { productCond: ReturnType<typeof sql>; stockCond: ReturnType<typeof sql>; searchCond: ReturnType<typeof sql> } {
  const productCond =
    productId != null && productId !== ''
      ? sql`AND p.id = ${productId}`
      : sql``
  const stockCond =
    stockStatus != null
      ? sql`AND va.stock_status = ${stockStatus}`
      : sql``
  const q = search?.trim()
  const searchCond =
    q != null && q.length > 0
      ? sql`AND (
          p.display_name ILIKE ${`%${q}%`}
          OR p.product_code ILIKE ${`%${q}%`}
          OR pv.sku_group ILIKE ${`%${q}%`}
        )`
      : sql``
  return { productCond, stockCond, searchCond }
}

export async function getAdminInventoryVariantById({
  variantId,
}: {
  variantId: string
}): Promise<AdminInventoryListRow | null> {
  const result = await db.execute(sql`
    SELECT
      va.variant_id AS "variantId",
      p.id AS "productId",
      p.display_name AS "productName",
      p.product_code AS "productCode",
      img.url AS "keyImageUrl",
      pv.color AS "color",
      pv.color_hex AS "colorHex",
      pv.size AS "size",
      pv.sku_group AS "skuGroup",
      va.in_stock_qty AS "inStockQty",
      va.held_qty AS "heldQty",
      va.available_qty AS "availableQty",
      va.low_stock_threshold AS "lowStockThreshold",
      va.stock_status AS "stockStatus",
      vs.updated_at AS "stockUpdatedAt"
    FROM inventory.variant_availability va
    INNER JOIN inventory.product_variants pv
      ON pv.id = va.variant_id AND pv.deleted_at IS NULL
    INNER JOIN catalog.products p
      ON p.id = va.product_id AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images img ON img.id = p.key_image_id
    INNER JOIN inventory.variant_stock vs ON vs.variant_id = va.variant_id
    WHERE va.variant_id = ${variantId}
    LIMIT 1
  `)
  const row = result.rows[0] as unknown as AdminInventoryListRow | undefined
  return row ?? null
}

export async function listAdminInventoryVariants({
  productId,
  stockStatus,
  search,
  limit,
  offset,
}: {
  productId?: string
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  search?: string
  limit: number
  offset: number
}): Promise<AdminInventoryListRow[]> {
  const { productCond, stockCond, searchCond } = adminInventoryFilterFragments({
    productId,
    stockStatus,
    search,
  })
  const result = await db.execute(sql`
    SELECT
      va.variant_id AS "variantId",
      p.id AS "productId",
      p.display_name AS "productName",
      p.product_code AS "productCode",
      img.url AS "keyImageUrl",
      pv.color AS "color",
      pv.color_hex AS "colorHex",
      pv.size AS "size",
      pv.sku_group AS "skuGroup",
      va.in_stock_qty AS "inStockQty",
      va.held_qty AS "heldQty",
      va.available_qty AS "availableQty",
      va.low_stock_threshold AS "lowStockThreshold",
      va.stock_status AS "stockStatus",
      vs.updated_at AS "stockUpdatedAt"
    FROM inventory.variant_availability va
    INNER JOIN inventory.product_variants pv
      ON pv.id = va.variant_id AND pv.deleted_at IS NULL
    INNER JOIN catalog.products p
      ON p.id = va.product_id AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images img ON img.id = p.key_image_id
    INNER JOIN inventory.variant_stock vs ON vs.variant_id = va.variant_id
    WHERE 1 = 1
      ${productCond}
      ${stockCond}
      ${searchCond}
    ORDER BY p.product_code ASC, pv.sku_group ASC, pv.size ASC
    LIMIT ${limit}
    OFFSET ${offset}
  `)
  return (result.rows as unknown as AdminInventoryListRow[]) ?? []
}

export async function countAdminInventoryVariants({
  productId,
  stockStatus,
  search,
}: {
  productId?: string
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  search?: string
}): Promise<number> {
  const { productCond, stockCond, searchCond } = adminInventoryFilterFragments({
    productId,
    stockStatus,
    search,
  })
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS c
    FROM inventory.variant_availability va
    INNER JOIN inventory.product_variants pv
      ON pv.id = va.variant_id AND pv.deleted_at IS NULL
    INNER JOIN catalog.products p
      ON p.id = va.product_id AND p.deleted_at IS NULL
    WHERE 1 = 1
      ${productCond}
      ${stockCond}
      ${searchCond}
  `)
  const row = result.rows[0] as { c: number } | undefined
  return row?.c ?? 0
}

export async function countAllInventoryUnitsForVariant({
  variantId,
}: {
  variantId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS c
    FROM inventory.inventory_units
    WHERE variant_id = ${variantId}
  `)
  const row = result.rows[0] as { c: number } | undefined
  return row?.c ?? 0
}

export async function countUnitsByStatusForVariant({
  variantId,
}: {
  variantId: string
}): Promise<Partial<Record<string, number>>> {
  const result = await db.execute(sql`
    SELECT status, COUNT(*)::int AS c
    FROM inventory.inventory_units
    WHERE variant_id = ${variantId}
    GROUP BY status
  `)
  const m: Partial<Record<string, number>> = {}
  for (const row of result.rows as { status: string; c: number }[]) {
    m[row.status] = row.c
  }
  return m
}

export interface MovementWithAdminRow {
  id: string
  variant_id: string
  delta_qty: number
  reason: string
  reference_type: string | null
  reference_id: string | null
  created_by_admin_id: string | null
  created_at: Date
  admin_first_name: string | null
  admin_last_name: string | null
}

export async function listInventoryMovementsWithAdmin({
  variantId,
  limit,
  offset,
}: {
  variantId: string
  limit: number
  offset: number
}): Promise<MovementWithAdminRow[]> {
  const result = await db.execute(sql`
    SELECT
      m.id,
      m.variant_id,
      m.delta_qty,
      m.reason,
      m.reference_type,
      m.reference_id,
      m.created_by_admin_id,
      m.created_at,
      u.first_name AS admin_first_name,
      u.last_name AS admin_last_name
    FROM inventory.inventory_movements m
    LEFT JOIN iam.admins a ON a.id = m.created_by_admin_id
    LEFT JOIN iam.users u ON u.id = a.user_id
    WHERE m.variant_id = ${variantId}
    ORDER BY m.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)
  return (result.rows as unknown as MovementWithAdminRow[]) ?? []
}

export async function countInventoryMovementsForVariant({
  variantId,
}: {
  variantId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(*)::int AS c
    FROM inventory.inventory_movements
    WHERE variant_id = ${variantId}
  `)
  const row = result.rows[0] as { c: number } | undefined
  return row?.c ?? 0
}

export interface ReconciliationLogEnrichedRow {
  id: string
  variant_id: string
  actual_count: number
  aggregate_count: number
  delta: number
  detected_at: Date
  resolved_at: Date | null
  resolved_note: string | null
  product_name: string
  color: string
  size: string
  sku_group: string
}

export async function listUnresolvedReconciliationLogEnriched({
  variantId,
}: {
  variantId?: string
}): Promise<ReconciliationLogEnrichedRow[]> {
  const variantCond =
    variantId != null && variantId !== ''
      ? sql`AND log.variant_id = ${variantId}`
      : sql``
  const result = await db.execute(sql`
    SELECT
      log.id,
      log.variant_id,
      log.actual_count,
      log.aggregate_count,
      log.delta,
      log.detected_at,
      log.resolved_at,
      log.resolved_note,
      p.display_name AS product_name,
      pv.color,
      pv.size,
      pv.sku_group
    FROM inventory.inventory_reconciliation_log log
    INNER JOIN inventory.product_variants pv ON pv.id = log.variant_id
    INNER JOIN catalog.products p ON p.id = pv.product_id
    WHERE log.resolved_at IS NULL
      ${variantCond}
    ORDER BY log.detected_at DESC
  `)
  return (result.rows as unknown as ReconciliationLogEnrichedRow[]) ?? []
}

export async function atomicDecrementInStock({
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
        updated_at = now()
    WHERE variant_id = ${variantId}
      AND in_stock_qty >= ${qty}
    RETURNING variant_id
  `)
  return result.rows.length > 0
}

export async function updateInStockUnitsToStatus({
  variantId,
  unitIds,
  newStatus,
  tx,
}: {
  variantId: string
  unitIds: string[]
  newStatus: 'DAMAGED' | 'ADJUSTED_OUT'
  tx: TransactionClient
}): Promise<string[]> {
  if (unitIds.length === 0) return []
  const result = await tx.execute(sql`
    UPDATE inventory.inventory_units
    SET status = ${newStatus}, updated_at = now()
    WHERE variant_id = ${variantId}
      AND status = 'IN_STOCK'
      AND id IN (${sql.join(
        unitIds.map((id) => sql`${id}`),
        sql`, `,
      )})
    RETURNING id
  `)
  return (result.rows as { id: string }[]).map((r) => r.id)
}
