'use client'

import { useState } from 'react'
import { api } from '@/lib/api'
import type { ApiError } from '@/types'

interface SubscribeResult {
  ok:        boolean
  promoCode: string
}

interface UseNewsletterSubscribeReturn {
  subscribe:   (email: string) => Promise<void>
  isPending:   boolean
  promoCode:   string | null
  error:       string | null
  isSuccess:   boolean
  reset:       () => void
}

export function useNewsletterSubscribe(): UseNewsletterSubscribeReturn {
  const [isPending, setIsPending]   = useState(false)
  const [promoCode, setPromoCode]   = useState<string | null>(null)
  const [error, setError]           = useState<string | null>(null)
  const [isSuccess, setIsSuccess]   = useState(false)

  async function subscribe(email: string) {
    setError(null)
    setIsPending(true)
    try {
      const res = await api.post<{ data: SubscribeResult }>(
        '/newsletter/subscribe',
        { email },
      )
      setPromoCode(res.data.promoCode)
      setIsSuccess(true)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      if (apiErr.code === 'ALREADY_SUBSCRIBED') {
        setError(
          'This email is already subscribed. Check your inbox for your promo code.',
        )
      } else {
        setError(
          apiErr.message ?? 'Something went wrong. Please try again.',
        )
      }
    } finally {
      setIsPending(false)
    }
  }

  function reset() {
    setIsPending(false)
    setPromoCode(null)
    setError(null)
    setIsSuccess(false)
  }

  return { subscribe, isPending, promoCode, error, isSuccess, reset }
}
