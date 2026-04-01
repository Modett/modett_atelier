'use client'

import Image from 'next/image'
import { useMemo } from 'react'
import { Tag } from 'lucide-react'
import Decimal from 'decimal.js'
import { cn } from '@/lib/utils'
import { useCart } from '@/hooks/useCart'
import { useGeo, formatMoney } from '@/hooks/useCurrency'
import { useShippingEstimate } from '@/hooks/useShippingEstimate'
import { useCheckoutStore } from '@/store/checkout.store'
import { PromoCodeInput } from './PromoCodeInput'
import type {
  CurrencyCode,
  Money,
  CartItem,
  ShippingEstimate,
  ShippingMethodEstimate,
} from '@/types'

interface CheckoutOrderSummaryProps {
  countryCode?: string | null
  selectedMethodId?: string | null
  className?: string
}

export function CheckoutOrderSummary({
  countryCode,
  selectedMethodId,
  className,
}: CheckoutOrderSummaryProps) {
  const store = useCheckoutStore()
  const { items, summary, itemCount } = useCart()
  const { currency, countryCode: geoCountry, isReady: geoReady } = useGeo()

  // Prop countryCode (from address form) takes priority; fall back to geo-detected
  // country so the estimate shows even before the address step is reached.
  const effectiveCountry = countryCode ?? geoCountry

  const {
    data: shippingData,
    isLoading: shippingLoading,
  } = useShippingEstimate({
    countryCode: effectiveCountry,
    currency,
    subtotal: summary?.subtotal.amount ?? '0',
    enabled: !!effectiveCountry && !!summary,
    isReady: geoReady,
  })

  const selectedMethod = selectedMethodId && shippingData
    ? shippingData.methods.find(m => m.id === selectedMethodId) ?? null
    : null

  const activeMethod = selectedMethod
    ?? (shippingData?.methods.length === 1
      ? shippingData.methods[0] ?? null
      : null)

  const shippingCost = activeMethod?.cost ?? null

  const total = useMemo(() => {
    if (!summary) return null
    const subtotal = new Decimal(summary.subtotal.amount)
    const shipping = shippingCost?.isFree
      ? new Decimal('0')
      : shippingCost?.amount
        ? new Decimal(shippingCost.amount)
        : null

    if (shipping === null) return null

    return {
      amount: subtotal.plus(shipping).toFixed(2),
      currency,
    } as Money
  }, [summary, shippingCost, currency])

  return (
    <div className={cn('bg-background', className)}>
      <h2 className="font-display font-bold text-[22px] text-umber pb-4 border-b border-muted mb-0">
        Order Summary ({itemCount} {itemCount === 1 ? 'item' : 'items'})
      </h2>

      <div
        className={cn(
          'max-h-[320px] overflow-y-auto py-4 border-b border-muted',
          'scrollbar-thin scrollbar-track-transparent scrollbar-thumb-muted',
        )}
      >
        {items.length === 0 ? (
          <p className="font-body font-light text-[13px] text-muted-foreground py-4 text-center">
            No items in your bag
          </p>
        ) : (
          <div className="space-y-4">
            {items.map(item => (
              <OrderSummaryItem key={item.id} item={item} />
            ))}
          </div>
        )}
      </div>

      <div className="flex justify-between items-baseline py-3 border-b border-muted">
        <span className="font-body font-light text-[14px] text-umber">
          Subtotal
        </span>
        <span className="font-body font-light text-[14px] text-umber">
          {summary ? formatMoney(summary.subtotal) : '—'}
        </span>
      </div>

      <div className="py-3 border-b border-muted">
        <ShippingRow
          countryCode={effectiveCountry}
          shippingCost={shippingCost}
          shippingLoading={shippingLoading}
          shippingData={shippingData}
          activeMethod={activeMethod}
        />
      </div>

      {store.orderId && (
        <div className="py-4 border-b border-muted">
          <PromoCodeInput />
        </div>
      )}

      {store.promoCode && store.promoDiscount && (
        <div className="flex justify-between items-baseline
                        py-3 border-b border-muted">
          <span className="font-body font-light text-[13px]
                           text-[#4A7C59]">
            Discount ({store.promoCode})
          </span>
          <span className="font-body font-light text-[13px]
                           text-[#4A7C59]">
            −{formatMoney({
              amount:   store.promoDiscount,
              currency: currency as CurrencyCode,
            })}
          </span>
        </div>
      )}

      <div className="flex justify-between items-baseline pt-4">
        <div className="flex items-baseline gap-1">
          <span className="font-display font-bold text-[24px] text-umber">
            Total
          </span>
          <span className="font-body font-light text-[12px] text-muted-foreground">
            Taxes inc.
          </span>
        </div>
        <span className="font-body font-light text-[20px] text-umber">
          {store.orderTotal
            ? formatMoney({
                amount:   store.orderTotal,
                currency: currency as CurrencyCode,
              })
            : total
              ? formatMoney(total)
              : summary
                ? formatMoney(summary.subtotal)
                : '—'}
        </span>
      </div>
    </div>
  )
}

function OrderSummaryItem({ item }: { item: CartItem }) {
  return (
    <div className="flex gap-3 items-start">
      <div className="relative w-[68px] h-[80px] flex-shrink-0 bg-surface-raised overflow-hidden">
        {item.image ? (
          <Image
            src={item.image.url}
            alt={item.image.altText ?? item.displayName}
            fill
            sizes="68px"
            className="object-cover object-top"
          />
        ) : (
          <div className="w-full h-full bg-surface-raised" />
        )}
        {item.qty > 1 && (
          <div className="absolute top-1 right-1 w-5 h-5 rounded-full bg-umber flex items-center justify-center">
            <span className="font-body font-bold text-[10px] text-background leading-none">
              {item.qty}
            </span>
          </div>
        )}
      </div>

      <div className="flex-1 min-w-0">
        <p className="font-body font-light text-[13px] text-umber leading-snug truncate">
          {item.displayName}
        </p>
        <p className="font-body font-light text-[12px] text-muted-foreground mt-0.5">
          Color: {item.color}
          <span className="mx-2 text-muted/60">|</span>
          Size: {item.size}
        </p>
        <p className="font-body font-light text-[13px] text-umber mt-1">
          {formatMoney(item.totalPrice)}
        </p>
      </div>
    </div>
  )
}

interface ShippingRowProps {
  countryCode: string | null | undefined
  shippingCost: ShippingMethodEstimate['cost'] | null
  shippingLoading: boolean
  shippingData: ShippingEstimate | undefined
  activeMethod: ShippingMethodEstimate | null
}

function ShippingRow({
  countryCode,
  shippingCost,
  shippingLoading,
  shippingData,
  activeMethod,
}: ShippingRowProps) {
  if (!countryCode) {
    return (
      <div>
        <div className="flex justify-between items-baseline">
          <span className="font-body font-light text-[13px] text-umber">
            Shipping
          </span>
        </div>
        <p className="font-body font-light text-[12px] text-muted-foreground mt-1">
          Calculated at checkout based on your location
        </p>
      </div>
    )
  }

  if (shippingLoading) {
    return (
      <div className="flex justify-between items-baseline">
        <span className="font-body font-light text-[13px] text-umber">
          Shipping
        </span>
        <div className="h-3 w-20 bg-surface-raised animate-pulse rounded" />
      </div>
    )
  }

  if (shippingCost?.isFree) {
    return (
      <div>
        <div className="flex justify-between items-baseline">
          <span className="font-body font-light text-[13px] text-umber">
            Shipping
          </span>
          <div className="flex items-baseline gap-1.5">
            {shippingCost.originalAmount && (
              <span className="font-body font-light text-[13px] text-muted-foreground line-through">
                {formatMoney({
                  amount: shippingCost.originalAmount,
                  currency: shippingCost.currency,
                })}
              </span>
            )}
            <span className="font-body font-medium text-[13px] text-umber">
              FREE
            </span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 mt-1.5">
          <Tag className="w-3.5 h-3.5 text-muted-foreground" />
          <span className="font-body font-light text-[12px] text-muted-foreground">
            {shippingCost.label}
          </span>
        </div>
      </div>
    )
  }

  if (shippingCost && !shippingCost.isFree) {
    return (
      <div>
        <div className="flex justify-between items-baseline">
          <span className="font-body font-light text-[13px] text-umber">
            Shipping
          </span>
          <span className="font-body font-light text-[13px] text-umber">
            {formatMoney({
              amount: shippingCost.amount,
              currency: shippingCost.currency,
            })}
          </span>
        </div>
        {activeMethod?.estimatedDays && (
          <p className="font-body font-light text-[12px] text-muted-foreground mt-1">
            {activeMethod.estimatedDays} working days after receipt of order confirmation
          </p>
        )}
        {shippingData?.amountUntilFree && (
          <p className="font-body font-light text-[12px] text-muted-foreground mt-1.5">
            Add{' '}
            <span className="text-highlight font-medium">
              {formatMoney({
                amount: shippingData.amountUntilFree,
                currency: shippingData.thresholdCurrency,
              })}
            </span>
            {' '}more for free shipping
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="flex justify-between items-baseline">
      <span className="font-body font-light text-[13px] text-umber">
        Shipping
      </span>
      <span className="font-body font-light text-[12px] text-muted-foreground">
        Not available
      </span>
    </div>
  )
}
