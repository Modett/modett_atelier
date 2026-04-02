/**
 * Returns query functions — eligibility, return requests CRUD, status transitions,
 * events. No business logic. RORO. All status transitions are atomic (WHERE fromStatus).
 */

import { eq, asc, desc } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db, type TransactionClient } from '../client'
import { OrderOperationError } from '../errors'
import {
  returnRequests,
  returnRequestItems,
  returnEvents,
} from '../schema/returns.schema'
import type {
  ReturnRequest,
  ReturnRequestItem,
  ReturnEvent,
  NewReturnRequest,
  NewReturnRequestItem,
  NewReturnEvent,
} from '../schema/returns.schema'

// —— Helpers ——

function mapReturnStatusToOrderReturnState(
  status: string,
): 'REQUESTED' | 'PENDING_REVIEW' | 'APPROVED' | 'REJECTED' | 'FULFILLED' {
  switch (status) {
    case 'SUBMITTED':
      return 'REQUESTED'
    case 'PENDING_REVIEW':
      return 'PENDING_REVIEW'
    case 'APPROVED':
      return 'APPROVED'
    case 'REJECTED':
      return 'REJECTED'
    case 'FULFILLED':
      return 'FULFILLED'
    default:
      return 'REQUESTED'
  }
}

function transitionErrorCode(toStatus: string): string {
  switch (toStatus) {
    case 'PENDING_REVIEW':
      return 'RETURN_NOT_SUBMITTED'
    case 'APPROVED':
    case 'REJECTED':
      return 'RETURN_NOT_PENDING'
    case 'FULFILLED':
      return 'RETURN_NOT_APPROVED'
    default:
      return 'RETURN_STATE_CONFLICT'
  }
}

// —— Eligibility ——

export async function getDeliveredAt({
  orderId,
}: {
  orderId: string
}): Promise<Date | null> {
  const result = await db.execute(sql`
    SELECT created_at
    FROM orders.order_events
    WHERE  order_id     = ${orderId}
      AND  event_type   = 'FULFILLMENT_UPDATED'
      AND  payload_json->>'to' = 'DELIVERED'
    ORDER  BY created_at DESC
    LIMIT  1
  `)
  const row = result.rows[0] as { created_at: Date | string } | undefined
  return row ? new Date(row.created_at) : null
}

export async function getAlreadyReturnedQty({
  orderItemId,
}: {
  orderItemId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(rri.qty), 0)::int AS already_returned
    FROM   returns.return_request_items rri
    JOIN   returns.return_requests rr ON rr.id = rri.return_request_id
    WHERE  rri.order_item_id = ${orderItemId}
      AND  rr.status IN ('APPROVED', 'FULFILLED')
  `)
  const row = result.rows[0] as { already_returned: number } | undefined
  return row?.already_returned ?? 0
}

// —— Return request read ——

export async function getReturnRequestById({
  id,
}: {
  id: string
}): Promise<ReturnRequest | null> {
  const rows = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.id, id))
  return rows[0] ?? null
}

export async function getReturnRequestWithItems({
  id,
}: {
  id: string
}): Promise<{ request: ReturnRequest; items: ReturnRequestItem[] } | null> {
  const request = await getReturnRequestById({ id })
  if (!request) return null

  const items = await db
    .select()
    .from(returnRequestItems)
    .where(eq(returnRequestItems.return_request_id, id))
    .orderBy(asc(returnRequestItems.created_at))

  return { request, items }
}

export async function getReturnRequestsForOrder({
  orderId,
}: {
  orderId: string
}): Promise<ReturnRequest[]> {
  const rows = await db
    .select()
    .from(returnRequests)
    .where(eq(returnRequests.order_id, orderId))
    .orderBy(desc(returnRequests.created_at))
  return rows
}

export async function getReturnEventsForRequest({
  returnRequestId,
}: {
  returnRequestId: string
}): Promise<ReturnEvent[]> {
  const rows = await db
    .select()
    .from(returnEvents)
    .where(eq(returnEvents.return_request_id, returnRequestId))
    .orderBy(asc(returnEvents.created_at))
  return rows
}

// —— Admin list ——

export interface ReturnRequestSummary extends ReturnRequest {
  order_ref: string
  user_id: string | null
  guest_email: string | null
  item_count: number
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
}

export interface ListReturnRequestsAdminResult {
  returns: ReturnRequestSummary[]
  page: number
  limit: number
  total: number
}

export async function listReturnRequestsAdmin({
  page = 1,
  limit = 50,
  status,
  type,
}: {
  page?: number
  limit?: number
  status?: string
  type?: string
}): Promise<ListReturnRequestsAdminResult> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const offset = (page - 1) * safeLimit

  const statusCondition = status == null ? sql`1 = 1` : sql`rr.status = ${status}`
  const typeCondition = type == null ? sql`1 = 1` : sql`rr.type = ${type}`

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM returns.return_requests rr
    JOIN orders.orders o ON o.id = rr.order_id
    WHERE ${statusCondition} AND ${typeCondition}
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT rr.id, rr.order_id, rr.type, rr.status, rr.reason,
           rr.policy_accepted_at, rr.policy_version, rr.eligible_until,
           rr.created_at, rr.updated_at,
           o.order_ref, o.user_id, o.guest_email,
           u.first_name AS user_first_name,
           u.last_name AS user_last_name,
           u.email AS user_email,
           (SELECT COUNT(*)::int
            FROM returns.return_request_items rri
            WHERE rri.return_request_id = rr.id) AS item_count
    FROM returns.return_requests rr
    JOIN orders.orders o ON o.id = rr.order_id
    LEFT JOIN iam.users u ON u.id = o.user_id AND u.deleted_at IS NULL
    WHERE ${statusCondition} AND ${typeCondition}
    ORDER BY rr.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const returns = (result.rows ?? []) as unknown as ReturnRequestSummary[]
  return { returns, page, limit: safeLimit, total }
}

// —— Create return request (transaction: request + items + order return_state + event) ——

export async function createReturnRequest({
  orderId,
  type,
  reason,
  policyAcceptedAt,
  policyVersion,
  eligibleUntil,
  items,
}: {
  orderId: string
  type: 'REFUND' | 'EXCHANGE'
  reason: string
  policyAcceptedAt: Date
  policyVersion: string
  eligibleUntil: Date
  items: Array<{
    orderItemId: string
    qty: number
    requestedVariantChangeJson?: Record<string, unknown> | null
  }>
}): Promise<ReturnRequest> {
  return await db.transaction(async (tx) => {
    const insertRequest = await tx
      .insert(returnRequests)
      .values({
        order_id: orderId,
        type,
        status: 'SUBMITTED',
        reason,
        policy_accepted_at: policyAcceptedAt,
        policy_version: policyVersion,
        eligible_until: eligibleUntil,
      } as NewReturnRequest)
      .returning()

    const request = insertRequest[0]
    if (!request) throw new Error('createReturnRequest: no row returned')

    try {
      await tx.insert(returnRequestItems).values(
        items.map(
          (i) =>
            ({
              return_request_id: request.id,
              order_item_id: i.orderItemId,
              qty: i.qty,
              requested_variant_change_json: i.requestedVariantChangeJson ?? null,
              request_status: 'SUBMITTED',
            }) as NewReturnRequestItem,
        ),
      )
    } catch (err: unknown) {
      const pgErr = err as { code?: string }
      if (pgErr?.code === '23505') {
        throw new OrderOperationError('RETURN_ALREADY_ACTIVE', 409)
      }
      throw err
    }

    const orderResult = await tx.execute(sql`
      UPDATE orders.orders
      SET return_state = 'REQUESTED',
          updated_at = now()
      WHERE id = ${orderId}
      RETURNING id
    `)
    if (orderResult.rows.length === 0) {
      throw new OrderOperationError('ORDER_NOT_FOUND', 404)
    }

    await tx.insert(returnEvents).values({
      return_request_id: request.id,
      event_type: 'RETURN_SUBMITTED',
      payload_json: { type, itemCount: items.length },
    } as NewReturnEvent)

    return request
  })
}

// —— Status transition (atomic: request + items + order + event) ——

export async function transitionReturnStatus({
  returnRequestId,
  orderId,
  fromStatus,
  toStatus,
  adminId,
  adminNote,
  eventType,
  extraPayload,
}: {
  returnRequestId: string
  orderId: string
  fromStatus: string
  toStatus: string
  adminId?: string | null
  adminNote?: string | null
  eventType: string
  extraPayload?: Record<string, unknown>
}): Promise<void> {
  await db.transaction(async (tx) => {
    const result = await tx.execute(sql`
      UPDATE returns.return_requests
      SET    status     = ${toStatus},
             updated_at = now()
      WHERE  id     = ${returnRequestId}
        AND  status = ${fromStatus}
      RETURNING id
    `)
    if (result.rows.length === 0) {
      throw new OrderOperationError(transitionErrorCode(toStatus), 409)
    }

    await tx.execute(sql`
      UPDATE returns.return_request_items
      SET    request_status = ${toStatus}
      WHERE  return_request_id = ${returnRequestId}
    `)

    const orderReturnState = mapReturnStatusToOrderReturnState(toStatus)
    await tx.execute(sql`
      UPDATE orders.orders
      SET return_state = ${orderReturnState},
          updated_at   = now()
      WHERE id = ${orderId}
    `)

    await tx.insert(returnEvents).values({
      return_request_id: returnRequestId,
      event_type: eventType,
      payload_json: extraPayload ?? {},
      admin_id: adminId ?? null,
      admin_note: adminNote ?? null,
    } as NewReturnEvent)
  })
}
