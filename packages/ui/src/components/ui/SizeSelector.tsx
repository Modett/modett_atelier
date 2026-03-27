'use client'

import { cn } from '../../lib/utils'

/** Single size option for the selector */
export interface SizeOption {
  /** Size value (e.g. "UK 6", "UK 8", "UK 10") */
  value: string
  /** Display label (e.g. "UK 6" or just "6") */
  label: string
  /** Whether this size is in stock for the selected colour */
  inStock?: boolean
}

/** Size selection grid with label, Fit Chart link, and optional model info */
export interface SizeSelectorProps {
  /** Available size options */
  sizes: SizeOption[]
  /** Currently selected size value */
  selectedValue?: string
  /** Change handler */
  onChange: (value: string) => void
  /** Label prefix (default: "Size") */
  label?: string
  /** Custom model/fit info text shown below the sizes */
  modelInfo?: string
  /** Handler called when "Fit Chart" is clicked */
  onFitChartClick: () => void
  /** Fit chart link text (default: "Fit Chart") */
  fitChartLabel?: string
  /** Additional className */
  className?: string
}

export function SizeSelector({
  sizes,
  selectedValue,
  onChange,
  label = 'Size',
  modelInfo,
  onFitChartClick,
  fitChartLabel = 'Fit Chart',
  className,
}: SizeSelectorProps) {
  return (
    <div className={cn('', className)}>
      {/* Header row */}
      <div className="flex items-baseline justify-between">
        <p className="font-body text-sm font-normal text-text">
          {label}:
          {selectedValue != null && selectedValue !== '' && (
            <span className="ml-1.5 font-medium">{selectedValue}</span>
          )}
        </p>
        <button
          type="button"
          onClick={onFitChartClick}
          className="font-body text-sm font-normal text-muted-foreground underline underline-offset-4 decoration-muted-foreground/40 transition-colors duration-200 hover:text-umber hover:decoration-umber"
          aria-label="Open size guide"
        >
          {fitChartLabel}
        </button>
      </div>

      {/* Size grid */}
      <div
        className="mt-4 flex flex-wrap gap-x-4 gap-y-3"
        role="radiogroup"
        aria-label="Size selection"
      >
        {sizes.map((sizeOption) => {
          const isSelected = sizeOption.value === selectedValue
          const isOutOfStock = sizeOption.inStock === false

          return (
            <button
              key={sizeOption.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`Size ${sizeOption.label}${isOutOfStock ? ' — Out of stock' : ''}`}
              disabled={isOutOfStock}
              onClick={() => onChange(sizeOption.value)}
              className={cn(
                'relative flex min-h-[44px] min-w-[48px] items-center justify-center font-body text-sm font-normal tracking-[0.15em] transition-colors duration-200',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2',
                isSelected && 'font-medium text-text',
                !isSelected && !isOutOfStock && 'cursor-pointer text-text',
                isOutOfStock && 'cursor-not-allowed text-muted-foreground/40 line-through'
              )}
            >
              {sizeOption.label}

              {/* Selected underline indicator — short bar below text */}
              {isSelected && (
                <span
                  className="absolute bottom-1 left-1/2 h-px w-2/3 -translate-x-1/2 bg-text"
                  aria-hidden
                />
              )}
            </button>
          )
        })}
      </div>

      {/* Model info */}
      {modelInfo != null && modelInfo !== '' && (
        <p className="mt-4 font-body text-xs font-normal text-muted-foreground">
          {modelInfo}
        </p>
      )}
    </div>
  )
}
