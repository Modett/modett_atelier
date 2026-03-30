'use client'

import { useState } from 'react'
import Link from 'next/link'
import { ChevronRight } from 'lucide-react'
import { cn } from '@/lib/utils'
import { useOrders, type OrderSummaryRow } from '@/hooks/useAccount'

function formatOrderDate(iso: string | null): string {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-GB', {
    day:         'numeric',
    month:       'short',
    hour:        '2-digit',
    minute:      '2-digit',
  })
}

function formatTotalNumber(amount: string): string {
  const n = Number(amount)
  if (Number.isNaN(n)) return amount
  return n.toLocaleString('en-GB', { minimumFractionDigits: 2, maximumFractionDigits: 2 })
}

function paymentStatusLabel(paymentState: string): string {
  const s = paymentState.toUpperCase()
  if (s === 'PAID' || s === 'CAPTURED' || s === 'SUCCEEDED') return 'Paid'
  if (s === 'FAILED' || s === 'REFUNDED') return 'Failed'
  return 'Pending'
}

function fulfillmentStatusLabel(fulfillmentState: string): string {
  const s = fulfillmentState.toUpperCase()
  if (s === 'DELIVERED') return 'Fulfilled'
  if (s === 'SHIPPED') return 'On its way'
  if (s === 'CANCELLED') return 'Cancelled'
  if (s === 'PACKED' || s === 'PROCESSING') return 'Processing'
  return 'Processing'
}

export default function AccountOrdersPage() {
  const [page, setPage] = useState(1)
  const { data, isLoading, isFetching } = useOrders(page)

  const rows   = data?.orders ?? []
  const limit  = data?.limit ?? 10
  const total  = data?.total ?? 0
  const totalPages = Math.max(1, Math.ceil(total / limit))

  if (isLoading && !data) {
    return (
      <div className="space-y-4 animate-pulse">
        <div className="h-8 w-48 bg-muted rounded-none" />
        <div className="h-40 bg-muted rounded-none" />
      </div>
    )
  }

  return (
    <div>
      <h1 className="font-display font-bold text-[24px] text-umber mb-6">
        Order Details
      </h1>

      {rows.length === 0 ? (
        <div className="text-center py-16 border border-muted px-6">
          <p className="font-body font-light text-[14px] text-muted-foreground mb-6">
            You haven&apos;t placed any orders yet.
          </p>
          <Link
            href="/collections"
            className={cn(
              'inline-flex h-11 px-10 items-center justify-center',
              'bg-deep text-background font-body font-light uppercase tracking-[0.25em] text-[12px]',
              'rounded-none hover:bg-ink transition-colors duration-200',
            )}
          >
            Start Shopping
          </Link>
        </div>
      ) : (
        <>
          <div className="hidden md:block w-full overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-muted">
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground py-3 pr-2 text-left">
                    Order
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground py-3 px-2 text-left">
                    Date
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground py-3 px-2 text-left">
                    Payment status
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground py-3 px-2 text-left">
                    Fulfillment status
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground py-3 px-2 text-right">
                    Total
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground py-3 pl-2 text-right w-[1%] whitespace-nowrap" />
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => (
                  <OrderTableRow key={o.id} o={o} />
                ))}
              </tbody>
            </table>
          </div>

          <div className="md:hidden">
            {rows.map((o) => (
              <OrderMobileRow key={o.id} o={o} />
            ))}
          </div>

          {totalPages > 1 && (
            <nav
              className="mt-8 flex items-center gap-3 font-body text-[13px]"
              aria-label="Order list pages"
            >
              {Array.from({ length: totalPages }, (_, i) => i + 1).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => setPage(p)}
                  disabled={isFetching}
                  className={cn(
                    p === page
                      ? 'text-umber font-medium underline'
                      : 'text-muted-foreground hover:text-umber',
                  )}
                >
                  {p}
                </button>
              ))}
              {page < totalPages && (
                <button
                  type="button"
                  onClick={() => setPage((x) => x + 1)}
                  disabled={isFetching}
                  className="text-muted-foreground hover:text-umber p-0.5"
                  aria-label="Next page"
                >
                  <ChevronRight className="w-4 h-4" />
                </button>
              )}
            </nav>
          )}
        </>
      )}
    </div>
  )
}

function OrderTableRow({ o }: { o: OrderSummaryRow }) {
  const href = `/account/orders/${encodeURIComponent(o.order_ref)}`
  return (
    <tr className="border-b border-muted last:border-0">
      <td className="py-4 pr-2 align-top">
        <Link
          href={href}
          className="font-body text-[13px] text-umber underline underline-offset-2 hover:text-ink"
        >
          {o.order_ref}
        </Link>
      </td>
      <td className="py-4 px-2 font-body font-light text-[13px] text-muted-foreground align-top">
        {formatOrderDate(o.placed_at)}
      </td>
      <td className="py-4 px-2 font-body font-light text-[13px] text-umber align-top">
        {paymentStatusLabel(o.payment_state)}
      </td>
      <td className="py-4 px-2 font-body font-light text-[13px] text-umber align-top">
        {fulfillmentStatusLabel(o.fulfillment_state)}
      </td>
      <td className="py-4 px-2 font-body text-[13px] text-umber text-right align-top tabular-nums">
        {formatTotalNumber(o.total)}
      </td>
      <td className="py-4 pl-2 text-right align-top">
        <Link
          href={href}
          className="font-body font-light text-[13px] text-umber underline underline-offset-2 hover:text-ink whitespace-nowrap"
        >
          View order
        </Link>
      </td>
    </tr>
  )
}

function OrderMobileRow({ o }: { o: OrderSummaryRow }) {
  const href = `/account/orders/${encodeURIComponent(o.order_ref)}`
  return (
    <div className="border-b border-muted py-4">
      <div className="flex justify-between gap-2 items-start">
        <Link
          href={href}
          className="font-body text-[13px] text-umber underline underline-offset-2"
        >
          {o.order_ref}
        </Link>
        <span className="font-body font-light text-[12px] text-umber text-right shrink-0">
          {fulfillmentStatusLabel(o.fulfillment_state)}
        </span>
      </div>
      <p className="font-body font-light text-[12px] text-muted-foreground mt-2">
        {formatOrderDate(o.placed_at)}
      </p>
      <div className="flex justify-end items-center gap-3 mt-2">
        <span className="font-body text-[13px] text-umber tabular-nums">
          {formatTotalNumber(o.total)}
        </span>
        <Link
          href={href}
          className="font-body font-light text-[13px] text-umber underline underline-offset-2"
        >
          View order →
        </Link>
      </div>
    </div>
  )
}
