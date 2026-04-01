'use client'

import { useEffect, useRef, useState } from 'react'
import Image from 'next/image'
import { AlertTriangle, Camera, ChevronDown, ChevronUp } from 'lucide-react'
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
import { VariantInventorySheet } from '@/components/admin/VariantInventorySheet'
import {
  useAdminInventoryList,
  useAdminUnresolvedDrift,
  useResolveReconciliation,
} from '@/hooks/useAdminInventory'
import type {
  InventoryVariantRow,
  RestockResult,
  StockStatus,
} from '@modett/types'

function useDebouncedValue<T>(value: T, ms: number): T {
  const [debounced, setDebounced] = useState(value)
  useEffect(() => {
    const t = setTimeout(() => setDebounced(value), ms)
    return () => clearTimeout(t)
  }, [value, ms])
  return debounced
}

function ProductThumb({ url }: { url: string | null }) {
  const [phase, setPhase] = useState<'thumb' | 'base' | 'none'>('thumb')
  const src =
    url == null
      ? null
      : phase === 'thumb'
        ? `${url}-thumb.webp`
        : phase === 'base'
          ? url
          : null

  if (!src) {
    return (
      <div className="flex h-10 w-10 items-center justify-center rounded-md bg-gray-100 text-gray-400">
        <Camera className="h-5 w-5" />
      </div>
    )
  }

  return (
    <div className="relative h-10 w-10 overflow-hidden rounded-md bg-gray-100">
      <Image
        src={src}
        alt=""
        fill
        className="object-cover"
        sizes="40px"
        unoptimized
        onError={() => {
          if (phase === 'thumb') setPhase('base')
          else setPhase('none')
        }}
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
): { className: string; suffix: string } {
  if (available === 0) {
    return { className: 'font-medium text-red-600', suffix: ' ✕' }
  }
  if (available <= threshold) {
    return { className: 'font-medium text-orange-600', suffix: ' ⚠' }
  }
  return { className: 'font-medium text-green-700', suffix: '' }
}

export default function AdminInventoryPage() {
  const [search, setSearch] = useState('')
  const debouncedSearch = useDebouncedValue(search, 300)
  const [statusFilter, setStatusFilter] = useState<StockStatus | 'ALL'>('ALL')
  const [page, setPage] = useState(1)
  const [selectedVariantId, setSelectedVariantId] = useState<string | null>(null)
  const [sheetOpen, setSheetOpen] = useState(false)
  const [reconOpen, setReconOpen] = useState(true)
  const [resolvingLogId, setResolvingLogId] = useState<string | null>(null)
  const [resolveNote, setResolveNote] = useState('')

  const reconRef = useRef<HTMLDivElement>(null)

  const { data: listData, isLoading, error } = useAdminInventoryList({
    page,
    limit: 50,
    search: debouncedSearch || undefined,
    stockStatus: statusFilter === 'ALL' ? undefined : statusFilter,
  })

  const { data: driftData } = useAdminUnresolvedDrift()
  const resolveMut = useResolveReconciliation()

  const driftCount = driftData?.logs.length ?? 0

  useEffect(() => {
    setPage(1)
  }, [debouncedSearch, statusFilter])

  function openVariant(id: string) {
    setSelectedVariantId(id)
    setSheetOpen(true)
  }

  function handleRestockSuccess(result: RestockResult) {
    const unitIds = result.newUnits.map((u) => u.id).join(',')
    const q = new URLSearchParams({
      variantId: result.variantId,
      unitIds,
    })
    window.open(`/admin/barcodes/print?${q.toString()}`, '_blank')
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-xl font-semibold text-gray-900">Inventory</h1>
          {driftCount > 0 && (
            <p className="text-sm text-amber-700">
              {driftCount} unresolved drift alert{driftCount === 1 ? '' : 's'}
            </p>
          )}
        </div>
      </div>

      {driftCount > 0 && (
        <Alert variant="destructive" className="border-red-200 bg-red-50">
          <AlertTriangle className="h-4 w-4" />
          <AlertTitle>Reconciliation</AlertTitle>
          <AlertDescription className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span>
              {driftCount} stock reconciliation issue
              {driftCount === 1 ? '' : 's'} detected. View them below or jump to
              the panel.
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

      <Card>
        <CardContent className="flex flex-col gap-4 p-4 sm:flex-row sm:items-end">
          <div className="min-w-0 flex-1">
            <label className="text-xs font-medium text-gray-500" htmlFor="inv-search">
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

      <Card>
        <CardContent className="p-0">
          <div className="overflow-x-auto">
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Product</TableHead>
                  <TableHead>Variant</TableHead>
                  <TableHead>SKU Group</TableHead>
                  <TableHead className="text-right">In Stock</TableHead>
                  <TableHead className="text-right">Held</TableHead>
                  <TableHead className="text-right">Available</TableHead>
                  <TableHead className="text-right">Threshold</TableHead>
                  <TableHead>Status</TableHead>
                  <TableHead className="w-[100px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading &&
                  Array.from({ length: 10 }).map((_, i) => (
                    <TableRow key={i}>
                      {Array.from({ length: 9 }).map((__, j) => (
                        <TableCell key={j}>
                          <Skeleton className="h-8 w-full" />
                        </TableCell>
                      ))}
                    </TableRow>
                  ))}
                {error && (
                  <TableRow>
                    <TableCell colSpan={9} className="text-center text-red-600">
                      Failed to load inventory.
                    </TableCell>
                  </TableRow>
                )}
                {!isLoading &&
                  !error &&
                  listData?.variants.length === 0 && (
                    <TableRow>
                      <TableCell
                        colSpan={9}
                        className="py-12 text-center text-gray-500"
                      >
                        {debouncedSearch || statusFilter !== 'ALL'
                          ? 'Try adjusting filters.'
                          : 'No inventory data found.'}
                      </TableCell>
                    </TableRow>
                  )}
                {!isLoading &&
                  !error &&
                  listData?.variants.map((row: InventoryVariantRow) => (
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
                        <div className="flex items-center gap-1 text-sm">
                          <span
                            className="inline-block h-4 w-4 shrink-0 rounded-full border border-gray-200"
                            style={{
                              backgroundColor: row.colorHex ?? '#e5e5e5',
                            }}
                            aria-hidden
                          />
                          <span>
                            {row.color} / {row.size}
                          </span>
                        </div>
                      </TableCell>
                      <TableCell className="font-mono text-xs">
                        {row.skuGroup}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {row.stock.inStockQty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums text-gray-500">
                        {row.stock.heldQty}
                      </TableCell>
                      <TableCell className="text-right tabular-nums">
                        {(() => {
                          const { className, suffix } = availableCellClass(
                            row.stock.availableQty,
                            row.stock.lowStockThreshold,
                          )
                          return (
                            <span className={className}>
                              {row.stock.availableQty}
                              {suffix}
                            </span>
                          )
                        })()}
                      </TableCell>
                      <TableCell className="text-right text-gray-500 tabular-nums">
                        {row.stock.lowStockThreshold}
                      </TableCell>
                      <TableCell>
                        <StockStatusBadge status={row.stock.stockStatus} />
                      </TableCell>
                      <TableCell>
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation()
                            openVariant(row.variantId)
                          }}
                        >
                          Manage
                        </Button>
                      </TableCell>
                    </TableRow>
                  ))}
              </TableBody>
            </Table>
          </div>
        </CardContent>
      </Card>

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
                These variants have a mismatch between physical unit count and the
                aggregate stock counter. Investigate and resolve manually.
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
                        {resolvingLogId !== log.id ? (
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
                        ) : null}
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
                            Resolving this entry does not auto-correct the stock
                            counter. If a real discrepancy exists, fix it via
                            Manage (restock or adjust-out).
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              size="sm"
                              disabled={resolveMut.isPending}
                              onClick={() => {
                                const note = resolveNote.trim()
                                if (!note) {
                                  toast.error('Resolved note is required.')
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

      <VariantInventorySheet
        variantId={selectedVariantId}
        open={sheetOpen}
        onOpenChange={(o) => {
          setSheetOpen(o)
          if (!o) setSelectedVariantId(null)
        }}
        onRestockSuccess={handleRestockSuccess}
      />

    </div>
  )
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
