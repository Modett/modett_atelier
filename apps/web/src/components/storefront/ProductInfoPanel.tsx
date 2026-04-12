'use client'

import { Heart } from 'lucide-react'
import { formatMoney } from '@/hooks/useCurrency'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useSession } from '@/hooks/useSession'
import { useIsWishlisted, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { cn } from '@/lib/utils'
import { ColourSelector } from './ColourSelector'
import { SizeSelector } from './SizeSelector'
import { AddToCartButton } from './AddToCartButton'
import { NotifyMeForm } from './NotifyMeForm'
import { ProductAccordions } from './ProductAccordions'
import type { ProductDetail, ProductVariant } from '@/types'

interface ProductInfoPanelProps {
  product:         ProductDetail
  selectedColour:  string | null
  selectedSize:    string | null
  selectedVariant: ProductVariant | null
  sizesForColour:  ProductVariant[]
  allOOSForColour: boolean
  justAdded:       boolean
  onColourChange:  (colour: string) => void
  onSizeChange:    (size: string) => void
  onJustAdded:     () => void
}

export function ProductInfoPanel({
  product,
  selectedColour,
  selectedSize,
  selectedVariant,
  sizesForColour,
  allOOSForColour,
  justAdded,
  onColourChange,
  onSizeChange,
  onJustAdded,
}: ProductInfoPanelProps) {
  const addToCart      = useAddToCart()
  const { isLoggedIn } = useSession()
  const { openPanel }  = useAuthPanel()
  const isWishlisted   = useIsWishlisted(product.id)
  const toggleWishlist = useToggleWishlist()

  const uniqueColours = [...new Set(product.variants.map((v) => v.color))]

  const showLowStock =
    selectedVariant !== null && selectedVariant.stockStatus === 'LOW_STOCK'

  async function handleAddToCart() {
    if (!selectedVariant) return
    try {
      await addToCart.mutateAsync({ variantId: selectedVariant.id, qty: 1 })
      onJustAdded()
    } catch {
      // Stock changed — useProduct cache will refetch
    }
  }

  function handleWishlist(e: React.MouseEvent) {
    e.stopPropagation()
    if (!isLoggedIn) {
      openPanel()
      return
    }
    toggleWishlist.mutate(product.id)
  }

  return (
    <div className="px-5 md:px-0 pt-6 pb-10 md:pt-8">

      {/* ── Product name ─────────────────────────────── */}
      <h1 className="font-display font-bold text-[26px] md:text-[30px] text-graphite leading-tight tracking-tight">
        {product.displayName}
      </h1>

      {/* ── Price ─────────────────────────────────────── */}
      <p className="font-body font-light text-[18px] text-graphite mt-3">
        {product.isSale && product.salePrice ? (
          <>
            <span className="line-through mr-3 text-[15px] text-umber">
              {formatMoney(product.price)}
            </span>
            <span className="text-highlight font-medium">
              {formatMoney(product.salePrice)}
            </span>
          </>
        ) : product.isSale ? (
          <span className="text-highlight font-medium">{formatMoney(product.price)}</span>
        ) : (
          formatMoney(product.price)
        )}
      </p>

      {/* ── Colour selector ──────────────────────────── */}
      <ColourSelector
        colours={uniqueColours}
        variants={product.variants}
        selectedColour={selectedColour}
        onColourChange={onColourChange}
        className="mt-6"
      />

      {/* ── Size selector ────────────────────────────── */}
      <SizeSelector
        sizesForColour={sizesForColour}
        selectedSize={selectedSize}
        onSizeChange={onSizeChange}
        hasColourSelected={!!selectedColour}
        className="mt-5"
      />

      {/* ── Low stock warning ────────────────────────── */}
      {showLowStock && selectedVariant && (
        <p className="font-body text-[12px] text-graphite mt-2 flex items-center gap-1.5">
          <span className="inline-block w-1.5 h-1.5 rounded-full bg-terracotta-clay flex-shrink-0" aria-hidden />
          Only {selectedVariant.availableQty} left in this size
        </p>
      )}

      {/* ── Add to cart ───────────────────────────────── */}
      <div className="mt-6">
        <AddToCartButton
          isWishlisted={isWishlisted}
          justAdded={justAdded}
          isPending={addToCart.isPending}
          isOOSSelected={selectedVariant !== null && selectedVariant.stockStatus === 'OUT_OF_STOCK'}
          onAddToCart={handleAddToCart}
          onWishlist={handleWishlist}
          hasColour={!!selectedColour}
          hasSize={!!selectedSize}
        />
      </div>

      {/* ── Trust strip ─────────────────────────────── */}
      <div className="mt-3 px-4 py-3 border border-umber/20 bg-surface flex flex-wrap items-center justify-between gap-y-1 gap-x-3">
        {[
          { label: 'Free shipping', sub: 'over LKR 15,000' },
          { label: '30-day returns', sub: 'unworn with tags' },
          { label: 'Secure checkout', sub: 'SSL encrypted' },
        ].map((item) => (
          <div key={item.label} className="flex flex-col items-center flex-1 min-w-[80px]">
            <span className="font-body font-medium text-[11px] uppercase tracking-[0.12em] text-graphite">
              {item.label}
            </span>
            <span className="font-body font-light text-[10px] text-umber mt-0.5">
              {item.sub}
            </span>
          </div>
        ))}
      </div>

      {/* ── Selection hint / OOS message ─────────────── */}
      <div className="mt-3 min-h-[18px]">
        {!selectedColour && (
          <p className="font-body font-light text-[12px] text-umber">
            Select a colour to see available sizes
          </p>
        )}
        {selectedColour && !selectedSize && (
          <p className="font-body font-light text-[12px] text-umber">
            Please select a size
          </p>
        )}
        {selectedColour && selectedSize && selectedVariant?.stockStatus === 'OUT_OF_STOCK' && (
          <p className="font-body font-light text-[12px] text-umber">
            This size is sold out — select another to add to cart
          </p>
        )}
      </div>

      {/* ── Wishlist link ────────────────────────────── */}
      {!allOOSForColour && (
        <button
          type="button"
          onClick={handleWishlist}
          className="mt-1 font-body font-light text-[11px] text-umber hover:text-graphite transition-colors duration-200 flex items-center gap-1.5 cursor-pointer"
        >
          <Heart
            className={cn(
              'w-3 h-3 transition-all duration-200',
              isWishlisted ? 'fill-current stroke-current' : 'fill-none stroke-current',
            )}
          />
          {isWishlisted ? 'Saved to wishlist' : 'Save to wishlist'}
        </button>
      )}

      {/* ── Notify Me ────────────────────────────────── */}
      {allOOSForColour && selectedColour && (
        <div className="mt-5 pt-5 border-t border-umber/20">
          <NotifyMeForm
            productId={product.id}
            productSlug={product.slug}
            selectedColour={selectedColour}
            variants={product.variants}
          />
        </div>
      )}

      {/* ── Accordions ───────────────────────────────── */}
      <ProductAccordions product={product} className="mt-8" />
    </div>
  )
}
