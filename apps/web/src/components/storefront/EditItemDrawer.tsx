'use client'

import { useState, useEffect, useLayoutEffect, useRef, useCallback } from 'react'
import Image from 'next/image'
import { useRouter } from 'next/navigation'
import { X, ChevronLeft, ChevronRight, Heart, Loader2 } from 'lucide-react'
import { cn } from '@/lib/utils'
import { ColourSelector } from './ColourSelector'
import { SizeSelector } from './SizeSelector'
import { useProduct } from '@/hooks/useProduct'
import { useAddToCart, useRemoveFromCart } from '@/hooks/useCartMutations'
import { useToggleWishlist, useIsWishlisted } from '@/hooks/useWishlist'
import { useSession } from '@/hooks/useSession'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { formatMoney } from '@/hooks/useCurrency'
import type { CartItem, ProductVariant } from '@/types'

function groupVariantsByColour(
  variants: ProductVariant[],
): Record<string, ProductVariant[]> {
  return variants.reduce<Record<string, ProductVariant[]>>((acc, v) => {
    if (!acc[v.color]) acc[v.color] = []
    acc[v.color]!.push(v)
    return acc
  }, {})
}

interface EditItemDrawerProps {
  item:    CartItem | null
  onClose: () => void
}

export function EditItemDrawer({ item, onClose }: EditItemDrawerProps) {
  const [isOpen, setIsOpen] = useState(false)
  const displayItem = useRef<CartItem | null>(item)

  if (item) {
    displayItem.current = item
  }

  useLayoutEffect(() => {
    setIsOpen(!!item)
  }, [item])

  const requestClose = useCallback(() => {
    setIsOpen(false)
    onClose()
  }, [onClose])

  useEffect(() => {
    document.body.style.overflow = item ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [item])

  useEffect(() => {
    if (!item) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') requestClose()
    }
    document.addEventListener('keydown', onKey)
    return () => document.removeEventListener('keydown', onKey)
  }, [item, requestClose])

  const displayed = displayItem.current

  return (
    <>
      <div
        aria-hidden="true"
        onClick={requestClose}
        className={cn(
          'fixed inset-0 z-[65] bg-graphite/40',
          'transition-opacity duration-200',
          isOpen
            ? 'opacity-100 pointer-events-auto'
            : 'opacity-0 pointer-events-none',
        )}
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label={`Edit ${displayed?.displayName ?? ''}`}
        aria-hidden={!isOpen}
        className={cn(
          'fixed top-0 right-0 bottom-0 z-[70]',
          'w-full max-w-[420px]',
          'bg-background flex flex-col',
          'shadow-[-6px_0_32px_rgba(35,45,53,0.10)]',
          'transition-transform duration-300 ease-out',
          isOpen ? 'translate-x-0' : 'translate-x-full',
        )}
      >
        {displayed && (
          <EditItemDrawerInner item={displayed} onClose={requestClose} />
        )}
      </div>
    </>
  )
}

interface EditItemDrawerInnerProps {
  item:    CartItem
  onClose: () => void
}

function EditItemDrawerInner({ item, onClose }: EditItemDrawerInnerProps) {
  const router = useRouter()

  const {
    data:      product,
    isLoading,
  } = useProduct(item.productSlug, { enabled: true })

  const [selectedColour, setSelectedColour] = useState<string | null>(null)
  const [selectedSize,   setSelectedSize]   = useState<string | null>(null)
  const [carouselIndex,  setCarouselIndex]  = useState(0)

  const addToCart      = useAddToCart()
  const removeFromCart = useRemoveFromCart()
  const isWishlisted   = useIsWishlisted(item.productId)
  const toggleWishlist = useToggleWishlist()
  const { isLoggedIn } = useSession()
  const { openPanel }  = useAuthPanel()

  useEffect(() => {
    setSelectedColour(item.color)
    setSelectedSize(item.size)
    setCarouselIndex(0)
  }, [item.id])

  const variantsByColour = product ? groupVariantsByColour(product.variants) : {}
  const uniqueColours    = product
    ? [...new Set(product.variants.map(v => v.color))]
    : [item.color]
  const sizesForColour   = selectedColour
    ? (variantsByColour[selectedColour] ?? [])
    : []

  const newVariant = selectedColour && selectedSize && product
    ? product.variants.find(
        v => v.color === selectedColour && v.size === selectedSize,
      ) ?? null
    : null

  const hasChanged = selectedColour !== item.color || selectedSize !== item.size

  const canUpdate = (
    newVariant !== null &&
    newVariant.stockStatus !== 'OUT_OF_STOCK' &&
    hasChanged
  ) || !hasChanged

  async function handleUpdate() {
    if (!hasChanged) {
      onClose()
      return
    }
    if (!newVariant) return

    try {
      if (newVariant.id !== item.variantId) {
        await addToCart.mutateAsync({ variantId: newVariant.id, qty: item.qty })
        await removeFromCart.mutateAsync(item.variantId)
      }
      onClose()
    } catch (err) {
      console.error('[EditItemDrawer] update failed', err)
    }
  }

  function handleWishlist() {
    if (!isLoggedIn) {
      openPanel()
      return
    }
    toggleWishlist.mutate(item.productId)
  }

  function handleViewFullDetails() {
    onClose()
    router.push(`/products/${item.productSlug}`)
  }

  const images     = product?.images ?? (item.image ? [item.image] : [])
  const price      = product?.price ?? item.unitPrice
  const isPending  = addToCart.isPending || removeFromCart.isPending

  return (
    <>
      <div className="flex-1 overflow-y-auto overscroll-contain pb-[52px]">

        <button
          onClick={onClose}
          aria-label="Close edit panel"
          className="absolute top-4 right-4 z-10 text-umber hover:text-ink transition-colors duration-200"
        >
          <X className="w-6 h-6" />
        </button>

        <div className="px-5 pt-5 pb-4">
          <h2 className="font-display font-bold text-[22px] text-umber leading-tight pr-10">
            {item.displayName}
          </h2>
          <p className="font-body font-light text-[18px] text-umber mt-1">
            {formatMoney(price)}
          </p>
        </div>

        {isLoading ? (
          <div className="w-full aspect-[4/5] bg-surface-raised animate-pulse" />
        ) : (
          <div className="relative w-full aspect-[4/5] bg-surface-raised overflow-hidden">

            <div
              className="flex h-full transition-transform duration-300 ease-out"
              style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
            >
              {images.map((img, idx) => (
                <div
                  key={img.id ?? idx}
                  className="relative flex-shrink-0 w-full h-full"
                >
                  <Image
                    src={img.url}
                    alt={img.altText ?? item.displayName}
                    fill
                    priority={idx === 0}
                    sizes="420px"
                    className="object-cover object-top"
                  />
                </div>
              ))}
            </div>

            {carouselIndex > 0 && (
              <button
                onClick={() => setCarouselIndex(p => p - 1)}
                aria-label="Previous image"
                className="absolute left-0 top-0 bottom-0 w-12 flex items-center justify-center bg-background/70 hover:bg-background/90 text-umber transition-colors duration-150"
              >
                <ChevronLeft className="w-5 h-5" />
              </button>
            )}

            {carouselIndex < images.length - 1 && (
              <button
                onClick={() => setCarouselIndex(p => p + 1)}
                aria-label="Next image"
                className="absolute right-0 top-0 bottom-0 w-12 flex items-center justify-center bg-background/70 hover:bg-background/90 text-umber transition-colors duration-150"
              >
                <ChevronRight className="w-5 h-5" />
              </button>
            )}
          </div>
        )}

        {images.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 py-3">
            {images.map((_, idx) => (
              <button
                key={idx}
                onClick={() => setCarouselIndex(idx)}
                aria-label={`Image ${idx + 1}`}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  idx === carouselIndex
                    ? 'bg-umber scale-125'
                    : 'bg-muted-foreground/40',
                )}
              />
            ))}
          </div>
        )}

        <div className="px-5 pt-2 pb-4 space-y-5">

          {product ? (
            <ColourSelector
              colours={uniqueColours}
              variants={product.variants}
              selectedColour={selectedColour}
              onColourChange={(colour) => {
                setSelectedColour(colour)
                setSelectedSize(null)
              }}
            />
          ) : (
            <div>
              <p className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber">
                Colour : {item.color}
              </p>
            </div>
          )}

          {product ? (
            <SizeSelector
              sizesForColour={sizesForColour}
              selectedSize={selectedSize}
              onSizeChange={setSelectedSize}
              hasColourSelected={!!selectedColour}
            />
          ) : (
            <div>
              <p className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber">
                Size : {item.size}
              </p>
            </div>
          )}

          <button
            onClick={handleViewFullDetails}
            className="font-body font-light text-[13px] text-umber underline underline-offset-4 hover:text-ink transition-colors duration-200 mt-2"
          >
            View Full Details
          </button>

        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 flex h-[52px] bg-deep text-background flex-shrink-0">

        <button
          type="button"
          onClick={handleUpdate}
          disabled={!canUpdate || isPending}
          className={cn(
            'flex-1 flex items-center justify-center',
            'font-body font-light uppercase tracking-[0.25em] text-[13px]',
            'hover:bg-ink transition-colors duration-200',
            'disabled:opacity-40 disabled:cursor-not-allowed',
          )}
        >
          {isPending ? (
            <Loader2 className="w-4 h-4 animate-spin" />
          ) : (
            `Update — ${formatMoney(price)}`
          )}
        </button>

        <div className="w-px h-6 self-center bg-background/30 flex-shrink-0" />

        <button
          type="button"
          onClick={handleWishlist}
          aria-label={isWishlisted ? 'Remove from wishlist' : 'Add to wishlist'}
          className="w-12 flex items-center justify-center flex-shrink-0 text-background/70 hover:text-background transition-colors duration-200"
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
    </>
  )
}
