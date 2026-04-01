'use client'

import Link from 'next/link'
import { Bell } from 'lucide-react'
import { useState } from 'react'
import {
  useAdminNotificationsFeed,
  useAdminNotificationsSummary,
} from '@/hooks/useAdminNotifications'

function formatRelativeTime(ts: string): string {
  const diff = Date.now() - new Date(ts).getTime()
  if (diff < 60_000) return 'just now'
  if (diff < 3_600_000) return `${Math.floor(diff / 60_000)}m ago`
  if (diff < 86_400_000) return `${Math.floor(diff / 3_600_000)}h ago`
  return `${Math.floor(diff / 86_400_000)}d ago`
}

const ICONS: Record<string, string> = {
  LOW_STOCK: '⚠️',
  OUT_OF_STOCK: '🔴',
  NEW_RETURN: '↩️',
  FLAGGED_REVIEW: '🚩',
  PENDING_ORDER: '📦',
}

function SummaryPill({
  label,
  count,
  colour,
  href,
  onClose,
}: {
  label: string
  count: number
  colour: 'red' | 'orange' | 'blue' | 'amber' | 'purple' | 'slate'
  href: string
  onClose: () => void
}) {
  const colours: Record<string, string> = {
    red: 'bg-red-100 text-red-700',
    orange: 'bg-orange-100 text-orange-700',
    blue: 'bg-blue-100 text-blue-700',
    amber: 'bg-amber-100 text-amber-700',
    purple: 'bg-purple-100 text-purple-700',
    slate: 'bg-slate-100 text-slate-700',
  }
  return (
    <Link
      href={href}
      onClick={onClose}
      className={`inline-flex items-center gap-1 rounded-full px-2 py-0.5 text-xs font-medium ${colours[colour]}`}
    >
      <span>{count}</span>
      <span>{label}</span>
    </Link>
  )
}

function AlertRow({
  alert,
  onClose,
}: {
  alert: {
    type: string
    message: string
    href: string
    timestamp: string
  }
  onClose: () => void
}) {
  return (
    <Link
      href={alert.href}
      onClick={onClose}
      className="flex items-start gap-3 px-4 py-3 transition-colors hover:bg-gray-50"
    >
      <span className="mt-0.5 flex-shrink-0 text-base">
        {ICONS[alert.type] ?? '●'}
      </span>
      <div className="min-w-0 flex-1">
        <p className="text-sm leading-snug text-gray-800">{alert.message}</p>
        <p className="mt-0.5 text-xs text-gray-400">
          {formatRelativeTime(alert.timestamp)}
        </p>
      </div>
    </Link>
  )
}

function NotificationPanel({
  feed,
  summary,
  isLoading,
  onClose,
}: {
  feed: Array<{
    type: string
    message: string
    href: string
    timestamp: string
  }>
  summary: {
    outOfStock: number
    lowStock: number
    newReturns: number
    flaggedReviews: number
    pendingOrders: number
    unresolvedDrift: number
    total: number
  } | null
  isLoading: boolean
  onClose: () => void
}) {
  return (
    <div>
      <div className="flex items-center justify-between border-b px-4 py-3">
        <h3 className="text-sm font-semibold text-gray-900">Notifications</h3>
        <span className="text-xs text-gray-500">{summary?.total ?? 0} alerts</span>
      </div>

      <div className="flex flex-wrap gap-2 border-b bg-gray-50 px-4 py-2">
        {(summary?.outOfStock ?? 0) > 0 && (
          <SummaryPill
            label="Out of stock"
            count={summary!.outOfStock}
            colour="red"
            href="/admin/inventory"
            onClose={onClose}
          />
        )}
        {(summary?.lowStock ?? 0) > 0 && (
          <SummaryPill
            label="Low stock"
            count={summary!.lowStock}
            colour="orange"
            href="/admin/inventory"
            onClose={onClose}
          />
        )}
        {(summary?.newReturns ?? 0) > 0 && (
          <SummaryPill
            label="New returns"
            count={summary!.newReturns}
            colour="blue"
            href="/admin/returns"
            onClose={onClose}
          />
        )}
        {(summary?.flaggedReviews ?? 0) > 0 && (
          <SummaryPill
            label="Flagged reviews"
            count={summary!.flaggedReviews}
            colour="amber"
            href="/admin/reviews"
            onClose={onClose}
          />
        )}
        {(summary?.pendingOrders ?? 0) > 0 && (
          <SummaryPill
            label="Pending orders"
            count={summary!.pendingOrders}
            colour="purple"
            href="/admin/orders"
            onClose={onClose}
          />
        )}
        {(summary?.unresolvedDrift ?? 0) > 0 && (
          <SummaryPill
            label="Stock drift"
            count={summary!.unresolvedDrift}
            colour="slate"
            href="/admin/inventory"
            onClose={onClose}
          />
        )}
      </div>

      <div className="max-h-80 divide-y divide-gray-100 overflow-y-auto">
        {isLoading && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            Loading...
          </div>
        )}
        {!isLoading && feed.length === 0 && (
          <div className="px-4 py-6 text-center text-sm text-gray-400">
            All clear — no alerts right now.
          </div>
        )}
        {!isLoading &&
          feed.map((alert) => (
            <AlertRow key={`${alert.type}-${alert.timestamp}-${alert.message}`} alert={alert} onClose={onClose} />
          ))}
      </div>

      <div className="border-t px-4 py-3 text-center">
        <Link
          href="/admin"
          onClick={onClose}
          className="text-xs text-blue-600 hover:underline"
        >
          View full dashboard →
        </Link>
      </div>
    </div>
  )
}

export function NotificationBell() {
  const [open, setOpen] = useState(false)
  const { data: summary } = useAdminNotificationsSummary()
  const { data: feedData, isLoading } = useAdminNotificationsFeed(open)

  const total = summary?.total ?? 0
  const feed = feedData?.alerts ?? []
  const panelSummary = feedData?.summary ?? summary ?? null

  return (
    <div className="relative">
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className="relative flex h-8 w-8 items-center justify-center rounded-md transition-colors hover:bg-gray-100"
        aria-label={total > 0 ? `Notifications (${total} unread)` : 'Notifications'}
      >
        <Bell size={18} className="text-gray-600" />
        {total > 0 && (
          <span className="absolute -top-1 -right-1 flex h-4 w-4 items-center justify-center rounded-full bg-red-500 text-[10px] leading-none font-bold text-white">
            {total > 9 ? '9+' : total}
          </span>
        )}
      </button>

      {open && (
        <>
          <button
            type="button"
            aria-label="Close notifications"
            className="fixed inset-0 z-40 cursor-default bg-transparent"
            onClick={() => setOpen(false)}
          />
          <div className="absolute top-10 right-0 z-50 w-80 overflow-hidden rounded-lg border border-gray-200 bg-white shadow-lg">
            <NotificationPanel
              feed={feed}
              summary={panelSummary}
              isLoading={isLoading}
              onClose={() => setOpen(false)}
            />
          </div>
        </>
      )}
    </div>
  )
}
