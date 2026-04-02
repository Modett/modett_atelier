'use client'

import { useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { normalizeCartResponse, type ApiCartResponse, type NormalizedCartResponse } from '@/lib/normalizeCart'
import { CART_QUERY_KEY } from './useCart'
import { getCurrencyCookie } from './useCurrency'
import { useSession } from './useSession'
import { useUIStore } from '@/store/ui.store'
import { Analytics } from '@/lib/analytics'

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

/** Writes mutation response into the cart query cache. Do not invalidate — refetch races cross-origin `cid` Set-Cookie. */
function useCommitCartMutationResult() {
  const updateCache = useCartCacheUpdater()

  return (data: NormalizedCartResponse) => {
    updateCache(data)
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
  const { user }     = useSession()

  return useMutation({
    mutationFn: async (input: AddToCartInput) => {
      const res = await api.post<{ data: ApiCartResponse }>('/cart/items', input)
      return normalizeCartResponse(res.data)
    },
    onSuccess: (data, variables) => {
      commitResult(data)
      openBag()
      const line = data.items.find((i) => i.variantId === variables.variantId)
      if (line) {
        Analytics.addToCart({
          variantId: variables.variantId,
          productId: line.productId,
          color:     line.color,
          size:      line.size,
          qty:       variables.qty,
          userId:    user?.id,
        })
      }
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
  const queryClient  = useQueryClient()
  const { user }     = useSession()
  const currency     = getCurrencyCookie()

  return useMutation({
    mutationFn: async (variantId: string) => {
      const res = await api.delete<{ data: ApiCartResponse }>(
        `/cart/items/${variantId}`
      )
      return normalizeCartResponse(res.data)
    },
    onMutate: async (variantId) => {
      await queryClient.cancelQueries({ queryKey: [...CART_QUERY_KEY, currency] })
      const prev = queryClient.getQueryData<NormalizedCartResponse>([
        ...CART_QUERY_KEY,
        currency,
      ])
      const line = prev?.items.find((i) => i.variantId === variantId)
      return { productId: line?.productId ?? '' }
    },
    onSuccess: (data, variantId, ctx) => {
      commitResult(data)
      Analytics.removeFromCart({
        variantId,
        productId: ctx?.productId ?? '',
        userId:    user?.id,
      })
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
