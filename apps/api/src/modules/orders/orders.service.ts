/**
 * Orders service — customer order history/detail, admin list/detail,
 * fulfillment transitions, cancel, shipping/address updates, scan-to-pack.
 * RORO. Throws AppError. OrderOperationError from db bubbles (has code + statusCode).
 */

import { AppError } from '../../lib/errors'
import {
  listOrdersForUser,
  listOrdersAdmin,
  getOrderWithFullDetail,
  getOrderItemById,
  getOrderItems,
  getOrderAllocations,
  transitionFulfillmentState,
  cancelOrder as cancelOrderQuery,
  updateShippingInfo,
  updateOrderAddress,
  allocateUnitToOrderItem,
  deallocateUnit,
  getInventoryUnitByBarcode,
  getProductVariantById,
  getOrderById,
} from '@modett/db'
import type { OrderItem, OrderEvent } from '@modett/db'
import { generateTokensAfterDelivery } from '../reviews'
import {
  notifyOrderShipped,
  notifyOrderDelivered,
  notifyOrderCancelled,
} from '../messaging'

// —— Customer-facing ——

export async function getMyOrders({
  userId,
  page = 1,
  limit = 20,
}: {
  userId: string
  page?: number
  limit?: number
}) {
  const { rows, meta } = await listOrdersForUser({ userId, page, limit })
  return { orders: rows, page: meta.page, limit: meta.limit, total: meta.total }
}

export async function getMyOrderDetail({
  orderId,
  userId,
}: {
  orderId: string
  userId: string
}) {
  const full = await getOrderWithFullDetail({ id: orderId })
  if (!full?.order || full.order.user_id !== userId) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }
  const eventsSanitised: (OrderEvent & { admin_note: string | null })[] = full.events.map(
    (e) => ({ ...e, admin_note: null }),
  )
  const allocationsSanitised = full.allocations.map((a) => {
    const { scanned_by_admin_id: _adminId, ...rest } = a
    return rest
  })
  return {
    order: full.order,
    items: full.items,
    addresses: full.addresses,
    contact: full.contact,
    events: eventsSanitised,
    allocations: allocationsSanitised,
  }
}

// —— Admin read ——

export async function adminListOrders({
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
}) {
  const { rows, meta } = await listOrdersAdmin({
    page,
    limit,
    orderState,
    paymentState,
    fulfillmentState,
    search,
  })
  return { orders: rows, page: meta.page, limit: meta.limit, total: meta.total }
}

export async function adminGetOrderDetail({ orderId }: { orderId: string }) {
  const full = await getOrderWithFullDetail({ id: orderId })
  if (!full) throw new AppError('ORDER_NOT_FOUND', 404)
  return {
    order: full.order,
    items: full.items,
    addresses: full.addresses,
    contact: full.contact,
    events: full.events,
    allocations: full.allocations,
  }
}

// —— Fulfillment ——

export async function markOrderPacked({
  orderId,
  adminId,
  note,
}: {
  orderId: string
  adminId: string
  note?: string | null
}) {
  const order = await getOrderById({ id: orderId })
  if (!order) throw new AppError('ORDER_NOT_FOUND', 404)
  if (order.payment_state !== 'PAID') {
    throw new AppError('ORDER_NOT_PAID', 409)
  }
  await transitionFulfillmentState({
    orderId,
    fromState: 'NOT_STARTED',
    toState: 'PACKED',
    adminId,
    note,
  })
}

export async function markOrderShipped({
  orderId,
  adminId,
  trackingNumber,
  carrier,
  note,
}: {
  orderId: string
  adminId: string
  trackingNumber?: string | null
  carrier?: string | null
  note?: string | null
}) {
  await transitionFulfillmentState({
    orderId,
    fromState: 'PACKED',
    toState: 'SHIPPED',
    adminId,
    note,
    extraPayload: { trackingNumber, carrier },
  })
  if (trackingNumber != null || carrier != null) {
    await updateShippingInfo({
      orderId,
      trackingNumber: trackingNumber ?? undefined,
      carrier: carrier ?? undefined,
      adminId,
      note,
    })
  }
  const order = await getOrderById({ id: orderId })
  if (order?.user_id) {
    await notifyOrderShipped({
      userId: order.user_id,
      orderId,
      orderRef: order.order_ref,
      trackingNumber: trackingNumber ?? undefined,
      carrier: carrier ?? undefined,
    }).catch(() => {})
  }
}

export async function markOrderOutForDelivery({
  orderId,
  adminId,
  note,
}: {
  orderId: string
  adminId: string
  note?: string | null
}) {
  await transitionFulfillmentState({
    orderId,
    fromState: 'SHIPPED',
    toState: 'OUT_FOR_DELIVERY',
    adminId,
    note,
  })
}

export async function markOrderDelivered({
  orderId,
  adminId,
  note,
}: {
  orderId: string
  adminId: string
  note?: string | null
}) {
  await transitionFulfillmentState({
    orderId,
    fromState: 'OUT_FOR_DELIVERY',
    toState: 'DELIVERED',
    adminId,
    note,
  })
  await generateTokensAfterDelivery({ orderId }).catch((err) =>
    console.error('[orders] review token gen failed:', err),
  )
  const order = await getOrderById({ id: orderId })
  if (order?.user_id) {
    await notifyOrderDelivered({
      userId: order.user_id,
      orderId,
      orderRef: order.order_ref,
    }).catch(() => {})
  }
}

export async function cancelOrder({
  orderId,
  adminId,
  reason,
}: {
  orderId: string
  adminId: string
  reason: string
}) {
  await cancelOrderQuery({ orderId, adminId, reason })
  const order = await getOrderById({ id: orderId })
  if (order?.user_id) {
    await notifyOrderCancelled({
      userId: order.user_id,
      orderId,
      orderRef: order.order_ref,
      reason,
    }).catch(() => {})
  }
}

export async function updateShippingAddress({
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
}) {
  await updateOrderAddress({
    orderId,
    kind,
    addressJson,
    countryCode,
    adminId,
  })
}

// —— Scan-to-pack ——

export async function scanUnit({
  barcodeValue,
  orderItemId,
  adminId,
  adminFullName,
}: {
  barcodeValue: string
  orderItemId: string
  adminId: string
  adminFullName: string
}) {
  const unit = await getInventoryUnitByBarcode({ barcodeValue })
  if (!unit) throw new AppError('BARCODE_NOT_FOUND', 404)
  const variant = await getProductVariantById({ variantId: unit.variant_id })
  if (!variant) throw new AppError('VARIANT_NOT_FOUND', 404)

  if (unit.status !== 'IN_STOCK') {
    throw new AppError('UNIT_NOT_IN_STOCK', 422)
  }

  const item = await getOrderItemById({ orderItemId })
  if (!item) throw new AppError('ORDER_ITEM_NOT_FOUND', 404)

  if (unit.variant_id !== item.variant_id) {
    throw new AppError('UNIT_VARIANT_MISMATCH', 422)
  }

  const allocations = await getOrderAllocations({ orderId: item.order_id })
  const itemAllocations = allocations.filter((a) => a.order_item_id === orderItemId)
  if (itemAllocations.length >= item.qty) {
    throw new AppError('ORDER_ITEM_FULLY_ALLOCATED', 409)
  }

  const allocation = await allocateUnitToOrderItem({
    orderItemId,
    inventoryUnitId: unit.id,
    scannedByAdminId: adminId,
    scannedByNameSnapshot: adminFullName,
  })

  return {
    unit,
    variant,
    orderItem: item,
    allocation,
  }
}

export async function removeUnitAllocation({
  inventoryUnitId,
  adminId,
  orderId,
}: {
  inventoryUnitId: string
  adminId: string
  orderId: string
}) {
  await deallocateUnit({ inventoryUnitId, adminId, orderId })
}

export async function getOrderPackingStatus({ orderId }: { orderId: string }) {
  const [allocations, items] = await Promise.all([
    getOrderAllocations({ orderId }),
    getOrderItems({ orderId }),
  ])

  const itemStatuses = items.map((item) => {
    const itemAllocs = allocations.filter((a) => a.order_item_id === item.id)
    const required = item.qty
    const allocated = itemAllocs.length
    const isComplete = allocated >= required
    const snap = (item.product_snapshot_json as Record<string, unknown>) ?? {}
    const productName =
      (snap.displayName as string) ?? (snap.short_name as string) ?? ''
    const color = (snap.color as string) ?? ''
    const size = (snap.size as string) ?? ''
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
    }
  })

  const isFullyPacked = itemStatuses.every((s) => s.isComplete)

  return {
    orderId,
    isFullyPacked,
    items: itemStatuses,
  }
}
