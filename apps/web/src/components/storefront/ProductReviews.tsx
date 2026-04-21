'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useProductReviews } from '@/hooks/useReviews'
import type { Review } from '@modett/types'

interface ProductReviewsProps {
  productId: string
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [page, setPage] = useState(1)
  const [allReviews, setAllReviews] = useState<Review[]>([])

  const { data, isLoading, isFetching } = useProductReviews(productId, page)

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

  if (!productId) return null

  const showSkeleton = isLoading && allReviews.length === 0
  const aggregate = data?.aggregate
  const total = data?.total ?? 0
  const hasMore = !showSkeleton && total > allReviews.length
  const showEmpty =
    !showSkeleton &&
    aggregate !== undefined &&
    aggregate.totalCount === 0

  return (
    <div>
      <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-2 mb-8 md:mb-10">
        <h2 className="font-display font-bold text-[24px] text-graphite">Reviews</h2>
        {aggregate !== undefined && aggregate.totalCount > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-body font-light text-[18px] text-graphite mr-2 tabular-nums">
              {aggregate.averageRating.toFixed(1)}
            </span>
            <StarRow
              rating={aggregate.averageRating}
              className="text-[18px] leading-none"
            />
            <span className="font-body font-light text-[13px] text-umber">
              ({aggregate.totalCount}{' '}
              {aggregate.totalCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {aggregate !== undefined && aggregate.totalCount > 0 && (
        <div className="mb-10 space-y-2 max-w-md">
          {[5, 4, 3, 2, 1].map((star) => {
            const count = aggregate.distribution[star as 1 | 2 | 3 | 4 | 5]
            const pct =
              aggregate.totalCount > 0
                ? Math.round((count / aggregate.totalCount) * 100)
                : 0
            return (
              <div key={star} className="flex gap-2 items-center">
                <span className="text-xs text-umber w-6 tabular-nums">
                  {star}
                </span>
                <span className="text-xs text-highlight" aria-hidden>
                  ★
                </span>
                <div className="flex-1 h-2 rounded-full bg-gray-100 overflow-hidden min-w-[80px]">
                  <div
                    className="h-2 rounded-full bg-amber-300"
                    style={{ width: `${pct}%` }}
                  />
                </div>
                <span className="text-xs text-umber w-8 text-right tabular-nums">
                  {count}
                </span>
              </div>
            )
          })}
        </div>
      )}

      {showSkeleton && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-surface-raised animate-pulse rounded-none mb-4"
            />
          ))}
        </div>
      )}

      {showEmpty && (
        <p className="font-body font-light text-[13px] text-umber">
          No reviews yet — be the first to share your thoughts after your
          purchase.
        </p>
      )}

      {!showSkeleton && !showEmpty && allReviews.length > 0 && (
        <ul className="space-y-0">
          {allReviews.map((review, index) => (
            <li
              key={review.id}
              className={cn(
                'pb-6',
                index < allReviews.length - 1 && 'border-b border-muted/40',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <StarRow rating={review.rating} className="text-[14px] leading-none" />
                <p className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber">
                  Verified Buyer
                  <span className="mx-1.5">·</span>
                  {new Date(review.createdAt).toLocaleDateString('en-GB', {
                    month: 'long',
                    year: 'numeric',
                  })}
                </p>
              </div>
              {review.body != null && review.body.trim() !== '' && (
                <p className="font-body font-light text-[13px] text-graphite leading-relaxed mt-2">
                  &ldquo;{review.body}&rdquo;
                </p>
              )}
              {review.mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.mediaUrls.slice(0, 5).map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => window.open(url, '_blank')}
                      className="block w-16 h-16 rounded-none overflow-hidden cursor-pointer p-0 border-0 bg-transparent"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element -- R2 / user URLs */}
                      <img
                        src={url}
                        alt=""
                        className="w-full h-full object-cover"
                      />
                    </button>
                  ))}
                </div>
              )}
            </li>
          ))}
        </ul>
      )}

      {hasMore && (
        <button
          type="button"
          disabled={isFetching}
          onClick={() => setPage((p) => p + 1)}
          className={cn(
            'font-body font-light text-[12px] uppercase tracking-[0.2em]',
            'text-umber underline underline-offset-2',
            'hover:text-ink transition-colors duration-200 mt-6 block mx-auto',
            'disabled:opacity-50',
          )}
        >
          {isFetching ? 'Loading…' : 'Load more reviews'}
        </button>
      )}
    </div>
  )
}

function StarRow({
  rating,
  className,
  filledClass = 'text-highlight',
  emptyClass = 'text-umber',
}: {
  rating: number
  className?: string
  filledClass?: string
  emptyClass?: string
}) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <span className={cn('inline-flex gap-0.5', className)} aria-hidden>
      {Array.from({ length: 5 }, (_, i) => (
        <span key={i} className={i < filled ? filledClass : emptyClass}>
          {i < filled ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}
