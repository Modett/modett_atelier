'use client'

import React from 'react'
import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'
import { OutlineButton } from '../ui/OutlineButton'
import { ProductCard } from './ProductCard'
import type { ProductCardProps } from './ProductCard'

// ── Types ───────────────────────────────────────────────────────────────

export interface FeaturedProductSectionProps {
  /** Eyebrow text above the heading (e.g. "BEST SELLING", "NEW ARRIVALS") */
  eyebrow: string
  /** Main heading text (e.g. "INVESTMENT PIECES", "JUST ARRIVED") */
  heading: string
  /** Description text below the heading */
  description?: string
  /** Products to display — passed directly to ProductCard components */
  products: ProductCardProps[]
  /** "View All" button URL */
  viewAllHref: string
  /** "View All" button label (default: "View All") */
  viewAllLabel?: string
  /** Bottom "Shop All" link text (e.g. "SHOP ALL INVESTMENT PIECES") */
  shopAllText?: string
  /** Bottom "Shop All" link URL (defaults to viewAllHref) */
  shopAllHref?: string
  /** Maximum number of products to display (default: 6) */
  maxProducts?: number
  /** Number of grid columns on desktop (default: 3) */
  columns?: 2 | 3 | 4
  /** Background variant — transparent inherits page bg, raised uses surface-raised */
  background?: 'transparent' | 'raised'
  /** Wishlist toggle handler — passed through to each ProductCard */
  onWishlistToggle?: (productId: string) => void
  /** Quick add to cart handler — passed through to each ProductCard */
  onQuickAddToCart?: (productId: string, colour: string, size: string) => void
  /** Card click handler — passed through to each ProductCard */
  onCardClick?: (slug: string) => void
  /** Additional className */
  className?: string
}

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 md:grid-cols-3 lg:grid-cols-4',
}

/**
 * FeaturedProductSection — full-width editorial section for homepage blocks
 * (bestsellers, new arrivals, editor's picks). Reuses ProductCard and OutlineButton.
 */
export function FeaturedProductSection({
  eyebrow,
  heading,
  description,
  products,
  viewAllHref,
  viewAllLabel = 'View All',
  shopAllText,
  shopAllHref,
  maxProducts = 6,
  columns = 3,
  background = 'transparent',
  onWishlistToggle,
  onQuickAddToCart,
  onCardClick,
  className,
}: FeaturedProductSectionProps) {
  const displayProducts = products.slice(0, maxProducts)

  return (
    <section
      className={cn(
        'w-full',
        'px-4 md:px-6 lg:px-8',
        'py-16 md:py-20 lg:py-24',
        background === 'raised' && 'bg-surface-raised/30',
        className,
      )}
    >
      <motion.div
        className="max-w-7xl mx-auto"
        initial={{ opacity: 0, y: 40 }}
        whileInView={{ opacity: 1, y: 0 }}
        viewport={{ once: true, margin: '-100px' }}
        transition={{ duration: 0.8, ease: 'easeOut' }}
      >
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-end md:justify-between mb-8 md:mb-12">
          <div className="flex flex-col">
            <span className="font-body text-xs font-medium uppercase tracking-[0.25em] text-muted-foreground mb-2 md:mb-3">
              {eyebrow}
            </span>
            <h2 className="font-display text-3xl md:text-4xl lg:text-5xl font-normal uppercase tracking-wider text-foreground">
              {heading}
            </h2>
            {description && (
              <p className="font-body text-sm md:text-base font-normal text-muted-foreground mt-3 max-w-xl">
                {description}
              </p>
            )}
          </div>
          <div className="hidden md:block shrink-0 ml-8">
            <OutlineButton variant="foreground" size="sm" as="a" href={viewAllHref}>
              {viewAllLabel}
            </OutlineButton>
          </div>
        </div>

        {/* Product Grid */}
        <div className={cn('grid gap-4 md:gap-6', columnClasses[columns])}>
          {displayProducts.map((product) => (
            <ProductCard
              key={product.id}
              {...product}
              onWishlistToggle={onWishlistToggle}
              onQuickAddToCart={onQuickAddToCart}
              onCardClick={onCardClick}
            />
          ))}
        </div>

        {/* Bottom link: "SHOP ALL INVESTMENT PIECES >" */}
        <div className="mt-10 md:mt-14">
          <a
            href={shopAllHref ?? viewAllHref}
            className={cn(
              'inline-flex items-center gap-2',
              'font-body text-xs font-medium uppercase tracking-[0.25em] text-foreground',
              'hover:text-muted-foreground transition-colors duration-200',
              'group',
            )}
          >
            <span>{shopAllText ?? `Shop All ${heading}`}</span>
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

        {/* Mobile: View All button (hidden on desktop) */}
        <div className="mt-8 md:hidden">
          <OutlineButton
            variant="foreground"
            size="sm"
            fullWidth
            as="a"
            href={viewAllHref}
          >
            {viewAllLabel}
          </OutlineButton>
        </div>
      </motion.div>
    </section>
  )
}

FeaturedProductSection.displayName = 'FeaturedProductSection'
