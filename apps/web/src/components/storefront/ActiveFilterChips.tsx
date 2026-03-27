'use client'

import { X } from 'lucide-react'
import { cn } from '@/lib/utils'

interface ActiveFilterChipsProps {
  activeSizes:      string[]
  activeCategory?:  string
  onRemoveSize:     (size: string) => void
  onRemoveCategory: () => void
}

export function ActiveFilterChips({
  activeSizes,
  activeCategory,
  onRemoveSize,
  onRemoveCategory,
}: ActiveFilterChipsProps) {
  const hasChips = activeSizes.length > 0 || !!activeCategory

  if (!hasChips) return null

  return (
    <div className="flex items-center gap-2 flex-wrap">
      {activeCategory && (
        <Chip
          label={`CATEGORY: ${activeCategory}`}
          onRemove={onRemoveCategory}
        />
      )}
      {activeSizes.map((size) => (
        <Chip
          key={size}
          label={`SIZE: ${size}`}
          onRemove={() => onRemoveSize(size)}
        />
      ))}
    </div>
  )
}

function Chip({
  label,
  onRemove,
}: {
  label:    string
  onRemove: () => void
}) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-1 px-2.5 py-1',
        'bg-surface-raised border border-muted-foreground/30',
        'font-body text-[11px] text-umber',
      )}
    >
      {label}
      <button
        type="button"
        onClick={onRemove}
        aria-label={`Remove filter: ${label}`}
        className="hover:text-ink transition-colors duration-200"
      >
        <X className="w-3 h-3" />
      </button>
    </span>
  )
}
