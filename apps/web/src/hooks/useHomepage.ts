'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useGeo } from './useCurrency'
import type { ProductSummary, Banner } from '@/types'

interface HomepageData {
  featuredProducts: ProductSummary[]
  banner:           Banner | null
}

export function useHomepage() {
  const { currency } = useGeo()

  return useQuery({
    queryKey: ['homepage', currency],
    queryFn: async () => {
      const res = await api.get<{ data: HomepageData }>(
        '/catalog/homepage',
        { params: { currency } }
      )
      return res.data
    },
    staleTime: 5 * 60 * 1000,
  })
}
