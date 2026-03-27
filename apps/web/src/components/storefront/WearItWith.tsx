'use client'

import { useMemo, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProductCard, type ProductCardProps } from '@modett/ui'
import { useSession } from '@/hooks/useSession'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { formatMoney } from '@/hooks/useCurrency'
import { COLOUR_HEX_MAP } from './ColourSelector'
import type { ProductSummary } from '@/types'

interface WearItWithProps {
  relations: ProductSummary[]
}

export function WearItWith({ relations }: WearItWithProps) {
  const router                  = useRouter()
  const { isLoggedIn }          = useSession()
  const { openPanel }           = useAuthPanel()
  const { data: wishlistItems } = useWishlist()
  const toggleWishlist          = useToggleWishlist()
  const addToCart               = useAddToCart()

  const wishlistIds = useMemo(
    () => new Set(wishlistItems?.map((item) => item.productId) ?? []),
    [wishlistItems],
  )

  const handleWishlistToggle = useCallback(
    (productId: string) => {
      if (!isLoggedIn) {
        openPanel()
        return
      }
      toggleWishlist.mutate(productId)
    },
    [isLoggedIn, openPanel, toggleWishlist],
  )

  const handleCardClick = useCallback(
    (slug: string) => {
      router.push(`/products/${slug}`)
    },
    [router],
  )

  const handleQuickAddToCart = useCallback(
    (productId: string, colourValue: string, sizeValue: string) => {
      const product = relations.find((p) => p.id === productId)
      if (!product) return
      const variant = product.variants?.find(
        (v) => v.color === colourValue && v.size === sizeValue,
      )
      if (!variant) return
      addToCart.mutate({ variantId: variant.variantId, qty: 1 })
    },
    [relations, addToCart],
  )

  if (!relations || relations.length === 0) return null

  const cardProps: ProductCardProps[] = relations.map((p) =>
    mapToCardProps(p, wishlistIds),
  )

  return (
    <section className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20">
      <h2 className="font-display font-bold text-[24px] md:text-[28px] text-umber mb-8 md:mb-10">
        Wear it with
      </h2>

      {/* Desktop: 3-column grid */}
      <div className="hidden md:grid grid-cols-3 gap-6 md:gap-8">
        {cardProps.map((card) => (
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

      {/* Mobile: horizontal scroll */}
      <div className="md:hidden flex gap-4 overflow-x-auto pb-4 -mx-4 px-4 scrollbar-hide">
        {cardProps.map((card) => (
          <div key={card.id} className="flex-shrink-0 w-[220px]">
            <ProductCard
              {...card}
              onWishlistToggle={handleWishlistToggle}
              onCardClick={handleCardClick}
              onQuickAddToCart={handleQuickAddToCart}
              isAddingToCart={addToCart.isPending}
            />
          </div>
        ))}
      </div>
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
      : { url: '', altText: product.displayName },
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
