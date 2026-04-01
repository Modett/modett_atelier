'use client'

import { useState } from 'react'
import { Tag, X, Check } from 'lucide-react'
import { cn }               from '@/lib/utils'
import { api }              from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'
import type { ApiError }    from '@/types'

interface ApplyPromoResponse {
  data: {
    discountAmount: string
    promoCode:      string
    promoType:      string
    promoValue:     string
    newTotal:       string
  }
}

interface RemovePromoResponse {
  data: { newTotal: string }
}

export function PromoCodeInput() {
  const store = useCheckoutStore()
  const [input, setInput]       = useState(
    store.promoCode ?? '',
  )
  const [isPending, setIsPending] = useState(false)
  const [error, setError]         = useState<string | null>(null)

  const isApplied = !!store.promoCode

  async function handleApply() {
    if (!input.trim() || !store.orderId) return
    setError(null)
    setIsPending(true)
    try {
      const res = await api.post<ApplyPromoResponse>(
        `/checkout/${store.orderId}/promo`,
        { code: input.trim().toUpperCase() },
      )
      store.setPromo(
        res.data.promoCode,
        res.data.discountAmount,
        res.data.promoType,
        res.data.promoValue,
        res.data.newTotal,
      )
      setInput(res.data.promoCode)
    } catch (err: unknown) {
      const apiErr = err as ApiError
      setError(
        apiErr.message ??
          'This promo code could not be applied.',
      )
    } finally {
      setIsPending(false)
    }
  }

  async function handleRemove() {
    if (!store.orderId) return
    setError(null)
    setIsPending(true)
    try {
      const res = await api.delete<RemovePromoResponse>(
        `/checkout/${store.orderId}/promo`,
      )
      store.clearPromo()
      store.setOrderTotal(res.data.newTotal)
      setInput('')
    } catch {
      setError('Could not remove promo code.')
    } finally {
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1.5">
        <Tag className="w-3.5 h-3.5 text-muted-foreground
                        flex-shrink-0" />
        <span className="font-body font-light text-[12px]
                         uppercase tracking-[0.15em]
                         text-muted-foreground">
          Promo code
        </span>
      </div>

      {isApplied ? (
        <div className="flex items-center justify-between
                        px-4 py-3 bg-surface-raised/60
                        border border-muted">
          <div className="flex items-center gap-2">
            <Check className="w-4 h-4 text-[#4A7C59]
                              flex-shrink-0" />
            <span className="font-body font-medium
                             text-[13px] text-umber
                             tracking-[0.05em]">
              {store.promoCode}
            </span>
            <span className="font-body font-light
                             text-[12px] text-[#4A7C59]">
              {store.promoType === 'PERCENT'
                ? `−${store.promoValue}% applied`
                : `−${store.promoDiscount} applied`}
            </span>
          </div>
          <button
            type="button"
            onClick={handleRemove}
            disabled={isPending}
            aria-label="Remove promo code"
            className="text-muted-foreground
                       hover:text-umber transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      ) : (
        <div className="flex gap-2">
          <input
            type="text"
            value={input}
            onChange={(e) =>
              setInput(e.target.value.toUpperCase())
            }
            onKeyDown={(e) => {
              if (e.key === 'Enter') handleApply()
            }}
            placeholder="MODETT-XXXXXX"
            className={cn(
              'flex-1 h-11 px-4 rounded-none',
              'border font-body font-light text-[14px]',
              'text-umber uppercase tracking-[0.05em]',
              'placeholder:text-muted-foreground/50',
              'placeholder:normal-case',
              'placeholder:tracking-normal',
              'outline-none transition-colors duration-200',
              error
                ? 'border-red-400 focus:border-red-400'
                : 'border-muted focus:border-umber',
            )}
          />
          <button
            type="button"
            onClick={handleApply}
            disabled={isPending || !input.trim()}
            className={cn(
              'h-11 px-5 bg-deep text-background',
              'font-body font-light uppercase',
              'tracking-[0.15em] text-[12px]',
              'rounded-none transition-colors duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed',
              'hover:bg-ink',
            )}
          >
            {isPending ? '…' : 'Apply'}
          </button>
        </div>
      )}

      {error && (
        <p className="font-body font-light text-[12px]
                      text-red-500">
          {error}
        </p>
      )}
    </div>
  )
}
