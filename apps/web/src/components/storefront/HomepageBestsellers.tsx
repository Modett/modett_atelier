'use client'

import { useCallback, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import { FeaturedProductSection } from '@modett/ui'
import type { ProductCardProps } from '@modett/ui'
import { useHomepage } from '@/hooks/useHomepage'
import { useSession } from '@/hooks/useSession'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { formatMoney } from '@/hooks/useCurrency'
import { HOMEPAGE_BESTSELLERS } from '@/lib/placeholder-data'
import { productImagePlaceholderUrl } from '@/lib/assets'
import type { ProductSummary } from '@/types'

const COLOUR_HEX_MAP: Record<string, string> = {
  ivory:       '#FFFFF0',
  sage:        '#C1D2CC',
  umber:       '#765C4D',
  ecru:        '#C2B280',
  sand:        '#D2B48C',
  slate:       '#708090',
  black:       '#232D35',
  camel:       '#C19A6B',
  charcoal:    '#4A4A4A',
  blush:       '#E8C4C4',
  white:       '#F8F5F2',
  cream:       '#F5F0E8',
  beige:       '#D4C4A8',
  oatmeal:     '#D4C4A8',
  taupe:       '#A89F91',
  grey:        '#8B8B8B',
  navy:        '#2C3E50',
  olive:       '#6B7B5C',
  terracotta:  '#C78869',
  champagne:   '#C1AB85',
  burgundy:    '#722F37',
  khaki:       '#BDB76B',
  stone:       '#928E85',
  mist:        '#D4DDD9',
  rust:        '#B7410E',
  forest:      '#228B22',
  midnight:    '#191970',
  rose:        '#FF007F',
  coral:       '#FF7F50',
  wine:        '#722F37',
}

function mapProductToCardProps(
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
      value: name,
      name:  name.charAt(0).toUpperCase() + name.slice(1),
      hex:   data.hex,
      inStock: data.inStock,
    })),
    sizes: Array.from(sizeMap.entries()).map(([size, inStock]) => ({
      value: size,
      label: size,
      inStock,
    })),
  }
}

export function HomepageBestsellers() {
  const router                        = useRouter()
  const { data: homepage }            = useHomepage()
  const { isLoggedIn }                = useSession()
  const { openPanel }                 = useAuthPanel()
  const { data: wishlistItems }       = useWishlist()
  const toggleWishlist                = useToggleWishlist()
  const addToCart                     = useAddToCart()

  const featuredProducts = homepage?.featuredProducts ?? []

  const wishlistIds = useMemo(
    () => new Set(wishlistItems?.map(item => item.productId) ?? []),
    [wishlistItems],
  )

  const cardProps: ProductCardProps[] = useMemo(() => {
    if (featuredProducts.length === 0) return HOMEPAGE_BESTSELLERS
    return featuredProducts.map(p => mapProductToCardProps(p, wishlistIds))
  }, [featuredProducts, wishlistIds])

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
      const product = featuredProducts.find(p => p.id === productId)
      if (!product) return
      const variant = product.variants?.find(
        v => v.color === colourValue && v.size === sizeValue
      )
      if (!variant) return
      addToCart.mutate({ variantId: variant.variantId, qty: 1 })
    },
    [featuredProducts, addToCart],
  )

  return (
    <FeaturedProductSection
      eyebrow="Best Selling"
      heading="Investment Pieces"
      description="Born from subtle complexity. Crafted for the woman who values quiet confidence."
      products={cardProps}
      viewAllHref="/collections"
      shopAllText="Shop All Investment Pieces"
      shopAllHref="/collections"
      maxProducts={6}
      columns={3}
      onCardClick={handleCardClick}
      onWishlistToggle={handleWishlistToggle}
      onQuickAddToCart={handleQuickAddToCart}
    />
  )
}
