'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { FitChartDrawer } from './FitChartDrawer'
import type { ProductVariant } from '@/types'

// Legacy EU size order — kept only as sort fallback.
// All database sizes are now UK format ('UK 6', 'UK 8', etc.).
// EU_SIZE_ORDER.indexOf() will always return -1 for UK strings,
// which correctly falls through to the numeric extraction path.
const EU_SIZE_ORDER = ['34', '36', '38', '40', '42', '44', '48', '50', '52']

/**
 * Handles both EU numeric ("34", "36") and UK prefixed ("UK 6", "UK 8", "UK 10") formats.
 * Exact EU matches sort first by the known order.
 * Everything else is sorted by the extracted number so "UK 6" < "UK 8" < "UK 10".
 */
function sizeSort(a: ProductVariant, b: ProductVariant): number {
  const ai = EU_SIZE_ORDER.indexOf(a.size)
  const bi = EU_SIZE_ORDER.indexOf(b.size)

  // Both in known EU order
  if (ai !== -1 && bi !== -1) return ai - bi

  // Extract numeric part for anything else
  const an = parseInt(a.size.replace(/\D/g, ''), 10)
  const bn = parseInt(b.size.replace(/\D/g, ''), 10)
  if (!isNaN(an) && !isNaN(bn)) return an - bn

  return a.size.localeCompare(b.size)
}

/**
 * Keep only one variant per size value.
 * Among duplicates, prefer an in-stock variant over an OOS one.
 */
function dedupeBySize(variants: ProductVariant[]): ProductVariant[] {
  const seen = new Map<string, ProductVariant>()
  for (const v of variants) {
    const existing = seen.get(v.size)
    if (!existing || v.stockStatus !== 'OUT_OF_STOCK') {
      seen.set(v.size, v)
    }
  }
  return Array.from(seen.values())
}

interface SizeSelectorProps {
  sizesForColour:    ProductVariant[]
  selectedSize:      string | null
  onSizeChange:      (size: string) => void
  hasColourSelected: boolean
  className?:        string
}

export function SizeSelector({
  sizesForColour,
  selectedSize,
  onSizeChange,
  hasColourSelected,
  className,
}: SizeSelectorProps) {
  const [fitChartOpen, setFitChartOpen] = useState(false)

  // One button per unique size. If a size has both IN_STOCK and OOS rows,
  // keep the in-stock one so the button appears available.
  const sortedSizes = dedupeBySize([...sizesForColour].sort(sizeSort))

  // Placeholder ghost sizes when no colour selected
  const ghostSizes = ['UK 6', 'UK 8', 'UK 10', 'UK 12', 'UK 14', 'UK 16']

  const isSelectedOOS =
    selectedSize
      ? (sizesForColour.find((v) => v.size === selectedSize)?.stockStatus === 'OUT_OF_STOCK')
      : false

  return (
    <div className={cn('', className)}>

      {/* Label row */}
      <div className="flex items-center justify-between mb-3">
        <p className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber">
          Size{selectedSize ? `: ${selectedSize}` : ''}
        </p>
        <button
          type="button"
          onClick={() => setFitChartOpen(true)}
          className="font-body font-light text-[11px] text-muted-foreground underline underline-offset-2 hover:text-umber transition-colors duration-200 cursor-pointer"
        >
          Fit Chart
        </button>
      </div>

      {/* Size buttons */}
      <div
        className="flex flex-wrap gap-2"
        role="radiogroup"
        aria-label="Size selection"
      >
        {!hasColourSelected ? (
          ghostSizes.map((size) => (
            <div
              key={size}
              className="h-10 min-w-[44px] px-3 border border-muted/40 flex items-center justify-center font-body font-light text-[12px] text-muted-foreground/30 cursor-default"
            >
              {size}
            </div>
          ))
        ) : sortedSizes.length === 0 ? (
          <p className="font-body text-[12px] text-muted-foreground">
            No sizes available
          </p>
        ) : (
          sortedSizes.map((variant) => {
            const isOOS      = variant.stockStatus === 'OUT_OF_STOCK'
            const isSelected = selectedSize === variant.size

            return (
              <button
                key={variant.size}
                type="button"
                role="radio"
                aria-checked={isSelected}
                onClick={() => onSizeChange(variant.size)}
                aria-label={`Size ${variant.size}${isOOS ? ' — out of stock' : ''}`}
                className={cn(
                  // Auto-width: shrinks to content but never narrower than 44px
                  'h-10 min-w-[44px] px-3 flex items-center justify-center',
                  'font-body font-light text-[12px]',
                  'cursor-pointer transition-all duration-200',
                  isSelected
                    ? isOOS
                      ? 'bg-umber/60 text-background border border-umber/60'
                      : 'bg-umber text-background border border-umber'
                    : isOOS
                      ? 'border border-muted text-muted-foreground/40 line-through'
                      : 'border border-muted text-umber hover:border-umber',
                )}
              >
                {variant.size}
              </button>
            )
          })
        )}
      </div>

      {/* OOS warning */}
      {isSelectedOOS && (
        <p className="font-body font-light text-[11px] text-muted-foreground mt-2">
          This size is sold out. Select a different size to add to cart.
        </p>
      )}

      {/* Model info */}
      <p className="font-body font-light text-[11px] text-muted-foreground italic mt-3">
        Model is 5&apos;10&quot; and wears a size UK 10.
      </p>

      <FitChartDrawer
        open={fitChartOpen}
        onClose={() => setFitChartOpen(false)}
        selectedSize={selectedSize}
      />
    </div>
  )
}
