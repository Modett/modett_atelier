'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getCountryCookie, getCurrencyCookie } from './useCurrency'
import type { CurrencyCode, ShippingEstimate } from '@/types'

export const SHIPPING_ESTIMATE_KEY = ['shipping-estimate'] as const

export function useShippingEstimate({
  countryCode,
  currency,
  subtotal,
  enabled = true,
}: {
  countryCode?: string       // optional — reads from cookie if not provided
  currency?:    CurrencyCode // optional — reads from cookie if not provided
  subtotal:     string
  enabled?:     boolean
}) {
  const effectiveCountry  = countryCode  ?? getCountryCookie()
  const effectiveCurrency = currency     ?? getCurrencyCookie()

  return useQuery({
    queryKey: [...SHIPPING_ESTIMATE_KEY, effectiveCountry, effectiveCurrency, subtotal],
    queryFn: async () => {
      const res = await api.get<{ data: ShippingEstimate }>(
        '/shipping/estimate',
        { params: { countryCode: effectiveCountry, currency: effectiveCurrency, subtotal } },
      )
      return res.data
    },
    enabled: enabled
      && !!effectiveCountry
      && !!subtotal
      && parseFloat(subtotal) > 0,
    staleTime: 30 * 1000,
  })
}
