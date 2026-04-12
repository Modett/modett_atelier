'use client'

import Image from 'next/image'
import Link from 'next/link'
import { motion, useReducedMotion } from 'framer-motion'
import { OutlineButton } from '@modett/ui'
import { cn } from '@/lib/utils'

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

  const imageMotion = prefersReducedMotion
    ? { initial: { opacity: 1, scale: 1 }, animate: { opacity: 1, scale: 1 } }
    : {
        initial: { opacity: 0, scale: 1.06 },
        animate: { opacity: 1, scale: 1 },
        transition: { duration: 1.25, ease: [0.22, 1, 0.36, 1] as const },
      }

  const logoMotion = prefersReducedMotion
    ? { initial: { opacity: 1, y: 0 }, animate: { opacity: 1, y: 0 } }
    : {
        initial: { opacity: 0, y: 12 },
        animate: { opacity: 1, y: 0 },
        transition: { duration: 0.7, delay: 0.15, ease: 'easeOut' as const },
      }

  return (
    <section
      className={cn(
        'relative w-full overflow-hidden',
        'min-h-[78dvh] min-h-[78svh]',
        'sm:min-h-[85dvh] sm:min-h-[85svh]',
        'md:min-h-[92dvh] md:min-h-[92svh]',
        'lg:min-h-screen',
      )}
      aria-label="Hero section"
    >
      <motion.div
        className="absolute inset-0 z-0"
        initial={imageMotion.initial}
        animate={imageMotion.animate}
        transition={'transition' in imageMotion ? imageMotion.transition : undefined}
      >
        <Image
          src={imageUrl}
          alt="Modett — Quiet luxury. Timeless craft."
          fill
          priority
          quality={90}
          className={cn(
            'object-cover',
            'object-[center_28%] sm:object-[center_32%] md:object-center',
            'transition-[object-position] duration-700 ease-out',
          )}
          sizes="100vw"
        />
      </motion.div>

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

      <div className="relative z-20 flex flex-col min-h-[inherit]">
        <motion.div
          className={cn(
            'flex justify-center shrink-0',
            'pt-16 pb-6 sm:pt-18 sm:pb-7',
            'md:pt-20 md:pb-8',
            'px-4 md:px-6',
          )}
          initial={logoMotion.initial}
          animate={logoMotion.animate}
          transition={'transition' in logoMotion ? logoMotion.transition : undefined}
        >
          <HeroMark />
        </motion.div>

        <div
          className={cn(
            'flex flex-1 flex-col justify-end',
            'pb-10 sm:pb-12 md:pb-20',
            'px-4 md:px-6 lg:px-8',
          )}
        >
          <div className="max-w-page mx-auto w-full">
            <motion.h1
              initial={{
                opacity: prefersReducedMotion ? 1 : 0,
                y: prefersReducedMotion ? 0 : 30,
              }}
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
                'mb-8 sm:mb-10 md:mb-14',
              )}
            >
              Quiet luxury.
              <br />
              Timeless craft.
            </motion.h1>

            <motion.div
              initial={{
                opacity: prefersReducedMotion ? 1 : 0,
                y: prefersReducedMotion ? 0 : 20,
              }}
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
      </div>
    </section>
  )
}

function HeroMark() {
  return (
    <Link
      href="/"
      aria-label="Modett — return to homepage"
      className="inline-flex items-center justify-center"
    >
      <Image
        src="/images/V-logo-alabaster .png"
        alt=""
        width={190}
        height={72}
        priority
        className={cn(
          'h-auto w-[104px] sm:w-[120px]',
          'md:w-[150px] lg:w-[170px] xl:w-[190px]',
          'object-contain',
          'drop-shadow-[0_2px_24px_rgba(0,0,0,0.35)]',
        )}
      />
    </Link>
  )
}
