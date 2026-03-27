'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { motion, useMotionValue, animate } from 'framer-motion'
import { cn } from '../../lib/utils'
import { ImageLightbox, type ImageLightboxImage } from './ImageLightbox'

/** Product image from the API for gallery display */
export interface ProductImage {
  /** Unique image ID */
  id: string
  /** Base URL from the API (variant suffix appended by the component) */
  url: string
  /** Alt text for accessibility */
  altText: string
  /** Sort order for sequencing */
  sortOrder: number
}

/** Two-column desktop grid + mobile carousel gallery with lightbox */
export interface ProductImageGalleryProps {
  /** Array of product images from the API */
  images: ProductImage[]
  /** Product display name — used for alt text fallback */
  productName: string
  /** Callback when an image is clicked — parent may track analytics */
  onImageClick?: (imageId: string, index: number) => void
  /** Image URL suffix for the grid size (default: '-full.webp') */
  imageSuffix?: string
  /** Additional className */
  className?: string
}

function GalleryImage({
  image,
  index,
  productName,
  imageSuffix,
  onSelect,
  className,
}: {
  image: ProductImage
  index: number
  productName: string
  imageSuffix: string
  onSelect: () => void
  className?: string
}) {
  const [loaded, setLoaded] = useState(false)
  const src = `${image.url}${imageSuffix}`

  return (
    <button
      type="button"
      onClick={onSelect}
      className={cn(
        'group relative overflow-hidden cursor-zoom-in',
        className
      )}
      aria-label={`View ${image.altText || productName} fullscreen`}
    >
      {!loaded && (
        <div
          className="absolute inset-0 bg-surface-raised animate-pulse"
          aria-hidden
        />
      )}
      <img
        src={src}
        alt={image.altText || `${productName} - Image ${index + 1}`}
        className={cn(
          'w-full h-auto object-cover transition-transform duration-500 ease-out',
          loaded ? 'opacity-100' : 'opacity-0',
          'group-hover:scale-[1.02]'
        )}
        loading={index < 2 ? 'eager' : 'lazy'}
        decoding="async"
        onLoad={() => setLoaded(true)}
      />
    </button>
  )
}

export function ProductImageGallery({
  images,
  productName,
  onImageClick,
  imageSuffix = '-full.webp',
  className,
}: ProductImageGalleryProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
  const [lightboxIndex, setLightboxIndex] = useState(0)
  const [carouselIndex, setCarouselIndex] = useState(0)
  const [containerWidth, setContainerWidth] = useState(320)
  const carouselRef = useRef<HTMLDivElement>(null)
  const x = useMotionValue(0)

  const sortedImages = [...images].sort((a, b) => a.sortOrder - b.sortOrder)

  useEffect(() => {
    const el = carouselRef.current
    if (!el) return
    const updateWidth = () => setContainerWidth(el.offsetWidth)
    updateWidth()
    const ro = new ResizeObserver(updateWidth)
    ro.observe(el)
    return () => ro.disconnect()
  }, [])

  useEffect(() => {
    animate(x, -carouselIndex * containerWidth, {
      type: 'spring',
      stiffness: 300,
      damping: 30,
    })
  }, [carouselIndex, containerWidth, x])

  const handleImageClick = useCallback(
    (imageId: string, index: number) => {
      setLightboxIndex(index)
      setLightboxOpen(true)
      onImageClick?.(imageId, index)
    },
    [onImageClick]
  )

  const lightboxImages: ImageLightboxImage[] = sortedImages.map((img) => ({
    url: `${img.url}${imageSuffix}`,
    altText: img.altText || productName,
  }))

  if (sortedImages.length === 0) return null

  return (
    <>
      {/* Mobile: horizontal swipeable carousel */}
      <div className="md:hidden">
        <div className="overflow-hidden" ref={carouselRef}>
          <motion.div
            className="flex"
            style={{ x }}
            drag="x"
            dragConstraints={{
              left: -(sortedImages.length - 1) * containerWidth,
              right: 0,
            }}
            dragElastic={0.2}
            onDragEnd={(_, info) => {
              const width = containerWidth
              const currentX = x.get()
              const index = Math.round(-currentX / width)
              const clamped = Math.max(
                0,
                Math.min(index, sortedImages.length - 1)
              )
              setCarouselIndex(clamped)
            }}
          >
            {sortedImages.map((image, index) => (
              <div
                key={image.id}
                className="w-full shrink-0 aspect-[3/4] cursor-zoom-in"
                style={{ minWidth: containerWidth, width: containerWidth }}
                onClick={() => handleImageClick(image.id, index)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    handleImageClick(image.id, index)
                  }
                }}
                role="button"
                tabIndex={0}
                aria-label={`View ${image.altText || productName} fullscreen`}
              >
                <img
                  src={`${image.url}${imageSuffix}`}
                  alt={image.altText || `${productName} - Image ${index + 1}`}
                  className="h-full w-full object-cover"
                  loading={index === 0 ? 'eager' : 'lazy'}
                  decoding="async"
                />
              </div>
            ))}
          </motion.div>
        </div>

        {/* Dot indicators */}
        <div className="mt-3 flex justify-center gap-2">
          {sortedImages.map((_, index) => (
            <button
              key={sortedImages[index]?.id ?? index}
              type="button"
              className={cn(
                'h-1.5 rounded-full transition-all duration-300',
                carouselIndex === index
                  ? 'w-6 bg-ink'
                  : 'w-1.5 bg-muted-foreground/40'
              )}
              onClick={() => setCarouselIndex(index)}
              aria-label={`Go to image ${index + 1}`}
            />
          ))}
        </div>
      </div>

      {/* Desktop: 2-column grid */}
      <div className={cn('hidden md:grid md:grid-cols-2 md:gap-1', className)}>
        {sortedImages.map((image, index) => (
          <GalleryImage
            key={image.id}
            image={image}
            index={index}
            productName={productName}
            imageSuffix={imageSuffix}
            onSelect={() => handleImageClick(image.id, index)}
          />
        ))}
      </div>

      <ImageLightbox
        images={lightboxImages}
        initialIndex={lightboxIndex}
        isOpen={lightboxOpen}
        onClose={() => setLightboxOpen(false)}
      />
    </>
  )
}
