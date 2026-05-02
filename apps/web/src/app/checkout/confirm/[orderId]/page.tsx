'use client'

import { useEffect, useState, useRef, useCallback } from 'react'
import { useParams, useRouter } from 'next/navigation'
import { useQueryClient } from '@tanstack/react-query'
import { Loader2, CheckCircle2, XCircle } from 'lucide-react'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'
import { CART_QUERY_KEY } from '@/hooks/useCart'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { Analytics } from '@/lib/analytics'

interface PurchaseAnalyticsPayload {
  totalValue: string
  currency:   string
  items:      Array<{
    variantId: string
    productId: string
    color:     string
    size:      string
    qty:       number
    unitPrice: string
  }>
}

interface PaymentStatusResponse {
  orderId: string
  orderRef: string
  orderState: string
  paymentState: string
  userId: string | null
  intent: {
    id: string
    status: string
    amount: string
    currency: string
  } | null
  purchaseAnalytics: PurchaseAnalyticsPayload | null
}

type ConfirmState = 'polling' | 'success' | 'failed' | 'timeout'

export default function OrderConfirmationPage() {
  const params = useParams<{ orderId: string }>()
  const router = useRouter()
  const { openRegisterWithEmail } = useAuthPanel()
  const orderId = params.orderId
  const email = useCheckoutStore((s) => s.email)
  const isGuest = useCheckoutStore((s) => s.isGuest)
  const clearCheckout = useCheckoutStore((s) => s.clearCheckout)
  const queryClient = useQueryClient()

  const [state, setState] = useState<ConfirmState>('polling')
  const [orderRef, setOrderRef] = useState<string | null>(null)
  /** Captured before clearCheckout so guest CTA still works after checkout state is reset */
  const [guestAfterOrder, setGuestAfterOrder] = useState<{
    email: string
  } | null>(null)
  const pollCount       = useRef(0)
  const purchaseTracked = useRef(false)

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

      const { paymentState, orderRef: ref, intent, userId, purchaseAnalytics } = res.data
      setOrderRef(ref)
      const intentStatus = intent?.status

      if (paymentState === 'PAID' || paymentState === 'SUCCEEDED' || intentStatus === 'SUCCEEDED') {
        const snap = useCheckoutStore.getState()
        if (snap.isGuest && snap.email) {
          setGuestAfterOrder({ email: snap.email })
        } else {
          setGuestAfterOrder(null)
        }
        if (!purchaseTracked.current && purchaseAnalytics) {
          purchaseTracked.current = true
          Analytics.purchaseComplete({
            orderId:    res.data.orderId,
            orderRef:   ref,
            items:      purchaseAnalytics.items,
            totalValue: purchaseAnalytics.totalValue,
            currency:   purchaseAnalytics.currency,
            userId:     userId ?? undefined,
          })
          if (!userId) {
            Analytics.guestCheckout({ orderId: res.data.orderId, orderRef: ref })
          }
        }
        setState('success')
        clearCheckout()
        queryClient.removeQueries({ queryKey: CART_QUERY_KEY })
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
  }, [orderId, email, isGuest, clearCheckout, queryClient])

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
        <p className="font-body font-light text-[14px] text-umber">
          Please do not close this page.
        </p>
      </div>
    )
  }

  if (state === 'success') {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh] text-center px-6 w-full max-w-page mx-auto">
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
          <p className="font-body font-light text-[14px] text-umber mb-8">
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

        {guestAfterOrder && (
          <div className="mt-12 border-t border-muted pt-8 text-center w-full max-w-lg">
            <p className="font-display font-bold text-[18px] text-umber mb-2">
              Save your details for next time
            </p>
            <p
              className="font-body font-light text-[13px] text-umber mb-6 max-w-sm mx-auto"
            >
              Create an account to track this order, save your addresses,
              and earn loyalty points on future purchases.
            </p>
            <button
              type="button"
              onClick={() => {
                clearCheckout()
                openRegisterWithEmail(guestAfterOrder.email)
              }}
              className={cn(
                'h-11 px-10 border border-umber text-umber',
                'font-body font-light uppercase tracking-[0.25em] text-[12px]',
                'rounded-none hover:bg-umber hover:text-background',
                'transition-all duration-200',
              )}
            >
              Create Account
            </button>
            <button
              type="button"
              onClick={() => {
                clearCheckout()
                router.push('/collections')
              }}
              className={cn(
                'block mx-auto mt-4 font-body font-light text-[12px]',
                'text-umber hover:text-graphite',
                'transition-colors duration-200',
              )}
            >
              Continue as guest
            </button>
          </div>
        )}
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
        <p className="font-body font-light text-[14px] text-umber mb-8">
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
      <p className="font-body font-light text-[14px] text-umber mb-8">
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
