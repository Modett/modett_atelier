'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProductCard, type ProductCardProps } from '@modett/ui'
import { useProducts, flattenProducts } from '@/hooks/useProducts'
import { useSession } from '@/hooks/useSession'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { formatMoney } from '@/hooks/useCurrency'
import { ProductCardSkeleton } from './ProductCardSkeleton'
import { COLOUR_HEX_MAP } from './ColourSelector'
import type { ProductSummary } from '@/types'
import { productImagePlaceholderUrl } from '@/lib/assets'

interface CartRecommendationsProps {
  excludeVariantIds?: string[]
}

export function CartRecommendations({
  excludeVariantIds = [],
}: CartRecommendationsProps) {
  const router                  = useRouter()
  const { isLoggedIn }          = useSession()
  const { openPanel }           = useAuthPanel()
  const { data: wishlistItems } = useWishlist()
  const toggleWishlist          = useToggleWishlist()
  const addToCart               = useAddToCart()

  const { data, isLoading } = useProducts({ limit: 12 })

  const allProducts = flattenProducts(data)

  const excludeProductIds = useMemo(
    () => new Set<string>(),
    [],
  )
  void excludeVariantIds
  void excludeProductIds

  const displayedProducts = allProducts.slice(0, 6)

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

  const cardProps: ProductCardProps[] = displayedProducts.map(p =>
    mapToCardProps(p, wishlistIds),
  )

  if (!isLoading && displayedProducts.length === 0) return null

  return (
    <section className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20 border-t border-muted">
      <h2 className="font-display font-bold text-[24px] md:text-[28px] text-umber mb-8 md:mb-10">
        You may also like
      </h2>

      {isLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
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
      )}
    </section>
  )
}

function mapToCardProps(
  product: ProductSummary,
  wishlistIds: Set<string>,
): ProductCardProps {
  const variants = product.variants ?? []

  const colourMap = new Map<string, { hex: string; inStock: boolean }>()
  for (const v of variants) {
    const existing = colourMap.get(v.color)
    if (!existing) {
      colourMap.set(v.color, {
        hex: COLOUR_HEX_MAP[v.color.toLowerCase()] ?? '#888888',
        inStock: v.stockStatus !== 'OUT_OF_STOCK',
      })
    } else if (v.stockStatus !== 'OUT_OF_STOCK') {
      existing.inStock = true
    }
  }

  const sizeMap = new Map<string, boolean>()
  for (const v of variants) {
    const existing = sizeMap.get(v.size)
    if (!existing) {
      sizeMap.set(v.size, v.stockStatus !== 'OUT_OF_STOCK')
    } else if (v.stockStatus !== 'OUT_OF_STOCK') {
      sizeMap.set(v.size, true)
    }
  }

  return {
    id:           product.id,
    slug:         product.slug,
    displayName:  product.displayName,
    price:        formatMoney(product.price),
    isSale:       product.isSale,
    isWishlisted: wishlistIds.has(product.id),
    primaryImage: product.keyImage
      ? { url: product.keyImage.url, altText: product.keyImage.altText ?? product.displayName }
      : { url: productImagePlaceholderUrl, altText: product.displayName },
    colours: Array.from(colourMap.entries()).map(([name, data]) => ({
      value:   name,
      name:    name.charAt(0).toUpperCase() + name.slice(1),
      hex:     data.hex,
      inStock: data.inStock,
    })),
    sizes: Array.from(sizeMap.entries()).map(([size, inStock]) => ({
      value: size,
      label: size,
      inStock,
    })),
  }
}
