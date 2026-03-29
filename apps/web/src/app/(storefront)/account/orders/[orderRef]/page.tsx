'use client'

import { useState, useMemo } from 'react'
import Image from 'next/image'
import Link from 'next/link'
import { useParams } from 'next/navigation'
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
import { formatMoney } from '@/hooks/useCurrency'
import type { ApiError, CurrencyCode } from '@/types'
import { getOrderStatusBadge, orderBadgeClassName, ORDER_EVENT_LABELS, orderEventDotClass } from '@/lib/orderDisplay'
import { productImagePlaceholderUrl } from '@/lib/assets'

const RETURN_REASONS = [
  'Item does not fit',
  'Item not as described',
  'Received wrong item',
  'Item damaged on arrival',
  'Changed my mind',
  'Other',
] as const

export default function AccountOrderDetailPage() {
  const params   = useParams<{ orderRef: string }>()
  const orderKey = decodeURIComponent(params.orderRef ?? '')
  const { data, isLoading, error } = useOrder(orderKey)
  const submitReturn = useSubmitReturn()

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
        <p className="font-body text-[14px] text-muted-foreground mb-4">
          We couldn&apos;t load this order.
        </p>
        <Link href="/account/orders" className="text-umber underline text-[13px]">
          Back to orders
        </Link>
      </div>
    )
  }

  const badge = getOrderStatusBadge({
    order_state:       String(orderRow.order_state),
    payment_state:     String(orderRow.payment_state),
    fulfillment_state: String(orderRow.fulfillment_state),
  })
  const cur = String(orderRow.currency) as CurrencyCode

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
        onSuccess: () => {
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
        className="font-body font-light text-[12px] text-muted-foreground hover:text-umber mb-6 inline-block"
      >
        ← Orders
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-8">
        <div>
          <h1 className="font-display font-bold text-[24px] text-umber">
            {String(orderRow.order_ref)}
          </h1>
          <p className="font-body font-light text-[13px] text-muted-foreground mt-1">
            {orderRow.placed_at
              ? new Date(String(orderRow.placed_at)).toLocaleString('en-GB')
              : '—'}
          </p>
        </div>
        <span className={orderBadgeClassName(badge.className)}>{badge.label}</span>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 lg:gap-12">
        <div className="lg:col-span-2 space-y-8">
          <section>
            <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Items
            </h2>
            <ul className="space-y-6">
              {items.map((item) => (
                <OrderLineItem key={item.id} item={item} currency={cur} />
              ))}
            </ul>
          </section>

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
                    <p className="font-body font-light text-[13px] text-muted-foreground mb-3">
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
                      className="font-body font-light text-[12px] text-muted-foreground hover:text-umber"
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
            <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Timeline
            </h2>
            <ol className="space-y-4 border-l border-muted pl-4 ml-2">
              {data.events.map((ev) => (
                <li key={ev.id} className="relative">
                  <span
                    className={cn(
                      'absolute -left-[21px] top-1 w-2.5 h-2.5 rounded-full',
                      orderEventDotClass(ev.event_type),
                    )}
                  />
                  <div className="flex items-center gap-2">
                    <TimelineIcon type={ev.event_type} />
                    <span className="font-body text-[14px] text-umber">
                      {ORDER_EVENT_LABELS[ev.event_type] ?? ev.event_type}
                    </span>
                  </div>
                  <p className="font-body font-light text-[12px] text-muted-foreground mt-1">
                    {new Date(ev.created_at).toLocaleString('en-GB')}
                  </p>
                </li>
              ))}
            </ol>
          </section>
        </div>

        <div className="space-y-6">
          <div className="border border-muted p-6">
            <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-4">
              Summary
            </h2>
            <dl className="space-y-2 font-body text-[13px] text-umber">
              <div className="flex justify-between gap-4">
                <dt className="font-light text-muted-foreground">Subtotal</dt>
                <dd>{formatMoney({ amount: String(orderRow.subtotal), currency: cur })}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-light text-muted-foreground">Shipping</dt>
                <dd>
                  {formatMoney({ amount: String(orderRow.shipping_cost), currency: cur })}
                </dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="font-light text-muted-foreground">Tax</dt>
                <dd>{formatMoney({ amount: String(orderRow.tax_amount), currency: cur })}</dd>
              </div>
              <div className="flex justify-between gap-4 pt-2 border-t border-muted font-medium">
                <dt>Total</dt>
                <dd>{formatMoney({ amount: String(orderRow.total), currency: cur })}</dd>
              </div>
            </dl>
            <p className="font-body font-light text-[12px] text-muted-foreground mt-4">
              Payment: Paid via Modett Checkout
            </p>
          </div>

          {shipping && (
            <div className="border border-muted p-6">
              <h2 className="font-body font-light text-[11px] uppercase tracking-[0.2em] text-muted-foreground mb-3">
                Shipping address
              </h2>
              <AddressBlock json={shipping.address_json} countryCode={shipping.country_code} />
            </div>
          )}
        </div>
      </div>
    </div>
  )
}

function OrderLineItem({
  item,
  currency,
}: {
  item: OrderItemRow
  currency: CurrencyCode
}) {
  const snap = item.product_snapshot_json
  const title = snapshotTitle(snap)
  const color = String(snap.color ?? snap.colour ?? '')
  const size  = String(snap.size ?? '')
  const img   = String(snap.imageUrl ?? snap.image_url ?? '')

  return (
    <li className="flex gap-4">
      <div className="relative w-20 h-28 bg-muted shrink-0">
        <Image
          src={img || productImagePlaceholderUrl}
          alt={title}
          fill
          className="object-cover"
          sizes="80px"
        />
      </div>
      <div>
        <p className="font-body font-medium text-[14px] text-umber">{title}</p>
        <p className="font-body font-light text-[13px] text-muted-foreground mt-1">
          {color && `${color}`}
          {color && size && ' · '}
          {size && `Size ${size}`}
        </p>
        <p className="font-body font-light text-[13px] text-umber mt-2">
          Qty {item.qty} ·{' '}
          {formatMoney({
            amount: item.unit_price_snapshot_amount,
            currency,
          })}{' '}
          each
        </p>
      </div>
    </li>
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
    <div className="font-body font-light text-[13px] text-muted-foreground space-y-1">
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
    return <XCircle className="w-4 h-4 text-red-400 shrink-0" aria-hidden />
  }
  if (type === 'DELIVERED') {
    return <CheckCircle2 className="w-4 h-4 text-[#4A7C59] shrink-0" aria-hidden />
  }
  if (type === 'SHIPPED' || type === 'PACKED') {
    return <Truck className="w-4 h-4 text-umber shrink-0" aria-hidden />
  }
  if (type === 'ORDER_PLACED' || type === 'PAYMENT_CONFIRMED') {
    return <Package className="w-4 h-4 text-umber shrink-0" aria-hidden />
  }
  return <Circle className="w-4 h-4 text-muted-foreground shrink-0" aria-hidden />
}
