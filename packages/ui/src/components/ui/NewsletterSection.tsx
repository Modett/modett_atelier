'use client'

import { useState, useEffect } from 'react'
import { cn } from '../../lib/utils'

export interface NewsletterSectionProps {
  /** Heading text (default: "Join the Modett community") */
  heading?: string
  /** Subtitle text (default: "Get the latest fashion trends and exclusive offers") */
  subtitle?: string
  /** Submit handler — receives the email string */
  onSubmit: (email: string) => void
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Whether submission was successful — shows success state */
  isSuccess?: boolean
  /** Success message (default: "Thank you for subscribing!") */
  successMessage?: string
  /** Error message from API (e.g. "This email is already subscribed") */
  error?: string
  /** Privacy policy link URL */
  privacyPolicyUrl?: string
  /** Additional className for the outer section */
  className?: string
}

export function NewsletterSection({
  heading,
  subtitle,
  onSubmit,
  isSubmitting = false,
  isSuccess = false,
  successMessage,
  error,
  privacyPolicyUrl,
  className,
}: NewsletterSectionProps) {
  const [email, setEmail] = useState('')

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (email.trim()) {
      onSubmit(email.trim())
    }
  }

  useEffect(() => {
    if (isSuccess) {
      setEmail('')
    }
  }, [isSuccess])

  return (
    <section className={cn('bg-deep', className)} aria-label="Newsletter signup">
      <div
        className={cn(
          'max-w-7xl mx-auto',
          'px-5 md:px-8 lg:px-12',
          'py-12 md:py-16 lg:py-20',
          'flex flex-col md:flex-row md:items-center md:justify-between',
          'gap-8 md:gap-12',
        )}
      >
        {/* Left: text content */}
        <div className="flex flex-col">
          <h2 className="font-display text-3xl md:text-4xl font-normal italic text-background">
            {heading ?? 'Join the Modett community'}
          </h2>
          <p className="font-body text-sm md:text-base font-light text-background/70 mt-3">
            {subtitle ?? 'Get the latest fashion trends and exclusive offers'}
          </p>
        </div>

        {/* Right: form or success state */}
        <div className="flex flex-col w-full md:max-w-md">
          {isSuccess ? (
            <div className="flex items-center gap-3">
              <svg
                width={20}
                height={20}
                viewBox="0 0 24 24"
                fill="none"
                stroke="currentColor"
                strokeWidth={1.5}
                className="text-highlight shrink-0"
                aria-hidden="true"
              >
                <path
                  d="M20 6L9 17l-5-5"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
              <p className="font-body text-sm font-normal text-background">
                {successMessage ?? 'Thank you for subscribing!'}
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="w-full">
              <div className="flex flex-col md:flex-row">
                <input
                  type="email"
                  placeholder="Enter e-mail"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                  disabled={isSubmitting || isSuccess}
                  aria-label="Email address"
                  className={cn(
                    'flex-1',
                    'h-12 md:h-14',
                    'px-4',
                    'bg-background text-text',
                    'font-body text-sm font-normal',
                    'placeholder:text-muted-foreground/60',
                    'border border-background/30',
                    'md:border-r-0',
                    'focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight',
                    'disabled:opacity-50',
                    'rounded-none',
                  )}
                />
                <button
                  type="submit"
                  disabled={isSubmitting || isSuccess}
                  className={cn(
                    'h-12 md:h-14',
                    'px-6 md:px-8',
                    'flex items-center justify-center gap-2',
                    'border border-background/50',
                    'bg-transparent',
                    'font-body font-light text-sm uppercase tracking-[0.25em]',
                    'text-background',
                    'hover:bg-background/10 hover:border-background',
                    'active:bg-background/15',
                    'transition-all duration-200',
                    'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight',
                    'disabled:opacity-50 disabled:cursor-not-allowed',
                    'rounded-none',
                    'w-full md:w-auto',
                    'mt-2 md:mt-0',
                  )}
                >
                  <svg
                    width={16}
                    height={16}
                    viewBox="0 0 24 24"
                    fill="none"
                    stroke="currentColor"
                    strokeWidth={1.5}
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="shrink-0"
                    aria-hidden="true"
                  >
                    <rect x="2" y="4" width="20" height="16" rx="2" />
                    <path d="M22 4L12 13 2 4" />
                  </svg>
                  <span>
                    {isSubmitting ? 'Subscribing...' : 'Subscribe'}
                  </span>
                </button>
              </div>

              {error && (
                <p
                  className="font-body text-xs font-normal text-editorial mt-2"
                  role="alert"
                >
                  {error}
                </p>
              )}
            </form>
          )}

          <p
            className={cn(
              'font-body text-[11px] font-light text-background/50 mt-3 leading-relaxed max-w-md',
            )}
          >
            By entering your e-mail address, you agree to receive Modett
            communications regarding the brand&apos;s collections, news, and
            special content. For more information, see our{' '}
            <a
              href={privacyPolicyUrl ?? '/privacy-policy'}
              className="underline underline-offset-2 decoration-background/30 hover:decoration-background/60 hover:text-background/70 transition-colors duration-200"
            >
              Privacy Policy
            </a>
            .
          </p>
        </div>
      </div>
    </section>
  )
}
