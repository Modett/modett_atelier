'use client'

import {
  useState,
  useEffect,
  useRef,
  useCallback,
  type RefObject,
} from 'react'
import { X }                      from 'lucide-react'
import { cn }                     from '@/lib/utils'
import { useNewsletterSubscribe } from '@/hooks/useNewsletterSubscribe'

const LAST_SHOWN_KEY    = 'modett_newsletter_last_shown'
const DECLINED_KEY      = 'modett_newsletter_declined'
const SUBSCRIBED_KEY    = 'modett_newsletter_subscribed'
const SHOW_DELAY_MS     = 3000
// TODO: Replace EDITORIAL_IMAGE with real R2 URL
// e.g. 'https://pub-xxx.r2.dev/editorial/newsletter-hero.jpg'
const EDITORIAL_IMAGE   = '/images/newsletter-editorial.jpg'

function getTodayString(): string {
  return new Date().toISOString().slice(0, 10)
}

function shouldShowPopup(): boolean {
  if (typeof window === 'undefined') return false
  try {
    if (localStorage.getItem(DECLINED_KEY) === 'true') return false
    if (localStorage.getItem(SUBSCRIBED_KEY) === 'true') return false
    const lastShown = localStorage.getItem(LAST_SHOWN_KEY)
    if (lastShown === getTodayString()) return false
    return true
  } catch {
    return false
  }
}

function markShownToday(): void {
  try {
    localStorage.setItem(LAST_SHOWN_KEY, getTodayString())
  } catch { /* ignore */ }
}

function markDeclined(): void {
  try {
    localStorage.setItem(DECLINED_KEY, 'true')
  } catch { /* ignore */ }
}

function markSubscribed(): void {
  try {
    localStorage.setItem(SUBSCRIBED_KEY, 'true')
  } catch { /* ignore */ }
}

export function NewsletterPopup() {
  const [isOpen, setIsOpen]         = useState(false)
  const [email, setEmail]           = useState('')
  const [emailError, setEmailError] = useState('')
  const inputRef                    = useRef<HTMLInputElement>(null)
  const timerRef                    = useRef<ReturnType<typeof setTimeout> | null>(null)

  const {
    subscribe,
    isPending,
    promoCode,
    error,
    isSuccess,
  } = useNewsletterSubscribe()

  const handleClose = useCallback(() => {
    setIsOpen(false)
  }, [])

  useEffect(() => {
    if (!shouldShowPopup()) return

    timerRef.current = setTimeout(() => {
      setIsOpen(true)
      markShownToday()
    }, SHOW_DELAY_MS)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  useEffect(() => {
    if (isOpen && !isSuccess) {
      setTimeout(() => inputRef.current?.focus(), 100)
    }
  }, [isOpen, isSuccess])

  useEffect(() => {
    if (!isOpen) return
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') handleClose()
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [isOpen, handleClose])

  useEffect(() => {
    if (!isSuccess) return
    markSubscribed()
    const t = setTimeout(() => setIsOpen(false), 3000)
    return () => clearTimeout(t)
  }, [isSuccess])

  function handleDecline() {
    markDeclined()
    setIsOpen(false)
  }

  async function handleSubmit() {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
    if (!email.trim() || !emailRegex.test(email.trim())) {
      setEmailError('Please enter a valid email address.')
      return
    }
    setEmailError('')
    await subscribe(email.trim())
  }

  if (!isOpen) return null

  return (
    <>
      <div
        aria-hidden="true"
        onClick={handleClose}
        className="fixed inset-0 z-[90] bg-graphite/60
                   transition-opacity duration-300"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Newsletter signup"
        className={cn(
          'fixed z-[91] inset-0 m-auto',
          'hidden md:flex',
          'w-full max-w-[860px] h-[520px]',
          'shadow-2xl',
        )}
      >
        <div className="w-[45%] flex-shrink-0 relative overflow-hidden">
          <div
            className="absolute inset-0 bg-[#B8C4B0]"
            style={{
              backgroundImage: `url(${EDITORIAL_IMAGE})`,
              backgroundSize: 'cover',
              backgroundPosition: 'center top',
            }}
          />
        </div>

        <div className="flex-1 bg-[#D4E2DC] flex flex-col
                        justify-center px-10 py-10 relative">
          <RightPanelContent
            email={email}
            setEmail={setEmail}
            emailError={emailError}
            error={error}
            isPending={isPending}
            isSuccess={isSuccess}
            promoCode={promoCode}
            inputRef={inputRef}
            onSubmit={handleSubmit}
            onDecline={handleDecline}
            onClose={handleClose}
          />
        </div>
      </div>

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Newsletter signup"
        className={cn(
          'fixed z-[91] md:hidden',
          'inset-x-4 top-1/2 -translate-y-1/2',
          'bg-[#D4E2DC] rounded-none shadow-2xl',
          'px-6 py-10',
          'max-h-[90vh] overflow-y-auto',
        )}
      >
        <div className="flex justify-center mb-6">
          <img
            src="/images/modett-logo-foreground.png"
            alt="Modett"
            className="h-8 w-auto object-contain"
          />
        </div>
        <RightPanelContent
          email={email}
          setEmail={setEmail}
          emailError={emailError}
          error={error}
          isPending={isPending}
          isSuccess={isSuccess}
          promoCode={promoCode}
          inputRef={inputRef}
          onSubmit={handleSubmit}
          onDecline={handleDecline}
          onClose={handleClose}
        />
      </div>
    </>
  )
}

interface RightPanelProps {
  email:       string
  setEmail:    (v: string) => void
  emailError:  string
  error:       string | null
  isPending:   boolean
  isSuccess:   boolean
  promoCode:   string | null
  inputRef:    RefObject<HTMLInputElement | null>
  onSubmit:    () => void
  onDecline:   () => void
  onClose:     () => void
}

function RightPanelContent({
  email, setEmail, emailError, error,
  isPending, isSuccess, promoCode,
  inputRef, onSubmit, onDecline, onClose,
}: RightPanelProps) {
  return (
    <>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close"
        className="absolute top-4 right-4
                   text-umber/60 hover:text-umber
                   transition-colors duration-200
                   focus:outline-none"
      >
        <X className="w-5 h-5" />
      </button>

      {isSuccess && promoCode ? (
        <div className="text-center space-y-4">
          <p className="font-display font-medium text-[22px]
                        text-umber leading-tight">
            You&apos;re in!
          </p>
          <p className="font-body font-light text-[14px]
                        text-umber/80 leading-relaxed">
            Your exclusive promo code is on its way to your
            inbox. Use it at checkout for 15% off.
          </p>
          <div className="bg-white/50 border border-umber/20
                          px-6 py-4 text-center">
            <p className="font-body font-light text-[11px]
                          uppercase tracking-[0.2em]
                          text-umber/60 mb-1">
              Your code
            </p>
            <p className="font-display font-bold text-[28px]
                          text-umber tracking-[0.15em]">
              {promoCode}
            </p>
          </div>
          <p className="font-body font-light text-[12px]
                        text-umber/60">
            Closing in a moment…
          </p>
        </div>
      ) : (
        <div className="space-y-5">
          <div>
            <p className="font-display font-medium
                          text-[26px] md:text-[30px]
                          text-umber leading-tight">
              Sign up &amp; Enjoy
            </p>
            <p className="font-display font-bold
                          text-[64px] md:text-[80px]
                          text-umber leading-none mt-1">
              15% Off
            </p>
          </div>

          <p className="font-body font-light text-[14px]
                        text-umber/80 leading-relaxed
                        max-w-[340px]">
            Be the first to know about new arrivals,
            exclusive offers and more.
          </p>

          <div className="space-y-3">
            <div>
              <input
                ref={inputRef}
                type="email"
                value={email}
                onChange={(e) => {
                  setEmail(e.target.value)
                }}
                onKeyDown={(e) => {
                  if (e.key === 'Enter') onSubmit()
                }}
                placeholder="Enter e-mail"
                className={cn(
                  'w-full h-12 px-4 rounded-none',
                  'bg-white/70 border',
                  emailError
                    ? 'border-red-400'
                    : 'border-umber/30 focus:border-umber',
                  'font-body font-light text-[14px] text-umber',
                  'placeholder:text-umber/40',
                  'outline-none transition-colors duration-200',
                )}
              />
              {emailError && (
                <p className="font-body font-light text-[12px]
                               text-red-500 mt-1">
                  {emailError}
                </p>
              )}
              {error && (
                <p className="font-body font-light text-[12px]
                               text-umber/70 mt-1">
                  {error}
                </p>
              )}
            </div>

            <button
              type="button"
              onClick={onSubmit}
              disabled={isPending}
              className={cn(
                'w-full h-12 bg-umber text-background',
                'font-body font-light uppercase',
                'tracking-[0.25em] text-[13px]',
                'rounded-none transition-colors duration-200',
                isPending
                  ? 'opacity-50 cursor-not-allowed'
                  : 'hover:bg-ink',
              )}
            >
              {isPending ? (
                <span className="flex items-center
                                 justify-center gap-2">
                  <span className="w-4 h-4 border-2
                                   border-background/30
                                   border-t-background
                                   rounded-full animate-spin" />
                  Signing up…
                </span>
              ) : (
                'Sign Up'
              )}
            </button>

            <button
              type="button"
              onClick={onDecline}
              className="w-full font-body font-light
                         text-[13px] text-umber/70
                         underline underline-offset-2
                         hover:text-umber transition-colors
                         duration-200 py-1"
            >
              Decline offer
            </button>
          </div>
        </div>
      )}
    </>
  )
}
