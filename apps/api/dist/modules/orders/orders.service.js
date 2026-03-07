"use strict";
/**
 * Orders service — customer order history/detail, admin list/detail,
 * fulfillment transitions, cancel, shipping/address updates, scan-to-pack.
 * RORO. Throws AppError. OrderOperationError from db bubbles (has code + statusCode).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getMyOrders = getMyOrders;
exports.getMyOrderDetail = getMyOrderDetail;
exports.adminListOrders = adminListOrders;
exports.adminGetOrderDetail = adminGetOrderDetail;
exports.markOrderPacked = markOrderPacked;
exports.markOrderShipped = markOrderShipped;
exports.markOrderOutForDelivery = markOrderOutForDelivery;
exports.markOrderDelivered = markOrderDelivered;
exports.cancelOrder = cancelOrder;
exports.updateShippingAddress = updateShippingAddress;
exports.scanUnit = scanUnit;
exports.removeUnitAllocation = removeUnitAllocation;
exports.getOrderPackingStatus = getOrderPackingStatus;
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
const reviews_1 = require("../reviews");
const messaging_1 = require("../messaging");
// —— Customer-facing ——
async function getMyOrders({ userId, page = 1, limit = 20, }) {
    const { rows, meta } = await (0, db_1.listOrdersForUser)({ userId, page, limit });
    return { orders: rows, page: meta.page, limit: meta.limit, total: meta.total };
}
async function getMyOrderDetail({ orderId, userId, }) {
    const full = await (0, db_1.getOrderWithFullDetail)({ id: orderId });
    if (!full?.order || full.order.user_id !== userId) {
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    }
    const eventsSanitised = full.events.map((e) => ({ ...e, admin_note: null }));
    const allocationsSanitised = full.allocations.map((a) => {
        const { scanned_by_admin_id: _adminId, ...rest } = a;
        return rest;
    });
    return {
        order: full.order,
        items: full.items,
        addresses: full.addresses,
        contact: full.contact,
        events: eventsSanitised,
        allocations: allocationsSanitised,
    };
}
// —— Admin read ——
async function adminListOrders({ page = 1, limit = 50, orderState, paymentState, fulfillmentState, search, }) {
    const { rows, meta } = await (0, db_1.listOrdersAdmin)({
        page,
        limit,
        orderState,
        paymentState,
        fulfillmentState,
        search,
    });
    return { orders: rows, page: meta.page, limit: meta.limit, total: meta.total };
}
async function adminGetOrderDetail({ orderId }) {
    const full = await (0, db_1.getOrderWithFullDetail)({ id: orderId });
    if (!full)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    return {
        order: full.order,
        items: full.items,
        addresses: full.addresses,
        contact: full.contact,
        events: full.events,
        allocations: full.allocations,
    };
}
// —— Fulfillment ——
async function markOrderPacked({ orderId, adminId, note, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.payment_state !== 'PAID') {
        throw new errors_1.AppError('ORDER_NOT_PAID', 409);
    }
    await (0, db_1.transitionFulfillmentState)({
        orderId,
        fromState: 'NOT_STARTED',
        toState: 'PACKED',
        adminId,
        note,
    });
}
async function markOrderShipped({ orderId, adminId, trackingNumber, carrier, note, }) {
    await (0, db_1.transitionFulfillmentState)({
        orderId,
        fromState: 'PACKED',
        toState: 'SHIPPED',
        adminId,
        note,
        extraPayload: { trackingNumber, carrier },
    });
    if (trackingNumber != null || carrier != null) {
        await (0, db_1.updateShippingInfo)({
            orderId,
            trackingNumber: trackingNumber ?? undefined,
            carrier: carrier ?? undefined,
            adminId,
            note,
        });
    }
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (order?.user_id) {
        await (0, messaging_1.notifyOrderShipped)({
            userId: order.user_id,
            orderId,
            orderRef: order.order_ref,
            trackingNumber: trackingNumber ?? undefined,
            carrier: carrier ?? undefined,
        }).catch(() => { });
    }
}
async function markOrderOutForDelivery({ orderId, adminId, note, }) {
    await (0, db_1.transitionFulfillmentState)({
        orderId,
        fromState: 'SHIPPED',
        toState: 'OUT_FOR_DELIVERY',
        adminId,
        note,
    });
}
async function markOrderDelivered({ orderId, adminId, note, }) {
    await (0, db_1.transitionFulfillmentState)({
        orderId,
        fromState: 'OUT_FOR_DELIVERY',
        toState: 'DELIVERED',
        adminId,
        note,
    });
    await (0, reviews_1.generateTokensAfterDelivery)({ orderId }).catch((err) => console.error('[orders] review token gen failed:', err));
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (order?.user_id) {
        await (0, messaging_1.notifyOrderDelivered)({
            userId: order.user_id,
            orderId,
            orderRef: order.order_ref,
        }).catch(() => { });
    }
}
async function cancelOrder({ orderId, adminId, reason, }) {
    await (0, db_1.cancelOrder)({ orderId, adminId, reason });
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (order?.user_id) {
        await (0, messaging_1.notifyOrderCancelled)({
            userId: order.user_id,
            orderId,
            orderRef: order.order_ref,
            reason,
        }).catch(() => { });
    }
}
async function updateShippingAddress({ orderId, kind, addressJson, countryCode, adminId, }) {
    await (0, db_1.updateOrderAddress)({
        orderId,
        kind,
        addressJson,
        countryCode,
        adminId,
    });
}
// —— Scan-to-pack ——
async function scanUnit({ barcodeValue, orderItemId, adminId, adminFullName, }) {
    const unit = await (0, db_1.getInventoryUnitByBarcode)({ barcodeValue });
    if (!unit)
        throw new errors_1.AppError('BARCODE_NOT_FOUND', 404);
    const variant = await (0, db_1.getProductVariantById)({ variantId: unit.variant_id });
    if (!variant)
        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
    if (unit.status !== 'IN_STOCK') {
        throw new errors_1.AppError('UNIT_NOT_IN_STOCK', 422);
    }
    const item = await (0, db_1.getOrderItemById)({ orderItemId });
    if (!item)
        throw new errors_1.AppError('ORDER_ITEM_NOT_FOUND', 404);
    if (unit.variant_id !== item.variant_id) {
        throw new errors_1.AppError('UNIT_VARIANT_MISMATCH', 422);
    }
    const allocations = await (0, db_1.getOrderAllocations)({ orderId: item.order_id });
    const itemAllocations = allocations.filter((a) => a.order_item_id === orderItemId);
    if (itemAllocations.length >= item.qty) {
        throw new errors_1.AppError('ORDER_ITEM_FULLY_ALLOCATED', 409);
    }
    const allocation = await (0, db_1.allocateUnitToOrderItem)({
        orderItemId,
        inventoryUnitId: unit.id,
        scannedByAdminId: adminId,
        scannedByNameSnapshot: adminFullName,
    });
    return {
        unit,
        variant,
        orderItem: item,
        allocation,
    };
}
async function removeUnitAllocation({ inventoryUnitId, adminId, orderId, }) {
    await (0, db_1.deallocateUnit)({ inventoryUnitId, adminId, orderId });
}
async function getOrderPackingStatus({ orderId }) {
    const [allocations, items] = await Promise.all([
        (0, db_1.getOrderAllocations)({ orderId }),
        (0, db_1.getOrderItems)({ orderId }),
    ]);
    const itemStatuses = items.map((item) => {
        const itemAllocs = allocations.filter((a) => a.order_item_id === item.id);
        const required = item.qty;
        const allocated = itemAllocs.length;
        const isComplete = allocated >= required;
        const snap = item.product_snapshot_json ?? {};
        const productName = snap.displayName ?? snap.short_name ?? '';
        const color = snap.color ?? '';
        const size = snap.size ?? '';
        return {
            orderItemId: item.id,
            variantId: item.variant_id,
            productName,
            color,
            size,
            required,
            allocated,
            isComplete,
            allocatedUnits: itemAllocs.map((a) => ({
                inventoryUnitId: a.inventory_unit_id,
                unitSku: a.unit_sku,
                barcodeValue: a.barcode_value,
                scannedByName: a.scanned_by_name_snapshot,
                scannedAt: a.scanned_at,
            })),
        };
    });
    const isFullyPacked = itemStatuses.every((s) => s.isComplete);
    return {
        orderId,
        isFullyPacked,
        items: itemStatuses,
    };
}
//# sourceMappingURL=orders.service.js.map