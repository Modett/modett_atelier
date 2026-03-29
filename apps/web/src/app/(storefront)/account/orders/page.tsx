'use client'

import { useState, useEffect } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { cn } from '@/lib/utils'
import { useOrders, type OrderSummaryRow } from '@/hooks/useAccount'
import { formatMoney } from '@/hooks/useCurrency'
import type { CurrencyCode } from '@/types'
import { getOrderStatusBadge, orderBadgeClassName } from '@/lib/orderDisplay'

export default function AccountOrdersPage() {
  const router = useRouter()
  const [page, setPage] = useState(1)
  const [rows, setRows] = useState<OrderSummaryRow[]>([])
  const { data, isLoading, isFetching } = useOrders(page)

  useEffect(() => {
    if (!data?.orders) return
    if (page === 1) {
      setRows(data.orders)
      return
    }
    setRows((prev) => [...prev, ...data.orders])
  }, [data, page])

  const hasMore = data ? page * data.limit < data.total : false

  if (isLoading && page === 1 && rows.length === 0) {
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
        Orders
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
          <div className="hidden md:block border border-muted">
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-muted bg-surface-raised/30">
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground px-4 py-3">
                    Order
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground px-4 py-3">
                    Date
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground px-4 py-3">
                    Items
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground px-4 py-3">
                    Total
                  </th>
                  <th className="font-body font-light text-[11px] uppercase tracking-[0.15em] text-muted-foreground px-4 py-3">
                    Status
                  </th>
                </tr>
              </thead>
              <tbody>
                {rows.map((o) => {
                  const badge = getOrderStatusBadge(o)
                  const cur   = o.currency as CurrencyCode
                  const href  = `/account/orders/${encodeURIComponent(o.order_ref)}`
                  return (
                    <tr
                      key={o.id}
                      role="link"
                      tabIndex={0}
                      onClick={() => router.push(href)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') router.push(href)
                      }}
                      className="border-b border-muted last:border-0 cursor-pointer hover:bg-surface-raised/50 transition-colors"
                    >
                      <td className="px-4 py-3 font-body text-[13px] text-umber">
                        {o.order_ref}
                      </td>
                      <td className="px-4 py-3 font-body font-light text-[13px] text-muted-foreground">
                        {o.placed_at
                          ? new Date(o.placed_at).toLocaleDateString('en-GB')
                          : '—'}
                      </td>
                      <td className="px-4 py-3 font-body font-light text-[13px] text-umber">
                        {o.item_count}
                      </td>
                      <td className="px-4 py-3 font-body text-[13px] text-umber">
                        {formatMoney({ amount: o.total, currency: cur })}
                      </td>
                      <td className="px-4 py-3">
                        <span className={orderBadgeClassName(badge.className)}>
                          {badge.label}
                        </span>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>

          <div className="md:hidden space-y-3">
            {rows.map((o) => {
              const badge = getOrderStatusBadge(o)
              const cur   = o.currency as CurrencyCode
              const href  = `/account/orders/${encodeURIComponent(o.order_ref)}`
              return (
                <Link
                  key={o.id}
                  href={href}
                  className="block border border-muted p-4 hover:bg-surface-raised/40 transition-colors"
                >
                  <div className="flex justify-between gap-2">
                    <span className="font-body font-medium text-[14px] text-umber">
                      {o.order_ref}
                    </span>
                    <span className={orderBadgeClassName(badge.className)}>
                      {badge.label}
                    </span>
                  </div>
                  <p className="font-body font-light text-[12px] text-muted-foreground mt-2">
                    {o.placed_at
                      ? new Date(o.placed_at).toLocaleDateString('en-GB')
                      : '—'}
                  </p>
                  <p className="font-body text-[14px] text-umber mt-2">
                    {formatMoney({ amount: o.total, currency: cur })}
                  </p>
                </Link>
              )
            })}
          </div>

          {hasMore && (
            <button
              type="button"
              disabled={isFetching}
              onClick={() => setPage((p) => p + 1)}
              className={cn(
                'mt-8 w-full md:w-auto h-11 px-10 border border-umber text-umber',
                'font-body font-light uppercase tracking-[0.25em] text-[12px] rounded-none',
                'hover:bg-umber hover:text-background transition-all duration-200',
                'disabled:opacity-40',
              )}
            >
              {isFetching ? 'Loading…' : 'Load more'}
            </button>
          )}
        </>
      )}
    </div>
  )
}
