'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'

interface PaymentStatusResponse {
  orderId: string
  orderRef: string
  orderState: string
  paymentState: string
  intent: {
    id: string
    status: string
    amount: string
    currency: string
  } | null
}

type ConfirmState = 'polling' | 'success' | 'failed' | 'timeout'

export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const orderId = params.orderId
  const email = useCheckoutStore((s) => s.email)
  const isGuest = useCheckoutStore((s) => s.isGuest)
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout)

  const [state, setState] = useState<ConfirmState>('polling')
  const [orderRef, setOrderRef] = useState<string | null>(null)
  const pollCount = useRef(0)

  const poll = useCallback(async () => {
    try {
      const queryParams: Record<string, string> = {}
      if (isGuest && email) {
        queryParams.guestEmail = email
      }

      const res = await api.get<{ data: PaymentStatusResponse }>(
        `/payments/status/${orderId}`,
        { params: queryParams },
      )

      const { paymentState, orderRef: ref, intent } = res.data
      setOrderRef(ref)
      const intentStatus = intent?.status

      if (paymentState === 'PAID' || paymentState === 'SUCCEEDED' || intentStatus === 'SUCCEEDED') {
        setState('success')
        clearCheckout()
        return true
      }

      if (paymentState === 'FAILED' || intentStatus === 'FAILED') {
        setState('failed')
        return true
      }

      return false
    } catch {
      return false
    }
  }, [orderId, email, isGuest, clearCheckout])

  useEffect(() => {
    if (!orderId) return

    let cancelled = false

    async function startPolling() {
      while (!cancelled && pollCount.current < 45) {
        pollCount.current += 1
        const done = await poll()
        if (done || cancelled) return
        await new Promise((resolve) => setTimeout(resolve, 2000))
      }
      if (!cancelled) {
        setState('timeout')
      }
    }

    startPolling()

    return () => {
      cancelled = true
    }
  }, [orderId, poll])

  if (state === 'polling') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <Loader2 className="w-10 h-10 animate-spin text-umber mb-6" />
        <h1 className="font-display font-bold text-[24px] text-umber mb-3">
          Confirming your order...
        </h1>
        <p className="font-body font-light text-[14px] text-muted-foreground">
          Please do not close this page.
        </p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-[#4A7C59]/10 flex items-center justify-center mb-6 animate-in zoom-in duration-500">
          <CheckCircle2 className="w-10 h-10 text-[#4A7C59]" />
        </div>
        <h1 className="font-display font-bold text-[28px] text-umber mb-3">
          Order Confirmed
        </h1>
        {orderRef && (
          <p className="font-body font-light text-[16px] text-umber mb-2">
            Your order reference is: <span className="font-medium">{orderRef}</span>
          </p>
        )}
        {email && (
          <p className="font-body font-light text-[14px] text-muted-foreground mb-8">
            A confirmation email has been sent to {email}
          </p>
        )}
        <button
          type="button"
          onClick={() => router.push('/collections')}
          className={cn(
            'h-13 px-12',
            'bg-deep text-background',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none hover:bg-ink transition-colors duration-200',
          )}
        >
          Continue Shopping
        </button>
      </div>
    )
  }

  if (state === 'failed') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
        <div className="w-16 h-16 rounded-full bg-red-50 flex items-center justify-center mb-6">
          <XCircle className="w-10 h-10 text-red-500" />
        </div>
        <h1 className="font-display font-bold text-[24px] text-umber mb-3">
          Payment could not be processed
        </h1>
        <p className="font-body font-light text-[14px] text-muted-foreground mb-8">
          Please try again or use a different payment method.
        </p>
        <button
          type="button"
          onClick={() => router.push('/checkout')}
          className={cn(
            'h-13 px-12',
            'bg-deep text-background',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'rounded-none hover:bg-ink transition-colors duration-200',
          )}
        >
          Try Again
        </button>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6">
      <div className="w-16 h-16 rounded-full bg-highlight/10 flex items-center justify-center mb-6">
        <Loader2 className="w-10 h-10 text-highlight" />
      </div>
      <h1 className="font-display font-bold text-[24px] text-umber mb-3">
        Confirmation taking longer than expected
      </h1>
      <p className="font-body font-light text-[14px] text-muted-foreground mb-8">
        Your payment may still be processing. Check your email for a confirmation.
      </p>
      <button
        type="button"
        onClick={() => router.push('/')}
        className={cn(
          'h-13 px-12',
          'bg-deep text-background',
          'font-body font-light uppercase tracking-[0.25em] text-[13px]',
          'rounded-none hover:bg-ink transition-colors duration-200',
        )}
      >
        Return to Homepage
      </button>
    </div>
  )
}
