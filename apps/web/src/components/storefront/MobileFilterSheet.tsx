'use client'

import { useEffect, useRef } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { X } from 'lucide-react'
import { cn } from '@/lib/utils'
import { CollectionFilters } from './CollectionFilters'
import type { Category } from '@/types'

interface MobileFilterSheetProps {
  open:             boolean
  onClose:          () => void
  categories:       Category[]
  activeCategory?:  string
  availableSizes:   string[]
  activeSizes:      string[]
  onCategoryChange: (slug: string | null) => void
  onSizeToggle:     (size: string) => void
  onApply:          () => void
  onClear:          () => void
}

export function MobileFilterSheet({
  open,
  onClose,
  categories,
  activeCategory,
  availableSizes,
  activeSizes,
  onCategoryChange,
  onSizeToggle,
  onApply,
  onClear,
}: MobileFilterSheetProps) {
  const panelRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (!open) return
    document.body.style.overflow = 'hidden'
    return () => {
      document.body.style.overflow = ''
    }
  }, [open])

  useEffect(() => {
    if (!open) return
    function handleKeyDown(e: KeyboardEvent) {
      if (e.key === 'Escape') onClose()
    }
    window.addEventListener('keydown', handleKeyDown)
    return () => window.removeEventListener('keydown', handleKeyDown)
  }, [open, onClose])

  const activeCount = activeSizes.length + (activeCategory ? 1 : 0)

  return (
    <AnimatePresence>
      {open && (
        <>
          <motion.div
            key="filter-backdrop"
            role="presentation"
            aria-hidden
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.2 }}
            className="fixed inset-0 z-50 bg-foreground/20"
            onClick={onClose}
          />
          <motion.div
            key="filter-panel"
            ref={panelRef}
            role="dialog"
            aria-modal="true"
            aria-label="Filters"
            initial={{ y: '100%' }}
            animate={{ y: 0 }}
            exit={{ y: '100%' }}
            transition={{ type: 'tween', duration: 0.3, ease: 'easeInOut' }}
            className={cn(
              'fixed bottom-0 left-0 right-0 z-50',
              'max-h-[85vh] overflow-y-auto',
              'bg-background px-5 pt-5 pb-8',
              'rounded-t-2xl',
            )}
          >
            <div className="flex items-center justify-between mb-4">
              <h2 className="font-body font-light text-[13px] uppercase tracking-[0.2em] text-umber">
                Filters
                {activeCount > 0 && (
                  <span className="ml-2 inline-flex items-center justify-center
                                   w-5 h-5 rounded-full bg-umber text-background
                                   text-[10px] font-bold">
                    {activeCount}
                  </span>
                )}
              </h2>
              <button
                type="button"
                onClick={onClose}
                aria-label="Close filters"
                className="text-umber hover:text-ink transition-colors duration-200"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <CollectionFilters
              categories={categories}
              activeCategory={activeCategory}
              availableSizes={availableSizes}
              activeSizes={activeSizes}
              onCategoryChange={(slug) => {
                onCategoryChange(slug)
              }}
              onSizeToggle={onSizeToggle}
            />

            <div className="flex gap-3 mt-6 pt-4 border-t border-muted">
              {activeCount > 0 && (
                <button
                  type="button"
                  onClick={onClear}
                  className={cn(
                    'flex-1 h-11',
                    'border border-umber text-umber',
                    'font-body font-light uppercase tracking-[0.25em] text-[12px]',
                    'rounded-none',
                    'hover:bg-surface-raised transition-colors duration-200',
                  )}
                >
                  Clear All
                </button>
              )}
              <button
                type="button"
                onClick={onApply}
                className={cn(
                  'flex-1 h-11',
                  'bg-deep text-background',
                  'font-body font-light uppercase tracking-[0.25em] text-[12px]',
                  'rounded-none',
                  'hover:bg-ink transition-colors duration-200',
                )}
              >
                Apply Filters
              </button>
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  )
}
