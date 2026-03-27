'use client'

import Image from 'next/image'
import { motion, useReducedMotion } from 'framer-motion'
import { OutlineButton } from '@modett/ui'
import { cn } from '@/lib/utils'
import { HeroNav } from './HeroNav'

interface HomepageHeroProps {
  imageUrl: string
}

export function HomepageHero({ imageUrl }: HomepageHeroProps) {
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
        'relative min-h-screen w-full',
        'overflow-hidden',
      )}
      aria-label="Hero section"
    >
      {/* Background image */}
      <Image
        src={imageUrl}
        alt="Modett — Quiet luxury. Timeless craft."
        fill
        priority
        quality={95}
        className="object-cover object-center"
        sizes="100vw"
      />

      {/* Gradient overlay — subtle bottom fade only */}
      <div
        aria-hidden="true"
        className={cn(
          'absolute inset-0 z-10',
          'bg-gradient-to-b',
          'from-black/10',
          'via-transparent',
          'to-black/30',
        )}
      />

      {/* HeroNav (transparent overlay nav) */}
      <HeroNav />

      {/* Hero content (headline + CTAs) */}
      <div
        className={cn(
          'absolute bottom-0 left-0 right-0 z-20',
          'pb-12 md:pb-20',
          'px-4 md:px-6 lg:px-8',
        )}
      >
        <div className="max-w-page mx-auto">
          {/* Headline */}
          <motion.h1
            initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 30 }}
            animate={{ opacity: 1, y: 0 }}
            transition={headlineTransition}
            className={cn(
              'font-display font-bold',
              'text-[2.75rem] leading-none',
              'md:text-[4.5rem] md:leading-none',
              'lg:text-[6rem] lg:leading-none',
              'text-background',
              'max-w-[90%] md:max-w-[75%] lg:max-w-[70%]',
              'mx-auto text-center',
              'mb-10 md:mb-14',
            )}
          >
            Quiet luxury.
            <br />
            Timeless craft.
          </motion.h1>

          {/* CTA buttons — spread left and right */}
          <motion.div
            initial={{ opacity: prefersReducedMotion ? 1 : 0, y: prefersReducedMotion ? 0 : 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={ctaTransition}
            className={cn(
              'flex',
              'flex-col items-center gap-4',
              'md:flex-row md:items-center md:justify-between',
              'md:gap-0',
            )}
          >
            <OutlineButton
              variant="inverse"
              size="lg"
              as="a"
              href="/collections"
              className="w-full md:w-auto"
            >
              Shop Collection
            </OutlineButton>

            <OutlineButton
              variant="inverse"
              size="lg"
              as="a"
              href="/journal"
              className="w-full md:w-auto"
            >
              Our Journal
            </OutlineButton>
          </motion.div>
        </div>
      </div>
    </section>
  )
}
