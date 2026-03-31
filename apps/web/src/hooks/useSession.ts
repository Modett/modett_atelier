'use client'

import { useQuery, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import type { User } from '@/types'

export const SESSION_QUERY_KEY = ['session'] as const

export function useSession() {
  const { data, isLoading } = useQuery({
    queryKey: SESSION_QUERY_KEY,
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { user: User | null } }>('/auth/session')
        return res.data.user
      } catch (err: unknown) {
        const apiErr = err as { status?: number }
        if (apiErr?.status === 401) return null
        throw err
      }
    },
    staleTime:            5 * 60 * 1000,
    retry:                false,
    refetchOnWindowFocus: true,
  })

  return {
    user:       data ?? null,
    isLoading,
    /** User is authenticated — uses cached query data; login/register set this immediately via setQueryData. */
    isLoggedIn: data != null,
  }
}

export function useInvalidateSession() {
  const queryClient = useQueryClient()
  return () => queryClient.invalidateQueries({ queryKey: SESSION_QUERY_KEY })
}
