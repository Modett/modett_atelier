'use client'

import { useRef } from 'react'
import Link from 'next/link'
import { motion, useInView, useReducedMotion } from 'framer-motion'
import { useQuery } from '@tanstack/react-query'
import { Star } from 'lucide-react'
import { api } from '@/lib/api'
import { cn } from '@/lib/utils'

interface FeaturedReview {
  id: string
  rating: number
  body: string
  reviewerFirstName: string
  productName: string
  productSlug: string | null
}

function useFeaturedReviews() {
  return useQuery({
    queryKey: ['featured-reviews'],
    queryFn: async () => {
      const res = await api.get<{ data: { reviews: FeaturedReview[] } }>(
        '/reviews/featured',
      )
      return res.data.reviews
    },
    staleTime: 10 * 60 * 1000,
  })
}

function Reveal({
  children,
  delay = 0,
}: {
  children: React.ReactNode
  delay?: number
}) {
  const ref = useRef<HTMLDivElement>(null)
  const inView = useInView(ref, { once: true, margin: '-60px' })
  const prefersReducedMotion = useReducedMotion()

  return (
    <motion.div
      ref={ref}
      initial={prefersReducedMotion ? {} : { opacity: 0, y: 24 }}
      animate={inView ? { opacity: 1, y: 0 } : {}}
      transition={{ duration: 0.7, delay, ease: [0.22, 1, 0.36, 1] }}
    >
      {children}
    </motion.div>
  )
}

function StarRow({ rating }: { rating: number }) {
  const filled = Math.min(5, Math.max(0, Math.round(rating)))
  return (
    <div className="flex gap-0.5" aria-label={`${rating} stars`}>
      {[1, 2, 3, 4, 5].map((n) => (
        <Star
          key={n}
          width={11}
          height={11}
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

export function HomepageReviews() {
  const { data: reviews, isLoading } = useFeaturedReviews()

  if (!isLoading && (!reviews || reviews.length === 0)) return null

  const items: Partial<FeaturedReview>[] = reviews ?? [{}, {}, {}]

  return (
    <section
      className="bg-background py-20 md:py-28 px-5 md:px-10"
      aria-label="What our customers say"
    >
      <div className="max-w-page mx-auto">
        <Reveal>
          <div className="mb-14 md:mb-16 text-center">
            <p className="font-body font-light text-[11px] uppercase tracking-[0.3em] text-highlight mb-4">
              Worn &amp; Loved
            </p>
            <h2 className="font-display font-bold text-umber text-[2rem] md:text-[2.5rem] leading-tight">
              In Their Own Words
            </h2>
          </div>
        </Reveal>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-0">
          {items.map((review, i) => {
            const r = review as FeaturedReview
            const isLoaded = Boolean(r.id)

            return (
              <Reveal key={r.id ?? i} delay={i * 0.1}>
                <div
                  className={cn(
                    'px-6 md:px-8 py-8 flex flex-col',
                    'border-b md:border-b-0 border-muted',
                    i < 2 ? 'md:border-r md:border-muted' : '',
                  )}
                >
                  {isLoaded ? (
                    <>
                      <StarRow rating={r.rating} />

                      <blockquote className="flex-1 mt-5">
                        <p className="font-display font-bold text-umber text-[1.05rem] md:text-[1.1rem] leading-snug italic">
                          &ldquo;
                          {r.body.length > 160
                            ? r.body.slice(0, 157) + '…'
                            : r.body}
                          &rdquo;
                        </p>
                      </blockquote>

                      <footer className="mt-6 pt-6 border-t border-muted">
                        <p className="font-body font-medium text-[13px] text-umber">
                          {r.reviewerFirstName}
                        </p>
                        {r.productSlug && (
                          <Link
                            href={`/products/${r.productSlug}`}
                            className="font-body font-light text-[12px] text-muted-foreground
                                       hover:text-umber transition-colors duration-200 mt-1 block"
                          >
                            {r.productName} →
                          </Link>
                        )}
                      </footer>
                    </>
                  ) : (
                    <div className="space-y-4 flex-1">
                      <div className="flex gap-1">
                        {[1, 2, 3, 4, 5].map((n) => (
                          <div key={n} className="w-3 h-3 bg-muted animate-pulse" />
                        ))}
                      </div>
                      <div className="space-y-2">
                        <div className="h-4 bg-muted animate-pulse w-full" />
                        <div className="h-4 bg-muted animate-pulse w-5/6" />
                        <div className="h-4 bg-muted animate-pulse w-4/6" />
                      </div>
                    </div>
                  )}
                </div>
              </Reveal>
            )
          })}
        </div>

        <Reveal delay={0.35}>
          <div className="mt-10 md:mt-14 text-center">
            <Link
              href="/collections"
              className="font-body font-light text-[12px] uppercase tracking-[0.25em]
                         text-umber border-b border-umber/30 pb-0.5
                         hover:border-umber transition-colors duration-200"
            >
              Explore the collection →
            </Link>
          </div>
        </Reveal>
      </div>
    </section>
  )
}
