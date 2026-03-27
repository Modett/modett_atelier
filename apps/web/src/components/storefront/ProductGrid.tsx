'use client'

import { ProductCard, type ProductCardProps } from '@modett/ui'
import { cn } from '@/lib/utils'
import { ProductCardSkeleton } from './ProductCardSkeleton'

interface ProductGridProps {
  products:  ProductCardProps[]
  isLoading: boolean
  gridCols:  2 | 3
}

export function ProductGrid({
  products,
  isLoading,
  gridCols,
}: ProductGridProps) {
  if (isLoading) {
    return (
      <div
        className={cn(
          'grid gap-4 md:gap-5',
          'grid-cols-2',
          gridCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
        )}
        role="list"
        aria-label="Loading products"
      >
        {Array.from({ length: 12 }).map((_, i) => (
          <div key={i} role="listitem">
            <ProductCardSkeleton />
          </div>
        ))}
      </div>
    )
  }

  return (
    <div
      className={cn(
        'grid gap-4 md:gap-6',
        'grid-cols-2',
        gridCols === 3 ? 'lg:grid-cols-3' : 'lg:grid-cols-2',
      )}
      role="list"
      aria-label="Product list"
    >
      {products.map((product) => (
        <div key={product.id} role="listitem">
          <ProductCard {...product} />
        </div>
      ))}
    </div>
  )
}
