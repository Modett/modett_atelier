'use client'

import { useState, useMemo } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import { ChevronLeft } from 'lucide-react'
import Decimal from 'decimal.js'
import { Package, Truck, CheckCircle2, XCircle, Circle } from 'lucide-react'
import { OutlineButton } from '@modett/ui'
import { cn } from '@/lib/utils'
import {
  useOrder,
  useSubmitReturn,
  RETURN_POLICY_VERSION,
  type OrderEventRow,
  type OrderItemRow,
} from '@/hooks/useAccount'
import { useSession } from '@/hooks/useSession'
import { Analytics } from '@/lib/analytics'
import type { ApiError } from '@/types'
import { ORDER_EVENT_LABELS, orderEventDotClass } from '@/lib/orderDisplay'

const RETURN_REASONS = [
  'Item does not fit',
  'Item not as described',
  'Received wrong item',
  'Item damaged on arrival',
  'Changed my mind',
  'Other',
] as const

function formatPlacedLong(iso: string): string {
  return new Date(iso).toLocaleString('en-GB', {
    day:         'numeric',
    month:       'long',
    year:        'numeric',
    hour:        'numeric',
    minute:      '2-digit',
    hour12:      true,
  })
}

function formatAmountPlain(amount: string): string {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function formatFulfilledDate(events: OrderEventRow[]): string | null {
  const delivered = [...events]
    .filter((e) => e.event_type === 'DELIVERED')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .pop()
  if (!delivered) return null
  return new Date(delivered.created_at).toLocaleString('en-GB', {
    day:         'numeric',
    month:       'long',
    year:        'numeric',
  })
}

function buildSku(snap: Record<string, unknown>): string {
  const code  = String(snap.product_code ?? '').trim()
  const size  = String(snap.size ?? '').replace(/\s+/g, '')
  const color = String(snap.color ?? snap.colour ?? '').replace(/\s+/g, '')
  return [code, size, color].filter(Boolean).join('-')
}

function sizeColourLine(snap: Record<string, unknown>): string {
  const color = String(snap.color ?? snap.colour ?? '').trim()
  const size  = String(snap.size ?? '').trim()
  if (size && color) return `${size} / ${color}`
  if (size) return size
  if (color) return color
  return ''
}

export default function AccountOrderDetailPage() {
  const params   = useParams<{ orderRef: string }>()
  const orderKey = decodeURIComponent(params.orderRef ?? '')
  const { data, isLoading, error } = useOrder(orderKey)
  const submitReturn = useSubmitReturn()
  const { user }     = useSession()

  const [showReturnForm, setShowReturnForm] = useState(false)
  const [selectedItems, setSelectedItems] = useState<Record<string, number>>({})
  const [reason, setReason] = useState<string>(RETURN_REASONS[0]!)
  const [returnType, setReturnType] = useState<'REFUND' | 'EXCHANGE'>('REFUND')
  const [confirmedUnworn, setConfirmedUnworn] = useState(false)
  const [formMessage, setFormMessage]   = useState<string | null>(null)
  const [formError, setFormError]       = useState<string | null>(null)

  const orderRow = data?.order as Record<string, unknown> | undefined
  const items     = data?.items ?? []
  const addresses = data?.addresses ?? []

  const shipping = addresses.find((a) => a.kind === 'SHIPPING')

  const eligibleUntil = useMemo(() => {
    if (!data?.events) return null
    return returnEligibleUntil(data.events)
  }, [data])

  const canRequestReturn =
    orderRow?.fulfillment_state === 'DELIVERED'
    && orderRow?.return_state === 'NONE'
    && eligibleUntil != null
    && new Date() < eligibleUntil

  const fulfilledOn =
    orderRow?.fulfillment_state === 'DELIVERED' && data?.events
      ? formatFulfilledDate(data.events)
      : null

  if (isLoading) {
    return (
      <div className="animate-pulse space-y-4">
        <div className="h-10 w-64 bg-muted rounded-none" />
        <div className="h-48 bg-muted rounded-none" />
      </div>
    )
  }

  if (error || !data || !orderRow) {
    return (
      <div className="text-center py-16">
        <p className="font-body text-[14px] text-graphite mb-4">
          We couldn&apos;t load this order.
        </p>
        <Link href="/account/orders" className="text-umber underline text-[13px]">
          Back to orders
        </Link>
      </div>
    )
  }

  const orderRefStr = String(orderRow.order_ref)
  const placedAt    = orderRow.placed_at ? String(orderRow.placed_at) : null
  const subtotalFmt = formatAmountPlain(String(orderRow.subtotal))
  const totalFmt    = formatAmountPlain(String(orderRow.total))

  function toggleItem(id: string, maxQty: number, checked: boolean) {
    setSelectedItems((prev) => {
      const next = { ...prev }
      if (!checked) {
        delete next[id]
        return next
      }
      next[id] = Math.min(1, maxQty)
      return next
    })
  }

  function setItemQty(id: string, qty: number, maxQty: number) {
    setSelectedItems((prev) => ({
      ...prev,
      [id]: Math.max(1, Math.min(qty, maxQty)),
    }))
  }

  function handleSubmitReturn() {
    if (!orderRow) return
    const selectedEntries = Object.entries(selectedItems).filter(([, q]) => q > 0)
    setFormMessage(null)
    setFormError(null)
    if (selectedEntries.length === 0) {
      setFormError('Select at least one item to return.')
      return
    }
    if (!confirmedUnworn) {
      setFormError('Please confirm items are unworn with tags attached.')
      return
    }
    const reasonBody = [
      `Return type: ${returnType}.`,
      `Primary reason: ${reason}.`,
      `Items: ${selectedEntries.map(([id, q]) => `${id.slice(0, 8)}… ×${q}`).join(', ')}.`,
    ].join(' ')
    submitReturn.mutate(
      {
        orderId:         String(orderRow.id),
        orderRef:        orderKey,
        type:            returnType,
        reason:          reasonBody.length >= 10 ? reasonBody : `${reasonBody} (details follow)`,
        policyVersion:   RETURN_POLICY_VERSION,
        items:           selectedEntries.map(([orderItemId, qty]) => ({
          orderItemId,
          qty,
        })),
      },
      {
        onSuccess: (result) => {
          const analyticsItems = selectedEntries.map(([orderItemId, qty]) => {
            const row = items.find((i) => i.id === orderItemId)
            const snap = (row?.product_snapshot_json ?? {}) as Record<string, unknown>
            return {
              productId: String(snap.product_id ?? snap.productId ?? ''),
              variantId: String(row?.variant_id ?? ''),
              color:     String(snap.color ?? snap.colour ?? ''),
              size:      String(snap.size ?? ''),
              qty,
            }
          })
          Analytics.returnSubmitted({
            returnRequestId: result.returnRequest.id,
            orderId:         String(orderRow.id),
            reason,
            items:           analyticsItems,
            userId:          user?.id,
          })
          setFormMessage(
            'Return request submitted successfully. We\'ll be in touch within 2 business days.',
          )
          setShowReturnForm(false)
          setSelectedItems({})
          setConfirmedUnworn(false)
        },
        onError: (err) => {
          const apiErr = err as unknown as ApiError
          if (apiErr.status === 409) {
            setFormError(apiErr.message ?? 'A return already exists for this order.')
            return
          }
          if (apiErr.status === 422) {
            setFormError(apiErr.message ?? 'This order is not eligible for a return.')
            return
          }
          setFormError(apiErr.message ?? 'Something went wrong. Please try again.')
        },
      },
    )
  }

  return (
    <div>
      <Link
        href="/account/orders"
        className="font-body font-light text-[12px] uppercase tracking-[0.15em] text-umber hover:text-graphite mb-6 inline-flex items-center gap-1"
      >
        <ChevronLeft className="w-3 h-3 shrink-0" aria-hidden />
        Back to orders
      </Link>

      <h1 className="font-display font-bold text-[22px] text-graphite">
        ORDER {orderRefStr}
      </h1>
      <p className="font-body font-light text-[13px] text-graphite mt-1">
        {placedAt ? `Placed on ${formatPlacedLong(placedAt)}` : '—'}
      </p>

      <div className="mt-10 space-y-10">
        <section>
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-muted">
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber py-3 pr-2 text-left">
                    Product
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber py-3 px-2 text-left">
                    SKU
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber py-3 px-2 text-right">
                    Price
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber py-3 px-2 text-right">
                    Quantity
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-umber py-3 pl-2 text-right">
                    Total
                  </th>
                </tr>
              </thead>
              <tbody>
                {items.map((item) => (
                  <OrderItemTableRow
                    key={item.id}
                    item={item}
                    fulfilledOn={fulfilledOn}
                  />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-6">
            {items.map((item) => (
              <OrderItemMobile key={item.id} item={item} fulfilledOn={fulfilledOn} />
            ))}
          </div>

          <div className="max-w-xs ml-auto mt-8 space-y-2 text-right">
            <div className="flex justify-end gap-8 font-body font-light text-[13px] text-umber">
              <span>Subtotal</span>
              <span className="tabular-nums text-graphite">{subtotalFmt}</span>
            </div>
            <div className="flex justify-end gap-8 font-body font-bold text-[14px] text-graphite">
              <span>Total</span>
              <span className="tabular-nums">{totalFmt}</span>
            </div>
          </div>
        </section>

        {shipping && (
          <section>
            <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber mb-3">
              Delivery address
            </h2>
            <AddressBlock json={shipping.address_json} countryCode={shipping.country_code} />
          </section>
        )}

        {canRequestReturn && (
          <section>
            {!showReturnForm ? (
              <OutlineButton
                type="button"
                variant="default"
                className="border-umber text-umber rounded-none"
                onClick={() => {
                  setShowReturnForm(true)
                  setFormError(null)
                  setFormMessage(null)
                }}
              >
                Request Return
              </OutlineButton>
            ) : (
              <div className="border border-muted p-6 space-y-6">
                <h3 className="font-display font-bold text-[18px] text-umber">
                  Return request
                </h3>

                <div>
                  <p className="font-body font-light text-[12px] text-umber mb-2">
                    Select items & quantities
                  </p>
                  <ul className="space-y-3">
                    {items.map((item) => {
                      const checked = selectedItems[item.id] != null && selectedItems[item.id]! > 0
                      return (
                        <li key={item.id} className="flex flex-wrap items-center gap-3">
                          <label className="flex items-center gap-2 cursor-pointer">
                            <input
                              type="checkbox"
                              checked={checked}
                              onChange={(e) =>
                                toggleItem(item.id, item.qty, e.target.checked)}
                              className="accent-umber"
                            />
                            <span className="font-body text-[13px] text-umber">
                              {snapshotTitle(item.product_snapshot_json)} — max {item.qty}
                            </span>
                          </label>
                          {checked && (
                            <select
                              value={selectedItems[item.id] ?? 1}
                              onChange={(e) =>
                                setItemQty(item.id, Number(e.target.value), item.qty)}
                              className="h-9 border border-muted px-2 font-body text-[13px] text-umber bg-background rounded-none"
                            >
                              {Array.from({ length: item.qty }, (_, i) => i + 1).map(
                                (n) => (
                                  <option key={n} value={n}>
                                    {n}
                                  </option>
                                ),
                              )}
                            </select>
                          )}
                        </li>
                      )
                    })}
                  </ul>
                </div>

                <div>
                  <label className="font-body font-light text-[12px] text-umber block mb-2">
                    Reason
                  </label>
                  <select
                    value={reason}
                    onChange={(e) => setReason(e.target.value)}
                    className="w-full h-12 border border-muted px-4 font-body text-[14px] text-umber bg-background rounded-none"
                  >
                    {RETURN_REASONS.map((r) => (
                      <option key={r} value={r}>
                        {r}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <p className="font-body font-light text-[12px] text-umber mb-2">
                    Return type
                  </p>
                  <label className="flex items-center gap-2 mb-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rtype"
                      checked={returnType === 'REFUND'}
                      onChange={() => setReturnType('REFUND')}
                      className="accent-umber"
                    />
                    <span className="font-body text-[13px] text-umber">
                      Refund to original payment method
                    </span>
                  </label>
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="radio"
                      name="rtype"
                      checked={returnType === 'EXCHANGE'}
                      onChange={() => setReturnType('EXCHANGE')}
                      className="accent-umber"
                    />
                    <span className="font-body text-[13px] text-umber">
                      Exchange for different size/colour
                    </span>
                  </label>
                </div>

                <div>
                  <p className="font-body font-light text-[13px] text-umber mb-3">
                    Items must be unworn with tags attached. Returns accepted within 30 days
                    of delivery.
                  </p>
                  <label className="flex items-start gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={confirmedUnworn}
                      onChange={(e) => setConfirmedUnworn(e.target.checked)}
                      className="accent-umber mt-1"
                    />
                    <span className="font-body text-[13px] text-umber">
                      I confirm these items are unworn with tags attached
                    </span>
                  </label>
                </div>

                {formError && (
                  <p className="font-body text-[12px] text-red-500">{formError}</p>
                )}

                <div className="flex flex-wrap gap-3">
                  <button
                    type="button"
                    disabled={submitReturn.isPending}
                    onClick={handleSubmitReturn}
                    className={cn(
                      'h-11 px-8 bg-deep text-background rounded-none',
                      'font-body font-light uppercase tracking-[0.2em] text-[12px]',
                      'hover:bg-ink transition-colors disabled:opacity-40',
                    )}
                  >
                    {submitReturn.isPending ? 'Submitting…' : 'Submit Return Request'}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setShowReturnForm(false)
                      setSelectedItems({})
                      setFormError(null)
                    }}
                    className="font-body font-light text-[12px] text-umber hover:text-graphite"
                  >
                    Cancel
                  </button>
                </div>
              </div>
            )}
          </section>
        )}

        {formMessage && (
          <p className="font-body text-[13px] text-[#4A7C59]">{formMessage}</p>
        )}

        <section>
          <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-umber mb-4">
            Timeline
          </h2>
          <ol className="space-y-3 border-l border-muted pl-3 ml-1">
            {data.events.map((ev) => (
              <li key={ev.id} className="relative">
                <span
                  className={cn(
                    'absolute -left-[17px] top-1 w-1.5 h-1.5 rounded-full',
                    orderEventDotClass(ev.event_type),
                  )}
                />
                <div className="flex items-center gap-2">
                  <TimelineIcon type={ev.event_type} />
                  <span className="font-body text-[13px] text-graphite">
                    {ORDER_EVENT_LABELS[ev.event_type] ?? ev.event_type}
                  </span>
                </div>
                <p className="font-body font-light text-[11px] text-graphite mt-0.5">
                  {new Date(ev.created_at).toLocaleString('en-GB')}
                </p>
              </li>
            ))}
          </ol>
        </section>
      </div>
    </div>
  )
}

function OrderItemTableRow({
  item,
  fulfilledOn,
}: {
  item: OrderItemRow
  fulfilledOn: string | null
}) {
  const snap  = item.product_snapshot_json
  const title = snapshotTitle(snap)
  const slug  = String(snap.slug ?? '')
  const sku   = buildSku(snap)
  const line2 = sizeColourLine(snap)
  const unit  = formatAmountPlain(item.unit_price_snapshot_amount)
  const total = new Decimal(item.unit_price_snapshot_amount).times(item.qty).toFixed(2)
  const totalFmt = formatAmountPlain(total)

  const nameInner = slug ? (
    <Link
      href={`/products/${encodeURIComponent(slug)}`}
      className="font-body text-[13px] text-graphite underline underline-offset-2 hover:text-ink"
    >
      {title}
    </Link>
  ) : (
    <span className="font-body text-[13px] text-graphite">{title}</span>
  )

  return (
    <tr className="border-b border-muted last:border-0 align-top">
      <td className="py-4 pr-2 max-w-[220px]">
        <div className="space-y-1">
          {nameInner}
          {line2 && (
            <p className="font-body font-light text-[12px] text-umber">{line2}</p>
          )}
          {fulfilledOn && (
            <p className="font-body font-light text-[12px] text-umber">
              Fulfilled on {fulfilledOn}
            </p>
          )}
        </div>
      </td>
      <td className="py-4 px-2 font-body font-light text-[12px] text-umber whitespace-nowrap">
        {sku || '—'}
      </td>
      <td className="py-4 px-2 font-body font-light text-[13px] text-graphite text-right tabular-nums">
        {unit}
      </td>
      <td className="py-4 px-2 font-body font-light text-[13px] text-graphite text-right">
        {item.qty}
      </td>
      <td className="py-4 pl-2 font-body text-[13px] text-graphite text-right tabular-nums">
        {totalFmt}
      </td>
    </tr>
  )
}

function OrderItemMobile({
  item,
  fulfilledOn,
}: {
  item: OrderItemRow
  fulfilledOn: string | null
}) {
  const snap  = item.product_snapshot_json
  const title = snapshotTitle(snap)
  const slug  = String(snap.slug ?? '')
  const line2 = sizeColourLine(snap)
  const unit  = formatAmountPlain(item.unit_price_snapshot_amount)
  const total = new Decimal(item.unit_price_snapshot_amount).times(item.qty).toFixed(2)
  const totalFmt = formatAmountPlain(total)

  const nameInner = slug ? (
    <Link
      href={`/products/${encodeURIComponent(slug)}`}
      className="font-body text-[13px] text-graphite underline underline-offset-2"
    >
      {title}
    </Link>
  ) : (
    <span className="font-body text-[13px] text-graphite">{title}</span>
  )

  return (
    <div className="border-b border-muted pb-6 space-y-2">
      {nameInner}
      {line2 && (
        <p className="font-body font-light text-[12px] text-umber">{line2}</p>
      )}
      {fulfilledOn && (
        <p className="font-body font-light text-[12px] text-umber">
          Fulfilled on {fulfilledOn}
        </p>
      )}
      <p className="font-body font-light text-[13px] text-graphite">
        {unit} × {item.qty} = {totalFmt}
      </p>
    </div>
  )
}

function snapshotTitle(snap: Record<string, unknown>): string {
  return String(
    snap.display_name ?? snap.displayName ?? snap.short_name ?? snap.name ?? 'Item',
  )
}

function returnEligibleUntil(events: OrderEventRow[]): Date | null {
  const delivered = [...events]
    .filter((e) => e.event_type === 'DELIVERED')
    .sort((a, b) => new Date(a.created_at).getTime() - new Date(b.created_at).getTime())
    .pop()
  if (!delivered) return null
  const d = new Date(delivered.created_at)
  d.setDate(d.getDate() + 30)
  return d
}

function AddressBlock({
  json,
  countryCode,
}: {
  json: Record<string, unknown>
  countryCode: string
}) {
  const line1 = String(json.line1 ?? json.addressLine1 ?? '')
  const line2 = String(json.line2 ?? json.addressLine2 ?? json.unit ?? '')
  const city  = String(json.city ?? '')
  const pc    = String(json.postal_code ?? json.postcode ?? '')
  return (
    <div className="font-body font-light text-[13px] text-graphite space-y-1">
      {line1 && <p>{line1}</p>}
      {line2 && <p>{line2}</p>}
      <p>
        {city}
        {city && pc && ', '}
        {pc}
      </p>
      <p>{countryCode}</p>
    </div>
  )
}

function TimelineIcon({ type }: { type: string }) {
  if (type === 'PAYMENT_FAILED' || type === 'CANCELLED') {
    return <XCircle className="w-3.5 h-3.5 text-red-400 shrink-0" aria-hidden />
  }
  if (type === 'DELIVERED') {
    return <CheckCircle2 className="w-3.5 h-3.5 text-[#4A7C59] shrink-0" aria-hidden />
  }
  if (type === 'SHIPPED' || type === 'PACKED') {
    return <Truck className="w-3.5 h-3.5 text-umber shrink-0" aria-hidden />
  }
  if (type === 'ORDER_PLACED' || type === 'PAYMENT_CONFIRMED') {
    return <Package className="w-3.5 h-3.5 text-umber shrink-0" aria-hidden />
  }
  return <Circle className="w-3.5 h-3.5 text-umber shrink-0" aria-hidden />
}
