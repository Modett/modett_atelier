'use client'

import { useState } from 'react'
import { z } from 'zod'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
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

type LoginView = 'login' | 'forgot' | 'forgot-sent'

const primaryButtonClass = cn(
  'w-full h-13',
  'bg-umber text-background',
  'font-body font-light uppercase tracking-[0.25em] text-[13px]',
  'rounded-none border-0',
  'hover:bg-ink transition-colors duration-200',
  'disabled:opacity-40 disabled:cursor-not-allowed',
)

const backLinkClass = cn(
  'font-body font-light text-[12px]',
  'text-umber underline hover:text-ink',
  'transition-colors duration-200',
)

export function LoginForm({ onSuccess, onSwitchToRegister }: LoginFormProps) {
  const [email, setEmail]           = useState('')
  const [password, setPassword]     = useState('')
  const [rememberMe, setRememberMe] = useState(false)
  const [errors, setErrors]         = useState<Record<string, string>>({})
  const [loginView, setLoginView]   = useState<LoginView>('login')
  const [resetEmail, setResetEmail] = useState('')
  const [forgotEmailError, setForgotEmailError] = useState('')
  const [forgotFormError, setForgotFormError]   = useState('')
  const [forgotSending, setForgotSending]       = useState(false)
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

  function handleForgotSubmit(e: React.FormEvent) {
    e.preventDefault()
    setForgotFormError('')
    setForgotEmailError('')

    const result = z
      .string()
      .email('Please enter a valid email address')
      .safeParse(resetEmail.trim())
    if (!result.success) {
      const msg = result.error.errors[0]?.message ?? 'Please enter a valid email address'
      setForgotEmailError(msg)
      return
    }

    setForgotSending(true)
    void api
      .post('/auth/forgot-password', { email: result.data })
      .then(() => {
        setLoginView('forgot-sent')
      })
      .catch(() => {
        setForgotFormError('Something went wrong. Please try again.')
      })
      .finally(() => {
        setForgotSending(false)
      })
  }

  function goBackToLogin() {
    setLoginView('login')
    setForgotFormError('')
    setForgotEmailError('')
  }

  if (loginView === 'forgot-sent') {
    return (
      <div className="flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-[28px] text-umber leading-tight mb-2">
            Check your email
          </h2>
          <p className="font-body font-light text-[13px] text-muted-foreground leading-relaxed">
            If an account exists for{' '}
            <span className="font-semibold text-ink">{resetEmail.trim()}</span>
            , you&apos;ll receive a reset link shortly.
          </p>
        </div>
        <button type="button" onClick={goBackToLogin} className={cn(backLinkClass, 'text-left w-fit')}>
          Back to login
        </button>
      </div>
    )
  }

  if (loginView === 'forgot') {
    return (
      <form onSubmit={handleForgotSubmit} noValidate className="flex flex-col gap-6">
        <div>
          <h2 className="font-display font-bold text-[28px] text-umber leading-tight mb-2">
            Reset your password
          </h2>
          <p className="font-body font-light text-[13px] text-muted-foreground leading-relaxed">
            Enter your email and we&apos;ll send you a reset link.
          </p>
        </div>

        <AuthInput
          label="Email"
          name="forgot-email"
          type="email"
          required
          autoComplete="email"
          value={resetEmail}
          onChange={(e) => setResetEmail(e.target.value)}
          error={forgotEmailError}
        />

        {forgotFormError && (
          <p className="font-body text-[12px] text-red-500">
            {forgotFormError}
          </p>
        )}

        <div className="flex flex-col gap-3 pt-2">
          <button
            type="submit"
            disabled={forgotSending}
            className={primaryButtonClass}
          >
            {forgotSending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Sending...
              </span>
            ) : (
              'Send reset link'
            )}
          </button>
          <button type="button" onClick={goBackToLogin} className={cn(backLinkClass, 'text-left w-fit')}>
            ← Back to login
          </button>
        </div>
      </form>
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
            onClick={() => {
              setResetEmail(email)
              setLoginView('forgot')
              setForgotFormError('')
              setForgotEmailError('')
            }}
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
          className={primaryButtonClass}
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
