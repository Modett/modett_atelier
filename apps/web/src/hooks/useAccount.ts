'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useSession, useInvalidateSession } from './useSession'
import type { ApiError, User } from '@/types'
import type { LoyaltyAccountDetail, LedgerEntryPublic } from '@modett/types'

const ORDER_UUID_RE =
  /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

// ── Order list / detail (API: GET /api/orders, GET /api/orders/:id) ───────

export interface OrderSummaryRow {
  id:                  string
  order_ref:           string
  order_state:         string
  payment_state:       string
  fulfillment_state:   string
  return_state:        string
  currency:            string
  total:               string
  placed_at:           string | null
  created_at:          string
  item_count:          string
}

export interface OrdersPageData {
  orders: OrderSummaryRow[]
  page:   number
  limit:  number
  total:  number
}

export interface OrderDetailPayload {
  order:     Record<string, unknown>
  items:     OrderItemRow[]
  addresses: OrderAddressRow[]
  contact:   Record<string, unknown> | null
  events:    OrderEventRow[]
}

export interface OrderItemRow {
  id:                          string
  order_id:                    string
  variant_id:                  string | null
  qty:                         number
  unit_price_snapshot_amount:  string
  unit_price_snapshot_currency: string
  product_snapshot_json:       Record<string, unknown>
}

export interface OrderAddressRow {
  id:           string
  order_id:     string
  kind:         string
  address_json: Record<string, unknown>
  country_code: string
}

export interface OrderEventRow {
  id:           string
  order_id:     string
  event_type:   string
  payload_json: Record<string, unknown>
  created_at:   string
}

async function fetchOrderDetail(orderKey: string): Promise<OrderDetailPayload> {
  const decoded = decodeURIComponent(orderKey)
  if (ORDER_UUID_RE.test(decoded)) {
    const res = await api.get<{ data: OrderDetailPayload }>(`/orders/${decoded}`)
    return res.data
  }
  let page = 1
  const limit = 50
  while (page <= 30) {
    const res = await api.get<{ data: OrdersPageData }>('/orders', {
      params: { page: String(page), limit: String(limit) },
    })
    const hit = res.data.orders.find((o) => o.order_ref === decoded)
    if (hit) {
      const detail = await api.get<{ data: OrderDetailPayload }>(`/orders/${hit.id}`)
      return detail.data
    }
    if (page * res.data.limit >= res.data.total) break
    page += 1
  }
  const err: ApiError = {
    code:    'ORDER_NOT_FOUND',
    message: 'Order not found',
    status:  404,
  }
  throw err
}

export function useOrders(page = 1) {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: ['orders', page],
    queryFn: async () => {
      const res = await api.get<{ data: OrdersPageData }>('/orders', {
        params: { page: String(page), limit: '10' },
      })
      return res.data
    },
    enabled:   isLoggedIn,
    staleTime: 2 * 60 * 1000,
  })
}

export function useOrder(orderRef: string) {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: ['order', orderRef],
    queryFn:  () => fetchOrderDetail(orderRef),
    enabled:  isLoggedIn && !!orderRef,
    staleTime: 60 * 1000,
  })
}

// ── Saved addresses ─────────────────────────────────────────────────────────

export interface AddressFormPayload {
  title:        string
  firstName:    string
  lastName:     string
  phone:        string
  addressLine1: string
  addressLine2?: string
  city:         string
  countryCode:  string
  postcode:     string
}

export interface SavedAddressRow {
  id:           string
  user_id:      string
  label:        string | null
  address_json: Record<string, unknown>
  country_code: string
  is_default:   boolean
  created_at:   string
  updated_at:   string
}

export function useSavedAddresses() {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: ['addresses'],
    queryFn: async () => {
      const res = await api.get<{ data: { addresses: SavedAddressRow[] } }>(
        '/me/addresses',
      )
      return res.data.addresses
    },
    enabled:   isLoggedIn,
    staleTime: 5 * 60 * 1000,
  })
}

export function useAddAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      label?: string
      addressJson: Record<string, unknown>
      countryCode: string
      isDefault?: boolean
    }) => {
      const res = await api.post<{ data: { address: SavedAddressRow } }>(
        '/me/addresses',
        input,
      )
      return res.data.address
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] })
    },
  })
}

export function useUpdateAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (input: {
      id: string
      label?: string
      addressJson?: Record<string, unknown>
      countryCode?: string
      isDefault?: boolean
    }) => {
      const { id, ...body } = input
      const res = await api.patch<{ data: { address: SavedAddressRow } }>(
        `/me/addresses/${id}`,
        body,
      )
      return res.data.address
    },
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] })
    },
  })
}

export function useDeleteAddress() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (id: string) => api.delete(`/me/addresses/${id}`),
    onSuccess: () => {
      qc.invalidateQueries({ queryKey: ['addresses'] })
    },
  })
}

// ── Loyalty ─────────────────────────────────────────────────────────────────

/** @deprecated Use LoyaltyAccountDetail from @modett/types */
export type LoyaltyAccountData = LoyaltyAccountDetail

export type LoyaltyLedgerRow = LedgerEntryPublic & {
  user_id?: string
  order_id?: string | null
  metadata_json?: Record<string, unknown>
  created_at?: string
}

function mapLedgerToLegacy(row: LedgerEntryPublic): LoyaltyLedgerRow {
  return {
    ...row,
    user_id: row.userId,
    order_id: row.orderId,
    metadata_json: row.metadataJson,
    created_at: row.createdAt,
  }
}

export function useLoyalty() {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: ['loyalty'],
    queryFn: async () => {
      const res = await api.get<{ data: LoyaltyAccountDetail }>('/account/loyalty')
      return res.data
    },
    enabled:   isLoggedIn,
    staleTime: 2 * 60 * 1000,
  })
}

export function useLoyaltyLedger(page = 1) {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: ['loyalty-ledger', page],
    queryFn: async () => {
      const res = await api.get<{
        data: {
          entries: LedgerEntryPublic[]
          ledger?: LedgerEntryPublic[]
          page: number
          limit: number
          total: number
        }
      }>('/account/loyalty/ledger', {
        params: { page: String(page), limit: '20' },
      })
      const raw = res.data.entries.length ? res.data.entries : (res.data.ledger ?? [])
      return {
        ledger: raw.map(mapLedgerToLegacy),
        page: res.data.page,
        limit: res.data.limit,
        total: res.data.total,
      }
    },
    enabled:   isLoggedIn,
    staleTime: 2 * 60 * 1000,
  })
}

// ── Inbox ───────────────────────────────────────────────────────────────────

export interface InboxMessageRow {
  id:              string
  user_id:         string
  type:            string
  title:           string
  body:            string
  cta_label:       string | null
  cta_url:         string | null
  metadata_json:   Record<string, unknown>
  is_read:         boolean
  created_at:      string
}

export interface UseInboxParams {
  page?: number
  limit?: number
  unreadOnly?: boolean
}

export function useInbox(params: UseInboxParams | number = {}) {
  const { isLoggedIn } = useSession()
  const page =
    typeof params === 'number' ? params : (params.page ?? 1)
  const limit = typeof params === 'number' ? 20 : (params.limit ?? 20)
  const unreadOnly =
    typeof params === 'number' ? false : Boolean(params.unreadOnly)

  return useQuery({
    queryKey: ['inbox', { page, limit, unreadOnly }],
    queryFn: async () => {
      const res = await api.get<{
        data: {
          messages:     InboxMessageRow[]
          unreadCount:  number
          page:         number
          limit:        number
          total:        number
        }
      }>('/inbox', {
        params: {
          page: String(page),
          limit: String(limit),
          unreadOnly: unreadOnly ? 'true' : 'false',
        },
      })
      return res.data
    },
    enabled:                isLoggedIn,
    staleTime:              30 * 1000,
    refetchOnWindowFocus:   true,
  })
}

export const INBOX_UNREAD_COUNT_KEY = ['inbox-unread-count'] as const

export function useUnreadCount() {
  const { isLoggedIn } = useSession()
  return useQuery({
    queryKey: INBOX_UNREAD_COUNT_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { count: number } }>(
        '/inbox/unread-count',
      )
      return res.data
    },
    enabled:              isLoggedIn,
    staleTime:            30 * 1000,
    refetchInterval:      60 * 1000,
  })
}

interface InboxQueryData {
  messages:     InboxMessageRow[]
  unreadCount:  number
  page:         number
  limit:        number
  total:        number
}

export function useMarkMessageRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: (messageId: string) =>
      api.post(`/inbox/${messageId}/read`, {}),
    onMutate: async (messageId) => {
      await qc.cancelQueries({ queryKey: ['inbox'] })
      const snapshots = qc.getQueriesData<InboxQueryData>({
        queryKey: ['inbox'],
        exact: false,
      })
      snapshots.forEach(([queryKey, data]) => {
        if (!data) return
        const wasUnread = data.messages.some((m) => m.id === messageId && !m.is_read)
        qc.setQueryData(queryKey, {
          ...data,
          messages: data.messages.map((m) =>
            m.id === messageId ? { ...m, is_read: true } : m,
          ),
          unreadCount: wasUnread
            ? Math.max(0, data.unreadCount - 1)
            : data.unreadCount,
        })
      })
      return { snapshots }
    },
    onError: (_err, _id, ctx) => {
      ctx?.snapshots?.forEach(([key, data]) => {
        qc.setQueryData(key, data)
      })
    },
    onSettled: () => {
      void qc.invalidateQueries({ queryKey: ['inbox'] })
      void qc.invalidateQueries({ queryKey: INBOX_UNREAD_COUNT_KEY })
    },
  })
}

export function useMarkAllRead() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: () => api.post('/inbox/read-all', {}),
    onSuccess: () => {
      void qc.invalidateQueries({ queryKey: ['inbox'] })
      void qc.invalidateQueries({ queryKey: INBOX_UNREAD_COUNT_KEY })
    },
  })
}

// ── Profile ─────────────────────────────────────────────────────────────────

export function useUpdateProfile() {
  const qc                = useQueryClient()
  const invalidateSession = useInvalidateSession()
  return useMutation({
    mutationFn: async (data: {
      firstName?:       string
      lastName?:        string
      dob?:             string | null
      dobConsent?:      boolean
      newsletterOptIn?: boolean
    }) => {
      const res = await api.patch<{ data: { user: User } }>('/me', data)
      return res.data.user
    },
    onSuccess: () => {
      invalidateSession()
      qc.invalidateQueries({ queryKey: ['profile'] })
    },
  })
}

export function useChangePassword() {
  return useMutation({
    mutationFn: (data: { currentPassword: string; newPassword: string }) =>
      api.patch('/me/password', data),
  })
}

// ── Returns ─────────────────────────────────────────────────────────────────

export const RETURN_POLICY_VERSION = 'modett-return-policy-v1'

export interface SubmitReturnInput {
  orderId:    string
  orderRef:   string
  type:       'REFUND' | 'EXCHANGE'
  reason:     string
  policyVersion: string
  items: {
    orderItemId: string
    qty:         number
    requestedVariantChangeJson?: { color?: string; size?: string }
  }[]
}

export interface SubmitReturnResponse {
  returnRequest: { id: string }
  items:         unknown[]
}

export function useSubmitReturn() {
  const qc = useQueryClient()
  return useMutation({
    mutationFn: async (data: SubmitReturnInput) => {
      const res = await api.post<{ data: SubmitReturnResponse }>('/returns', {
        orderId:       data.orderId,
        type:          data.type,
        reason:        data.reason,
        policyVersion: data.policyVersion,
        items:         data.items,
      })
      return res.data
    },
    onSuccess: (_res, vars) => {
      qc.invalidateQueries({ queryKey: ['order', vars.orderRef] })
      qc.invalidateQueries({ queryKey: ['orders'] })
    },
  })
}
