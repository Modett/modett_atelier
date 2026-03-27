'use client'

import React, { useCallback, useEffect, useRef, useState } from 'react'
import { AnimatePresence, motion } from 'framer-motion'
import { cn } from '../../lib/utils'

// ── Types ───────────────────────────────────────────────────────────────

/** Single filter option (e.g. size UK 8, count 15) */
export interface FilterOption {
  /** Option value */
  value: string
  /** Display label */
  label: string
  /** Optional count for this option */
  count?: number
}

/** A group of filters (e.g. SIZE, COLOUR) */
export interface FilterGroup {
  /** Unique key (e.g. "size", "colour") */
  key: string
  /** Display label (e.g. "SIZE", "COLOUR") */
  label: string
  /** Options in this group */
  options: FilterOption[]
  /** Type of filter (checkbox list, or colour/size for future variants) */
  type: 'checkbox' | 'colour' | 'size'
}

/** One active filter chip */
export interface ActiveFilter {
  /** Group key */
  groupKey: string
  /** Option value */
  value: string
  /** Display label for the chip */
  label: string
}

/** Sort dropdown option */
export interface SortOption {
  value: string
  label: string
}

/** Props for CollectionFilters */
export interface CollectionFiltersProps {
  /** Filter groups (Categories, Colour, Collection, Size) */
  filterGroups: FilterGroup[]
  /** Currently active filters */
  activeFilters: ActiveFilter[]
  /** Handler when a filter is toggled */
  onFilterChange: (groupKey: string, value: string) => void
  /** Handler to clear all filters */
  onClearFilters: () => void
  /** Handler to remove a specific active filter */
  onRemoveFilter: (groupKey: string, value: string) => void
  /** Sort options */
  sortOptions: SortOption[]
  /** Currently selected sort */
  selectedSort: string
  /** Sort change handler */
  onSortChange: (value: string) => void
  /** Current grid column count */
  gridColumns: 2 | 3 | 4
  /** Grid column change handler */
  onGridColumnsChange: (columns: 2 | 3 | 4) => void
  /** Whether filters sidebar is visible */
  isFiltersVisible: boolean
  /** Toggle filters visibility */
  onToggleFilters: () => void
  /** Main content (e.g. ProductGrid) rendered beside the sidebar */
  children?: React.ReactNode
  /** Additional className */
  className?: string
}

// ── Icons (inline SVGs) ───────────────────────────────────────────────────

function ChevronLeftIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M15 18l-6-6 6-6" />
    </svg>
  )
}

function ChevronRightIcon({ className }: { className?: string }) {
  return (
    <svg
      width={16}
      height={16}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M9 18l6-6-6-6" />
    </svg>
  )
}

function CloseIcon({ className }: { className?: string }) {
  return (
    <svg
      width={12}
      height={12}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={2}
      strokeLinecap="round"
      className={className}
      aria-hidden
    >
      <path d="M18 6L6 18M6 6l12 12" />
    </svg>
  )
}

function Grid3Icon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="3" y="3" width="6" height="6" rx="0" />
      <rect x="9" y="3" width="6" height="6" rx="0" />
      <rect x="15" y="3" width="6" height="6" rx="0" />
      <rect x="3" y="9" width="6" height="6" rx="0" />
      <rect x="9" y="9" width="6" height="6" rx="0" />
      <rect x="15" y="9" width="6" height="6" rx="0" />
      <rect x="3" y="15" width="6" height="6" rx="0" />
      <rect x="9" y="15" width="6" height="6" rx="0" />
      <rect x="15" y="15" width="6" height="6" rx="0" />
    </svg>
  )
}

function Grid4Icon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <rect x="2" y="2" width="5" height="5" rx="0" />
      <rect x="9" y="2" width="5" height="5" rx="0" />
      <rect x="16" y="2" width="5" height="5" rx="0" />
      <rect x="2" y="9" width="5" height="5" rx="0" />
      <rect x="9" y="9" width="5" height="5" rx="0" />
      <rect x="16" y="9" width="5" height="5" rx="0" />
      <rect x="2" y="16" width="5" height="5" rx="0" />
      <rect x="9" y="16" width="5" height="5" rx="0" />
      <rect x="16" y="16" width="5" height="5" rx="0" />
    </svg>
  )
}

function FilterIcon({ className }: { className?: string }) {
  return (
    <svg
      width={20}
      height={20}
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.5}
      strokeLinecap="round"
      strokeLinejoin="round"
      className={className}
      aria-hidden
    >
      <path d="M22 3H2l8 9.46V19l4 2v-8.54L22 3z" />
    </svg>
  )
}

// ── Checkbox (custom styled, accessible) ──────────────────────────────────

function FilterCheckbox({
  id,
  checked,
  onChange,
  label,
  count,
  disabled,
}: {
  id: string
  checked: boolean
  onChange: (checked: boolean) => void
  label: string
  count?: number
  disabled?: boolean
}) {
  return (
    <label
      htmlFor={id}
      className={cn(
        'flex cursor-pointer items-center gap-2 py-1.5',
        disabled && 'cursor-not-allowed opacity-60'
      )}
    >
      <input
        type="checkbox"
        id={id}
        checked={checked}
        onChange={(e) => onChange(e.target.checked)}
        disabled={disabled}
        className="sr-only"
        aria-label={label}
      />
      <span
        className={cn(
          'pointer-events-none flex h-4 w-4 shrink-0 items-center justify-center rounded-none border transition-colors',
          checked
            ? 'border-deep bg-deep text-background'
            : 'border-muted-foreground bg-transparent'
        )}
        aria-hidden
      >
        {checked && (
          <svg width={12} height={12} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2.5} strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 6L9 17l-5-5" />
          </svg>
        )}
      </span>
      <span className="font-body text-sm font-normal text-foreground">{label}</span>
      {count != null && (
        <span className="font-body text-xs text-muted-foreground">({count})</span>
      )}
    </label>
  )
}

/** Inline accordion-style filter groups (no dependency on Accordion component) */
function FilterGroupsSection({
  filterGroups,
  isFilterChecked,
  onFilterChange,
  onRemoveFilter,
}: {
  filterGroups: FilterGroup[]
  isFilterChecked: (groupKey: string, value: string) => boolean
  onFilterChange: (groupKey: string, value: string) => void
  onRemoveFilter: (groupKey: string, value: string) => void
}) {
  const [openKeys, setOpenKeys] = useState<Set<string>>(() =>
    new Set(filterGroups.map((g) => g.key).filter((k) => k === 'size'))
  )
  const toggle = (key: string) => {
    setOpenKeys((prev) => {
      const next = new Set(prev)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }
  return (
    <nav className="mt-4 flex flex-col gap-0" aria-label="Collection filters">
      {filterGroups.map((group) => {
        const isOpen = openKeys.has(group.key)
        const headerId = `filter-header-${group.key}`
        const regionId = `filter-region-${group.key}`
        return (
          <div
            key={group.key}
            className="border-b border-surface-raised"
          >
            <button
              type="button"
              id={headerId}
              onClick={() => toggle(group.key)}
              className="flex w-full items-center justify-between py-4 md:py-5 font-body text-sm font-normal uppercase tracking-[0.2em] text-foreground cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-highlight"
              aria-expanded={isOpen}
              aria-controls={regionId}
            >
              {group.label}
              <motion.span
                animate={{ rotate: isOpen ? 180 : 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="shrink-0 ml-4 text-foreground"
                aria-hidden
              >
                <svg width={16} height={16} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={1.5} strokeLinecap="round" strokeLinejoin="round">
                  <path d="M6 9l6 6 6-6" />
                </svg>
              </motion.span>
            </button>
            <AnimatePresence initial={false}>
              {isOpen && (
                <motion.div
                  id={regionId}
                  role="region"
                  aria-labelledby={headerId}
                  initial={{ height: 0, opacity: 0 }}
                  animate={{ height: 'auto', opacity: 1 }}
                  exit={{ height: 0, opacity: 0 }}
                  transition={{ duration: 0.3, ease: 'easeInOut' }}
                  className="overflow-hidden"
                >
                  <div className="flex flex-col gap-0.5 pb-5 pt-1">
                    {group.options.map((option) => {
                      const checked = isFilterChecked(group.key, option.value)
                      const id = `filter-${group.key}-${option.value}`
                      return (
                        <FilterCheckbox
                          key={option.value}
                          id={id}
                          checked={checked}
                          onChange={(next) => {
                            if (next) onFilterChange(group.key, option.value)
                            else onRemoveFilter(group.key, option.value)
                          }}
                          label={option.label}
                          count={option.count}
                        />
                      )
                    })}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        )
      })}
    </nav>
  )
}

// ── Component ────────────────────────────────────────────────────────────

/**
 * CollectionFilters — sidebar filter panel with top bar (filter toggle, active chips,
 * sort dropdown, grid column toggle) and accordion filter groups. On mobile, sidebar
 * becomes a left-sliding drawer. Uses design tokens only.
 */
export function CollectionFilters({
  filterGroups,
  activeFilters,
  onFilterChange,
  onClearFilters,
  onRemoveFilter,
  sortOptions,
  selectedSort,
  onSortChange,
  gridColumns,
  onGridColumnsChange,
  isFiltersVisible,
  onToggleFilters,
  children,
  className,
}: CollectionFiltersProps): React.ReactElement {
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const focusTrapRef = useRef<HTMLDivElement>(null)

  const isFilterChecked = useCallback(
    (groupKey: string, value: string) =>
      activeFilters.some((f) => f.groupKey === groupKey && f.value === value),
    [activeFilters]
  )

  useEffect(() => {
    if (!isFiltersVisible) {
      document.body.style.overflow = ''
      return
    }
    const mq = window.matchMedia('(min-width: 768px)')
    if (mq.matches) return
    document.body.style.overflow = 'hidden'
    closeButtonRef.current?.focus()
    return () => {
      document.body.style.overflow = ''
    }
  }, [isFiltersVisible])

  const sidebarContent = (
    <>
      <div className="flex items-center justify-between border-b border-surface-raised pb-3">
        <span className="font-body text-xs font-medium uppercase tracking-[0.15em] text-foreground">
          Filter by
        </span>
        <button
          type="button"
          onClick={onClearFilters}
          className="font-body text-xs text-muted-foreground underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
        >
          Clear Filters
        </button>
      </div>
      <FilterGroupsSection
        filterGroups={filterGroups}
        isFilterChecked={isFilterChecked}
        onFilterChange={onFilterChange}
        onRemoveFilter={onRemoveFilter}
      />
    </>
  )

  return (
    <div className={cn('flex flex-col', className)}>
      {/* Top bar — full width */}
      <div className="flex w-full flex-wrap items-center justify-between gap-3 border-b border-surface-raised py-3">
        <button
          type="button"
          onClick={onToggleFilters}
          className="flex items-center gap-1.5 font-body text-xs uppercase tracking-[0.15em] text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
          aria-label={isFiltersVisible ? 'Hide filters' : 'Show filters'}
          aria-expanded={isFiltersVisible}
        >
          {isFiltersVisible ? (
            <>
              <span className="hidden md:inline">Hide Filters</span>
              <ChevronLeftIcon className="md:ml-0" />
            </>
          ) : (
            <>
              <span className="hidden md:inline">Show Filters</span>
              <FilterIcon className="md:hidden" />
              <ChevronRightIcon className="hidden md:block" />
            </>
          )}
        </button>

        <div className="flex flex-1 flex-wrap items-center justify-center gap-2 md:justify-end">
          {activeFilters.length > 0 && (
            <div className="flex flex-wrap items-center gap-2">
              {activeFilters.map((f) => (
                <span
                  key={`${f.groupKey}-${f.value}`}
                  className="flex items-center gap-1.5 bg-deep px-3 py-1 font-body text-xs uppercase tracking-wide text-background"
                >
                  <span>
                    {f.groupKey.toUpperCase()}: {f.label}
                  </span>
                  <button
                    type="button"
                    onClick={() => onRemoveFilter(f.groupKey, f.value)}
                    className="flex items-center justify-center p-0.5 text-background/90 hover:text-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                    aria-label={`Remove filter ${f.label}`}
                  >
                    <CloseIcon />
                  </button>
                </span>
              ))}
            </div>
          )}

          <div className="flex items-center gap-4">
            <label className="flex items-center gap-2">
              <span className="font-body text-sm text-foreground">Sort by</span>
              <select
                value={selectedSort}
                onChange={(e) => onSortChange(e.target.value)}
                className="border-b border-surface-raised bg-transparent font-body text-sm text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                aria-label="Sort products by"
              >
                {sortOptions.map((opt) => (
                  <option key={opt.value} value={opt.value}>
                    {opt.label}
                  </option>
                ))}
              </select>
            </label>

            {/* Grid toggle — hidden on mobile */}
            <div
              className="hidden items-center gap-1 md:flex"
              role="group"
              aria-label="Grid columns"
            >
              <button
                type="button"
                onClick={() => onGridColumnsChange(3)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
                  gridColumns === 3 ? 'text-foreground' : 'text-muted-foreground/50'
                )}
                aria-label="3 column grid"
                aria-pressed={gridColumns === 3}
              >
                <Grid3Icon />
              </button>
              <button
                type="button"
                onClick={() => onGridColumnsChange(4)}
                className={cn(
                  'flex h-8 w-8 items-center justify-center focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight',
                  gridColumns === 4 ? 'text-foreground' : 'text-muted-foreground/50'
                )}
                aria-label="4 column grid"
                aria-pressed={gridColumns === 4}
              >
                <Grid4Icon />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Desktop: sidebar + main. Mobile: drawer overlay + main */}
      <div className="relative flex flex-1 min-w-0">
        {/* Desktop sidebar — collapsible */}
        <aside
          className={cn(
            'hidden shrink-0 flex-col border-r border-surface-raised bg-background transition-[width] duration-200 md:flex md:w-56',
            !isFiltersVisible && 'md:w-0 md:overflow-hidden md:border-r-0'
          )}
          aria-label="Filter sidebar"
        >
          {isFiltersVisible && (
            <div className="w-56 overflow-y-auto py-4 pr-4">{sidebarContent}</div>
          )}
        </aside>

        {/* Mobile: filter drawer (left) */}
        <AnimatePresence>
          {isFiltersVisible && (
            <>
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="fixed inset-0 z-40 bg-foreground/50 md:hidden"
                onClick={onToggleFilters}
                aria-hidden
              />
              <motion.div
                ref={focusTrapRef}
                role="dialog"
                aria-modal="true"
                aria-label="Filters"
                initial={{ x: '-100%' }}
                animate={{ x: 0 }}
                exit={{ x: '-100%' }}
                transition={{ duration: 0.3, ease: 'easeInOut' }}
                className="fixed left-0 top-0 z-50 flex h-full w-full max-w-[280px] flex-col overflow-y-auto bg-background p-4 md:hidden"
              >
                <div className="flex items-center justify-between border-b border-surface-raised pb-3">
                  <span className="font-body text-xs font-medium uppercase tracking-[0.15em] text-foreground">
                    Filters
                  </span>
                  <button
                    ref={closeButtonRef}
                    type="button"
                    onClick={onToggleFilters}
                    className="flex h-10 w-10 items-center justify-center text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-highlight"
                    aria-label="Close filters"
                  >
                    <CloseIcon className="h-5 w-5" />
                  </button>
                </div>
                <div className="mt-4">{sidebarContent}</div>
              </motion.div>
            </>
          )}
        </AnimatePresence>

        {/* Main content (grid) */}
        <main className="min-w-0 flex-1 py-4 md:pl-6">
          {children}
        </main>
      </div>
    </div>
  )
}

CollectionFilters.displayName = 'CollectionFilters'
