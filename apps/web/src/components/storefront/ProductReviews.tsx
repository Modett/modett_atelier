'use client'

import { useState, useRef, useEffect, useCallback } from 'react'
import Image from 'next/image'
import { motion, AnimatePresence, useReducedMotion } from 'framer-motion'
import { Star, X, ChevronLeft, ChevronRight, ZoomIn } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useProductReviews } from '@/hooks/useReviews'
import type { Review } from '@modett/types'

// ── Star display ──────────────────────────────────────────────────────────────

function StarRow({
  rating,
  size = 'sm',
}: {
  rating: number
  size?: 'sm' | 'md' | 'lg'
}) {
  const px = size === 'lg' ? 20 : size === 'md' ? 16 : 13
  const filled = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <div
      className="flex items-center gap-0.5"
      aria-label={`${rating} out of 5 stars`}
    >
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={px}
          height={px}
          className={
            n <= filled
              ? 'text-highlight fill-highlight'
              : 'text-muted fill-transparent'
          }
          aria-hidden
        />
      ))}
    </div>
  )
}

// ── Rating breakdown bar ──────────────────────────────────────────────────────

function RatingBreakdownBar({
  label,
  count,
  total,
}: {
  label: string
  count: number
  total: number
}) {
  const pct = total > 0 ? Math.round((count / total) * 100) : 0
  return (
    <div className="flex items-center gap-3 text-[12px]">
      <span className="font-body font-light text-muted-foreground w-8 shrink-0 text-right">
        {label}★
      </span>
      <div className="flex-1 h-1 bg-muted overflow-hidden">
        <div
          className="h-full bg-highlight transition-all duration-700"
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className="font-body font-light text-muted-foreground w-6 shrink-0">
        {count}
      </span>
    </div>
  )
}

// ── Photo thumbnail grid ──────────────────────────────────────────────────────

function ReviewPhotoGrid({
  urls,
  onPhotoClick,
}: {
  urls: string[]
  onPhotoClick: (urls: string[], startIndex: number) => void
}) {
  if (!urls.length) return null
  const visible = urls.slice(0, 4)
  const overflow = urls.length - 4

  return (
    <div className="flex flex-wrap gap-2 mt-3">
      {visible.map((url, i) => (
        <button
          key={url}
          type="button"
          onClick={() => onPhotoClick(urls, i)}
          className="relative w-16 h-16 md:w-20 md:h-20 overflow-hidden bg-muted
                     group focus-visible:outline focus-visible:outline-2
                     focus-visible:outline-umber"
          aria-label={`View photo ${i + 1}`}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={url}
            alt={`Customer photo ${i + 1}`}
            className="w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
          />
          <div
            className="absolute inset-0 bg-graphite/30 opacity-0 group-hover:opacity-100
                       transition-opacity duration-200 flex items-center justify-center"
          >
            <ZoomIn className="w-4 h-4 text-background" />
          </div>
          {i === 3 && overflow > 0 && (
            <div className="absolute inset-0 bg-graphite/60 flex items-center justify-center">
              <span className="font-body font-medium text-background text-[13px]">
                +{overflow}
              </span>
            </div>
          )}
        </button>
      ))}
    </div>
  )
}

// ── Lightbox ──────────────────────────────────────────────────────────────────

function Lightbox({
  urls,
  startIndex,
  onClose,
}: {
  urls: string[]
  startIndex: number
  onClose: () => void
}) {
  const [current, setCurrent] = useState(startIndex)
  const prefersReducedMotion = useReducedMotion()

  const prev = useCallback(
    () => setCurrent((c) => (c - 1 + urls.length) % urls.length),
    [urls.length],
  )
  const next = useCallback(
    () => setCurrent((c) => (c + 1) % urls.length),
    [urls.length],
  )

  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
      if (e.key === 'ArrowLeft') prev()
      if (e.key === 'ArrowRight') next()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [onClose, prev, next])

  useEffect(() => {
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [])

  const url = urls[current]

  return (
    <motion.div
      className="fixed inset-0 z-[200] flex items-center justify-center bg-graphite/95"
      initial={prefersReducedMotion ? { opacity: 1 } : { opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      onClick={onClose}
    >
      <motion.div
        className="relative w-full h-full max-w-4xl max-h-[90vh] mx-4"
        initial={prefersReducedMotion ? {} : { scale: 0.94, opacity: 0 }}
        animate={{ scale: 1, opacity: 1 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        onClick={(e) => e.stopPropagation()}
      >
        <AnimatePresence mode="wait">
          <motion.div
            key={current}
            className="relative w-full h-full"
            initial={prefersReducedMotion ? {} : { opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={prefersReducedMotion ? {} : { opacity: 0, x: -20 }}
            transition={{ duration: 0.2 }}
          >
            {url && (
              <Image
                src={url}
                alt={`Customer photo ${current + 1} of ${urls.length}`}
                fill
                className="object-contain"
                sizes="(max-width: 896px) 100vw, 896px"
                quality={95}
                priority
              />
            )}
          </motion.div>
        </AnimatePresence>
      </motion.div>

      <button
        type="button"
        onClick={onClose}
        className="absolute top-4 right-4 w-10 h-10 flex items-center justify-center
                   bg-background/10 hover:bg-background/20 transition-colors text-background"
        aria-label="Close lightbox"
      >
        <X className="w-5 h-5" />
      </button>

      {urls.length > 1 && (
        <>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              prev()
            }}
            className="absolute left-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center
                       justify-center bg-background/10 hover:bg-background/20 transition-colors
                       text-background"
            aria-label="Previous photo"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation()
              next()
            }}
            className="absolute right-4 top-1/2 -translate-y-1/2 w-10 h-10 flex items-center
                       justify-center bg-background/10 hover:bg-background/20 transition-colors
                       text-background"
            aria-label="Next photo"
          >
            <ChevronRight className="w-5 h-5" />
          </button>
          <div className="absolute bottom-6 left-1/2 -translate-x-1/2 flex gap-2">
            {urls.map((_, i) => (
              <button
                key={i}
                type="button"
                onClick={(e) => {
                  e.stopPropagation()
                  setCurrent(i)
                }}
                className={cn(
                  'h-1.5 transition-all duration-200',
                  i === current ? 'bg-background w-4' : 'bg-background/40 w-1.5',
                )}
                aria-label={`Go to photo ${i + 1}`}
              />
            ))}
          </div>
        </>
      )}

      <div className="absolute top-4 left-1/2 -translate-x-1/2">
        <span className="font-body font-light text-[12px] uppercase tracking-[0.2em] text-background/60">
          {current + 1} / {urls.length}
        </span>
      </div>
    </motion.div>
  )
}

// ── Individual review card ────────────────────────────────────────────────────

function ReviewCard({
  review,
  onPhotoClick,
}: {
  review: Review
  onPhotoClick: (urls: string[], startIndex: number) => void
}) {
  const date = new Date(review.createdAt).toLocaleDateString('en-GB', {
    month: 'long',
    year: 'numeric',
  })

  const variantLabel = [review.variantColor, review.variantSize]
    .filter(Boolean)
    .join(' · ')

  return (
    <article className="py-8 border-b border-muted last:border-b-0">
      <div className="flex flex-wrap items-start justify-between gap-4 mb-4">
        <div>
          <div className="flex items-center gap-3 mb-2">
            <StarRow rating={review.rating} size="sm" />
            <span className="font-body font-light text-[10px] uppercase tracking-[0.2em] text-highlight">
              Verified purchase
            </span>
          </div>
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 bg-umber/10 flex items-center justify-center shrink-0">
              <span className="font-body font-medium text-[12px] text-umber">
                {review.reviewerFirstName.charAt(0).toUpperCase()}
              </span>
            </div>
            <span className="font-body font-medium text-[13px] text-umber">
              {review.reviewerFirstName}
              {variantLabel && (
                <span className="font-light text-muted-foreground">
                  {' '}· {variantLabel}
                </span>
              )}
            </span>
          </div>
        </div>
        <time
          dateTime={review.createdAt}
          className="font-body font-light text-[12px] text-muted-foreground shrink-0"
        >
          {date}
        </time>
      </div>

      {review.body && review.body.trim() !== '' && (
        <p className="font-body font-light text-[14px] text-ink leading-loose">
          {review.body}
        </p>
      )}

      {review.mediaUrls.length > 0 && (
        <ReviewPhotoGrid urls={review.mediaUrls} onPhotoClick={onPhotoClick} />
      )}
    </article>
  )
}

// ── Main ProductReviews component ─────────────────────────────────────────────

interface ProductReviewsProps {
  productId: string
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [page, setPage] = useState(1)
  const [allReviews, setAllReviews] = useState<Review[]>([])
  const { data, isLoading, isFetching } = useProductReviews(productId, page)

  const [lightboxUrls, setLightboxUrls] = useState<string[] | null>(null)
  const [lightboxStart, setLightboxStart] = useState(0)
  const sectionRef = useRef<HTMLElement>(null)

  useEffect(() => {
    if (!data?.reviews) return
    setAllReviews((prev) =>
      page === 1 ? data.reviews : [...prev, ...data.reviews],
    )
  }, [data?.reviews, page])

  useEffect(() => {
    setPage(1)
    setAllReviews([])
  }, [productId])

  function openLightbox(urls: string[], startIndex: number) {
    setLightboxUrls(urls)
    setLightboxStart(startIndex)
  }

  function closeLightbox() {
    setLightboxUrls(null)
  }

  if (!productId) return null

  const showSkeleton = isLoading && allReviews.length === 0
  const aggregate = data?.aggregate
  const total = data?.total ?? 0
  const hasMore = !showSkeleton && total > allReviews.length

  if (!showSkeleton && aggregate !== undefined && aggregate.totalCount === 0) {
    return null
  }

  const avg = aggregate?.averageRating ?? 0
  const breakdown = aggregate?.distribution ?? { 1: 0, 2: 0, 3: 0, 4: 0, 5: 0 }

  return (
    <>
      <section
        ref={sectionRef}
        id="reviews"
        aria-label="Customer reviews"
      >
        {/* Section header */}
        <div className="mb-12">
          <p className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-highlight mb-3">
            Customer Reviews
          </p>

          {showSkeleton ? (
            <div className="h-10 w-48 bg-muted animate-pulse" />
          ) : (
            <div className="flex flex-wrap items-end gap-6">
              <div>
                <p className="font-display font-bold text-[3.5rem] text-umber leading-none">
                  {avg.toFixed(1)}
                </p>
                <div className="flex items-center gap-2 mt-1">
                  <StarRow rating={Math.round(avg)} size="md" />
                  <span className="font-body font-light text-[13px] text-muted-foreground">
                    {aggregate?.totalCount ?? 0} review
                    {(aggregate?.totalCount ?? 0) !== 1 ? 's' : ''}
                  </span>
                </div>
              </div>

              <div className="flex-1 min-w-[180px] max-w-[280px] space-y-1.5">
                {[5, 4, 3, 2, 1].map((n) => (
                  <RatingBreakdownBar
                    key={n}
                    label={String(n)}
                    count={breakdown[n as keyof typeof breakdown] ?? 0}
                    total={aggregate?.totalCount ?? 0}
                  />
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Review list */}
        {showSkeleton ? (
          <div className="space-y-0">
            {[1, 2, 3].map((i) => (
              <div key={i} className="py-8 border-b border-muted">
                <div className="h-4 w-24 bg-muted animate-pulse mb-3" />
                <div className="h-3 w-48 bg-muted animate-pulse mb-4" />
                <div className="space-y-2">
                  <div className="h-3 w-full bg-muted animate-pulse" />
                  <div className="h-3 w-4/5 bg-muted animate-pulse" />
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div>
            {allReviews.map((review) => (
              <ReviewCard
                key={review.id}
                review={review}
                onPhotoClick={openLightbox}
              />
            ))}
          </div>
        )}

        {/* Load more */}
        {hasMore && (
          <div className="mt-8">
            <button
              type="button"
              disabled={isFetching}
              onClick={() => setPage((p) => p + 1)}
              className={cn(
                'h-10 px-6 border border-umber',
                'font-body font-light text-[12px] uppercase tracking-[0.2em] text-umber',
                'hover:bg-umber hover:text-background transition-all duration-200',
                'disabled:opacity-30 disabled:cursor-not-allowed',
              )}
            >
              {isFetching ? 'Loading…' : 'Load more reviews'}
            </button>
          </div>
        )}
      </section>

      {/* Lightbox */}
      <AnimatePresence>
        {lightboxUrls && (
          <Lightbox
            urls={lightboxUrls}
            startIndex={lightboxStart}
            onClose={closeLightbox}
          />
        )}
      </AnimatePresence>
    </>
  )
}
