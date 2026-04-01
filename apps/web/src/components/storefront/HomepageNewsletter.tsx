'use client'

import { NewsletterSection }      from '@modett/ui'
import { useNewsletterSubscribe } from '@/hooks/useNewsletterSubscribe'

export function HomepageNewsletter() {
  const { subscribe, isPending, error, isSuccess } =
    useNewsletterSubscribe()

  return (
    <NewsletterSection
      onSubmit={(email) => { void subscribe(email) }}
      isSubmitting={isPending}
      isSuccess={isSuccess}
      successMessage="Thanks for subscribing! Check your inbox for your 15% off code."
      error={error ?? undefined}
    />
  )
}
