"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.checkReturnEligibility = checkReturnEligibility;
exports.createReturn = createReturn;
exports.getMyReturnRequests = getMyReturnRequests;
exports.getMyReturnDetail = getMyReturnDetail;
exports.adminListReturns = adminListReturns;
exports.adminGetReturnDetail = adminGetReturnDetail;
exports.adminOpenForReview = adminOpenForReview;
exports.adminApprove = adminApprove;
exports.adminReject = adminReject;
exports.adminFulfil = adminFulfil;
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
async function checkReturnEligibility({ orderId, requestedItems, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order)
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    if (order.order_state !== 'PLACED') {
        throw new errors_1.AppError('ORDER_NOT_PLACED', 422);
    }
    if (order.payment_state !== 'PAID') {
        throw new errors_1.AppError('ORDER_NOT_PAID', 422);
    }
    const fulfillmentState = order
        .fulfillment_state;
    if (fulfillmentState !== 'DELIVERED') {
        throw new errors_1.AppError('ORDER_NOT_DELIVERED', 422);
    }
    const deliveredAt = await (0, db_1.getDeliveredAt)({ orderId });
    if (!deliveredAt)
        throw new errors_1.AppError('DELIVERY_EVENT_NOT_FOUND', 422);
    const eligibleUntil = new Date(deliveredAt.getTime() + 14 * 24 * 60 * 60 * 1000);
    if (new Date() > eligibleUntil) {
        throw new errors_1.AppError('RETURN_WINDOW_EXPIRED', 422, `Return window expired at ${eligibleUntil.toISOString()}`);
    }
    const orderItems = await (0, db_1.getOrderItems)({ orderId });
    for (const requestedItem of requestedItems) {
        const orderItem = orderItems.find((i) => i.id === requestedItem.orderItemId);
        if (!orderItem) {
            throw new errors_1.AppError('ORDER_ITEM_NOT_FOUND', 404, `Order item ${requestedItem.orderItemId} not found`);
        }
        if (requestedItem.qty <= 0) {
            throw new errors_1.AppError('INVALID_QTY', 400);
        }
        if (requestedItem.qty > orderItem.qty) {
            throw new errors_1.AppError('RETURN_QTY_EXCEEDS_ORDER', 422, `Requested ${requestedItem.qty} exceeds order qty ${orderItem.qty}`);
        }
        const alreadyReturned = await (0, db_1.getAlreadyReturnedQty)({
            orderItemId: requestedItem.orderItemId,
        });
        const available = orderItem.qty - alreadyReturned;
        if (requestedItem.qty > available) {
            throw new errors_1.AppError('INSUFFICIENT_RETURNABLE_QTY', 422, `Available: ${available}, requested: ${requestedItem.qty}`);
        }
    }
    return { eligibleUntil, deliveredAt };
}
async function createReturn({ orderId, userId, type, reason, policyVersion, items, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order || order.user_id !== userId) {
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    }
    if (type === 'EXCHANGE') {
        for (const item of items) {
            if (item.requestedVariantChangeJson == null) {
                throw new errors_1.AppError('EXCHANGE_VARIANT_REQUIRED', 400, `Exchange requires requestedVariantChangeJson for order item ${item.orderItemId}`);
            }
        }
    }
    const { eligibleUntil } = await checkReturnEligibility({
        orderId,
        requestedItems: items.map((i) => ({ orderItemId: i.orderItemId, qty: i.qty })),
    });
    const request = await (0, db_1.createReturnRequest)({
        orderId,
        type,
        reason,
        policyAcceptedAt: new Date(),
        policyVersion,
        eligibleUntil,
        items: items.map((i) => ({
            orderItemId: i.orderItemId,
            qty: i.qty,
            requestedVariantChangeJson: i.requestedVariantChangeJson ?? null,
        })),
    });
    const { items: requestItems } = (await (0, db_1.getReturnRequestWithItems)({
        id: request.id,
    })) ?? { items: [] };
    return { returnRequest: request, items: requestItems };
}
async function getMyReturnRequests({ orderId, userId, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order || order.user_id !== userId) {
        throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
    }
    const returns = await (0, db_1.getReturnRequestsForOrder)({ orderId });
    return { returns };
}
async function getMyReturnDetail({ returnRequestId, userId, }) {
    const data = await (0, db_1.getReturnRequestWithItems)({ id: returnRequestId });
    if (!data)
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    const order = await (0, db_1.getOrderById)({ id: data.request.order_id });
    if (!order || order.user_id !== userId) {
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    }
    const events = await (0, db_1.getReturnEventsForRequest)({ returnRequestId });
    const eventsForCustomer = events.map((e) => ({ ...e, admin_note: null }));
    return {
        request: data.request,
        items: data.items,
        events: eventsForCustomer,
    };
}
async function adminListReturns({ page = 1, limit = 50, status, type, }) {
    const result = await (0, db_1.listReturnRequestsAdmin)({ page, limit, status, type });
    return {
        returns: result.returns,
        page: result.page,
        limit: result.limit,
        total: result.total,
    };
}
async function adminGetReturnDetail({ returnRequestId, }) {
    const data = await (0, db_1.getReturnRequestWithItems)({ id: returnRequestId });
    if (!data)
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    const events = await (0, db_1.getReturnEventsForRequest)({ returnRequestId });
    return {
        request: data.request,
        items: data.items,
        events,
    };
}
async function adminOpenForReview({ returnRequestId, adminId, }) {
    const data = await (0, db_1.getReturnRequestWithItems)({ id: returnRequestId });
    if (!data)
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    await (0, db_1.transitionReturnStatus)({
        returnRequestId,
        orderId: data.request.order_id,
        fromStatus: 'SUBMITTED',
        toStatus: 'PENDING_REVIEW',
        adminId,
        eventType: 'RETURN_OPENED',
    });
}
async function adminApprove({ returnRequestId, adminId, adminNote, }) {
    const data = await (0, db_1.getReturnRequestWithItems)({ id: returnRequestId });
    if (!data)
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    await (0, db_1.transitionReturnStatus)({
        returnRequestId,
        orderId: data.request.order_id,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'APPROVED',
        adminId,
        adminNote: adminNote ?? null,
        eventType: 'RETURN_APPROVED',
    });
}
async function adminReject({ returnRequestId, adminId, reason, adminNote, }) {
    const data = await (0, db_1.getReturnRequestWithItems)({ id: returnRequestId });
    if (!data)
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    await (0, db_1.transitionReturnStatus)({
        returnRequestId,
        orderId: data.request.order_id,
        fromStatus: 'PENDING_REVIEW',
        toStatus: 'REJECTED',
        adminId,
        adminNote: adminNote ?? null,
        eventType: 'RETURN_REJECTED',
        extraPayload: { reason },
    });
}
async function adminFulfil({ returnRequestId, adminId, adminNote, }) {
    const data = await (0, db_1.getReturnRequestWithItems)({ id: returnRequestId });
    if (!data)
        throw new errors_1.AppError('RETURN_NOT_FOUND', 404);
    await (0, db_1.transitionReturnStatus)({
        returnRequestId,
        orderId: data.request.order_id,
        fromStatus: 'APPROVED',
        toStatus: 'FULFILLED',
        adminId,
        adminNote: adminNote ?? null,
        eventType: 'RETURN_FULFILLED',
    });
}
