'use client'

import { useState, useMemo, useCallback } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Heart } from 'lucide-react'
import { ProductCard } from '@modett/ui'
import { cn } from '@/lib/utils'
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist'
import { useAddToCart } from '@/hooks/useCartMutations'
import { mapProductSummaryToCardProps } from '@/lib/mapProductToCardProps'
import { EditItemDrawer } from '@/components/storefront/EditItemDrawer'
import type { CartItem, WishlistItem } from '@/types'

export default function AccountWishlistPage() {
  const router              = useRouter()
  const { data, isLoading } = useWishlist()
  const toggleWishlist      = useToggleWishlist()
  const addToCart           = useAddToCart()
  const [drawerItem, setDrawerItem] = useState<CartItem | null>(null)

  const wishlistIds = useMemo(
    () => new Set((data ?? []).map((i) => i.productId)),
    [data],
  )

  const handleWishlistToggle = useCallback(
    (productId: string) => {
      toggleWishlist.mutate(productId)
    },
    [toggleWishlist],
  )

  const handleCardClick = useCallback(
    (slug: string) => {
      router.push(`/products/${slug}`)
    },
    [router],
  )

  const handleQuickAddToCart = useCallback(
    (productId: string, colourValue: string, sizeValue: string) => {
      const w = (data ?? []).find((i) => i.productId === productId)
      if (!w) return
      const variants = w.product.variants ?? []
      const v = variants.find(
        (vv) => vv.color === colourValue && vv.size === sizeValue,
      )
      if (v && v.stockStatus !== 'OUT_OF_STOCK') {
        addToCart.mutate({ variantId: v.variantId, qty: 1 })
        return
      }
      if (variants.length > 1) {
        setDrawerItem(wishlistToPseudoCartItem(w))
      }
    },
    [addToCart, data],
  )

  if (isLoading) {
    return (
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 bg-muted rounded-none" />
        ))}
      </div>
    )
  }

  const list = data ?? []

  return (
    <div>
      <h1 className="font-display font-bold text-[24px] text-umber mb-8">
        Wishlist
      </h1>

      {list.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-center px-4">
          <Heart
            className="w-16 h-16 text-muted-foreground/30"
            strokeWidth={1}
            aria-hidden
          />
          <p className="font-display font-bold text-[22px] text-umber mt-6">
            Your wishlist is empty
          </p>
          <p className="font-body font-light text-[14px] text-muted-foreground mt-2 max-w-sm">
            Save pieces you love and come back to them anytime.
          </p>
          <Link
            href="/collections"
            className={cn(
              'mt-8 inline-flex h-11 px-10 items-center justify-center',
              'border border-umber text-umber font-body font-light uppercase tracking-[0.2em] text-[12px]',
              'rounded-none hover:bg-umber hover:text-background transition-all',
            )}
          >
            Explore the Collection
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-6">
          {list.map((w) => (
            <ProductCard
              key={w.id}
              {...mapProductSummaryToCardProps(w.product, wishlistIds)}
              isWishlisted
              onWishlistToggle={handleWishlistToggle}
              onCardClick={handleCardClick}
              onQuickAddToCart={handleQuickAddToCart}
            />
          ))}
        </div>
      )}

      <EditItemDrawer item={drawerItem} onClose={() => setDrawerItem(null)} />
    </div>
  )
}

function wishlistToPseudoCartItem(w: WishlistItem): CartItem {
  const variants = w.product.variants ?? []
  const v        = variants.find((x) => x.variantId === w.variantId) ?? variants[0]
  const unit     = w.product.price
  return {
    id:           w.id,
    variantId:    v?.variantId ?? w.variantId ?? '',
    qty:          1,
    productId:    w.productId,
    productSlug:  w.product.slug,
    displayName:  w.product.displayName,
    shortName:    w.product.shortName,
    color:        v?.color ?? '',
    size:         v?.size ?? '',
    image:        w.product.keyImage,
    unitPrice:    unit,
    totalPrice:   unit,
    stockStatus:  v?.stockStatus ?? 'IN_STOCK',
    availableQty: v?.availableQty ?? 0,
  }
}
