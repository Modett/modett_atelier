'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CurrencyCode } from '@/types'
import type {
  AdminOrdersResponse,
  FulfillmentState,
  OrderDetailResponse,
  OrderItemDetail,
  OrderState,
  PackingStatus,
  PaymentState,
  ReturnState,
  ScanResult,
} from '@/types/admin'

// Query keys
export const ADMIN_ORDERS_KEYS = {
  all: ['admin', 'orders'] as const,
  list: (filters: OrderFilters) =>
    [...ADMIN_ORDERS_KEYS.all, 'list', filters] as const,
  detail: (orderId: string) =>
    [...ADMIN_ORDERS_KEYS.all, 'detail', orderId] as const,
  packing: (orderId: string) =>
    [...ADMIN_ORDERS_KEYS.all, 'packing', orderId] as const,
} as const

export interface OrderFilters {
  page?: number
  limit?: number
  orderState?: OrderState
  paymentState?: PaymentState
  fulfillmentState?: FulfillmentState
  search?: string
}

interface OrderSummaryApiRow {
  id: string
  order_ref: string
  user_id: string | null
  guest_email: string | null
  order_state: string
  payment_state: string
  fulfillment_state: string
  currency: string
  total: string
  placed_at: string | null
  created_at: string
  item_count: string
}

function mapOrderSummaryRow(row: OrderSummaryApiRow): AdminOrdersResponse['orders'][number] {
  const email = row.guest_email?.trim() || '—'
  const name =
    row.user_id != null
      ? 'Registered customer'
      : email !== '—'
        ? (email.split('@')[0] ?? 'Guest')
        : 'Guest'
  return {
    id: row.id,
    orderRef: row.order_ref,
    orderState: row.order_state as OrderState,
    paymentState: row.payment_state as PaymentState,
    fulfillmentState: row.fulfillment_state as FulfillmentState,
    customerEmail: email,
    customerName: name,
    totalAmount: row.total,
    currency: row.currency as CurrencyCode,
    itemCount: Number(row.item_count) || 0,
    createdAt: row.placed_at ?? row.created_at,
    updatedAt: row.created_at,
  }
}

function normalizeProductSnapshot(raw: unknown): OrderItemDetail['productSnapshot'] {
  const o = (raw as Record<string, unknown>) ?? {}
  const pickStr = (a: string, b?: string) => {
    const v = o[a] ?? (b != null ? o[b] : undefined)
    return v != null && String(v).trim() !== '' ? String(v) : ''
  }
  const displayName =
    pickStr('displayName', 'display_name') ||
    pickStr('shortName', 'short_name') ||
    'Product'
  return {
    displayName,
    shortName: pickStr('shortName', 'short_name') || displayName,
    color: pickStr('color'),
    size: pickStr('size'),
    productCode: pickStr('productCode', 'product_code'),
    imageUrl:
      (typeof o.imageUrl === 'string' && o.imageUrl) ||
      (typeof o.image_url === 'string' ? o.image_url : undefined),
  }
}

// Transform snake_case API response to camelCase
function transformOrderDetail(data: Record<string, unknown>): OrderDetailResponse {
  const raw = data as {
    order: Record<string, unknown>
    items: Record<string, unknown>[]
    addresses: Record<string, unknown>[]
    contact: Record<string, unknown> | null
    events: Record<string, unknown>[]
    allocations: Record<string, unknown>[]
  }

  return {
    order: {
      id: raw.order.id as string,
      orderRef: raw.order.order_ref as string,
      userId: raw.order.user_id as string | null,
      guestEmail: raw.order.guest_email as string | null,
      orderState: raw.order.order_state as OrderState,
      paymentState: raw.order.payment_state as PaymentState,
      fulfillmentState: raw.order.fulfillment_state as FulfillmentState,
      returnState: raw.order.return_state as ReturnState,
      currency: raw.order.currency as CurrencyCode,
      countryCode: raw.order.country_code as string,
      subtotal: String(raw.order.subtotal ?? '0'),
      discountAmount: String(raw.order.discount_amount ?? '0'),
      shippingCost: String(raw.order.shipping_cost ?? '0'),
      taxAmount: String(raw.order.tax_amount ?? '0'),
      total: String(raw.order.total ?? '0'),
      shippingMethodSnapshot: raw.order.shipping_method_snapshot as string | null,
      isGift: Boolean(raw.order.is_gift),
      placedAt: raw.order.placed_at as string | null,
      createdAt: raw.order.created_at as string,
      updatedAt: raw.order.updated_at as string,
    },
    items: raw.items.map((item) => ({
      id: item.id as string,
      variantId: item.variant_id as string | null,
      qty: item.qty as number,
      unitPriceAmount: String(item.unit_price_snapshot_amount ?? '0'),
      unitPriceCurrency: item.unit_price_snapshot_currency as CurrencyCode,
      taxAmount: String(item.tax_amount ?? '0'),
      productSnapshot: normalizeProductSnapshot(item.product_snapshot_json),
    })),
    addresses: raw.addresses.map((addr) => ({
      id: addr.id as string,
      kind: addr.kind as 'SHIPPING' | 'BILLING',
      addressJson: addr.address_json as OrderDetailResponse['addresses'][number]['addressJson'],
      countryCode: addr.country_code as string,
    })),
    contact: raw.contact
      ? {
          primaryPhone: String(raw.contact.primary_phone ?? ''),
          extraPhones: Array.isArray(raw.contact.extra_phones_json)
            ? (raw.contact.extra_phones_json as string[])
            : [],
          giftReceiver: raw.contact.gift_receiver_json as
            | { name: string; phone: string; message?: string }
            | undefined,
        }
      : null,
    events: raw.events.map((evt) => ({
      id: evt.id as string,
      eventType: evt.event_type as string,
      payloadJson: (evt.payload_json as Record<string, unknown>) ?? {},
      createdByAdminId: evt.created_by_admin_id as string | null,
      adminNote: evt.admin_note as string | null,
      createdAt: evt.created_at as string,
    })),
    allocations: raw.allocations.map((alloc) => ({
      id: alloc.id as string,
      orderItemId: alloc.order_item_id as string,
      inventoryUnitId: alloc.inventory_unit_id as string,
      scannedByAdminId: alloc.scanned_by_admin_id as string | null,
      scannedByName: String(alloc.scanned_by_name_snapshot ?? ''),
      scannedAt: alloc.scanned_at as string,
      variantId: alloc.variant_id as string | null,
      itemQty: Number(alloc.item_qty ?? 0),
      unitSku: String(alloc.unit_sku ?? ''),
      barcodeValue: String(alloc.barcode_value ?? ''),
      unitStatus: String(alloc.unit_status ?? ''),
    })),
  }
}

function transformScanResult(raw: Record<string, unknown>): ScanResult {
  const unit = raw.unit as Record<string, unknown>
  const variant = raw.variant as Record<string, unknown>
  const orderItem = raw.orderItem as Record<string, unknown>
  const allocation = raw.allocation as Record<string, unknown>
  return {
    unit: {
      id: String(unit.id),
      variantId: String(unit.variant_id),
      status: String(unit.status),
      barcodeValue: String(unit.barcode_value),
      sku: String(unit.unit_sku),
    },
    variant: {
      id: String(variant.id),
      color: String(variant.color ?? ''),
      size: String(variant.size ?? ''),
      productId: String(variant.product_id),
    },
    orderItem: {
      id: String(orderItem.id),
      orderId: String(orderItem.order_id),
      variantId: String(orderItem.variant_id ?? ''),
      qty: Number(orderItem.qty ?? 0),
    },
    allocation: {
      id: String(allocation.id),
      orderItemId: String(allocation.order_item_id),
      inventoryUnitId: String(allocation.inventory_unit_id),
      scannedAt: String(allocation.scanned_at ?? ''),
    },
  }
}

// List orders with filters
export function useAdminOrders(filters: OrderFilters = {}) {
  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.list(filters),
    queryFn: async () => {
      const params: Record<string, string> = {}
      if (filters.page != null && filters.page > 0) {
        params.page = String(filters.page)
      }
      if (filters.limit != null && filters.limit > 0) {
        params.limit = String(filters.limit)
      }
      if (filters.orderState) params.orderState = filters.orderState
      if (filters.paymentState) params.paymentState = filters.paymentState
      if (filters.fulfillmentState) {
        params.fulfillmentState = filters.fulfillmentState
      }
      if (filters.search?.trim()) params.search = filters.search.trim()

      const res = await api.get<{
        data: {
          orders: OrderSummaryApiRow[]
          page: number
          limit: number
          total: number
        }
      }>('/admin/orders', { params })
      const { page, limit, total, orders: raw } = res.data
      return {
        orders: raw.map(mapOrderSummaryRow),
        page,
        limit,
        total,
      } satisfies AdminOrdersResponse
    },
    staleTime: 30 * 1000,
  })
}

// Get single order detail
export function useAdminOrderDetail(orderId: string | null) {
  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.detail(orderId ?? '__none__'),
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID')
      const res = await api.get<{ data: Record<string, unknown> }>(
        `/admin/orders/${orderId}`,
      )
      return transformOrderDetail(res.data)
    },
    enabled: Boolean(orderId),
    staleTime: 10 * 1000,
  })
}

// Get packing status
export function useOrderPackingStatus(orderId: string | null) {
  return useQuery({
    queryKey: ADMIN_ORDERS_KEYS.packing(orderId ?? '__none__'),
    queryFn: async () => {
      if (!orderId) throw new Error('No order ID')
      const res = await api.get<{ data: PackingStatus }>(
        `/admin/orders/${orderId}/packing-status`,
      )
      return res.data
    },
    enabled: Boolean(orderId),
    staleTime: 5 * 1000,
    refetchInterval: 10 * 1000,
  })
}

export function useMarkOrderPacked() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      await api.post(`/admin/orders/${orderId}/pack`, { note })
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.packing(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.all })
    },
  })
}

export function useMarkOrderShipped() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      trackingNumber,
      carrier,
      note,
    }: {
      orderId: string
      trackingNumber?: string
      carrier?: string
      note?: string
    }) => {
      await api.post(`/admin/orders/${orderId}/ship`, {
        trackingNumber,
        carrier,
        note,
      })
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.all })
    },
  })
}

export function useMarkOrderOutForDelivery() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      await api.post(`/admin/orders/${orderId}/out-for-delivery`, { note })
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.all })
    },
  })
}

export function useMarkOrderDelivered() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, note }: { orderId: string; note?: string }) => {
      await api.post(`/admin/orders/${orderId}/deliver`, { note })
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.all })
    },
  })
}

export function useCancelOrder() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ orderId, reason }: { orderId: string; reason: string }) => {
      await api.post(`/admin/orders/${orderId}/cancel`, { reason })
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.all })
    },
  })
}

export function useUpdateOrderAddress() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      kind,
      addressJson,
      countryCode,
    }: {
      orderId: string
      kind: 'SHIPPING' | 'BILLING'
      addressJson: Record<string, string | undefined>
      countryCode: string
    }) => {
      await api.patch(`/admin/orders/${orderId}/shipping-address`, {
        kind,
        addressJson,
        countryCode,
      })
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
    },
  })
}

export function useScanUnit() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      barcodeValue,
      orderItemId,
      orderId: _orderId,
    }: {
      barcodeValue: string
      orderItemId: string
      orderId: string
    }) => {
      const res = await api.post<{ data: Record<string, unknown> }>(
        '/admin/orders/scan',
        { barcodeValue, orderItemId },
      )
      return transformScanResult(res.data)
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.packing(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
    },
  })
}

export function useRemoveAllocation() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      orderId,
      inventoryUnitId,
    }: {
      orderId: string
      inventoryUnitId: string
    }) => {
      await api.delete(`/admin/orders/${orderId}/allocations/${inventoryUnitId}`)
    },
    onSuccess: (_, { orderId }) => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.packing(orderId) })
      void queryClient.invalidateQueries({ queryKey: ADMIN_ORDERS_KEYS.detail(orderId) })
    },
  })
}
