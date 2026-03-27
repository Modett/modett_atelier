/**
 * Inventory service — stock holds/releases, restock, damage, adjustment,
 * reconciliation. Uses withInventoryLock for all hold/release. RORO. Throws AppError.
 */

import { db } from '@modett/db'
import {
  withInventoryLock,
  getVariantStock as getVariantStockQuery,
  getVariantAvailability,
  getVariantAvailabilityForProduct as getVariantAvailabilityForProductQuery,
  listInventoryUnitsForVariant,
  listInventoryMovements,
  getInventoryUnit,
  getInventoryUnitByBarcode,
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
} from '@modett/db'
import type {
  VariantStock,
  VariantAvailabilityRow,
  InventoryUnit,
  InventoryMovement,
  ReconciliationLog,
} from '@modett/db'
import { AppError } from '../../lib/errors'

// —— Barcode generation (internal) ——

function generateUnitIdentifiers({
  variantId,
  sequence,
}: {
  variantId: string
  sequence: number
}): { unitSku: string; barcodeValue: string } {
  const prefix = variantId.replace(/-/g, '').slice(0, 8).toUpperCase()
  const padded = String(sequence).padStart(6, '0')
  return {
    barcodeValue: `MOD-${prefix}-${padded}`,
    unitSku: `SKU-${prefix}-${padded}`,
  }
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

// —— Restock ——

export async function restockVariant({
  variantId,
  qty,
  adminId,
}: {
  variantId: string
  qty: number
  adminId: string
}): Promise<{ restockedQty: number; newUnits: InventoryUnit[] }> {
  if (qty <= 0 || qty > 500) {
    throw new AppError('INVALID_RESTOCK_QTY', 400)
  }
  const currentCount = await countInStockUnits({ variantId })
  const sequences = Array.from(
    { length: qty },
    (_, i) => currentCount + 1 + i,
  )
  const units = sequences.map((seq) => ({
    variantId,
    ...generateUnitIdentifiers({ variantId, sequence: seq }),
  }))

  let newUnits: InventoryUnit[] = []
  await db.transaction(async (tx) => {
    const ok = await atomicRestock({ variantId, qty, tx })
    if (!ok) throw new AppError('VARIANT_NOT_FOUND', 404)
    newUnits = await createInventoryUnits({ units, tx })
    await createInventoryMovement({
      variantId,
      deltaQty: qty,
      reason: 'RESTOCK',
      referenceType: 'manual_adjustment',
      createdByAdminId: adminId,
      tx,
    })
  })
  return { restockedQty: qty, newUnits }
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
  await db.transaction(async (tx) => {
    await updateInventoryUnitStatus({
      unitId,
      status: 'DAMAGED',
      tx,
    })
    await atomicRestock({
      variantId: unit.variant_id,
      qty: -1,
      tx,
    })
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
  const u = await getInventoryUnit({ unitId })
  if (!u) throw new AppError('UNIT_NOT_FOUND', 404)
  return u
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
  const stock = await getVariantStock({ variantId })
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
  const updated = await getVariantStock({ variantId })
  if (!updated) throw new AppError('VARIANT_NOT_FOUND', 404)
  return updated
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
  const variantIds =
    variantId != null
      ? [variantId]
      : await listActiveVariantIds()
  const logs: ReconciliationLog[] = []
  for (const vid of variantIds) {
    const actualCount = await countInStockUnits({ variantId: vid })
    const stock = await getVariantStock({ variantId: vid })
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
}): Promise<ReconciliationLog> {
  const log = await markReconciliationResolvedQuery({ id: logId, resolvedNote })
  if (!log) throw new AppError('LOG_ENTRY_NOT_FOUND', 404)
  return log
}

// —— Admin list ——

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
