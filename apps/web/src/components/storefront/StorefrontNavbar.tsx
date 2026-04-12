'use client'

import { useState, useEffect, useCallback } from 'react'
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
  NavbarInboxIcon,
  NavbarMenuIcon,
  NavbarSearchIcon,
  NavbarUserIcon,
  NavbarWishlistIcon,
} from '@/components/shared/NavbarTrayIcons'

interface StorefrontNavbarProps {
  /** Scroll distance (px) on the homepage before switching to the solid bar */
  homeSolidThreshold?: number
}

export function StorefrontNavbar({
  homeSolidThreshold = 96,
}: StorefrontNavbarProps) {
  const [isSolid, setIsSolid] = useState(true)
  const [mobileOpen, setMobileOpen] = useState(false)
  const pathname = usePathname()
  const isHome = pathname === '/'
  const { openPanel } = useAuthPanel()
  const { user, isLoggedIn } = useSession()

  const openMenu = useCallback(() => setMobileOpen(true), [])
  const closeMenu = useCallback(() => setMobileOpen(false), [])

  const handleAccountIconClick = useCallback(() => {
    storePostAuthPath('/account')
    openPanel()
  }, [openPanel])

  useEffect(() => {
    if (!isHome) {
      setIsSolid(true)
      return
    }

    function onScroll() {
      setIsSolid(window.scrollY > homeSolidThreshold)
    }

    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [isHome, homeSolidThreshold])

  const inverse = isHome && !isSolid

  return (
    <>
      <header
        aria-label="Main navigation"
        className={cn(
          'fixed top-0 left-0 right-0 z-[60]',
          'h-13 md:h-14',
          'transition-[background-color,border-color,box-shadow,backdrop-filter] duration-300 ease-out',
          inverse
            ? [
                'border-b border-white/10',
                'bg-ink/[0.27] shadow-[0_6px_28px_rgba(0,0,0,0.34)]',
                'backdrop-blur-[2px]',
              ]
            : 'border-b border-muted bg-background shadow-none',
        )}
      >
        <div
          className={cn(
            'h-full w-full max-w-none',
            'pl-[max(12px,env(safe-area-inset-left))]',
            'pr-[max(12px,env(safe-area-inset-right))]',
            'sm:pl-[max(16px,env(safe-area-inset-left))]',
            'sm:pr-[max(16px,env(safe-area-inset-right))]',
            'md:pl-[max(20px,env(safe-area-inset-left))]',
            'md:pr-[max(20px,env(safe-area-inset-right))]',
            'lg:pl-[max(24px,env(safe-area-inset-left))]',
            'lg:pr-[max(24px,env(safe-area-inset-right))]',
          )}
        >
          <nav className="relative flex h-full w-full items-center justify-between">
            <div className="flex min-w-0 shrink-0 items-center">
              <ModettLogo
                variant={inverse ? 'light' : 'dark'}
                size="sm"
                href="/"
                className="[&_img]:h-9 md:[&_img]:h-10"
              />
            </div>

            <div
              className={cn(
                'pointer-events-none absolute left-1/2 top-1/2 hidden -translate-x-1/2 -translate-y-1/2',
                'md:pointer-events-auto md:flex md:items-center md:gap-8 lg:gap-10',
              )}
            >
              {NAV_LINKS.map((link) => {
                const isActive =
                  pathname === link.href ||
                  pathname.startsWith(`${link.href}/`)
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    aria-current={isActive ? 'page' : undefined}
                    className={cn(
                      'shrink-0 font-body font-semibold text-xs',
                      'uppercase tracking-[0.25em]',
                      'relative py-1',
                      'transition-colors duration-200',
                      inverse && 'md:text-sm md:font-bold md:tracking-[0.22em]',
                      inverse
                        ? isActive
                          ? [
                              'text-white',
                              '[text-shadow:0_1px_2px_rgba(0,0,0,0.55)]',
                              'after:absolute after:bottom-0',
                              'after:left-0 after:right-0',
                              'after:h-0.5 after:bg-white',
                            ]
                          : [
                              'text-white',
                              '[text-shadow:0_1px_2px_rgba(0,0,0,0.5)]',
                              'hover:text-white hover:underline hover:underline-offset-[6px] hover:decoration-2',
                            ]
                        : isActive
                          ? [
                              'text-ink',
                              'after:absolute after:bottom-0',
                              'after:left-0 after:right-0',
                              'after:h-0.5 after:bg-ink',
                            ]
                          : [
                              'text-ink',
                              'hover:underline hover:underline-offset-4',
                              'decoration-ink/70',
                            ],
                    )}
                  >
                    {link.label}
                  </Link>
                )
              })}
            </div>

            <div className="flex min-w-0 shrink-0 items-center justify-end gap-4 md:gap-5">
              <Link
                href="/search"
                aria-label="Search"
                className={cn(
                  'hidden md:flex transition-colors duration-200',
                  inverse
                    ? 'text-white hover:opacity-90'
                    : 'text-ink hover:opacity-80',
                )}
              >
                <NavbarSearchIcon />
              </Link>
              <Link
                href="/account/wishlist"
                aria-label="Wishlist"
                className={cn(
                  'hidden md:flex transition-colors duration-200',
                  inverse
                    ? 'text-white hover:opacity-90'
                    : 'text-ink hover:opacity-80',
                )}
              >
                <NavbarWishlistIcon />
              </Link>
              {isLoggedIn && (
                <Link
                  href="/account/inbox"
                  aria-label="Message inbox"
                  className={cn(
                    'hidden md:flex transition-colors duration-200',
                    inverse
                      ? 'text-white hover:opacity-90'
                      : 'text-ink hover:opacity-80',
                  )}
                >
                  <NavbarInboxIcon />
                </Link>
              )}
              {isLoggedIn ? (
                <Link
                  href="/account"
                  aria-label={`My account — ${user?.firstName}`}
                  className={cn(
                    'flex items-center justify-center',
                    'h-7 w-7 rounded-full',
                    'font-body font-bold text-xs',
                    'transition-colors duration-200',
                    'ring-[1.5px] ring-current',
                    inverse
                      ? 'bg-white/20 text-white hover:bg-white/30'
                      : 'bg-surface-raised text-ink hover:bg-muted',
                  )}
                >
                  {user?.firstName?.charAt(0)?.toUpperCase() ?? '?'}
                </Link>
              ) : (
                <button
                  type="button"
                  onClick={handleAccountIconClick}
                  aria-label="Sign in or create account"
                  className={cn(
                    'transition-colors duration-200',
                    inverse
                      ? 'text-white hover:opacity-90'
                      : 'text-ink hover:opacity-80',
                  )}
                >
                  <NavbarUserIcon />
                </button>
              )}
              <CartButton
                className={
                  inverse
                    ? 'text-white hover:opacity-90'
                    : 'text-ink hover:opacity-80'
                }
              />
              <button
                type="button"
                onClick={openMenu}
                aria-label="Open menu"
                className={cn(
                  'md:hidden transition-colors duration-200',
                  inverse ? 'text-white hover:opacity-90' : 'text-ink hover:opacity-80',
                )}
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
        navLinks={NAV_LINKS.map((l) => ({
          label: l.label.toUpperCase(),
          href: l.href,
        }))}
      />
    </>
  )
}
