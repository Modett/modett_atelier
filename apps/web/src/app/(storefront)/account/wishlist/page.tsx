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

  const tryAddToBag = useCallback(
    (w: WishlistItem) => {
      const variants = w.product.variants ?? []
      const colours  = new Set(variants.map((v) => v.color))
      const sizes    = new Set(variants.map((v) => v.size))
      if (colours.size <= 1 && sizes.size <= 1) {
        const v = variants[0]
        if (!v || v.stockStatus === 'OUT_OF_STOCK') return
        addToCart.mutate({ variantId: v.variantId, qty: 1 })
        return
      }
      setDrawerItem(wishlistToPseudoCartItem(w))
    },
    [addToCart],
  )

  if (isLoading) {
    return (
      <div className="animate-pulse grid grid-cols-2 md:grid-cols-3 gap-4">
        {Array.from({ length: 6 }).map((_, i) => (
          <div key={i} className="h-80 bg-muted rounded-none" />
        ))}
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display font-bold text-[24px] text-umber mb-8">
        Wishlist
      </h1>

      {(data ?? []).length === 0 ? (
        <div className="text-center py-20 border border-muted px-6">
          <Heart
            className="w-14 h-14 mx-auto text-muted-foreground/40 mb-4"
            strokeWidth={1}
            aria-hidden
          />
          <p className="font-body font-light text-[14px] text-muted-foreground mb-6">
            Your wishlist is empty
          </p>
          <Link
            href="/collections"
            className={cn(
              'inline-flex h-11 px-10 items-center justify-center',
              'bg-deep text-background font-body font-light uppercase tracking-[0.25em] text-[12px]',
              'rounded-none hover:bg-ink transition-colors duration-200',
            )}
          >
            Continue Shopping
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 md:gap-5">
          {(data ?? []).map((w) => (
            <div key={w.id} className="flex flex-col">
              <ProductCard
                {...mapProductSummaryToCardProps(w.product, wishlistIds)}
                isWishlisted
                onWishlistToggle={handleWishlistToggle}
                onCardClick={handleCardClick}
              />
              <button
                type="button"
                onClick={() => tryAddToBag(w)}
                className="mt-3 font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber hover:underline text-center"
              >
                Add to Bag
              </button>
            </div>
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
