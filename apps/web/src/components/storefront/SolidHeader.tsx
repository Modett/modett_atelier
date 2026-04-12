'use client'

import { useState, useCallback } from 'react'
import { usePathname } from 'next/navigation'
import Link from 'next/link'
import { MobileMenu } from '@modett/ui'
import { cn } from '@/lib/utils'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { useSession } from '@/hooks/useSession'
import { storePostAuthPath } from '@/lib/postAuthRedirect'
import { NAV_LINKS } from '@/lib/nav-links'
import { ModettLogo } from '@/components/shared/ModettLogo'
import { CartButton } from '@/components/shared/CartButton'
import {
  NavbarMenuIcon,
  NavbarSearchIcon,
  NavbarUserIcon,
  NavbarWishlistIcon,
} from '@/components/shared/NavbarTrayIcons'

export function SolidHeader() {
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
        aria-label="Main navigation"
        className={cn(
          'sticky top-0 z-50',
          'bg-background border-b border-muted',
          'h-13 md:h-14',
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
                <NavbarSearchIcon />
              </Link>
              <Link
                href="/account/wishlist"
                aria-label="Wishlist"
                className="hidden md:flex text-umber hover:text-ink transition-colors duration-200"
              >
                <NavbarWishlistIcon />
              </Link>
              {isLoggedIn ? (
                <Link
                  href="/account"
                  aria-label={`My account — ${user?.firstName}`}
                  className={cn(
                    'flex h-7 w-7 items-center justify-center rounded-full',
                    'bg-surface-raised font-body text-xs font-bold text-umber',
                    'ring-[1.5px] ring-current hover:bg-muted',
                    'transition-colors duration-200',
                  )}
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
                  <NavbarUserIcon />
                </button>
              )}
              <CartButton className="text-umber hover:text-ink" />
              <button
                type="button"
                onClick={openMenu}
                aria-label="Open menu"
                className="md:hidden text-umber hover:text-ink transition-colors duration-200"
              >
                <NavbarMenuIcon />
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
