'use client'

import { useState, useRef, useEffect } from 'react'
import { notFound } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useGeo, getCurrencyCookie } from '@/hooks/useCurrency'
import { useSession } from '@/hooks/useSession'
import { useProduct } from '@/hooks/useProduct'
import { Analytics } from '@/lib/analytics'
import { ProductBreadcrumb } from './ProductBreadcrumb'
import { ProductImageGallery } from './ProductImageGallery'
import { ProductInfoPanel } from './ProductInfoPanel'
import { ProductReviews } from './ProductReviews'
import { WearItWith } from './WearItWith'
import { YouMayAlsoLike } from './YouMayAlsoLike'
import { ProductDetailSkeleton } from './ProductDetailSkeleton'
import type { ProductVariant } from '@/types'

interface ProductDetailPageProps {
  slug: string
}

export function ProductDetailPage({ slug }: ProductDetailPageProps) {
  const { isReady }                       = useGeo()
  const { user }                          = useSession()
  const { data: product, isLoading, error } = useProduct(slug)

  const [selectedColour, setSelectedColour] = useState<string | null>(null)
  const [selectedSize, setSelectedSize]     = useState<string | null>(null)
  const [justAdded, setJustAdded]           = useState(false)
  const [isFullImageMode, setIsFullImageMode]       = useState(false)
  const [fullImageStartIndex, setFullImageStartIndex] = useState(0)
  const galleryRef = useRef<HTMLDivElement>(null)

  function handleColourChange(colour: string) {
    setSelectedColour(colour)
    setSelectedSize(null)
  }

  function handleImageClick(index: number) {
    setFullImageStartIndex(index)
    setIsFullImageMode(true)
  }

  function handleExitFullImageMode() {
    setIsFullImageMode(false)
    galleryRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  }

  if (!isReady || isLoading) return <ProductDetailSkeleton />

  if (!isLoading && !product && !error) return notFound()

  if (error) {
    const status =
      typeof error === 'object' &&
      error !== null &&
      'status' in error &&
      typeof (error as { status: unknown }).status === 'number'
        ? (error as { status: number }).status
        : undefined
    if (status === 404) return notFound()
    return (
      <div className="min-h-screen bg-background flex items-center justify-center px-4">
        <div className="text-center">
          <p className="font-body font-light text-[14px] text-muted-foreground mb-4">
            Something went wrong loading this product.
          </p>
          <a
            href={`/products/${slug}`}
            className="font-body font-light text-[12px] uppercase tracking-[0.2em] text-umber underline underline-offset-2 hover:text-ink transition-colors duration-200"
          >
            Try again
          </a>
        </div>
      </div>
    )
  }

  if (!product) return notFound()

  const variantsByColour = groupVariantsByColour(product.variants)
  const sizesForColour = selectedColour
    ? (variantsByColour[selectedColour] ?? [])
    : []

  const selectedVariant =
    selectedColour && selectedSize
      ? (product.variants.find(
          (v) => v.color === selectedColour && v.size === selectedSize,
        ) ?? null)
      : null

  useEffect(() => {
    if (!product) return
    Analytics.productView({
      productId:   product.id,
      productName: product.displayName,
      source:
        typeof document !== 'undefined' ? document.referrer || 'direct' : 'direct',
      currency:    getCurrencyCookie(),
      userId:      user?.id,
    })
  }, [product?.id, user?.id])

  useEffect(() => {
    if (!product || !selectedVariant) return
    Analytics.variantSelect({
      variantId: selectedVariant.id,
      productId: product.id,
      color:     selectedColour ?? '',
      size:      selectedSize ?? '',
      userId:    user?.id,
    })
  }, [product?.id, selectedVariant?.id, user?.id])

  const allOOSForColour = selectedColour
    ? sizesForColour.every((v) => v.stockStatus === 'OUT_OF_STOCK')
    : false

  return (
    <div className="min-h-screen bg-background" ref={galleryRef}>
      <ProductBreadcrumb product={product} />

      {/* Main content — layout switches between normal and full-image mode */}
      <div
        className={cn(
          'transition-all duration-300 ease-out',
          isFullImageMode
            ? 'max-w-none px-0'
            : 'max-w-page mx-auto px-4 md:px-0 pb-12 md:pb-16 lg:pb-20',
        )}
      >
        <div
          className={cn(
            isFullImageMode
              ? 'block'
              : 'md:grid md:grid-cols-[60%_40%] md:gap-x-8 lg:gap-x-12 md:items-start',
          )}
        >
          {/* Image gallery — always shown */}
          <div
            className={cn(
              isFullImageMode
                ? 'w-full'
                : 'pt-4 md:pt-6 pb-8 md:pb-12 md:pl-8 lg:pl-10 xl:pl-12',
            )}
          >
            <ProductImageGallery
              images={product.images}
              productName={product.displayName}
              isFullImageMode={isFullImageMode}
              fullImageStartIndex={fullImageStartIndex}
              onImageClick={handleImageClick}
              onExitFullImageMode={handleExitFullImageMode}
            />
          </div>

          {/* Product info panel — hidden in full image mode */}
          <div
            className={cn(
              // No max-h / overflow here — info + accordions scroll with the main page only
              'md:pr-8 lg:pr-10 xl:pr-12 md:pl-2 md:sticky md:top-16 md:self-start',
              isFullImageMode ? 'hidden' : 'block',
            )}
          >
            <ProductInfoPanel
              product={product}
              selectedColour={selectedColour}
              selectedSize={selectedSize}
              selectedVariant={selectedVariant}
              sizesForColour={sizesForColour}
              allOOSForColour={allOOSForColour}
              justAdded={justAdded}
              onColourChange={handleColourChange}
              onSizeChange={setSelectedSize}
              onJustAdded={() => {
                setJustAdded(true)
                setTimeout(() => setJustAdded(false), 1500)
              }}
            />
          </div>
        </div>
      </div>

      {/* Sections hidden in full image mode */}
      {!isFullImageMode && (
        <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-14 md:py-20 border-t border-muted">
          <ProductReviews key={product.id} productId={product.id} />
        </div>
      )}
      {!isFullImageMode && product.relations && product.relations.length > 0 && (
        <WearItWith relations={product.relations} />
      )}
      {!isFullImageMode && (
        <YouMayAlsoLike
          currentProductId={product.id}
          categoryId={product.categoryId}
        />
      )}
    </div>
  )
}

function groupVariantsByColour(
  variants: ProductVariant[],
): Record<string, ProductVariant[]> {
  return variants.reduce<Record<string, ProductVariant[]>>((acc, variant) => {
    if (!acc[variant.color]) acc[variant.color] = []
    acc[variant.color]!.push(variant)
    return acc
  }, {})
}
