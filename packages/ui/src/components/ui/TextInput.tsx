import * as React from 'react'
import { cn } from '../../lib/utils'

/**
 * Props for the TextInput component.
 * Extends native input attributes; `size` is overridden by the component's size variant.
 */
export interface TextInputProps
  extends Omit<React.InputHTMLAttributes<HTMLInputElement>, 'size'> {
  /** Label text displayed above the input */
  label: string

  /** Whether the field is required — shows asterisk (*) after label */
  required?: boolean

  /** Placeholder text inside the input (optional) */
  placeholder?: string

  /** Error message from form validation (React Hook Form / Zod) */
  error?: string

  /** Helper text shown below the input (hidden when error is present) */
  helperText?: string

  /** Input size variant */
  size?: 'sm' | 'md' | 'lg'

  /** Full width — stretches to fill parent container */
  fullWidth?: boolean

  /** Disabled state */
  disabled?: boolean

  /** HTML input type */
  type?: 'text' | 'email' | 'password' | 'tel' | 'number' | 'url' | 'search'

  /** Left icon/adornment inside the input (optional) */
  startAdornment?: React.ReactNode

  /** Right icon/adornment inside the input (optional) */
  endAdornment?: React.ReactNode

  /** Additional className for the outer wrapper */
  className?: string

  /** Additional className for the input element itself */
  inputClassName?: string
}

const sizeClasses = {
  label: {
    sm: 'text-xs',
    md: 'text-sm',
    lg: 'text-sm',
  },
  input: {
    sm: 'h-9 md:h-10 px-3 text-sm',
    md: 'h-12 md:h-14 px-4 text-base',
    lg: 'h-14 md:h-16 px-5 text-base md:text-lg',
  },
} as const

const TextInput = React.forwardRef<HTMLInputElement, TextInputProps>(
  (
    {
      label,
      required = false,
      placeholder,
      error,
      helperText,
      size = 'md',
      fullWidth = false,
      disabled = false,
      type = 'text',
      startAdornment,
      endAdornment,
      className,
      inputClassName,
      id: idProp,
      name,
      ...rest
    },
    ref
  ) => {
    const inputId =
      idProp ||
      name ||
      `input-${label.toLowerCase().replace(/\s+/g, '-')}`
    const errorId = `${inputId}-error`
    const helperId = `${inputId}-helper`

    const hasAdornments = Boolean(startAdornment || endAdornment)

    const inputClasses = cn(
      'w-full font-body font-normal text-text bg-background border border-muted-foreground/60 rounded-sm',
      'placeholder:text-muted-foreground/50',
      'outline-none transition-colors duration-200',
      'focus:border-muted-foreground focus:ring-2 focus:ring-highlight/30',
      'disabled:opacity-50 disabled:cursor-not-allowed disabled:bg-surface-raised',
      error &&
        'border-editorial focus:border-editorial focus:ring-editorial/30',
      sizeClasses.input[size],
      startAdornment && 'pl-11',
      endAdornment && 'pr-11',
      inputClassName
    )

    return (
      <div
        className={cn(
          'flex flex-col gap-y-2',
          fullWidth && 'w-full',
          className
        )}
      >
        <label
          htmlFor={inputId}
          className={cn(
            'font-body font-normal text-text',
            sizeClasses.label[size]
          )}
        >
          {label}
          {required && (
            <span
              className="text-editorial ml-0.5 text-xs align-super"
              aria-hidden="true"
            >
              *
            </span>
          )}
        </label>

        <div className={cn(hasAdornments && 'relative')}>
          {startAdornment && (
            <div
              className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              {startAdornment}
            </div>
          )}
          <input
            ref={ref}
            id={inputId}
            name={name}
            type={type}
            placeholder={placeholder}
            disabled={disabled}
            required={required}
            aria-required={required}
            aria-invalid={Boolean(error)}
            aria-describedby={[error ? errorId : null, !error && helperText ? helperId : null]
              .filter(Boolean)
              .join(' ')
              || undefined}
            className={inputClasses}
            {...rest}
          />
          {endAdornment && (
            <div
              className="pointer-events-none absolute right-4 top-1/2 -translate-y-1/2 text-muted-foreground"
              aria-hidden="true"
            >
              {endAdornment}
            </div>
          )}
        </div>

        {error && (
          <p
            id={errorId}
            className="font-body text-xs font-normal text-editorial mt-1.5"
            role="alert"
            aria-live="polite"
          >
            {error}
          </p>
        )}
        {!error && helperText && (
          <p
            id={helperId}
            className="font-body text-xs font-normal text-muted-foreground mt-1.5"
          >
            {helperText}
          </p>
        )}
      </div>
    )
  }
)

TextInput.displayName = 'TextInput'

export { TextInput }
