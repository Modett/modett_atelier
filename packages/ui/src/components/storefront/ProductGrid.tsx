'use client'

import React from 'react'
import { cn } from '../../lib/utils'
import { ProductCard, type ProductCardProps } from './ProductCard'

// ── Types ───────────────────────────────────────────────────────────────

/** Props for ProductGrid */
export interface ProductGridProps {
  /** Array of product data to render as cards */
  products: ProductCardProps[]
  /** Number of columns (2, 3, or 4) */
  columns?: 2 | 3 | 4
  /** Gap between cards */
  gap?: 'sm' | 'md' | 'lg'
  /** Additional className */
  className?: string
}

const columnClasses: Record<2 | 3 | 4, string> = {
  2: 'grid-cols-1 sm:grid-cols-2',
  3: 'grid-cols-1 sm:grid-cols-2 lg:grid-cols-3',
  4: 'grid-cols-2 sm:grid-cols-3 lg:grid-cols-4',
}

const gapClasses: Record<'sm' | 'md' | 'lg', string> = {
  sm: 'gap-2',
  md: 'gap-4',
  lg: 'gap-6',
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * ProductGrid — responsive grid wrapper that displays ProductCards in configurable
 * column layouts (2, 3, or 4 columns) with consistent gaps. When columns is 4,
 * cards automatically use compact size for tighter layout.
 */
export function ProductGrid({
  products,
  columns = 3,
  gap = 'md',
  className,
}: ProductGridProps): React.ReactElement {
  return (
    <div
      className={cn(
        'grid',
        columnClasses[columns],
        gapClasses[gap],
        className
      )}
      role="list"
      aria-label="Product list"
    >
      {products.map((product) => (
        <div key={product.id} role="listitem">
          <ProductCard
            {...product}
            cardSize={columns === 4 ? 'compact' : 'default'}
          />
        </div>
      ))}
    </div>
  )
}

ProductGrid.displayName = 'ProductGrid'
