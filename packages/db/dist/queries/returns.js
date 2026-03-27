"use strict";
/**
 * Returns query functions — eligibility, return requests CRUD, status transitions,
 * events. No business logic. RORO. All status transitions are atomic (WHERE fromStatus).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.getDeliveredAt = getDeliveredAt;
exports.getAlreadyReturnedQty = getAlreadyReturnedQty;
exports.getReturnRequestById = getReturnRequestById;
exports.getReturnRequestWithItems = getReturnRequestWithItems;
exports.getReturnRequestsForOrder = getReturnRequestsForOrder;
exports.getReturnEventsForRequest = getReturnEventsForRequest;
exports.listReturnRequestsAdmin = listReturnRequestsAdmin;
exports.createReturnRequest = createReturnRequest;
exports.transitionReturnStatus = transitionReturnStatus;
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const client_1 = require("../client");
const errors_1 = require("../errors");
const returns_schema_1 = require("../schema/returns.schema");
// —— Helpers ——
function mapReturnStatusToOrderReturnState(status) {
    switch (status) {
        case 'SUBMITTED':
            return 'REQUESTED';
        case 'PENDING_REVIEW':
            return 'PENDING_REVIEW';
        case 'APPROVED':
            return 'APPROVED';
        case 'REJECTED':
            return 'REJECTED';
        case 'FULFILLED':
            return 'FULFILLED';
        default:
            return 'REQUESTED';
    }
}
function transitionErrorCode(toStatus) {
    switch (toStatus) {
        case 'PENDING_REVIEW':
            return 'RETURN_NOT_SUBMITTED';
        case 'APPROVED':
        case 'REJECTED':
            return 'RETURN_NOT_PENDING';
        case 'FULFILLED':
            return 'RETURN_NOT_APPROVED';
        default:
            return 'RETURN_STATE_CONFLICT';
    }
}
// —— Eligibility ——
async function getDeliveredAt({ orderId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT created_at
    FROM orders.order_events
    WHERE  order_id     = ${orderId}
      AND  event_type   = 'FULFILLMENT_UPDATED'
      AND  payload_json->>'to' = 'DELIVERED'
    ORDER  BY created_at DESC
    LIMIT  1
  `);
    const row = result.rows[0];
    return row ? new Date(row.created_at) : null;
}
async function getAlreadyReturnedQty({ orderItemId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COALESCE(SUM(rri.qty), 0)::int AS already_returned
    FROM   returns.return_request_items rri
    JOIN   returns.return_requests rr ON rr.id = rri.return_request_id
    WHERE  rri.order_item_id = ${orderItemId}
      AND  rr.status IN ('APPROVED', 'FULFILLED')
  `);
    const row = result.rows[0];
    return row?.already_returned ?? 0;
}
// —— Return request read ——
async function getReturnRequestById({ id, }) {
    const rows = await client_1.db
        .select()
        .from(returns_schema_1.returnRequests)
        .where((0, drizzle_orm_1.eq)(returns_schema_1.returnRequests.id, id));
    return rows[0] ?? null;
}
async function getReturnRequestWithItems({ id, }) {
    const request = await getReturnRequestById({ id });
    if (!request)
        return null;
    const items = await client_1.db
        .select()
        .from(returns_schema_1.returnRequestItems)
        .where((0, drizzle_orm_1.eq)(returns_schema_1.returnRequestItems.return_request_id, id))
        .orderBy((0, drizzle_orm_1.asc)(returns_schema_1.returnRequestItems.created_at));
    return { request, items };
}
async function getReturnRequestsForOrder({ orderId, }) {
    const rows = await client_1.db
        .select()
        .from(returns_schema_1.returnRequests)
        .where((0, drizzle_orm_1.eq)(returns_schema_1.returnRequests.order_id, orderId))
        .orderBy((0, drizzle_orm_1.desc)(returns_schema_1.returnRequests.created_at));
    return rows;
}
async function getReturnEventsForRequest({ returnRequestId, }) {
    const rows = await client_1.db
        .select()
        .from(returns_schema_1.returnEvents)
        .where((0, drizzle_orm_1.eq)(returns_schema_1.returnEvents.return_request_id, returnRequestId))
        .orderBy((0, drizzle_orm_1.asc)(returns_schema_1.returnEvents.created_at));
    return rows;
}
async function listReturnRequestsAdmin({ page = 1, limit = 50, status, type, }) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (page - 1) * safeLimit;
    const statusCondition = status == null ? (0, drizzle_orm_2.sql) `1 = 1` : (0, drizzle_orm_2.sql) `rr.status = ${status}`;
    const typeCondition = type == null ? (0, drizzle_orm_2.sql) `1 = 1` : (0, drizzle_orm_2.sql) `rr.type = ${type}`;
    const countResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COUNT(*)::int AS total
    FROM returns.return_requests rr
    JOIN orders.orders o ON o.id = rr.order_id
    WHERE ${statusCondition} AND ${typeCondition}
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT rr.id, rr.order_id, rr.type, rr.status, rr.reason,
           rr.policy_accepted_at, rr.policy_version, rr.eligible_until,
           rr.created_at, rr.updated_at,
           o.order_ref, o.user_id, o.guest_email
    FROM returns.return_requests rr
    JOIN orders.orders o ON o.id = rr.order_id
    WHERE ${statusCondition} AND ${typeCondition}
    ORDER BY rr.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `);
    const returns = (result.rows ?? []);
    return { returns, page, limit: safeLimit, total };
}
// —— Create return request (transaction: request + items + order return_state + event) ——
async function createReturnRequest({ orderId, type, reason, policyAcceptedAt, policyVersion, eligibleUntil, items, }) {
    return await client_1.db.transaction(async (tx) => {
        const insertRequest = await tx
            .insert(returns_schema_1.returnRequests)
            .values({
            order_id: orderId,
            type,
            status: 'SUBMITTED',
            reason,
            policy_accepted_at: policyAcceptedAt,
            policy_version: policyVersion,
            eligible_until: eligibleUntil,
        })
            .returning();
        const request = insertRequest[0];
        if (!request)
            throw new Error('createReturnRequest: no row returned');
        try {
            await tx.insert(returns_schema_1.returnRequestItems).values(items.map((i) => ({
                return_request_id: request.id,
                order_item_id: i.orderItemId,
                qty: i.qty,
                requested_variant_change_json: i.requestedVariantChangeJson ?? null,
                request_status: 'SUBMITTED',
            })));
        }
        catch (err) {
            const pgErr = err;
            if (pgErr?.code === '23505') {
                throw new errors_1.OrderOperationError('RETURN_ALREADY_ACTIVE', 409);
            }
            throw err;
        }
        const orderResult = await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE orders.orders
      SET return_state = 'REQUESTED',
          updated_at = now()
      WHERE id = ${orderId}
      RETURNING id
    `);
        if (orderResult.rows.length === 0) {
            throw new errors_1.OrderOperationError('ORDER_NOT_FOUND', 404);
        }
        await tx.insert(returns_schema_1.returnEvents).values({
            return_request_id: request.id,
            event_type: 'RETURN_SUBMITTED',
            payload_json: { type, itemCount: items.length },
        });
        return request;
    });
}
// —— Status transition (atomic: request + items + order + event) ——
async function transitionReturnStatus({ returnRequestId, orderId, fromStatus, toStatus, adminId, adminNote, eventType, extraPayload, }) {
    await client_1.db.transaction(async (tx) => {
        const result = await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE returns.return_requests
      SET    status     = ${toStatus},
             updated_at = now()
      WHERE  id     = ${returnRequestId}
        AND  status = ${fromStatus}
      RETURNING id
    `);
        if (result.rows.length === 0) {
            throw new errors_1.OrderOperationError(transitionErrorCode(toStatus), 409);
        }
        await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE returns.return_request_items
      SET    request_status = ${toStatus}
      WHERE  return_request_id = ${returnRequestId}
    `);
        const orderReturnState = mapReturnStatusToOrderReturnState(toStatus);
        await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE orders.orders
      SET return_state = ${orderReturnState},
          updated_at   = now()
      WHERE id = ${orderId}
    `);
        await tx.insert(returns_schema_1.returnEvents).values({
            return_request_id: returnRequestId,
            event_type: eventType,
            payload_json: extraPayload ?? {},
            admin_id: adminId ?? null,
            admin_note: adminNote ?? null,
        });
    });
}
