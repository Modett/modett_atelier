'use client'

import { Heart } from 'lucide-react'
import { cn } from '@/lib/utils'

interface AddToCartButtonProps {
  isWishlisted:  boolean
  justAdded:     boolean
  isPending:     boolean
  isOOSSelected: boolean
  onAddToCart:   () => void
  onWishlist:    (e: React.MouseEvent) => void
  hasColour:     boolean
  hasSize:       boolean
}

export function AddToCartButton({
  isWishlisted,
  justAdded,
  isPending,
  isOOSSelected,
  onAddToCart,
  onWishlist,
  hasColour,
  hasSize,
}: AddToCartButtonProps) {
  const canAddToCart = hasColour && hasSize && !isOOSSelected
  const nothingSelected = !hasColour && !hasSize
  const colourNeedsSize = hasColour && !hasSize && !isOOSSelected

  return (
    <div className="flex h-[52px] w-full rounded-none overflow-hidden" role="group">
      <div
        className={cn(
          'flex flex-1 min-w-0',
          nothingSelected ? 'bg-deep/70' : 'bg-deep',
          colourNeedsSize &&
            'ring-1 ring-offset-1 ring-offset-background ring-deep/40 animate-pulse',
        )}
      >
        {/* Left zone — Add to cart */}
        <button
          type="button"
          className={cn(
            'flex-1 flex items-center justify-center gap-2',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'text-background transition-all duration-200',
            !canAddToCart || isPending ? 'cursor-not-allowed' : 'hover:bg-white/[0.07]',
          )}
          onClick={onAddToCart}
          disabled={!canAddToCart || isPending}
          aria-label={
            isPending
              ? 'Adding to cart'
              : isOOSSelected
                ? 'Sold out'
                : 'Add to cart'
          }
          aria-busy={isPending}
        >
          {isPending ? (
            <div
              className="h-4 w-4 shrink-0 rounded-full border-2 border-background/30 border-t-background animate-spin"
              aria-hidden
            />
          ) : justAdded ? (
            'ADDED ✓'
          ) : isOOSSelected ? (
            'SOLD OUT'
          ) : (
            'ADD TO CART'
          )}
        </button>

        {/* Divider */}
        <div
          className="w-px h-6 self-center bg-background/30 flex-shrink-0"
          aria-hidden
        />
      </div>

      {/* Right zone — Wishlist heart (ALWAYS active, never disabled) */}
      <button
        type="button"
        className={cn(
          'w-12 flex-shrink-0 flex items-center justify-center bg-deep',
          'transition-all duration-200 cursor-pointer',
          isWishlisted
            ? 'text-background'
            : 'text-background/70 hover:text-background',
        )}
        onClick={onWishlist}
        aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
      >
        <Heart
          className={cn(
            'w-5 h-5 transition-all duration-200',
            isWishlisted
              ? 'fill-background stroke-background'
              : 'fill-none stroke-current',
          )}
        />
      </button>
    </div>
  )
}
