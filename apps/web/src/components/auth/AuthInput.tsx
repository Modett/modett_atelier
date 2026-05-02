'use client'

import { useState, forwardRef } from 'react'
import { Eye, EyeOff } from 'lucide-react'
import { cn } from '@/lib/utils'

export const AuthInput = forwardRef<HTMLInputElement, AuthInputProps>(
  function AuthInput(
    {
      label,
      name,
      type = 'text',
      placeholder,
      required,
      error,
      value,
      onChange,
      onBlur,
      autoComplete,
      className,
    },
    ref,
  ) {
    const [showPassword, setShowPassword] = useState(false)
    const isPassword = type === 'password'
    const inputType = isPassword ? (showPassword ? 'text' : 'password') : type
    const errorId = error ? `${name}-error` : undefined

    return (
      <div className={cn('flex flex-col gap-1', className)}>
        <label
          htmlFor={name}
          className="font-body font-light text-[12px] tracking-wide text-umber"
        >
          {required && <span className="mr-1">&middot;</span>}
          {label}:
        </label>

        <div className="relative">
          <input
            ref={ref}
            id={name}
            name={name}
            type={inputType}
            placeholder={placeholder}
            value={value}
            onChange={onChange}
            onBlur={onBlur}
            autoComplete={autoComplete}
            aria-describedby={errorId}
            aria-invalid={error ? true : undefined}
            className={cn(
              'w-full bg-transparent outline-none',
              'font-body font-light',
              'text-[16px] md:text-[14px]',
              'text-umber',
              'border-0 border-b pb-1',
              error
                ? 'border-red-400'
                : 'border-umber/40 focus:border-umber',
              'transition-colors duration-200',
              'placeholder:text-muted-foreground/60',
              isPassword && 'pr-8',
            )}
          />

          {isPassword && (
            <button
              type="button"
              onClick={() => setShowPassword((prev) => !prev)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className={cn(
                'absolute right-0 bottom-1.5',
                'text-umber hover:text-graphite',
                'transition-colors duration-200',
                'focus:outline-none',
              )}
            >
              {showPassword ? (
                <EyeOff className="w-4 h-4" />
              ) : (
                <Eye className="w-4 h-4" />
              )}
            </button>
          )}
        </div>

        {error && (
          <p id={errorId} className="font-body text-[11px] text-red-500 mt-0.5">
            {error}
          </p>
        )}
      </div>
    )
  },
)

interface AuthInputProps {
  label: string
  name: string
  type?: string
  placeholder?: string
  required?: boolean
  error?: string
  value: string
  onChange: (e: React.ChangeEvent<HTMLInputElement>) => void
  onBlur?: (e: React.FocusEvent<HTMLInputElement>) => void
  autoComplete?: string
  className?: string
}
