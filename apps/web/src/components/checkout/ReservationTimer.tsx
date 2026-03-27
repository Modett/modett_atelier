'use client'

import { useState, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useCheckoutStore } from '@/store/checkout.store'

export function ReservationTimer() {
  const expiresAt = useCheckoutStore((s) => s.expiresAt)
  const paymentSubmitted = useCheckoutStore((s) => s.paymentSubmitted)
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout)
  const router = useRouter()

  const [remaining, setRemaining] = useState<number>(0)
  const [expired, setExpired] = useState(false)

  useEffect(() => {
    if (!expiresAt) return
    const update = () => {
      const diff = new Date(expiresAt).getTime() - Date.now()
      if (diff <= 0) {
        setRemaining(0)
        setExpired(true)
      } else {
        setRemaining(diff)
      }
    }
    update()
    const interval = setInterval(update, 1000)
    return () => clearInterval(interval)
  }, [expiresAt])

  const handleReturnToBag = useCallback(() => {
    clearCheckout()
    router.push('/cart')
  }, [clearCheckout, router])

  if (paymentSubmitted) return null
  if (!expiresAt) return null

  const minutes = Math.floor(remaining / 60000)
  const seconds = Math.floor((remaining % 60000) / 1000)
  const display = `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`

  const isWarning = remaining > 0 && remaining <= 5 * 60 * 1000
  const isCritical = remaining > 0 && remaining <= 60 * 1000

  if (expired) {
    return (
      <div className="fixed inset-0 z-50 flex items-center justify-center bg-ink/60">
        <div className="bg-background p-8 max-w-md mx-4 text-center">
          <div className="w-12 h-12 mx-auto mb-4 rounded-full bg-red-50 flex items-center justify-center">
            <span className="text-red-500 text-xl">×</span>
          </div>
          <h3 className="font-display font-bold text-[22px] text-umber mb-3">
            Your reservation has expired
          </h3>
          <p className="font-body font-light text-[14px] text-muted-foreground mb-6 leading-relaxed">
            The items in your bag were held for 30 minutes.
            Your selection has been returned to stock.
          </p>
          <button
            type="button"
            onClick={handleReturnToBag}
            className={cn(
              'w-full h-12',
              'bg-deep text-background',
              'font-body font-light uppercase tracking-[0.25em] text-[13px]',
              'rounded-none hover:bg-ink transition-colors duration-200',
            )}
          >
            Return to Bag
          </button>
        </div>
      </div>
    )
  }

  return (
    <div
      className={cn(
        'font-body font-light text-[13px] py-2 text-center transition-colors duration-300',
        isCritical && 'text-red-500 bg-red-50',
        isWarning && !isCritical && 'text-highlight bg-highlight/10',
        !isWarning && 'text-muted-foreground',
      )}
    >
      Your reservation expires in {display}
    </div>
  )
}
