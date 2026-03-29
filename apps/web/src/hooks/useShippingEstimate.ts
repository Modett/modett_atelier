'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CurrencyCode, ShippingEstimate } from '@/types'

export const SHIPPING_ESTIMATE_KEY = ['shipping-estimate'] as const

export function useShippingEstimate({
  countryCode,
  currency,
  subtotal,
  enabled = true,
  isReady,
}: {
  countryCode: string
  currency:    CurrencyCode
  subtotal:    string
  enabled?:    boolean
  isReady:     boolean
}) {
  return useQuery({
    queryKey: [...SHIPPING_ESTIMATE_KEY, countryCode, currency, subtotal],
    queryFn: async () => {
      const res = await api.get<{ data: ShippingEstimate }>(
        '/shipping/estimate',
        {
          params: {
            countryCode,
            currency,
            subtotal,
          },
        },
      )
      return res.data
    },
    enabled:
      enabled
      && isReady
      && !!countryCode
      && !!subtotal
      && parseFloat(subtotal) > 0,
    staleTime: 30 * 1000,
  })
}
