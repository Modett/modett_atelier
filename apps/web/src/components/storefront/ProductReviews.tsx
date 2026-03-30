'use client'

import { useState, useEffect } from 'react'
import { cn } from '@/lib/utils'
import { useProductReviews } from '@/hooks/useProductReviews'
import type { ProductReview } from '@/types'

interface ProductReviewsProps {
  productId: string
}

export function ProductReviews({ productId }: ProductReviewsProps) {
  const [page, setPage]         = useState(1)
  const [allReviews, setAllReviews] = useState<ProductReview[]>([])

  const { data, isLoading, isFetching } = useProductReviews(productId, page)

  useEffect(() => {
    if (!data?.reviews) return
    if (page === 1) {
      setAllReviews(data.reviews)
      return
    }
    setAllReviews((prev) => {
      const ids = new Set(prev.map((r) => r.id))
      const next = data.reviews.filter((r) => !ids.has(r.id))
      return [...prev, ...next]
    })
  }, [data, page])

  if (!productId) return null

  const showSkeleton = isLoading && allReviews.length === 0
  const aggregate    = data?.aggregate
  const total          = data?.total ?? 0
  const hasMore        = !showSkeleton && total > allReviews.length
  const showEmpty      =
    !showSkeleton &&
    aggregate !== undefined &&
    aggregate.totalCount === 0

  return (
    <div>
      <div className="flex flex-wrap items-baseline gap-x-4 gap-y-2 mb-8 md:mb-10">
        <h2 className="font-display font-bold text-[24px] text-umber">
          Reviews
        </h2>
        {aggregate !== undefined && aggregate.totalCount > 0 && (
          <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
            <span className="font-body font-light text-[18px] text-umber tabular-nums">
              {aggregate.averageRating.toFixed(1)}
            </span>
            <StarRow
              rating={aggregate.averageRating}
              className="text-[18px] leading-none"
            />
            <span className="font-body font-light text-[13px] text-muted-foreground">
              ({aggregate.totalCount}{' '}
              {aggregate.totalCount === 1 ? 'review' : 'reviews'})
            </span>
          </div>
        )}
      </div>

      {showSkeleton && (
        <div className="flex flex-col gap-4">
          {Array.from({ length: 3 }).map((_, i) => (
            <div
              key={i}
              className="h-24 bg-surface-raised animate-pulse rounded-none"
            />
          ))}
        </div>
      )}

      {showEmpty && (
        <p className="font-body font-light text-[13px] text-muted-foreground">
          No reviews yet — be the first to share your thoughts.
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
              <StarRow
                rating={review.rating}
                className="text-[14px] leading-none mb-2"
              />
              <p className="font-body font-light text-[12px] text-muted-foreground">
                Verified Buyer
                <span className="mx-1.5">·</span>
                {new Date(review.createdAt).toLocaleDateString('en-GB', {
                  month: 'long',
                  year: 'numeric',
                })}
              </p>
              {review.body != null && review.body.trim() !== '' && (
                <p className="font-body font-light text-[13px] text-umber/90 leading-relaxed mt-3">
                  {review.body}
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
                      {/* eslint-disable-next-line @next/next/no-img-element -- arbitrary R2 / user URLs */}
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
            'mt-2 font-body font-light text-[12px] uppercase',
            'tracking-[0.2em] text-umber underline underline-offset-2',
            'hover:text-ink transition-colors duration-200',
            'disabled:opacity-40',
          )}
        >
          Load more reviews
        </button>
      )}
    </div>
  )
}

function StarRow({
  rating,
  className,
}: {
  rating: number
  className?: string
}) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <span
      className={cn('inline-flex gap-0.5', className)}
      aria-hidden
    >
      {Array.from({ length: 5 }, (_, i) => (
        <span
          key={i}
          className={
            i < filled ? 'text-highlight' : 'text-muted-foreground'
          }
        >
          {i < filled ? '★' : '☆'}
        </span>
      ))}
    </span>
  )
}
