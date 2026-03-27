import React from 'react'
import { cn } from '../../lib/utils'

// ── Types ───────────────────────────────────────────────────────────────

/** Single colour option for the selector */
export interface ColourOption {
  /** Unique identifier — typically the variant colour value */
  value: string
  /** Display name shown in the label (e.g. "White", "Terracotta", "Sage") */
  name: string
  /** Hex colour code for the swatch fill (e.g. "#FFFFFF", "#C78869") */
  hex: string
  /** Whether this colour is currently in stock */
  inStock?: boolean
}

/** Props for the ColourSelector component */
export interface ColourSelectorProps {
  /** Available colour options */
  colours: ColourOption[]
  /** Currently selected colour value */
  selectedValue?: string
  /** Change handler — receives the selected colour value */
  onChange: (value: string) => void
  /** Label prefix text (default: "COLOUR") */
  label?: string
  /** Swatch size */
  size?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Determines if a hex colour is "light" (needs a border for visibility on light backgrounds).
 * Uses relative luminance — if luminance > 0.7, the colour is considered light.
 */
function isLightColour(hex: string): boolean {
  const clean = hex.replace(/^#/, '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.7
}

// ── Size config (tokens: spacing, typography scale) ───────────────────────

const sizeConfig = {
  sm: {
    label: 'text-body-xs mt-0',
    swatch: 'h-6 w-6',
    gap: 'gap-2',
    mt: 'mt-2',
  },
  md: {
    label: 'text-body-sm mt-0',
    swatch: 'h-8 w-8',
    gap: 'gap-3',
    mt: 'mt-3',
  },
  lg: {
    label: 'text-body mt-0',
    swatch: 'h-10 w-10',
    gap: 'gap-4',
    mt: 'mt-3',
  },
} as const

// ── Component ────────────────────────────────────────────────────────────

/**
 * ColourSelector — circular colour swatches with label "COLOUR : {SELECTED_NAME}".
 * Used on PDP, quick-view modals, and anywhere variant colour selection is needed.
 */
function ColourSelector({
  colours,
  selectedValue,
  onChange,
  label = 'COLOUR',
  size = 'md',
  className,
}: ColourSelectorProps): React.ReactElement {
  const selectedColour = colours.find((c) => c.value === selectedValue)
  const config = sizeConfig[size]

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Label: "COLOUR : WHITE" — uppercase, primary text token */}
      <p
        className={cn(
          'font-body font-medium uppercase tracking-wider text-text',
          config.label
        )}
      >
        {label}
        {selectedColour && (
          <>
            <span className="mx-1">:</span>
            <span>{selectedColour.name.toUpperCase()}</span>
          </>
        )}
      </p>

      {/* Swatch row — radiogroup for accessibility */}
      <div
        className={cn('flex flex-row flex-wrap items-center', config.gap, config.mt)}
        role="radiogroup"
        aria-label={`${label} selection`}
      >
        {colours.map((colour) => {
          const isSelected = colour.value === selectedValue
          const isLight = isLightColour(colour.hex)
          const isOutOfStock = colour.inStock === false

          return (
            <button
              key={colour.value}
              type="button"
              role="radio"
              aria-checked={isSelected}
              aria-label={`${colour.name}${isOutOfStock ? ' — Out of stock' : ''}`}
              disabled={isOutOfStock}
              onClick={() => onChange(colour.value)}
              className={cn(
                'rounded-full transition-all duration-200 relative shrink-0',
                'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2 focus-visible:ring-highlight',
                config.swatch,
                isSelected &&
                  'ring-2 ring-umber ring-offset-2 ring-offset-background',
                !isSelected && isLight && 'border border-surface-raised',
                isOutOfStock && 'opacity-40 cursor-not-allowed',
                !isOutOfStock && 'cursor-pointer hover:scale-110'
              )}
              style={{ backgroundColor: colour.hex }}
            >
              {isOutOfStock && (
                <span
                  className="absolute inset-0 flex items-center justify-center rounded-full"
                  aria-hidden="true"
                >
                  <span className="w-full h-px bg-text/60 rotate-45 absolute" />
                </span>
              )}
            </button>
          )
        })}
      </div>
    </div>
  )
}

ColourSelector.displayName = 'ColourSelector'

export { ColourSelector }
