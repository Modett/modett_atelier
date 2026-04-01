'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import {
  GlobeIcon,
  ContactIcon,
  NewsletterIcon,
  WishlistIcon,
  AccountIcon,
} from './NavIcons'

export interface MobileMenuProps {
  isOpen: boolean
  onClose: () => void
  countryName: string
  navLinks: Array<{ label: string; href: string }>
  prefersReducedMotion?: boolean
  isAuthenticated?: boolean
  unreadInboxCount?: number
}

const FOCUSABLE_SELECTOR =
  'a[href], button:not([disabled]), [tabindex]:not([tabindex="-1"])'

function InboxMenuIcon({ className }: { className?: string }) {
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

export function MobileMenu({
  isOpen,
  onClose,
  countryName,
  navLinks,
  prefersReducedMotion = false,
  isAuthenticated = false,
  unreadInboxCount = 0,
}: MobileMenuProps) {
  const transition = prefersReducedMotion
    ? { duration: 0 }
    : { type: 'tween' as const, duration: 0.3, ease: 'easeInOut' as const }
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!isOpen || !panelRef.current) return
    const panel = panelRef.current
    const focusables = panel.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR)
    const first = focusables[0]
    const last = focusables[focusables.length - 1]
    if (first) first.focus()

    function handleKeyDown(e: KeyboardEvent) {
      if (e.key !== 'Tab') return
      if (e.shiftKey) {
        if (document.activeElement === first) {
          e.preventDefault()
          last?.focus()
        }
      } else {
        if (document.activeElement === last) {
          e.preventDefault()
          first?.focus()
        }
      }
    }
    panel.addEventListener('keydown', handleKeyDown)
    return () => panel.removeEventListener('keydown', handleKeyDown)
  }, [isOpen])

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          <motion.div
            key="mobile-menu-backdrop"
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-foreground/20"
            onClick={onClose}
          />
          <motion.div
            key="mobile-menu-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Mobile navigation"
            initial={{ x: prefersReducedMotion ? 0 : '-100%' }}
            animate={{ x: 0 }}
            exit={{ x: prefersReducedMotion ? 0 : '-100%' }}
            transition={transition}
            className="fixed inset-y-0 left-0 z-50 flex w-full max-w-sm flex-col bg-foreground px-6 pt-6 pb-8 focus:outline-none"
            tabIndex={-1}
          >
            <div className="flex items-center justify-between">
              <a href="/" className="font-display text-xl font-normal text-highlight">
                MODETT
              </a>
              <button
                type="button"
                onClick={onClose}
                className="flex min-h-[44px] min-w-[44px] items-center justify-center text-background transition-opacity hover:opacity-70"
                aria-label="Close menu"
              >
                <span className="text-2xl leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </div>

            <nav
              className="mt-10 flex flex-col gap-y-6"
              aria-label="Main navigation"
            >
              {navLinks.map((link) => (
                <a
                  key={link.href}
                  href={link.href}
                  onClick={onClose}
                  className="font-body text-lg font-light uppercase tracking-[0.25em] text-background"
                >
                  {link.label}
                </a>
              ))}
            </nav>

            <div
              className="mt-8 border-t border-background/20 pt-8"
              aria-label="Utility links"
            >
              <div className="flex flex-col gap-y-4">
                <a
                  href="/"
                  onClick={onClose}
                  className="flex items-center gap-x-3 font-body text-sm font-light text-background/70"
                >
                  <GlobeIcon size={18} className="shrink-0 text-background/70" />
                  {countryName}
                </a>
                <a
                  href="/contact"
                  onClick={onClose}
                  className="flex items-center gap-x-3 font-body text-sm font-light text-background/70"
                >
                  <ContactIcon size={18} className="shrink-0 text-background/70" />
                  Contact Us
                </a>
                <a
                  href="/newsletter"
                  onClick={onClose}
                  className="flex items-center gap-x-3 font-body text-sm font-light text-background/70"
                >
                  <NewsletterIcon size={18} className="shrink-0 text-background/70" />
                  Newsletter
                </a>
                <a
                  href="/wishlist"
                  onClick={onClose}
                  className="flex items-center gap-x-3 font-body text-sm font-light text-background/70"
                >
                  <WishlistIcon size={18} className="shrink-0 text-background/70" />
                  Wishlist
                </a>
                {isAuthenticated && (
                  <a
                    href="/account/inbox"
                    onClick={onClose}
                    className="relative flex items-center gap-x-3 font-body text-sm font-light text-background/70"
                    aria-label={
                      unreadInboxCount > 0
                        ? `Inbox — ${unreadInboxCount} unread`
                        : 'Inbox'
                    }
                  >
                    <InboxMenuIcon className="h-[18px] w-[18px] shrink-0 text-background/70" />
                    Inbox
                    {unreadInboxCount > 0 && (
                      <span className="ml-auto flex h-5 min-w-[20px] items-center justify-center rounded-full bg-highlight px-1.5 font-body text-[10px] font-bold text-white">
                        {unreadInboxCount > 9 ? '9+' : unreadInboxCount}
                      </span>
                    )}
                  </a>
                )}
                <a
                  href="/account"
                  onClick={onClose}
                  className="flex items-center gap-x-3 font-body text-sm font-light text-background/70"
                >
                  <AccountIcon size={18} className="shrink-0 text-background/70" />
                  My Account
                </a>
              </div>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
