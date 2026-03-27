'use client'

import React, { useState, useCallback } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { cn } from '../../lib/utils'
import { FilledButton } from '../ui/FilledButton'

// ── Types ───────────────────────────────────────────────────────────────

/** Product image for card */
export interface ProductCardImage {
  /** Image URL */
  url: string
  /** Alt text for accessibility */
  altText: string
}

/** Colour option for swatches */
export interface ProductCardColour {
  /** Unique value (e.g. variant colour code) */
  value: string
  /** Display name */
  name: string
  /** Hex for swatch (e.g. "#BB9485") */
  hex: string
  /** Whether this colour is in stock */
  inStock: boolean
}

/** Size option for quick-add */
export interface ProductCardSize {
  /** Unique value (e.g. "UK_10") */
  value: string
  /** Display label (e.g. "UK 10") */
  label: string
  /** Whether this size is in stock for selected colour */
  inStock: boolean
}

/** Props for ProductCard */
export interface ProductCardProps {
  /** Product ID */
  id: string
  /** Product slug for navigation */
  slug: string
  /** Product display name */
  displayName: string
  /** Formatted price string with currency (e.g. "Rs 8,500.00", "SGD 189.00") */
  price: string
  /** Original price for sale items (shown with strikethrough) */
  originalPrice?: string
  /** Whether the product is on sale */
  isSale?: boolean
  /** Primary product image (default view) */
  primaryImage: ProductCardImage
  /** Secondary image (shown on hover) */
  secondaryImage?: ProductCardImage
  /** Available colour options */
  colours: ProductCardColour[]
  /** Available sizes (for quick-add) */
  sizes: ProductCardSize[]
  /** Whether the product is in the user's wishlist */
  isWishlisted?: boolean
  /** Wishlist toggle handler */
  onWishlistToggle?: (productId: string) => void
  /** Quick add to cart handler */
  onQuickAddToCart?: (productId: string, colourValue: string, sizeValue: string) => void
  /** Card click handler (navigate to PDP) */
  onCardClick?: (slug: string) => void
  /** Whether quick-add is in progress */
  isAddingToCart?: boolean
  /** Card size variant for different grid densities */
  cardSize?: 'default' | 'compact'
  /** Image URL suffix appended to image URLs */
  imageSuffix?: string
  /** Additional className */
  className?: string
}

// ── Helpers ─────────────────────────────────────────────────────────────

/**
 * Determines if a hex colour is "light" (needs a border for visibility on light backgrounds).
 * Uses relative luminance — if luminance > 0.7, the colour is considered light.
 */
function isLightColour(hex: string): boolean {
  const clean = hex.replace(/^#/, '')
  if (clean.length !== 6) return false
  const r = parseInt(clean.slice(0, 2), 16) / 255
  const g = parseInt(clean.slice(2, 4), 16) / 255
  const b = parseInt(clean.slice(4, 6), 16) / 255
  const luminance = 0.2126 * r + 0.7152 * g + 0.0722 * b
  return luminance > 0.7
}

// ── Icons (inline SVGs) ─────────────────────────────────────────────────

function HeartIcon({
  filled,
  size = 20,
  className,
}: {
  filled: boolean
  size?: number
  className?: string
}) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill={filled ? 'currentColor' : 'none'}
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  )
}

function PlusIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M12 5v14M5 12h14" />
    </svg>
  )
}

function MinusIcon({ size = 20, className }: { size?: number; className?: string }) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M5 12h14" />
    </svg>
  )
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * ProductCard — product card for collection/list views with default, hover (image crossfade),
 * and expanded quick-add (size selection + add-to-cart) states. Includes wishlist toggle,
 * colour swatches, price, and product name. UK sizes only.
 */
export function ProductCard({
  id,
  slug,
  displayName,
  price,
  originalPrice,
  isSale,
  primaryImage,
  secondaryImage,
  colours,
  sizes,
  isWishlisted = false,
  onWishlistToggle,
  onQuickAddToCart,
  onCardClick,
  isAddingToCart = false,
  cardSize = 'default',
  imageSuffix = '',
  className,
}: ProductCardProps): React.ReactElement {
  const [isHovered, setIsHovered] = useState(false)
  const [isExpanded, setIsExpanded] = useState(false)
  const firstInStockColour = colours.find((c) => c.inStock)
  const [selectedColourValue, setSelectedColourValue] = useState<string | null>(
    firstInStockColour?.value ?? colours[0]?.value ?? null
  )
  const [selectedSizeValue, setSelectedSizeValue] = useState<string | null>(null)

  const suffix = imageSuffix ?? ''
  const primaryUrl = primaryImage.url + suffix
  const secondaryUrl = secondaryImage?.url ? secondaryImage.url + suffix : ''
  const isCompact = cardSize === 'compact'
  const showSecondaryImage = (isHovered || isExpanded) && secondaryUrl

  const handleImageClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onCardClick?.(slug)
    },
    [onCardClick, slug]
  )

  const handleWishlistClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      onWishlistToggle?.(id)
    },
    [onWishlistToggle, id]
  )

  const handlePlusMinusClick = useCallback(
    (e: React.MouseEvent) => {
      e.preventDefault()
      e.stopPropagation()
      setIsExpanded((prev) => !prev)
      if (isExpanded) {
        setSelectedSizeValue(null)
      }
    },
    [isExpanded]
  )

  const canAddToCart =
    isExpanded &&
    selectedColourValue &&
    selectedSizeValue &&
    sizes.some((s) => s.value === selectedSizeValue && s.inStock)

  const handleAddToCart = useCallback(
    (e?: React.MouseEvent) => {
      e?.preventDefault()
      e?.stopPropagation()
      if (!canAddToCart || !onQuickAddToCart) return
      onQuickAddToCart(id, selectedColourValue!, selectedSizeValue!)
    },
    [canAddToCart, onQuickAddToCart, id, selectedColourValue, selectedSizeValue]
  )

  const nameSizeClass = isCompact ? 'text-xs' : 'text-sm'
  const priceSizeClass = isCompact ? 'text-xs' : 'text-sm'
  const plusMinusSize = isCompact ? 16 : 20
  const swatchSize = isCompact ? 'h-2.5 w-2.5' : 'h-3.5 w-3.5'
  const sizeButtonTextClass = isCompact ? 'text-[10px]' : 'text-xs'

  return (
    <article
      className={cn('flex flex-col bg-background', className)}
      aria-label={displayName}
    >
      {/* Image block with hover crossfade and overlay controls */}
      <div
        className="relative aspect-[3/4] w-full overflow-hidden"
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Clickable image area — navigates to PDP */}
        <button
          type="button"
          onClick={handleImageClick}
          className="absolute inset-0 z-0 block h-full w-full cursor-pointer border-0 bg-transparent p-0 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight"
          aria-label={`View ${displayName}`}
        >
          <img
            src={primaryUrl}
            alt={primaryImage.altText}
            className={cn(
              'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
              showSecondaryImage ? 'opacity-0' : 'opacity-100'
            )}
          />
          {secondaryUrl && (
            <img
              src={secondaryUrl}
              alt={secondaryImage!.altText}
              className={cn(
                'absolute inset-0 h-full w-full object-cover transition-opacity duration-500',
                showSecondaryImage ? 'opacity-100' : 'opacity-0'
              )}
              loading="lazy"
            />
          )}
        </button>

        {/* Wishlist heart — top right */}
        {onWishlistToggle && (
          <button
            type="button"
            onClick={handleWishlistClick}
            className={cn(
              'absolute top-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-none border-0 bg-transparent p-0 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
              isWishlisted ? 'text-deep' : 'text-foreground/60'
            )}
            aria-label={isWishlisted ? `Remove ${displayName} from wishlist` : `Add ${displayName} to wishlist`}
          >
            <HeartIcon filled={isWishlisted} size={isCompact ? 16 : 20} />
          </button>
        )}

        {/* Quick-add overlay panel */}
        <AnimatePresence>
          {isExpanded && (
            <motion.div
              initial={{ y: '100%', opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              exit={{ y: '100%', opacity: 0 }}
              transition={{ duration: 0.3, ease: 'easeOut' }}
              className="absolute bottom-0 left-0 right-0 z-10 bg-background/90 p-3 backdrop-blur-sm"
            >
              <p className="mb-2 text-center font-body text-xs font-medium uppercase tracking-wider text-foreground">
                Available sizes
              </p>
              <div
                className="mb-3 flex flex-wrap justify-center gap-x-2 gap-y-1"
                role="radiogroup"
                aria-label="Size selection"
              >
                {sizes.map((size) => {
                  const isSelected = size.value === selectedSizeValue
                  return (
                    <button
                      key={size.value}
                      type="button"
                      role="radio"
                      aria-checked={isSelected}
                      aria-label={`${size.label}${size.inStock ? '' : ' — Unavailable'}`}
                      disabled={!size.inStock}
                      onClick={(e) => {
                        e.preventDefault()
                        e.stopPropagation()
                        setSelectedSizeValue(size.value)
                      }}
                      className={cn(
                        'min-h-[32px] min-w-[36px] px-2 font-body font-normal tracking-[0.1em] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
                        sizeButtonTextClass,
                        size.inStock
                          ? 'text-foreground hover:bg-surface-raised/50'
                          : 'cursor-not-allowed text-muted-foreground/40 line-through',
                        isSelected && size.inStock && 'border border-foreground'
                      )}
                    >
                      {size.label}
                    </button>
                  )
                })}
              </div>
              <FilledButton
                variant="deep"
                size="sm"
                fullWidth
                disabled={!canAddToCart}
                isLoading={isAddingToCart}
                loadingText="ADDING..."
                onClick={() => handleAddToCart()}
                className="h-10 font-body font-light uppercase tracking-[0.25em] text-xs"
                aria-label="Add to cart"
              >
                ADD TO CART
              </FilledButton>
            </motion.div>
          )}
        </AnimatePresence>
      </div>

      {/* Product info — name row with plus/minus, price, swatches */}
      <div className="mt-2 flex flex-col">
        <div className="flex items-start justify-between gap-2">
          {onCardClick ? (
            <button
              type="button"
              onClick={handleImageClick}
              className={cn(
                'min-w-0 flex-1 text-left font-body font-normal text-foreground',
                nameSizeClass
              )}
            >
              {displayName}
            </button>
          ) : (
            <span
              className={cn(
                'min-w-0 flex-1 font-body font-normal text-foreground',
                nameSizeClass
              )}
            >
              {displayName}
            </span>
          )}
          <button
            type="button"
            onClick={handlePlusMinusClick}
            className={cn(
              'shrink-0 border-0 bg-transparent p-0 text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight'
            )}
            aria-label={isExpanded ? 'Close quick add' : 'Quick add to cart'}
            aria-expanded={isExpanded}
          >
            {isExpanded ? (
              <MinusIcon size={plusMinusSize} />
            ) : (
              <PlusIcon size={plusMinusSize} />
            )}
          </button>
        </div>

        <div className={cn('font-body font-normal text-foreground', priceSizeClass)}>
          {isSale && originalPrice && (
            <span className="line-through text-muted-foreground">{originalPrice}</span>
          )}
          {isSale && originalPrice && ' '}
          <span>{price}</span>
        </div>

        {/* Colour swatches — selectable when expanded */}
        {colours.length > 0 && (
          <div
            className={cn('mt-1.5 flex flex-wrap items-center gap-1.5')}
            role={isExpanded ? 'radiogroup' : undefined}
            aria-label={isExpanded ? 'Colour selection' : undefined}
          >
            {colours.map((colour) => {
              const isSelected = isExpanded && colour.value === selectedColourValue
              const isLight = isLightColour(colour.hex)
              return (
                <button
                  key={colour.value}
                  type="button"
                  {...(isExpanded && {
                    role: 'radio',
                    'aria-checked': isSelected,
                    'aria-label': `${colour.name}${!colour.inStock ? ' — Out of stock' : ''}`,
                  })}
                  disabled={isExpanded && !colour.inStock}
                  onClick={(e) => {
                    e.preventDefault()
                    e.stopPropagation()
                    if (isExpanded && colour.inStock) {
                      setSelectedColourValue(colour.value)
                      setSelectedSizeValue(null)
                    }
                  }}
                  className={cn(
                    'shrink-0 rounded-full transition-all duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight focus-visible:ring-offset-2 focus-visible:ring-offset-background',
                    swatchSize,
                    !colour.inStock && 'cursor-not-allowed opacity-40',
                    isLight && 'border border-surface-raised',
                    isExpanded && isSelected && colour.inStock && 'ring-2 ring-umber ring-offset-2 ring-offset-background',
                    isExpanded && colour.inStock && 'cursor-pointer hover:scale-110'
                  )}
                  style={{ backgroundColor: colour.hex }}
                />
              )
            })}
          </div>
        )}
      </div>
    </article>
  )
}

ProductCard.displayName = 'ProductCard'
