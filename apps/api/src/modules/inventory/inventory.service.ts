/**
 * Inventory service — stock holds/releases, restock, damage, adjustment,
 * reconciliation. Uses withInventoryLock for variant_stock mutations. RORO. Throws AppError.
 */

import { db } from '@modett/db'
import { sql } from 'drizzle-orm'
import {
  withInventoryLock,
  getVariantStock as getVariantStockQuery,
  getVariantAvailability,
  getVariantAvailabilityForProduct as getVariantAvailabilityForProductQuery,
  listInventoryUnitsForVariant,
  listInventoryMovements,
  getInventoryUnit,
  getInventoryUnitByBarcode,
  getProductVariantById,
  atomicHoldStock,
  atomicReleaseHold,
  atomicRestock,
  createInventoryUnits,
  createInventoryMovement,
  updateInventoryUnitStatus,
  updateVariantLowStockThreshold,
  createReconciliationLog,
  markReconciliationResolved as markReconciliationResolvedQuery,
  listReconciliationLog,
  listActiveVariantIds,
  countInStockUnits,
  listAdminInventoryVariants,
  countAdminInventoryVariants,
  getAdminInventoryVariantById,
  countAllInventoryUnitsForVariant,
  countUnitsByStatusForVariant,
  listInventoryMovementsWithAdmin,
  countInventoryMovementsForVariant,
  listUnresolvedReconciliationLogEnriched,
  atomicDecrementInStock,
  updateInStockUnitsToStatus,
  getProductById,
  listAdminVariantBarcodes,
  initializeMissingVariantStockRows,
} from '@modett/db'
import type {
  AdminInventoryListRow,
  AdminVariantBarcodeUnitRow,
  MovementWithAdminRow,
  ReconciliationLogEnrichedRow,
} from '@modett/db'
import type {
  VariantStock,
  VariantAvailabilityRow,
  InventoryUnit,
  InventoryMovement,
  ReconciliationLog,
} from '@modett/db'
import type {
  AdminInventoryUnit,
  AdminVariantStock,
  InventoryVariantRow,
  RestockResult,
  AdminInventoryMovement,
  AdminReconciliationLog,
  AdminInventoryListResponse,
  AdminVariantStockDetail,
  ManualReconcileResult,
} from '@modett/types'
import { AppError } from '../../lib/errors'

function toIso(d: Date | string): string {
  if (typeof d === 'string') return new Date(d).toISOString()
  return d.toISOString()
}

function mapDbUnitToAdmin(u: InventoryUnit): AdminInventoryUnit {
  return {
    id: u.id,
    variantId: u.variant_id,
    unitSku: u.unit_sku,
    barcodeValue: u.barcode_value,
    status: u.status,
    createdAt: toIso(u.created_at),
    updatedAt: toIso(u.updated_at),
  }
}

function mapStockRowToAdmin(
  variantId: string,
  row: {
    inStockQty: number
    heldQty: number
    availableQty: number
    lowStockThreshold: number
    stockStatus: AdminVariantStock['stockStatus']
    stockUpdatedAt: Date | string
  },
): AdminVariantStock {
  return {
    variantId,
    inStockQty: row.inStockQty,
    heldQty: row.heldQty,
    availableQty: row.availableQty,
    lowStockThreshold: row.lowStockThreshold,
    stockStatus: row.stockStatus,
    updatedAt: toIso(row.stockUpdatedAt),
  }
}

function mapListRowToInventoryVariantRow(r: AdminInventoryListRow): InventoryVariantRow {
  return {
    variantId: r.variantId,
    productId: r.productId,
    productName: r.productName,
    productCode: r.productCode,
    keyImageUrl: r.keyImageUrl,
    color: r.color,
    colorHex: r.colorHex,
    size: r.size,
    skuGroup: r.skuGroup,
    stock: mapStockRowToAdmin(r.variantId, {
      inStockQty: r.inStockQty,
      heldQty: r.heldQty,
      availableQty: r.availableQty,
      lowStockThreshold: r.lowStockThreshold,
      stockStatus: r.stockStatus,
      stockUpdatedAt: r.stockUpdatedAt,
    }),
  }
}

function mapMovementRowToAdmin(m: MovementWithAdminRow): AdminInventoryMovement {
  const fn = m.admin_first_name?.trim() ?? ''
  const ln = m.admin_last_name?.trim() ?? ''
  const adminDisplayName = fn || ln ? `${fn} ${ln}`.trim() : null
  return {
    id: m.id,
    variantId: m.variant_id,
    deltaQty: m.delta_qty,
    reason: m.reason,
    referenceType: m.reference_type,
    referenceId: m.reference_id,
    createdByAdminId: m.created_by_admin_id,
    createdAt: toIso(m.created_at),
    adminDisplayName,
  }
}

function mapReconciliationEnriched(r: ReconciliationLogEnrichedRow): AdminReconciliationLog {
  return {
    id: r.id,
    variantId: r.variant_id,
    actualCount: r.actual_count,
    aggregateCount: r.aggregate_count,
    delta: r.delta,
    detectedAt: toIso(r.detected_at),
    resolvedAt: r.resolved_at ? toIso(r.resolved_at) : null,
    resolvedNote: r.resolved_note,
    productName: r.product_name,
    color: r.color,
    size: r.size,
    skuGroup: r.sku_group,
  }
}

function mapDbReconciliationToAdmin(log: ReconciliationLog): AdminReconciliationLog {
  return {
    id: log.id,
    variantId: log.variant_id,
    actualCount: log.actual_count,
    aggregateCount: log.aggregate_count,
    delta: log.delta ?? log.actual_count - log.aggregate_count,
    detectedAt: toIso(log.detected_at),
    resolvedAt: log.resolved_at ? toIso(log.resolved_at) : null,
    resolvedNote: log.resolved_note,
  }
}

/** Matches seed barcode pattern: {skuGroup}-{sizeCode}-{sequence} */
function buildUnitBarcode({
  skuGroup,
  size,
  sequence,
}: {
  skuGroup: string
  size: string
  sequence: number
}): { unitSku: string; barcodeValue: string } {
  const sizeCode = size.replace(/\s+/g, '')
  const padded = String(sequence).padStart(4, '0')
  const barcodeValue = `${skuGroup}-${sizeCode}-${padded}`
  return { unitSku: barcodeValue, barcodeValue }
}

// —— Stock read ——

export async function getVariantStock({
  variantId,
}: {
  variantId: string
}): Promise<VariantStock> {
  const stock = await getVariantStockQuery({ variantId })
  if (!stock) throw new AppError('VARIANT_NOT_FOUND', 404)
  return stock
}

export async function getVariantAvailabilityForProduct({
  productId,
}: {
  productId: string
}): Promise<VariantAvailabilityRow[]> {
  return await getVariantAvailabilityForProductQuery({ productId })
}

export async function getStockDetails({
  variantId,
}: {
  variantId: string
}): Promise<{
  availability: VariantAvailabilityRow
  units: InventoryUnit[]
  recentMovements: InventoryMovement[]
}> {
  const availability = await getVariantAvailability({ variantId })
  if (!availability) throw new AppError('VARIANT_NOT_FOUND', 404)
  const [units, recentMovements] = await Promise.all([
    listInventoryUnitsForVariant({ variantId }),
    listInventoryMovements({ variantId, limit: 20 }),
  ])
  return { availability, units, recentMovements }
}

export async function listAdminInventory({
  page = 1,
  limit = 50,
  productId,
  stockStatus,
  search,
}: {
  page?: number
  limit?: number
  productId?: string
  stockStatus?: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'
  search?: string
}): Promise<AdminInventoryListResponse> {
  const safeLimit = Math.min(Math.max(limit, 1), 100)
  const safePage = Math.max(page, 1)
  const offset = (safePage - 1) * safeLimit
  try {
    const [rows, total] = await Promise.all([
      listAdminInventoryVariants({
        productId,
        stockStatus,
        search,
        limit: safeLimit,
        offset,
      }),
      countAdminInventoryVariants({ productId, stockStatus, search }),
    ])
    return {
      variants: rows.map(mapListRowToInventoryVariantRow),
      total,
      page: safePage,
      limit: safeLimit,
    }
  } catch (err) {
    const msg = err instanceof Error ? err.message : String(err)
    if (
      msg.includes('does not exist') ||
      msg.includes('relation') ||
      msg.includes('column')
    ) {
      return { variants: [], total: 0, page: safePage, limit: safeLimit }
    }
    throw err
  }
}

export async function runInventoryMigrations(): Promise<{ initialized: number }> {
  try {
    await db.execute(sql`
      ALTER TABLE inventory.product_variants
        ADD COLUMN IF NOT EXISTS color_hex TEXT
    `)
  } catch {
    // column may already exist or table has different schema — ignore
  }
  return await initializeMissingVariantStockRows()
}

export async function initializeAllMissingStock(): Promise<{
  initialized: number
}> {
  return await initializeMissingVariantStockRows()
}

export async function getAdminVariantStockDetail({
  variantId,
}: {
  variantId: string
}): Promise<AdminVariantStockDetail> {
  const row = await getAdminInventoryVariantById({ variantId })
  if (!row) throw new AppError('VARIANT_NOT_FOUND', 404)

  const [unitsRaw, movementsRaw, unitCountsRaw] = await Promise.all([
    listInventoryUnitsForVariant({ variantId }),
    listInventoryMovementsWithAdmin({ variantId, limit: 20, offset: 0 }),
    countUnitsByStatusForVariant({ variantId }),
  ])

  return {
    ...mapListRowToInventoryVariantRow(row),
    units: unitsRaw.map(mapDbUnitToAdmin),
    movements: movementsRaw.map(mapMovementRowToAdmin),
    unitCounts: unitCountsRaw as AdminVariantStockDetail['unitCounts'],
  }
}

export async function getMovementHistoryPaginated({
  variantId,
  page = 1,
  limit = 20,
}: {
  variantId: string
  page?: number
  limit?: number
}): Promise<{
  movements: AdminInventoryMovement[]
  page: number
  limit: number
  total: number
}> {
  const safePage = Math.max(1, page)
  const safeLimit = Math.min(Math.max(limit, 1), 200)
  const offset = (safePage - 1) * safeLimit
  const [rows, total] = await Promise.all([
    listInventoryMovementsWithAdmin({
      variantId,
      limit: safeLimit,
      offset,
    }),
    countInventoryMovementsForVariant({ variantId }),
  ])
  return {
    movements: rows.map(mapMovementRowToAdmin),
    page: safePage,
    limit: safeLimit,
    total,
  }
}

export async function getUnresolvedReconciliationEnriched({
  variantId,
}: {
  variantId?: string
}): Promise<AdminReconciliationLog[]> {
  const rows = await listUnresolvedReconciliationLogEnriched({ variantId })
  return rows.map(mapReconciliationEnriched)
}

// —— Restock ——

export async function restockVariant({
  variantId,
  qty,
  adminId,
}: {
  variantId: string
  qty: number
  adminId: string
}): Promise<RestockResult> {
  if (qty <= 0 || qty > 500) {
    throw new AppError('INVALID_RESTOCK_QTY', 400)
  }

  return await withInventoryLock(variantId, async () => {
    const variantRow = await getProductVariantById({ variantId })
    if (!variantRow) throw new AppError('VARIANT_NOT_FOUND', 404)

    const product = await getProductById({ id: variantRow.product_id })
    if (!product) throw new AppError('PRODUCT_NOT_FOUND', 404)

    const existingTotal = await countAllInventoryUnitsForVariant({ variantId })
    const sequences = Array.from({ length: qty }, (_, i) => existingTotal + 1 + i)
    const unitsPayload = sequences.map((seq) => ({
      variantId,
      ...buildUnitBarcode({
        skuGroup: variantRow.sku_group,
        size: variantRow.size,
        sequence: seq,
      }),
    }))

    let newUnits: InventoryUnit[] = []
    await db.transaction(async (tx) => {
      const ok = await atomicRestock({ variantId, qty, tx })
      if (!ok) throw new AppError('VARIANT_NOT_FOUND', 404)
      newUnits = await createInventoryUnits({ units: unitsPayload, tx })
      await createInventoryMovement({
        variantId,
        deltaQty: qty,
        reason: 'RESTOCK',
        referenceType: 'admin_restock',
        createdByAdminId: adminId,
        tx,
      })
    })

    const stock = await getVariantStockQuery({ variantId })
    const newInStockQty = stock?.in_stock_qty ?? 0

    return {
      newUnits: newUnits.map(mapDbUnitToAdmin),
      newInStockQty,
      variantId,
      skuGroup: variantRow.sku_group,
      color: variantRow.color,
      size: variantRow.size,
      productName: product.displayName,
    }
  })
}

// —— Hold / release (for checkout module) ——

export async function holdStock({
  variantId,
  qty,
}: {
  variantId: string
  qty: number
}): Promise<void> {
  const success = await withInventoryLock(variantId, async () => {
    return await atomicHoldStock({ variantId, qty })
  })
  if (!success) throw new AppError('INSUFFICIENT_STOCK', 409)
}

export async function releaseHold({
  variantId,
  qty,
}: {
  variantId: string
  qty: number
}): Promise<void> {
  await withInventoryLock(variantId, async () => {
    await atomicReleaseHold({ variantId, qty })
  })
}

// —— Damage and adjustment ——

export async function markUnitDamaged({
  unitId,
  adminId,
}: {
  unitId: string
  adminId: string
}): Promise<InventoryUnit> {
  const unit = await getInventoryUnit({ unitId })
  if (!unit) throw new AppError('UNIT_NOT_FOUND', 404)
  if (unit.status !== 'IN_STOCK') {
    throw new AppError('INVALID_UNIT_STATUS_TRANSITION', 409)
  }

  await withInventoryLock(unit.variant_id, async () => {
    await db.transaction(async (tx) => {
      await updateInventoryUnitStatus({
        unitId,
        status: 'DAMAGED',
        tx,
      })
      const dec = await atomicDecrementInStock({
        variantId: unit.variant_id,
        qty: 1,
        tx,
      })
      if (!dec) throw new AppError('STOCK_DECREMENT_FAILED', 409)
      await createInventoryMovement({
        variantId: unit.variant_id,
        deltaQty: -1,
        reason: 'DAMAGE',
        referenceType: 'manual_adjustment',
        referenceId: unitId,
        createdByAdminId: adminId,
        tx,
      })
    })
  })

  const u = await getInventoryUnit({ unitId })
  if (!u) throw new AppError('UNIT_NOT_FOUND', 404)
  return u
}

export async function markUnitsDamaged({
  variantId,
  unitIds,
  adminId,
}: {
  variantId: string
  unitIds: string[]
  adminId: string
}): Promise<{ markedCount: number }> {
  if (unitIds.length === 0) {
    throw new AppError('NO_UNITS_SELECTED', 400)
  }

  return await withInventoryLock(variantId, async () => {
    return await db.transaction(async (tx) => {
      const updatedIds = await updateInStockUnitsToStatus({
        variantId,
        unitIds,
        newStatus: 'DAMAGED',
        tx,
      })
      if (updatedIds.length !== unitIds.length) {
        const missing = unitIds.filter((id) => !updatedIds.includes(id))
        throw new AppError(
          'UNIT_NOT_IN_STOCK',
          422,
          `These units are not IN_STOCK for this variant: ${missing.join(', ')}`,
        )
      }
      const ok = await atomicDecrementInStock({
        variantId,
        qty: updatedIds.length,
        tx,
      })
      if (!ok) throw new AppError('STOCK_DECREMENT_FAILED', 409)
      await createInventoryMovement({
        variantId,
        deltaQty: -updatedIds.length,
        reason: 'DAMAGE',
        referenceType: 'admin_bulk_damage',
        createdByAdminId: adminId,
        tx,
      })
      return { markedCount: updatedIds.length }
    })
  })
}

export async function markUnitsAdjustedOut({
  variantId,
  unitIds,
  note,
  adminId,
}: {
  variantId: string
  unitIds: string[]
  note?: string
  adminId: string
}): Promise<{ markedCount: number }> {
  if (unitIds.length === 0) {
    throw new AppError('NO_UNITS_SELECTED', 400)
  }

  const refType =
    note != null && note.trim() !== ''
      ? `adjust_out:${note.trim().slice(0, 400)}`
      : 'admin_adjust_out'

  return await withInventoryLock(variantId, async () => {
    return await db.transaction(async (tx) => {
      const updatedIds = await updateInStockUnitsToStatus({
        variantId,
        unitIds,
        newStatus: 'ADJUSTED_OUT',
        tx,
      })
      if (updatedIds.length !== unitIds.length) {
        const missing = unitIds.filter((id) => !updatedIds.includes(id))
        throw new AppError(
          'UNIT_NOT_IN_STOCK',
          422,
          `These units are not IN_STOCK for this variant: ${missing.join(', ')}`,
        )
      }
      const ok = await atomicDecrementInStock({
        variantId,
        qty: updatedIds.length,
        tx,
      })
      if (!ok) throw new AppError('STOCK_DECREMENT_FAILED', 409)
      await createInventoryMovement({
        variantId,
        deltaQty: -updatedIds.length,
        reason: 'ADJUSTMENT',
        referenceType: refType,
        createdByAdminId: adminId,
        tx,
      })
      return { markedCount: updatedIds.length }
    })
  })
}

export async function adjustStock({
  variantId,
  deltaQty,
  reason,
  adminId,
}: {
  variantId: string
  deltaQty: number
  reason: string
  adminId: string
}): Promise<VariantStock> {
  if (deltaQty === 0) throw new AppError('INVALID_ADJUSTMENT', 400)

  return await withInventoryLock(variantId, async () => {
    const stock = await getVariantStockQuery({ variantId })
    if (!stock) throw new AppError('VARIANT_NOT_FOUND', 404)
    if (stock.in_stock_qty + deltaQty < 0) {
      throw new AppError('ADJUSTMENT_WOULD_MAKE_STOCK_NEGATIVE', 400)
    }
    await db.transaction(async (tx) => {
      await atomicRestock({ variantId, qty: deltaQty, tx })
      await createInventoryMovement({
        variantId,
        deltaQty,
        reason: 'ADJUSTMENT',
        referenceType: 'manual_adjustment',
        createdByAdminId: adminId,
        tx,
      })
    })
    const updated = await getVariantStockQuery({ variantId })
    if (!updated) throw new AppError('VARIANT_NOT_FOUND', 404)
    return updated
  })
}

export async function updateLowStockThreshold({
  variantId,
  threshold,
  adminId,
}: {
  variantId: string
  threshold: number
  adminId: string
}): Promise<VariantStock> {
  void adminId
  if (threshold < 0) throw new AppError('INVALID_THRESHOLD', 400)
  const stock = await updateVariantLowStockThreshold({ variantId, threshold })
  if (!stock) throw new AppError('VARIANT_NOT_FOUND', 404)
  return stock
}

// —— Barcode scan ——

export async function scanBarcode({
  barcodeValue,
}: {
  barcodeValue: string
}): Promise<InventoryUnit> {
  const unit = await getInventoryUnitByBarcode({ barcodeValue })
  if (!unit) throw new AppError('BARCODE_NOT_FOUND', 404)
  return unit
}

// —— Reconciliation ——

export async function runReconciliation({
  variantId,
  adminId,
}: {
  variantId?: string
  adminId: string
}): Promise<{
  checked: number
  discrepanciesFound: number
  logs: ReconciliationLog[]
}> {
  void adminId
  const variantIds =
    variantId != null ? [variantId] : await listActiveVariantIds()
  const logs: ReconciliationLog[] = []
  for (const vid of variantIds) {
    const actualCount = await countInStockUnits({ variantId: vid })
    const stock = await getVariantStockQuery({ variantId: vid })
    if (!stock) continue
    const aggregateCount = stock.in_stock_qty
    if (actualCount !== aggregateCount) {
      const log = await createReconciliationLog({
        variantId: vid,
        actualCount,
        aggregateCount,
      })
      logs.push(log)
    }
  }
  return {
    checked: variantIds.length,
    discrepanciesFound: logs.length,
    logs,
  }
}

export async function runManualReconciliationForVariant({
  variantId,
}: {
  variantId: string
}): Promise<ManualReconcileResult> {
  const actualCount = await countInStockUnits({ variantId })
  const stock = await getVariantStockQuery({ variantId })
  if (!stock) throw new AppError('VARIANT_NOT_FOUND', 404)
  const aggregateCount = stock.in_stock_qty
  const delta = actualCount - aggregateCount
  if (delta !== 0) {
    const log = await createReconciliationLog({
      variantId,
      actualCount,
      aggregateCount,
    })
    return {
      hasDrift: true,
      actualCount,
      aggregateCount,
      delta,
      logId: log.id,
    }
  }
  return {
    hasDrift: false,
    actualCount,
    aggregateCount,
    delta: 0,
    logId: null,
  }
}

export async function getReconciliationLog({
  variantId,
  unresolvedOnly,
}: {
  variantId?: string
  unresolvedOnly?: boolean
}): Promise<ReconciliationLog[]> {
  return await listReconciliationLog({
    variantId,
    unresolvedOnly,
  })
}

export async function markReconciliationResolved({
  logId,
  resolvedNote,
  adminId,
}: {
  logId: string
  resolvedNote: string
  adminId: string
}): Promise<AdminReconciliationLog> {
  void adminId
  const log = await markReconciliationResolvedQuery({ id: logId, resolvedNote })
  if (!log) throw new AppError('LOG_ENTRY_NOT_FOUND', 404)
  return mapDbReconciliationToAdmin(log)
}

// —— Admin list ——

export async function getAdminVariantBarcodes({
  variantId,
  status,
  unitIds,
}: {
  variantId: string
  status: 'IN_STOCK' | 'ALL'
  unitIds?: string[]
}) {
  const variantRow = await getProductVariantById({ variantId })
  if (!variantRow) throw new AppError('VARIANT_NOT_FOUND', 404)
  const productRow = await getProductById({ id: variantRow.product_id })
  if (!productRow) throw new AppError('PRODUCT_NOT_FOUND', 404)

  const rows = await listAdminVariantBarcodes({
    variantId,
    statusFilter: status,
    unitIds,
  })

  const variant = {
    id: variantId,
    color: variantRow.color,
    size: variantRow.size,
    skuGroup: variantRow.sku_group,
  }
  const product = {
    displayName: productRow.displayName,
    productCode: productRow.productCode,
  }

  const units = rows.map((r: AdminVariantBarcodeUnitRow) => ({
    id: r.id,
    unitSku: r.unit_sku,
    barcodeValue: r.barcode_value,
    status: r.status,
    createdAt: toIso(r.created_at instanceof Date ? r.created_at : new Date(r.created_at)),
  }))

  return { units, variant, product }
}

export async function listUnitsForVariant({
  variantId,
  status,
}: {
  variantId: string
  status?: 'IN_STOCK' | 'HELD' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'ADJUSTED_OUT'
}): Promise<InventoryUnit[]> {
  return await listInventoryUnitsForVariant({ variantId, status })
}

export async function getMovementHistory({
  variantId,
  limit,
  offset,
}: {
  variantId: string
  limit?: number
  offset?: number
}): Promise<InventoryMovement[]> {
  return await listInventoryMovements({ variantId, limit, offset })
}
