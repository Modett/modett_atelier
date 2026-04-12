import { StorefrontNavbar } from '@/components/storefront/StorefrontNavbar'
import { StorefrontMain } from '@/components/storefront/StorefrontMain'
import { NewsletterPopup } from '@/components/storefront/NewsletterPopup'
import { PageTracker } from '@/components/storefront/PageTracker'
import { SiteFooter } from '@modett/ui'

export default function StorefrontLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <>
      <PageTracker />
      <StorefrontNavbar />
      <StorefrontMain>{children}</StorefrontMain>
      <SiteFooter logoUrl="/images/modett-logo-foreground.png" />
      <NewsletterPopup />
    </>
  )
}
