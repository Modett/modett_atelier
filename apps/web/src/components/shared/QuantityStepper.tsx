'use client'

import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'

interface QuantityStepperProps {
  qty:        number
  onDecrease: () => void
  onIncrease: () => void
  maxQty?:    number
  isPending?: boolean
  size?:      'sm' | 'md'
  className?: string
}

export function QuantityStepper({
  qty,
  onDecrease,
  onIncrease,
  maxQty = 10,
  isPending = false,
  size = 'md',
  className,
}: QuantityStepperProps) {
  const isAtMin = qty <= 1
  const isAtMax = qty >= maxQty

  const dimensions = size === 'sm'
    ? 'w-[100px] h-10'
    : 'w-[120px] h-11'

  return (
    <div
      className={cn(
        'inline-flex items-center',
        'border border-muted-foreground',
        'bg-background',
        'rounded-none',
        dimensions,
        className,
      )}
      role="group"
      aria-label="Quantity"
    >
      {/* Minus button */}
      <button
        type="button"
        onClick={onDecrease}
        disabled={isAtMin || isPending}
        aria-label="Decrease quantity"
        className={cn(
          'flex-1 h-full flex items-center justify-center',
          'font-body text-[18px] font-light text-umber',
          'transition-colors duration-150',
          'hover:bg-surface-raised',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'select-none',
        )}
      >
        −
      </button>

      {/* Quantity display */}
      <span
        aria-live="polite"
        aria-atomic="true"
        className={cn(
          'flex-shrink-0 flex items-center justify-center',
          'font-body font-light text-umber',
          'select-none',
          size === 'sm' ? 'w-8 text-[13px]' : 'w-10 text-[14px]',
        )}
      >
        {isPending ? (
          <Loader2 className="w-3 h-3 animate-spin text-umber" />
        ) : (
          qty
        )}
      </span>

      {/* Plus button */}
      <button
        type="button"
        onClick={onIncrease}
        disabled={isAtMax || isPending}
        aria-label="Increase quantity"
        className={cn(
          'flex-1 h-full flex items-center justify-center',
          'font-body text-[18px] font-light text-umber',
          'transition-colors duration-150',
          'hover:bg-surface-raised',
          'disabled:opacity-40 disabled:cursor-not-allowed',
          'select-none',
        )}
      >
        +
      </button>
    </div>
  )
}
