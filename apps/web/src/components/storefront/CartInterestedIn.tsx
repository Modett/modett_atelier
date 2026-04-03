'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProductCard, type ProductCardProps } from '@modett/ui'
import { useProducts, flattenProducts } from '@/hooks/useProducts'
import { useSession } from '@/hooks/useSession'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { cn } from '@/lib/utils'
import type { CartItem } from '@/types'
import { mapProductSummaryToCardProps } from '@/lib/mapProductToCardProps'

const ITEMS_PER_PAGE = 6

interface CartInterestedInProps {
  cartItems: CartItem[]
}

export function CartInterestedIn({ cartItems }: CartInterestedInProps) {
  const [page, setPage]             = useState(1)
  const router                      = useRouter()
  const { isLoggedIn }              = useSession()
  const { openPanel }               = useAuthPanel()
  const { data: wishlistItems }     = useWishlist()
  const toggleWishlist              = useToggleWishlist()
  const addToCart                    = useAddToCart()
  const { data, isLoading }         = useProducts({ limit: 24 })

  const cartProductSlugs = useMemo(
    () => new Set(cartItems.map(i => i.productSlug)),
    [cartItems],
  )

  const allProducts = useMemo(() => {
    const products = flattenProducts(data)
    return products.filter(p => !cartProductSlugs.has(p.slug))
  }, [data, cartProductSlugs])

  const displayed = allProducts.slice(0, page * ITEMS_PER_PAGE)
  const hasMore   = displayed.length < allProducts.length

  const wishlistIds = useMemo(
    () => new Set(wishlistItems?.map(item => item.productId) ?? []),
    [wishlistItems],
  )

  const handleCardClick = useCallback(
    (slug: string) => router.push(`/products/${slug}`),
    [router],
  )

  const handleWishlistToggle = useCallback(
    (productId: string) => {
      if (!isLoggedIn) { openPanel(); return }
      toggleWishlist.mutate(productId)
    },
    [isLoggedIn, openPanel, toggleWishlist],
  )

  const handleQuickAddToCart = useCallback(
    (productId: string, colourValue: string, sizeValue: string) => {
      const product = allProducts.find(p => p.id === productId)
      if (!product) return
      const variant = product.variants?.find(
        v => v.color === colourValue && v.size === sizeValue,
      )
      if (!variant) return
      addToCart.mutate({ variantId: variant.variantId, qty: 1 })
    },
    [allProducts, addToCart],
  )

  const cardProps: ProductCardProps[] = displayed.map(p =>
    mapProductSummaryToCardProps(p, wishlistIds),
  )

  if (isLoading) {
    return (
      <section className="mt-16">
        <h2 className="font-display font-bold text-[24px] md:text-[28px] text-umber mb-6">
          You may also be interested in
        </h2>
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      </section>
    )
  }

  if (allProducts.length === 0) return null

  return (
    <section className="mt-16">
      <h2 className="font-display font-bold text-[24px] md:text-[28px] text-umber mb-6">
        You may also be interested in
      </h2>

      <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
        {cardProps.map(card => (
          <ProductCard
            key={card.id}
            {...card}
            onWishlistToggle={handleWishlistToggle}
            onCardClick={handleCardClick}
            onQuickAddToCart={handleQuickAddToCart}
            isAddingToCart={addToCart.isPending}
          />
        ))}
      </div>

      {hasMore && (
        <div className="text-center mt-8">
          <button
            onClick={() => setPage(p => p + 1)}
            className={cn(
              'h-12 px-16',
              'bg-deep text-background',
              'font-body font-light uppercase tracking-[0.25em] text-[12px]',
              'rounded-none hover:bg-ink transition-colors duration-200',
            )}
          >
            View More
          </button>
        </div>
      )}
    </section>
  )
}
