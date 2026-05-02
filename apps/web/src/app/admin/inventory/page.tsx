'use client'

import { Suspense, useEffect, useMemo, useRef, useState } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useRouter, useSearchParams } from 'next/navigation'
import {
  AlertTriangle,
  Camera,
  ChevronDown,
  ChevronUp,
  Download,
  Loader2,
  Plus,
  Printer,
  RefreshCw,
} from 'lucide-react'
import { toast } from 'sonner'
import { Alert, AlertDescription, AlertTitle } from '@/components/ui/alert'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select'
import { Skeleton } from '@/components/ui/skeleton'
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table'
import { Textarea } from '@/components/ui/textarea'
import {
  VariantInventorySheet,
  type InventoryManagerTab,
} from '@/components/admin/VariantInventorySheet'
import {
  useAdminInventoryList,
  useAdminUnresolvedDrift,
  useInitializeMissingStock,
  useResolveReconciliation,
  useRunInventoryMigrations,
} from '@/hooks/useAdminInventory'
import type { InventoryVariantRow, StockStatus } from '@modett/types'
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
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-400">
        <Camera className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-gray-100">
      <Image
        src={candidates[i]!}
        alt=""
        fill
        className="object-cover"
        sizes="40px"
        unoptimized
        onError={() => setI((x) => x + 1)}
      />
    </div>
  )
}

function StockStatusBadge({ status }: { status: StockStatus }) {
  const cfg: Record<StockStatus, { label: string; className: string }> = {
    IN_STOCK: {
      label: 'In Stock',
      className: 'bg-green-100 text-green-800',
    },
    LOW_STOCK: {
      label: 'Low Stock',
      className: 'bg-orange-100 text-orange-800',
    },
    OUT_OF_STOCK: {
      label: 'Out of Stock',
      className: 'bg-red-100 text-red-800',
    },
  }
  const { label, className } = cfg[status]
  return (
    <span
      className={`inline-flex rounded px-2 py-0.5 text-xs font-medium ${className}`}
    >
      {label}
    </span>
  )
}

function availableCellClass(
  available: number,
  threshold: number,
): string {
  if (available === 0) return 'font-medium text-red-600'
  if (available <= threshold) return 'font-medium text-orange-600'
  return 'font-medium text-green-700'
}

function formatDetected(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

function AdminInventoryPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const initialVariantId = searchParams.get('variantId')

  // ── Filter / pagination state ──────────────────────────────────────────────
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)

  // ── Sheet state ────────────────────────────────────────────────────────────
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [sheetInitialTab, setSheetInitialTab] = useState<
    InventoryManagerTab | undefined
  >(undefined)

  // ── Reconciliation panel ───────────────────────────────────────────────────
  const [reconOpen, setReconOpen] = useState(true)
  const [resolvingLogId, setResolvingLogId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')
  const reconRef = useRef<HTMLDivElement>(null)

  // ── Auto-init guard ────────────────────────────────────────────────────────
  const [autoInitDone, setAutoInitDone] = useState(false)

  // ── Data ───────────────────────────────────────────────────────────────────
  const {
    data: listData,
    isLoading,
    error,
    refetch,
  } = useAdminInventoryList({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
    stockStatus: statusFilter === 'ALL' ? undefined : statusFilter,
  })

  const { data: driftData } = useAdminUnresolvedDrift()
  const resolveMut = useResolveReconciliation()
  const initStockMut = useInitializeMissingStock()
  const runMigrationsMut = useRunInventoryMigrations()

  const driftCount = driftData?.logs.length ?? 0

  // ── Reset page when filters change ────────────────────────────────────────
  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  // ── Auto-open sheet if variantId is in URL ─────────────────────────────────
  useEffect(() => {
    if (initialVariantId) {
      setSelectedVariantId(initialVariantId)
      setSheetOpen(true)
    }
    // Only run on mount
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // ── Auto-trigger initialization when the API errors on first load ─────────
  useEffect(() => {
    if (autoInitDone) return
    if (isLoading) return
    if (!error) return
    setAutoInitDone(true)
    initStockMut.mutate(undefined, {
      onSuccess: () => void refetch(),
      onError: () => void refetch(),
    })
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoInitDone, isLoading, error])

  // ── Sheet helpers ──────────────────────────────────────────────────────────
  function openVariant(id: string, tab?: InventoryManagerTab) {
    setSelectedVariantId(id)
    setSheetInitialTab(tab)
    setSheetOpen(true)
  }

  // ── CSV export ─────────────────────────────────────────────────────────────
  function exportCsv() {
    if (!listData?.variants.length) return
    const header =
      'Product,Code,Color,Size,SKU Group,In Stock,Held,Available,Threshold,Status'
    const rows = listData.variants.map((v) =>
      [
        `"${v.productName}"`,
        v.productCode,
        v.color,
        v.size,
        v.skuGroup,
        v.stock.inStockQty,
        v.stock.heldQty,
        v.stock.availableQty,
        v.stock.lowStockThreshold,
        v.stock.stockStatus,
      ].join(','),
    )
    const blob = new Blob([[header, ...rows].join('\n')], { type: 'text/csv' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `modett-inventory-${new Date().toISOString().slice(0, 10)}.csv`
    a.click()
    URL.revokeObjectURL(url)
  }

  const isPending = runMigrationsMut.isPending || initStockMut.isPending

  return (
    <div className="space-y-6">
      {/* ── Page header ─────────────────────────────────────────────────── */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
          {driftCount > 0 && (
            <p className="text-sm text-amber-700">
              {driftCount} unresolved drift alert{driftCount === 1 ? '' : 's'}
            </p>
          )}
        </div>

        <div className="flex flex-wrap gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            disabled={isPending}
            onClick={() => {
              runMigrationsMut.mutate(undefined, {
                onSuccess: (data) => {
                  toast.success(
                    data.initialized > 0
                      ? `Initialized ${data.initialized} stock row${data.initialized === 1 ? '' : 's'}.`
                      : 'All stock rows are already initialized.',
                  )
                  void refetch()
                },
                onError: (e: Error & { message?: string }) => {
                  toast.error(e.message ?? 'Migration failed.')
                },
              })
            }}
          >
            {isPending ? (
              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
            ) : (
              <RefreshCw className="mr-1.5 h-4 w-4" />
            )}
            Initialize / Sync Stock
          </Button>

          {listData && listData.total > 0 && (
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={exportCsv}
            >
              <Download className="mr-1.5 h-4 w-4" />
              Export CSV
            </Button>
          )}
        </div>
      </div>

      {/* ── Drift alert banner ───────────────────────────────────────────── */}
      {driftCount > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Reconciliation</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {driftCount} stock reconciliation issue
              {driftCount === 1 ? '' : 's'} detected.
            </span>
            <Button
              type="button"
              variant="outline"
              size="sm"
              className="shrink-0 border-red-300"
              onClick={() =>
                reconRef.current?.scrollIntoView({ behavior: 'smooth' })
              }
            >
              View reconciliation panel
            </Button>
          </AlertDescription>
        </Alert>
      )}

      {/* ── Search + filter bar ──────────────────────────────────────────── */}
      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label
              className="text-xs font-medium text-gray-500"
              htmlFor="inv-search"
            >
              Search
            </label>
            <input
              id="inv-search"
              type="search"
              placeholder="Product name, code, or SKU group"
              className="mt-1 h-9 w-full rounded-md border border-gray-200 px-3 text-sm"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
            />
          </div>
          <div className="w-full sm:w-48">
            <label className="text-xs font-medium text-gray-500">Status</label>
            <Select
              value={statusFilter}
              onValueChange={(v) => setStatusFilter(v as StockStatus | 'ALL')}
            >
              <SelectTrigger className="mt-1 h-9">
                <SelectValue placeholder="Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">All</SelectItem>
                <SelectItem value="IN_STOCK">In Stock</SelectItem>
                <SelectItem value="LOW_STOCK">Low Stock</SelectItem>
                <SelectItem value="OUT_OF_STOCK">Out of Stock</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {/* ── Main inventory table ─────────────────────────────────────────── */}
      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead className="w-[220px]">Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU Group</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[200px] text-right">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {/* Loading skeletons */}
                {isLoading &&
                  Array.from({ length: 8 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}

                {/* Error state */}
                {!isLoading && error && (
                  <TableRow>
                    <TableCell colSpan={9} className="py-10 text-center">
                      <div className="flex flex-col items-center gap-3">
                        <AlertTriangle className="h-8 w-8 text-red-400" />
                        <p className="font-medium text-red-600">
                          Failed to load inventory
                        </p>
                        <p className="max-w-sm text-sm text-gray-500">
                          This usually means stock rows haven&apos;t been
                          initialized, or a migration hasn&apos;t run yet.
                          Click the button below to fix it.
                        </p>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          disabled={isPending}
                          onClick={() => {
                            runMigrationsMut.mutate(undefined, {
                              onSuccess: (data) => {
                                toast.success(
                                  data.initialized > 0
                                    ? `Initialized ${data.initialized} stock rows. Reloading…`
                                    : 'All stock rows exist. Reloading…',
                                )
                                void refetch()
                              },
                              onError: (e: Error & { message?: string }) => {
                                toast.error(
                                  e.message ?? 'Could not initialize.',
                                )
                              },
                            })
                          }}
                        >
                          {isPending ? (
                            <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                          ) : (
                            <RefreshCw className="mr-1.5 h-4 w-4" />
                          )}
                          Initialize Stock Rows &amp; Retry
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                )}

                {/* Empty state */}
                {!isLoading && !error && listData?.variants.length === 0 && (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="py-12 text-center text-gray-500"
                    >
                      {debouncedSearch || statusFilter !== 'ALL' ? (
                        'No variants match your filters.'
                      ) : (
                        <span className="mx-auto flex max-w-md flex-col items-center gap-3 text-sm">
                          <span className="font-medium text-gray-800">
                            No inventory yet
                          </span>
                          <span>
                            Create products and variants first in{' '}
                            <Link
                              href="/admin/products"
                              className="font-medium text-blue-600 underline"
                            >
                              Admin → Products
                            </Link>
                            , then come back here to manage stock.
                          </span>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={isPending}
                            onClick={() => {
                              runMigrationsMut.mutate(undefined, {
                                onSuccess: (d) => {
                                  toast.success(
                                    d.initialized > 0
                                      ? `Initialized ${d.initialized} stock rows.`
                                      : 'No new rows needed.',
                                  )
                                  void refetch()
                                },
                                onError: (e: Error & { message?: string }) =>
                                  toast.error(e.message ?? 'Failed.'),
                              })
                            }}
                          >
                            {isPending ? (
                              <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />
                            ) : (
                              <RefreshCw className="mr-1.5 h-4 w-4" />
                            )}
                            Sync stock rows from existing variants
                          </Button>
                        </span>
                      )}
                    </TableCell>
                  </TableRow>
                )}

                {/* Variant rows */}
                {!isLoading &&
                  !error &&
                  listData?.variants.map((row: InventoryVariantRow) => {
                    const available = row.stock.availableQty
                    const threshold = row.stock.lowStockThreshold
                    const availCls = availableCellClass(available, threshold)

                    return (
                      <TableRow
                        key={row.variantId}
                        className="cursor-pointer hover:bg-gray-50"
                        onClick={() => openVariant(row.variantId)}
                      >
                        <TableCell>
                          <div className="flex items-center gap-2">
                            <ProductThumb url={row.keyImageUrl} />
                            <div>
                              <p className="font-medium text-gray-900">
                                {row.productName}
                              </p>
                              <p className="text-xs text-gray-500">
                                {row.productCode}
                              </p>
                            </div>
                          </div>
                        </TableCell>

                        <TableCell>
                          <div className="flex items-center gap-1.5">
                            {row.colorHex && (
                              <span
                                className="inline-block h-4 w-4 shrink-0 rounded-full border border-gray-200"
                                style={{ backgroundColor: row.colorHex }}
                                aria-hidden
                              />
                            )}
                            <span className="text-sm">
                              {row.color} / {row.size}
                            </span>
                          </div>
                        </TableCell>

                        <TableCell className="font-mono text-xs text-gray-600">
                          {row.skuGroup}
                        </TableCell>

                        <TableCell className="text-right text-sm tabular-nums">
                          {row.stock.inStockQty}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-gray-500">
                          {row.stock.heldQty}
                        </TableCell>
                        <TableCell
                          className={`text-right text-sm tabular-nums ${availCls}`}
                        >
                          {available}
                        </TableCell>
                        <TableCell className="text-right text-sm tabular-nums text-gray-500">
                          {threshold}
                        </TableCell>

                        <TableCell>
                          <StockStatusBadge status={row.stock.stockStatus} />
                        </TableCell>

                        <TableCell>
                          <div
                            className="flex items-center justify-end gap-1"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 shrink-0"
                              title="Add stock (restock)"
                              aria-label="Add stock"
                              onClick={() =>
                                openVariant(row.variantId, 'restock')
                              }
                            >
                              <Plus className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="icon"
                              variant="outline"
                              className="h-8 w-8 shrink-0"
                              title="Print barcodes"
                              aria-label="Print barcodes"
                              onClick={() => {
                                const params = new URLSearchParams({
                                  variantId: row.variantId,
                                  status: 'IN_STOCK',
                                })
                                router.push(
                                  `/admin/barcodes/print?${params.toString()}`,
                                )
                              }}
                            >
                              <Printer className="h-4 w-4" />
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              onClick={() => openVariant(row.variantId)}
                            >
                              Manage
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    )
                  })}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

      {/* ── Pagination ───────────────────────────────────────────────────── */}
      {listData && listData.total > listData.limit && (
        <div className="flex items-center justify-between text-sm">
          <span className="text-gray-500">
            Page {listData.page} — {listData.total} variants
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page <= 1}
              onClick={() => setPage((p) => Math.max(1, p - 1))}
            >
              Previous
            </Button>
            <Button
              type="button"
              variant="outline"
              size="sm"
              disabled={page * listData.limit >= listData.total}
              onClick={() => setPage((p) => p + 1)}
            >
              Next
            </Button>
          </div>
        </div>
      )}

      {/* ── Reconciliation alerts panel ──────────────────────────────────── */}
      <div ref={reconRef}>
        <button
          type="button"
          className="mb-2 flex w-full items-center justify-between rounded-md border border-gray-200 bg-white px-4 py-3 text-left text-sm font-medium text-gray-900 hover:bg-gray-50"
          onClick={() => setReconOpen((o) => !o)}
        >
          <span>Reconciliation Alerts</span>
          {reconOpen ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </button>

        {reconOpen && (
          <Card>
            <CardContent className="space-y-4 p-4">
              <p className="text-sm text-gray-600">
                These variants have a mismatch between physical unit count and
                the aggregate stock counter. Investigate and resolve manually.
              </p>
              {driftCount === 0 ? (
                <p className="text-sm text-green-700">
                  No drift detected. All stock counts are consistent.
                </p>
              ) : (
                <ul className="space-y-4">
                  {driftData?.logs.map((log) => (
                    <li
                      key={log.id}
                      className="rounded-md border border-amber-200 bg-amber-50/40 p-4"
                    >
                      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                        <div className="min-w-0 space-y-1 text-sm">
                          <p className="font-medium text-gray-900">
                            <AlertTriangle className="mr-1 inline h-4 w-4 text-amber-600" />
                            {log.productName ?? 'Product'} — {log.color ?? ''} /{' '}
                            {log.size ?? ''} ({log.skuGroup ?? ''})
                          </p>
                          <p className="text-xs text-gray-500">
                            Detected: {formatDetected(log.detectedAt)}
                          </p>
                          <p className="text-xs text-gray-700">
                            Physical count: {log.actualCount} | Aggregate:{' '}
                            {log.aggregateCount} | Drift:{' '}
                            {log.delta > 0 ? '+' : ''}
                            {log.delta} units
                          </p>
                          <p className="text-xs text-amber-900">
                            {log.delta > 0
                              ? 'Counter is LOW — restock may have been missed.'
                              : 'Counter is HIGH — damage/adjust may have been missed.'}
                          </p>
                        </div>
                        {resolvingLogId !== log.id && (
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setResolvingLogId(log.id)
                              setResolveNote('')
                            }}
                          >
                            Resolve
                          </Button>
                        )}
                      </div>
                      {resolvingLogId === log.id && (
                        <div className="mt-4 space-y-2 border-t border-amber-200 pt-4">
                          <label className="text-xs font-medium text-gray-700">
                            Resolved note (required)
                          </label>
                          <Textarea
                            rows={2}
                            placeholder="e.g. Counted physically — counter was correct, units were sold without recording."
                            value={resolveNote}
                            onChange={(e) => setResolveNote(e.target.value)}
                          />
                          <p className="text-xs text-amber-900">
                            Resolving does not auto-correct the stock counter.
                            Fix discrepancies via Manage → Restock or Adjust Out.
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={resolveMut.isPending}
                              onClick={() => {
                                const note = resolveNote.trim()
                                if (!note) {
                                  toast.error('Note is required.')
                                  return
                                }
                                resolveMut.mutate(
                                  { logId: log.id, resolvedNote: note },
                                  {
                                    onSuccess: () => {
                                      toast.success('Drift resolved.')
                                      setResolvingLogId(null)
                                      setResolveNote('')
                                    },
                                    onError: (
                                      e: Error & { message?: string },
                                    ) => {
                                      toast.error(
                                        e.message ?? 'Could not resolve.',
                                      )
                                    },
                                  },
                                )
                              }}
                            >
                              Confirm Resolve
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setResolvingLogId(null)
                                setResolveNote('')
                              }}
                            >
                              Cancel
                            </Button>
                          </div>
                        </div>
                      )}
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        )}
      </div>

      {/* ── Variant management sheet ─────────────────────────────────────── */}
      <VariantInventorySheet
        variantId={selectedVariantId}
        open={sheetOpen}
        initialTab={sheetInitialTab}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) {
            setSelectedVariantId(null)
            setSheetInitialTab(undefined)
          }
        }}
      />
    </div>
  )
}

export default function AdminInventoryPageWrapper() {
  return (
    <Suspense>
      <AdminInventoryPage />
    </Suspense>
  )
}
