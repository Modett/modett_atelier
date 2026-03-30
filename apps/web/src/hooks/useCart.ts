'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { normalizeCartResponse, type ApiCartResponse, type NormalizedCartResponse } from '@/lib/normalizeCart'
import { useGeo } from './useCurrency'

export const CART_QUERY_KEY = ['cart'] as const

export function useCart() {
  const { currency, isReady } = useGeo()

  const query = useQuery<NormalizedCartResponse>({
    queryKey: [...CART_QUERY_KEY, currency],
    queryFn: async () => {
      const res = await api.get<{ data: ApiCartResponse }>(
        '/cart',
        { params: { currency } }
      )
      return normalizeCartResponse(res.data)
    },
    enabled:              isReady,
    staleTime:            30 * 1000,
    // No retries: repeated GET /cart can create or hit the wrong cart; surface error once via query.error.
    retry:                false,
    refetchOnWindowFocus: true,
    refetchOnMount:       true,
  })

  const summary   = query.data?.summary ?? null
  const itemCount = summary?.itemCount ?? 0
  const subtotal  = summary?.subtotal ?? null
  const items     = query.data?.items ?? []
  const hasItems  = itemCount > 0

  const hasOutOfStockItems = items.some(
    item => item.stockStatus === 'OUT_OF_STOCK'
  )

  return {
    ...query,
    summary,
    itemCount,
    subtotal,
    items,
    hasItems,
    hasOutOfStockItems,
  }
}
