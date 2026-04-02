'use client'

import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ProductReviewsResponse, Review, ReviewTokenStatus } from '@modett/types'
import { useSession } from '@/hooks/useSession'

export function useProductReviews(productId: string, page = 1) {
  return useQuery({
    queryKey: ['product-reviews', productId, page],
    queryFn: async () => {
      const res = await api.get<{ data: ProductReviewsResponse }>(
        `/products/${productId}/reviews`,
        { params: { page: String(page), limit: '20' } },
      )
      return res.data
    },
    enabled: Boolean(productId),
    staleTime: 5 * 60 * 1000,
  })
}

export function useReviewTokenStatus(token: string, orderItemId: string) {
  return useQuery({
    queryKey: ['review-token', token, orderItemId],
    queryFn: async () => {
      const res = await api.get<{ data: ReviewTokenStatus }>('/reviews/token-status', {
        params: { token, orderItemId },
      })
      return res.data
    },
    enabled: Boolean(token && orderItemId),
  })
}

export function useMyReviews(page = 1) {
  const { isLoggedIn, isLoading: sessionLoading } = useSession()
  return useQuery({
    queryKey: ['my-reviews', page],
    queryFn: async () => {
      const res = await api.get<{
        data: { reviews: Review[]; page: number; limit: number; total: number }
      }>('/account/reviews', {
        params: { page: String(page), limit: '10' },
      })
      return res.data
    },
    enabled: isLoggedIn && !sessionLoading,
  })
}

export interface SubmitReviewInput {
  token: string
  orderItemId: string
  rating: number
  body?: string
  mediaUrls?: string[]
  /** When set, invalidates product review queries for this product */
  productId?: string
}

export function useSubmitReview() {
  const queryClient = useQueryClient()
  return useMutation({
    mutationFn: async (input: SubmitReviewInput) => {
      const res = await api.post<{ data: { review: Review } }>('/reviews', {
        token: input.token,
        orderItemId: input.orderItemId,
        rating: input.rating,
        body: input.body,
        mediaUrls: input.mediaUrls,
      })
      return { ...input, review: res.data.review }
    },
    onSuccess: (data) => {
      if (data.productId) {
        void queryClient.invalidateQueries({ queryKey: ['product-reviews', data.productId] })
      }
      void queryClient.invalidateQueries({ queryKey: ['product-reviews'] })
      void queryClient.invalidateQueries({
        queryKey: ['review-token', data.token, data.orderItemId],
      })
      void queryClient.invalidateQueries({ queryKey: ['my-reviews'] })
    },
  })
}
