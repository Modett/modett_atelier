/**
 * Inventory query functions — variant_stock, variant_availability view,
 * inventory_units, movements, reconciliation log. No business logic. RORO.
 * Atomic writes use db.execute(sql`...`); caller must hold lock where required.
 */
import { type Database, type TransactionClient } from '../client';
import type { VariantStock, InventoryUnit, InventoryMovement, ReconciliationLog } from '../schema/inventory.schema';
export interface VariantAvailabilityRow {
    variantId: string;
    productId: string;
    color: string;
    size: string;
    inStockQty: number;
    heldQty: number;
    availableQty: number;
    lowStockThreshold: number;
    stockStatus: 'IN_STOCK' | 'LOW_STOCK' | 'OUT_OF_STOCK';
}
export declare function getVariantStock({ variantId, }: {
    variantId: string;
}): Promise<VariantStock | null>;
export declare function getVariantAvailability({ variantId, }: {
    variantId: string;
}): Promise<VariantAvailabilityRow | null>;
export declare function getVariantAvailabilityForProduct({ productId, }: {
    productId: string;
}): Promise<VariantAvailabilityRow[]>;
export declare function getInventoryUnit({ unitId, }: {
    unitId: string;
}): Promise<InventoryUnit | null>;
export declare function getInventoryUnitByBarcode({ barcodeValue, }: {
    barcodeValue: string;
}): Promise<InventoryUnit | null>;
export declare function getInventoryUnitBySku({ unitSku, }: {
    unitSku: string;
}): Promise<InventoryUnit | null>;
export declare function listInventoryUnitsForVariant({ variantId, status, }: {
    variantId: string;
    status?: 'IN_STOCK' | 'HELD' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'ADJUSTED_OUT';
}): Promise<InventoryUnit[]>;
export declare function listInventoryMovements({ variantId, limit, offset, }: {
    variantId: string;
    limit?: number;
    offset?: number;
}): Promise<InventoryMovement[]>;
export declare function listReconciliationLog({ variantId, unresolvedOnly, limit, offset, }: {
    variantId?: string;
    unresolvedOnly?: boolean;
    limit?: number;
    offset?: number;
}): Promise<ReconciliationLog[]>;
export declare function listActiveVariantIds(): Promise<string[]>;
export declare function countInStockUnits({ variantId, }: {
    variantId: string;
}): Promise<number>;
export declare function atomicHoldStock({ variantId, qty, }: {
    variantId: string;
    qty: number;
}): Promise<boolean>;
export declare function atomicReleaseHold({ variantId, qty, }: {
    variantId: string;
    qty: number;
}): Promise<boolean>;
export declare function atomicConfirmSale({ variantId, qty, tx, }: {
    variantId: string;
    qty: number;
    tx: TransactionClient;
}): Promise<boolean>;
export declare function atomicRestock({ variantId, qty, tx, }: {
    variantId: string;
    qty: number;
    tx?: Database | TransactionClient;
}): Promise<boolean>;
export declare function createInventoryUnit({ variantId, unitSku, barcodeValue, }: {
    variantId: string;
    unitSku: string;
    barcodeValue: string;
}): Promise<InventoryUnit>;
export declare function createInventoryUnits({ units, tx, }: {
    units: Array<{
        variantId: string;
        unitSku: string;
        barcodeValue: string;
    }>;
    tx?: Database | TransactionClient;
}): Promise<InventoryUnit[]>;
export declare function updateInventoryUnitStatus({ unitId, status, tx, }: {
    unitId: string;
    status: 'IN_STOCK' | 'HELD' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'ADJUSTED_OUT';
    tx?: Database | TransactionClient;
}): Promise<InventoryUnit | null>;
export declare function createInventoryMovement({ variantId, deltaQty, reason, referenceType, referenceId, createdByAdminId, tx, }: {
    variantId: string;
    deltaQty: number;
    reason: string;
    referenceType?: string | null;
    referenceId?: string | null;
    createdByAdminId?: string | null;
    tx?: Database | TransactionClient;
}): Promise<InventoryMovement>;
export declare function updateVariantLowStockThreshold({ variantId, threshold, }: {
    variantId: string;
    threshold: number;
}): Promise<VariantStock | null>;
export declare function createReconciliationLog({ variantId, actualCount, aggregateCount, }: {
    variantId: string;
    actualCount: number;
    aggregateCount: number;
}): Promise<ReconciliationLog>;
export declare function markReconciliationResolved({ id, resolvedNote, }: {
    id: string;
    resolvedNote: string;
}): Promise<ReconciliationLog | null>;
//# sourceMappingURL=inventory.d.ts.map