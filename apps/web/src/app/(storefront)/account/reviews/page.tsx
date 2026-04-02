'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { cn } from '@/lib/utils'
import { useMyReviews } from '@/hooks/useReviews'
import type { Review } from '@modett/types'

export default function AccountReviewsPage() {
  const [page, setPage] = useState(1)
  const [allReviews, setAllReviews] = useState<Review[]>([])

  const { data, isLoading, isFetching } = useMyReviews(page)

  useEffect(() => {
    if (!data?.reviews) return
    setAllReviews((prev) =>
      page === 1 ? data.reviews : [...prev, ...data.reviews],
    )
  }, [data?.reviews, page])

  const total = data?.total ?? 0
  const hasMore = total > allReviews.length

  if (isLoading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-none" />
        <div className="h-32 bg-muted rounded-none" />
        <div className="h-32 bg-muted rounded-none" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display font-bold text-[24px] text-umber mb-8">Reviews</h1>

      {allReviews.length === 0 && !isLoading ? (
        <p className="font-body font-light text-[14px] text-muted-foreground max-w-md">
          You haven&apos;t reviewed any purchases yet. Reviews become available
          after your order is delivered.
        </p>
      ) : (
        <ul className="space-y-0">
          {allReviews.map((review, index) => (
            <li
              key={review.id}
              className={cn(
                'pb-8 pt-2',
                index < allReviews.length - 1 && 'border-b border-muted/40',
              )}
            >
              <div className="flex flex-wrap items-baseline justify-between gap-2 mb-2">
                <p className="font-body font-light text-[13px] text-umber">
                  <span className="text-highlight" aria-hidden>
                    {'★'.repeat(review.rating)}
                    {'☆'.repeat(5 - review.rating)}
                  </span>
                  <span className="mx-2 text-muted-foreground">·</span>
                  {review.productSlug ? (
                    <Link
                      href={`/products/${review.productSlug}`}
                      className="text-umber underline underline-offset-2 hover:text-ink"
                    >
                      {review.productName}
                    </Link>
                  ) : (
                    <span>{review.productName}</span>
                  )}
                  <span className="text-muted-foreground mx-1">·</span>
                  <span className="text-muted-foreground">
                    {[review.variantColor, review.variantSize]
                      .filter(Boolean)
                      .join(' / ') || '—'}
                  </span>
                </p>
                <div className="text-right">
                  <p className="font-body font-light text-[11px] text-muted-foreground">
                    {new Date(review.createdAt).toLocaleDateString('en-GB', {
                      month: 'long',
                      year: 'numeric',
                    })}
                  </p>
                  {review.status === 'VISIBLE' ? (
                    <p className="text-green-600 text-xs font-body font-light mt-1">
                      Visible ✓
                    </p>
                  ) : (
                    <>
                      <p className="text-gray-400 text-xs font-body font-light mt-1">
                        Hidden ●
                      </p>
                      <p className="text-muted-foreground text-xs font-body font-light mt-0.5 max-w-[220px] ml-auto">
                        This review is under review by our team.
                      </p>
                    </>
                  )}
                </div>
              </div>
              {review.body != null && review.body.trim() !== '' && (
                <p className="font-body font-light text-[13px] text-umber/90 leading-relaxed mt-2">
                  &ldquo;{review.body}&rdquo;
                </p>
              )}
              {review.mediaUrls.length > 0 && (
                <div className="flex flex-wrap gap-2 mt-3">
                  {review.mediaUrls.map((url) => (
                    <button
                      key={url}
                      type="button"
                      onClick={() => window.open(url, '_blank')}
                      className="w-16 h-16 overflow-hidden border-0 p-0 bg-transparent cursor-pointer"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={url} alt="" className="w-full h-full object-cover" />
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
            'mt-6 font-body font-light text-[12px] uppercase tracking-[0.2em]',
            'text-umber underline underline-offset-2 hover:text-ink transition-colors',
            'disabled:opacity-50',
          )}
        >
          {isFetching ? 'Loading…' : 'Load more'}
        </button>
      )}
    </div>
  )
}
