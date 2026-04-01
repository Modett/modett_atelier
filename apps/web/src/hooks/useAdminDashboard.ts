'use client'

import { useQuery } from '@tanstack/react-query'
import type { AdminReviewsListResponse } from '@modett/types'
import { api } from '@/lib/api'
import type { CurrencyCode } from '@/types'
import type {
  AdminOrderSummary,
  AdminOrdersResponse,
  AdminReturnSummary,
  FlaggedReview,
  FlaggedReviewsResponse,
  FulfillmentState,
  LowStockVariant,
  NotifyMeDemandItem,
  OrderState,
  PaymentState,
  ReturnStatus,
  ReturnType,
  StockStatus,
} from '@/types/admin'

// Query keys
export const ADMIN_DASHBOARD_KEYS = {
  recentOrders:     ['admin', 'dashboard', 'recent-orders'] as const,
  pendingReturns:   ['admin', 'dashboard', 'pending-returns'] as const,
  lowStock:         ['admin', 'dashboard', 'low-stock'] as const,
  notifyMeDemand:   ['admin', 'dashboard', 'notify-me-demand'] as const,
  flaggedReviews:   ['admin', 'dashboard', 'flagged-reviews'] as const,
  reconciliation:   ['admin', 'dashboard', 'reconciliation-unresolved'] as const,
} as const

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

function mapOrderRow(row: OrderSummaryApiRow): AdminOrderSummary {
  const email = row.guest_email?.trim() || '—'
  const name =
    row.user_id != null
      ? 'Registered customer'
      : email !== '—'
        ? email.split('@')[0] ?? 'Guest'
        : 'Guest'
  return {
    id:                 row.id,
    orderRef:           row.order_ref,
    orderState:         row.order_state as OrderState,
    paymentState:       row.payment_state as PaymentState,
    fulfillmentState: row.fulfillment_state as FulfillmentState,
    customerEmail:      email,
    customerName:       name,
    totalAmount:        row.total,
    currency:           row.currency as CurrencyCode,
    itemCount:          Number(row.item_count) || 0,
    createdAt:          row.placed_at ?? row.created_at,
    updatedAt:          row.created_at,
  }
}

interface ReturnSummaryApiRow {
  id: string
  order_ref: string
  type: ReturnType
  status: ReturnStatus
  reason: string
  created_at: string
  user_id: string | null
  guest_email: string | null
}

function mapReturnRow(row: ReturnSummaryApiRow): AdminReturnSummary {
  const email = row.guest_email?.trim() || '—'
  const name =
    row.user_id != null
      ? 'Registered customer'
      : email !== '—'
        ? email.split('@')[0] ?? 'Guest'
        : 'Guest'
  return {
    id:             row.id,
    orderRef:       row.order_ref,
    status:         row.status,
    type:           row.type,
    reason:         row.reason,
    customerEmail:  email,
    customerName:   name,
    itemCount:      0,
    createdAt:      row.created_at,
  }
}

interface NotifyMeDemandApiRow {
  variantId: string
  clickCount: number
  registeredUserCount: number
  lastClickAt: string
}

function toIso(d: string | Date | undefined): string {
  if (d == null) return new Date().toISOString()
  if (d instanceof Date) return d.toISOString()
  return d
}

export function useRecentOrders() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.recentOrders,
    queryFn: async () => {
      const res = await api.get<{
        data: {
          orders: OrderSummaryApiRow[]
          page: number
          limit: number
          total: number
        }
      }>('/admin/orders', { params: { page: '1', limit: '5' } })
      const { page, limit, total, orders: raw } = res.data
      return {
        orders: raw.map(mapOrderRow),
        page,
        limit,
        total,
      } satisfies AdminOrdersResponse
    },
    staleTime:     30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

export function usePendingReturns() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.pendingReturns,
    queryFn: async () => {
      const [submitted, pendingReview] = await Promise.all([
        api.get<{
          data: {
            returns: ReturnSummaryApiRow[]
            page: number
            limit: number
            total: number
          }
        }>('/admin/returns', { params: { status: 'SUBMITTED', limit: '50', page: '1' } }),
        api.get<{
          data: {
            returns: ReturnSummaryApiRow[]
            page: number
            limit: number
            total: number
          }
        }>('/admin/returns', {
          params: { status: 'PENDING_REVIEW', limit: '50', page: '1' },
        }),
      ])
      return {
        returns: [
          ...submitted.data.returns.map(mapReturnRow),
          ...pendingReview.data.returns.map(mapReturnRow),
        ],
        totalSubmitted:     submitted.data.total,
        totalPendingReview: pendingReview.data.total,
      }
    },
    staleTime:     30 * 1000,
    refetchInterval: 60 * 1000,
  })
}

interface StorefrontProductDetail {
  id: string
  slug: string
  displayName: string
  variants: Array<{
    variantId: string
    color: string
    size: string
    availableQty: number
    lowStockThreshold: number
    stockStatus: StockStatus
  }>
}

export function useLowStockVariants() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.lowStock,
    queryFn: async () => {
      const listRes = await api.get<{
        data: { products: Array<{ id: string; slug: string; displayName: string }> }
      }>('/admin/catalog/products', {
        params: { page: '1', limit: '20', includeInactive: 'false' },
      })

      const detailResults = await Promise.all(
        listRes.data.products.map(async (p) => {
          try {
            const r = await api.get<{ data: { product: StorefrontProductDetail } }>(
              `/catalog/products/${encodeURIComponent(p.slug)}`,
              { params: { currency: 'LKR' } },
            )
            return r.data.product
          } catch {
            return null
          }
        }),
      )

      const lowStockItems: LowStockVariant[] = []
      const outOfStockItems: LowStockVariant[] = []

      for (const product of detailResults) {
        if (!product) continue
        for (const variant of product.variants) {
          const row: LowStockVariant = {
            variantId:         variant.variantId,
            productId:         product.id,
            productName:       product.displayName,
            color:             variant.color,
            size:              variant.size,
            sku:               product.slug,
            inStockQty:        variant.availableQty,
            heldQty:           0,
            availableQty:      variant.availableQty,
            lowStockThreshold: variant.lowStockThreshold,
            stockStatus:       variant.stockStatus,
          }
          if (variant.stockStatus === 'LOW_STOCK') lowStockItems.push(row)
          if (variant.stockStatus === 'OUT_OF_STOCK') outOfStockItems.push(row)
        }
      }

      return { lowStockItems, outOfStockItems }
    },
    staleTime:     60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}

export function useNotifyMeDemand() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.notifyMeDemand,
    queryFn: async () => {
      const res = await api.get<{ data: { demand: NotifyMeDemandApiRow[] } }>(
        '/admin/notifications/notify-me-demand',
        { params: { limit: '20' } },
      )
      const demand = res.data.demand ?? []
      const items: NotifyMeDemandItem[] = await Promise.all(
        demand.map(async (d) => {
          const requestCount = d.clickCount + d.registeredUserCount
          const latestRequestAt = toIso(d.lastClickAt)
          try {
            const details = await api.get<{
              data: {
                availability: {
                  productId: string
                  color: string
                  size: string
                }
              }
            }>(`/admin/inventory/variants/${d.variantId}/details`)
            const { productId, color, size } = details.data.availability
            const productRes = await api.get<{ data: { product: { displayName: string } } }>(
              `/admin/catalog/products/${productId}`,
            )
            return {
              variantId:       d.variantId,
              productId,
              productName:     productRes.data.product.displayName,
              color,
              size,
              requestCount,
              latestRequestAt,
            }
          } catch {
            return {
              variantId:       d.variantId,
              productId:       '',
              productName:     'Unknown product',
              color:           '—',
              size:            '—',
              requestCount,
              latestRequestAt,
            }
          }
        }),
      )
      return items
    },
    staleTime:     60 * 1000,
    refetchInterval: 5 * 60 * 1000,
  })
}

// AUDIT FIX: unresolved inventory reconciliation count for dashboard
export function useUnresolvedReconciliationCount() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.reconciliation,
    queryFn: async () => {
      const res = await api.get<{ data: { logs: unknown[] } }>(
        '/admin/inventory/reconciliation/unresolved',
      )
      return res.data.logs.length
    },
    staleTime:     60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}

export function useFlaggedReviews() {
  return useQuery({
    queryKey: ADMIN_DASHBOARD_KEYS.flaggedReviews,
    queryFn: async () => {
      const res = await api.get<{ data: AdminReviewsListResponse }>('/admin/reviews', {
        params: { flagged: 'true', limit: '10', page: '1' },
        credentials: 'include',
      })
      const { page, limit, total, reviews: raw } = res.data
      const reviews: FlaggedReview[] = raw.map((r) => ({
        id: r.id,
        productId: r.productId,
        productName: r.productName,
        rating: r.rating,
        body: r.body,
        customerName: r.reviewerFirstName,
        flagReason: r.flag?.reason ?? '',
        flaggedAt: toIso(r.flag?.createdAt ?? r.createdAt),
        createdAt: toIso(r.createdAt),
      }))
      return { reviews, page, limit, total } satisfies FlaggedReviewsResponse
    },
    staleTime: 60 * 1000,
    refetchInterval: 2 * 60 * 1000,
  })
}
