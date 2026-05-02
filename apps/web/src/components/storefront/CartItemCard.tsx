'use client'

import { useState } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { Trash2, Heart } from 'lucide-react'
import { cn } from '@/lib/utils'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import { useUpdateCartQty, useRemoveFromCart } from '@/hooks/useCartMutations'
import { useToggleWishlist, useIsWishlisted } from '@/hooks/useWishlist'
import { useSession } from '@/hooks/useSession'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { formatMoney } from '@/hooks/useCurrency'
import type { CartItem } from '@/types'

interface CartItemCardProps {
  item:   CartItem
  onEdit: () => void
}

export function CartItemCard({ item, onEdit }: CartItemCardProps) {
  const router         = useRouter()
  const updateQty      = useUpdateCartQty()
  const removeFromCart = useRemoveFromCart()
  const toggleWishlist = useToggleWishlist()
  const isWishlisted   = useIsWishlisted(item.productId)
  const { isLoggedIn } = useSession()
  const { openPanel }  = useAuthPanel()

  const [isRemoving, setIsRemoving] = useState(false)

  const maxQty     = Math.min(10, item.availableQty)
  const atMax      = item.qty >= maxQty
  const isLowStock = item.stockStatus === 'LOW_STOCK'
  const isOOS      = item.stockStatus === 'OUT_OF_STOCK'

  function handleDecrease() {
    if (item.qty <= 1) {
      handleRemove()
    } else {
      updateQty.mutate({ variantId: item.variantId, qty: item.qty - 1 })
    }
  }

  function handleIncrease() {
    if (item.qty >= maxQty) return
    updateQty.mutate({ variantId: item.variantId, qty: item.qty + 1 })
  }

  function handleRemove() {
    setIsRemoving(true)
    setTimeout(() => removeFromCart.mutate(item.variantId), 200)
  }

  function handleSaveForLater() {
    if (!isLoggedIn) {
      openPanel()
      return
    }
    toggleWishlist.mutate(item.productId)
  }

  return (
    <div
      className={cn(
        'border-b border-muted py-6',
        'transition-opacity duration-200',
        isRemoving ? 'opacity-0' : 'opacity-100',
      )}
    >

      {/* ── DESKTOP LAYOUT ─────────────────────────────── */}
      <div className="hidden md:flex items-start gap-6">

        {/* Product image */}
        <div
          className="relative w-44 flex-shrink-0 cursor-pointer overflow-hidden bg-surface-raised"
          style={{ aspectRatio: '3/4' }}
          onClick={() => router.push(`/products/${item.productSlug}`)}
        >
          {item.image ? (
            <Image
              src={item.image.url}
              alt={item.image.altText ?? item.displayName}
              fill
              sizes="176px"
              className="object-cover object-top hover:scale-[1.02] transition-transform duration-500"
            />
          ) : (
            <div className="w-full h-full bg-surface-raised" />
          )}
        </div>

        {/* Item details */}
        <div className="flex-1 min-w-0">

          <h3 className="font-body font-medium text-[15px] text-graphite leading-snug mb-1">
            {item.displayName}
          </h3>

          <p className="font-body font-light text-[12px] text-umber mb-0.5">
            Style No: {item.variantId.slice(0, 10).toUpperCase()}
            &nbsp;&nbsp;|&nbsp;&nbsp;
            SKU: {item.variantId.toUpperCase()}
          </p>

          <p className="font-body font-light text-[13px] text-umber mb-3">
            {item.color}, {item.size}
          </p>

          {isOOS ? (
            <p className="font-body font-light text-[13px] mb-0.5 text-red-400">
              Out of Stock
            </p>
          ) : isLowStock ? (
            <p className="font-body font-light text-[13px] mb-0.5 text-graphite flex items-center gap-1.5">
              <span className="inline-block w-1 h-1 rounded-full bg-terracotta-clay flex-shrink-0" aria-hidden />
              Low Stock — Only {item.availableQty} left
            </p>
          ) : (
            <p className="font-body font-light text-[13px] mb-0.5 text-graphite">
              In Stock
            </p>
          )}

          <p className="font-body font-light text-[14px] text-graphite mb-4">
            {formatMoney(item.unitPrice)}
          </p>

          <div className="flex items-center gap-4">
            <button
              onClick={onEdit}
              className="font-body font-light text-[13px] text-umber underline underline-offset-4 hover:text-ink transition-colors duration-200"
            >
              Edit
            </button>
            <button
              type="button"
              onClick={handleSaveForLater}
              className="flex items-center gap-1.5 font-body font-light text-[13px] transition-colors duration-200 text-umber hover:text-graphite"
              aria-label={isWishlisted
                ? `Remove ${item.displayName} from wishlist`
                : `Save ${item.displayName} for later`}
            >
              <Heart
                className={cn(
                  'w-4 h-4 transition-colors duration-200',
                  isWishlisted
                    ? 'fill-umber stroke-umber'
                    : 'fill-none stroke-umber',
                )}
              />
              <span>{isWishlisted ? 'Saved' : 'Save for Later'}</span>
            </button>
          </div>
        </div>

        {/* Qty stepper */}
        <div className="flex flex-col items-center gap-2 flex-shrink-0 pt-1">
          <QuantityStepper
            qty={item.qty}
            onDecrease={handleDecrease}
            onIncrease={handleIncrease}
            maxQty={maxQty}
            isPending={updateQty.isPending || removeFromCart.isPending}
            size="md"
          />

          {atMax && isLowStock && (
            <p className="font-body font-light text-[11px] text-umber text-center max-w-[120px] leading-snug">
              Max {maxQty} available
            </p>
          )}
          {atMax && !isLowStock && item.qty >= 10 && (
            <p className="font-body font-light text-[11px] text-umber text-center max-w-[120px] leading-snug">
              Max qty: 10
            </p>
          )}
        </div>

        {/* Item total price */}
        <div className="flex-shrink-0 text-right pt-1 min-w-[100px]">
          <p className="font-body font-medium text-[15px] text-graphite">
            {formatMoney(item.totalPrice)}
          </p>
        </div>

        {/* Delete button */}
        <div className="flex-shrink-0 pt-1">
          <button
            onClick={handleRemove}
            disabled={removeFromCart.isPending}
            aria-label={`Remove ${item.displayName} from bag`}
            className="text-umber hover:text-graphite transition-colors duration-200 disabled:opacity-40"
          >
            <Trash2 className="w-5 h-5" />
          </button>
        </div>

      </div>

      {/* ── MOBILE LAYOUT ──────────────────────────────── */}
      <div className="md:hidden">

        <div className="flex gap-4">

          {/* Product image */}
          <div
            className="relative w-24 flex-shrink-0 cursor-pointer overflow-hidden bg-surface-raised"
            style={{ aspectRatio: '3/4' }}
            onClick={() => router.push(`/products/${item.productSlug}`)}
          >
            {item.image && (
              <Image
                src={item.image.url}
                alt={item.image.altText ?? item.displayName}
                fill
                sizes="96px"
                className="object-cover object-top"
              />
            )}
          </div>

          {/* Details + delete */}
          <div className="flex-1 min-w-0">

            <div className="flex justify-between items-start">
              <h3 className="font-body font-medium text-[14px] text-graphite leading-snug flex-1 pr-2">
                {item.displayName}
              </h3>
              <button
                onClick={handleRemove}
                disabled={removeFromCart.isPending}
                aria-label="Remove item"
                className="text-umber hover:text-graphite transition-colors duration-200 flex-shrink-0 disabled:opacity-40"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            </div>

            <p className="font-body font-light text-[12px] text-umber mt-1">
              {item.color}, {item.size}
            </p>

            {isOOS ? (
              <p className="font-body font-light text-[12px] mt-0.5 text-red-400">
                Out of Stock
              </p>
            ) : isLowStock ? (
              <p className="font-body font-light text-[12px] mt-0.5 text-graphite flex items-center gap-1.5">
                <span className="inline-block w-1 h-1 rounded-full bg-terracotta-clay flex-shrink-0" aria-hidden />
                Only {item.availableQty} left
              </p>
            ) : (
              <p className="font-body font-light text-[12px] mt-0.5 text-graphite">
                In Stock
              </p>
            )}

            <p className="font-body font-light text-[13px] text-graphite mt-1">
              {formatMoney(item.unitPrice)}
            </p>

            <div className="flex items-center justify-between mt-3">
              <QuantityStepper
                qty={item.qty}
                onDecrease={handleDecrease}
                onIncrease={handleIncrease}
                maxQty={maxQty}
                isPending={updateQty.isPending || removeFromCart.isPending}
                size="sm"
              />
              <p className="font-body font-medium text-[14px] text-graphite">
                {formatMoney(item.totalPrice)}
              </p>
            </div>

            {atMax && (
              <p className="font-body font-light text-[11px] text-umber mt-1">
                {isLowStock
                  ? `Max ${maxQty} available due to low stock`
                  : 'Maximum quantity reached (10)'}
              </p>
            )}

            <div className="flex items-center gap-3 mt-3">
              <button
                onClick={onEdit}
                className="font-body font-light text-[12px] text-umber underline underline-offset-4 hover:text-ink transition-colors duration-200"
              >
                Edit
              </button>
              <button
                type="button"
                onClick={handleSaveForLater}
                aria-label={isWishlisted ? 'Remove from wishlist' : 'Save for later'}
                className="flex items-center gap-1"
              >
                <Heart
                  className={cn(
                    'w-3.5 h-3.5 transition-colors duration-200',
                    isWishlisted
                      ? 'fill-umber stroke-umber'
                      : 'fill-none stroke-umber',
                  )}
                />
                <span className="font-body font-light text-[12px] text-umber">
                  {isWishlisted ? 'Saved' : 'Save for Later'}
                </span>
              </button>
            </div>

          </div>
        </div>
      </div>

    </div>
  )
}
