'use client'

import { useState } from 'react'
import { cn } from '@/lib/utils'
import { useSession } from '@/hooks/useSession'
import { api } from '@/lib/api'
import type { ProductVariant } from '@/types'

interface NotifyMeFormProps {
  productSlug:    string
  selectedColour: string
  variants:       ProductVariant[]
}

export function NotifyMeForm({
  productSlug: _productSlug,
  selectedColour,
  variants,
}: NotifyMeFormProps) {
  const { user } = useSession()
  const [email, setEmail] = useState(user?.email ?? '')
  const [isPending, setIsPending] = useState(false)
  const [isSuccess, setIsSuccess] = useState(false)
  const [error, setError] = useState<string | null>(null)

  const variantForColour = variants.find((v) => v.color === selectedColour)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    if (!email.trim() || !variantForColour) return

    setIsPending(true)
    setError(null)

    try {
      await api.post('/messaging/notify-me', {
        variantId: variantForColour.id,
        email: email.trim(),
      })
      setIsSuccess(true)
    } catch {
      setError('Something went wrong. Please try again.')
    } finally {
      setIsPending(false)
    }
  }

  if (isSuccess) {
    return (
      <div className="py-4">
        <p className="font-body font-light text-[13px] text-umber">
          We&apos;ll let you know when this is back in stock ✓
        </p>
      </div>
    )
  }

  return (
    <div className="space-y-4">
      <p className="font-body font-light text-[13px] text-muted-foreground leading-relaxed">
        This colour is currently out of stock.
      </p>

      <form onSubmit={handleSubmit} className="space-y-4">
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="Enter your email"
          required
          className={cn(
            'w-full h-10 px-3',
            'border border-muted bg-transparent',
            'font-body font-light text-[13px] text-umber',
            'placeholder:text-muted-foreground/60',
            'focus:outline-none focus:border-umber',
            'transition-colors duration-200',
          )}
        />

        <button
          type="submit"
          disabled={isPending || !email.trim()}
          className={cn(
            'w-full h-[52px]',
            'border border-umber bg-transparent text-umber',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none',
            'hover:bg-umber hover:text-background',
            'transition-all duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {isPending ? 'Submitting...' : 'NOTIFY ME'}
        </button>
      </form>

      {error && (
        <p className="font-body font-light text-[11px] text-highlight">
          {error}
        </p>
      )}
    </div>
  )
}
