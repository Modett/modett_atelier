'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Plus, AlertCircle, Loader2, Tag } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useGeo, formatMoney } from '@/hooks/useCurrency'
import { useShippingEstimate } from '@/hooks/useShippingEstimate'
import { useCheckoutGuard } from '@/hooks/useCheckoutGuard'
import type { CartSummary } from '@/types'

interface CartOrderSummaryProps {
  summary:            CartSummary | null
  hasOutOfStockItems: boolean
  itemCount:          number
}

export function CartOrderSummary({
  summary,
  hasOutOfStockItems,
  itemCount,
}: CartOrderSummaryProps) {
  const [promoOpen,  setPromoOpen]  = useState(false)
  const [promoCode,  setPromoCode]  = useState('')
  const [promoError, setPromoError] = useState<string | null>(null)

  const { currency, countryCode, isReady: geoReady } = useGeo()

  const { data: shippingEst } = useShippingEstimate({
    countryCode,
    currency,
    subtotal: summary?.subtotal.amount ?? '0',
    enabled: !!summary && parseFloat(summary.subtotal.amount) > 0,
    isReady: geoReady,
  })

  const cheapestMethod = shippingEst?.methods[0] ?? null

  const {
    proceedToCheckout,
    isNavigating,
    guardError,
    setGuardError,
  } = useCheckoutGuard()

  function handleApplyPromo() {
    setPromoError('Promo codes coming soon.')
  }

  const canCheckout = !hasOutOfStockItems && itemCount > 0

  return (
    <div>
      <h2 className="font-display font-bold text-[20px] text-umber mb-4">
        Order Summary
      </h2>

      {/* Subtotal (small, first row) */}
      <div className="flex justify-between items-baseline py-3 border-b border-muted">
        <span className="font-body font-light text-[13px] text-muted-foreground">
          Subtotal
        </span>
        <span className="font-body font-light text-[13px] text-umber">
          {summary ? formatMoney(summary.subtotal) : '—'}
        </span>
      </div>

      {/* Shipping row */}
      <div className="py-3 border-b border-muted">
        <div className="flex justify-between items-baseline">
          <span className="font-body font-light text-[13px] text-muted-foreground">
            Shipping
          </span>
          {cheapestMethod?.cost.isFree ? (
            <div className="flex items-baseline gap-1.5">
              {cheapestMethod.cost.originalAmount && (
                <span className="font-body font-light text-[13px] text-muted-foreground line-through">
                  {formatMoney({
                    amount: cheapestMethod.cost.originalAmount,
                    currency: cheapestMethod.cost.currency,
                  })}
                </span>
              )}
              <span className="font-body font-medium text-[13px] text-umber">
                FREE
              </span>
            </div>
          ) : (
            <span className="font-body font-light text-[12px] text-muted-foreground">
              Calculated at checkout
            </span>
          )}
        </div>
        {cheapestMethod?.cost.isFree && (
          <div className="flex items-center gap-1.5 mt-1.5">
            <Tag className="w-3.5 h-3.5 text-muted-foreground" />
            <span className="font-body font-light text-[12px] text-muted-foreground">
              {cheapestMethod.cost.label}
            </span>
          </div>
        )}
        {!cheapestMethod?.cost.isFree && shippingEst?.amountUntilFree && (
          <p className="font-body font-light text-[12px] text-muted-foreground mt-1.5">
            Add{' '}
            <span className="text-highlight font-medium">
              {formatMoney({
                amount: shippingEst.amountUntilFree,
                currency: shippingEst.thresholdCurrency,
              })}
            </span>
            {' '}more for free shipping
          </p>
        )}
      </div>

      {/* Total (bold, second row) */}
      <div className="flex justify-between items-baseline py-4 border-b border-muted">
        <span className="font-body font-medium text-[15px] text-umber">
          Subtotal
        </span>
        <span className="font-body font-medium text-[18px] text-umber">
          {summary ? formatMoney(summary.subtotal) : '—'}
        </span>
      </div>

      {/* Promo code row */}
      <div className="border-b border-muted">
        <button
          type="button"
          onClick={() => setPromoOpen(p => !p)}
          className="flex justify-between items-center w-full py-4"
        >
          <span className="font-body font-light text-[13px] text-umber">
            Add a Promo Code
          </span>
          <Plus
            className={cn(
              'w-4 h-4 text-umber transition-transform duration-200',
              promoOpen ? 'rotate-45' : 'rotate-0',
            )}
          />
        </button>

        {promoOpen && (
          <div className="pb-4">
            <div className="flex items-end gap-3">
              <div className="flex-1">
                <input
                  type="text"
                  value={promoCode}
                  onChange={e => {
                    setPromoCode(e.target.value.toUpperCase())
                    setPromoError(null)
                  }}
                  placeholder="Enter code"
                  className={cn(
                    'w-full bg-transparent border-b border-muted-foreground',
                    'font-body font-light text-[13px] text-umber',
                    'placeholder:text-muted-foreground/60',
                    'pb-1 outline-none focus:border-umber',
                    'transition-colors duration-200',
                  )}
                />
                {promoError && (
                  <p className="font-body font-light text-[11px] text-red-400 mt-1">
                    {promoError}
                  </p>
                )}
              </div>
              <button
                type="button"
                onClick={handleApplyPromo}
                disabled={!promoCode.trim()}
                className={cn(
                  'font-body font-light text-[12px]',
                  'uppercase tracking-[0.2em] text-umber',
                  'underline underline-offset-4',
                  'hover:text-ink transition-colors duration-200',
                  'disabled:opacity-40 pb-1',
                )}
              >
                Apply
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Guard error */}
      {guardError && (
        <div className="flex items-start gap-2 mt-3 px-3 py-2.5 bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="font-body font-light text-[12px] text-red-600">
            {guardError}
          </p>
        </div>
      )}

      {/* Continue to Checkout */}
      <button
        type="button"
        onClick={() => {
          setGuardError(null)
          proceedToCheckout()
        }}
        disabled={!canCheckout || isNavigating}
        aria-label="Continue to checkout"
        className={cn(
          'w-full h-13 mt-4',
          'bg-deep text-background',
          'font-body font-light uppercase tracking-[0.25em] text-[13px]',
          'rounded-none transition-colors duration-200',
          canCheckout && !isNavigating
            ? 'hover:bg-ink'
            : 'opacity-40 cursor-not-allowed',
        )}
      >
        {isNavigating ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Checking availability...
          </span>
        ) : (
          'Continue to Checkout'
        )}
      </button>

      {/* Need help */}
      <div className="mt-8 space-y-1.5">
        <p className="font-body font-medium text-[13px] text-umber mb-2">
          Need help?
        </p>
        <Link
          href="/contact"
          className="block font-body font-light text-[13px] text-umber hover:text-ink transition-colors duration-200"
        >
          Contact Us
        </Link>
        <Link
          href="/shipping"
          className="block font-body font-light text-[13px] text-umber underline underline-offset-2 hover:text-ink transition-colors duration-200"
        >
          Shipping Policy
        </Link>
        <Link
          href="/returns"
          className="block font-body font-light text-[13px] text-umber underline underline-offset-2 hover:text-ink transition-colors duration-200"
        >
          Returns &amp; Exchanges
        </Link>
      </div>
    </div>
  )
}
