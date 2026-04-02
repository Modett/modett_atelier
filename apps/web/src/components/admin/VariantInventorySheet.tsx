'use client'

import { useEffect, useMemo, useState } from 'react'
import Link from 'next/link'
import { Loader2, X } from 'lucide-react'
import { toast } from 'sonner'
import type { UnitStatus } from '@modett/types'
import type { RestockResult } from '@modett/types'
import { Button } from '@/components/ui/button'
import { Card, CardContent } from '@/components/ui/card'
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from '@/components/ui/sheet'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Textarea } from '@/components/ui/textarea'
import {
  useAdminMovementHistory,
  useAdminVariantStock,
  useAdminVariantUnits,
  useAdjustUnitsOut,
  useMarkUnitsDamaged,
  useRestockVariant,
  useRunReconciliation,
  useSetLowStockThreshold,
} from '@/hooks/useAdminInventory'

function formatShortDate(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleDateString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
  })
}

function formatDateTime(iso: string): string {
  const d = new Date(iso)
  return d.toLocaleString('en-GB', {
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  })
}

const UNIT_FILTER_TABS: { value: 'ALL' | UnitStatus; label: string }[] = [
  { value: 'ALL', label: 'All' },
  { value: 'IN_STOCK', label: 'In Stock' },
  { value: 'HELD', label: 'Held' },
  { value: 'SOLD', label: 'Sold' },
  { value: 'RETURNED', label: 'Returned' },
  { value: 'DAMAGED', label: 'Damaged' },
  { value: 'ADJUSTED_OUT', label: 'Adjusted Out' },
]

function reasonLabel(reason: string): string {
  switch (reason) {
    case 'RESTOCK':
      return 'Restock'
    case 'SALE':
      return 'Sale (order)'
    case 'DAMAGE':
      return 'Damage'
    case 'ADJUSTMENT':
      return 'Stock adjustment'
    case 'RETURN':
      return 'Return'
    default:
      return reason
  }
}

function statusLabel(status: UnitStatus): string {
  switch (status) {
    case 'IN_STOCK':
      return 'In Stock'
    case 'HELD':
      return 'Held'
    case 'SOLD':
      return 'Sold'
    case 'RETURNED':
      return 'Returned'
    case 'DAMAGED':
      return 'Damaged'
    case 'ADJUSTED_OUT':
      return 'Adjusted Out'
    default:
      return status
  }
}

function statusClass(status: UnitStatus): string {
  switch (status) {
    case 'IN_STOCK':
      return 'text-green-700'
    case 'HELD':
      return 'text-blue-600'
    case 'SOLD':
      return 'text-gray-500'
    case 'RETURNED':
      return 'text-purple-600'
    case 'DAMAGED':
      return 'text-red-600'
    case 'ADJUSTED_OUT':
      return 'text-orange-600'
    default:
      return 'text-gray-700'
  }
}

export interface VariantInventorySheetProps {
  variantId: string | null
  open: boolean
  onOpenChange: (open: boolean) => void
  onRestockSuccess: (result: RestockResult) => void
}

export function VariantInventorySheet({
  variantId,
  open,
  onOpenChange,
  onRestockSuccess,
}: VariantInventorySheetProps) {
  const { data: detail, isLoading, error } = useAdminVariantStock(variantId)
  const [unitFilter, setUnitFilter] = useState<'ALL' | UnitStatus>('ALL')
  const { data: unitsData } = useAdminVariantUnits(
    variantId,
    unitFilter === 'ALL' ? undefined : unitFilter,
  )
  const [movementPage, setMovementPage] = useState(1)
  const { data: movementData } = useAdminMovementHistory(
    variantId,
    movementPage,
  )

  const [thresholdInput, setThresholdInput] = useState('')
  const [restockQty, setRestockQty] = useState(1)
  const [restockPhase, setRestockPhase] = useState<'form' | 'done'>('form')
  const [lastRestock, setLastRestock] = useState<RestockResult | null>(null)

  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set())
  const [damageConfirmOpen, setDamageConfirmOpen] = useState(false)
  const [adjustOpen, setAdjustOpen] = useState(false)
  const [adjustNote, setAdjustNote] = useState('')

  const setThreshold = useSetLowStockThreshold()
  const restockMut = useRestockVariant()
  const damageMut = useMarkUnitsDamaged()
  const adjustMut = useAdjustUnitsOut()
  const reconcileMut = useRunReconciliation()

  useEffect(() => {
    if (detail) {
      setThresholdInput(String(detail.stock.lowStockThreshold))
    }
  }, [detail?.stock.lowStockThreshold, detail?.variantId])

  useEffect(() => {
    setMovementPage(1)
  }, [variantId])

  useEffect(() => {
    if (!open) {
      setUnitFilter('ALL')
      setMovementPage(1)
      setSelectedIds(new Set())
      setDamageConfirmOpen(false)
      setAdjustOpen(false)
      setAdjustNote('')
      setRestockPhase('form')
      setLastRestock(null)
      setRestockQty(1)
    }
  }, [open, variantId])

  const units = unitsData?.units ?? []

  const inStockSelectable = useMemo(
    () => units.filter((u) => u.status === 'IN_STOCK'),
    [units],
  )

  const allInStockSelected =
    inStockSelectable.length > 0 &&
    inStockSelectable.every((u) => selectedIds.has(u.id))

  function toggleSelect(id: string) {
    setSelectedIds((prev) => {
      const next = new Set(prev)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  function toggleSelectAll() {
    if (allInStockSelected) {
      setSelectedIds(new Set())
      return
    }
    setSelectedIds(new Set(inStockSelectable.map((u) => u.id)))
  }

  const summaryParts = useMemo(() => {
    const c = detail?.unitCounts ?? {}
    const parts: string[] = []
    const add = (n: number, label: string) => {
      if (n > 0) parts.push(`${n} ${label}`)
    }
    add(c.IN_STOCK ?? 0, 'In Stock')
    add(c.HELD ?? 0, 'Held')
    add(c.SOLD ?? 0, 'Sold')
    add(c.RETURNED ?? 0, 'Returned')
    add(c.DAMAGED ?? 0, 'Damaged')
    add(c.ADJUSTED_OUT ?? 0, 'Adjusted Out')
    return parts.join(' · ')
  }, [detail?.unitCounts])

  if (!variantId) return null

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        className="flex w-full flex-col gap-0 overflow-hidden p-0 sm:max-w-3xl"
        showCloseButton={false}
      >
        <SheetHeader className="space-y-0 border-b border-gray-200 px-4 py-4 text-left">
          <div className="flex items-start justify-between gap-2">
            <div className="flex min-w-0 flex-1 items-start gap-2">
              {detail && (
                <span
                  aria-hidden
                  className="mt-1 inline-block h-6 w-6 shrink-0 rounded-full border border-gray-200"
                  style={{
                    backgroundColor: detail.colorHex ?? '#e5e5e5',
                  }}
                />
              )}
              <div className="min-w-0">
                <SheetTitle className="text-base leading-tight">
                  {detail
                    ? `${detail.color} / ${detail.size}`
                    : 'Variant'}
                </SheetTitle>
                {detail && (
                  <p className="mt-1 text-sm text-gray-600">
                    {detail.productName} — {detail.productCode} —{' '}
                    {detail.skuGroup}
                  </p>
                )}
              </div>
            </div>
            <Button
              type="button"
              variant="ghost"
              size="icon"
              className="shrink-0"
              onClick={() => onOpenChange(false)}
              aria-label="Close"
            >
              <X className="h-5 w-5" />
            </Button>
          </div>
        </SheetHeader>

        <div className="flex min-h-0 flex-1 flex-col overflow-y-auto px-4 py-4">
          {isLoading && (
            <div className="flex justify-center py-12">
              <Loader2 className="h-8 w-8 animate-spin text-gray-400" />
            </div>
          )}
          {error && (
            <p className="text-sm text-red-600">Failed to load variant.</p>
          )}
          {detail && !isLoading && (
            <Tabs defaultValue="overview" className="flex min-h-0 flex-col gap-4">
              <TabsList className="flex w-full flex-wrap justify-start gap-1">
                <TabsTrigger value="overview">Stock Overview</TabsTrigger>
                <TabsTrigger value="restock">Restock</TabsTrigger>
                <TabsTrigger value="units">Units</TabsTrigger>
                <TabsTrigger value="movements">Movement History</TabsTrigger>
              </TabsList>

              <TabsContent value="overview" className="mt-0 space-y-6">
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-500">In Stock</p>
                      <p className="text-2xl font-semibold">
                        {detail.stock.inStockQty}
                      </p>
                      <p className="text-xs text-gray-400">physical</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p
                        className="text-xs text-gray-500"
                        title="Units currently locked in active checkouts. They return to available if checkout expires."
                      >
                        Held
                        <span className="ml-0.5 cursor-help text-gray-400">
                          ⓘ
                        </span>
                      </p>
                      <p className="text-2xl font-semibold text-gray-600">
                        {detail.stock.heldQty}
                      </p>
                      <p className="text-xs text-gray-400">in carts</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-500">Available</p>
                      <p className="text-2xl font-semibold">
                        {detail.stock.availableQty}
                      </p>
                      <p className="text-xs text-gray-400">can be sold</p>
                    </CardContent>
                  </Card>
                  <Card>
                    <CardContent className="p-3 text-center">
                      <p className="text-xs text-gray-500">Threshold</p>
                      <p className="text-2xl font-semibold">
                        {detail.stock.lowStockThreshold}
                      </p>
                      <p className="text-xs text-gray-400">low-stock</p>
                    </CardContent>
                  </Card>
                </div>

                <Card>
                  <CardContent className="space-y-3 p-4">
                    <p className="text-sm font-medium">Low Stock Alert Threshold</p>
                    <p className="text-xs text-gray-500">
                      Alert when available qty drops to or below:
                    </p>
                    <div className="flex flex-wrap items-center gap-2">
                      <input
                        type="number"
                        min={0}
                        max={100}
                        step={1}
                        className="h-9 w-20 rounded-md border border-gray-200 px-2 text-sm"
                        value={thresholdInput}
                        onChange={(e) => setThresholdInput(e.target.value)}
                      />
                      <span className="text-sm text-gray-600">units</span>
                      <Button
                        type="button"
                        size="sm"
                        disabled={setThreshold.isPending}
                        onClick={() => {
                          const n = Number.parseInt(thresholdInput, 10)
                          if (Number.isNaN(n) || n < 0 || n > 100) {
                            toast.error('Threshold must be 0–100.')
                            return
                          }
                          setThreshold.mutate(
                            { variantId, threshold: n },
                            {
                              onSuccess: () => toast.success('Threshold updated.'),
                              onError: (e: Error & { message?: string }) => {
                                toast.error(e.message ?? 'Update failed.')
                              },
                            },
                          )
                        }}
                      >
                        {setThreshold.isPending ? (
                          <Loader2 className="h-4 w-4 animate-spin" />
                        ) : (
                          'Save Threshold'
                        )}
                      </Button>
                    </div>
                    <p className="text-xs text-gray-500">
                      Currently: {detail.stock.lowStockThreshold} units
                    </p>
                  </CardContent>
                </Card>

                <div>
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    disabled={reconcileMut.isPending}
                    onClick={() => {
                      reconcileMut.mutate(
                        { variantId },
                        {
                          onSuccess: (r) => {
                            if (r.hasDrift) {
                              toast.warning(
                                `Drift detected: ${r.delta} units. A reconciliation alert has been logged.`,
                              )
                            } else {
                              toast.success(
                                'Stock counts match. No discrepancy found.',
                              )
                            }
                          },
                          onError: (e: Error & { message?: string }) => {
                            toast.error(e.message ?? 'Reconciliation failed.')
                          },
                        },
                      )
                    }}
                  >
                    {reconcileMut.isPending ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Checking…
                      </>
                    ) : (
                      'Run Stock Check'
                    )}
                  </Button>
                </div>
              </TabsContent>

              <TabsContent value="restock" className="mt-0">
                <Card>
                  <CardContent className="space-y-4 p-4">
                    <p className="text-sm font-medium">
                      Restock — {detail.color} / {detail.size}
                    </p>
                    {restockPhase === 'form' ? (
                      <>
                        <div>
                          <label className="text-sm text-gray-600">
                            Units to add *
                          </label>
                          <input
                            type="number"
                            min={1}
                            max={500}
                            step={1}
                            className="mt-1 block h-9 w-full max-w-[200px] rounded-md border border-gray-200 px-2 text-sm"
                            value={restockQty}
                            onChange={(e) =>
                              setRestockQty(
                                Math.max(
                                  1,
                                  Math.min(
                                    500,
                                    Number.parseInt(e.target.value, 10) || 1,
                                  ),
                                ),
                              )
                            }
                          />
                        </div>
                        <p className="text-sm text-gray-600">
                          Preview: This will create {restockQty} new barcoded
                          units. New in-stock total:{' '}
                          {detail.stock.inStockQty + restockQty} units
                        </p>
                        <Button
                          type="button"
                          disabled={restockMut.isPending}
                          onClick={() => {
                            restockMut.mutate(
                              { variantId, qty: restockQty },
                              {
                                onSuccess: (result) => {
                                  toast.success(
                                    `Stock added. ${restockQty} units created.`,
                                  )
                                  setLastRestock(result)
                                  setRestockPhase('done')
                                },
                                onError: (e: Error & { message?: string }) => {
                                  toast.error(e.message ?? 'Restock failed.')
                                },
                              },
                            )
                          }}
                        >
                          {restockMut.isPending ? (
                            <>
                              <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                              Adding stock…
                            </>
                          ) : (
                            'Add Stock & Generate Barcodes'
                          )}
                        </Button>
                      </>
                    ) : (
                      lastRestock && (
                        <div className="space-y-3">
                          <p className="text-sm font-medium text-green-700">
                            {lastRestock.newUnits.length} units added successfully
                          </p>
                          <p className="text-sm text-gray-600">
                            Barcode range:{' '}
                            {lastRestock.newUnits[0]?.barcodeValue ?? '—'} →{' '}
                            {lastRestock.newUnits[lastRestock.newUnits.length - 1]
                              ?.barcodeValue ?? '—'}
                          </p>
                          <div className="flex flex-wrap gap-2">
                            <Button
                              type="button"
                              variant="default"
                              onClick={() => onRestockSuccess(lastRestock)}
                            >
                              Print Barcode Sheet
                            </Button>
                            <Button
                              type="button"
                              variant="outline"
                              onClick={() => {
                                setRestockPhase('form')
                                setLastRestock(null)
                              }}
                            >
                              Add More Stock
                            </Button>
                          </div>
                        </div>
                      )
                    )}
                  </CardContent>
                </Card>
              </TabsContent>

              <TabsContent value="units" className="mt-0 space-y-4">
                <div className="flex flex-wrap gap-1">
                  {UNIT_FILTER_TABS.map((t) => (
                    <Button
                      key={t.value}
                      type="button"
                      size="sm"
                      variant={unitFilter === t.value ? 'default' : 'outline'}
                      className="h-8 text-xs"
                      onClick={() => setUnitFilter(t.value)}
                    >
                      {t.label}
                    </Button>
                  ))}
                </div>
                {summaryParts ? (
                  <p className="text-xs text-gray-600">{summaryParts}</p>
                ) : null}
                <div className="overflow-x-auto rounded-md border">
                  <table className="w-full text-left text-sm">
                    <thead className="border-b bg-gray-50 text-xs text-gray-600">
                      <tr>
                        {inStockSelectable.length > 0 && (
                          <th className="w-10 p-2">
                            <input
                              type="checkbox"
                              checked={allInStockSelected}
                              onChange={toggleSelectAll}
                              aria-label="Select all in stock"
                            />
                          </th>
                        )}
                        <th className="p-2">Unit SKU</th>
                        <th className="p-2">Barcode</th>
                        <th className="p-2">Status</th>
                        <th className="p-2">Created</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y">
                      {units.map((u) => {
                        const selectable = u.status === 'IN_STOCK'
                        return (
                          <tr key={u.id}>
                            {inStockSelectable.length > 0 && (
                              <td className="p-2">
                                {selectable ? (
                                  <input
                                    type="checkbox"
                                    checked={selectedIds.has(u.id)}
                                    onChange={() => toggleSelect(u.id)}
                                    aria-label={`Select ${u.unitSku}`}
                                  />
                                ) : null}
                              </td>
                            )}
                            <td className="p-2 font-mono text-xs">
                              {u.unitSku}
                            </td>
                            <td className="p-2 font-mono text-xs">
                              {u.barcodeValue}
                            </td>
                            <td className={`p-2 text-xs ${statusClass(u.status)}`}>
                              {statusLabel(u.status)}
                            </td>
                            <td className="p-2 text-xs text-gray-600">
                              {formatShortDate(u.createdAt)}
                            </td>
                          </tr>
                        )
                      })}
                    </tbody>
                  </table>
                </div>

                {selectedIds.size > 0 && (
                  <div className="space-y-3 rounded-md border border-amber-200 bg-amber-50/50 p-3">
                    <p className="text-sm font-medium">
                      {selectedIds.size} units selected
                    </p>
                    <div className="flex flex-wrap gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setDamageConfirmOpen(true)
                          setAdjustOpen(false)
                        }}
                      >
                        Mark as Damaged
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          setAdjustOpen(true)
                          setDamageConfirmOpen(false)
                        }}
                      >
                        Adjust Out
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => {
                          const ids = [...selectedIds].join(',')
                          const q = new URLSearchParams({
                            variantId,
                            unitIds: ids,
                          })
                          window.open(`/admin/barcodes/print?${q.toString()}`, '_blank')
                        }}
                      >
                        Reprint Barcodes
                      </Button>
                    </div>
                    {damageConfirmOpen && (
                      <div className="space-y-2 border-t border-amber-200 pt-3 text-sm">
                        <p>
                          Mark these {selectedIds.size} IN_STOCK units as
                          DAMAGED? This will reduce in_stock_qty, record DAMAGE
                          movements, and cannot be undone.
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={damageMut.isPending}
                            onClick={() => {
                              damageMut.mutate(
                                {
                                  variantId,
                                  unitIds: [...selectedIds],
                                },
                                {
                                  onSuccess: () => {
                                    toast.success('Units marked as damaged.')
                                    setSelectedIds(new Set())
                                    setDamageConfirmOpen(false)
                                  },
                                  onError: (
                                    e: Error & { message?: string },
                                  ) => {
                                    toast.error(e.message ?? 'Request failed.')
                                  },
                                },
                              )
                            }}
                          >
                            {damageMut.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Confirm: Mark Damaged'
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => setDamageConfirmOpen(false)}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                    {adjustOpen && (
                      <div className="space-y-2 border-t border-amber-200 pt-3 text-sm">
                        <p>
                          Adjust out {selectedIds.size} units. Reason / note
                          (optional):
                        </p>
                        <Textarea
                          rows={2}
                          placeholder="e.g. Quality control reject — fabric defect on collar"
                          value={adjustNote}
                          onChange={(e) => setAdjustNote(e.target.value)}
                        />
                        <p className="text-xs text-gray-600">
                          ADJUSTED_OUT records a stock adjustment (not damage).
                        </p>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            disabled={adjustMut.isPending}
                            onClick={() => {
                              adjustMut.mutate(
                                {
                                  variantId,
                                  unitIds: [...selectedIds],
                                  note: adjustNote.trim() || undefined,
                                },
                                {
                                  onSuccess: () => {
                                    toast.success('Units adjusted out.')
                                    setSelectedIds(new Set())
                                    setAdjustOpen(false)
                                    setAdjustNote('')
                                  },
                                  onError: (
                                    e: Error & { message?: string },
                                  ) => {
                                    toast.error(e.message ?? 'Request failed.')
                                  },
                                },
                              )
                            }}
                          >
                            {adjustMut.isPending ? (
                              <Loader2 className="h-4 w-4 animate-spin" />
                            ) : (
                              'Confirm: Adjust Out'
                            )}
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="ghost"
                            onClick={() => {
                              setAdjustOpen(false)
                              setAdjustNote('')
                            }}
                          >
                            Cancel
                          </Button>
                        </div>
                      </div>
                    )}
                  </div>
                )}
              </TabsContent>

              <TabsContent value="movements" className="mt-0 space-y-4">
                {movementData && movementData.movements.length === 0 ? (
                  <p className="text-sm text-gray-500">
                    No movement history yet. History is created when stock is
                    restocked, sold, damaged, or adjusted.
                  </p>
                ) : (
                  <>
                    <div className="overflow-x-auto rounded-md border">
                      <table className="w-full text-left text-sm">
                        <thead className="border-b bg-gray-50 text-xs text-gray-600">
                          <tr>
                            <th className="p-2">Date/Time</th>
                            <th className="p-2">Change</th>
                            <th className="p-2">Reason</th>
                            <th className="p-2">Reference</th>
                            <th className="p-2">Admin</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y">
                          {movementData?.movements.map((m) => (
                            <tr key={m.id}>
                              <td className="p-2 text-xs text-gray-700">
                                {formatDateTime(m.createdAt)}
                              </td>
                              <td
                                className={`p-2 font-mono text-xs font-medium ${
                                  m.deltaQty > 0
                                    ? 'text-green-700'
                                    : 'text-red-600'
                                }`}
                              >
                                {m.deltaQty > 0 ? '+' : ''}
                                {m.deltaQty}
                              </td>
                              <td className="p-2 text-xs">
                                {reasonLabel(m.reason)}
                              </td>
                              <td className="p-2 text-xs">
                                {m.referenceType?.toLowerCase() === 'order' &&
                                m.referenceId ? (
                                  <Link
                                    className="text-blue-600 underline"
                                    href={`/admin/orders/${m.referenceId}`}
                                  >
                                    Order #{m.referenceId.slice(0, 8)}…
                                  </Link>
                                ) : m.referenceType ? (
                                  m.referenceType
                                ) : (
                                  '—'
                                )}
                              </td>
                              <td className="p-2 text-xs text-gray-600">
                                {m.adminDisplayName ?? '—'}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                    {movementData && movementData.total > 20 && (
                      <div className="flex items-center justify-between text-sm">
                        <span className="text-gray-500">
                          Page {movementData.page} of{' '}
                          {Math.ceil(
                            movementData.total / movementData.limit,
                          ) || 1}
                        </span>
                        <div className="flex gap-2">
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={movementPage <= 1}
                            onClick={() =>
                              setMovementPage((p) => Math.max(1, p - 1))
                            }
                          >
                            Previous
                          </Button>
                          <Button
                            type="button"
                            variant="outline"
                            size="sm"
                            disabled={
                              movementPage * movementData.limit >=
                              movementData.total
                            }
                            onClick={() => setMovementPage((p) => p + 1)}
                          >
                            Next
                          </Button>
                        </div>
                      </div>
                    )}
                  </>
                )}
              </TabsContent>
            </Tabs>
          )}
        </div>
      </SheetContent>
    </Sheet>
  )
}
