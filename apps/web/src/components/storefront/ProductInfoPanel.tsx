'use client'

import { formatMoney } from '@/hooks/useCurrency'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useSession } from '@/hooks/useSession'
import { useIsWishlisted, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
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
      <h1 className="font-display font-bold text-[26px] md:text-[30px] text-umber leading-tight tracking-tight">
        {product.displayName}
      </h1>

      {/* Price */}
      <p className="font-body font-light text-[18px] text-umber mt-3">
        {product.isSale ? (
          <>
            <span className="text-muted-foreground line-through mr-3 text-[15px]">
              {formatMoney(product.price)}
            </span>
            <span className="text-highlight">
              {formatMoney(product.price)}
            </span>
          </>
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
        className="mt-6"
      />

      {/* Low stock warning */}
      {showLowStock && selectedVariant && (
        <p className="font-body font-light text-[11px] text-highlight mt-2">
          Only {selectedVariant.availableQty} left
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

        {/* Notify Me — appears below button only when entire colour is OOS */}
        {allOOSForColour && selectedColour && (
          <div className="mt-5 pt-5 border-t border-muted/60">
            <NotifyMeForm
              productId={product.id}
              productSlug={product.slug}
              selectedColour={selectedColour}
              variants={product.variants}
            />
          </div>
        )}
      </div>

      {/* Selection hint text */}
      {!selectedColour && (
        <p className="font-body font-light text-[11px] text-muted-foreground mt-2">
          Please select a colour
        </p>
      )}
      {selectedColour && !selectedSize && (
        <p className="font-body font-light text-[11px] text-muted-foreground mt-2">
          Please select a size
        </p>
      )}
      {selectedColour && selectedSize && selectedVariant?.stockStatus === 'OUT_OF_STOCK' && (
        <p className="font-body font-light text-[11px] text-muted-foreground mt-2">
          This combination is sold out. Please select another option.
        </p>
      )}

      {/* ── Description ──────────────────────────────── */}
      {product.description && (
        <div className="mt-8 pt-6 border-t border-muted/60">
          <p className="font-body font-light text-[13px] md:text-[14px] text-umber/90 leading-relaxed">
            {product.description}
          </p>
          {product.productCode && (
            <p className="font-body font-light text-[11px] text-muted-foreground mt-4">
              Style No. {product.productCode}
            </p>
          )}
        </div>
      )}

      {/* ── Accordions ───────────────────────────────── */}
      <ProductAccordions product={product} className="mt-6" />
    </div>
  )
}
