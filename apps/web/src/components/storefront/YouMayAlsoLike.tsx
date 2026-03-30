'use client'

import { useMemo, useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { ProductCard, type ProductCardProps } from '@modett/ui'
import { cn } from '@/lib/utils'
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

const ITEMS_PER_PAGE = 6

interface YouMayAlsoLikeProps {
  currentProductId: string
  categoryId:       string | null
}

export function YouMayAlsoLike({
  currentProductId,
  categoryId,
}: YouMayAlsoLikeProps) {
  const router                  = useRouter()
  const { isLoggedIn }          = useSession()
  const { openPanel }           = useAuthPanel()
  const { data: wishlistItems } = useWishlist()
  const toggleWishlist          = useToggleWishlist()
  const addToCart               = useAddToCart()
  const [page, setPage]         = useState(1)

  const {
    data: sameCatData,
    isLoading: sameCatLoading,
  } = useProducts({
    category: categoryId ?? undefined,
    limit: 12,
  })

  const { data: allCatData } = useProducts({ limit: 24 })

  const wishlistIds = useMemo(
    () => new Set(wishlistItems?.map((item) => item.productId) ?? []),
    [wishlistItems],
  )

  const sortedProducts = useMemo(() => {
    const sameCat = flattenProducts(sameCatData).filter(
      (p) => p.id !== currentProductId,
    )
    const sameCatIds = new Set(sameCat.map((p) => p.id))

    const others = flattenProducts(allCatData).filter(
      (p) => p.id !== currentProductId && !sameCatIds.has(p.id),
    )

    return [...sameCat, ...others]
  }, [sameCatData, allCatData, currentProductId])

  const displayedProducts = sortedProducts.slice(0, page * ITEMS_PER_PAGE)
  const canLoadMore = displayedProducts.length < sortedProducts.length

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
      const product = sortedProducts.find((p) => p.id === productId)
      if (!product) return
      const variant = product.variants?.find(
        (v) => v.color === colourValue && v.size === sizeValue,
      )
      if (!variant) return
      addToCart.mutate({ variantId: variant.variantId, qty: 1 })
    },
    [sortedProducts, addToCart],
  )

  const cardProps: ProductCardProps[] = displayedProducts.map((p) =>
    mapToCardProps(p, wishlistIds),
  )

  return (
    <section className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20 border-t border-muted">
      <h2 className="font-display font-bold text-[24px] md:text-[28px] text-umber mb-8 md:mb-10">
        You may also like
      </h2>

      {sameCatLoading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
          {Array.from({ length: 6 }).map((_, i) => (
            <ProductCardSkeleton key={i} />
          ))}
        </div>
      ) : (
        <>
          <div className="grid grid-cols-2 md:grid-cols-3 gap-5 md:gap-6">
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

          {canLoadMore && (
            <div className="text-center mt-10 md:mt-12">
              <button
                type="button"
                onClick={() => setPage((p) => p + 1)}
                className={cn(
                  'h-12 px-16',
                  'bg-deep text-background',
                  'font-body font-light uppercase',
                  'tracking-[0.25em] text-[12px]',
                  'rounded-none hover:bg-ink',
                  'transition-colors duration-200',
                )}
              >
                View More
              </button>
            </div>
          )}
        </>
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

  const defaultColour =
    variants.find((v) => v.stockStatus !== 'OUT_OF_STOCK')?.color
    ?? variants[0]?.color
    ?? null

  const sizeMap = new Map<string, boolean>()
  for (const v of variants) {
    if (!sizeMap.has(v.size)) {
      const inStockForDefault =
        defaultColour !== null &&
        variants.some(
          (vv) =>
            vv.size === v.size &&
            vv.color === defaultColour &&
            vv.stockStatus !== 'OUT_OF_STOCK',
        )
      sizeMap.set(v.size, inStockForDefault)
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
