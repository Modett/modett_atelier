'use client'

import { useState } from 'react'
import { Loader2, ShieldCheck, AlertCircle } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'
import type { ApiError } from '@/types'

declare global {
  interface Window {
    payable?: {
      startPayment: (params: Record<string, string>) => void
      onCompleted: ((data: Record<string, unknown>) => void) | null
      onDismissed: (() => void) | null
      onError: ((error: {
        code: number
        error?: string
        fields?: Array<{ error: string }>
      }) => void) | null
    }
  }
}

const COUNTRY_ALPHA3: Record<string, string> = {
  LK: 'LKA', SG: 'SGP', US: 'USA', GB: 'GBR',
  AU: 'AUS', CA: 'CAN', DE: 'DEU', FR: 'FRA',
  JP: 'JPN', AE: 'ARE', IN: 'IND',
}

function getAlpha3(alpha2: string): string {
  return COUNTRY_ALPHA3[alpha2.toUpperCase()] ?? 'LKA'
}

interface PaymentSessionResponse {
  data: {
    intentId: string
    orderId: string
    orderRef: string
    sandboxMode: boolean
    paymentParams: Record<string, string>
  }
}

export function PaymentStep() {
  const store = useCheckoutStore()

  const [termsAccepted, setTermsAccepted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)

  async function handlePayNow() {
    setFormError(null)
    setFieldErrors([])

    if (!termsAccepted) {
      setFormError('Please accept the Terms and Conditions to continue.')
      return
    }

    setIsPending(true)
    store.setPaymentSubmitted(true)

    try {
      const billingAddr = store.sameAsBilling
        ? store.shippingAddress
        : store.billingAddress ?? store.shippingAddress

      const res = await api.post<PaymentSessionResponse>('/payments/session', {
        orderId: store.orderId,
        reservationId: store.reservationId,
        cartId: store.cartId,
        currency: store.shippingAddress
          ? (store.shippingAddress.countryCode === 'LK' ? 'LKR'
            : store.shippingAddress.countryCode === 'SG' ? 'SGD'
            : 'USD')
          : 'LKR',
        customerFirstName: billingAddr?.firstName ?? '',
        customerLastName: billingAddr?.lastName ?? '',
        customerEmail: store.email ?? '',
        customerMobilePhone: billingAddr?.phone ?? '',
        billingAddress: {
          street: billingAddr?.addressLine1 ?? '',
          city: billingAddr?.city ?? '',
          province: billingAddr?.city ?? '',
          country: getAlpha3(billingAddr?.countryCode ?? 'LK'),
          postcode: billingAddr?.postcode ?? '',
        },
      })

      const { paymentParams } = res.data

      if (typeof window === 'undefined' || !window.payable) {
        throw new Error(
          'Payment gateway not loaded. Please refresh the page and try again.',
        )
      }

      window.payable.onError = (error) => {
        setIsPending(false)
        store.setPaymentSubmitted(false)
        if (error.code === 3009) {
          const msgs = (error.fields ?? []).map((f) => f.error)
          setFieldErrors(msgs)
          console.error('[PAYable] Validation errors:', msgs)
        } else if (error.code === 3008) {
          setFormError(error.error ?? 'Payment gateway error. Please try again.')
          console.error('[PAYable] General error:', error.error)
        } else {
          setFormError('An unexpected error occurred. Please try again.')
          console.error('[PAYable] Error code:', error.code, error)
        }
      }

      window.payable.onDismissed = () => {
        setIsPending(false)
        store.setPaymentSubmitted(false)
        setFormError(null)
        console.log('[PAYable] Payment dismissed by user')
      }

      window.payable.onCompleted = (data) => {
        console.log('[PAYable] onCompleted fired:', data)
        // Webhook handles the actual order confirmation.
        // The return_url redirect brings the user to the confirmation page.
      }

      window.payable.startPayment(paymentParams)
    } catch (err) {
      const apiErr = err as ApiError
      setFormError(
        apiErr?.message ?? 'Payment could not be initiated. Please try again.',
      )
      store.setPaymentSubmitted(false)
      setIsPending(false)
    }
  }

  return (
    <div className="space-y-6">
      {isPending && (
        <div
          className="fixed inset-0 z-[200] bg-graphite/90
                     flex flex-col items-center justify-center
                     text-background text-center px-6"
        >
          <Loader2 className="w-10 h-10 animate-spin mb-6" />
          <p className="font-body font-light text-[16px] mb-2">
            Processing your payment
          </p>
          <p className="font-body font-light text-[13px] text-background/70">
            Please do not close this page
          </p>
        </div>
      )}

      {formError && (
        <div className="flex items-start gap-3 px-4 py-3 bg-red-50 border border-red-200">
          <AlertCircle className="w-4 h-4 text-red-400 mt-0.5 flex-shrink-0" />
          <p className="font-body font-light text-[13px] text-red-600">
            {formError}
          </p>
        </div>
      )}

      {fieldErrors.length > 0 && (
        <div className="px-4 py-3 bg-red-50 border border-red-200">
          <p className="font-body font-medium text-[13px] text-red-600 mb-1">
            Please fix the following:
          </p>
          {fieldErrors.map((msg, i) => (
            <p key={i} className="font-body font-light text-[12px] text-red-500">
              &bull; {msg}
            </p>
          ))}
        </div>
      )}

      <h3 className="font-body font-light text-[11px] uppercase tracking-[0.25em] text-umber">
        Payment Method
      </h3>

      <div
        className={cn(
          'border p-4 flex justify-between items-center',
          'border-umber bg-surface-raised/30',
        )}
      >
        <div className="flex items-center gap-3">
          <span className="relative w-4 h-4 rounded-full border-2 border-umber flex items-center justify-center shrink-0">
            <span className="w-2 h-2 rounded-full bg-umber" />
          </span>
          <span className="font-body font-light text-[14px] text-umber">
            Cards
          </span>
        </div>
        <div className="flex items-center gap-2">
          <div className="relative h-7 w-11 bg-white rounded px-1 flex items-center justify-center shadow-sm">
            <Image
              src="/images/visa-logo.png"
              alt="Visa"
              fill
              className="object-contain p-0.5"
              sizes="44px"
            />
          </div>
          <div className="relative h-7 w-11 bg-white rounded px-1 flex items-center justify-center shadow-sm">
            <Image
              src="/images/Mastercard.png"
              alt="Mastercard"
              fill
              className="object-contain p-0.5"
              sizes="44px"
            />
          </div>
        </div>
      </div>

      <div className="flex items-start gap-3 bg-surface-raised/50 p-4">
        <ShieldCheck className="w-5 h-5 text-[#4A7C59] shrink-0 mt-0.5" />
        <div>
          <p className="font-body font-light text-[13px] text-umber">
            Secure payment via PAYable
          </p>
          <p className="font-body font-light text-[12px] text-umber mt-1">
            You will be securely redirected to the PAYable payment gateway to
            complete your card payment. Your card details are never stored on our
            servers.
          </p>
          <p className="font-body font-light text-[12px] text-umber mt-1">
            Accepted: Visa, Mastercard (credit and debit cards)
          </p>
        </div>
      </div>

      <label className="flex items-start gap-3 cursor-pointer mt-2">
        <div
          className={cn(
            'w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5',
            'transition-colors duration-200',
            termsAccepted
              ? 'bg-umber border-umber'
              : 'bg-transparent border-muted-foreground',
          )}
        >
          {termsAccepted && (
            <svg
              viewBox="0 0 10 8"
              className="w-2.5 h-2 text-background"
              aria-hidden="true"
            >
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
          checked={termsAccepted}
          onChange={(e) => setTermsAccepted(e.target.checked)}
        />
        <span className="font-body font-light text-[12px] text-umber/80">
          <span className="text-red-400">*</span>By confirming the order you
          accept the Modett{' '}
          <Link
            href="/terms"
            className="underline hover:text-ink transition-colors"
          >
            Terms and Conditions
          </Link>{' '}
          of sale
        </span>
      </label>

      <button
        type="button"
        onClick={handlePayNow}
        disabled={isPending || !termsAccepted || !store.orderId}
        className={cn(
          'w-full h-14',
          'bg-deep text-background',
          'font-body font-light uppercase tracking-[0.25em] text-[14px]',
          'rounded-none transition-colors duration-200',
          isPending || !termsAccepted || !store.orderId
            ? 'opacity-40 cursor-not-allowed'
            : 'hover:bg-ink cursor-pointer',
        )}
      >
        {isPending ? (
          <span className="flex items-center justify-center gap-2">
            <Loader2 className="w-4 h-4 animate-spin" />
            Redirecting to payment...
          </span>
        ) : (
          'Confirm and Complete Purchase'
        )}
      </button>
    </div>
  )
}
