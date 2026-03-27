'use client'

import { useQuery } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { useEffect } from 'react'
import { api } from '@/lib/api'
import type { User, Admin, ApiError } from '@/types'

export const ADMIN_SESSION_KEY = ['admin-session'] as const

export function useAdminSession() {
  const router = useRouter()

  const { data, isLoading, error } = useQuery({
    queryKey: ADMIN_SESSION_KEY,
    queryFn: async () => {
      try {
        const res = await api.get<{ data: { user: User; admin: Admin } }>('/admin/me')
        return res.data
      } catch (err: unknown) {
        const apiErr = err as ApiError
        if (apiErr?.status === 401) return null
        throw err
      }
    },
    staleTime:            60 * 1000,
    retry:                false,
    refetchOnWindowFocus: true,
    refetchInterval:      2 * 60 * 1000,
  })

  useEffect(() => {
    const apiErr = error as ApiError | null
    if (apiErr?.status === 401) {
      router.push('/admin/login')
    }
  }, [error, router])

  return {
    user:    data?.user  ?? null,
    admin:   data?.admin ?? null,
    isLoading,
    isAdmin: data !== null && data !== undefined && !isLoading,
  }
}
