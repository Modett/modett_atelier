'use client'

import { useEffect, useState } from 'react'
import { Loader2, ShieldCheck, AlertCircle, CreditCard, Check } from 'lucide-react'
import Link from 'next/link'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { api } from '@/lib/api'
import { useCheckoutStore } from '@/store/checkout.store'
import { useSession } from '@/hooks/useSession'
import {
  useSavedCards,
  usePayWithSavedCard,
  type SavedCardSummary,
} from '@/hooks/useSavedCards'
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
    paymentType: 'ONE_TIME' | 'TOKENIZE'
    paymentParams: Record<string, string>
  }
}

type PaymentChoice =
  | { kind: 'new-card' }
  | { kind: 'saved-card'; cardId: string }

export function PaymentStep() {
  const router = useRouter()
  const store = useCheckoutStore()
  const { isLoggedIn } = useSession()
  const { data: savedCards } = useSavedCards()
  const payWithSavedCardMutation = usePayWithSavedCard()

  const [paymentChoice, setPaymentChoice] = useState<PaymentChoice>({ kind: 'new-card' })
  const [saveCard, setSaveCard] = useState(false)
  const [termsAccepted, setTermsAccepted] = useState(false)
  const [formError, setFormError] = useState<string | null>(null)
  const [fieldErrors, setFieldErrors] = useState<string[]>([])
  const [isPending, setIsPending] = useState(false)

  // Default the picker to the user's default saved card (or first saved card).
  useEffect(() => {
    if (!isLoggedIn) return
    if (paymentChoice.kind !== 'new-card') return
    if (!savedCards || savedCards.length === 0) return
    const def = savedCards.find((c) => c.isDefault) ?? savedCards[0]
    if (def) setPaymentChoice({ kind: 'saved-card', cardId: def.id })
  }, [isLoggedIn, savedCards, paymentChoice.kind])

  async function handlePayWithNewCard() {
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
        // Server enforces: tokenization only enabled for authenticated users.
        // Sending true as a guest is harmless — the API forces ONE_TIME.
        saveCard: isLoggedIn && saveCard,
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
        // The webhook performs the canonical order confirmation; the return_url
        // brings the user to the confirmation page.
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

  async function handlePayWithSavedCard(cardId: string) {
    setFormError(null)

    if (!termsAccepted) {
      setFormError('Please accept the Terms and Conditions to continue.')
      return
    }
    if (!store.orderId) {
      setFormError('Order not found. Please refresh the page.')
      return
    }

    setIsPending(true)
    store.setPaymentSubmitted(true)

    try {
      const result = await payWithSavedCardMutation.mutateAsync({
        savedCardId: cardId,
        orderId: store.orderId,
      })

      if (result.status === 'confirmed') {
        router.push(`/checkout/confirm/${store.orderId}`)
        return
      }
      setIsPending(false)
      store.setPaymentSubmitted(false)
      setFormError(
        result.statusMessage ??
          'Payment was declined by your bank. Please try a different card.',
      )
    } catch (err) {
      const apiErr = err as ApiError
      setIsPending(false)
      store.setPaymentSubmitted(false)
      setFormError(
        apiErr?.message ?? 'Payment could not be processed. Please try again.',
      )
    }
  }

  function handlePayNow() {
    if (paymentChoice.kind === 'saved-card') {
      void handlePayWithSavedCard(paymentChoice.cardId)
      return
    }
    void handlePayWithNewCard()
  }

  const hasSavedCards = isLoggedIn && (savedCards?.length ?? 0) > 0

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

      {hasSavedCards && savedCards ? (
        <div className="space-y-2">
          {savedCards.map((card) => (
            <SavedCardOption
              key={card.id}
              card={card}
              selected={
                paymentChoice.kind === 'saved-card' &&
                paymentChoice.cardId === card.id
              }
              onSelect={() => setPaymentChoice({ kind: 'saved-card', cardId: card.id })}
            />
          ))}

          <NewCardOption
            selected={paymentChoice.kind === 'new-card'}
            onSelect={() => setPaymentChoice({ kind: 'new-card' })}
          />
        </div>
      ) : (
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
      )}

      {isLoggedIn && paymentChoice.kind === 'new-card' && (
        <label className="flex items-start gap-3 cursor-pointer">
          <div
            className={cn(
              'w-4 h-4 border flex items-center justify-center shrink-0 mt-0.5',
              'transition-colors duration-200',
              saveCard ? 'bg-umber border-umber' : 'bg-transparent border-muted-foreground',
            )}
          >
            {saveCard && (
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
            checked={saveCard}
            onChange={(e) => setSaveCard(e.target.checked)}
          />
          <span className="font-body font-light text-[12px] text-umber/80">
            Save this card for faster checkout next time. Your full card details
            are never stored on Modett servers &mdash; only a secure token issued
            by PAYable.
          </span>
        </label>
      )}

      <div className="flex items-start gap-3 bg-surface-raised/50 p-4">
        <ShieldCheck className="w-5 h-5 text-[#4A7C59] shrink-0 mt-0.5" />
        <div>
          <p className="font-body font-light text-[13px] text-umber">
            Secure payment via PAYable
          </p>
          <p className="font-body font-light text-[12px] text-umber mt-1">
            {paymentChoice.kind === 'saved-card'
              ? 'Your saved card will be charged securely through PAYable. We never see your full card details.'
              : 'You will be securely redirected to the PAYable payment gateway to complete your card payment. Your card details are never stored on our servers.'}
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
            {paymentChoice.kind === 'saved-card'
              ? 'Charging saved card...'
              : 'Redirecting to payment...'}
          </span>
        ) : paymentChoice.kind === 'saved-card' ? (
          'Pay with saved card'
        ) : (
          'Confirm and Complete Purchase'
        )}
      </button>
    </div>
  )
}

interface SavedCardOptionProps {
  card: SavedCardSummary
  selected: boolean
  onSelect: () => void
}

function SavedCardOption({ card, selected, onSelect }: SavedCardOptionProps) {
  const last4 = card.maskedCardNo.slice(-4)
  const scheme = card.cardScheme?.toUpperCase() ?? 'CARD'
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full border p-4 flex items-center justify-between text-left',
        'transition-colors duration-200',
        selected
          ? 'border-umber bg-surface-raised/40'
          : 'border-muted bg-transparent hover:border-umber/50',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
            selected ? 'border-umber' : 'border-muted-foreground',
          )}
        >
          {selected && <span className="w-2 h-2 rounded-full bg-umber" />}
        </span>
        <CreditCard className="w-4 h-4 text-umber/70" />
        <span className="font-body font-light text-[14px] text-umber">
          {scheme} &middot;&middot;&middot;&middot; {last4}
        </span>
        {card.isDefault && (
          <span className="ml-1 inline-flex items-center gap-1 text-[10px] uppercase tracking-[0.15em] text-umber/60 border border-umber/30 px-1.5 py-0.5">
            <Check className="w-2.5 h-2.5" />
            Default
          </span>
        )}
      </div>
      {card.cardExp && (
        <span className="font-body font-light text-[11px] text-umber/60 uppercase tracking-[0.15em]">
          Exp {card.cardExp.slice(0, 2)}/{card.cardExp.slice(2)}
        </span>
      )}
    </button>
  )
}

interface NewCardOptionProps {
  selected: boolean
  onSelect: () => void
}

function NewCardOption({ selected, onSelect }: NewCardOptionProps) {
  return (
    <button
      type="button"
      onClick={onSelect}
      aria-pressed={selected}
      className={cn(
        'w-full border p-4 flex items-center justify-between text-left',
        'transition-colors duration-200',
        selected
          ? 'border-umber bg-surface-raised/40'
          : 'border-muted bg-transparent hover:border-umber/50',
      )}
    >
      <div className="flex items-center gap-3">
        <span
          className={cn(
            'relative w-4 h-4 rounded-full border-2 flex items-center justify-center shrink-0',
            selected ? 'border-umber' : 'border-muted-foreground',
          )}
        >
          {selected && <span className="w-2 h-2 rounded-full bg-umber" />}
        </span>
        <span className="font-body font-light text-[14px] text-umber">
          Use a new card
        </span>
      </div>
      <div className="flex items-center gap-2">
        <div className="relative h-6 w-9 bg-white rounded px-1 flex items-center justify-center shadow-sm">
          <Image
            src="/images/visa-logo.png"
            alt="Visa"
            fill
            className="object-contain p-0.5"
            sizes="36px"
          />
        </div>
        <div className="relative h-6 w-9 bg-white rounded px-1 flex items-center justify-center shadow-sm">
          <Image
            src="/images/Mastercard.png"
            alt="Mastercard"
            fill
            className="object-contain p-0.5"
            sizes="36px"
          />
        </div>
      </div>
    </button>
  )
}
