'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
  GlobeIcon,
  ContactIcon,
  NewsletterIcon,
  SearchIcon,
  WishlistIcon,
  AccountIcon,
  MobileMenu,
} from '@modett/ui'
import { cn } from '@/lib/utils'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { useSession } from '@/hooks/useSession'
import { NAV_LINKS } from '@/lib/nav-links'
import { ModettLogo } from '@/components/shared/ModettLogo'
import { CartButton } from '@/components/shared/CartButton'

export function HeroNav() {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const pathname = usePathname()
  const { openPanel } = useAuthPanel()
  const { user, isLoggedIn } = useSession()

  const openMenu = useCallback(() => setMobileMenuOpen(true), [])
  const closeMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <>
      <div className="absolute top-0 left-0 right-0 z-20">

        {/* ROW 1: Utility bar (desktop only) */}
        <div
          className={cn(
            'hidden md:flex items-center justify-between',
            'px-4 md:px-6 lg:px-8 h-9',
            'border-b border-hero-border',
          )}
        >
          <div className="flex items-center gap-6">
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5',
                'font-body font-light text-[11px]',
                'uppercase tracking-[0.15em]',
                'text-background/80 hover:text-background',
                'transition-colors duration-200',
              )}
            >
              <GlobeIcon size={14} className="shrink-0" />
              Sri Lanka
            </button>
            <Link
              href="/contact"
              className={cn(
                'flex items-center gap-1.5',
                'font-body font-light text-[11px]',
                'uppercase tracking-[0.15em]',
                'text-background/80 hover:text-background',
                'transition-colors duration-200',
              )}
            >
              <ContactIcon size={14} className="shrink-0" />
              Contact Us
            </Link>
            <Link
              href="/newsletter"
              className={cn(
                'flex items-center gap-1.5',
                'font-body font-light text-[11px]',
                'uppercase tracking-[0.15em]',
                'text-background/80 hover:text-background',
                'transition-colors duration-200',
              )}
            >
              <NewsletterIcon size={14} className="shrink-0" />
              Newsletter
            </Link>
          </div>

          <div className="flex items-center gap-4">
            <Link
              href="/search"
              aria-label="Search"
              className="text-background/80 hover:text-background transition-colors duration-200"
            >
              <SearchIcon size={16} />
            </Link>
            <Link
              href="/wishlist"
              aria-label="Wishlist"
              className="text-background/80 hover:text-background transition-colors duration-200"
            >
              <WishlistIcon size={16} />
            </Link>
            {isLoggedIn ? (
              <Link
                href="/account"
                aria-label={`My account — ${user?.firstName}`}
                className="flex items-center justify-center
                           w-6 h-6 rounded-full
                           bg-background/20 text-background
                           font-body font-bold text-[11px]
                           hover:bg-background/30 transition-colors duration-200"
              >
                {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
              </Link>
            ) : (
              <button
                type="button"
                onClick={openPanel}
                aria-label="Sign in or create account"
                className="text-background/80 hover:text-background transition-colors duration-200"
              >
                <AccountIcon size={16} />
              </button>
            )}
            <CartButton
              className="text-background/80 hover:text-background"
              iconSize="w-4 h-4"
            />
          </div>
        </div>

        {/* ROW 2: Logo (centred) */}
        <div className="flex items-center justify-center pt-6 pb-4 md:pt-5 md:pb-3">
          {/* Mobile: logo left + hamburger right */}
          <div className="flex md:hidden items-center justify-between w-full px-4">
            <ModettLogo variant="light" size="md" href="/" />
            <div className="flex items-center gap-3">
              <CartButton
                className="text-background"
                iconSize="w-5 h-5"
              />
              <button
                type="button"
                onClick={openMenu}
                aria-label="Open menu"
                className="text-background"
              >
                <HamburgerIcon />
              </button>
            </div>
          </div>

          {/* Desktop: centred logo */}
          <div className="hidden md:block">
            <ModettLogo variant="light" size="lg" href="/" />
          </div>
        </div>

        {/* ROW 3: Nav links (centred, desktop only) */}
        <div className="hidden md:flex items-center justify-center gap-12 pb-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={pathname === link.href ? 'page' : undefined}
              className={cn(
                'font-body font-light text-[11px]',
                'uppercase tracking-[0.25em]',
                'transition-opacity duration-200',
                pathname === link.href
                  ? 'text-background underline underline-offset-4'
                  : 'text-background/80 hover:text-background',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </div>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={closeMenu}
        countryName="Sri Lanka"
        navLinks={NAV_LINKS.map((l) => ({ label: l.label.toUpperCase(), href: l.href }))}
      />
    </>
  )
}

function HamburgerIcon() {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      aria-hidden="true"
    >
      <path
        d="M3 6h18M3 12h18M3 18h18"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="square"
      />
    </svg>
  )
}
