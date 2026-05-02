'use client'

import { useState, useEffect } from 'react'
import { Truck, Gift, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'
import { useGeo, formatMoney } from '@/hooks/useCurrency'
import { useCart } from '@/hooks/useCart'
import { useShippingMethods, type NormalizedShippingMethod } from '@/hooks/useShippingMethods'
import type { ApiError } from '@/types'

const BOUTIQUES = [
  { id: 'colombo-fort', name: 'Colombo Fort', address: 'No. 1 York Street, Colombo 01' },
  { id: 'colombo-07', name: 'Colombo 07', address: 'No. 45 Galle Road, Colombo 07' },
]

export function ShippingStep() {
  const store = useCheckoutStore()
  const { currency, countryCode, isReady: geoReady } = useGeo()
  const { summary } = useCart()

  const [deliveryType, setDeliveryType] = useState<'home' | 'boutique'>(
    store.deliveryType ?? 'home',
  )
  const [selectedMethodId, setSelectedMethodId] = useState<string | null>(
    store.shippingMethodId,
  )
  const [selectedBoutiqueId, setSelectedBoutiqueId] = useState<string>(
    store.boutiqueId ?? '',
  )
  const [packagingType, setPackagingType] = useState<'standard' | 'gift'>(
    store.giftPackaging ? 'gift' : 'standard',
  )
  const [includeMessage, setIncludeMessage] = useState(!!store.giftMessage)
  const [giftMessage, setGiftMessage] = useState(store.giftMessage ?? '')
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  const {
    data: methods,
    isLoading: methodsLoading,
  } = useShippingMethods({
    countryCode,
    currency,
    subtotal: summary?.subtotal.amount,
    enabled: deliveryType === 'home' && geoReady,
  })

  useEffect(() => {
    if (methods?.length === 1 && !selectedMethodId) {
      const firstMethod = methods[0]
      if (firstMethod) {
        setSelectedMethodId(firstMethod.id)
      }
    }
  }, [methods, selectedMethodId])

  async function handleContinue() {
    setError(null)
    if (deliveryType === 'home' && !selectedMethodId) {
      setError('Please select a shipping method.')
      return
    }
    if (deliveryType === 'boutique' && !selectedBoutiqueId) {
      setError('Please select a boutique.')
      return
    }

    setIsPending(true)
    try {
      if (deliveryType === 'home' && selectedMethodId) {
        await api.post(`/checkout/${store.orderId}/shipping-method`, {
          shippingMethodId: selectedMethodId,
          currency,
        })
      }

      store.setDelivery(deliveryType, selectedMethodId, selectedBoutiqueId || null)
      store.setGiftOptions(packagingType === 'gift', packagingType === 'gift' && includeMessage ? giftMessage : null)
      store.setStep('information')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {error && (
        <p className="font-body text-[12px] text-red-500">{error}</p>
      )}

      {/* Delivery type tabs */}
      <div className="grid grid-cols-2 border border-muted">
        <button
          type="button"
          onClick={() => setDeliveryType('home')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-5 transition-colors duration-200',
            deliveryType === 'home'
              ? 'bg-background'
              : 'bg-surface-raised text-umber',
          )}
        >
          <Truck className={cn('w-6 h-6', deliveryType === 'home' ? 'text-umber' : 'text-umber')} />
          <span className={cn(
            'font-body font-light text-[11px] uppercase tracking-[0.2em]',
            deliveryType === 'home' ? 'text-umber' : 'text-umber',
          )}>
            Receive at Home
          </span>
        </button>
        <button
          type="button"
          onClick={() => setDeliveryType('boutique')}
          className={cn(
            'flex flex-col items-center justify-center gap-2 py-5 transition-colors duration-200',
            deliveryType === 'boutique'
              ? 'bg-background'
              : 'bg-surface-raised text-umber',
          )}
        >
          <Gift className={cn('w-6 h-6', deliveryType === 'boutique' ? 'text-umber' : 'text-umber')} />
          <span className={cn(
            'font-body font-light text-[11px] uppercase tracking-[0.2em]',
            deliveryType === 'boutique' ? 'text-umber' : 'text-umber',
          )}>
            Pick Up in Boutique
          </span>
        </button>
      </div>

      {/* HOME delivery options */}
      {deliveryType === 'home' && (
        <div>
          <h3 className="font-body font-medium text-[14px] text-umber mt-2 mb-4">
            Shipping method
          </h3>
          {methodsLoading ? (
            <div className="space-y-3">
              {[0, 1, 2].map(i => (
                <div key={i} className="flex items-center justify-between py-2">
                  <div className="flex items-center gap-3">
                    <div className="w-4 h-4 rounded-full bg-surface-raised animate-pulse shrink-0" />
                    <div className="space-y-1.5">
                      <div className="h-3 w-32 bg-surface-raised animate-pulse rounded" />
                      <div className="h-2.5 w-20 bg-surface-raised animate-pulse rounded" />
                    </div>
                  </div>
                  <div className="h-3 w-16 bg-surface-raised animate-pulse rounded" />
                </div>
              ))}
            </div>
          ) : methods && methods.length > 0 ? (
            <div className="space-y-3">
              {methods.map((method) => (
                <ShippingMethodRadio
                  key={method.id}
                  method={method}
                  selected={selectedMethodId === method.id}
                  onSelect={() => setSelectedMethodId(method.id)}
                />
              ))}
            </div>
          ) : (
            <p className="font-body font-light text-[13px] text-umber">
              We currently ship to Sri Lanka and Singapore. Your location ({countryCode}) may not
              be supported yet. Please{' '}
              <a href="/contact" className="underline underline-offset-2 hover:text-umber transition-colors">
                contact us
              </a>{' '}
              for shipping options.
            </p>
          )}
        </div>
      )}

      {/* BOUTIQUE pickup */}
      {deliveryType === 'boutique' && (
        <div>
          <label className="font-body font-light text-[13px] text-umber block mb-2">
            Boutique
          </label>
          <select
            value={selectedBoutiqueId}
            onChange={(e) => setSelectedBoutiqueId(e.target.value)}
            className={cn(
              'w-full h-13 px-4 bg-background appearance-none',
              'border border-muted rounded-none',
              'font-body font-light text-[16px] md:text-[14px] text-umber',
              'outline-none focus:border-umber',
              'transition-colors duration-200',
            )}
          >
            <option value="">Choose a Boutique</option>
            {BOUTIQUES.map((b) => (
              <option key={b.id} value={b.id}>{b.name}</option>
            ))}
          </select>
          {selectedBoutiqueId && (
            <p className="font-body font-light text-[12px] text-umber mt-1">
              {BOUTIQUES.find((b) => b.id === selectedBoutiqueId)?.address}
            </p>
          )}
        </div>
      )}

      {/* Packaging section */}
      <div>
        <h3 className="font-body font-medium text-[14px] text-umber mt-4 mb-4">
          Packaging
        </h3>
        <div className="space-y-3">
          <label className="flex items-center gap-3 cursor-pointer">
            <span className={cn(
              'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
              packagingType === 'standard' ? 'border-umber' : 'border-muted-foreground',
            )}>
              {packagingType === 'standard' && (
                <span className="w-2 h-2 rounded-full bg-deep" />
              )}
            </span>
            <input
              type="radio"
              name="packaging"
              value="standard"
              checked={packagingType === 'standard'}
              onChange={() => setPackagingType('standard')}
              className="sr-only"
            />
            <span className="font-body font-light text-[13px] text-umber">
              Standard packaging (free)
            </span>
          </label>

          <label className="flex items-center gap-3 cursor-pointer">
            <span className={cn(
              'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
              packagingType === 'gift' ? 'border-umber' : 'border-muted-foreground',
            )}>
              {packagingType === 'gift' && (
                <span className="w-2 h-2 rounded-full bg-deep" />
              )}
            </span>
            <input
              type="radio"
              name="packaging"
              value="gift"
              checked={packagingType === 'gift'}
              onChange={() => setPackagingType('gift')}
              className="sr-only"
            />
            <span className="font-body font-light text-[13px] text-umber">
              Gift packaging
            </span>
          </label>

          {packagingType === 'gift' && (
            <div className="ml-7 space-y-3">
              <label className="flex items-center gap-2 cursor-pointer">
                <div
                  className={cn(
                    'w-4 h-4 border flex items-center justify-center shrink-0',
                    'transition-colors duration-200',
                    includeMessage ? 'bg-umber border-umber' : 'bg-transparent border-muted-foreground',
                  )}
                >
                  {includeMessage && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-background" aria-hidden="true">
                      <path d="M1 4l2.5 2.5L9 1" stroke="currentColor" strokeWidth="1.5" fill="none" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={includeMessage}
                  onChange={(e) => setIncludeMessage(e.target.checked)}
                />
                <span className="font-body font-light text-[13px] text-umber">
                  Write a message to accompany the gift
                </span>
              </label>
              {includeMessage && (
                <div>
                  <textarea
                    value={giftMessage}
                    onChange={(e) => setGiftMessage(e.target.value.slice(0, 200))}
                    maxLength={200}
                    placeholder="Write your message here..."
                    className={cn(
                      'w-full h-24 p-3 bg-background resize-none',
                      'border border-muted rounded-none',
                      'font-body font-light text-[13px] text-umber',
                      'placeholder:text-muted-foreground/60',
                      'outline-none focus:border-umber',
                      'transition-colors duration-200',
                    )}
                  />
                  <p className="font-body font-light text-[11px] text-umber text-right mt-1">
                    {giftMessage.length}/200
                  </p>
                </div>
              )}
            </div>
          )}
        </div>
      </div>

      {/* Continue button */}
      <button
        type="button"
        onClick={handleContinue}
        disabled={isPending}
        className={cn(
          'w-full h-13',
          'bg-deep text-background',
          'font-body font-light uppercase tracking-[0.25em] text-[13px]',
          'rounded-none hover:bg-ink transition-colors duration-200',
          'disabled:opacity-40 disabled:cursor-not-allowed',
        )}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing...
          </span>
        ) : (
          'Continue'
        )}
      </button>
    </div>
  )
}

function ShippingMethodRadio({
  method,
  selected,
  onSelect,
}: {
  method: NormalizedShippingMethod
  selected: boolean
  onSelect: () => void
}) {
  return (
    <label className="flex items-center justify-between cursor-pointer py-2">
      <div className="flex items-center gap-3">
        <span className={cn(
          'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
          selected ? 'border-umber' : 'border-muted-foreground',
        )}>
          {selected && <span className="w-2 h-2 rounded-full bg-umber" />}
        </span>
        <input
          type="radio"
          name="shipping-method"
          value={method.id}
          checked={selected}
          onChange={onSelect}
          className="sr-only"
        />
        <div>
          <span className="font-body font-light text-[13px] text-umber">
            {method.name}
          </span>
          {method.estimatedDays && (
            <span className="font-body font-light text-[12px] text-umber ml-1">
              ({method.estimatedDays})
            </span>
          )}
        </div>
      </div>
      <span className="font-body font-light text-[13px] text-umber">
        {method.cost.isFree ? (
          <span className="flex items-center gap-1.5">
            {method.cost.originalAmount && (
              <span className="line-through text-umber">
                {formatMoney({ amount: method.cost.originalAmount, currency: method.cost.currency })}
              </span>
            )}
            <span className="text-highlight font-medium">FREE</span>
          </span>
        ) : (
          formatMoney({ amount: method.cost.amount, currency: method.cost.currency })
        )}
      </span>
    </label>
  )
}

export function ShippingSummary() {
  const { deliveryType, giftPackaging } = useCheckoutStore()
  if (!deliveryType) return null

  const typeLabel = deliveryType === 'home' ? 'Receive at Home' : 'Pick Up in Boutique'
  const packagingLabel = giftPackaging ? 'Gift packaging' : 'Standard packaging'

  return (
    <p className="font-body font-light text-[13px] text-umber">
      {typeLabel} · {packagingLabel}
    </p>
  )
}
