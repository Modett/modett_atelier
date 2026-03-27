'use client'

import { motion } from 'framer-motion'
import { cn } from '../../lib/utils'

export interface AddToCartButtonProps {
  /** Handler called when "ADD TO CART" is clicked */
  onAddToCart: () => void
  /** Handler called when the wishlist heart is toggled */
  onWishlistToggle: () => void
  /** Whether the product is already in the user's wishlist */
  isWishlisted?: boolean
  /** Whether the add-to-cart action is in progress */
  isAddingToCart?: boolean
  /** Whether the wishlist toggle is in progress */
  isTogglingWishlist?: boolean
  /** Disable the entire add-to-cart zone (e.g. no size selected, out of stock) */
  disabled?: boolean
  /** Custom disabled message to show instead of "ADD TO CART" */
  disabledText?: string
  /** Additional className for the outer container */
  className?: string
}

function HeartIcon({
  filled,
  className,
}: {
  filled: boolean
  className?: string
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={cn('block', className)}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

const heartIconSizeClass = 'h-[22px] w-[22px] md:h-6 md:w-6'

export function AddToCartButton({
  onAddToCart,
  onWishlistToggle,
  isWishlisted = false,
  isAddingToCart = false,
  isTogglingWishlist = false,
  disabled = false,
  disabledText,
  className,
}: AddToCartButtonProps) {
  const displayText = disabled
    ? disabledText ?? 'OUT OF STOCK'
    : isAddingToCart
      ? 'ADDING...'
      : 'ADD TO CART'

  const addToCartAriaLabel = disabled
    ? displayText
    : isAddingToCart
      ? 'Adding to cart'
      : 'Add to cart'

  const wishlistAriaLabel = isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'

  return (
    <div
      className={cn(
        'flex w-full flex-row overflow-hidden rounded-none bg-deep',
        'h-14 md:h-[60px]',
        className
      )}
      role="group"
    >
      {/* Left zone — Add to cart */}
      <button
        type="button"
        onClick={onAddToCart}
        disabled={disabled}
        aria-label={addToCartAriaLabel}
        aria-busy={isAddingToCart}
        aria-disabled={disabled}
        className={cn(
          'flex flex-1 items-center justify-center gap-2 font-body font-light uppercase tracking-[0.25em]',
          'text-sm text-background md:text-base',
          'transition-all duration-200',
          'hover:bg-white/[0.07] active:brightness-95',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight',
          disabled && 'cursor-not-allowed opacity-50 hover:bg-transparent'
        )}
      >
        {isAddingToCart ? (
          <>
            <div
              className="h-4 w-4 shrink-0 rounded-full border-2 border-background/30 border-t-background animate-spin"
              aria-hidden
            />
            <span>{displayText}</span>
          </>
        ) : (
          <span>{displayText}</span>
        )}
      </button>

      {/* Vertical divider — warm-white 20% opacity */}
      <div
        className="w-px self-stretch bg-[rgba(248,245,242,0.2)]"
        aria-hidden
      />

      {/* Right zone — Wishlist heart */}
      <button
        type="button"
        onClick={onWishlistToggle}
        aria-label={wishlistAriaLabel}
        aria-busy={isTogglingWishlist}
        className={cn(
          'flex w-16 flex-shrink-0 items-center justify-center md:w-[72px]',
          'transition-all duration-200',
          'hover:text-highlight active:scale-90',
          'focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight',
          isWishlisted ? 'text-highlight' : 'text-background'
        )}
      >
        {isTogglingWishlist ? (
          <div className={cn('animate-pulse', isWishlisted ? 'text-highlight' : 'text-background')}>
            <HeartIcon filled={isWishlisted} className={heartIconSizeClass} />
          </div>
        ) : (
          <motion.div
            key={isWishlisted ? 'filled' : 'outline'}
            initial={{ scale: 0.8 }}
            animate={{ scale: 1 }}
            transition={{ type: 'spring', stiffness: 400, damping: 15 }}
            className={cn('flex items-center justify-center', heartIconSizeClass)}
          >
            <HeartIcon filled={isWishlisted} className="h-full w-full" />
          </motion.div>
        )}
      </button>
    </div>
  )
}
