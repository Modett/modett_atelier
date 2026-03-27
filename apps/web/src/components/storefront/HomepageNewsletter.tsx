'use client'

import { NewsletterSection } from '@modett/ui'

/**
 * Client wrapper for NewsletterSection so onSubmit can be wired to
 * POST /newsletter/subscribe via TanStack mutation later.
 */
export function HomepageNewsletter() {
  const handleSubmit = (email: string) => {
    // TODO: Wire to POST /newsletter/subscribe via TanStack mutation
    console.log('Newsletter signup:', email)
  }

  return <NewsletterSection onSubmit={handleSubmit} />
}
