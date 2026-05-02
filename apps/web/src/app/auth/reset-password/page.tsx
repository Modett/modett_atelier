'use client'

import { Suspense, useState } from 'react'
import Link from 'next/link'
import { useSearchParams } from 'next/navigation'
import { Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import type { ApiError } from '@/types'

function ResetPasswordForm() {
  const searchParams = useSearchParams()
  const token = searchParams.get('token')?.trim() ?? ''

  const [password, setPassword]     = useState('')
  const [confirm, setConfirm]       = useState('')
  const [error, setError]           = useState<string | null>(null)
  const [pending, setPending]       = useState(false)
  const [done, setDone]             = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setError(null)
    if (password.length < 8) {
      setError('Password must be at least 8 characters.')
      return
    }
    if (password !== confirm) {
      setError('Passwords do not match.')
      return
    }
    if (!token) {
      setError('Invalid or missing reset link.')
      return
    }

    setPending(true)
    try {
      await api.post('/auth/reset-password', { token, password })
      setDone(true)
    } catch (err) {
      const apiErr = err as ApiError
      if (apiErr.code === 'INVALID_OR_EXPIRED_RESET_TOKEN') {
        setError('This reset link is invalid or has expired. Please request a new one.')
      } else {
        setError(apiErr.message ?? 'Something went wrong. Please try again.')
      }
    } finally {
      setPending(false)
    }
  }

  if (!token) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16 max-w-md mx-auto text-center">
        <h1 className="font-display font-bold text-[24px] text-umber mb-3">
          Invalid link
        </h1>
        <p className="font-body font-light text-[14px] text-umber mb-6">
          This password reset link is missing a token. Open the link from your email, or request a new reset from the sign-in page.
        </p>
        <Link
          href="/"
          className="font-body text-[12px] uppercase tracking-[0.25em] text-umber underline hover:text-ink"
        >
          Back to home
        </Link>
      </div>
    )
  }

  if (done) {
    return (
      <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16 max-w-md mx-auto text-center">
        <h1 className="font-display font-bold text-[24px] text-umber mb-3">
          Password updated
        </h1>
        <p className="font-body font-light text-[14px] text-umber mb-6">
          You can sign in with your new password.
        </p>
        <Link
          href="/"
          className="font-body text-[12px] uppercase tracking-[0.25em] text-umber underline hover:text-ink"
        >
          Continue to home
        </Link>
      </div>
    )
  }

  return (
    <div className="min-h-[50vh] flex flex-col items-center justify-center px-6 py-16 max-w-md mx-auto">
      <h1 className="font-display font-bold text-[28px] text-umber mb-2 w-full">
        Set a new password
      </h1>
      <p className="font-body font-light text-[13px] text-umber mb-8 w-full">
        Choose a strong password for your Modett account.
      </p>

      <form onSubmit={handleSubmit} className="flex flex-col gap-5 w-full" noValidate>
        {error && (
          <p className="font-body text-[12px] text-red-600" role="alert">
            {error}
          </p>
        )}
        <label className="flex flex-col gap-1">
          <span className="font-body text-[11px] uppercase tracking-wider text-umber">
            New password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            className={cn(
              'h-12 px-3 border border-muted bg-background',
              'font-body text-[14px] text-ink',
              'focus:outline-none focus:ring-1 focus:ring-umber',
            )}
          />
        </label>
        <label className="flex flex-col gap-1">
          <span className="font-body text-[11px] uppercase tracking-wider text-umber">
            Confirm password
          </span>
          <input
            type="password"
            autoComplete="new-password"
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            className={cn(
              'h-12 px-3 border border-muted bg-background',
              'font-body text-[14px] text-ink',
              'focus:outline-none focus:ring-1 focus:ring-umber',
            )}
          />
        </label>
        <button
          type="submit"
          disabled={pending}
          className={cn(
            'h-13 w-full bg-umber text-background',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none border-0 hover:bg-ink transition-colors',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {pending ? (
            <span className="inline-flex items-center justify-center gap-2">
              <Loader2 className="w-4 h-4 animate-spin" />
              Saving…
            </span>
          ) : (
            'Update password'
          )}
        </button>
      </form>

      <Link
        href="/"
        className="mt-8 font-body text-[12px] text-umber underline hover:text-ink"
      >
        Back to home
      </Link>
    </div>
  )
}

export default function ResetPasswordPage() {
  return (
    <Suspense
      fallback={
        <div className="min-h-[40vh] flex items-center justify-center">
          <Loader2 className="w-8 h-8 animate-spin text-umber" aria-label="Loading" />
        </div>
      }
    >
      <ResetPasswordForm />
    </Suspense>
  )
}
