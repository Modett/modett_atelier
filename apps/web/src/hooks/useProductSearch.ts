'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useGeo } from './useCurrency'
import type { ProductSummary, PaginatedResponse } from '@/types'

export function useProductSearch(query: string) {
  const { currency, isReady } = useGeo()

  return useQuery({
    queryKey: ['product-search', query, currency],
    queryFn: async () => {
      const res = await api.get<{ data: PaginatedResponse<ProductSummary> }>(
        '/catalog/products',
        { params: { q: query, limit: '20', currency } }
      )
      return res.data
    },
    enabled:   isReady && query.trim().length >= 2,
    staleTime: 60 * 1000,
  })
}
