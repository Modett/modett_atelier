'use client'

import { useState, useRef, useEffect, Suspense } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import { ShoppingBag, AlertCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { CartItemCard } from '@/components/storefront/CartItemCard'
import { CartOrderSummary } from '@/components/storefront/CartOrderSummary'
import { CartInterestedIn } from '@/components/storefront/CartInterestedIn'
import { EditItemDrawer } from '@/components/storefront/EditItemDrawer'
import type { CartItem } from '@/types'

function ExpiredReservationBanner() {
  const searchParams = useSearchParams()
  if (searchParams.get('expired') !== '1') return null
  return (
    <div className="flex items-start gap-3 bg-highlight/10 border border-highlight/30 px-5 py-3 mt-4">
      <p className="font-body font-light text-[13px] text-umber">
        Your reservation expired — your items have been returned to your bag.
        Complete checkout within 30 minutes to secure them again.
      </p>
    </div>
  )
}

export default function CartPage() {
  const {
    items,
    summary,
    itemCount,
    hasOutOfStockItems,
    isLoading,
  } = useCart()

  const [editingItem, setEditingItem] = useState<CartItem | null>(null)
  const closeTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    return () => {
      if (closeTimerRef.current !== null) {
        clearTimeout(closeTimerRef.current)
      }
    }
  }, [])

  function handleEditDrawerClose() {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
    }
    closeTimerRef.current = setTimeout(() => {
      setEditingItem(null)
      closeTimerRef.current = null
    }, 320)
  }

  function handleEditOpen(item: CartItem) {
    if (closeTimerRef.current !== null) {
      clearTimeout(closeTimerRef.current)
      closeTimerRef.current = null
    }
    setEditingItem(item)
  }

  return (
    <div className="min-h-screen bg-background">
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-8 md:py-12">

        {/* Page title */}
        <h1 className="font-display font-bold text-[28px] md:text-[32px] text-umber pb-4 border-b border-muted mb-0">
          Shopping Bag ({itemCount})
        </h1>

        <Suspense fallback={null}>
          <ExpiredReservationBanner />
        </Suspense>

        {/* Two-column layout (desktop) / single column (mobile) */}
        <div className="flex flex-col lg:flex-row lg:gap-16 lg:items-start mt-0">

          {/* Left column: items */}
          <div className="flex-1 min-w-0">

            {/* OOS warning banner */}
            {hasOutOfStockItems && !isLoading && items.length > 0 && (
              <div className="flex items-start gap-3 bg-red-50 border border-red-200 px-5 py-3 mt-4">
                <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
                <p className="font-body font-light text-[13px] text-red-600">
                  Some items in your bag are no longer available
                  and must be removed before checkout.
                </p>
              </div>
            )}

            {/* Items list */}
            {isLoading ? (
              <CartPageSkeleton />
            ) : items.length === 0 ? (
              <CartEmptyState />
            ) : (
              <div>
                {items.map(item => (
                  <CartItemCard
                    key={item.id}
                    item={item}
                    onEdit={() => handleEditOpen(item)}
                  />
                ))}
              </div>
            )}

            {/* You may also be interested in */}
            {!isLoading && (
              <CartInterestedIn cartItems={items} />
            )}
          </div>

          {/* Right column: order summary */}
          <div className="w-full lg:w-80 xl:w-96 flex-shrink-0 mt-8 lg:mt-4 lg:sticky lg:top-16 lg:self-start">
            <CartOrderSummary
              summary={summary}
              hasOutOfStockItems={hasOutOfStockItems}
              itemCount={itemCount}
            />
          </div>

        </div>
      </div>

      {/* Edit item drawer */}
      <EditItemDrawer
        item={editingItem}
        onClose={handleEditDrawerClose}
      />
    </div>
  )
}


function CartPageSkeleton() {
  return (
    <div className="mt-0">
      {[1, 2, 3].map(i => (
        <div key={i} className="border-b border-muted py-6 animate-pulse">
          {/* Desktop skeleton */}
          <div className="hidden md:flex gap-6 items-start">
            <div className="w-44 h-56 bg-surface-raised flex-shrink-0" />
            <div className="flex-1 space-y-3 pt-2">
              <div className="h-4 bg-surface-raised rounded w-2/3" />
              <div className="h-3 bg-surface-raised rounded w-1/2" />
              <div className="h-3 bg-surface-raised rounded w-1/3" />
              <div className="h-3 bg-surface-raised rounded w-1/4 mt-4" />
              <div className="h-3 bg-surface-raised rounded w-1/4" />
            </div>
            <div className="w-[120px] h-11 bg-surface-raised flex-shrink-0" />
            <div className="w-[100px] h-4 bg-surface-raised flex-shrink-0" />
          </div>
          {/* Mobile skeleton */}
          <div className="md:hidden flex gap-4">
            <div className="w-24 h-32 bg-surface-raised flex-shrink-0" />
            <div className="flex-1 space-y-2">
              <div className="h-3 bg-surface-raised rounded w-3/4" />
              <div className="h-3 bg-surface-raised rounded w-1/2" />
              <div className="h-3 bg-surface-raised rounded w-1/3" />
            </div>
          </div>
        </div>
      ))}
    </div>
  )
}


function CartEmptyState() {
  const router = useRouter()

  return (
    <div className="flex flex-col items-center text-center py-20">
      <ShoppingBag className="w-16 h-16 text-muted-foreground/20 mb-6" />
      <h2 className="font-display font-bold text-[24px] text-umber mb-3">
        Your Shopping Bag is Empty
      </h2>
      <p className="font-body font-light text-[14px] text-muted-foreground mb-8">
        Looks like you haven&apos;t added anything yet.
      </p>
      <button
        onClick={() => router.push('/collections')}
        className={cn(
          'h-13 px-12',
          'border border-umber text-umber',
          'font-body font-light uppercase tracking-[0.25em] text-[13px]',
          'rounded-none hover:bg-umber hover:text-background',
          'transition-all duration-200',
        )}
      >
        Continue Shopping
      </button>
    </div>
  )
}
