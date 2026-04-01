'use client'

import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query'
import { api } from '@/lib/api'
import { getCurrencyCookie } from '@/hooks/useCurrency'
import { useSession } from './useSession'
import { Analytics } from '@/lib/analytics'
import type { WishlistItem } from '@/types'

export const WISHLIST_QUERY_KEY = ['wishlist'] as const

export function useWishlist() {
  const { isLoggedIn } = useSession()

  return useQuery({
    queryKey: WISHLIST_QUERY_KEY,
    queryFn: async () => {
      const res = await api.get<{ data: { wishlist: WishlistItem[] } }>(
        '/me/wishlist',
        { params: { currency: getCurrencyCookie() } },
      )
      return res.data.wishlist
    },
    enabled:   isLoggedIn,
    staleTime: 2 * 60 * 1000,
  })
}

export function useIsWishlisted(productId: string): boolean {
  const { data } = useWishlist()
  return data?.some(item => item.productId === productId) ?? false
}

export function useToggleWishlist() {
  const queryClient        = useQueryClient()
  const { data: wishlist } = useWishlist()
  const { user }           = useSession()

  return useMutation({
    mutationFn: async (productId: string) => {
      const isInWishlist = wishlist?.some(
        item => item.productId === productId
      ) ?? false

      if (isInWishlist) {
        await api.delete(`/me/wishlist/${productId}`)
        return { action: 'removed' as const, productId }
      } else {
        await api.post(`/me/wishlist/${productId}`)
        return { action: 'added' as const, productId }
      }
    },
    onSuccess: (result) => {
      queryClient.invalidateQueries({ queryKey: WISHLIST_QUERY_KEY })
      if (result.action === 'added') {
        Analytics.wishlistAdd({ productId: result.productId, userId: user?.id })
      } else {
        Analytics.wishlistRemove({ productId: result.productId, userId: user?.id })
      }
    },
  })
}
