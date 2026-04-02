/**
 * Admin notification summary + merged feed.
 */

import {
  queryAdminNotificationSummary,
  queryAdminNotificationFeedLowStock,
  queryAdminNotificationFeedNewReturns,
  queryAdminNotificationFeedFlaggedReviews,
  queryAdminNotificationFeedPendingOrders,
  type AdminNotificationFeedAlert,
} from '@modett/db'

export async function getAdminNotificationsSummary() {
  const row = await queryAdminNotificationSummary()
  const total =
    row.low_stock +
    row.out_of_stock +
    row.new_returns +
    row.flagged_reviews +
    row.unresolved_drift +
    row.pending_orders
  return {
    lowStock: row.low_stock,
    outOfStock: row.out_of_stock,
    newReturns: row.new_returns,
    flaggedReviews: row.flagged_reviews,
    unresolvedDrift: row.unresolved_drift,
    pendingOrders: row.pending_orders,
    total,
  }
}

export async function getAdminNotificationsFeed({ limit }: { limit: number }) {
  const summary = await getAdminNotificationsSummary()
  const [lowStock, newReturns, flagged, pending] = await Promise.all([
    queryAdminNotificationFeedLowStock(),
    queryAdminNotificationFeedNewReturns(),
    queryAdminNotificationFeedFlaggedReviews(),
    queryAdminNotificationFeedPendingOrders(),
  ])

  const alerts = [
    ...lowStock.map((a: AdminNotificationFeedAlert) => ({
      type: a.type,
      message: a.message,
      entityRef: a.entity_id,
      href: a.href,
      timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : String(a.timestamp),
      isRead: false as const,
    })),
    ...newReturns.map((a: AdminNotificationFeedAlert) => ({
      type: a.type,
      message: a.message,
      entityRef: a.entity_id,
      href: a.href,
      timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : String(a.timestamp),
      isRead: false as const,
    })),
    ...flagged.map((a: AdminNotificationFeedAlert) => ({
      type: a.type,
      message: a.message,
      entityRef: a.entity_id,
      href: a.href,
      timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : String(a.timestamp),
      isRead: false as const,
    })),
    ...pending.map((a: AdminNotificationFeedAlert) => ({
      type: a.type,
      message: a.message,
      entityRef: a.entity_id,
      href: a.href,
      timestamp: a.timestamp instanceof Date ? a.timestamp.toISOString() : String(a.timestamp),
      isRead: false as const,
    })),
  ]

  alerts.sort(
    (a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime(),
  )

  return {
    alerts: alerts.slice(0, limit),
    summary,
  }
}
