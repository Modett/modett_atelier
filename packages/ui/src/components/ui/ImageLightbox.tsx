'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'

/** Single image entry for the lightbox (full URL and alt) */
export interface ImageLightboxImage {
  /** Full URL of the image (including size suffix if any) */
  url: string
  /** Alt text for accessibility */
  altText: string
}

/** Fullscreen zoom/pan lightbox overlay */
export interface ImageLightboxProps {
  /** Array of image URLs (full resolution) */
  images: ImageLightboxImage[]
  /** Index of the initially opened image */
  initialIndex: number
  /** Whether the lightbox is open */
  isOpen: boolean
  /** Close handler */
  onClose: () => void
  /** Additional className for the overlay */
  className?: string
}

const MIN_ZOOM = 1
const MAX_ZOOM = 3
const CLICK_ZOOM_LEVEL = 2

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path d="M15 19l-7-7 7-7" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width={24}
      height={24}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      className={className}
      aria-hidden
    >
      <path d="M9 5l7 7-7 7" />
    </svg>
  )
}

export function ImageLightbox({
  images,
  initialIndex,
  isOpen,
  onClose,
  className,
}: ImageLightboxProps) {
  const [currentIndex, setCurrentIndex] = useState(initialIndex)
  const [scale, setScale] = useState(MIN_ZOOM)
  const [position, setPosition] = useState({ x: 0, y: 0 })
  const [isDragging, setIsDragging] = useState(false)
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 })
  const didMoveRef = useRef(false)
  const containerRef = useRef<HTMLDivElement>(null)
  const imageRef = useRef<HTMLImageElement>(null)
  const lastPointerRef = useRef<{ x: number; y: number } | null>(null)
  const initialPinchDistanceRef = useRef<number | null>(null)
  const initialScaleRef = useRef(1)
  const focusTrapRef = useRef<HTMLDivElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)

  const total = images.length
  const hasPrev = currentIndex > 0
  const hasNext = currentIndex < total - 1

  const goPrev = useCallback(() => {
    if (hasPrev) {
      setCurrentIndex((i) => i - 1)
      setScale(MIN_ZOOM)
      setPosition({ x: 0, y: 0 })
    }
  }, [hasPrev])

  const goNext = useCallback(() => {
    if (hasNext) {
      setCurrentIndex((i) => i + 1)
      setScale(MIN_ZOOM)
      setPosition({ x: 0, y: 0 })
    }
  }, [hasNext])

  useEffect(() => {
    if (isOpen) {
      setCurrentIndex(initialIndex)
      setScale(MIN_ZOOM)
      setPosition({ x: 0, y: 0 })
      document.body.style.overflow = 'hidden'
      closeButtonRef.current?.focus()
    } else {
      document.body.style.overflow = ''
    }
    return () => {
      document.body.style.overflow = ''
    }
  }, [isOpen, initialIndex])

  useEffect(() => {
    if (!isOpen) return
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        onClose()
        return
      }
      if (e.key === 'ArrowLeft') {
        goPrev()
        return
      }
      if (e.key === 'ArrowRight') {
        goNext()
        return
      }
      if (e.key === 'Tab') {
        const trap = focusTrapRef.current
        if (!trap) return
        const focusables = trap.querySelectorAll<HTMLElement>(
          'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
        )
        const list = Array.from(focusables)
        const first = list[0]
        const last = list[list.length - 1]
        if (e.shiftKey) {
          if (document.activeElement === first) {
            e.preventDefault()
            last?.focus()
          }
        } else {
          if (document.activeElement === last) {
            e.preventDefault()
            first?.focus()
          }
        }
      }
    }
    document.addEventListener('keydown', handleKeyDown)
    return () => document.removeEventListener('keydown', handleKeyDown)
  }, [isOpen, onClose, goPrev, goNext])

  const handleClose = useCallback(() => {
    onClose()
  }, [onClose])

  const handleImageClick = useCallback(() => {
    if (didMoveRef.current) return
    setScale((s) => (s > MIN_ZOOM ? MIN_ZOOM : CLICK_ZOOM_LEVEL))
    setPosition({ x: 0, y: 0 })
  }, [])

  const handleWheel = useCallback(
    (e: React.WheelEvent) => {
      e.preventDefault()
      const delta = e.deltaY > 0 ? -0.15 : 0.15
      setScale((s) => Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, s + delta)))
    },
    []
  )

  const handlePointerDown = useCallback(
    (e: React.PointerEvent) => {
      didMoveRef.current = false
      if (scale <= MIN_ZOOM) return
      e.preventDefault()
      setIsDragging(true)
      setDragStart({ x: e.clientX - position.x, y: e.clientY - position.y })
      lastPointerRef.current = { x: e.clientX, y: e.clientY }
    },
    [scale, position]
  )

  const handlePointerMove = useCallback(
    (e: React.PointerEvent) => {
      if (!isDragging || scale <= MIN_ZOOM) return
      didMoveRef.current = true
      setPosition({
        x: e.clientX - dragStart.x,
        y: e.clientY - dragStart.y,
      })
    },
    [isDragging, scale, dragStart]
  )

  const handlePointerUp = useCallback(() => {
    setIsDragging(false)
    lastPointerRef.current = null
  }, [])

  const handleTouchStart = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2) {
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        initialPinchDistanceRef.current = d
        initialScaleRef.current = scale
      }
    },
    [scale]
  )

  const handleTouchMove = useCallback(
    (e: React.TouchEvent) => {
      if (e.touches.length === 2 && initialPinchDistanceRef.current !== null) {
        e.preventDefault()
        const d = Math.hypot(
          e.touches[0].clientX - e.touches[1].clientX,
          e.touches[0].clientY - e.touches[1].clientY
        )
        const ratio = d / initialPinchDistanceRef.current
        setScale((s) =>
          Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, initialScaleRef.current * ratio))
        )
      }
    },
    []
  )

  const handleTouchEnd = useCallback(() => {
    initialPinchDistanceRef.current = null
  }, [])

  const currentImage = images[currentIndex]
  if (!currentImage) return null

  return (
    <AnimatePresence>
      {isOpen && (
        <motion.div
          ref={focusTrapRef}
          role="dialog"
          aria-modal="true"
          aria-label="Image viewer"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.3 }}
          className={cn(
            'fixed inset-0 z-50 flex items-center justify-center bg-ink/95',
            className
          )}
          onWheel={handleWheel}
          style={{ touchAction: scale > MIN_ZOOM ? 'none' : undefined }}
        >
          {/* Preload adjacent images */}
          {currentIndex > 0 && (
            <img
              src={images[currentIndex - 1]?.url}
              alt=""
              className="hidden"
              fetchPriority="high"
            />
          )}
          {currentIndex < total - 1 && (
            <img
              src={images[currentIndex + 1]?.url}
              alt=""
              className="hidden"
              fetchPriority="high"
            />
          )}

          {/* Counter — top-left */}
          <div
            className="absolute left-4 top-4 font-body text-sm font-light tracking-wider text-background"
            aria-live="polite"
            aria-atomic="true"
          >
            {currentIndex + 1} / {total}
          </div>

          {/* Close — top-right */}
          <button
            ref={closeButtonRef}
            type="button"
            onClick={handleClose}
            className="absolute right-4 top-4 flex h-10 w-10 items-center justify-center rounded-full bg-ink/20 text-background transition-colors duration-200 hover:bg-ink/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight"
            aria-label="Close image viewer"
          >
            <CloseIcon />
          </button>

          {/* Nav arrows */}
          {hasPrev && (
            <button
              type="button"
              onClick={goPrev}
              className="absolute left-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/20 text-background transition-colors duration-200 hover:bg-ink/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight"
              aria-label="Previous image"
            >
              <ChevronLeftIcon />
            </button>
          )}
          {hasNext && (
            <button
              type="button"
              onClick={goNext}
              className="absolute right-4 top-1/2 flex h-10 w-10 -translate-y-1/2 items-center justify-center rounded-full bg-ink/20 text-background transition-colors duration-200 hover:bg-ink/40 focus:outline-none focus:ring-2 focus:ring-inset focus:ring-highlight"
              aria-label="Next image"
            >
              <ChevronRightIcon />
            </button>
          )}

          {/* Image container — centered, zoom/pan */}
          <div
            ref={containerRef}
            className="flex max-h-[90vh] max-w-[90vw] flex-1 items-center justify-center overflow-hidden"
            onPointerDown={handlePointerDown}
            onPointerMove={handlePointerMove}
            onPointerUp={handlePointerUp}
            onPointerLeave={handlePointerUp}
            onTouchStart={handleTouchStart}
            onTouchMove={handleTouchMove}
            onTouchEnd={handleTouchEnd}
            onTouchCancel={handleTouchEnd}
            style={{ cursor: scale > MIN_ZOOM ? (isDragging ? 'grabbing' : 'grab') : 'zoom-in' }}
          >
            <motion.img
              ref={imageRef}
              key={currentIndex}
              src={currentImage.url}
              alt={currentImage.altText}
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              transition={{ duration: 0.2 }}
              className="max-h-[90vh] max-w-[90vw] select-none object-contain"
              draggable={false}
              style={{
                transform: `scale(${scale}) translate(${position.x}px, ${position.y}px)`,
              }}
              onClick={handleImageClick}
            />
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
