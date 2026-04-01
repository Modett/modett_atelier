/**
 * Admin inventory API shapes — camelCase for JSON responses.
 */

import type { UnitStatus } from './enums'

export type { UnitStatus }

export type StockStatus = 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK'

/** Physical unit row returned by admin inventory API */
export interface AdminInventoryUnit {
  id: string
  variantId: string
  unitSku: string
  barcodeValue: string
  status: UnitStatus
  createdAt: string
  updatedAt: string
}

export interface AdminVariantStock {
  variantId: string
  inStockQty: number
  heldQty: number
  availableQty: number
  lowStockThreshold: number
  stockStatus: StockStatus
  updatedAt: string
}

export interface InventoryVariantRow {
  variantId: string
  productId: string
  productName: string
  productCode: string
  keyImageUrl: string | null
  color: string
  colorHex: string | null
  size: string
  skuGroup: string
  stock: AdminVariantStock
}

export interface RestockResult {
  newUnits: AdminInventoryUnit[]
  newInStockQty: number
  variantId: string
  skuGroup: string
  color: string
  size: string
  productName: string
}

export type MovementReason =
  | 'RESTOCK'
  | 'SALE'
  | 'DAMAGE'
  | 'ADJUSTMENT'
  | 'RETURN'

export interface AdminInventoryMovement {
  id: string
  variantId: string
  deltaQty: number
  reason: MovementReason | string
  referenceType: string | null
  referenceId: string | null
  createdByAdminId: string | null
  createdAt: string
  adminDisplayName: string | null
}

export interface AdminReconciliationLog {
  id: string
  variantId: string
  actualCount: number
  aggregateCount: number
  delta: number
  detectedAt: string
  resolvedAt: string | null
  resolvedNote: string | null
  productName?: string
  color?: string
  size?: string
  skuGroup?: string
}

export interface AdminInventoryListResponse {
  variants: InventoryVariantRow[]
  total: number
  page: number
  limit: number
}

export interface AdminVariantStockDetail extends InventoryVariantRow {
  units: AdminInventoryUnit[]
  movements: AdminInventoryMovement[]
  unitCounts: Partial<Record<UnitStatus, number>>
}

export interface ManualReconcileResult {
  hasDrift: boolean
  actualCount: number
  aggregateCount: number
  delta: number
  logId: string | null
}
