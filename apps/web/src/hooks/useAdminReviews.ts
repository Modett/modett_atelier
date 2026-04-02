'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { AdminReview, AdminReviewsListResponse, ReviewStatus } from '@modett/types'

export const ADMIN_REVIEWS_KEYS = {
  all: ['admin', 'reviews'] as const,
  list: (params: AdminReviewsListParams) =>
    [...ADMIN_REVIEWS_KEYS.all, 'list', params] as const,
}

export interface AdminReviewsListParams {
  page?: number
  limit?: number
  status?: ReviewStatus
  flagged?: boolean
  productId?: string
}

export function useAdminReviewsList(params: AdminReviewsListParams = {}) {
  const {
    page = 1,
    limit = 20,
    status,
    flagged = false,
    productId,
  } = params

  return useQuery({
    queryKey: ADMIN_REVIEWS_KEYS.list({ page, limit, status, flagged, productId }),
    queryFn: async () => {
      const query: Record<string, string> = {
        page: String(page),
        limit: String(limit),
      }
      if (status) query.status = status
      if (flagged) query.flagged = 'true'
      if (productId) query.productId = productId

      const res = await api.get<{ data: AdminReviewsListResponse }>('/admin/reviews', {
        params: query,
        credentials: 'include',
      })
      return res.data
    },
  })
}

export function useHideReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      await api.post<{ data: { ok: boolean } }>(
        `/admin/reviews/${reviewId}/hide`,
        undefined,
        { credentials: 'include' },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEYS.all })
    },
  })
}

export function useShowReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      await api.post<{ data: { ok: boolean } }>(
        `/admin/reviews/${reviewId}/show`,
        undefined,
        { credentials: 'include' },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEYS.all })
    },
  })
}

export function useFlagReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({
      reviewId,
      reason,
    }: {
      reviewId: string
      reason: string
    }) => {
      await api.post<{ data: { ok: boolean } }>(
        `/admin/reviews/${reviewId}/flag`,
        { reason },
        { credentials: 'include' },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEYS.all })
    },
  })
}

export function useResolveFlag() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async ({ reviewId }: { reviewId: string }) => {
      await api.post<{ data: { ok: boolean } }>(
        `/admin/reviews/${reviewId}/resolve-flag`,
        undefined,
        { credentials: 'include' },
      )
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ADMIN_REVIEWS_KEYS.all })
    },
  })
}

export type { AdminReview }
