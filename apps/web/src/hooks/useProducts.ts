'use client'

import { useInfiniteQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useGeo } from './useCurrency'
import type { ProductSummary, PaginatedResponse } from '@/types'

interface UseProductsParams {
  category?: string
  sort?:     'newest' | 'price-asc' | 'price-desc'
  limit?:    number
}

export function useProducts({
  category,
  sort,
  limit = 24,
}: UseProductsParams = {}) {
  const { currency, isReady } = useGeo()

  return useInfiniteQuery({
    queryKey: ['products', { category, sort, limit, currency }],
    queryFn: async ({ pageParam = 1 }) => {
      const params: Record<string, string> = {
        page:     String(pageParam),
        limit:    String(limit),
        currency,
      }
      if (category) params.category = category
      if (sort) params.sort = sort

      const res = await api.get<{ data: PaginatedResponse<ProductSummary> }>(
        '/catalog/products',
        { params }
      )
      return res.data
    },
    initialPageParam: 1,
    getNextPageParam: (lastPage) => {
      const { page, totalPages } = lastPage
      return page < totalPages ? page + 1 : undefined
    },
    enabled:   isReady,
    staleTime: 2 * 60 * 1000,
  })
}

export function flattenProducts(
  data: ReturnType<typeof useProducts>['data']
): ProductSummary[] {
  return data?.pages.flatMap(page => page.products) ?? []
}
