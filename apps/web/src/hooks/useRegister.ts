'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { CART_QUERY_KEY } from './useCart'
import { useInvalidateSession } from './useSession'
import type { User } from '@/types'

interface RegisterInput {
  firstName:       string
  lastName:        string
  email:           string
  password:        string
  newsletterOptIn: boolean
}

export function useRegister() {
  const invalidateSession = useInvalidateSession()
  const queryClient         = useQueryClient()

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<{ data: { user: User } }>('/auth/signup', input)
      return res.data.user
    },
    onSuccess: () => {
      invalidateSession()
      void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
    },
  })
}
