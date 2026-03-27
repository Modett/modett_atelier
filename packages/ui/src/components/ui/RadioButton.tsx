import * as React from 'react'
import { cn } from '../../lib/utils'

const sizeClasses = {
  sm: {
    circle: 'h-5 w-5',
    innerCircle: 'h-2.5 w-2.5',
    text: 'text-sm',
    gap: 'ml-2',
  },
  md: {
    circle: 'h-6 w-6',
    innerCircle: 'h-3.5 w-3.5',
    text: 'text-base',
    gap: 'ml-3',
  },
  lg: {
    circle: 'h-7 w-7',
    innerCircle: 'h-4 w-4',
    text: 'text-lg',
    gap: 'ml-3.5',
  },
} as const

/**
 * Props for the RadioButton component.
 * Extends native input attributes; `size` and `type` are overridden.
 */
export interface RadioButtonProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size' | 'type'> {
  /** Label text displayed next to the radio circle */
  label: string

  /** The value this radio represents */
  value: string

  /** Whether this radio is currently selected (controlled) */
  checked?: boolean

  /** Change handler */
  onChange?: (event: React.ChangeEvent<HTMLInputElement>) => void

  /** Radio button size */
  size?: 'sm' | 'md' | 'lg'

  /** Disabled state */
  disabled?: boolean

  /** Error state — turns ring to editorial colour */
  error?: boolean

  /** Additional className for the outer wrapper */
  className?: string
}

const RadioButton = React.forwardRef<HTMLInputElement, RadioButtonProps>(
  (
    {
      label,
      value,
      checked,
      onChange,
      size = 'md',
      disabled,
      error,
      className,
      ...rest
    },
    ref
  ) => {
    return (
      <label
        className={cn(
          'inline-flex items-center cursor-pointer select-none group',
          disabled && 'cursor-not-allowed opacity-50',
          className
        )}
      >
        <input
          ref={ref}
          type="radio"
          value={value}
          checked={checked}
          onChange={onChange}
          disabled={disabled}
          className="sr-only peer"
          aria-invalid={error || undefined}
          {...rest}
        />
        <span
          className={cn(
            'relative inline-flex items-center justify-center shrink-0 rounded-full border-2 transition-all duration-200',
            sizeClasses[size].circle,
            error && 'border-editorial',
            !error && disabled && 'border-surface-raised',
            !error && !disabled && 'border-muted-foreground',
            'peer-focus-visible:ring-2 peer-focus-visible:ring-offset-2 peer-focus-visible:ring-highlight',
            !disabled && 'group-hover:brightness-95'
          )}
          aria-hidden="true"
        >
          <span
            className={cn(
              'rounded-full bg-deep transition-transform duration-200',
              sizeClasses[size].innerCircle,
              checked ? 'scale-100' : 'scale-0'
            )}
          />
        </span>
        <span
          className={cn(
            'font-body font-normal text-text',
            sizeClasses[size].text,
            sizeClasses[size].gap
          )}
        >
          {label}
        </span>
      </label>
    )
  }
)

RadioButton.displayName = 'RadioButton'

export { RadioButton }
