'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { CurrencyCode } from '@/types'

export const SHIPPING_METHODS_KEY = ['shipping-methods'] as const

interface RawMethodCost {
  amount: string
  currency: CurrencyCode
  isFree?: boolean
  originalAmount?: string | null
  label?: string
}

interface RawShippingMethod {
  id: string
  name: string
  carrier: string | null
  estimatedDays: string | null
  rateType: 'FLAT' | 'FREE' | 'CALCULATED'
  cost: RawMethodCost | null
}

export interface NormalizedShippingMethod {
  id: string
  name: string
  carrier: string | null
  estimatedDays: string | null
  rateType: 'FLAT' | 'FREE' | 'CALCULATED'
  cost: {
    amount: string
    currency: CurrencyCode
    isFree: boolean
    originalAmount: string | null
    label: string
  }
}

function normalize(method: RawShippingMethod): NormalizedShippingMethod {
  const cost = method.cost
  return {
    id: method.id,
    name: method.name,
    carrier: method.carrier,
    estimatedDays: method.estimatedDays,
    rateType: method.rateType,
    cost: {
      amount: cost?.amount ?? '0.00',
      currency: cost?.currency ?? 'LKR',
      isFree: cost?.isFree ?? method.rateType === 'FREE',
      originalAmount: cost?.originalAmount ?? null,
      label: cost?.label ?? '',
    },
  }
}

export function useShippingMethods({
  countryCode,
  currency,
  subtotal,
  enabled = true,
}: {
  countryCode: string
  currency: CurrencyCode
  subtotal?: string
  enabled?: boolean
}) {
  return useQuery({
    queryKey: [...SHIPPING_METHODS_KEY, countryCode, currency, subtotal],
    queryFn: async () => {
      const params: Record<string, string> = { countryCode, currency }
      if (subtotal) params.subtotal = subtotal
      const res = await api.get<{ data: { methods: RawShippingMethod[] } }>(
        '/shipping/methods',
        { params },
      )
      return res.data.methods.map(normalize)
    },
    enabled: enabled && !!countryCode,
    staleTime: 60 * 1000,
  })
}
