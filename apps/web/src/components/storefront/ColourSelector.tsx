'use client'

import { cn } from '@/lib/utils'
import type { ProductVariant } from '@/types'

export const COLOUR_HEX_MAP: Record<string, string> = {
  ivory:      '#F5EFE0',
  white:      '#F0EDE8',
  ecru:       '#E8DCC8',
  sand:       '#D4C4A8',
  sage:       '#C1D2CC',
  umber:      '#765C4D',
  blush:      '#E8C4B8',
  black:      '#232D35',
  charcoal:   '#4A4A4A',
  camel:      '#C9A87C',
  slate:      '#3E5460',
  cream:      '#F5F0E8',
  beige:      '#D4C4A8',
  oatmeal:    '#D4C4A8',
  taupe:      '#A89F91',
  grey:       '#8B8B8B',
  navy:       '#2C3E50',
  olive:      '#6B7B5C',
  terracotta: '#C78869',
  champagne:  '#C1AB85',
  burgundy:   '#722F37',
  khaki:      '#BDB76B',
  stone:      '#928E85',
  mist:       '#D4DDD9',
  rust:       '#B7410E',
  forest:     '#228B22',
  midnight:   '#191970',
  rose:       '#FF007F',
  coral:      '#FF7F50',
  wine:       '#722F37',
}

function getSwatchColour(colourName: string): string {
  return COLOUR_HEX_MAP[colourName.toLowerCase()] ?? '#C9A87C'
}

function colourHasStock(
  colour: string,
  variants: ProductVariant[],
): boolean {
  return variants
    .filter((v) => v.color === colour)
    .some((v) => v.stockStatus !== 'OUT_OF_STOCK')
}

interface ColourSelectorProps {
  colours:        string[]
  variants:       ProductVariant[]
  selectedColour: string | null
  onColourChange: (colour: string) => void
  className?:     string
}

export function ColourSelector({
  colours,
  variants,
  selectedColour,
  onColourChange,
  className,
}: ColourSelectorProps) {
  return (
    <div className={cn('', className)}>
      <p className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber">
        Colour{selectedColour ? ` : ${selectedColour}` : ''}
      </p>

      <div
        className="flex items-center gap-2.5 mt-2 flex-wrap"
        role="radiogroup"
        aria-label="Colour selection"
      >
        {colours.map((colour) => {
          const hasStock = colourHasStock(colour, variants)
          const isSelected = selectedColour === colour

          return (
            <button
              key={colour}
              type="button"
              role="radio"
              aria-checked={isSelected}
              onClick={() => onColourChange(colour)}
              aria-label={`Select colour ${colour}${!hasStock ? ' — out of stock' : ''}`}
              className={cn(
                'w-[22px] h-[22px] rounded-full',
                'border border-muted',
                'cursor-pointer transition-all duration-200',
                isSelected && 'ring-2 ring-offset-2 ring-umber',
                !hasStock && !isSelected && 'opacity-40',
                !hasStock && isSelected && 'opacity-60',
                hasStock && !isSelected && 'hover:scale-110',
              )}
              style={{ backgroundColor: getSwatchColour(colour) }}
            />
          )
        })}
      </div>
    </div>
  )
}
