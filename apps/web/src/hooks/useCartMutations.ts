'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { normalizeCartResponse, type ApiCartResponse, type NormalizedCartResponse } from '@/lib/normalizeCart'
import { CART_QUERY_KEY } from './useCart'
import { getCurrencyCookie } from './useCurrency'
import { useUIStore } from '@/store/ui.store'

function useCartCacheUpdater() {
  const queryClient = useQueryClient()

  return (data: NormalizedCartResponse) => {
    const currency = getCurrencyCookie()
    queryClient.setQueryData(
      [...CART_QUERY_KEY, currency],
      data
    )
  }
}

// Do not invalidate cart queries after mutations: the response body is authoritative.
// An immediate GET /cart refetch can run before/with a different cid (cross-origin
// cookie timing) and overwrite the cache with an empty cart.

// ── ADD TO CART ──────────────────────────────────────
interface AddToCartInput {
  variantId: string
  qty:       number
}

export function useAddToCart() {
  const updateCache   = useCartCacheUpdater()
  const openBag       = useUIStore(s => s.openBag)

  return useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const res = await api.post<{ data: ApiCartResponse }>('/cart/items', input)
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      updateCache(data)
      openBag()
    },
  })
}

// ── UPDATE CART ITEM QTY ─────────────────────────────
interface UpdateQtyInput {
  variantId: string
  qty:       number
}

export function useUpdateCartQty() {
  const updateCache = useCartCacheUpdater()

  return useMutation({
    mutationFn: async ({ variantId, qty }: UpdateQtyInput) => {
      const res = await api.patch<{ data: ApiCartResponse }>(
        `/cart/items/${variantId}`,
        { qty }
      )
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      updateCache(data)
    },
  })
}

// ── REMOVE FROM CART ─────────────────────────────────
export function useRemoveFromCart() {
  const updateCache = useCartCacheUpdater()

  return useMutation({
    mutationFn: async (variantId: string) => {
      const res = await api.delete<{ data: ApiCartResponse }>(
        `/cart/items/${variantId}`
      )
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      updateCache(data)
    },
  })
}

// ── CLEAR CART ───────────────────────────────────────
export function useClearCart() {
  const updateCache = useCartCacheUpdater()

  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<{ data: ApiCartResponse }>('/cart')
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      updateCache(data)
    },
  })
}
