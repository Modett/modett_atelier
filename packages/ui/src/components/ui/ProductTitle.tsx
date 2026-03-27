import React from 'react'
import { cn } from '../../lib/utils'

/** Size variant config: main text, subtitle, and gap between lines. */
const sizeConfig = {
  sm: {
    main: 'text-sm md:text-base',
    subtitle: 'text-xs',
    gap: 'gap-y-0.5',
  },
  md: {
    main: 'text-xl md:text-2xl',
    subtitle: 'text-sm',
    gap: 'gap-y-1',
  },
  lg: {
    main: 'text-2xl md:text-3xl',
    subtitle: 'text-sm md:text-base',
    gap: 'gap-y-1.5',
  },
} as const

export interface ProductTitleProps {
  /** Product display name — the main prominent text (e.g. "Crispy silk shirt") */
  displayName: string
  /** Product short name or subtitle — secondary smaller text (e.g. "Easy Fit") */
  shortName?: string
  /** Size variant — controls text sizing for different contexts */
  size?: 'sm' | 'md' | 'lg'
  /**
   * Whether to use Playfair Display (font-display) for the main name instead of Raleway.
   * Default is false — use font-body (Raleway) as shown in the reference.
   * Set to true only for editorial/campaign contexts.
   */
  editorial?: boolean
  /** Truncate the display name to a single line with ellipsis (useful for cards) */
  truncate?: boolean
  /**
   * HTML element for the main name — defaults to 'h1' on PDP, can be 'h2', 'h3', 'p', 'span'
   */
  as?: 'h1' | 'h2' | 'h3' | 'h4' | 'p' | 'span'
  /** Additional className for the outer wrapper */
  className?: string
}

function ProductTitle({
  displayName,
  shortName,
  size = 'md',
  editorial = false,
  truncate = false,
  as: MainTag = 'h1',
  className,
}: ProductTitleProps) {
  const config = sizeConfig[size]

  return (
    <div className={cn('flex flex-col', config.gap, className)}>
      <MainTag
        className={cn(
          'font-normal text-text',
          editorial ? 'font-display' : 'font-body',
          config.main,
          truncate && 'truncate',
        )}
      >
        {displayName}
      </MainTag>
      {shortName && (
        <p
          className={cn(
            'font-body font-normal text-muted-foreground',
            config.subtitle,
            truncate && 'truncate',
          )}
        >
          {shortName}
        </p>
      )}
    </div>
  )
}

ProductTitle.displayName = 'ProductTitle'

export { ProductTitle }
