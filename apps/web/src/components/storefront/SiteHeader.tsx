'use client'

import { SiteHeader as SiteHeaderUI } from '@modett/ui'
import { useCartCount } from '@/hooks/useCartCount'
import { useSession } from '@/hooks/useSession'
import { useUnreadCount } from '@/hooks/useAccount'
import { useGeo } from '@/hooks/useCurrency'

export interface StorefrontSiteHeaderProps {
  variant?: 'transparent' | 'solid'
  bannerMessage?: string | null
  bannerLink?: string | null
}

export function SiteHeader({
  variant = 'solid',
  bannerMessage,
  bannerLink,
}: StorefrontSiteHeaderProps) {
  const count = useCartCount()
  const { isLoggedIn } = useSession()
  const { currency } = useGeo()
  const { data: unreadInbox } = useUnreadCount()

  return (
    <SiteHeaderUI
      variant={variant}
      bannerMessage={bannerMessage}
      bannerLink={bannerLink}
      cartCount={count}
      isAuthenticated={isLoggedIn}
      unreadInboxCount={isLoggedIn ? (unreadInbox?.count ?? 0) : 0}
      currency={currency}
      countryName="Sri Lanka"
      logoSrc="/images/modett-logo-white.svg"
      solidLogoSrc="/images/logo.png"
    />
  )
}
