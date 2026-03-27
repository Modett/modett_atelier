'use client'

import React, { useState, useCallback, useEffect, useRef } from 'react'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { cn } from '../../lib/utils'

// ── Types ───────────────────────────────────────────────────────────────

/** Single slide in the editorial carousel */
export interface CarouselSlide {
  /** Unique ID */
  id: string
  /** Image URL (suffix appended by component) */
  imageUrl: string
  /** Image alt text */
  altText: string
}

/** Props for the EditorialCarousel section */
export interface EditorialCarouselProps {
  /** Array of carousel slides (minimum 3 recommended for the peek effect) */
  slides: CarouselSlide[]
  /** Body text below the carousel */
  bodyText?: string
  /** CTA link text (default: "Learn More") */
  ctaText?: string
  /** CTA link URL (default: "/brand-philosophy") */
  ctaHref?: string
  /** Auto-play interval in milliseconds (0 = disabled, default: 0) */
  autoPlayInterval?: number
  /** Image URL suffix (default: '-full.webp') */
  imageSuffix?: string
  /** Additional className */
  className?: string
}

/** Circular index for infinite carousel */
function getSlideIndex(index: number, offset: number, total: number): number {
  if (total === 0) return 0
  return ((index + offset) % total + total) % total
}

/**
 * EditorialCarousel — wide-format image carousel with prev/current/next peek,
 * arrow navigation, and optional body text + "LEARN MORE" link below.
 * Uses only design tokens; supports infinite loop, swipe on mobile, optional auto-play.
 */
export function EditorialCarousel({
  slides,
  bodyText,
  ctaText = 'Learn More',
  ctaHref = '/brand-philosophy',
  autoPlayInterval = 0,
  imageSuffix = '-full.webp',
  className,
}: EditorialCarouselProps) {
  const [currentIndex, setCurrentIndex] = useState(0)
  const [isPaused, setIsPaused] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const prefersReducedMotion = useReducedMotion()

  const totalSlides = slides.length

  const goNext = useCallback(() => {
    setCurrentIndex((prev) => (prev + 1) % Math.max(1, totalSlides))
  }, [totalSlides])

  const goPrev = useCallback(() => {
    setCurrentIndex((prev) => (prev - 1 + Math.max(1, totalSlides)) % Math.max(1, totalSlides))
  }, [totalSlides])

  // Keyboard: left/right when carousel has focus
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (!containerRef.current?.contains(document.activeElement)) return
      if (e.key === 'ArrowLeft') {
        e.preventDefault()
        goPrev()
      }
      if (e.key === 'ArrowRight') {
        e.preventDefault()
        goNext()
      }
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [goPrev, goNext])

  // Auto-play: respects prefers-reduced-motion and pause on hover
  useEffect(() => {
    if (!autoPlayInterval || autoPlayInterval <= 0 || isPaused || prefersReducedMotion) return
    const timer = setInterval(goNext, autoPlayInterval)
    return () => clearInterval(timer)
  }, [autoPlayInterval, isPaused, prefersReducedMotion, goNext])

  const suffix = imageSuffix ?? '-full.webp'

  if (totalSlides === 0) {
    return (
      <section
        className={cn(
          'w-full py-16 md:py-20 lg:py-24',
          className,
        )}
      >
          <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 flex flex-col items-center">
          {bodyText && (
            <p className="font-body text-sm md:text-base font-normal text-muted-foreground text-center leading-relaxed max-w-2xl">
              {bodyText}
            </p>
          )}
          <a
            href={ctaHref}
            className={cn(
              'inline-flex items-center gap-2 mt-6 md:mt-8',
              'font-body text-xs font-medium uppercase tracking-[0.25em] text-foreground',
              'hover:text-muted-foreground transition-colors duration-200',
              'group',
            )}
          >
            <span>{ctaText}</span>
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </section>
    )
  }

  const prevIndex = getSlideIndex(currentIndex, -1, totalSlides)
  const nextIndex = getSlideIndex(currentIndex, 1, totalSlides)

  return (
    <section
      className={cn(
        'w-full py-16 md:py-20 lg:py-24',
        className,
      )}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
    >
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8" ref={containerRef}>
        {/* Carousel */}
        <div className="relative overflow-hidden">
          <motion.div
            className="flex items-center gap-1 md:gap-2"
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              if (info.offset.x < -50) goNext()
              if (info.offset.x > 50) goPrev()
            }}
          >
            {/* Previous image — peeking from left */}
            <div className="w-[12%] md:w-[15%] shrink-0 aspect-[3/4] overflow-hidden">
              <img
                src={slides[prevIndex].imageUrl + suffix}
                alt={slides[prevIndex].altText}
                className="w-full h-full object-cover brightness-90"
              />
            </div>

            {/* Current image — main focus with crossfade */}
            <div className="flex-1 min-w-0 aspect-[16/10] md:aspect-[16/9] overflow-hidden relative">
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentIndex}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  transition={{ duration: 0.5, ease: 'easeInOut' }}
                  className="absolute inset-0"
                >
                  <img
                    src={slides[currentIndex].imageUrl + suffix}
                    alt={slides[currentIndex].altText}
                    className="w-full h-full object-cover"
                  />
                </motion.div>
              </AnimatePresence>
            </div>

            {/* Next image — peeking from right */}
            <div className="w-[12%] md:w-[15%] shrink-0 aspect-[3/4] overflow-hidden">
              <img
                src={slides[nextIndex].imageUrl + suffix}
                alt={slides[nextIndex].altText}
                className="w-full h-full object-cover brightness-90"
              />
            </div>
          </motion.div>

          {/* Left arrow */}
          <button
            type="button"
            onClick={goPrev}
            className={cn(
              'absolute left-2 md:left-4 top-1/2 -translate-y-1/2 z-10',
              'w-10 h-10 md:w-12 md:h-12',
              'flex items-center justify-center',
              'bg-background/60 backdrop-blur-sm',
              'hover:bg-background/80',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
            )}
            aria-label="Previous image"
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground"
              aria-hidden
            >
              <path d="M15 19l-7-7 7-7" />
            </svg>
          </button>

          {/* Right arrow */}
          <button
            type="button"
            onClick={goNext}
            className={cn(
              'absolute right-2 md:right-4 top-1/2 -translate-y-1/2 z-10',
              'w-10 h-10 md:w-12 md:h-12',
              'flex items-center justify-center',
              'bg-background/60 backdrop-blur-sm',
              'hover:bg-background/80',
              'transition-colors duration-200',
              'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
            )}
            aria-label="Next image"
          >
            <svg
              width={20}
              height={20}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={1.5}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="text-foreground"
              aria-hidden
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </button>
        </div>

        {/* Body text + CTA */}
        <div className="flex flex-col items-center mt-10 md:mt-14 px-6">
          {bodyText && (
            <p className="font-body text-sm md:text-base font-normal text-muted-foreground text-center leading-relaxed max-w-2xl">
              {bodyText}
            </p>
          )}

          <a
            href={ctaHref}
            className={cn(
              'inline-flex items-center gap-2 mt-6 md:mt-8',
              'font-body text-xs font-medium uppercase tracking-[0.25em] text-foreground',
              'hover:text-muted-foreground transition-colors duration-200',
              'group',
            )}
          >
            <span>{ctaText}</span>
            <svg
              width={12}
              height={12}
              viewBox="0 0 24 24"
              fill="none"
              stroke="currentColor"
              strokeWidth={2}
              strokeLinecap="round"
              strokeLinejoin="round"
              className="transition-transform duration-200 group-hover:translate-x-1"
              aria-hidden
            >
              <path d="M9 5l7 7-7 7" />
            </svg>
          </a>
        </div>
      </div>
    </section>
  )
}

EditorialCarousel.displayName = 'EditorialCarousel'
