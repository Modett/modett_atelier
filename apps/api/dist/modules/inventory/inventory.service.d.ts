/**
 * Inventory service — stock holds/releases, restock, damage, adjustment,
 * reconciliation. Uses withInventoryLock for all hold/release. RORO. Throws AppError.
 */
import type { VariantStock, VariantAvailabilityRow, InventoryUnit, InventoryMovement, ReconciliationLog } from '@modett/db';
export declare function getVariantStock({ variantId, }: {
    variantId: string;
}): Promise<VariantStock>;
export declare function getVariantAvailabilityForProduct({ productId, }: {
    productId: string;
}): Promise<VariantAvailabilityRow[]>;
export declare function getStockDetails({ variantId, }: {
    variantId: string;
}): Promise<{
    availability: VariantAvailabilityRow;
    units: InventoryUnit[];
    recentMovements: InventoryMovement[];
}>;
export declare function restockVariant({ variantId, qty, adminId, }: {
    variantId: string;
    qty: number;
    adminId: string;
}): Promise<{
    restockedQty: number;
    newUnits: InventoryUnit[];
}>;
export declare function holdStock({ variantId, qty, }: {
    variantId: string;
    qty: number;
}): Promise<void>;
export declare function releaseHold({ variantId, qty, }: {
    variantId: string;
    qty: number;
}): Promise<void>;
export declare function markUnitDamaged({ unitId, adminId, }: {
    unitId: string;
    adminId: string;
}): Promise<InventoryUnit>;
export declare function adjustStock({ variantId, deltaQty, reason, adminId, }: {
    variantId: string;
    deltaQty: number;
    reason: string;
    adminId: string;
}): Promise<VariantStock>;
export declare function updateLowStockThreshold({ variantId, threshold, adminId, }: {
    variantId: string;
    threshold: number;
    adminId: string;
}): Promise<VariantStock>;
export declare function scanBarcode({ barcodeValue, }: {
    barcodeValue: string;
}): Promise<InventoryUnit>;
export declare function runReconciliation({ variantId, adminId, }: {
    variantId?: string;
    adminId: string;
}): Promise<{
    checked: number;
    discrepanciesFound: number;
    logs: ReconciliationLog[];
}>;
export declare function getReconciliationLog({ variantId, unresolvedOnly, }: {
    variantId?: string;
    unresolvedOnly?: boolean;
}): Promise<ReconciliationLog[]>;
export declare function markReconciliationResolved({ logId, resolvedNote, adminId, }: {
    logId: string;
    resolvedNote: string;
    adminId: string;
}): Promise<ReconciliationLog>;
export declare function listUnitsForVariant({ variantId, status, }: {
    variantId: string;
    status?: 'IN_STOCK' | 'HELD' | 'SOLD' | 'RETURNED' | 'DAMAGED' | 'ADJUSTED_OUT';
}): Promise<InventoryUnit[]>;
export declare function getMovementHistory({ variantId, limit, offset, }: {
    variantId: string;
    limit?: number;
    offset?: number;
}): Promise<InventoryMovement[]>;
//# sourceMappingURL=inventory.service.d.ts.map