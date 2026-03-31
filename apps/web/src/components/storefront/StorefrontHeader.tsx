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
import { storePostAuthPath } from '@/lib/postAuthRedirect'
import { NAV_LINKS } from '@/lib/nav-links'
import { ModettLogo } from '@/components/shared/ModettLogo'
import { CartButton } from '@/components/shared/CartButton'

export function StorefrontHeader() {
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const { openPanel } = useAuthPanel()
  const { user, isLoggedIn } = useSession()

  const openMenu = useCallback(() => setMobileOpen(true), [])
  const closeMenu = useCallback(() => setMobileOpen(false), [])

  const handleAccountIconClick = useCallback(() => {
    storePostAuthPath('/account')
    openPanel()
  }, [openPanel])

  return (
    <>
      <header
        className={cn(
          'relative w-full',
          'bg-background',
          'border-b border-muted',
        )}
        aria-label="Site header"
      >

        {/* ── ROW 1: Utility bar (desktop only) ──────── */}
        <div
          className={cn(
            'hidden md:flex items-center justify-between',
            'px-4 md:px-6 lg:px-8 h-9',
            'border-b border-muted/50',
          )}
        >
          <div className="flex items-center gap-6">
            <button
              type="button"
              className={cn(
                'flex items-center gap-1.5',
                'font-body font-light text-[11px]',
                'uppercase tracking-[0.15em]',
                'text-muted-foreground hover:text-umber',
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
                'text-muted-foreground hover:text-umber',
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
                'text-muted-foreground hover:text-umber',
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
              className="text-muted-foreground hover:text-umber transition-colors duration-200"
            >
              <SearchIcon size={16} />
            </Link>
            <Link
              href="/account/wishlist"
              aria-label="Wishlist"
              className="text-muted-foreground hover:text-umber transition-colors duration-200"
            >
              <WishlistIcon size={16} />
            </Link>
            {isLoggedIn ? (
              <Link
                href="/account"
                aria-label={`My account — ${user?.firstName}`}
                className="flex items-center justify-center
                           w-6 h-6 rounded-full
                           bg-surface-raised text-umber
                           font-body font-bold text-[11px]
                           hover:bg-muted transition-colors duration-200"
              >
                {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
              </Link>
            ) : (
              <button
                type="button"
                onClick={handleAccountIconClick}
                aria-label="Sign in or create account"
                className="text-muted-foreground hover:text-umber transition-colors duration-200"
              >
                <AccountIcon size={16} />
              </button>
            )}
            <CartButton
              className="text-muted-foreground hover:text-umber"
              iconSize="w-4 h-4"
            />
          </div>
        </div>

        {/* ── ROW 2: Logo (centred desktop / left mobile) ── */}
        <div className="flex items-center justify-center pt-4 pb-3 px-4 md:px-6 lg:px-8">
          {/* Mobile: logo left + icons right */}
          <div className="flex md:hidden items-center justify-between w-full">
            <ModettLogo variant="dark" size="md" href="/" />
            <div className="flex items-center gap-3">
              <CartButton
                className="text-umber hover:text-ink"
                iconSize="w-5 h-5"
              />
              {isLoggedIn ? (
                <Link
                  href="/account"
                  className="flex items-center justify-center
                             w-6 h-6 rounded-full bg-surface-raised
                             text-umber font-body font-bold text-[11px]"
                >
                  {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleAccountIconClick}
                  className="text-umber"
                >
                  <AccountIcon size={20} />
                </button>
              )}
              <button
                type="button"
                onClick={openMenu}
                aria-label="Open menu"
                className="text-umber hover:text-ink transition-colors duration-200"
              >
                <HamburgerIcon />
              </button>
            </div>
          </div>

          {/* Desktop: centred logo */}
          <div className="hidden md:block">
            <ModettLogo variant="dark" size="lg" href="/" />
          </div>
        </div>

        {/* ── ROW 3: Nav links (centred, desktop only) ─── */}
        <div className="hidden md:flex items-center justify-center gap-12 pb-4">
          {NAV_LINKS.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              aria-current={
                pathname === link.href ||
                pathname.startsWith(link.href + '/')
                  ? 'page'
                  : undefined
              }
              className={cn(
                'font-body font-light text-[11px]',
                'uppercase tracking-[0.25em]',
                'transition-colors duration-200',
                pathname === link.href ||
                pathname.startsWith(link.href + '/')
                  ? 'text-ink underline underline-offset-4'
                  : 'text-muted-foreground hover:text-umber',
              )}
            >
              {link.label}
            </Link>
          ))}
        </div>
      </header>

      <MobileMenu
        isOpen={mobileOpen}
        onClose={closeMenu}
        countryName="Sri Lanka"
        navLinks={NAV_LINKS.map((l) => ({
          label: l.label.toUpperCase(),
          href: l.href,
        }))}
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
