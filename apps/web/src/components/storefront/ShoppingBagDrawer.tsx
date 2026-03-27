'use client'

import { useState, useEffect } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, ShoppingBag, Trash2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { useUpdateCartQty, useRemoveFromCart } from '@/hooks/useCartMutations'
import { formatMoney } from '@/hooks/useCurrency'
import { useUIStore } from '@/store/ui.store'
import { QuantityStepper } from '@/components/shared/QuantityStepper'
import type { CartItem } from '@/types'

export function ShoppingBagDrawer() {
  const { bagOpen, closeBag } = useUIStore()
  const router                = useRouter()

  const {
    items,
    subtotal,
    itemCount,
    isLoading,
    hasOutOfStockItems,
  } = useCart()

  const updateQty      = useUpdateCartQty()
  const removeFromCart = useRemoveFromCart()

  // Lock body scroll when drawer is open
  useEffect(() => {
    document.body.style.overflow = bagOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [bagOpen])

  // Escape key closes drawer
  useEffect(() => {
    if (!bagOpen) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') closeBag()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [bagOpen, closeBag])

  function handleCheckout() {
    closeBag()
    router.push('/checkout')
  }

  function handleViewBag() {
    closeBag()
    router.push('/cart')
  }

  function handleQtyDecrease(item: CartItem) {
    if (item.qty <= 1) {
      removeFromCart.mutate(item.variantId)
    } else {
      updateQty.mutate({ variantId: item.variantId, qty: item.qty - 1 })
    }
  }

  function handleQtyIncrease(item: CartItem) {
    updateQty.mutate({ variantId: item.variantId, qty: item.qty + 1 })
  }

  return (
    <>
      {/* ── Backdrop ──────────────────────────────────── */}
      <div
        aria-hidden="true"
        onClick={closeBag}
        className={cn(
          'fixed inset-0 z-40 bg-graphite/40',
          'transition-opacity duration-200',
          bagOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      />

      {/* ── Panel ─────────────────────────────────────── */}
      <div
        role="dialog"
        aria-modal="true"
        aria-label="Shopping bag"
        className={cn(
          'fixed top-0 right-0 bottom-0 z-50',
          'w-full max-w-[480px]',
          'bg-background flex flex-col',
          'shadow-[-6px_0_32px_rgba(35,45,53,0.10)]',
          'transition-transform duration-300 ease-out',
          bagOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >

        {/* ── HEADER ──────────────────────────────────── */}
        <div className="flex items-center justify-between h-16 px-6 border-b border-muted flex-shrink-0">

          <div className="flex items-center gap-3">
            <ShoppingBag className="w-5 h-5 text-umber flex-shrink-0" />
            <h2 className="font-body font-light text-[13px] uppercase tracking-[0.2em] text-umber">
              Your Shopping Bag ({itemCount})
            </h2>
          </div>

          <button
            onClick={closeBag}
            aria-label="Close shopping bag"
            className="text-muted-foreground hover:text-umber transition-colors duration-200 p-1 -mr-1"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* ── ITEMS LIST ──────────────────────────────── */}
        <div className="flex-1 overflow-y-auto px-6 overscroll-contain">

          {isLoading ? (
            <div className="py-5 space-y-5">
              {[1, 2].map(i => (
                <div key={i} className="flex gap-4 animate-pulse">
                  <div className="w-20 h-24 bg-surface-raised flex-shrink-0" />
                  <div className="flex-1 space-y-2 pt-1">
                    <div className="h-3 bg-surface-raised rounded w-3/4" />
                    <div className="h-3 bg-surface-raised rounded w-1/2" />
                    <div className="h-3 bg-surface-raised rounded w-2/5" />
                  </div>
                </div>
              ))}
            </div>
          ) : items.length === 0 ? (
            <div className="flex flex-col items-center justify-center h-full py-16 text-center">
              <ShoppingBag className="w-10 h-10 text-muted-foreground/30 mb-4" />
              <p className="font-display font-bold text-[18px] text-umber mb-2">
                Your bag is empty
              </p>
              <p className="font-body font-light text-[13px] text-muted-foreground mb-6">
                Add items to get started
              </p>
              <button
                onClick={() => {
                  closeBag()
                  router.push('/collections')
                }}
                className={cn(
                  'h-11 px-8',
                  'border border-umber text-umber',
                  'font-body font-light uppercase tracking-[0.25em] text-[12px]',
                  'rounded-none hover:bg-umber hover:text-background',
                  'transition-all duration-200',
                )}
              >
                Shop Now
              </button>
            </div>
          ) : (
            <div className="divide-y divide-muted">
              {items.map(item => (
                <CartItemRow
                  key={item.id}
                  item={item}
                  onDecrease={() => handleQtyDecrease(item)}
                  onIncrease={() => handleQtyIncrease(item)}
                  onRemove={() => removeFromCart.mutate(item.variantId)}
                  isPending={updateQty.isPending || removeFromCart.isPending}
                  onClose={closeBag}
                />
              ))}
            </div>
          )}

        </div>

        {/* ── FOOTER ──────────────────────────────────── */}
        {items.length > 0 && (
          <div className="flex-shrink-0 border-t border-muted px-6 pt-5 pb-6 bg-background">

            {/* Subtotal */}
            <div className="flex justify-between items-baseline mb-5">
              <span className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber">
                Subtotal
              </span>
              <span className="font-body font-light text-[15px] text-umber">
                {subtotal ? formatMoney(subtotal) : '—'}
              </span>
            </div>

            {/* Proceed to Checkout */}
            <button
              onClick={handleCheckout}
              disabled={hasOutOfStockItems}
              className={cn(
                'w-full h-13',
                'bg-deep text-background',
                'font-body font-light uppercase tracking-[0.25em] text-[13px]',
                'rounded-none',
                'hover:bg-ink transition-colors duration-200',
                'disabled:opacity-40 disabled:cursor-not-allowed',
              )}
              aria-label="Proceed to checkout"
            >
              Proceed to Checkout
            </button>

            {/* Divider */}
            <div className="flex items-center gap-3 my-4">
              <div className="flex-1 h-px bg-muted" />
              <span className="font-body font-light text-[11px] text-muted-foreground">
                or
              </span>
              <div className="flex-1 h-px bg-muted" />
            </div>

            {/* View Bag — secondary text link */}
            <div className="text-center">
              <button
                onClick={handleViewBag}
                className="font-body font-light text-[12px] uppercase tracking-[0.2em] text-umber underline underline-offset-4 hover:text-ink transition-colors duration-200"
              >
                View Bag
              </button>
            </div>

            {/* OOS warning */}
            {hasOutOfStockItems && (
              <p className="font-body font-light text-[11px] text-red-400 text-center mt-3">
                Some items in your bag are no longer available.
              </p>
            )}

          </div>
        )}

      </div>
    </>
  )
}


// ── CartItemRow ───────────────────────────────────────────

interface CartItemRowProps {
  item:       CartItem
  onDecrease: () => void
  onIncrease: () => void
  onRemove:   () => void
  isPending:  boolean
  onClose:    () => void
}

function CartItemRow({
  item,
  onDecrease,
  onIncrease,
  onRemove,
  isPending,
  onClose,
}: CartItemRowProps) {
  const router                      = useRouter()
  const [isRemoving, setIsRemoving] = useState(false)

  function handleRemoveClick() {
    setIsRemoving(true)
    setTimeout(() => onRemove(), 200)
  }

  return (
    <div
      className={cn(
        'py-5 flex gap-4',
        'transition-opacity duration-200',
        isRemoving ? 'opacity-0' : 'opacity-100',
      )}
    >

      {/* Product image */}
      <div
        className="relative w-[88px] flex-shrink-0 bg-surface-raised cursor-pointer overflow-hidden"
        style={{ aspectRatio: '3/4' }}
        onClick={() => {
          onClose()
          router.push(`/products/${item.productSlug}`)
        }}
      >
        {item.image ? (
          <Image
            src={item.image.url}
            alt={item.image.altText ?? item.displayName}
            fill
            sizes="88px"
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-surface-raised" />
        )}
      </div>

      {/* Item details */}
      <div className="flex-1 min-w-0 flex flex-col">

        {/* Top row: name + delete */}
        <div className="flex items-start justify-between gap-2">
          <h3
            className="font-body font-medium text-[14px] text-umber leading-snug flex-1 cursor-pointer"
            onClick={() => {
              onClose()
              router.push(`/products/${item.productSlug}`)
            }}
          >
            {item.displayName}
          </h3>
          <button
            onClick={handleRemoveClick}
            disabled={isPending}
            aria-label={`Remove ${item.displayName} from bag`}
            className="text-muted-foreground hover:text-umber transition-colors duration-200 flex-shrink-0 disabled:opacity-40"
          >
            <Trash2 className="w-[18px] h-[18px]" />
          </button>
        </div>

        {/* Details */}
        <div className="mt-1.5 space-y-0.5">
          <p className="font-body font-light text-[12px] text-muted-foreground">
            Color: {item.color}
          </p>
          <p className="font-body font-light text-[12px] text-muted-foreground">
            Size: {item.size}
          </p>
          <p className="font-body font-light text-[11px] text-muted-foreground/60">
            SKU: {item.variantId.slice(0, 16).toUpperCase()}
          </p>
        </div>

        {/* Qty stepper + price — pushed to bottom */}
        <div className="flex items-center justify-between mt-auto pt-3">
          <QuantityStepper
            qty={item.qty}
            onDecrease={onDecrease}
            onIncrease={onIncrease}
            maxQty={Math.min(10, item.availableQty)}
            isPending={isPending}
            size="sm"
          />

          <p className="font-body font-light text-[15px] text-umber whitespace-nowrap">
            {formatMoney(item.totalPrice)}
          </p>
        </div>

        {/* Stock warnings */}
        {item.stockStatus === 'LOW_STOCK' && (
          <p className="font-body font-light text-[11px] text-highlight mt-1.5">
            Only {item.availableQty} left
          </p>
        )}
        {item.stockStatus === 'OUT_OF_STOCK' && (
          <p className="font-body font-light text-[11px] text-red-400 mt-1.5">
            This item is no longer available
          </p>
        )}

      </div>
    </div>
  )
}
