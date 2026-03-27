'use client'

import { useState, useEffect, useCallback } from 'react'
import { z } from 'zod'
import { CheckCircle2, Eye, EyeOff, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'
import { useSession, useInvalidateSession } from '@/hooks/useSession'
import { useCurrency } from '@/hooks/useCurrency'
import type { ApiError, User } from '@/types'

const emailSchema = z.string().email()

type EmailState = 'unknown' | 'checking' | 'registered' | 'guest'

export function EmailStep() {
  const { setEmail: storeEmail, setStep, setReservation, setCartId, setOrderTotal } = useCheckoutStore()
  const { user, isLoggedIn } = useSession()
  const invalidateSession = useInvalidateSession()
  const currency = useCurrency()
  const [email, setEmail] = useState(useCheckoutStore.getState().email ?? '')
  const [password, setPassword] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [emailState, setEmailState] = useState<EmailState>('unknown')
  const [isValidEmail, setIsValidEmail] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [isPending, setIsPending] = useState(false)

  useEffect(() => {
    if (isLoggedIn && user) {
      storeEmail(user.email, false)
      handleStartCheckout(user.email, false)
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isLoggedIn])

  const checkEmail = useCallback(async (emailValue: string) => {
    const valid = emailSchema.safeParse(emailValue)
    if (!valid.success) {
      setIsValidEmail(false)
      setEmailState('unknown')
      return
    }
    setIsValidEmail(true)
    setEmailState('checking')
    try {
      const res = await api.get<{ data: { exists: boolean } }>(
        '/auth/check-email',
        { params: { email: emailValue } },
      )
      setEmailState(res.data.exists ? 'registered' : 'guest')
    } catch {
      setEmailState('guest')
    }
  }, [])

  async function handleStartCheckout(emailValue: string, isGuest: boolean) {
    setIsPending(true)
    setError(null)
    try {
      const res = await api.post<{
        data: {
          reservationId: string
          orderId: string
          orderRef: string
          expiresAt: string
          summary: { cartId: string; subtotal: string; taxAmount: string; total: string; itemCount: number }
        }
      }>('/checkout/start', {
        currency,
        guestEmail: isGuest ? emailValue : undefined,
      })
      setReservation(
        res.data.reservationId,
        res.data.orderId,
        res.data.orderRef,
        res.data.expiresAt,
      )
      if (res.data.summary?.cartId) {
        setCartId(res.data.summary.cartId)
      }
      if (res.data.summary?.total) {
        setOrderTotal(res.data.summary.total)
      }
      storeEmail(emailValue, isGuest)
      setStep('shipping')
    } catch (err) {
      const apiErr = err as ApiError
      setError(apiErr?.message ?? 'Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  async function handleLogin() {
    setIsPending(true)
    setError(null)
    try {
      const res = await api.post<{ data: { user: User } }>('/auth/login', {
        email,
        password,
        rememberMe: false,
      })
      invalidateSession()
      storeEmail(res.data.user.email, false)
      await handleStartCheckout(res.data.user.email, false)
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr?.code === 'INVALID_CREDENTIALS') {
        setError('Incorrect password. Please try again.')
      } else {
        setError(apiErr?.message ?? 'Something went wrong. Please try again.')
      }
      setIsPending(false)
    }
  }

  async function handleGuestContinue() {
    const valid = emailSchema.safeParse(email)
    if (!valid.success) {
      setError('Please enter a valid e-mail address.')
      return
    }
    await handleStartCheckout(email, true)
  }

  function handleEmailBlur() {
    checkEmail(email)
  }

  function handleEmailChange(e: React.ChangeEvent<HTMLInputElement>) {
    setEmail(e.target.value)
    setError(null)
    const valid = emailSchema.safeParse(e.target.value)
    setIsValidEmail(valid.success)
    if (!valid.success) {
      setEmailState('unknown')
    }
  }

  return (
    <div className="space-y-6">
      <p className="font-body font-light text-[14px] text-umber/80 leading-relaxed">
        Enter your e-mail address to proceed to checkout.
        If you are already registered, you will be asked to enter your password.
      </p>

      {error && (
        <p className="font-body text-[12px] text-red-500">{error}</p>
      )}

      {/* Email input */}
      <div className="flex flex-col gap-1">
        <label
          htmlFor="checkout-email"
          className="font-body font-light text-[12px] text-umber"
        >
          E-mail address <span className="text-red-400">*</span>
        </label>
        <div className="relative">
          <input
            id="checkout-email"
            type="email"
            autoComplete="email"
            value={email}
            onChange={handleEmailChange}
            onBlur={handleEmailBlur}
            className={cn(
              'w-full h-13 px-4 pr-10 bg-background',
              'border border-muted rounded-none',
              'font-body font-light text-[16px] md:text-[14px] text-umber',
              'placeholder:text-muted-foreground/60',
              'outline-none focus:border-umber',
              'transition-colors duration-200',
            )}
            placeholder="your@email.com"
          />
          {isValidEmail && (
            <CheckCircle2
              className="absolute right-3 top-1/2 -translate-y-1/2 w-5 h-5 text-[#4A7C59]"
              aria-hidden="true"
            />
          )}
        </div>
      </div>

      {/* Password field for registered users */}
      {emailState === 'registered' && (
        <div className="flex flex-col gap-1">
          <label
            htmlFor="checkout-password"
            className="font-body font-light text-[12px] text-umber"
          >
            Enter your password <span className="text-red-400">*</span>
          </label>
          <div className="relative">
            <input
              id="checkout-password"
              type={showPassword ? 'text' : 'password'}
              autoComplete="current-password"
              value={password}
              onChange={(e) => {
                setPassword(e.target.value)
                setError(null)
              }}
              className={cn(
                'w-full h-13 px-4 pr-10 bg-background',
                'border border-muted rounded-none',
                'font-body font-light text-[16px] md:text-[14px] text-umber',
                'placeholder:text-muted-foreground/60',
                'outline-none focus:border-umber',
                'transition-colors duration-200',
              )}
            />
            <button
              type="button"
              onClick={() => setShowPassword((p) => !p)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-umber transition-colors"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
        </div>
      )}

      {/* Action buttons */}
      {emailState === 'registered' ? (
        <div className="flex flex-col items-center gap-4">
          <button
            type="button"
            onClick={handleLogin}
            disabled={isPending || !password}
            className={cn(
              'w-full h-13',
              'bg-deep text-background',
              'font-body font-light uppercase tracking-[0.25em] text-[13px]',
              'rounded-none hover:bg-ink transition-colors duration-200',
              'disabled:opacity-40 disabled:cursor-not-allowed',
            )}
          >
            {isPending ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="w-4 h-4 animate-spin" />
                Signing in...
              </span>
            ) : (
              'Login'
            )}
          </button>

          <div className="w-12 border-t border-muted" />

          <button
            type="button"
            onClick={handleGuestContinue}
            disabled={isPending}
            className={cn(
              'font-body font-light text-[12px] uppercase tracking-[0.25em]',
              'text-umber underline underline-offset-4 hover:text-ink',
              'transition-colors duration-200',
              'disabled:opacity-40',
            )}
          >
            Proceed without signing in
          </button>
        </div>
      ) : (
        <button
          type="button"
          onClick={handleGuestContinue}
          disabled={isPending || !isValidEmail}
          className={cn(
            'w-full h-13',
            'bg-deep text-background',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none hover:bg-ink transition-colors duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {isPending ? (
            <span className="flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Processing...
            </span>
          ) : (
            'Continue'
          )}
        </button>
      )}
    </div>
  )
}

export function EmailSummary() {
  const email = useCheckoutStore((s) => s.email)
  if (!email) return null
  return (
    <p className="font-body font-light text-[13px] text-muted-foreground">
      The e-mail address entered is: {email}
    </p>
  )
}
