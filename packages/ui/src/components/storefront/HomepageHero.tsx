'use client'

import React from 'react'
import { motion, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { OutlineButton } from '../ui/OutlineButton'

// ── Types ───────────────────────────────────────────────────────────────

/** CTA button configuration for the hero */
export interface HeroCTA {
  /** Button label text */
  label: string
  /** Navigation URL */
  href: string
}

/** Props for the homepage hero section */
export interface HomepageHeroProps {
  /** Background image URL */
  imageUrl: string
  /** Background image alt text */
  imageAlt?: string
  /** Headline text — line 1 (default: "Quiet luxury.") */
  headlineLine1?: string
  /** Headline text — line 2 (default: "Timeless craft.") */
  headlineLine2?: string
  /** Left CTA button */
  primaryCta?: HeroCTA
  /** Right CTA button */
  secondaryCta?: HeroCTA
  /** Whether to show the gradient overlay for text readability */
  showOverlay?: boolean
  /** Additional className */
  className?: string
}

const defaultPrimaryCta: HeroCTA = {
  label: 'SHOP COLLECTION',
  href: '/collections',
}
const defaultSecondaryCta: HeroCTA = {
  label: 'OUR JOURNAL',
  href: '/journal',
}

/**
 * HomepageHero — full-viewport editorial hero with background image,
 * headline, and two inverse OutlineButton CTAs. SiteHeader is composed
 * at the page level and overlays this section.
 */
export function HomepageHero({
  imageUrl,
  imageAlt = 'Modett editorial',
  headlineLine1 = 'Quiet luxury.',
  headlineLine2 = 'Timeless craft.',
  primaryCta = defaultPrimaryCta,
  secondaryCta = defaultSecondaryCta,
  showOverlay = true,
  className,
}: HomepageHeroProps) {
  const prefersReducedMotion = useReducedMotion()

  const headlineTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 1, delay: 0.3, ease: 'easeOut' as const }
  const ctaTransition = prefersReducedMotion
    ? { duration: 0 }
    : { duration: 0.8, delay: 0.8, ease: 'easeOut' as const }

  return (
    <section
      className={cn(
        'relative w-full h-screen min-h-[600px] max-h-[1200px]',
        'overflow-hidden',
        className,
      )}
      aria-label="Hero"
    >
      {/* Background image */}
      <img
        src={imageUrl}
        alt={imageAlt}
        className="absolute inset-0 w-full h-full object-cover object-center"
        loading="eager"
        decoding="async"
        fetchPriority="high"
      />

      {/* Gradient overlay for text readability */}
      {showOverlay && (
        <div
          className="absolute inset-0 bg-gradient-to-t from-foreground/40 via-transparent to-foreground/20"
          aria-hidden="true"
        />
      )}

      {/* Content container — positioned at the bottom portion */}
      <div className="relative z-10 h-full flex flex-col justify-end px-5 md:px-8 lg:px-12 pb-12 md:pb-16 lg:pb-20">
        {/* Headline */}
        <motion.div
          initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={headlineTransition}
          className="mb-10 md:mb-14 lg:mb-16"
        >
          <h1 className="font-display italic font-normal text-background text-center leading-[1.1] text-5xl md:text-7xl lg:text-8xl">
            <span className="block">{headlineLine1}</span>
            <span className="block">{headlineLine2}</span>
          </h1>
        </motion.div>

        {/* CTA buttons — spread left and right */}
        <motion.div
          initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={ctaTransition}
          className="flex flex-col sm:flex-row justify-between items-center gap-4 sm:gap-0"
        >
          <OutlineButton
            variant="inverse"
            size="md"
            as="a"
            href={primaryCta.href}
            className="w-full sm:w-auto"
          >
            {primaryCta.label}
          </OutlineButton>

          <OutlineButton
            variant="inverse"
            size="md"
            as="a"
            href={secondaryCta.href}
            className="w-full sm:w-auto"
          >
            {secondaryCta.label}
          </OutlineButton>
        </motion.div>
      </div>
    </section>
  )
}

HomepageHero.displayName = 'HomepageHero'
