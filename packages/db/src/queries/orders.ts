/**
 * Orders query functions — order summary view, full detail, events, allocations,
 * state transitions, shipping/address updates, scan-to-pack. No business logic. RORO.
 * All state transitions use atomic UPDATE with previous state in WHERE; 0 rows → OrderOperationError.
 */

import { eq, asc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db, type TransactionClient } from '../client'
import { OrderOperationError } from '../errors'
import { appendOrderEvent } from './checkout'
import {
  getOrderById,
  getOrderItems,
  getOrderAddresses,
  getOrderContact,
} from './checkout'
import { orderEvents, orderItems, orderUnitAllocations } from '../schema/orders.schema'
import type { OrderEvent, OrderItem, OrderAddress, Order } from '../schema/orders.schema'
import type { OrderUnitAllocation } from '../types'

// —— Row types ——

export interface OrderSummaryRow {
  id: string
  order_ref: string
  user_id: string | null
  guest_email: string | null
  order_state: string
  payment_state: string
  fulfillment_state: string
  return_state: string
  currency: string
  total: string
  placed_at: string | null
  created_at: string
  item_count: string
}

export interface OrderAllocationDetail extends OrderUnitAllocation {
  variant_id: string | null
  item_qty: number
  unit_sku: string
  barcode_value: string
  unit_status: string
}

export interface PaginationMeta {
  page: number
  limit: number
  total: number
}

// —— Order read queries ——

export async function listOrdersForUser({
  userId,
  page = 1,
  limit = 20,
}: {
  userId: string
  page?: number
  limit?: number
}): Promise<{ rows: OrderSummaryRow[]; meta: PaginationMeta }> {
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const offset = (page - 1) * safeLimit

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM orders.order_summary
    WHERE user_id = ${userId}
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT id, order_ref, user_id, guest_email, order_state, payment_state,
           fulfillment_state, return_state, currency, total, placed_at, created_at, item_count
    FROM orders.order_summary
    WHERE user_id = ${userId}
    ORDER BY placed_at DESC NULLS LAST, created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const rows = (result.rows ?? []) as unknown as OrderSummaryRow[]
  return { rows, meta: { page, limit: safeLimit, total } }
}

export async function listOrdersAdmin({
  page = 1,
  limit = 50,
  orderState,
  paymentState,
  fulfillmentState,
  search,
}: {
  page?: number
  limit?: number
  orderState?: string
  paymentState?: string
  fulfillmentState?: string
  search?: string
}): Promise<{ rows: OrderSummaryRow[]; meta: PaginationMeta }> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const offset = (page - 1) * safeLimit

  const conditions: ReturnType<typeof sql>[] = [sql`1 = 1`]
  if (orderState != null) conditions.push(sql`order_state = ${orderState}`)
  if (paymentState != null) conditions.push(sql`payment_state = ${paymentState}`)
  if (fulfillmentState != null) conditions.push(sql`fulfillment_state = ${fulfillmentState}`)
  if (search != null && search.trim() !== '') {
    const pattern = `%${search.trim()}%`
    conditions.push(sql`(order_ref ILIKE ${pattern} OR guest_email ILIKE ${pattern})`)
  }

  const whereClause = conditions.length > 1
    ? sql.join(conditions, sql` AND `)
    : conditions[0]!

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM orders.order_summary
    WHERE ${whereClause}
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT id, order_ref, user_id, guest_email, order_state, payment_state,
           fulfillment_state, return_state, currency, total, placed_at, created_at, item_count
    FROM orders.order_summary
    WHERE ${whereClause}
    ORDER BY placed_at DESC NULLS LAST, created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const rows = (result.rows ?? []) as unknown as OrderSummaryRow[]
  return { rows, meta: { page, limit: safeLimit, total } }
}

export async function getOrderItemById({
  orderItemId,
}: {
  orderItemId: string
}): Promise<OrderItem | null> {
  const rows = await db
    .select()
    .from(orderItems)
    .where(eq(orderItems.id, orderItemId))
  return rows[0] ?? null
}

export async function getOrderEvents({
  orderId,
}: {
  orderId: string
}): Promise<OrderEvent[]> {
  const rows = await db
    .select()
    .from(orderEvents)
    .where(eq(orderEvents.order_id, orderId))
    .orderBy(asc(orderEvents.created_at))
  return rows
}

export async function getOrderAllocations({
  orderId,
}: {
  orderId: string
}): Promise<OrderAllocationDetail[]> {
  const result = await db.execute(sql`
    SELECT oa.id, oa.order_item_id, oa.inventory_unit_id, oa.scanned_by_admin_id,
           oa.scanned_by_name_snapshot, oa.scanned_at,
           oi.variant_id, oi.qty AS item_qty,
           iu.unit_sku, iu.barcode_value, iu.status AS unit_status
    FROM orders.order_unit_allocations oa
    JOIN orders.order_items oi ON oi.id = oa.order_item_id
    JOIN inventory.inventory_units iu ON iu.id = oa.inventory_unit_id
    WHERE oi.order_id = ${orderId}
    ORDER BY oa.scanned_at ASC
  `)
  return (result.rows ?? []) as unknown as OrderAllocationDetail[]
}

export async function getOrderWithFullDetail({
  id,
}: {
  id: string
}): Promise<{
  order: Order | null
  items: OrderItem[]
  addresses: OrderAddress[]
  contact: Awaited<ReturnType<typeof getOrderContact>>
  events: OrderEvent[]
  allocations: OrderAllocationDetail[]
} | null> {
  const order = await getOrderById({ id })
  if (!order) return null

  const [items, addresses, contact, events, allocations] = await Promise.all([
    getOrderItems({ orderId: id }),
    getOrderAddresses({ orderId: id }),
    getOrderContact({ orderId: id }),
    getOrderEvents({ orderId: id }),
    getOrderAllocations({ orderId: id }),
  ])

  return { order, items, addresses, contact, events, allocations }
}

export async function getAllocationByUnitId({
  inventoryUnitId,
}: {
  inventoryUnitId: string
}): Promise<OrderUnitAllocation | null> {
  const result = await db.execute(sql`
    SELECT id, order_item_id, inventory_unit_id, scanned_by_admin_id,
           scanned_by_name_snapshot, scanned_at
    FROM orders.order_unit_allocations
    WHERE inventory_unit_id = ${inventoryUnitId}
  `)
  const row = result.rows[0] as OrderUnitAllocation | undefined
  return row ?? null
}

// —— Fulfillment state transition (reusable) ——

function fulfillmentErrorCode(toState: string): string {
  switch (toState) {
    case 'PACKED':
      return 'ORDER_NOT_READY_TO_PACK'
    case 'SHIPPED':
      return 'ORDER_NOT_PACKED'
    case 'OUT_FOR_DELIVERY':
      return 'ORDER_NOT_SHIPPED'
    case 'DELIVERED':
      return 'ORDER_NOT_OUT_FOR_DELIVERY'
    default:
      return 'ORDER_STATE_CONFLICT'
  }
}

export async function transitionFulfillmentState({
  orderId,
  fromState,
  toState,
  adminId,
  note,
  extraPayload,
  tx,
}: {
  orderId: string
  fromState: string
  toState: string
  adminId: string
  note?: string | null
  extraPayload?: Record<string, unknown>
  tx?: TransactionClient
}): Promise<void> {
  const client = tx ?? db
  const run = async (t: TransactionClient) => {
    const result = await t.execute(sql`
      UPDATE orders.orders
      SET fulfillment_state = ${toState},
          updated_at = now()
      WHERE id = ${orderId}
        AND fulfillment_state = ${fromState}
      RETURNING id
    `)
    if (result.rows.length === 0) {
      throw new OrderOperationError(fulfillmentErrorCode(toState), 409)
    }
    await appendOrderEvent({
      orderId,
      eventType: 'FULFILLMENT_UPDATED',
      payloadJson: { from: fromState, to: toState, ...extraPayload },
      createdByAdminId: adminId,
      adminNote: note ?? null,
      tx: t,
    })
  }
  if (tx) {
    await run(tx)
  } else {
    await db.transaction(run)
  }
}

// —— Cancel order ——

export async function cancelOrder({
  orderId,
  adminId,
  reason,
  tx,
}: {
  orderId: string
  adminId: string
  reason: string
  tx?: TransactionClient
}): Promise<void> {
  const run = async (t: TransactionClient) => {
    const result = await t.execute(sql`
      UPDATE orders.orders
      SET order_state = 'CANCELLED',
          updated_at = now()
      WHERE id = ${orderId}
        AND order_state = 'PLACED'
        AND fulfillment_state = 'NOT_STARTED'
      RETURNING id
    `)
    if (result.rows.length === 0) {
      throw new OrderOperationError('ORDER_CANNOT_BE_CANCELLED', 409)
    }
    await appendOrderEvent({
      orderId,
      eventType: 'ORDER_CANCELLED',
      payloadJson: { reason },
      createdByAdminId: adminId,
      tx: t,
    })
  }
  if (tx) {
    await run(tx)
  } else {
    await db.transaction(run)
  }
}

// —— Shipping info update ——

export async function updateShippingInfo({
  orderId,
  trackingNumber,
  carrier,
  adminId,
  note,
}: {
  orderId: string
  trackingNumber?: string | null
  carrier?: string | null
  adminId: string
  note?: string | null
}): Promise<void> {
  await db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      UPDATE orders.orders
      SET shipping_method_snapshot = COALESCE(${carrier ?? null}, shipping_method_snapshot),
          updated_at = now()
      WHERE id = ${orderId}
        AND order_state = 'PLACED'
      RETURNING id
    `)
    if (result.rows.length === 0) {
      throw new OrderOperationError('ORDER_NOT_PLACED', 409)
    }
    await appendOrderEvent({
      orderId,
      eventType: 'SHIPPING_UPDATED',
      payloadJson: { trackingNumber: trackingNumber ?? null, carrier: carrier ?? null },
      createdByAdminId: adminId,
      adminNote: note ?? null,
      tx,
    })
  })
}

// —— Order address update (admin, pre-ship only) ——

export async function updateOrderAddress({
  orderId,
  kind,
  addressJson,
  countryCode,
  adminId,
}: {
  orderId: string
  kind: 'SHIPPING' | 'BILLING'
  addressJson: Record<string, unknown>
  countryCode: string
  adminId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const stateResult = await tx.execute(sql`
      SELECT fulfillment_state
      FROM orders.orders
      WHERE id = ${orderId}
    `)
    const row = stateResult.rows[0] as { fulfillment_state: string } | undefined
    if (!row || row.fulfillment_state !== 'NOT_STARTED') {
      throw new OrderOperationError('ORDER_ALREADY_SHIPPED', 409)
    }

    const updateResult = await tx.execute(sql`
      UPDATE orders.order_addresses
      SET address_json = ${JSON.stringify(addressJson)}::jsonb,
          country_code = ${countryCode}
      WHERE order_id = ${orderId}
        AND kind = ${kind}
      RETURNING id
    `)
    if (updateResult.rows.length === 0) {
      throw new OrderOperationError('ADDRESS_NOT_FOUND', 404)
    }
    await appendOrderEvent({
      orderId,
      eventType: 'ADDRESS_UPDATED',
      payloadJson: { kind, countryCode },
      createdByAdminId: adminId,
      tx,
    })
  })
}

// —— Scan-to-pack: allocate unit to order item ——

export async function allocateUnitToOrderItem({
  orderItemId,
  inventoryUnitId,
  scannedByAdminId,
  scannedByNameSnapshot,
}: {
  orderItemId: string
  inventoryUnitId: string
  scannedByAdminId: string
  scannedByNameSnapshot: string
}): Promise<OrderUnitAllocation> {
  const orderIdResult = await db.execute(sql`
    SELECT order_id FROM orders.order_items WHERE id = ${orderItemId}
  `)
  const orderIdRow = orderIdResult.rows[0] as { order_id: string } | undefined
  if (!orderIdRow) throw new OrderOperationError('ORDER_ITEM_NOT_FOUND', 404)
  const orderId = orderIdRow.order_id

  return await db.transaction(async (tx) => {
    const insertResult = await tx.execute(sql`
      INSERT INTO orders.order_unit_allocations
        (order_item_id, inventory_unit_id, scanned_by_admin_id, scanned_by_name_snapshot)
      VALUES (${orderItemId}, ${inventoryUnitId}, ${scannedByAdminId}, ${scannedByNameSnapshot})
      ON CONFLICT (inventory_unit_id) DO NOTHING
      RETURNING id, order_item_id, inventory_unit_id, scanned_by_admin_id, scanned_by_name_snapshot, scanned_at
    `)
    if (insertResult.rows.length === 0) {
      throw new OrderOperationError('UNIT_ALREADY_ALLOCATED', 409)
    }

    const unitResult = await tx.execute(sql`
      UPDATE inventory.inventory_units
      SET status = 'SOLD',
          updated_at = now()
      WHERE id = ${inventoryUnitId}
        AND status = 'IN_STOCK'
      RETURNING id
    `)
    if (unitResult.rows.length === 0) {
      throw new OrderOperationError('UNIT_NOT_IN_STOCK', 422)
    }

    await appendOrderEvent({
      orderId,
      eventType: 'UNIT_ALLOCATED',
      payloadJson: {
        inventoryUnitId,
        orderItemId,
        scannedByNameSnapshot,
      },
      createdByAdminId: scannedByAdminId,
      tx,
    })

    return insertResult.rows[0] as OrderUnitAllocation
  })
}

// —— Scan-to-pack: deallocate unit ——

export async function deallocateUnit({
  inventoryUnitId,
  adminId,
  orderId,
}: {
  inventoryUnitId: string
  adminId: string
  orderId: string
}): Promise<void> {
  await db.transaction(async (tx) => {
    const deleteResult = await tx.execute(sql`
      DELETE FROM orders.order_unit_allocations
      WHERE inventory_unit_id = ${inventoryUnitId}
      RETURNING order_item_id
    `)
    if (deleteResult.rows.length === 0) {
      throw new OrderOperationError('ALLOCATION_NOT_FOUND', 404)
    }

    const unitResult = await tx.execute(sql`
      UPDATE inventory.inventory_units
      SET status = 'IN_STOCK',
          updated_at = now()
      WHERE id = ${inventoryUnitId}
        AND status = 'SOLD'
      RETURNING id
    `)
    if (unitResult.rows.length === 0) {
      throw new OrderOperationError('UNIT_NOT_SOLD', 409)
    }

    await appendOrderEvent({
      orderId,
      eventType: 'UNIT_DEALLOCATED',
      payloadJson: { inventoryUnitId },
      createdByAdminId: adminId,
      tx,
    })
  })
}
