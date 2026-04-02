/**
 * Admin notification summary counts and feed fragments.
 */

import { sql } from 'drizzle-orm'
import { db } from '../client'

export interface AdminNotificationSummaryRow {
  low_stock: number
  out_of_stock: number
  new_returns: number
  flagged_reviews: number
  unresolved_drift: number
  pending_orders: number
}

export async function queryAdminNotificationSummary(): Promise<AdminNotificationSummaryRow> {
  const result = await db.execute(sql`
    SELECT
      (SELECT COUNT(*)::int FROM inventory.variant_availability WHERE stock_status = 'LOW_STOCK') AS low_stock,
      (SELECT COUNT(*)::int FROM inventory.variant_availability WHERE stock_status = 'OUT_OF_STOCK') AS out_of_stock,
      (SELECT COUNT(*)::int FROM returns.return_requests
        WHERE status = 'SUBMITTED' AND created_at >= now() - interval '24 hours') AS new_returns,
      (SELECT COUNT(*)::int FROM reviews.review_flags WHERE resolved_at IS NULL) AS flagged_reviews,
      (SELECT COUNT(*)::int FROM inventory.inventory_reconciliation_log WHERE resolved_at IS NULL) AS unresolved_drift,
      (SELECT COUNT(*)::int FROM orders.orders
        WHERE fulfillment_state = 'NOT_STARTED' AND payment_state = 'PAID') AS pending_orders
  `)
  const row = result.rows[0] as Record<string, unknown> | undefined
  return {
    low_stock: Number(row?.low_stock ?? 0),
    out_of_stock: Number(row?.out_of_stock ?? 0),
    new_returns: Number(row?.new_returns ?? 0),
    flagged_reviews: Number(row?.flagged_reviews ?? 0),
    unresolved_drift: Number(row?.unresolved_drift ?? 0),
    pending_orders: Number(row?.pending_orders ?? 0),
  }
}

export interface AdminNotificationFeedAlert {
  type: string
  message: string
  entity_id: string
  href: string
  timestamp: Date
}

export async function queryAdminNotificationFeedLowStock(): Promise<
  AdminNotificationFeedAlert[]
> {
  const result = await db.execute(sql`
    SELECT
      'LOW_STOCK' AS type,
      CONCAT(p.display_name, ' — ', pv.color, ' / ', pv.size,
        ' (', vs.available_qty::text, ' left)') AS message,
      pv.id::text AS entity_id,
      '/admin/inventory' AS href,
      vs.updated_at AS timestamp
    FROM inventory.variant_stock vs
    INNER JOIN inventory.product_variants pv ON pv.id = vs.variant_id AND pv.deleted_at IS NULL
    INNER JOIN catalog.products p ON p.id = pv.product_id AND p.deleted_at IS NULL
    WHERE vs.available_qty > 0
      AND vs.available_qty <= vs.low_stock_threshold
    ORDER BY vs.available_qty ASC
    LIMIT 5
  `)
  return (result.rows ?? []) as unknown as AdminNotificationFeedAlert[]
}

export async function queryAdminNotificationFeedNewReturns(): Promise<
  AdminNotificationFeedAlert[]
> {
  const result = await db.execute(sql`
    SELECT
      'NEW_RETURN' AS type,
      CONCAT('Return submitted — ', o.order_ref) AS message,
      rr.id::text AS entity_id,
      '/admin/returns' AS href,
      rr.created_at AS timestamp
    FROM returns.return_requests rr
    INNER JOIN orders.orders o ON o.id = rr.order_id
    WHERE rr.status = 'SUBMITTED'
      AND rr.created_at >= now() - interval '24 hours'
    ORDER BY rr.created_at DESC
    LIMIT 5
  `)
  return (result.rows ?? []) as unknown as AdminNotificationFeedAlert[]
}

export async function queryAdminNotificationFeedFlaggedReviews(): Promise<
  AdminNotificationFeedAlert[]
> {
  const result = await db.execute(sql`
    SELECT
      'FLAGGED_REVIEW' AS type,
      CONCAT('Review flagged — ', p.display_name) AS message,
      rf.review_id::text AS entity_id,
      '/admin/reviews' AS href,
      rf.created_at AS timestamp
    FROM reviews.review_flags rf
    INNER JOIN reviews.reviews r ON r.id = rf.review_id
    INNER JOIN catalog.products p ON p.id = r.product_id
    WHERE rf.resolved_at IS NULL
    ORDER BY rf.created_at DESC
    LIMIT 5
  `)
  return (result.rows ?? []) as unknown as AdminNotificationFeedAlert[]
}

export async function queryAdminNotificationFeedPendingOrders(): Promise<
  AdminNotificationFeedAlert[]
> {
  const result = await db.execute(sql`
    SELECT
      'PENDING_ORDER' AS type,
      CONCAT('Order pending fulfilment — ', o.order_ref) AS message,
      o.id::text AS entity_id,
      CONCAT('/admin/orders/', o.order_ref) AS href,
      o.created_at AS timestamp
    FROM orders.orders o
    WHERE o.fulfillment_state = 'NOT_STARTED'
      AND o.payment_state = 'PAID'
      AND o.created_at >= now() - interval '48 hours'
    ORDER BY o.created_at ASC
    LIMIT 5
  `)
  return (result.rows ?? []) as unknown as AdminNotificationFeedAlert[]
}
