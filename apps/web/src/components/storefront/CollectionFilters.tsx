'use client'

import { cn } from '@/lib/utils'
import { FilterAccordion } from './FilterAccordion'
import type { Category } from '@/types'

interface CollectionFiltersProps {
  categories:       Category[]
  activeCategory?:  string
  availableSizes:   string[]
  activeSizes:      string[]
  onCategoryChange: (slug: string | null) => void
  onSizeToggle:     (size: string) => void
}

export function CollectionFilters({
  categories,
  activeCategory,
  availableSizes,
  activeSizes,
  onCategoryChange,
  onSizeToggle,
}: CollectionFiltersProps) {
  return (
    <div className="space-y-0">
      <FilterAccordion title="Categories" defaultOpen={false}>
        <div className="space-y-2 pt-2">
          <button
            type="button"
            onClick={() => onCategoryChange(null)}
            className={cn(
              'block w-full text-left',
              'font-body font-light text-[12px]',
              'transition-colors duration-200',
              !activeCategory
                ? 'text-graphite font-medium'
                : 'text-umber hover:text-graphite',
            )}
          >
            All
          </button>
          {categories.map((cat) => (
            <button
              key={cat.id}
              type="button"
              onClick={() => onCategoryChange(cat.slug)}
              className={cn(
                'block w-full text-left',
                'font-body font-light text-[12px]',
                'transition-colors duration-200',
                activeCategory === cat.slug
                  ? 'text-graphite font-medium'
                  : 'text-umber hover:text-graphite',
              )}
            >
              {cat.name}
            </button>
          ))}
        </div>
      </FilterAccordion>

      <FilterAccordion title="Colour" defaultOpen={false}>
        <p className="font-body text-[11px] text-umber pt-2">
          Filter by colour coming soon
        </p>
      </FilterAccordion>

      <FilterAccordion title="Collection" defaultOpen={false}>
        <p className="font-body text-[11px] text-umber pt-2">
          No sub-collections yet
        </p>
      </FilterAccordion>

      <FilterAccordion title="Size" defaultOpen>
        <div className="space-y-2 pt-2">
          {availableSizes.length > 0 ? (
            availableSizes.map((size) => (
              <label key={size} className="flex items-center gap-2 cursor-pointer">
                <div
                  className={cn(
                    'w-4 h-4 border flex items-center justify-center',
                    'flex-shrink-0 transition-colors duration-200',
                    activeSizes.includes(size)
                      ? 'bg-umber border-umber'
                      : 'bg-transparent border-umber/40',
                  )}
                >
                  {activeSizes.includes(size) && (
                    <svg viewBox="0 0 10 8" className="w-2.5 h-2">
                      <path
                        d="M1 4l2.5 2.5L9 1"
                        stroke="white"
                        strokeWidth="1.5"
                        fill="none"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </div>
                <input
                  type="checkbox"
                  className="sr-only"
                  checked={activeSizes.includes(size)}
                  onChange={() => onSizeToggle(size)}
                />
                <span
                  className={cn(
                    'font-body font-light text-[12px]',
                    activeSizes.includes(size)
                      ? 'text-graphite'
                      : 'text-umber',
                  )}
                >
                  {size}
                </span>
              </label>
            ))
          ) : (
            <p className="font-body text-[11px] text-umber">
              No sizes available
            </p>
          )}
        </div>
      </FilterAccordion>
    </div>
  )
}
