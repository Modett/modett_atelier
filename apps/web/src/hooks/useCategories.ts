'use client'

import { useQuery } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { Category } from '@/types'

export const CATEGORIES_QUERY_KEY = ['categories'] as const

export function useCategories() {
  return useQuery({
    queryKey: CATEGORIES_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { categories: Category[] } }>(
        '/catalog/categories'
      )
      return res.data.categories
    },
    staleTime: 10 * 60 * 1000,
    gcTime:    30 * 60 * 1000,
  })
}
