'use client'

import { SiteFooter } from '@modett/ui'
import { useNewsletterSubscribe } from '@/hooks/useNewsletterSubscribe'

export function StorefrontFooter() {
  const { subscribe, isPending, error, isSuccess } = useNewsletterSubscribe()

  return (
    <SiteFooter
      logoUrl="/images/modett-logo-foreground.png"
      newsletter={{
        onSubmit: (email) => { void subscribe(email) },
        isSubmitting: isPending,
        isSuccess,
        successMessage: 'Thanks for subscribing! Check your inbox for your 15% off code.',
        error: error ?? undefined,
        privacyPolicyUrl: '/privacy',
      }}
    />
  )
}
