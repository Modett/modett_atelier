"use strict";
/**
 * Orders query functions — order summary view, full detail, events, allocations,
 * state transitions, shipping/address updates, scan-to-pack. No business logic. RORO.
 * All state transitions use atomic UPDATE with previous state in WHERE; 0 rows → OrderOperationError.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.listOrdersForUser = listOrdersForUser;
exports.listOrdersAdmin = listOrdersAdmin;
exports.getOrderItemById = getOrderItemById;
exports.getOrderEvents = getOrderEvents;
exports.getOrderAllocations = getOrderAllocations;
exports.getOrderWithFullDetail = getOrderWithFullDetail;
exports.getAllocationByUnitId = getAllocationByUnitId;
exports.transitionFulfillmentState = transitionFulfillmentState;
exports.cancelOrder = cancelOrder;
exports.updateShippingInfo = updateShippingInfo;
exports.updateOrderAddress = updateOrderAddress;
exports.allocateUnitToOrderItem = allocateUnitToOrderItem;
exports.deallocateUnit = deallocateUnit;
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const client_1 = require("../client");
const errors_1 = require("../errors");
const checkout_1 = require("./checkout");
const checkout_2 = require("./checkout");
const orders_schema_1 = require("../schema/orders.schema");
// —— Order read queries ——
async function listOrdersForUser({ userId, page = 1, limit = 20, }) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const offset = (page - 1) * safeLimit;
    const countResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COUNT(*)::int AS total
    FROM orders.order_summary
    WHERE user_id = ${userId}
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT id, order_ref, user_id, guest_email, order_state, payment_state,
           fulfillment_state, return_state, currency, total, placed_at, created_at, item_count
    FROM orders.order_summary
    WHERE user_id = ${userId}
    ORDER BY placed_at DESC NULLS LAST, created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `);
    const rows = (result.rows ?? []);
    return { rows, meta: { page, limit: safeLimit, total } };
}
async function listOrdersAdmin({ page = 1, limit = 50, orderState, paymentState, fulfillmentState, search, }) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (page - 1) * safeLimit;
    const conditions = [(0, drizzle_orm_2.sql) `1 = 1`];
    if (orderState != null)
        conditions.push((0, drizzle_orm_2.sql) `order_state = ${orderState}`);
    if (paymentState != null)
        conditions.push((0, drizzle_orm_2.sql) `payment_state = ${paymentState}`);
    if (fulfillmentState != null)
        conditions.push((0, drizzle_orm_2.sql) `fulfillment_state = ${fulfillmentState}`);
    if (search != null && search.trim() !== '') {
        const pattern = `%${search.trim()}%`;
        conditions.push((0, drizzle_orm_2.sql) `(order_ref ILIKE ${pattern} OR guest_email ILIKE ${pattern})`);
    }
    const whereClause = conditions.length > 1
        ? drizzle_orm_2.sql.join(conditions, (0, drizzle_orm_2.sql) ` AND `)
        : conditions[0];
    const countResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COUNT(*)::int AS total
    FROM orders.order_summary
    WHERE ${whereClause}
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT id, order_ref, user_id, guest_email, order_state, payment_state,
           fulfillment_state, return_state, currency, total, placed_at, created_at, item_count
    FROM orders.order_summary
    WHERE ${whereClause}
    ORDER BY placed_at DESC NULLS LAST, created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `);
    const rows = (result.rows ?? []);
    return { rows, meta: { page, limit: safeLimit, total } };
}
async function getOrderItemById({ orderItemId, }) {
    const rows = await client_1.db
        .select()
        .from(orders_schema_1.orderItems)
        .where((0, drizzle_orm_1.eq)(orders_schema_1.orderItems.id, orderItemId));
    return rows[0] ?? null;
}
async function getOrderEvents({ orderId, }) {
    const rows = await client_1.db
        .select()
        .from(orders_schema_1.orderEvents)
        .where((0, drizzle_orm_1.eq)(orders_schema_1.orderEvents.order_id, orderId))
        .orderBy((0, drizzle_orm_1.asc)(orders_schema_1.orderEvents.created_at));
    return rows;
}
async function getOrderAllocations({ orderId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT oa.id, oa.order_item_id, oa.inventory_unit_id, oa.scanned_by_admin_id,
           oa.scanned_by_name_snapshot, oa.scanned_at,
           oi.variant_id, oi.qty AS item_qty,
           iu.unit_sku, iu.barcode_value, iu.status AS unit_status
    FROM orders.order_unit_allocations oa
    JOIN orders.order_items oi ON oi.id = oa.order_item_id
    JOIN inventory.inventory_units iu ON iu.id = oa.inventory_unit_id
    WHERE oi.order_id = ${orderId}
    ORDER BY oa.scanned_at ASC
  `);
    return (result.rows ?? []);
}
async function getOrderWithFullDetail({ id, }) {
    const order = await (0, checkout_2.getOrderById)({ id });
    if (!order)
        return null;
    const [items, addresses, contact, events, allocations] = await Promise.all([
        (0, checkout_2.getOrderItems)({ orderId: id }),
        (0, checkout_2.getOrderAddresses)({ orderId: id }),
        (0, checkout_2.getOrderContact)({ orderId: id }),
        getOrderEvents({ orderId: id }),
        getOrderAllocations({ orderId: id }),
    ]);
    return { order, items, addresses, contact, events, allocations };
}
async function getAllocationByUnitId({ inventoryUnitId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT id, order_item_id, inventory_unit_id, scanned_by_admin_id,
           scanned_by_name_snapshot, scanned_at
    FROM orders.order_unit_allocations
    WHERE inventory_unit_id = ${inventoryUnitId}
  `);
    const row = result.rows[0];
    return row ?? null;
}
// —— Fulfillment state transition (reusable) ——
function fulfillmentErrorCode(toState) {
    switch (toState) {
        case 'PACKED':
            return 'ORDER_NOT_READY_TO_PACK';
        case 'SHIPPED':
            return 'ORDER_NOT_PACKED';
        case 'OUT_FOR_DELIVERY':
            return 'ORDER_NOT_SHIPPED';
        case 'DELIVERED':
            return 'ORDER_NOT_OUT_FOR_DELIVERY';
        default:
            return 'ORDER_STATE_CONFLICT';
    }
}
async function transitionFulfillmentState({ orderId, fromState, toState, adminId, note, extraPayload, tx, }) {
    const client = tx ?? client_1.db;
    const run = async (t) => {
        const result = await t.execute((0, drizzle_orm_2.sql) `
      UPDATE orders.orders
      SET fulfillment_state = ${toState},
          updated_at = now()
      WHERE id = ${orderId}
        AND fulfillment_state = ${fromState}
      RETURNING id
    `);
        if (result.rows.length === 0) {
            throw new errors_1.OrderOperationError(fulfillmentErrorCode(toState), 409);
        }
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'FULFILLMENT_UPDATED',
            payloadJson: { from: fromState, to: toState, ...extraPayload },
            createdByAdminId: adminId,
            adminNote: note ?? null,
            tx: t,
        });
    };
    if (tx) {
        await run(tx);
    }
    else {
        await client_1.db.transaction(run);
    }
}
// —— Cancel order ——
async function cancelOrder({ orderId, adminId, reason, tx, }) {
    const run = async (t) => {
        const result = await t.execute((0, drizzle_orm_2.sql) `
      UPDATE orders.orders
      SET order_state = 'CANCELLED',
          updated_at = now()
      WHERE id = ${orderId}
        AND order_state = 'PLACED'
        AND fulfillment_state = 'NOT_STARTED'
      RETURNING id
    `);
        if (result.rows.length === 0) {
            throw new errors_1.OrderOperationError('ORDER_CANNOT_BE_CANCELLED', 409);
        }
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'ORDER_CANCELLED',
            payloadJson: { reason },
            createdByAdminId: adminId,
            tx: t,
        });
    };
    if (tx) {
        await run(tx);
    }
    else {
        await client_1.db.transaction(run);
    }
}
// —— Shipping info update ——
async function updateShippingInfo({ orderId, trackingNumber, carrier, adminId, note, }) {
    await client_1.db.transaction(async (tx) => {
        const result = await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE orders.orders
      SET shipping_method_snapshot = COALESCE(${carrier ?? null}, shipping_method_snapshot),
          updated_at = now()
      WHERE id = ${orderId}
        AND order_state = 'PLACED'
      RETURNING id
    `);
        if (result.rows.length === 0) {
            throw new errors_1.OrderOperationError('ORDER_NOT_PLACED', 409);
        }
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'SHIPPING_UPDATED',
            payloadJson: { trackingNumber: trackingNumber ?? null, carrier: carrier ?? null },
            createdByAdminId: adminId,
            adminNote: note ?? null,
            tx,
        });
    });
}
// —— Order address update (admin, pre-ship only) ——
async function updateOrderAddress({ orderId, kind, addressJson, countryCode, adminId, }) {
    await client_1.db.transaction(async (tx) => {
        const stateResult = await tx.execute((0, drizzle_orm_2.sql) `
      SELECT fulfillment_state
      FROM orders.orders
      WHERE id = ${orderId}
    `);
        const row = stateResult.rows[0];
        if (!row || row.fulfillment_state !== 'NOT_STARTED') {
            throw new errors_1.OrderOperationError('ORDER_ALREADY_SHIPPED', 409);
        }
        const updateResult = await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE orders.order_addresses
      SET address_json = ${JSON.stringify(addressJson)}::jsonb,
          country_code = ${countryCode}
      WHERE order_id = ${orderId}
        AND kind = ${kind}
      RETURNING id
    `);
        if (updateResult.rows.length === 0) {
            throw new errors_1.OrderOperationError('ADDRESS_NOT_FOUND', 404);
        }
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'ADDRESS_UPDATED',
            payloadJson: { kind, countryCode },
            createdByAdminId: adminId,
            tx,
        });
    });
}
// —— Scan-to-pack: allocate unit to order item ——
async function allocateUnitToOrderItem({ orderItemId, inventoryUnitId, scannedByAdminId, scannedByNameSnapshot, }) {
    const orderIdResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT order_id FROM orders.order_items WHERE id = ${orderItemId}
  `);
    const orderIdRow = orderIdResult.rows[0];
    if (!orderIdRow)
        throw new errors_1.OrderOperationError('ORDER_ITEM_NOT_FOUND', 404);
    const orderId = orderIdRow.order_id;
    return await client_1.db.transaction(async (tx) => {
        const insertResult = await tx.execute((0, drizzle_orm_2.sql) `
      INSERT INTO orders.order_unit_allocations
        (order_item_id, inventory_unit_id, scanned_by_admin_id, scanned_by_name_snapshot)
      VALUES (${orderItemId}, ${inventoryUnitId}, ${scannedByAdminId}, ${scannedByNameSnapshot})
      ON CONFLICT (inventory_unit_id) DO NOTHING
      RETURNING id, order_item_id, inventory_unit_id, scanned_by_admin_id, scanned_by_name_snapshot, scanned_at
    `);
        if (insertResult.rows.length === 0) {
            throw new errors_1.OrderOperationError('UNIT_ALREADY_ALLOCATED', 409);
        }
        const unitResult = await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE inventory.inventory_units
      SET status = 'SOLD',
          updated_at = now()
      WHERE id = ${inventoryUnitId}
        AND status = 'IN_STOCK'
      RETURNING id
    `);
        if (unitResult.rows.length === 0) {
            throw new errors_1.OrderOperationError('UNIT_NOT_IN_STOCK', 422);
        }
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'UNIT_ALLOCATED',
            payloadJson: {
                inventoryUnitId,
                orderItemId,
                scannedByNameSnapshot,
            },
            createdByAdminId: scannedByAdminId,
            tx,
        });
        return insertResult.rows[0];
    });
}
// —— Scan-to-pack: deallocate unit ——
async function deallocateUnit({ inventoryUnitId, adminId, orderId, }) {
    await client_1.db.transaction(async (tx) => {
        const deleteResult = await tx.execute((0, drizzle_orm_2.sql) `
      DELETE FROM orders.order_unit_allocations
      WHERE inventory_unit_id = ${inventoryUnitId}
      RETURNING order_item_id
    `);
        if (deleteResult.rows.length === 0) {
            throw new errors_1.OrderOperationError('ALLOCATION_NOT_FOUND', 404);
        }
        const unitResult = await tx.execute((0, drizzle_orm_2.sql) `
      UPDATE inventory.inventory_units
      SET status = 'IN_STOCK',
          updated_at = now()
      WHERE id = ${inventoryUnitId}
        AND status = 'SOLD'
      RETURNING id
    `);
        if (unitResult.rows.length === 0) {
            throw new errors_1.OrderOperationError('UNIT_NOT_SOLD', 409);
        }
        await (0, checkout_1.appendOrderEvent)({
            orderId,
            eventType: 'UNIT_DEALLOCATED',
            payloadJson: { inventoryUnitId },
            createdByAdminId: adminId,
            tx,
        });
    });
}
