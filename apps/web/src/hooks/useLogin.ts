'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { SESSION_QUERY_KEY } from './useSession'
import { CART_QUERY_KEY } from './useCart'
import { WISHLIST_QUERY_KEY } from './useWishlist'
import type { User } from '@/types'

interface LoginInput {
  email:      string
  password:   string
  rememberMe: boolean
}

export function useLogin() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: LoginInput) => {
      const res = await api.post<{ data: { user: User } }>('/auth/login', input)
      return res.data.user
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY })
    },
  })
}
