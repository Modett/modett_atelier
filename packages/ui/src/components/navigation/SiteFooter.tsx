'use client'

import Link from 'next/link'
import { useState } from 'react'
import { cn } from '../../lib/utils'
import { SocialIcon } from './SocialIcons'

/** Single link item in a footer column */
export interface FooterLinkItem {
  /** Link display text */
  label: string
  /** Link URL (dummy '#' for now — real URLs added later) */
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
  platform: 'facebook' | 'instagram' | 'tiktok' | 'linkedin' | 'youtube'
  /** Profile URL */
  href: string
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
  /** Additional className */
  className?: string
}

const DEFAULT_COLUMNS: FooterColumn[] = [
  {
    heading: 'Shop By Category',
    links: [
      { label: 'Dresses', href: '#' },
      { label: 'Tops', href: '#' },
      { label: 'Bottoms', href: '#' },
      { label: 'Jumpsuits & Rompers', href: '#' },
      { label: 'Style Add-Ons', href: '#' },
    ],
  },
  {
    heading: 'General Information',
    links: [
      { label: 'Brand Philosophy', href: '#' },
      { label: 'Contact Us', href: '#' },
      { label: 'Modett Muse Club', href: '#' },
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
  { platform: 'facebook', href: '#' },
  { platform: 'instagram', href: '#' },
  { platform: 'tiktok', href: '#' },
  { platform: 'linkedin', href: '#' },
  { platform: 'youtube', href: '#' },
]

function ChevronDownIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
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
      width={16}
      height={16}
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
  return (
    <div className="py-4">
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full flex items-center justify-between min-h-[44px] text-left focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised"
        aria-expanded={isOpen}
        aria-controls={`footer-section-${column.heading.replace(/\s+/g, '-').toLowerCase()}`}
        id={`footer-toggle-${column.heading.replace(/\s+/g, '-').toLowerCase()}`}
      >
        <span className="font-body text-sm font-medium text-foreground">
          {column.heading}
        </span>
        <span className="text-foreground shrink-0 ml-2">
          {isOpen ? <ChevronUpIcon /> : <ChevronDownIcon />}
        </span>
      </button>
      <div
        id={`footer-section-${column.heading.replace(/\s+/g, '-').toLowerCase()}`}
        role="region"
        aria-labelledby={`footer-toggle-${column.heading.replace(/\s+/g, '-').toLowerCase()}`}
        hidden={!isOpen}
        className={isOpen ? 'block' : 'hidden'}
      >
        <ul className="flex flex-col gap-3 mt-3 pl-0 list-none">
          {column.links.map((link) => (
            <li key={link.label}>
              <a
                href={link.href}
                className="font-body text-sm font-normal text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded"
              >
                {link.label}
              </a>
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
  className,
}: SiteFooterProps) {
  return (
    <footer className={cn('bg-surface-raised', className)} role="contentinfo">
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8">
        {/* Link columns + social — desktop/tablet grid */}
        <div className="hidden md:grid md:grid-cols-2 lg:grid-cols-4 gap-8 lg:gap-12 pt-16 md:pt-20 pb-12 md:pb-16">
          {columns.map((column) => (
            <div key={column.heading}>
              <h3 className="font-body text-sm font-medium text-foreground mb-4 md:mb-6">
                {column.heading}
              </h3>
              <ul className="flex flex-col gap-3 list-none pl-0">
                {column.links.map((link) => (
                  <li key={link.label}>
                    <a
                      href={link.href}
                      className="font-body text-sm font-normal text-muted-foreground hover:text-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded"
                    >
                      {link.label}
                    </a>
                  </li>
                ))}
              </ul>
            </div>
          ))}
          <div>
            <h3 className="font-body text-sm font-medium text-foreground mb-4 md:mb-6">
              Follow us on
            </h3>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  className="text-foreground hover:text-muted-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded"
                  aria-label={`Follow Modett on ${social.platform}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon platform={social.platform} size={22} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Mobile: accordion sections */}
        <div className="md:hidden flex flex-col divide-y divide-foreground/10 pt-8 pb-12">
          {columns.map((column) => (
            <MobileFooterSection key={column.heading} column={column} />
          ))}
          <div className="py-4">
            <h3 className="font-body text-sm font-medium text-foreground mb-4">
              Follow us on
            </h3>
            <div className="flex items-center gap-4">
              {socialLinks.map((social) => (
                <a
                  key={social.platform}
                  href={social.href}
                  className="text-foreground hover:text-muted-foreground transition-colors duration-200 focus:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 ring-offset-surface-raised rounded min-h-[44px] min-w-[44px] inline-flex items-center justify-center"
                  aria-label={`Follow Modett on ${social.platform}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <SocialIcon platform={social.platform} size={22} />
                </a>
              ))}
            </div>
          </div>
        </div>

        {/* Logo + tagline (tagline hidden when logoUrl is used — image includes it) */}
        <div className="flex flex-col items-center pb-10 md:pb-12">
          {logoUrl ? (
            <img
              src={logoUrl}
              alt="Modett — Elegance, Amplified."
              className="h-12 md:h-14 w-auto"
            />
          ) : (
            <>
              <span className="font-body text-xl font-medium tracking-[0.3em] text-foreground uppercase">
                MODETT
              </span>
              <p className="font-body text-[10px] font-medium uppercase tracking-[0.3em] text-foreground mt-2">
                {tagline}
              </p>
            </>
          )}
        </div>

        <div className="border-t border-foreground/10 mt-12 pt-6 pb-6 md:pb-8 flex flex-col md:flex-row items-center justify-between gap-4">
          <p className="font-body font-light text-[11px] text-muted-foreground uppercase tracking-[0.15em] text-center md:text-left">
            {copyrightText ?? `© ${new Date().getFullYear()} Modett. All rights reserved.`}
          </p>
          <div className="flex items-center gap-6 flex-wrap justify-center">
            <Link
              href="/privacy"
              className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Privacy Policy
            </Link>
            <Link
              href="/terms"
              className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Terms of Sale
            </Link>
            <Link
              href="/contact"
              className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground hover:text-foreground transition-colors duration-200"
            >
              Contact
            </Link>
          </div>
        </div>
      </div>
    </footer>
  )
}
