'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import { Camera, ChevronLeft, ChevronRight, Plus } from 'lucide-react'
import { toast } from 'sonner'
import { Card, CardContent } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog'
import { CategoryManagerSheet } from '@/components/admin/CategoryManagerSheet'
import {
  useAdminProductsList,
  useAdminCategories,
  useDeleteProduct,
} from '@/hooks/useAdminCatalog'
import type { AdminProductListItem } from '@modett/types'
import { productImageAdminThumbCandidates } from '@/lib/productImageUrl'

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function ProductThumb({ url }: { url: string | null }) {
  const candidates = useMemo(
    () => (url == null ? [] : productImageAdminThumbCandidates(url)),
    [url],
  )
  const [i, setI] = useState(0)

  useEffect(() => {
    setI(0)
  }, [url])

  if (url == null || i >= candidates.length) {
    return (
      <div className="flex h-12 w-12 items-center justify-center rounded-md bg-gray-100 text-gray-400">
        <Camera className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="relative h-12 w-12 overflow-hidden rounded-md bg-gray-100">
      <Image
        src={candidates[i]!}
        alt=""
        fill
        className="object-cover"
        sizes="48px"
        unoptimized
        onError={() => setI((x) => x + 1)}
      />
    </div>
  )
}

export default function AdminProductsPage() {
  const router = useRouter()
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [categoryFilter, setCategoryFilter] = useState<string>('ALL')
  const [includeInactive, setIncludeInactive] = useState(false)
  const [page, setPage] = useState(1)
  const [showCategoryManager, setShowCategoryManager] = useState(false)
  const [deleteTarget, setDeleteTarget] = useState<AdminProductListItem | null>(null)

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, categoryFilter, includeInactive])

  const { data, isLoading } = useAdminProductsList({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
    categoryId: categoryFilter === 'ALL' ? undefined : categoryFilter,
    includeInactive,
  })
  const { data: categories = [] } = useAdminCategories()
  const deleteMut = useDeleteProduct()

  const totalPages = data ? data.totalPages : 0
  const hasFilters =
    Boolean(debouncedSearch.trim()) ||
    categoryFilter !== 'ALL' ||
    includeInactive

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold text-gray-900">Products</h1>
          <p className="mt-1 text-sm text-gray-500">Manage catalog and merchandising</p>
        </div>
        <Button onClick={() => router.push('/admin/products/new')}>
          <Plus className="mr-2 h-4 w-4" />
          New product
        </Button>
      </div>

      <Card>
        <CardContent className="space-y-4 p-4">
          <div className="flex flex-col gap-3 lg:flex-row lg:flex-wrap lg:items-end">
            <div className="min-w-[200px] flex-1">
              <label htmlFor="product-search" className="sr-only">
                Search
              </label>
              <input
                id="product-search"
                type="search"
                placeholder="Search name or product code…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                className="w-full rounded-lg border border-gray-200 px-3 py-2 text-sm focus:ring-2 focus:ring-gray-200 focus:outline-none"
              />
            </div>
            <div className="w-full min-w-[160px] sm:w-48">
              <Select
                value={categoryFilter}
                onValueChange={(v) => setCategoryFilter(v ?? 'ALL')}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Category" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="ALL">All categories</SelectItem>
                  {categories.map((c) => (
                    <SelectItem key={c.id} value={c.id}>
                      {c.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <label className="flex cursor-pointer items-center gap-2 text-sm text-gray-700">
              <input
                type="checkbox"
                checked={includeInactive}
                onChange={(e) => setIncludeInactive(e.target.checked)}
                className="rounded border-gray-300"
              />
              Show inactive
            </label>
            <Button
              type="button"
              variant="outline"
              onClick={() => setShowCategoryManager(true)}
            >
              Manage categories
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="p-0">
          {isLoading ? (
            <div className="space-y-3 p-6">
              {Array.from({ length: 8 }).map((_, i) => (
                <Skeleton key={i} className="h-12 w-full" />
              ))}
            </div>
          ) : !data?.products.length ? (
            <div className="p-12 text-center">
              <p className="text-gray-600">No products found.</p>
              {hasFilters ? (
                <p className="mt-2 text-sm text-gray-500">
                  Try adjusting your search or filters.
                </p>
              ) : null}
              <Button
                className="mt-4"
                onClick={() => router.push('/admin/products/new')}
              >
                Create your first product
              </Button>
            </div>
          ) : (
            <>
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead className="w-14">Image</TableHead>
                    <TableHead>Product</TableHead>
                    <TableHead>Category</TableHead>
                    <TableHead>Variants</TableHead>
                    <TableHead>Prices</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead className="text-right">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {data.products.map((product) => (
                    <TableRow key={product.id}>
                      <TableCell>
                        <ProductThumb url={product.keyImageUrl} />
                      </TableCell>
                      <TableCell>
                        <div className="font-medium text-gray-900">
                          {product.displayName}
                        </div>
                        <div className="text-xs text-muted-foreground">
                          {product.productCode}
                        </div>
                      </TableCell>
                      <TableCell className="text-sm text-gray-600">
                        {product.categoryName ?? '—'}
                      </TableCell>
                      <TableCell className="text-sm">
                        {product.variantCount} variants
                      </TableCell>
                      <TableCell className="max-w-[220px] text-xs text-gray-600">
                        {product.prices ? (
                          <>
                            <span className="text-muted-foreground">LKR</span>{' '}
                            {product.prices.lkrAmount} ·{' '}
                            <span className="text-muted-foreground">SGD</span>{' '}
                            {product.prices.sgdAmount} ·{' '}
                            <span className="text-muted-foreground">USD</span>{' '}
                            {product.prices.usdAmount}
                          </>
                        ) : (
                          '—'
                        )}
                      </TableCell>
                      <TableCell>
                        {product.active ? (
                          <Badge className="bg-green-100 text-green-800">Active</Badge>
                        ) : (
                          <Badge className="bg-gray-100 text-gray-600">Inactive</Badge>
                        )}
                        {product.isSale ? (
                          <Badge className="ml-1 bg-red-100 text-red-800">Sale</Badge>
                        ) : null}
                      </TableCell>
                      <TableCell className="text-right">
                        <Button
                          size="sm"
                          variant="outline"
                          className="mr-1"
                          onClick={() =>
                            router.push(`/admin/products/${product.id}`)
                          }
                        >
                          Edit
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          className="text-red-600 hover:text-red-700"
                          onClick={() => setDeleteTarget(product)}
                        >
                          Delete
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>

              {totalPages > 1 ? (
                <div className="flex items-center justify-between border-t border-gray-200 px-4 py-3">
                  <p className="text-sm text-gray-500">
                    Page {page} of {totalPages} ({data.total} products)
                  </p>
                  <div className="flex gap-2">
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page <= 1}
                      onClick={() => setPage((p) => Math.max(1, p - 1))}
                    >
                      <ChevronLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      disabled={page >= totalPages}
                      onClick={() => setPage((p) => p + 1)}
                    >
                      <ChevronRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ) : null}
            </>
          )}
        </CardContent>
      </Card>

      <Dialog open={deleteTarget != null} onOpenChange={() => setDeleteTarget(null)}>
        <DialogContent showCloseButton>
          <DialogHeader>
            <DialogTitle>Delete product</DialogTitle>
            <DialogDescription>
              Are you sure you want to delete {deleteTarget?.displayName}? This action
              soft-deletes the product and removes it from the storefront. It can be
              recovered by re-activating.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDeleteTarget(null)}>
              Cancel
            </Button>
            <Button
              variant="destructive"
              disabled={deleteMut.isPending}
              onClick={() => {
                if (!deleteTarget) return
                void deleteMut
                  .mutateAsync({ id: deleteTarget.id })
                  .then(() => {
                    toast.success('Product deleted.')
                    setDeleteTarget(null)
                  })
                  .catch((e: { message?: string }) => {
                    toast.error(e?.message ?? 'Delete failed')
                  })
              }}
            >
              Delete
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <CategoryManagerSheet
        open={showCategoryManager}
        onOpenChange={setShowCategoryManager}
      />
    </div>
  )
}
