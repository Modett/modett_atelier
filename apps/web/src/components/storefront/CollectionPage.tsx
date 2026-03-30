'use client'

import { useState, useMemo, useCallback } from 'react'
import { useRouter, useSearchParams, usePathname } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight, SlidersHorizontal } from 'lucide-react'
import type { ProductCardProps } from '@modett/ui'
import { mapProductSummaryToCardProps } from '@/lib/mapProductToCardProps'
import { cn } from '@/lib/utils'
import { useProducts, flattenProducts } from '@/hooks/useProducts'
import { useCategories } from '@/hooks/useCategories'
import { useSession } from '@/hooks/useSession'
import { useAddToCart } from '@/hooks/useCartMutations'
import { useWishlist, useToggleWishlist } from '@/hooks/useWishlist'
import { useAuthPanel } from '@/components/providers/AuthProvider'
import { ProductGrid } from './ProductGrid'
import { CollectionFilters } from './CollectionFilters'
import { ActiveFilterChips } from './ActiveFilterChips'
import { MobileFilterSheet } from './MobileFilterSheet'

interface CollectionPageProps {
  initialCategory?: string
  initialSort?:     string
  initialSizes?:    string[]
  pageTitle:        string
}

export function CollectionPage({
  initialCategory,
  initialSort,
  initialSizes = [],
  pageTitle,
}: CollectionPageProps) {
  const router       = useRouter()
  const searchParams = useSearchParams()
  const pathname     = usePathname()

  const activeCategory = searchParams.get('category') ?? initialCategory
  const activeSort     = searchParams.get('sort') ?? initialSort
  const activeSizes    = (
    searchParams.get('size') ?? initialSizes.join(',')
  )
    .split(',')
    .filter(Boolean)

  const [showFilters, setShowFilters]             = useState(true)
  const [gridCols, setGridCols]                   = useState<2 | 3>(3)
  const [mobileFiltersOpen, setMobileFiltersOpen] = useState(false)
  const [pendingQuickAddProductIds, setPendingQuickAddProductIds] = useState(
    () => new Set<string>(),
  )

  const {
    data,
    fetchNextPage,
    hasNextPage,
    isFetchingNextPage,
    isLoading,
    isError,
  } = useProducts({
    category: activeCategory ?? undefined,
    sort: activeSort as 'newest' | 'price-asc' | 'price-desc' | undefined,
    limit: 24,
  })

  const { data: categories }    = useCategories()
  const { isLoggedIn }          = useSession()
  const { openPanel }           = useAuthPanel()
  const { data: wishlistItems } = useWishlist()
  const toggleWishlist          = useToggleWishlist()
  const addToCart               = useAddToCart()

  const allProducts = flattenProducts(data)
  const total       = data?.pages[0]?.total ?? 0

  const availableSizes = useMemo(() => {
    const sizeSet = new Set<string>()
    for (const p of allProducts) {
      for (const v of p.variants ?? []) {
        sizeSet.add(v.size)
      }
    }
    return Array.from(sizeSet).sort(ukSizeComparator)
  }, [allProducts])

  const products = useMemo(() => {
    if (activeSizes.length === 0) return allProducts
    return allProducts.filter((p) =>
      (p.variants ?? []).some((v) => activeSizes.includes(v.size)),
    )
  }, [allProducts, activeSizes])

  const wishlistIds = useMemo(
    () => new Set(wishlistItems?.map((item) => item.productId) ?? []),
    [wishlistItems],
  )

  const handleWishlistToggle = useCallback(
    (productId: string) => {
      if (!isLoggedIn) {
        openPanel()
        return
      }
      toggleWishlist.mutate(productId)
    },
    [isLoggedIn, openPanel, toggleWishlist],
  )

  const handleCardClick = useCallback(
    (slug: string) => {
      router.push(`/products/${slug}`)
    },
    [router],
  )

  const handleQuickAddToCart = useCallback(
    (productId: string, colourValue: string, sizeValue: string) => {
      const product = allProducts.find((p) => p.id === productId)
      if (!product) return
      const variant = product.variants?.find(
        (v) => v.color === colourValue && v.size === sizeValue,
      )
      if (!variant) return

      setPendingQuickAddProductIds((prev) => {
        const next = new Set(prev)
        next.add(productId)
        return next
      })
      addToCart.mutate(
        { variantId: variant.variantId, qty: 1 },
        {
          onSettled: () => {
            setPendingQuickAddProductIds((prev) => {
              const next = new Set(prev)
              next.delete(productId)
              return next
            })
          },
        },
      )
    },
    [allProducts, addToCart],
  )

  const cardProps: ProductCardProps[] = useMemo(
    () =>
      products.map((p) => mapProductSummaryToCardProps(p, wishlistIds)),
    [products, wishlistIds],
  )

  function updateURL(updates: Record<string, string | null>) {
    const params = new URLSearchParams(searchParams.toString())
    Object.entries(updates).forEach(([key, value]) => {
      if (value === null || value === '') {
        params.delete(key)
      } else {
        params.set(key, value)
      }
    })
    params.delete('page')
    const qs = params.toString()
    router.push(qs ? `${pathname}?${qs}` : pathname, { scroll: false })
  }

  function clearAllFilters() {
    router.push(pathname, { scroll: false })
  }

  const hasActiveFilters = !!(
    activeCategory ||
    activeSizes.length > 0 ||
    (activeSort && activeSort !== '')
  )

  return (
    <div className="min-h-screen bg-background">

      {/* Breadcrumb */}
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-4">
        <nav aria-label="Breadcrumb">
          <ol className="flex items-center gap-1.5">
            <li>
              <Link
                href="/"
                className="font-body font-light text-[11px] uppercase tracking-[0.15em]
                           text-muted-foreground hover:text-umber transition-colors duration-200"
              >
                Home
              </Link>
            </li>
            <li className="font-body text-[11px] text-muted-foreground">/</li>
            <li>
              <Link
                href="/collections"
                className={cn(
                  'font-body font-light text-[11px] uppercase tracking-[0.15em]',
                  'transition-colors duration-200',
                  activeCategory
                    ? 'text-muted-foreground hover:text-umber'
                    : 'text-umber',
                )}
              >
                Collection
              </Link>
            </li>
            {activeCategory && (
              <>
                <li className="font-body text-[11px] text-muted-foreground">
                  /
                </li>
                <li className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber">
                  {activeCategory}
                </li>
              </>
            )}
          </ol>
        </nav>
      </div>

      {/* Page title */}
      <div className="text-center pb-6 md:pb-8 px-5">
        <h1 className="font-display font-bold text-[28px] md:text-[36px] text-umber leading-tight">
          {pageTitle}
        </h1>
      </div>

      {/* Toolbar */}
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8">
        <div className="flex items-center justify-between py-3 border-y border-muted mb-0">

          {/* Left: filter toggles + chips */}
          <div className="flex items-center gap-3 flex-wrap">
            <button
              type="button"
              onClick={() => setShowFilters((p) => !p)}
              className="hidden md:flex items-center gap-1.5
                         font-body font-light text-[11px]
                         uppercase tracking-[0.2em] text-umber
                         hover:text-ink transition-colors duration-200"
            >
              {showFilters ? (
                <>
                  <ChevronLeft className="w-3 h-3" />
                  Hide Filters
                </>
              ) : (
                <>
                  Show Filters
                  <ChevronRight className="w-3 h-3" />
                </>
              )}
            </button>

            <button
              type="button"
              onClick={() => setMobileFiltersOpen(true)}
              className="md:hidden flex items-center gap-1.5
                         font-body font-light text-[11px]
                         uppercase tracking-[0.2em] text-umber"
            >
              <SlidersHorizontal className="w-4 h-4" />
              Filters
              {(activeSizes.length > 0 || activeCategory) && (
                <span className="ml-1 w-4 h-4 rounded-full bg-umber
                                 text-background text-[10px] font-bold
                                 flex items-center justify-center">
                  {activeSizes.length + (activeCategory ? 1 : 0)}
                </span>
              )}
            </button>

            <ActiveFilterChips
              activeSizes={activeSizes}
              activeCategory={activeCategory}
              onRemoveSize={(size) => {
                const newSizes = activeSizes.filter((s) => s !== size)
                updateURL({ size: newSizes.join(',') || null })
              }}
              onRemoveCategory={() => updateURL({ category: null })}
            />

            {hasActiveFilters && (
              <span className="font-body font-light text-[11px] text-muted-foreground">
                FILTER BY:{' '}
                <button
                  type="button"
                  onClick={clearAllFilters}
                  className="text-umber hover:text-ink underline underline-offset-2
                             transition-colors duration-200"
                >
                  Clear Filters
                </button>
              </span>
            )}
          </div>

          {/* Right: sort + grid toggle */}
          <div className="flex items-center gap-4">
            <div className="flex items-center gap-2">
              <span className="font-body font-light text-[11px]
                               text-muted-foreground uppercase tracking-[0.15em]
                               hidden md:block">
                Sort By:
              </span>
              <select
                value={activeSort ?? ''}
                onChange={(e) =>
                  updateURL({ sort: e.target.value || null })
                }
                className="bg-transparent border-0 outline-none
                           font-body font-light text-[11px]
                           uppercase tracking-[0.2em] text-umber
                           cursor-pointer appearance-none pr-4"
              >
                <option value="">Select...</option>
                <option value="newest">Newest</option>
                <option value="price-asc">Price: Low to High</option>
                <option value="price-desc">Price: High to Low</option>
              </select>
            </div>

            <div className="hidden md:flex items-center gap-1">
              <button
                type="button"
                onClick={() => setGridCols(3)}
                aria-label="3-column grid"
                className={cn(
                  'p-1 transition-colors duration-200',
                  gridCols === 3 ? 'text-umber' : 'text-muted-foreground',
                )}
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <rect x="0" y="0" width="4" height="16" rx="1" />
                  <rect x="6" y="0" width="4" height="16" rx="1" />
                  <rect x="12" y="0" width="4" height="16" rx="1" />
                </svg>
              </button>
              <button
                type="button"
                onClick={() => setGridCols(2)}
                aria-label="2-column grid"
                className={cn(
                  'p-1 transition-colors duration-200',
                  gridCols === 2 ? 'text-umber' : 'text-muted-foreground',
                )}
              >
                <svg viewBox="0 0 16 16" className="w-4 h-4" fill="currentColor">
                  <rect x="0" y="0" width="6.5" height="16" rx="1" />
                  <rect x="9.5" y="0" width="6.5" height="16" rx="1" />
                </svg>
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Main content: sidebar + grid */}
      <div className="max-w-page mx-auto px-4 md:px-6 lg:px-8 py-6">
        <div className={cn('flex gap-8', showFilters ? 'items-start' : '')}>

          {showFilters && (
            <aside className="hidden md:block flex-shrink-0 w-44">
              <CollectionFilters
                categories={categories ?? []}
                activeCategory={activeCategory}
                availableSizes={availableSizes}
                activeSizes={activeSizes}
                onCategoryChange={(slug) =>
                  updateURL({ category: slug ?? null })
                }
                onSizeToggle={(size) => {
                  const newSizes = activeSizes.includes(size)
                    ? activeSizes.filter((s) => s !== size)
                    : [...activeSizes, size]
                  updateURL({ size: newSizes.join(',') || null })
                }}
              />
            </aside>
          )}

          <div className="flex-1 min-w-0">
            {isError ? (
              <div className="text-center py-20">
                <p className="font-body text-[14px] text-muted-foreground mb-4">
                  Something went wrong. Please try again.
                </p>
                <button
                  type="button"
                  onClick={() => window.location.reload()}
                  className="font-body font-light text-[12px] uppercase tracking-[0.2em]
                             text-umber underline underline-offset-2"
                >
                  Refresh page
                </button>
              </div>
            ) : (
              <>
                <ProductGrid
                  products={cardProps.map((p) => ({
                    ...p,
                    onWishlistToggle: handleWishlistToggle,
                    onCardClick: handleCardClick,
                    onQuickAddToCart: handleQuickAddToCart,
                    isAddingToCart: pendingQuickAddProductIds.has(p.id),
                  }))}
                  isLoading={isLoading}
                  gridCols={gridCols}
                />

                {!isLoading && products.length > 0 && (
                  <div className="text-center mt-12">
                    <p className="font-body font-light text-[12px] text-muted-foreground mb-6">
                      1-{products.length} of {total} items
                    </p>
                    {hasNextPage && (
                      <button
                        type="button"
                        onClick={() => fetchNextPage()}
                        disabled={isFetchingNextPage}
                        className={cn(
                          'h-12 px-16',
                          'bg-deep text-background',
                          'font-body font-light uppercase',
                          'tracking-[0.25em] text-[12px]',
                          'rounded-none',
                          'hover:bg-ink transition-colors duration-200',
                          'disabled:opacity-40 disabled:cursor-not-allowed',
                        )}
                      >
                        {isFetchingNextPage ? 'Loading...' : 'View 12 More'}
                      </button>
                    )}
                  </div>
                )}

                {!isLoading && products.length === 0 && (
                  <div className="text-center py-20">
                    <p className="font-body text-[14px] text-muted-foreground">
                      No products found in this category.
                    </p>
                  </div>
                )}
              </>
            )}
          </div>
        </div>
      </div>

      <MobileFilterSheet
        open={mobileFiltersOpen}
        onClose={() => setMobileFiltersOpen(false)}
        categories={categories ?? []}
        activeCategory={activeCategory}
        availableSizes={availableSizes}
        activeSizes={activeSizes}
        onCategoryChange={(slug) => {
          updateURL({ category: slug ?? null })
        }}
        onSizeToggle={(size) => {
          const newSizes = activeSizes.includes(size)
            ? activeSizes.filter((s) => s !== size)
            : [...activeSizes, size]
          updateURL({ size: newSizes.join(',') || null })
        }}
        onApply={() => setMobileFiltersOpen(false)}
        onClear={() => {
          clearAllFilters()
          setMobileFiltersOpen(false)
        }}
      />
    </div>
  )
}

function parseUKSizeNumber(size: string): number {
  const match = size.match(/\d+/)
  return match ? parseInt(match[0], 10) : Infinity
}

function ukSizeComparator(a: string, b: string): number {
  return parseUKSizeNumber(a) - parseUKSizeNumber(b)
}
