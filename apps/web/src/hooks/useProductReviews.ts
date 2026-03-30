'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { ProductReviewsResponse } from '@/types'

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
    enabled:   !!productId,
    staleTime: 5 * 60 * 1000,
  })
}
