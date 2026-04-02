'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type {
  AdminReturnDetailPayload,
  AdminReturnLineItem,
  AdminReturnListRow,
  AdminReturnRequest,
  AdminReturnsListResponse,
  AdminReturnTimelineEvent,
  ReturnStatus,
  ReturnType,
} from '@modett/types'

export interface AdminReturnsListParams {
  page?: number
  limit?: number
  status?: ReturnStatus
  type?: ReturnType
}

interface ReturnSummaryApiRow {
  id: string
  order_id: string
  type: ReturnType
  status: ReturnStatus
  reason: string
  policy_accepted_at: string
  policy_version: string
  eligible_until: string
  created_at: string
  updated_at: string
  order_ref: string
  user_id: string | null
  guest_email: string | null
  item_count: number | string
  user_first_name: string | null
  user_last_name: string | null
  user_email: string | null
}

function mapReturnSummaryRow(row: ReturnSummaryApiRow): AdminReturnListRow {
  const customerEmail =
    row.user_id != null
      ? (row.user_email?.trim() ?? '—')
      : (row.guest_email?.trim() ?? '') !== ''
        ? (row.guest_email?.trim() ?? '')
        : '—'
  const customerName =
    row.user_id != null
      ? [row.user_first_name, row.user_last_name]
          .filter((s): s is string => Boolean(s?.trim()))
          .join(' ')
          .trim() || (customerEmail !== '—' ? (customerEmail.split('@')[0] ?? 'Customer') : 'Customer')
      : customerEmail !== '—'
        ? (customerEmail.split('@')[0] ?? 'Guest')
        : 'Guest'

  return {
    id: row.id,
    orderRef: row.order_ref,
    orderId: row.order_id,
    userId: row.user_id,
    customerName,
    customerEmail,
    status: row.status,
    returnType: row.type,
    eligibleUntil: row.eligible_until,
    submittedAt: row.created_at,
    updatedAt: row.updated_at,
    itemCount: Number(row.item_count) || 0,
  }
}

interface ReturnItemApiRow {
  id: string
  return_request_id: string
  order_item_id: string
  qty: number
  request_status: ReturnStatus
  product_name?: string
  colour?: string
  size?: string
  image_url?: string | null
  unit_price?: string
  currency?: string
  customer_reason_text?: string
}

interface ReturnEventApiRow {
  id: string
  return_request_id: string
  event_type: string
  admin_id: string | null
  admin_note: string | null
  payload_json: Record<string, unknown>
  created_at: string
}

interface ReturnRequestDetailApiRow {
  id: string
  order_id: string
  type: ReturnType
  status: ReturnStatus
  reason: string
  policy_accepted_at: string
  policy_version: string
  eligible_until: string
  created_at: string
  updated_at: string
  order_ref: string
  user_id: string | null
  customer_name: string
  customer_email: string
}

function mapReturnItem(row: ReturnItemApiRow, fallbackReason: string): AdminReturnLineItem {
  return {
    id: row.id,
    returnRequestId: row.return_request_id,
    orderItemId: row.order_item_id,
    qty: row.qty,
    customerReason: row.customer_reason_text ?? fallbackReason,
    requestStatus: row.request_status,
    productName: row.product_name ?? 'Product',
    colour: row.colour ?? '',
    size: row.size ?? '',
    imageUrl:
      row.image_url != null && String(row.image_url).trim() !== ''
        ? String(row.image_url)
        : null,
    unitPrice: row.unit_price ?? '0',
    currency: row.currency ?? 'USD',
  }
}

function mapReturnEvent(row: ReturnEventApiRow): AdminReturnTimelineEvent {
  return {
    id: row.id,
    returnRequestId: row.return_request_id,
    eventType: row.event_type,
    adminId: row.admin_id,
    adminNote: row.admin_note,
    payloadJson: row.payload_json ?? {},
    createdAt: row.created_at,
  }
}

function transformReturnDetail(raw: {
  request: ReturnRequestDetailApiRow
  items: ReturnItemApiRow[]
  events: ReturnEventApiRow[]
}): AdminReturnDetailPayload {
  const req = raw.request
  const request: AdminReturnRequest = {
    id: req.id,
    orderRef: req.order_ref,
    orderId: req.order_id,
    userId: req.user_id,
    customerName: req.customer_name,
    customerEmail: req.customer_email,
    status: req.status,
    returnType: req.type,
    eligibleUntil: req.eligible_until,
    submittedAt: req.created_at,
    updatedAt: req.updated_at,
  }

  return {
    request,
    items: raw.items.map((i) => mapReturnItem(i, req.reason)),
    events: raw.events.map(mapReturnEvent),
  }
}

export function useAdminReturnsList({
  page = 1,
  limit = 20,
  status,
  type,
}: AdminReturnsListParams = {}) {
  return useQuery({
    queryKey: ['admin', 'returns', { page, limit, status, type }],
    queryFn: async () => {
      const params: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      }
      if (status) params.status = status
      if (type) params.type = type

      const res = await api.get<{
        data: {
          returns: ReturnSummaryApiRow[]
          page: number
          limit: number
          total: number
        }
      }>('/admin/returns', { params })

      const { returns: raw, page: p, limit: l, total } = res.data
      return {
        returns: raw.map(mapReturnSummaryRow),
        page: p,
        limit: l,
        total,
      } satisfies AdminReturnsListResponse
    },
    staleTime: 30 * 1000,
  })
}

export function useAdminReturnDetail(returnRequestId: string) {
  return useQuery({
    queryKey: ['admin', 'returns', returnRequestId || '__none__'],
    queryFn: async () => {
      if (!returnRequestId) throw new Error('No return request ID')
      const res = await api.get<{
        data: {
          request: ReturnRequestDetailApiRow
          items: ReturnItemApiRow[]
          events: ReturnEventApiRow[]
        }
      }>(`/admin/returns/${returnRequestId}`)
      return transformReturnDetail(res.data)
    },
    enabled: Boolean(returnRequestId),
    staleTime: 10 * 1000,
  })
}

export function useOpenReturnForReview() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({ returnRequestId }: { returnRequestId: string }) => {
      await api.post(`/admin/returns/${returnRequestId}/open`)
    },
    onSuccess: (_, { returnRequestId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] })
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'returns', returnRequestId],
      })
    },
  })
}

export function useApproveReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      returnRequestId,
      adminNote,
    }: {
      returnRequestId: string
      adminNote?: string
    }) => {
      await api.post(`/admin/returns/${returnRequestId}/approve`, {
        adminNote,
      })
    },
    onSuccess: (_, { returnRequestId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] })
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'returns', returnRequestId],
      })
    },
  })
}

export function useRejectReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      returnRequestId,
      reason,
      adminNote,
    }: {
      returnRequestId: string
      reason: string
      adminNote?: string
    }) => {
      await api.post(`/admin/returns/${returnRequestId}/reject`, {
        reason,
        adminNote,
      })
    },
    onSuccess: (_, { returnRequestId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] })
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'returns', returnRequestId],
      })
    },
  })
}

export function useFulfilReturn() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async ({
      returnRequestId,
      adminNote,
    }: {
      returnRequestId: string
      adminNote?: string
    }) => {
      await api.post(`/admin/returns/${returnRequestId}/fulfil`, {
        adminNote,
      })
    },
    onSuccess: (_, { returnRequestId }) => {
      void queryClient.invalidateQueries({ queryKey: ['admin', 'returns'] })
      void queryClient.invalidateQueries({
        queryKey: ['admin', 'returns', returnRequestId],
      })
    },
  })
}
