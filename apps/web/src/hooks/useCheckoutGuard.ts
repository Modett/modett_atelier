'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { getCurrencyCookie } from './useCurrency'
import { CART_QUERY_KEY } from './useCart'
import type { NormalizedCartResponse } from '@/lib/normalizeCart'

export function useCheckoutGuard() {
  const queryClient = useQueryClient()
  const router      = useRouter()

  const [isNavigating, setIsNavigating] = useState(false)
  const [guardError,   setGuardError]   = useState<string | null>(null)

  async function proceedToCheckout() {
    setIsNavigating(true)
    setGuardError(null)

    const currency = getCurrencyCookie()

    try {
      await queryClient.refetchQueries({
        queryKey: [...CART_QUERY_KEY, currency],
        type: 'active',
      })

      const cartData = queryClient.getQueryData<NormalizedCartResponse>(
        [...CART_QUERY_KEY, currency]
      )

      if (!cartData?.items || cartData.items.length === 0) {
        setGuardError('Your bag is empty.')
        setIsNavigating(false)
        return
      }

      const oosItems = cartData.items.filter(
        item => item.stockStatus === 'OUT_OF_STOCK'
      )
      if (oosItems.length > 0) {
        setGuardError(
          `${oosItems.length} item${oosItems.length > 1 ? 's are' : ' is'} no longer available. Please remove ${oosItems.length > 1 ? 'them' : 'it'} before continuing.`
        )
        setIsNavigating(false)
        return
      }

      router.push('/checkout')
    } catch {
      setGuardError('Something went wrong. Please try again.')
      setIsNavigating(false)
    }
  }

  return { proceedToCheckout, isNavigating, guardError, setGuardError }
}
