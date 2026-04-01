import { StorefrontHeader } from '@/components/storefront/StorefrontHeader'
import { ScrolledNavbar } from '@/components/storefront/ScrolledNavbar'
import { NewsletterPopup } from '@/components/storefront/NewsletterPopup'
import { SiteFooter } from '@modett/ui'

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <StorefrontHeader />
      {/* Compact navbar slides in when user scrolls past the full header (~140px) */}
      <ScrolledNavbar heroHeight={140} />
      <main className="min-h-screen bg-background">
        {children}
      </main>
      <SiteFooter logoUrl="/images/modett-logo-foreground.png" />
      <NewsletterPopup />
    </>
  )
}
