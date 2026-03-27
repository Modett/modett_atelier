import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Props for the RadioGroup component.
 * Wraps a set of RadioButton components with optional label, error, and helper text.
 */
export interface RadioGroupProps {
  /** Group label displayed above the radio options */
  label?: string

  /** Whether the group is required — shows asterisk after label */
  required?: boolean

  /** Layout direction */
  direction?: 'horizontal' | 'vertical'

  /** Error message from form validation */
  error?: string

  /** Helper text shown below the group */
  helperText?: string

  /** Spacing between radio items */
  gap?: 'sm' | 'md' | 'lg'

  /** Radio button children */
  children: React.ReactNode

  /** Additional className for the outer wrapper */
  className?: string
}

const gapClasses = {
  sm: { horizontal: 'gap-x-4', vertical: 'gap-y-2' },
  md: { horizontal: 'gap-x-6', vertical: 'gap-y-3' },
  lg: { horizontal: 'gap-x-8', vertical: 'gap-y-4' },
} as const

function RadioGroup({
  label,
  required,
  direction = 'horizontal',
  error,
  helperText,
  gap = 'md',
  children,
  className,
}: RadioGroupProps) {
  const isHorizontal = direction === 'horizontal'
  const gapClass = isHorizontal ? gapClasses[gap].horizontal : gapClasses[gap].vertical

  return (
    <fieldset
      className={cn('flex flex-col', className)}
      role="radiogroup"
      aria-invalid={!!error || undefined}
    >
      {label && (
        <legend className="font-body text-sm font-normal text-text mb-3">
          {label}
          {required && (
            <span
              className="text-editorial ml-0.5 text-xs align-super"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </legend>
      )}
      <div
        className={cn(
          'flex',
          isHorizontal ? 'flex-row flex-wrap items-center' : 'flex-col',
          gapClass
        )}
      >
        {children}
      </div>
      {error && (
        <p
          className="font-body text-xs font-normal text-editorial mt-2"
          role="alert"
          aria-live="polite"
        >
          {error}
        </p>
      )}
      {!error && helperText && (
        <p className="font-body text-xs font-normal text-muted-foreground mt-2">
          {helperText}
        </p>
      )}
    </fieldset>
  )
}

RadioGroup.displayName = 'RadioGroup'

export { RadioGroup }
