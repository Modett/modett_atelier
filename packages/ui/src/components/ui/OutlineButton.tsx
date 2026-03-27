import type { ReactNode, ElementType } from 'react'
import { cn } from '../../lib/utils'

const variantClasses = {
  default:
    'border border-muted-foreground/40 text-muted-foreground hover:border-muted-foreground hover:text-text active:border-border active:text-text focus-visible:ring-highlight',
  inverse:
    'border border-background text-background hover:bg-background/10 active:bg-background/15 focus-visible:ring-background/50',
  deep:
    'border border-deep text-deep hover:bg-deep hover:text-background active:brightness-90 focus-visible:ring-highlight',
  foreground:
    'border border-border text-text hover:bg-border hover:text-background active:brightness-90 focus-visible:ring-highlight',
} as const

const sizeClasses = {
  sm:
    'h-9 px-4 text-[11px] md:h-10 md:px-6 md:text-xs tracking-[0.25em]',
  md:
    'h-12 px-8 text-xs md:h-14 md:px-10 md:text-sm tracking-[0.25em]',
  lg:
    'h-14 px-10 text-sm md:h-16 md:px-12 md:text-base tracking-[0.25em]',
} as const

export interface OutlineButtonProps {
  /** The button label text */
  children: ReactNode

  /** Click handler */
  onClick?: () => void

  /** Visual colour variant */
  variant?: 'default' | 'inverse' | 'deep' | 'foreground'

  /** Button size */
  size?: 'sm' | 'md' | 'lg'

  /** Full width — stretches to fill parent container */
  fullWidth?: boolean

  /** Disabled state */
  disabled?: boolean

  /** Loading state — shows spinner and disables interaction */
  isLoading?: boolean

  /** Loading text — shown next to spinner when loading */
  loadingText?: string

  /** HTML button type */
  type?: 'button' | 'submit' | 'reset'

  /** Render as a different element (for Next.js Link usage) */
  as?: ElementType

  /** href — used when `as` is an anchor or Link component */
  href?: string

  /** Additional className for overrides */
  className?: string

  /** Aria label */
  'aria-label'?: string
}

/**
 * OutlineButton — transparent background, thin border, customisable text.
 * "Line button" counterpart to FilledButton. Uses only design tokens:
 * colors, typography (font-body, font-light, tracking-[0.25em]), spacing.
 */
export function OutlineButton({
  children,
  onClick,
  variant = 'default',
  size = 'md',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  loadingText,
  type = 'button',
  as,
  href,
  className,
  'aria-label': ariaLabel,
  ...rest
}: OutlineButtonProps) {
  const Component = as ?? 'button'

  return (
    <Component
      type={Component === 'button' ? type : undefined}
      onClick={onClick}
      disabled={disabled || isLoading}
      href={Component !== 'button' ? href : undefined}
      aria-label={ariaLabel}
      aria-disabled={disabled || isLoading}
      aria-busy={isLoading}
      className={cn(
        'inline-flex items-center justify-center',
        'font-body font-light uppercase',
        'bg-transparent',
        'transition-all duration-200',
        'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-offset-2',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        (disabled || isLoading) &&
          'opacity-50 cursor-not-allowed pointer-events-none',
        className,
      )}
      {...rest}
    >
      {isLoading ? (
        <>
          <span
            className={cn(
              'h-4 w-4 shrink-0 border-2 rounded-full animate-spin mr-3',
              variant === 'inverse'
                ? 'border-background/30 border-t-background'
                : 'border-border/30 border-t-border',
            )}
            aria-hidden
          />
          <span>{loadingText ?? children}</span>
        </>
      ) : (
        children
      )}
    </Component>
  )
}
