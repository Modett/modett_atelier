'use client'

import { useState, useEffect, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GlobeIcon,
  ContactIcon,
  NewsletterIcon,
  SearchIcon,
  WishlistIcon,
  AccountIcon,
  CartIcon,
} from './NavIcons'
import { MobileMenu } from './MobileMenu'

export interface SiteHeaderProps {
  /** Whether the header overlays transparent content (e.g. homepage hero) */
  variant?: 'transparent' | 'solid'
  /** Active banner message from catalog.banners (nullable) */
  bannerMessage?: string | null
  /** Banner link URL */
  bannerLink?: string | null
  /** Cart item count for badge */
  cartCount?: number
  /** Whether user is logged in */
  isAuthenticated?: boolean
  /** Unread account inbox messages (storefront header badge) */
  unreadInboxCount?: number
  /** Current currency code */
  currency?: 'LKR' | 'SGD' | 'USD'
  /** Current country name for display */
  countryName?: string
  /** Logo image URL for transparent state (e.g. /images/modett-logo-white.svg) */
  logoSrc?: string
  /** Logo image URL for solid/scrolled state (e.g. /images/logo.png) */
  solidLogoSrc?: string
  /** Nav link items: label + href */
  navLinks?: Array<{ label: string; href: string }>
}

const DEFAULT_NAV_LINKS = [
  { label: 'NEW ARRIVALS', href: '/new-arrivals' },
  { label: 'COLLECTIONS', href: '/collections' },
  { label: 'BRAND PHILOSOPHY', href: '/brand-philosophy' },
  { label: 'CONTACT', href: '/contact' },
]

const SCROLL_THRESHOLD = 100

export function SiteHeader({
  variant = 'solid',
  bannerMessage,
  bannerLink,
  cartCount = 0,
  isAuthenticated = false,
  unreadInboxCount = 0,
  currency = 'USD',
  countryName = 'Sri Lanka',
  logoSrc,
  solidLogoSrc,
  navLinks = DEFAULT_NAV_LINKS,
}: SiteHeaderProps) {
  const [isScrolled, setIsScrolled] = useState(false)
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false)
  const [prefersReducedMotion, setPrefersReducedMotion] = useState(false)

  const showSolidState = variant === 'solid' || (variant === 'transparent' && isScrolled)

  useEffect(() => {
    const mq = window.matchMedia('(prefers-reduced-motion: reduce)')
    setPrefersReducedMotion(mq.matches)
    const handler = () => setPrefersReducedMotion(mq.matches)
    mq.addEventListener('change', handler)
    return () => mq.removeEventListener('change', handler)
  }, [])

  useEffect(() => {
    if (variant !== 'transparent') return
    const handleScroll = () => {
      setIsScrolled(window.scrollY > SCROLL_THRESHOLD)
    }
    handleScroll()
    window.addEventListener('scroll', handleScroll, { passive: true })
    return () => window.removeEventListener('scroll', handleScroll)
  }, [variant])

  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden'
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [mobileMenuOpen])

  const openMobileMenu = useCallback(() => setMobileMenuOpen(true), [])
  const closeMobileMenu = useCallback(() => setMobileMenuOpen(false), [])

  return (
    <>
      <a
        href="#main-content"
        className="sr-only focus:fixed focus:left-4 focus:top-4 focus:z-[100] focus:m-0 focus:block focus:h-auto focus:w-auto focus:overflow-visible focus:whitespace-normal focus:rounded focus:bg-background focus:px-4 focus:py-2 focus:text-sm focus:font-body focus:font-light focus:uppercase focus:tracking-[0.25em] focus:outline-none focus:ring-2 focus:ring-foreground focus:[clip:auto]"
      >
        Skip to content
      </a>

      {/* Transparent overlay state — only when variant=transparent and not scrolled */}
      {variant === 'transparent' && !showSolidState && (
        <header
          className="absolute left-0 right-0 top-0 z-40 flex w-full flex-col items-center"
          aria-label="Main navigation"
        >
          {bannerMessage && (
            <a
              href={bannerLink ?? '#'}
              className="flex w-full items-center justify-center bg-deep py-2 font-body text-xs font-light uppercase tracking-[0.2em] text-background transition-opacity hover:opacity-90 md:text-xs"
            >
              {bannerMessage}
            </a>
          )}
          <div className="flex h-10 w-full max-w-page items-center justify-between px-4 md:px-8">
            <div className="hidden items-center gap-x-4 md:flex">
              <span className="flex items-center gap-x-2 font-body text-xs font-light tracking-wide text-background">
                <GlobeIcon size={16} className="shrink-0 text-background" />
                {countryName}
              </span>
              <a
                href="/contact"
                className="flex items-center gap-x-2 font-body text-xs font-light tracking-wide text-background transition-opacity hover:opacity-70"
              >
                <ContactIcon size={16} className="shrink-0 text-background" />
                Contact Us
              </a>
              <a
                href="/newsletter"
                className="flex items-center gap-x-2 font-body text-xs font-light tracking-wide text-background transition-opacity hover:opacity-70"
              >
                <NewsletterIcon size={16} className="shrink-0 text-background" />
                Newsletter
              </a>
            </div>
            <button
              type="button"
              className="flex min-h-[44px] min-w-[44px] items-center justify-center md:hidden"
              onClick={openMobileMenu}
              aria-label="Open menu"
              aria-expanded={mobileMenuOpen}
            >
              <HamburgerIcon className="text-background" />
            </button>
            <div className="flex items-center gap-x-4">
              <a
                href="/search"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-background transition-opacity hover:opacity-70"
                aria-label="Search"
              >
                <SearchIcon size={20} className="md:size-5" />
              </a>
              {isAuthenticated && (
                <a
                  href="/account/inbox"
                  className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-background transition-opacity hover:opacity-70"
                  aria-label={
                    unreadInboxCount > 0
                      ? `Inbox — ${unreadInboxCount} unread`
                      : 'Inbox'
                  }
                >
                  <InboxEnvelopeIcon className="size-5" />
                  {unreadInboxCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-highlight px-1 font-body text-[10px] font-bold text-white">
                      {unreadInboxCount > 9 ? '9+' : unreadInboxCount}
                    </span>
                  )}
                </a>
              )}
              <a
                href="/wishlist"
                className="hidden min-h-[44px] min-w-[44px] items-center justify-center text-background transition-opacity hover:opacity-70 md:flex"
                aria-label="Wishlist"
              >
                <WishlistIcon size={20} className="size-5" />
              </a>
              <a
                href={isAuthenticated ? '/account' : '/login'}
                className="hidden min-h-[44px] min-w-[44px] items-center justify-center text-background transition-opacity hover:opacity-70 md:flex"
                aria-label="Account"
              >
                <AccountIcon size={20} className="size-5" />
              </a>
              <a
                href="/cart"
                className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-background transition-opacity hover:opacity-70"
                aria-label="Cart"
              >
                <CartIcon size={20} className="md:size-5" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-highlight px-1 font-body text-[10px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </a>
            </div>
          </div>
          <div className="flex h-20 w-full flex-col items-center justify-center">
            {logoSrc && (
              <img
                src={logoSrc}
                alt="Modett"
                className="h-12 w-auto object-contain md:h-14"
              />
            )}
          </div>
          <nav className="hidden items-center justify-center gap-x-10 pb-6 md:flex" aria-label="Main navigation">
            {navLinks.map((link) => (
              <a
                key={link.href}
                href={link.href}
                className="font-body text-sm font-light uppercase tracking-[0.25em] text-background transition-opacity hover:opacity-70"
              >
                {link.label}
              </a>
            ))}
          </nav>
        </header>
      )}

      {/* Solid fixed state — after scroll or variant=solid */}
      <AnimatePresence>
        {showSolidState && (
          <motion.header
            initial={{ y: prefersReducedMotion ? 0 : -60 }}
            animate={{ y: 0 }}
            exit={{ y: prefersReducedMotion ? 0 : -60 }}
            transition={prefersReducedMotion ? { duration: 0 } : { duration: 0.3, ease: 'easeOut' }}
            className="fixed left-0 right-0 top-0 z-50 grid h-14 w-full grid-cols-[1fr_auto_1fr] items-center gap-4 border-b border-[length:1px] border-surface-raised bg-background px-4 md:h-14 md:px-8"
            aria-label="Main navigation"
          >
            {/* Left zone: hamburger (mobile) or utility icons (desktop) */}
            <div className="flex min-w-0 items-center gap-x-4">
              <button
                type="button"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground md:hidden"
                onClick={openMobileMenu}
                aria-label="Open menu"
                aria-expanded={mobileMenuOpen}
              >
                <HamburgerIcon className="text-foreground" />
              </button>
              <div className="hidden items-center gap-x-4 md:flex">
                <a
                  href="/"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70"
                  aria-label="Country"
                >
                  <GlobeIcon size={18} className="text-foreground" />
                </a>
                <a
                  href="/contact"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70"
                  aria-label="Contact Us"
                >
                  <ContactIcon size={18} className="text-foreground" />
                </a>
                <a
                  href="/newsletter"
                  className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70"
                  aria-label="Newsletter"
                >
                  <NewsletterIcon size={18} className="text-foreground" />
                </a>
              </div>
            </div>

            {/* Centre: logo */}
            <div className="flex justify-center">
              <a href="/" aria-label="Modett home">
                {solidLogoSrc ? (
                  <img
                    src={solidLogoSrc}
                    alt="Modett"
                    className="h-7 w-auto object-contain md:h-8"
                  />
                ) : (
                  <span className="font-display text-lg font-normal text-umber">
                    MODETT
                  </span>
                )}
              </a>
            </div>

            {/* Right zone: Search, Wishlist, Account, Cart (desktop); Search + Cart only (mobile) */}
            <div className="flex min-w-0 justify-end gap-x-4">
              <a
                href="/search"
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70"
                aria-label="Search"
              >
                <SearchIcon size={18} className="text-foreground" />
              </a>
              {isAuthenticated && (
                <a
                  href="/account/inbox"
                  className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70"
                  aria-label={
                    unreadInboxCount > 0
                      ? `Inbox — ${unreadInboxCount} unread`
                      : 'Inbox'
                  }
                >
                  <InboxEnvelopeIcon className="h-[18px] w-[18px]" />
                  {unreadInboxCount > 0 && (
                    <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-highlight px-1 font-body text-[10px] font-bold text-white">
                      {unreadInboxCount > 9 ? '9+' : unreadInboxCount}
                    </span>
                  )}
                </a>
              )}
              <a
                href="/wishlist"
                className="hidden min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70 md:flex"
                aria-label="Wishlist"
              >
                <WishlistIcon size={18} className="text-foreground" />
              </a>
              <a
                href={isAuthenticated ? '/account' : '/login'}
                className="hidden min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70 md:flex"
                aria-label="Account"
              >
                <AccountIcon size={18} className="text-foreground" />
              </a>
              <a
                href="/cart"
                className="relative flex min-h-[44px] min-w-[44px] items-center justify-center text-foreground transition-opacity hover:opacity-70"
                aria-label="Cart"
              >
                <CartIcon size={18} className="text-foreground" />
                {cartCount > 0 && (
                  <span className="absolute -right-1 -top-1 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-highlight px-1 font-body text-[10px] font-bold text-white">
                    {cartCount > 99 ? '99+' : cartCount}
                  </span>
                )}
              </a>
            </div>
          </motion.header>
        )}
      </AnimatePresence>

      <MobileMenu
        isOpen={mobileMenuOpen}
        onClose={closeMobileMenu}
        countryName={countryName}
        navLinks={navLinks}
        prefersReducedMotion={prefersReducedMotion}
        isAuthenticated={isAuthenticated}
        unreadInboxCount={unreadInboxCount}
      />
    </>
  )
}

function InboxEnvelopeIcon({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="4" width="20" height="16" rx="2" />
      <path d="M2 7l10 7 10-7" />
    </svg>
  )
}

function HamburgerIcon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 20 20"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M1 5h18M1 10h18M1 15h18"
        stroke="currentColor"
        strokeWidth={1.5}
        strokeLinecap="square"
      />
    </svg>
  )
}
