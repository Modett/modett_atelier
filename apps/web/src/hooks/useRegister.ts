'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CART_QUERY_KEY } from './useCart'
import { SESSION_QUERY_KEY } from './useSession'
import { WISHLIST_QUERY_KEY } from './useWishlist'
import type { User } from '@/types'

interface RegisterInput {
  firstName:       string
  lastName:        string
  email:           string
  password:        string
  newsletterOptIn: boolean
}

export function useRegister() {
  const queryClient = useQueryClient()

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<{ data: { user: User } }>('/auth/signup', input)
      return res.data.user
    },
    onSuccess: (user) => {
      queryClient.setQueryData(SESSION_QUERY_KEY, user)
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
      void queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY })
    },
  })
}
