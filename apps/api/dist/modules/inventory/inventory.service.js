"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getVariantStock = getVariantStock;
exports.getVariantAvailabilityForProduct = getVariantAvailabilityForProduct;
exports.getStockDetails = getStockDetails;
exports.restockVariant = restockVariant;
exports.holdStock = holdStock;
exports.releaseHold = releaseHold;
exports.markUnitDamaged = markUnitDamaged;
exports.adjustStock = adjustStock;
exports.updateLowStockThreshold = updateLowStockThreshold;
exports.scanBarcode = scanBarcode;
exports.runReconciliation = runReconciliation;
exports.getReconciliationLog = getReconciliationLog;
exports.markReconciliationResolved = markReconciliationResolved;
exports.listUnitsForVariant = listUnitsForVariant;
exports.getMovementHistory = getMovementHistory;
const db_1 = require("@modett/db");
const db_2 = require("@modett/db");
const errors_1 = require("../../lib/errors");
function generateUnitIdentifiers({ variantId, sequence, }) {
    const prefix = variantId.replace(/-/g, '').slice(0, 8).toUpperCase();
    const padded = String(sequence).padStart(6, '0');
    return {
        barcodeValue: `MOD-${prefix}-${padded}`,
        unitSku: `SKU-${prefix}-${padded}`,
    };
}
async function getVariantStock({ variantId, }) {
    const stock = await (0, db_2.getVariantStock)({ variantId });
    if (!stock)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    return stock;
}
async function getVariantAvailabilityForProduct({ productId, }) {
    return await (0, db_2.getVariantAvailabilityForProduct)({ productId });
}
async function getStockDetails({ variantId, }) {
    const availability = await (0, db_2.getVariantAvailability)({ variantId });
    if (!availability)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    const [units, recentMovements] = await Promise.all([
        (0, db_2.listInventoryUnitsForVariant)({ variantId }),
        (0, db_2.listInventoryMovements)({ variantId, limit: 20 }),
    ]);
    return { availability, units, recentMovements };
}
async function restockVariant({ variantId, qty, adminId, }) {
    if (qty <= 0 || qty > 500) {
        throw new errors_1.AppError('INVALID_RESTOCK_QTY', 400);
    }
    const currentCount = await (0, db_2.countInStockUnits)({ variantId });
    const sequences = Array.from({ length: qty }, (_, i) => currentCount + 1 + i);
    const units = sequences.map((seq) => ({
        variantId,
        ...generateUnitIdentifiers({ variantId, sequence: seq }),
    }));
    let newUnits = [];
    await db_1.db.transaction(async (tx) => {
        const ok = await (0, db_2.atomicRestock)({ variantId, qty, tx });
        if (!ok)
            throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
        newUnits = await (0, db_2.createInventoryUnits)({ units, tx });
        await (0, db_2.createInventoryMovement)({
            variantId,
            deltaQty: qty,
            reason: 'RESTOCK',
            referenceType: 'manual_adjustment',
            createdByAdminId: adminId,
            tx,
        });
    });
    return { restockedQty: qty, newUnits };
}
async function holdStock({ variantId, qty, }) {
    const success = await (0, db_2.withInventoryLock)(variantId, async () => {
        return await (0, db_2.atomicHoldStock)({ variantId, qty });
    });
    if (!success)
        throw new errors_1.AppError('INSUFFICIENT_STOCK', 409);
}
async function releaseHold({ variantId, qty, }) {
    await (0, db_2.withInventoryLock)(variantId, async () => {
        await (0, db_2.atomicReleaseHold)({ variantId, qty });
    });
}
async function markUnitDamaged({ unitId, adminId, }) {
    const unit = await (0, db_2.getInventoryUnit)({ unitId });
    if (!unit)
        throw new errors_1.AppError('UNIT_NOT_FOUND', 404);
    if (unit.status !== 'IN_STOCK') {
        throw new errors_1.AppError('INVALID_UNIT_STATUS_TRANSITION', 409);
    }
    await db_1.db.transaction(async (tx) => {
        await (0, db_2.updateInventoryUnitStatus)({
            unitId,
            status: 'DAMAGED',
            tx,
        });
        await (0, db_2.atomicRestock)({
            variantId: unit.variant_id,
            qty: -1,
            tx,
        });
        await (0, db_2.createInventoryMovement)({
            variantId: unit.variant_id,
            deltaQty: -1,
            reason: 'DAMAGE',
            referenceType: 'manual_adjustment',
            referenceId: unitId,
            createdByAdminId: adminId,
            tx,
        });
    });
    const u = await (0, db_2.getInventoryUnit)({ unitId });
    if (!u)
        throw new errors_1.AppError('UNIT_NOT_FOUND', 404);
    return u;
}
async function adjustStock({ variantId, deltaQty, reason, adminId, }) {
    if (deltaQty === 0)
        throw new errors_1.AppError('INVALID_ADJUSTMENT', 400);
    const stock = await getVariantStock({ variantId });
    if (!stock)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    if (stock.in_stock_qty + deltaQty < 0) {
        throw new errors_1.AppError('ADJUSTMENT_WOULD_MAKE_STOCK_NEGATIVE', 400);
    }
    await db_1.db.transaction(async (tx) => {
        await (0, db_2.atomicRestock)({ variantId, qty: deltaQty, tx });
        await (0, db_2.createInventoryMovement)({
            variantId,
            deltaQty,
            reason: 'ADJUSTMENT',
            referenceType: 'manual_adjustment',
            createdByAdminId: adminId,
            tx,
        });
    });
    const updated = await getVariantStock({ variantId });
    if (!updated)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    return updated;
}
async function updateLowStockThreshold({ variantId, threshold, adminId, }) {
    if (threshold < 0)
        throw new errors_1.AppError('INVALID_THRESHOLD', 400);
    const stock = await (0, db_2.updateVariantLowStockThreshold)({ variantId, threshold });
    if (!stock)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    return stock;
}
async function scanBarcode({ barcodeValue, }) {
    const unit = await (0, db_2.getInventoryUnitByBarcode)({ barcodeValue });
    if (!unit)
        throw new errors_1.AppError('BARCODE_NOT_FOUND', 404);
    return unit;
}
async function runReconciliation({ variantId, adminId, }) {
    const variantIds = variantId != null
        ? [variantId]
        : await (0, db_2.listActiveVariantIds)();
    const logs = [];
    for (const vid of variantIds) {
        const actualCount = await (0, db_2.countInStockUnits)({ variantId: vid });
        const stock = await getVariantStock({ variantId: vid });
        if (!stock)
            continue;
        const aggregateCount = stock.in_stock_qty;
        if (actualCount !== aggregateCount) {
            const log = await (0, db_2.createReconciliationLog)({
                variantId: vid,
                actualCount,
                aggregateCount,
            });
            logs.push(log);
        }
    }
    return {
        checked: variantIds.length,
        discrepanciesFound: logs.length,
        logs,
    };
}
async function getReconciliationLog({ variantId, unresolvedOnly, }) {
    return await (0, db_2.listReconciliationLog)({
        variantId,
        unresolvedOnly,
    });
}
async function markReconciliationResolved({ logId, resolvedNote, adminId, }) {
    const log = await (0, db_2.markReconciliationResolved)({ id: logId, resolvedNote });
    if (!log)
        throw new errors_1.AppError('LOG_ENTRY_NOT_FOUND', 404);
    return log;
}
async function listUnitsForVariant({ variantId, status, }) {
    return await (0, db_2.listInventoryUnitsForVariant)({ variantId, status });
}
async function getMovementHistory({ variantId, limit, offset, }) {
    return await (0, db_2.listInventoryMovements)({ variantId, limit, offset });
}
