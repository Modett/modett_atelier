'use client'

import { useMutation } from '@tanstack/react-query'
import { api } from '@/lib/api'
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

  return useMutation({
    mutationFn: async (input: RegisterInput) => {
      const res = await api.post<{ data: { user: User } }>('/auth/signup', input)
      return res.data.user
    },
    onSuccess: () => {
      invalidateSession()
    },
  })
}
