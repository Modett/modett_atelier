'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { useInvalidateSession } from './useSession'
import { CART_QUERY_KEY } from './useCart'
import type { User } from '@/types'

interface LoginInput {
  email:      string
  password:   string
  rememberMe: boolean
}

export function useLogin() {
  const invalidateSession = useInvalidateSession()
  const queryClient       = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post<{ data: { user: User } }>('/auth/login', input)
      return res.data.user
    },
    onSuccess: () => {
      invalidateSession()
      queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
    },
  })
}
