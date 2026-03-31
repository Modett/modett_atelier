'use client'

import { useState, useEffect, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import {
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

interface ScrolledNavbarProps {
  heroHeight?: number
}

export function ScrolledNavbar({
  heroHeight,
}: ScrolledNavbarProps) {
  const [visible, setVisible] = useState(false)
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

  useEffect(() => {
    const threshold = heroHeight ?? window.innerHeight * 0.9

    function onScroll() {
      setVisible(window.scrollY > threshold)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [heroHeight])

  return (
    <>
      <header
        aria-label="Main navigation"
        className={cn(
          'fixed top-0 left-0 right-0 z-[60]',
          'bg-background border-b border-muted',
          'h-13 md:h-14',
          'transition-transform duration-300 ease-out',
          visible ? 'translate-y-0' : '-translate-y-full',
        )}
      >
        <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 h-full">
          <nav className="flex items-center justify-between h-full">

            {/* LEFT: Logo */}
            <ModettLogo variant="dark" size="sm" href="/" />

            {/* CENTRE: Nav links (desktop) */}
            <div className="hidden md:flex items-center gap-10">
              {NAV_LINKS.map((link) => (
                <Link
                  key={link.href}
                  href={link.href}
                  aria-current={pathname === link.href ? 'page' : undefined}
                  className={cn(
                    'font-body font-light text-[11px]',
                    'uppercase tracking-[0.25em]',
                    'relative py-1',
                    'transition-colors duration-200',
                    pathname === link.href
                      ? [
                          'text-ink',
                          'after:absolute after:bottom-0',
                          'after:left-0 after:right-0',
                          'after:h-px after:bg-ink after:opacity-40',
                        ]
                      : 'text-umber hover:text-ink',
                  )}
                >
                  {link.label}
                </Link>
              ))}
            </div>

            {/* RIGHT: Icons */}
            <div className="flex items-center gap-4 md:gap-5">
              <Link
                href="/search"
                aria-label="Search"
                className="hidden md:flex text-umber hover:text-ink transition-colors duration-200"
              >
                <SearchIcon size={20} />
              </Link>
              <Link
                href="/wishlist"
                aria-label="Wishlist"
                className="hidden md:flex text-umber hover:text-ink transition-colors duration-200"
              >
                <WishlistIcon size={20} />
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
                  className="text-umber hover:text-ink transition-colors duration-200"
                >
                  <AccountIcon size={20} />
                </button>
              )}
              <CartButton
                className="text-umber hover:text-ink"
                iconSize="w-5 h-5"
              />
              {/* Mobile hamburger */}
              <button
                type="button"
                onClick={openMenu}
                aria-label="Open menu"
                className="md:hidden text-umber hover:text-ink transition-colors duration-200"
              >
                <HamburgerIcon />
              </button>
            </div>
          </nav>
        </div>
      </header>

      <MobileMenu
        isOpen={mobileOpen}
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
