import type { ReactNode } from 'react'
import { cn } from '../../lib/utils'

const variantStyles = {
  deep: {
    base: 'bg-deep text-background',
    hover: 'hover:brightness-110',
    active: 'active:brightness-95',
    focus: 'focus-visible:ring-highlight',
    disabled: 'disabled:opacity-50',
  },
  foreground: {
    base: 'bg-foreground text-background',
    hover: 'hover:brightness-125',
    active: 'active:brightness-90',
    focus: 'focus-visible:ring-highlight',
    disabled: 'disabled:opacity-50',
  },
  highlight: {
    base: 'bg-highlight text-foreground',
    hover: 'hover:brightness-110',
    active: 'active:brightness-95',
    focus: 'focus-visible:ring-foreground',
    disabled: 'disabled:opacity-50',
  },
  umber: {
    base: 'bg-umber text-background',
    hover: 'hover:brightness-110',
    active: 'active:brightness-95',
    focus: 'focus-visible:ring-highlight',
    disabled: 'disabled:opacity-50',
  },
} as const

const sizeStyles = {
  sm: 'h-10 text-xs',
  md: 'h-12 md:h-14 text-sm md:text-base',
  lg: 'h-14 md:h-[60px] text-base md:text-lg',
} as const

const baseStyles = [
  'font-body',
  'font-light',
  'uppercase',
  'tracking-[0.25em]',
  'inline-flex',
  'items-center',
  'justify-center',
  'gap-2',
  'rounded-none',
  'transition-all',
  'duration-200',
  'cursor-pointer',
  'focus-visible:outline-none',
  'focus-visible:ring-2',
  'focus-visible:ring-inset',
  'disabled:cursor-not-allowed',
].join(' ')

export interface FilledButtonProps {
  /** The button label text — rendered uppercase automatically */
  children: ReactNode

  /** Click handler */
  onClick?: () => void

  /** Button type attribute */
  type?: 'button' | 'submit' | 'reset'

  /**
   * Colour variant controlling background and text.
   * - 'deep': bg-deep, text warm-white (default — dark blue-grey, the primary CTA)
   * - 'foreground': bg-foreground, text warm-white (graphite — secondary CTA)
   * - 'highlight': bg-highlight, text foreground (brushed gold — loyalty/sale actions ONLY)
   * - 'umber': bg-umber, text warm-white (earthy — brand-specific accents)
   *
   * All colour values come from tokens/colors.ts
   */
  variant?: 'deep' | 'foreground' | 'highlight' | 'umber'

  /**
   * Size controlling height and text size.
   * - 'sm': h-10 (40px), text-xs
   * - 'md': h-12 md:h-14 (48px mobile, 56px desktop), text-sm md:text-base (default)
   * - 'lg': h-14 md:h-[60px] (56px mobile, 60px desktop), text-base md:text-lg
   */
  size?: 'sm' | 'md' | 'lg'

  /** Full width — stretches to fill parent container */
  fullWidth?: boolean

  /** Disabled state — dims the button, prevents interaction */
  disabled?: boolean

  /** Loading state — shows spinner, disables interaction */
  isLoading?: boolean

  /** Text to show during loading (defaults to "LOADING...") */
  loadingText?: string

  /** Optional icon element to render before the text */
  leftIcon?: ReactNode

  /** Optional icon element to render after the text */
  rightIcon?: ReactNode

  /** HTML anchor href — renders as <a> instead of <button> */
  href?: string

  /** Additional Tailwind classes */
  className?: string

  /** Accessible label (when children is not descriptive enough) */
  'aria-label'?: string
}

/**
 * FilledButton — solid-background CTA used across PDP, checkout, account, etc.
 * Uses only tokens: colors, typography (font-body, font-light, tracking-[0.25em]), spacing.
 */
export function FilledButton({
  children,
  onClick,
  type = 'button',
  variant = 'deep',
  size = 'md',
  fullWidth = false,
  disabled = false,
  isLoading = false,
  loadingText,
  leftIcon,
  rightIcon,
  href,
  className,
  ...rest
}: FilledButtonProps) {
  const isDisabled = disabled || isLoading
  const Component = href ? 'a' : 'button'

  const sharedProps = {
    className: cn(
      baseStyles,
      variantStyles[variant].base,
      variantStyles[variant].hover,
      variantStyles[variant].active,
      variantStyles[variant].focus,
      variantStyles[variant].disabled,
      sizeStyles[size],
      fullWidth && 'w-full',
      isLoading && 'pointer-events-none',
      className,
    ),
    onClick: !isDisabled ? onClick : undefined,
    'aria-disabled': isDisabled || undefined,
    'aria-busy': isLoading || undefined,
    'aria-label': rest['aria-label'],
  }

  if (Component === 'button') {
    return (
      <button
        {...sharedProps}
        type={type}
        disabled={isDisabled}
      >
        {isLoading ? (
          <>
            <span
              className="h-4 w-4 shrink-0 border-2 border-current/30 border-t-current rounded-full animate-spin"
              aria-hidden
            />
            <span>{loadingText ?? 'LOADING...'}</span>
          </>
        ) : (
          <>
            {leftIcon && <span className="shrink-0">{leftIcon}</span>}
            <span>{children}</span>
            {rightIcon && <span className="shrink-0">{rightIcon}</span>}
          </>
        )}
      </button>
    )
  }

  return (
    <a {...sharedProps} href={href}>
      {isLoading ? (
        <>
          <span
            className="h-4 w-4 shrink-0 border-2 border-current/30 border-t-current rounded-full animate-spin"
            aria-hidden
          />
          <span>{loadingText ?? 'LOADING...'}</span>
        </>
      ) : (
        <>
          {leftIcon && <span className="shrink-0">{leftIcon}</span>}
          <span>{children}</span>
          {rightIcon && <span className="shrink-0">{rightIcon}</span>}
        </>
      )}
    </a>
  )
}
