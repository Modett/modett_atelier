/**
 * Admin reports — reads analytics_aggregates + transactional tables.
 * Never scans raw analytics.events (partitioned).
 */

import { sql } from 'drizzle-orm'
import { db } from '../client'

export type ReportPeriod = '7d' | '30d' | '90d' | '1y'

function periodInterval(period: string): ReturnType<typeof sql.raw> {
  const map: Record<string, string> = {
    '7d':  '7 days',
    '30d': '30 days',
    '90d': '90 days',
    '1y':  '365 days',
  }
  const v = map[period] ?? '30 days'
  return sql.raw(`interval '${v}'`)
}

export interface BestSellerRow {
  id:            string
  display_name:  string
  product_code:  string
  key_image_url: string | null
  units_sold:    string
  revenue:       string
}

export async function getBestAndLeastSellers({
  period,
  limit = 10,
}: {
  period: string
  limit?: number
}): Promise<{ bestSellers: BestSellerRow[]; leastSellers: BestSellerRow[] }> {
  const iv = periodInterval(period)
  const best = await db.execute(sql`
    SELECT p.id, p.display_name, p.product_code, pi.url AS key_image_url,
           SUM(oi.qty)::text AS units_sold,
           SUM(oi.qty * oi.unit_price_snapshot_amount::numeric)::text AS revenue
    FROM orders.order_items oi
    JOIN catalog.products p ON p.id = oi.product_id AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images pi ON pi.id = p.key_image_id
    JOIN orders.orders o ON o.id = oi.order_id
    WHERE o.payment_state = 'PAID'
      AND o.created_at >= now() - ${iv}
    GROUP BY p.id, p.display_name, p.product_code, pi.url
    ORDER BY SUM(oi.qty) DESC
    LIMIT ${limit}
  `)
  const least = await db.execute(sql`
    SELECT p.id, p.display_name, p.product_code, pi.url AS key_image_url,
           SUM(oi.qty)::text AS units_sold,
           SUM(oi.qty * oi.unit_price_snapshot_amount::numeric)::text AS revenue
    FROM orders.order_items oi
    JOIN catalog.products p ON p.id = oi.product_id AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images pi ON pi.id = p.key_image_id
    JOIN orders.orders o ON o.id = oi.order_id
    WHERE o.payment_state = 'PAID'
      AND o.created_at >= now() - ${iv}
    GROUP BY p.id, p.display_name, p.product_code, pi.url
    ORDER BY SUM(oi.qty) ASC
    LIMIT ${limit}
  `)
  return {
    bestSellers:  (best.rows ?? []) as unknown as BestSellerRow[],
    leastSellers: (least.rows ?? []) as unknown as BestSellerRow[],
  }
}

export interface MostViewedRow {
  product_id:   string
  view_count:   string
  display_name: string
  product_code: string
  key_image_url: string | null
}

export async function getMostViewedProducts({
  period,
  limit = 10,
}: {
  period: string
  limit?: number
}): Promise<MostViewedRow[]> {
  const iv = periodInterval(period)
  const result = await db.execute(sql`
    WITH views AS (
      SELECT dimension_json->>'product_id' AS product_id,
             SUM(value::numeric)::text AS view_count
      FROM analytics.analytics_aggregates
      WHERE metric = 'product_views'
        AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
    )
    SELECT v.product_id, v.view_count,
           p.display_name, p.product_code, pi.url AS key_image_url
    FROM views v
    JOIN catalog.products p ON p.id = v.product_id::uuid AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images pi ON pi.id = p.key_image_id
    WHERE v.product_id IS NOT NULL AND v.product_id != ''
    ORDER BY v.view_count::numeric DESC NULLS LAST
    LIMIT ${limit}
  `)
  return (result.rows ?? []) as unknown as MostViewedRow[]
}

export interface CartAbandonmentRow {
  product_id:          string
  display_name:        string
  product_code:        string
  key_image_url:       string | null
  add_to_cart_count:   string
  purchased_count:     string
  abandoned_count:     string
  abandonment_rate_pct: string
}

export async function getCartAbandonment({
  period,
  limit = 10,
}: {
  period: string
  limit?: number
}): Promise<CartAbandonmentRow[]> {
  const iv = periodInterval(period)
  const result = await db.execute(sql`
    WITH add_c AS (
      SELECT dimension_json->>'product_id' AS product_id,
             SUM(value::numeric) AS add_to_cart_count
      FROM analytics.analytics_aggregates
      WHERE metric = 'add_to_cart' AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
    ),
    purch AS (
      SELECT dimension_json->>'product_id' AS product_id,
             SUM(value::numeric) AS purchased_count
      FROM analytics.analytics_aggregates
      WHERE metric = 'purchases' AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
    )
    SELECT a.product_id,
           p.display_name,
           p.product_code,
           pi.url AS key_image_url,
           a.add_to_cart_count::text,
           COALESCE(pu.purchased_count, 0)::text AS purchased_count,
           GREATEST(a.add_to_cart_count - COALESCE(pu.purchased_count, 0), 0)::text AS abandoned_count,
           CASE WHEN a.add_to_cart_count > 0
             THEN ROUND(
               (GREATEST(a.add_to_cart_count - COALESCE(pu.purchased_count, 0), 0) / a.add_to_cart_count) * 100,
               1
             )::text
             ELSE '0'
           END AS abandonment_rate_pct
    FROM add_c a
    LEFT JOIN purch pu ON pu.product_id = a.product_id
    JOIN catalog.products p ON p.id = a.product_id::uuid AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images pi ON pi.id = p.key_image_id
    WHERE a.product_id IS NOT NULL AND a.product_id != ''
    ORDER BY GREATEST(a.add_to_cart_count - COALESCE(pu.purchased_count, 0), 0) DESC
    LIMIT ${limit}
  `)
  return (result.rows ?? []) as unknown as CartAbandonmentRow[]
}

export interface ReturnTopProductRow {
  display_name:  string
  product_code:  string
  key_image_url: string | null
  returned_qty:  string
  return_count:  string
}

export interface ReturnReasonRow {
  reason:     string
  count:      string
  percentage: string
}

export interface ReturnSizeColorRow {
  label: string
  count: string
}

export async function getReturnAnalysis({
  period,
}: {
  period: string
}): Promise<{
  topProducts:    ReturnTopProductRow[]
  reasonBreakdown: ReturnReasonRow[]
  mostReturnedSizes: ReturnSizeColorRow[]
  mostReturnedColors: ReturnSizeColorRow[]
}> {
  const iv = periodInterval(period)
  const topProducts = await db.execute(sql`
    SELECT p.display_name, p.product_code, pi.url AS key_image_url,
           SUM(rri.qty)::text AS returned_qty,
           COUNT(DISTINCT rr.id)::text AS return_count
    FROM returns.return_requests rr
    JOIN returns.return_request_items rri ON rri.return_request_id = rr.id
    JOIN orders.order_items oi ON oi.id = rri.order_item_id
    JOIN catalog.products p ON p.id = oi.product_id AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images pi ON pi.id = p.key_image_id
    WHERE rr.status IN ('APPROVED', 'FULFILLED')
      AND rr.created_at >= now() - ${iv}
    GROUP BY p.id, p.display_name, p.product_code, pi.url
    ORDER BY SUM(rri.qty) DESC
    LIMIT 10
  `)

  const reasonBreakdown = await db.execute(sql`
    SELECT rr.reason,
           COUNT(*)::text AS count,
           ROUND(COUNT(*) * 100.0 / NULLIF(SUM(COUNT(*)) OVER (), 0), 1)::text AS percentage
    FROM returns.return_requests rr
    WHERE rr.status IN ('APPROVED', 'FULFILLED')
      AND rr.created_at >= now() - ${iv}
    GROUP BY rr.reason
    ORDER BY COUNT(*) DESC
  `)

  const sizes = await db.execute(sql`
    SELECT oi.product_snapshot_json->>'size' AS label,
           COUNT(*)::text AS count
    FROM returns.return_request_items rri
    JOIN orders.order_items oi ON oi.id = rri.order_item_id
    JOIN returns.return_requests rr ON rr.id = rri.return_request_id
    WHERE rr.status IN ('APPROVED', 'FULFILLED')
      AND rr.created_at >= now() - ${iv}
    GROUP BY oi.product_snapshot_json->>'size'
    ORDER BY COUNT(*) DESC
  `)

  const colors = await db.execute(sql`
    SELECT COALESCE(oi.product_snapshot_json->>'color', oi.product_snapshot_json->>'colour', '') AS label,
           COUNT(*)::text AS count
    FROM returns.return_request_items rri
    JOIN orders.order_items oi ON oi.id = rri.order_item_id
    JOIN returns.return_requests rr ON rr.id = rri.return_request_id
    WHERE rr.status IN ('APPROVED', 'FULFILLED')
      AND rr.created_at >= now() - ${iv}
    GROUP BY 1
    ORDER BY COUNT(*) DESC
    LIMIT 10
  `)

  return {
    topProducts:        (topProducts.rows ?? []) as unknown as ReturnTopProductRow[],
    reasonBreakdown:    (reasonBreakdown.rows ?? []) as unknown as ReturnReasonRow[],
    mostReturnedSizes:  (sizes.rows ?? []) as unknown as ReturnSizeColorRow[],
    mostReturnedColors: (colors.rows ?? []) as unknown as ReturnSizeColorRow[],
  }
}

export interface TrafficSourceRow {
  source:   string
  sessions: string
}

export async function getTrafficSources({
  period,
}: {
  period: string
}): Promise<TrafficSourceRow[]> {
  const iv = periodInterval(period)
  const result = await db.execute(sql`
    SELECT dimension_json->>'source' AS source,
           SUM(value::numeric)::text AS sessions
    FROM analytics.analytics_aggregates
    WHERE metric = 'traffic_source' AND period = 'daily'
      AND period_start >= now() - ${iv}
    GROUP BY 1
    ORDER BY SUM(value::numeric) DESC NULLS LAST
  `)
  return (result.rows ?? []) as unknown as TrafficSourceRow[]
}

export interface PopularColorsSizesResult {
  purchasedColors: { color: string; units_sold: string }[]
  purchasedSizes:  { size: string; units_sold: string }[]
  viewedColors:    { color: string; select_count: string }[]
  viewedSizes:     { size: string; select_count: string }[]
}

export async function getPopularColorsSizes({
  period,
}: {
  period: string
}): Promise<PopularColorsSizesResult> {
  const iv = periodInterval(period)
  const [purchasedColors, purchasedSizes, viewedColors, viewedSizes] = await Promise.all([
    db.execute(sql`
      SELECT dimension_json->>'color' AS color,
             SUM(value::numeric)::text AS units_sold
      FROM analytics.analytics_aggregates
      WHERE metric = 'purchases' AND period = 'daily'
        AND period_start >= now() - ${iv}
        AND dimension_json->>'color' IS NOT NULL
        AND dimension_json->>'color' != ''
      GROUP BY 1
      ORDER BY SUM(value::numeric) DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT dimension_json->>'size' AS size,
             SUM(value::numeric)::text AS units_sold
      FROM analytics.analytics_aggregates
      WHERE metric = 'purchases' AND period = 'daily'
        AND period_start >= now() - ${iv}
        AND dimension_json->>'size' IS NOT NULL
        AND dimension_json->>'size' != ''
      GROUP BY 1
      ORDER BY SUM(value::numeric) DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT dimension_json->>'color' AS color,
             SUM(value::numeric)::text AS select_count
      FROM analytics.analytics_aggregates
      WHERE metric = 'variant_select_color' AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
      ORDER BY SUM(value::numeric) DESC
      LIMIT 10
    `),
    db.execute(sql`
      SELECT dimension_json->>'size' AS size,
             SUM(value::numeric)::text AS select_count
      FROM analytics.analytics_aggregates
      WHERE metric = 'variant_select_size' AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
      ORDER BY SUM(value::numeric) DESC
      LIMIT 10
    `),
  ])
  return {
    purchasedColors: (purchasedColors.rows ?? []) as unknown as { color: string; units_sold: string }[],
    purchasedSizes:  (purchasedSizes.rows ?? []) as unknown as { size: string; units_sold: string }[],
    viewedColors:    (viewedColors.rows ?? []) as unknown as { color: string; select_count: string }[],
    viewedSizes:     (viewedSizes.rows ?? []) as unknown as { size: string; select_count: string }[],
  }
}

export interface GuestVsRegisteredResult {
  byUserType:         { user_type: string; purchase_count: string }[]
  accountCreationsSum: string
}

export async function getGuestVsRegistered({
  period,
}: {
  period: string
}): Promise<GuestVsRegisteredResult> {
  const iv = periodInterval(period)
  const [byType, acct] = await Promise.all([
    db.execute(sql`
      SELECT dimension_json->>'user_type' AS user_type,
             SUM(value::numeric)::text AS purchase_count
      FROM analytics.analytics_aggregates
      WHERE metric = 'user_type_purchase' AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(value::numeric), 0)::text AS account_creations
      FROM analytics.analytics_aggregates
      WHERE metric = 'account_creations' AND period = 'daily'
        AND period_start >= now() - ${iv}
    `),
  ])
  const acctRow = acct.rows?.[0] as { account_creations?: string } | undefined
  return {
    byUserType: (byType.rows ?? []) as unknown as { user_type: string; purchase_count: string }[],
    accountCreationsSum: acctRow?.account_creations ?? '0',
  }
}

export interface WishlistAnalysisRow {
  product_id:     string
  wishlist_adds:  string
  display_name:   string
  product_code:   string
  key_image_url:  string | null
}

export async function getWishlistAnalysis({
  period,
  limit = 10,
}: {
  period: string
  limit?: number
}): Promise<WishlistAnalysisRow[]> {
  const iv = periodInterval(period)
  const result = await db.execute(sql`
    WITH w AS (
      SELECT dimension_json->>'product_id' AS product_id,
             SUM(value::numeric)::text AS wishlist_adds
      FROM analytics.analytics_aggregates
      WHERE metric = 'wishlist_adds' AND period = 'daily'
        AND period_start >= now() - ${iv}
      GROUP BY 1
    )
    SELECT w.product_id, w.wishlist_adds,
           p.display_name, p.product_code, pi.url AS key_image_url
    FROM w
    JOIN catalog.products p ON p.id = w.product_id::uuid AND p.deleted_at IS NULL
    LEFT JOIN catalog.product_images pi ON pi.id = p.key_image_id
    WHERE w.product_id IS NOT NULL AND w.product_id != ''
    ORDER BY w.wishlist_adds::numeric DESC NULLS LAST
    LIMIT ${limit}
  `)
  return (result.rows ?? []) as unknown as WishlistAnalysisRow[]
}

export interface ConversionFunnelResult {
  product_views:   string
  add_to_cart:     string
  checkout_starts: string
  purchases:       string
}

export async function getConversionFunnel({
  period,
}: {
  period: string
}): Promise<ConversionFunnelResult> {
  const iv = periodInterval(period)
  const [pv, atc, co, pc] = await Promise.all([
    db.execute(sql`
      SELECT COALESCE(SUM(value::numeric), 0)::text AS v
      FROM analytics.analytics_aggregates
      WHERE metric = 'product_views' AND period = 'daily'
        AND period_start >= now() - ${iv}
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(value::numeric), 0)::text AS v
      FROM analytics.analytics_aggregates
      WHERE metric = 'add_to_cart' AND period = 'daily'
        AND period_start >= now() - ${iv}
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(value::numeric), 0)::text AS v
      FROM analytics.analytics_aggregates
      WHERE metric = 'checkout_starts' AND period = 'daily'
        AND period_start >= now() - ${iv}
    `),
    db.execute(sql`
      SELECT COALESCE(SUM(value::numeric), 0)::text AS v
      FROM analytics.analytics_aggregates
      WHERE metric = 'purchase_count' AND period = 'daily'
        AND period_start >= now() - ${iv}
    `),
  ])
  return {
    product_views:   (pv.rows?.[0] as { v?: string } | undefined)?.v ?? '0',
    add_to_cart:     (atc.rows?.[0] as { v?: string } | undefined)?.v ?? '0',
    checkout_starts: (co.rows?.[0] as { v?: string } | undefined)?.v ?? '0',
    purchases:       (pc.rows?.[0] as { v?: string } | undefined)?.v ?? '0',
  }
}

export interface TimeSeriesPoint {
  date:  string
  value: string
}

export async function getTimeSeries({
  metric,
  period,
  dimensionJson,
}: {
  metric:         string
  period:         string
  dimensionJson?: Record<string, unknown> | null
}): Promise<TimeSeriesPoint[]> {
  const iv = periodInterval(period)
  const hasDim =
    dimensionJson != null && Object.keys(dimensionJson).length > 0
  const dimLiteral = hasDim ? JSON.stringify(dimensionJson) : null

  if (hasDim && dimLiteral != null) {
    const result = await db.execute(sql`
      SELECT (period_start AT TIME ZONE 'UTC')::date::text AS date,
             SUM(value::numeric)::text AS value
      FROM analytics.analytics_aggregates
      WHERE metric = ${metric}
        AND period = 'daily'
        AND period_start >= now() - ${iv}
        AND dimension_json @> ${dimLiteral}::jsonb
      GROUP BY 1
      ORDER BY 1 ASC
    `)
    return (result.rows ?? []) as unknown as TimeSeriesPoint[]
  }

  const result = await db.execute(sql`
    SELECT (period_start AT TIME ZONE 'UTC')::date::text AS date,
           SUM(value::numeric)::text AS value
    FROM analytics.analytics_aggregates
    WHERE metric = ${metric}
      AND period = 'daily'
      AND period_start >= now() - ${iv}
    GROUP BY 1
    ORDER BY 1 ASC
  `)
  return (result.rows ?? []) as unknown as TimeSeriesPoint[]
}

export async function getDeviceTypeBreakdown({
  period,
}: {
  period: string
}): Promise<{ device_type: string; page_views: string }[]> {
  const iv = periodInterval(period)
  const result = await db.execute(sql`
    SELECT dimension_json->>'device_type' AS device_type,
           SUM(value::numeric)::text AS page_views
    FROM analytics.analytics_aggregates
    WHERE metric = 'device_type' AND period = 'daily'
      AND period_start >= now() - ${iv}
    GROUP BY 1
    ORDER BY SUM(value::numeric) DESC
  `)
  return (result.rows ?? []) as unknown as { device_type: string; page_views: string }[]
}

export async function getAddToCartByProduct({
  period,
}: {
  period: string
}): Promise<{ product_id: string; add_to_cart_count: string }[]> {
  const iv = periodInterval(period)
  const result = await db.execute(sql`
    SELECT dimension_json->>'product_id' AS product_id,
           SUM(value::numeric)::text AS add_to_cart_count
    FROM analytics.analytics_aggregates
    WHERE metric = 'add_to_cart' AND period = 'daily'
      AND period_start >= now() - ${iv}
    GROUP BY 1
  `)
  return (result.rows ?? []) as unknown as { product_id: string; add_to_cart_count: string }[]
}
