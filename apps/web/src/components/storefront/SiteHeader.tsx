'use client'

import { SiteHeader as SiteHeaderUI } from '@modett/ui'
import { useCartStore } from '@/store/cart.store'
import { useAuthStore } from '@/store/auth.store'
import { useCurrencyStore } from '@/store/currency.store'

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
  const cartCount = useCartStore((s) => s.itemCount)
  const isAuthenticated = useAuthStore((s) => s.isAuthenticated)
  const { currency, countryName } = useCurrencyStore()

  return (
    <SiteHeaderUI
      variant={variant}
      bannerMessage={bannerMessage}
      bannerLink={bannerLink}
      cartCount={cartCount}
      isAuthenticated={isAuthenticated}
      currency={currency}
      countryName={countryName}
      logoSrc="/images/modett-logo-white.svg"
      solidLogoSrc="/images/logo.png"
    />
  )
}
