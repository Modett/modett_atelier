'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useRouter } from 'next/navigation'
import { api } from '@/lib/api'
import { SESSION_QUERY_KEY } from './useSession'

export function useLogout() {
  const queryClient = useQueryClient()
  const router      = useRouter()

  return useMutation({
    mutationFn: () => api.post('/auth/logout', {}),
    onSuccess: () => {
      queryClient.clear()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.push('/')
    },
    onError: () => {
      queryClient.clear()
      queryClient.setQueryData(SESSION_QUERY_KEY, null)
      router.push('/')
    },
  })
}
