'use client'

import { useState, useCallback, useRef, useEffect } from 'react'
import Image from 'next/image'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import type { ProductImage } from '@/types'

interface ProductImageGalleryProps {
  images:              ProductImage[]
  productName:         string
  isFullImageMode:     boolean
  fullImageStartIndex: number
  onImageClick:        (index: number) => void
  onExitFullImageMode: () => void
}

export function ProductImageGallery({
  images,
  productName,
  isFullImageMode,
  fullImageStartIndex,
  onImageClick,
  onExitFullImageMode,
}: ProductImageGalleryProps) {
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [scrollProgress, setScrollProgress] = useState(0)
  const imageRefs = useRef<(HTMLDivElement | null)[]>([])
  const touchStartX = useRef(0)
  const touchDeltaX = useRef(0)

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

  // Scroll to clicked image when entering full image mode
  useEffect(() => {
    if (isFullImageMode && imageRefs.current[fullImageStartIndex]) {
      setTimeout(() => {
        imageRefs.current[fullImageStartIndex]?.scrollIntoView({
          behavior: 'smooth',
          block: 'start',
        })
      }, 100)
    }
  }, [isFullImageMode, fullImageStartIndex])

  // Progress bar scroll tracking (Mode B only)
  useEffect(() => {
    if (!isFullImageMode) return

    function onScroll() {
      const scrollTop = window.scrollY
      const docHeight = document.documentElement.scrollHeight
      const winHeight = window.innerHeight
      const maxScroll = docHeight - winHeight
      const progress = maxScroll > 0 ? (scrollTop / maxScroll) * 100 : 0
      setScrollProgress(Math.min(100, Math.max(0, progress)))
    }

    window.addEventListener('scroll', onScroll, { passive: true })
    onScroll()
    return () => window.removeEventListener('scroll', onScroll)
  }, [isFullImageMode])

  const handleTouchStart = useCallback((e: React.TouchEvent) => {
    touchStartX.current = e.touches[0]?.clientX ?? 0
    touchDeltaX.current = 0
  }, [])

  const handleTouchMove = useCallback((e: React.TouchEvent) => {
    touchDeltaX.current = (e.touches[0]?.clientX ?? 0) - touchStartX.current
  }, [])

  const handleTouchEnd = useCallback(() => {
    const threshold = 50
    if (touchDeltaX.current < -threshold && carouselIndex < sortedImages.length - 1) {
      setCarouselIndex((p) => p + 1)
    } else if (touchDeltaX.current > threshold && carouselIndex > 0) {
      setCarouselIndex((p) => p - 1)
    }
    touchDeltaX.current = 0
  }, [carouselIndex, sortedImages.length])

  if (sortedImages.length === 0) {
    return (
      <div className="aspect-[3/4] bg-surface-raised flex items-center justify-center">
        <span className="text-muted-foreground/40 text-[13px] font-body">
          No images
        </span>
      </div>
    )
  }

  // ── MODE B: Full image scroll view (Everlane-style) ──────
  if (isFullImageMode) {
    return (
      <>
        <div className="w-full">
          {sortedImages.map((image, index) => (
            <div
              key={image.id}
              ref={(el) => {
                imageRefs.current[index] = el
              }}
              className="relative w-full cursor-zoom-out"
              style={{ aspectRatio: '4/5' }}
              onClick={onExitFullImageMode}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onExitFullImageMode()
                }
              }}
              aria-label="Exit full image view"
            >
              <Image
                src={image.url}
                alt={image.altText ?? `${productName} — image ${index + 1}`}
                fill
                priority={index <= 1}
                sizes="100vw"
                className="object-cover object-center"
              />
            </div>
          ))}
        </div>

        {/* Bottom progress bar */}
        <div className="fixed bottom-0 left-0 right-0 h-[3px] bg-muted z-50">
          <div
            className="h-full bg-umber"
            style={{ width: `${scrollProgress}%` }}
          />
        </div>

        {/* Bottom-right thumbnail — back to top */}
        {sortedImages[0] && (
          <button
            type="button"
            onClick={() => window.scrollTo({ top: 0, behavior: 'smooth' })}
            aria-label="Back to first image"
            className="fixed bottom-6 right-4 z-50 w-[72px] h-[90px] overflow-hidden border border-muted hover:opacity-80 transition-opacity duration-200"
          >
            <Image
              src={sortedImages[0].url}
              alt={`${productName} — thumbnail`}
              fill
              sizes="72px"
              className="object-cover object-center"
            />
          </button>
        )}
      </>
    )
  }

  // ── MODE A: Normal gallery (desktop masonry + mobile carousel) ──
  return (
    <>
      {/* Desktop: masonry grid */}
      <div className="hidden md:block">
        <div className="grid grid-cols-2 gap-3 md:gap-4">
          {sortedImages.map((image, index) => (
            <div
              key={image.id}
              className={cn(
                'relative overflow-hidden bg-surface-raised cursor-zoom-in group',
                index === 0 ? 'col-span-2 aspect-[4/3]' : 'aspect-[3/4]',
              )}
              onClick={() => onImageClick(index)}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault()
                  onImageClick(index)
                }
              }}
              aria-label={`View ${image.altText ?? productName} fullscreen`}
            >
              <Image
                src={image.url}
                alt={image.altText ?? `${productName} — image ${index + 1}`}
                fill
                priority={index === 0}
                sizes={
                  index === 0
                    ? '(max-width: 768px) 100vw, 60vw'
                    : '(max-width: 768px) 50vw, 30vw'
                }
                className="object-cover object-center transition-transform duration-500 group-hover:scale-[1.02]"
              />
            </div>
          ))}
        </div>
      </div>

      {/* Mobile: swipeable carousel */}
      <div className="md:hidden">
        <div
          className="relative overflow-hidden aspect-[4/5] bg-surface-raised"
          onTouchStart={handleTouchStart}
          onTouchMove={handleTouchMove}
          onTouchEnd={handleTouchEnd}
        >
          <div
            className="flex h-full transition-transform duration-300 ease-out"
            style={{ transform: `translateX(-${carouselIndex * 100}%)` }}
          >
            {sortedImages.map((image, index) => (
              <div key={image.id} className="relative flex-shrink-0 w-full h-full">
                <Image
                  src={image.url}
                  alt={image.altText ?? `${productName} — image ${index + 1}`}
                  fill
                  priority={index === 0}
                  sizes="100vw"
                  className="object-cover object-center"
                />
              </div>
            ))}
          </div>

          {carouselIndex > 0 && (
            <button
              type="button"
              onClick={() => setCarouselIndex((p) => p - 1)}
              aria-label="Previous image"
              className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-background/60 text-umber"
            >
              <ChevronLeft className="w-4 h-4" />
            </button>
          )}
          {carouselIndex < sortedImages.length - 1 && (
            <button
              type="button"
              onClick={() => setCarouselIndex((p) => p + 1)}
              aria-label="Next image"
              className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 flex items-center justify-center bg-background/60 text-umber"
            >
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>

        {sortedImages.length > 1 && (
          <div className="flex items-center justify-center gap-1.5 mt-5 pb-2">
            {sortedImages.map((_, index) => (
              <button
                key={sortedImages[index]?.id ?? index}
                type="button"
                onClick={() => setCarouselIndex(index)}
                aria-label={`Go to image ${index + 1}`}
                className={cn(
                  'w-1.5 h-1.5 rounded-full transition-all duration-200',
                  index === carouselIndex
                    ? 'bg-umber scale-125'
                    : 'bg-muted-foreground/40',
                )}
              />
            ))}
          </div>
        )}
      </div>
    </>
  )
}
