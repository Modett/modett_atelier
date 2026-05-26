'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { NewsletterSection } from '../ui/NewsletterSection'
import { SocialIcon } from './SocialIcons'

/** Single link item in a footer column */
export interface FooterLinkItem {
  /** Link display text */
  label: string
  /** Link URL */
  href: string
}

/** One column of the footer (heading + links) */
export interface FooterColumn {
  /** Column heading text */
  heading: string
  /** Array of links in this column */
  links: FooterLinkItem[]
}

/** Social media link with platform and URL */
export interface SocialLink {
  /** Platform name */
  platform: 'facebook' | 'instagram' | 'tiktok' | 'linkedin'
  /** Profile URL */
  href: string
}

export interface SiteFooterNewsletterProps {
  /** Submit handler — receives the email string */
  onSubmit: (email: string) => void
  /** Whether the form is currently submitting */
  isSubmitting?: boolean
  /** Whether submission was successful */
  isSuccess?: boolean
  /** Success message */
  successMessage?: string
  /** Error message from API */
  error?: string
  /** Privacy policy link URL */
  privacyPolicyUrl?: string
}

export interface SiteFooterProps {
  /** Navigation link columns (default: the four standard Modett columns) */
  columns?: FooterColumn[]
  /** Social media links */
  socialLinks?: SocialLink[]
  /** Logo image URL — the foreground/dark version of the logo */
  logoUrl?: string
  /** Copyright text (default: "Copyright© {year} Modett Atelier (Pvt) Ltd.") */
  copyrightText?: string
  /** Tagline (default: "ELEGANCE, AMPLIFIED.") */
  tagline?: string
  /** Newsletter signup — when provided, renders the dark newsletter band above nav links */
  newsletter?: SiteFooterNewsletterProps
  /** Additional className */
  className?: string
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: 'Shop By Category',
    links: [
      { label: 'Dresses', href: '/collections/dresses' },
      { label: 'Tops', href: '/collections/tops' },
      { label: 'Bottoms', href: '/collections/bottoms' },
      { label: 'Jumpsuits & Rompers', href: '/collections/jumpsuits' },
      { label: 'Style Add-Ons', href: '/collections/add-ons' },
    ],
  },
  {
    heading: 'General Information',
    links: [
      { label: 'Brand Philosophy', href: '/brand-philosophy' },
      { label: 'Contact Us', href: '/contact' },
      { label: 'Modett Muse Club', href: '/muse-club' },
      { label: 'Size Guide', href: '#' },
      { label: 'Journal', href: '#' },
      { label: 'FAQ', href: '#' },
    ],
  },
  {
    heading: 'Term of Use',
    links: [
      { label: 'Terms of Sale', href: '/terms' },
      { label: 'Privacy Policy', href: '/privacy' },
      { label: 'Shipping and Returns', href: '#' },
    ],
  },
]

const DEFAULT_SOCIAL_LINKS: SocialLink[] = [
  { platform: 'facebook', href: 'https://www.facebook.com/profile.php?id=61576302094475' },
  { platform: 'instagram', href: 'https://www.instagram.com/_modett/' },
  { platform: 'tiktok', href: 'https://www.tiktok.com/@_modett' },
  { platform: 'linkedin', href: 'https://www.linkedin.com/company/modett/' },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M4 6l4 4 4-4"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

function ChevronUpIcon({ className }: { className?: string }) {
  return (
    <svg
      width={14}
      height={14}
      viewBox="0 0 16 16"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden
    >
      <path
        d="M12 10l-4-4-4 4"
        stroke="currentColor"
        strokeWidth={2}
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  )
}

/** Mobile-only collapsible column section (accordion pattern) */
function MobileFooterSection({
  column,
}: {
  column: FooterColumn
}) {
  const [isOpen, setIsOpen] = useState(false)
  const sectionId = column.heading.replace(/\s+/g, '-').toLowerCase()

  return (
    <div className="py-2.5">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between min-h-[40px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised"
        aria-expanded={isOpen}
        aria-controls={`footer-section-${sectionId}`}
        id={`footer-toggle-${sectionId}`}
      >
        <span className="font-body text-xs font-medium uppercase tracking-[0.12em] text-foreground">
          {column.heading}
        </span>
        <span className="text-foreground shrink-0 ml-2">
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </span>
      </button>
      <div
        id={`footer-section-${sectionId}`}
        role="region"
        aria-labelledby={`footer-toggle-${sectionId}`}
        hidden={!isOpen}
        className={isOpen ? 'block' : 'hidden'}
      >
        <ul className="flex flex-col gap-2 mt-2 pl-0 list-none">
          {column.links.map((link) => (
            <li key={link.label}>
              <Link
                href={link.href}
                className="font-body text-xs font-light text-umber hover:text-graphite transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded"
              >
                {link.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

export function SiteFooter({
  columns = DEFAULT_COLUMNS,
  socialLinks = DEFAULT_SOCIAL_LINKS,
  logoUrl,
  copyrightText,
  tagline = 'ELEGANCE, AMPLIFIED.',
  newsletter,
  className,
}: SiteFooterProps) {
  return (
    <footer className={cn('mt-auto', className)} role="contentinfo">
      {newsletter && (
        <>
          <div aria-hidden="true" className="h-1 bg-background" />
          <NewsletterSection
            variant="compact"
            onSubmit={newsletter.onSubmit}
            isSubmitting={newsletter.isSubmitting}
            isSuccess={newsletter.isSuccess}
            successMessage={newsletter.successMessage}
            error={newsletter.error}
            privacyPolicyUrl={newsletter.privacyPolicyUrl}
          />
        </>
      )}

      <div className="bg-surface-raised">
        <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8">
          {/* Link columns + social — desktop/tablet grid */}
          <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-6 lg:gap-8 pt-8 pb-6">
            {columns.map((column) => (
              <div key={column.heading}>
                <h3 className="font-body text-xs font-medium uppercase tracking-[0.12em] text-foreground mb-3">
                  {column.heading}
                </h3>
                <ul className="flex flex-col gap-2 list-none pl-0">
                  {column.links.map((link) => (
                    <li key={link.label}>
                      <Link
                        href={link.href}
                        className="font-body text-xs font-light text-umber hover:text-graphite transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded"
                      >
                        {link.label}
                      </Link>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <div>
              <h3 className="font-body text-xs font-medium uppercase tracking-[0.12em] text-foreground mb-3">
                Follow us on
              </h3>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    className="text-umber hover:text-graphite transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded"
                    aria-label={`Follow Modett on ${social.platform}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon platform={social.platform} size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Mobile: accordion sections */}
          <div className="md:hidden flex flex-col divide-y divide-foreground/10 pt-5 pb-4">
            {columns.map((column) => (
              <MobileFooterSection key={column.heading} column={column} />
            ))}
            <div className="py-3">
              <h3 className="font-body text-xs font-medium uppercase tracking-[0.12em] text-foreground mb-3">
                Follow us on
              </h3>
              <div className="flex items-center gap-3">
                {socialLinks.map((social) => (
                  <a
                    key={social.platform}
                    href={social.href}
                    className="text-umber hover:text-graphite transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded min-h-[40px] min-w-[40px] inline-flex items-center justify-center"
                    aria-label={`Follow Modett on ${social.platform}`}
                    target="_blank"
                    rel="noopener noreferrer"
                  >
                    <SocialIcon platform={social.platform} size={18} />
                  </a>
                ))}
              </div>
            </div>
          </div>

          {/* Logo + copyright bar */}
          <div className="border-t border-foreground/10 pt-4 pb-4 md:pb-5 flex flex-col sm:flex-row items-center justify-between gap-3">
            <div className="flex flex-col items-center sm:items-start">
              {logoUrl ? (
                <img
                  src={logoUrl}
                  alt="Modett — Elegance, Amplified."
                  className="h-8 md:h-9 w-auto"
                />
              ) : (
                <>
                  <span className="font-body text-base font-medium tracking-[0.3em] text-foreground uppercase">
                    MODETT
                  </span>
                  <p className="font-body text-[9px] font-medium uppercase tracking-[0.3em] text-foreground mt-1">
                    {tagline}
                  </p>
                </>
              )}
            </div>

            <div className="flex flex-col sm:items-end gap-2">
              <p className="font-body font-light text-[10px] text-umber uppercase tracking-[0.12em] text-center sm:text-right">
                {copyrightText ?? `© ${new Date().getFullYear()} Modett. All rights reserved.`}
              </p>
              <div className="flex items-center gap-4 flex-wrap justify-center sm:justify-end">
                <Link
                  href="/privacy"
                  className="font-body font-light text-[10px] uppercase tracking-[0.12em] text-umber hover:text-graphite transition-colors duration-200"
                >
                  Privacy
                </Link>
                <Link
                  href="/terms"
                  className="font-body font-light text-[10px] uppercase tracking-[0.12em] text-umber hover:text-graphite transition-colors duration-200"
                >
                  Terms
                </Link>
                <Link
                  href="/contact"
                  className="font-body font-light text-[10px] uppercase tracking-[0.12em] text-umber hover:text-graphite transition-colors duration-200"
                >
                  Contact
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </footer>
  )
}
