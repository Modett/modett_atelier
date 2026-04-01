'use client'

import { useEffect, useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'

function useDebouncedValue(value: string, ms: number): string {
  const [v, setV] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setV(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return v
}

export function useAdminCustomerSearch(q: string, page = 1) {
  const debounced = useDebouncedValue(q, 300)
  const enabled = debounced.trim().length >= 2
  return useQuery({
    queryKey: ['admin', 'customers', 'search', debounced, page] as const,
    queryFn: async () => {
      const res = await api.get<{
        data: {
          customers: Array<{
            id: string
            first_name: string
            last_name: string
            email: string
            created_at: string
            loyalty_balance: number | null
            loyalty_tier: string | null
            composite_score: string | null
            order_count: number
            total_spent_lkr: string
          }>
          total: number
          page: number
          limit: number
        }
      }>('/admin/customers/search', {
        params: { q: debounced, page: String(page) },
      })
      return res.data
    },
    enabled,
  })
}

export function useAdminCustomerDetail(userId: string | null) {
  return useQuery({
    queryKey: ['admin', 'customers', 'detail', userId ?? ''] as const,
    queryFn: async () => {
      if (!userId) throw new Error('no user')
      const res = await api.get<{ data: Record<string, unknown> }>(
        `/admin/customers/${userId}`,
      )
      return res.data
    },
    enabled: Boolean(userId),
  })
}
