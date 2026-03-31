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

/** Response body updates cache immediately; invalidate refetches GET /cart after Set-Cookie applies. */
function useCommitCartMutationResult() {
  const queryClient   = useQueryClient()
  const updateCache   = useCartCacheUpdater()

  return (data: NormalizedCartResponse) => {
    updateCache(data)
    void queryClient.invalidateQueries({ queryKey: CART_QUERY_KEY })
  }
}

// ── ADD TO CART ──────────────────────────────────────
interface AddToCartInput {
  variantId: string
  qty:       number
}

export function useAddToCart() {
  const commitResult = useCommitCartMutationResult()
  const openBag      = useUIStore(s => s.openBag)

  return useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const res = await api.post<{ data: ApiCartResponse }>('/cart/items', input)
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      commitResult(data)
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
  const commitResult = useCommitCartMutationResult()

  return useMutation({
    mutationFn: async ({ variantId, qty }: UpdateQtyInput) => {
      const res = await api.patch<{ data: ApiCartResponse }>(
        `/cart/items/${variantId}`,
        { qty }
      )
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      commitResult(data)
    },
  })
}

// ── REMOVE FROM CART ─────────────────────────────────
export function useRemoveFromCart() {
  const commitResult = useCommitCartMutationResult()

  return useMutation({
    mutationFn: async (variantId: string) => {
      const res = await api.delete<{ data: ApiCartResponse }>(
        `/cart/items/${variantId}`
      )
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      commitResult(data)
    },
  })
}

// ── CLEAR CART ───────────────────────────────────────
export function useClearCart() {
  const commitResult = useCommitCartMutationResult()

  return useMutation({
    mutationFn: async () => {
      const res = await api.delete<{ data: ApiCartResponse }>('/cart')
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data) => {
      commitResult(data)
    },
  })
}
