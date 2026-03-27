'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useLogin } from '@/hooks/useLogin'
import { AuthInput } from './AuthInput'
import type { ApiError } from '@/types'

const loginSchema = z.object({
  email: z.string().email('Please enter a valid email address'),
  password: z.string().min(1, 'Password is required'),
})

const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS:  'Incorrect email or password. Please try again.',
  ACCOUNT_DELETED:      'This account has been deactivated.',
  RATE_LIMIT_EXCEEDED:  'Too many attempts. Please wait 15 minutes.',
}

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const login = useLogin()

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setErrors({})

    const result = loginSchema.safeParse({ email, password })
    if (!result.success) {
      const fieldErrors: Record<string, string> = {}
      result.error.errors.forEach((err) => {
        if (err.path[0]) fieldErrors[String(err.path[0])] = err.message
      })
      setErrors(fieldErrors)
      return
    }

    login.mutate(
      { email, password, rememberMe },
      {
        onSuccess: () => {
          onSuccess()
        },
        onError: (err: Error) => {
          const apiErr = err as unknown as ApiError
          const message = ERROR_MESSAGES[apiErr?.code]
            ?? 'Something went wrong. Please try again.'
          setErrors({ form: message })
        },
      },
    )
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-6">
      <div>
        <h2 className="font-display font-bold text-[28px] text-umber leading-tight mb-2">
          My Modett
        </h2>
        <p className="font-body font-light text-[13px] text-muted-foreground leading-relaxed">
          Please enter your email address to login or create a new profile
        </p>
      </div>

      <p className="font-body font-light text-[11px] text-muted-foreground text-right">
        &middot; Required fields
      </p>

      {errors.form && (
        <p className="font-body text-[12px] text-red-500 -mt-4">
          {errors.form}
        </p>
      )}

      <AuthInput
        label="Email"
        name="login-email"
        type="email"
        required
        autoComplete="email"
        value={email}
        onChange={(e) => setEmail(e.target.value)}
        error={errors.email}
      />

      <div className="flex flex-col gap-1">
        <AuthInput
          label="Password"
          name="login-password"
          type="password"
          required
          autoComplete="current-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          error={errors.password}
        />
        <div className="flex justify-end mt-1">
          <button
            type="button"
            className={cn(
              'font-body font-light text-[12px]',
              'text-umber underline hover:text-ink',
              'transition-colors duration-200',
            )}
          >
            Forgotten your password?
          </button>
        </div>
      </div>

      {/* Remember me */}
      <label className="flex items-center gap-2 cursor-pointer -mt-2">
        <div
          className={cn(
            'w-4 h-4 border flex items-center justify-center',
            'transition-colors duration-200',
            rememberMe
              ? 'bg-umber border-umber'
              : 'bg-transparent border-muted-foreground',
          )}
        >
          {rememberMe && (
            <svg viewBox="0 0 10 8" className="w-2.5 h-2 text-background" aria-hidden="true">
              <path
                d="M1 4l2.5 2.5L9 1"
                stroke="currentColor"
                strokeWidth="1.5"
                fill="none"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          )}
        </div>
        <input
          type="checkbox"
          className="sr-only"
          checked={rememberMe}
          onChange={(e) => setRememberMe(e.target.checked)}
        />
        <span className="font-body font-light text-[12px] text-umber">
          Remember me
        </span>
      </label>

      <div className="flex flex-col gap-3 pt-2">
        <button
          type="submit"
          disabled={login.isPending}
          className={cn(
            'w-full h-13',
            'bg-umber text-background',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none border-0',
            'hover:bg-ink transition-colors duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {login.isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </span>
          ) : 'Login'}
        </button>

        <button
          type="button"
          onClick={onSwitchToRegister}
          className={cn(
            'w-full h-13',
            'bg-transparent border border-umber text-umber',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none',
            'hover:bg-umber hover:text-background',
            'transition-all duration-200',
          )}
        >
          Register
        </button>
      </div>
    </form>
  )
}

interface LoginFormProps {
  onSuccess:          () => void
  onSwitchToRegister: () => void
}
