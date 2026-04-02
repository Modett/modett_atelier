/**
 * Returns service — eligibility check, customer submit/list/detail,
 * admin list/detail and status transitions. RORO. Throws AppError.
 */

import { AppError } from '../../lib/errors'
import {
  getOrderById,
  getOrderItems,
  getDeliveredAt,
  getAlreadyReturnedQty,
  getReturnRequestWithItems,
  getReturnRequestsForOrder,
  getReturnEventsForRequest,
  listReturnRequestsAdmin,
  createReturnRequest,
  transitionReturnStatus,
  getUserById,
} from '@modett/db'

function productSnapshotFromOrderItem(productSnapshotJson: unknown): {
  productName: string
  colour: string
  size: string
  imageUrl: string | null
} {
  const snap = (productSnapshotJson as Record<string, unknown>) ?? {}
  const pickStr = (a: string, b?: string) => {
    const v = snap[a] ?? (b != null ? snap[b] : undefined)
    return v != null && String(v).trim() !== '' ? String(v) : ''
  }
  const productName =
    pickStr('displayName', 'display_name') ||
    pickStr('shortName', 'short_name') ||
    'Product'
  const imageRaw =
    (typeof snap.imageUrl === 'string' && snap.imageUrl) ||
    (typeof snap.image_url === 'string' ? snap.image_url : '')
  const imageUrl = imageRaw.trim() !== '' ? imageRaw : null
  return {
    productName,
    colour: pickStr('color') || pickStr('colour'),
    size: pickStr('size'),
    imageUrl,
  }
}

// —— Eligibility (no writes) ——

export async function checkReturnEligibility({
  orderId,
  requestedItems,
}: {
  orderId: string
  requestedItems: Array<{ orderItemId: string; qty: number }>
}): Promise<{ eligibleUntil: Date; deliveredAt: Date }> {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)

  if (order.order_state !== 'PLACED') {
    throw new AppError('ORDER_NOT_PLACED', 422)
  }
  if (order.payment_state !== 'PAID') {
    throw new AppError('ORDER_NOT_PAID', 422)
  }
  const fulfillmentState = (order as { fulfillment_state: string })
    .fulfillment_state
  if (fulfillmentState !== 'DELIVERED') {
    throw new AppError('ORDER_NOT_DELIVERED', 422)
  }

  const deliveredAt = await getDeliveredAt({ orderId })
  if (!deliveredAt) throw new AppError('DELIVERY_EVENT_NOT_FOUND', 422)

  const eligibleUntil = new Date(
    deliveredAt.getTime() + 14 * 24 * 60 * 60 * 1000,
  )
  if (new Date() > eligibleUntil) {
    throw new AppError(
      'RETURN_WINDOW_EXPIRED',
      422,
      `Return window expired at ${eligibleUntil.toISOString()}`,
    )
  }

  const orderItems = await getOrderItems({ orderId })

  for (const requestedItem of requestedItems) {
    const orderItem = orderItems.find((i) => i.id === requestedItem.orderItemId)
    if (!orderItem) {
      throw new AppError(
        'ORDER_ITEM_NOT_FOUND',
        404,
        `Order item ${requestedItem.orderItemId} not found`,
      )
    }
    if (requestedItem.qty <= 0) {
      throw new AppError('INVALID_QTY', 400)
    }
    if (requestedItem.qty > orderItem.qty) {
      throw new AppError(
        'RETURN_QTY_EXCEEDS_ORDER',
        422,
        `Requested ${requestedItem.qty} exceeds order qty ${orderItem.qty}`,
      )
    }

    const alreadyReturned = await getAlreadyReturnedQty({
      orderItemId: requestedItem.orderItemId,
    })
    const available = orderItem.qty - alreadyReturned
    if (requestedItem.qty > available) {
      throw new AppError(
        'INSUFFICIENT_RETURNABLE_QTY',
        422,
        `Available: ${available}, requested: ${requestedItem.qty}`,
      )
    }
  }

  return { eligibleUntil, deliveredAt }
}

// —— Customer ——

export async function createReturn({
  orderId,
  userId,
  type,
  reason,
  policyVersion,
  items,
}: {
  orderId: string
  userId: string
  type: 'REFUND' | 'EXCHANGE'
  reason: string
  policyVersion: string
  items: Array<{
    orderItemId: string
    qty: number
    requestedVariantChangeJson?: Record<string, unknown>
  }>
}) {
  const order = await getOrderById({ id: orderId })
  if (!order || order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }

  if (type === 'EXCHANGE') {
    for (const item of items) {
      if (item.requestedVariantChangeJson == null) {
        throw new AppError(
          'EXCHANGE_VARIANT_REQUIRED',
          400,
          `Exchange requires requestedVariantChangeJson for order item ${item.orderItemId}`,
        )
      }
    }
  }

  const { eligibleUntil } = await checkReturnEligibility({
    orderId,
    requestedItems: items.map((i) => ({ orderItemId: i.orderItemId, qty: i.qty })),
  })

  const request = await createReturnRequest({
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
  })

  const { items: requestItems } = (await getReturnRequestWithItems({
    id: request.id,
  })) ?? { items: [] }
  return { returnRequest: request, items: requestItems }
}

export async function getMyReturnRequests({
  orderId,
  userId,
}: {
  orderId: string
  userId: string
}) {
  const order = await getOrderById({ id: orderId })
  if (!order || order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }
  const returns = await getReturnRequestsForOrder({ orderId })
  return { returns }
}

export async function getMyReturnDetail({
  returnRequestId,
  userId,
}: {
  returnRequestId: string
  userId: string
}) {
  const data = await getReturnRequestWithItems({ id: returnRequestId })
  if (!data) throw new AppError('RETURN_NOT_FOUND', 404)

  const order = await getOrderById({ id: data.request.order_id })
  if (!order || order.user_id !== userId) {
    throw new AppError('RETURN_NOT_FOUND', 404)
  }

  const events = await getReturnEventsForRequest({ returnRequestId })
  const eventsForCustomer = events.map((e) => ({ ...e, admin_note: null }))

  return {
    request: data.request,
    items: data.items,
    events: eventsForCustomer,
  }
}

// —— Admin ——

export async function adminListReturns({
  page = 1,
  limit = 50,
  status,
  type,
}: {
  page?: number
  limit?: number
  status?: string
  type?: string
}) {
  const result = await listReturnRequestsAdmin({ page, limit, status, type })
  return {
    returns: result.returns,
    page: result.page,
    limit: result.limit,
    total: result.total,
  }
}

export async function adminGetReturnDetail({
  returnRequestId,
}: {
  returnRequestId: string
}) {
  const data = await getReturnRequestWithItems({ id: returnRequestId })
  if (!data) throw new AppError('RETURN_NOT_FOUND', 404)

  const order = await getOrderById({ id: data.request.order_id })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)

  const [orderItemsList, events] = await Promise.all([
    getOrderItems({ orderId: data.request.order_id }),
    getReturnEventsForRequest({ returnRequestId }),
  ])

  const user =
    order.user_id != null
      ? await getUserById({ id: order.user_id })
      : null

  const customerEmail =
    user?.email?.trim() ||
    (order.guest_email != null ? String(order.guest_email).trim() : '') ||
    '—'
  const customerName = user
    ? `${user.firstName} ${user.lastName}`.trim()
    : customerEmail !== '—'
      ? (customerEmail.split('@')[0] ?? 'Guest')
      : 'Guest'

  const items = data.items.map((ri) => {
    const oi = orderItemsList.find((x) => x.id === ri.order_item_id)
    const snap = productSnapshotFromOrderItem(oi?.product_snapshot_json ?? {})
    return {
      ...ri,
      product_name: snap.productName,
      colour: snap.colour,
      size: snap.size,
      image_url: snap.imageUrl,
      unit_price: oi ? String(oi.unit_price_snapshot_amount) : '0',
      currency: oi?.unit_price_snapshot_currency ?? order.currency,
      customer_reason_text: data.request.reason,
    }
  })

  return {
    request: {
      ...data.request,
      order_ref: order.order_ref,
      user_id: order.user_id,
      customer_name: customerName,
      customer_email: customerEmail,
    },
    items,
    events,
  }
}

export async function adminOpenForReview({
  returnRequestId,
  adminId,
}: {
  returnRequestId: string
  adminId: string
}) {
  const data = await getReturnRequestWithItems({ id: returnRequestId })
  if (!data) throw new AppError('RETURN_NOT_FOUND', 404)

  await transitionReturnStatus({
    returnRequestId,
    orderId: data.request.order_id,
    fromStatus: 'SUBMITTED',
    toStatus: 'PENDING_REVIEW',
    adminId,
    eventType: 'RETURN_OPENED',
  })
}

export async function adminApprove({
  returnRequestId,
  adminId,
  adminNote,
}: {
  returnRequestId: string
  adminId: string
  adminNote?: string
}) {
  const data = await getReturnRequestWithItems({ id: returnRequestId })
  if (!data) throw new AppError('RETURN_NOT_FOUND', 404)

  await transitionReturnStatus({
    returnRequestId,
    orderId: data.request.order_id,
    fromStatus: 'PENDING_REVIEW',
    toStatus: 'APPROVED',
    adminId,
    adminNote: adminNote ?? null,
    eventType: 'RETURN_APPROVED',
  })
}

export async function adminReject({
  returnRequestId,
  adminId,
  reason,
  adminNote,
}: {
  returnRequestId: string
  adminId: string
  reason: string
  adminNote?: string
}) {
  const data = await getReturnRequestWithItems({ id: returnRequestId })
  if (!data) throw new AppError('RETURN_NOT_FOUND', 404)

  await transitionReturnStatus({
    returnRequestId,
    orderId: data.request.order_id,
    fromStatus: 'PENDING_REVIEW',
    toStatus: 'REJECTED',
    adminId,
    adminNote: adminNote ?? null,
    eventType: 'RETURN_REJECTED',
    extraPayload: { reason },
  })
}

export async function adminFulfil({
  returnRequestId,
  adminId,
  adminNote,
}: {
  returnRequestId: string
  adminId: string
  adminNote?: string
}) {
  const data = await getReturnRequestWithItems({ id: returnRequestId })
  if (!data) throw new AppError('RETURN_NOT_FOUND', 404)

  await transitionReturnStatus({
    returnRequestId,
    orderId: data.request.order_id,
    fromStatus: 'APPROVED',
    toStatus: 'FULFILLED',
    adminId,
    adminNote: adminNote ?? null,
    eventType: 'RETURN_FULFILLED',
  })
}
