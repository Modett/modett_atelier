/**
 * Admin dashboard analytics — reads orders + analytics_aggregates + events.
 */

import { sql } from 'drizzle-orm'
import { db } from '../client'

export type AnalyticsPeriod = '7d' | '30d' | '90d' | '1y'

export function periodToInterval(period: AnalyticsPeriod): string {
  switch (period) {
    case '7d':
      return '7 days'
    case '30d':
      return '30 days'
    case '90d':
      return '90 days'
    case '1y':
      return '1 year'
    default:
      return '30 days'
  }
}

export interface AdminAnalyticsTodayRow {
  orders_today: string
  revenue_lkr: string
  revenue_sgd: string
  revenue_usd: string
  avg_lkr: string | null
  purchases_today: string
  product_views_today: string
  active_sessions: string
}

export async function queryAdminAnalyticsToday(): Promise<AdminAnalyticsTodayRow> {
  const result = await db.execute(sql`
    WITH day_start AS (
      SELECT (date_trunc('day', (now() AT TIME ZONE 'Asia/Colombo')) AT TIME ZONE 'Asia/Colombo') AS ts
    )
    SELECT
      COUNT(*) FILTER (WHERE o.payment_state = 'PAID')::text AS orders_today,
      COALESCE(SUM(o.total) FILTER (WHERE o.payment_state = 'PAID' AND o.currency = 'LKR'), 0)::text AS revenue_lkr,
      COALESCE(SUM(o.total) FILTER (WHERE o.payment_state = 'PAID' AND o.currency = 'SGD'), 0)::text AS revenue_sgd,
      COALESCE(SUM(o.total) FILTER (WHERE o.payment_state = 'PAID' AND o.currency = 'USD'), 0)::text AS revenue_usd,
      (AVG(o.total) FILTER (WHERE o.payment_state = 'PAID' AND o.currency = 'LKR'))::text AS avg_lkr,
      (SELECT COUNT(*)::text FROM analytics.events e, day_start d
        WHERE e.type = 'PURCHASE_COMPLETE'
          AND e.created_at >= d.ts) AS purchases_today,
      (SELECT COUNT(*)::text FROM analytics.events e, day_start d
        WHERE e.type = 'PRODUCT_VIEW'
          AND e.created_at >= d.ts) AS product_views_today,
      (SELECT COUNT(DISTINCT e.session_id)::text FROM analytics.events e
        WHERE e.created_at >= now() - interval '30 minutes') AS active_sessions
    FROM orders.orders o, day_start d
    WHERE o.payment_state = 'PAID'
      AND o.created_at >= d.ts
  `)
  const row = result.rows[0] as Record<string, unknown> | undefined
  const r = row ?? {}
  return {
    orders_today: String(r.orders_today ?? '0'),
    revenue_lkr: String(r.revenue_lkr ?? '0'),
    revenue_sgd: String(r.revenue_sgd ?? '0'),
    revenue_usd: String(r.revenue_usd ?? '0'),
    avg_lkr: r.avg_lkr != null ? String(r.avg_lkr) : null,
    purchases_today: String(r.purchases_today ?? '0'),
    product_views_today: String(r.product_views_today ?? '0'),
    active_sessions: String(r.active_sessions ?? '0'),
  }
}

export interface AdminRevenueSeriesRow {
  date: string
  currency: string
  order_count: string
  revenue: string
  avg_order_value: string | null
}

export async function queryAdminAnalyticsRevenue({
  period,
  currency,
}: {
  period: AnalyticsPeriod
  currency: 'LKR' | 'SGD' | 'USD' | 'ALL'
}): Promise<AdminRevenueSeriesRow[]> {
  const interval = periodToInterval(period)
  const intervalLiteral = `'${interval}'::interval`
  const result = await db.execute(sql`
    SELECT
      date_trunc('day', o.created_at)::date::text AS date,
      o.currency::text AS currency,
      COUNT(*)::text AS order_count,
      SUM(o.total)::text AS revenue,
      AVG(o.total)::text AS avg_order_value
    FROM orders.orders o
    WHERE o.payment_state = 'PAID'
      AND o.created_at >= now() - ${sql.raw(intervalLiteral)}
      AND (${currency} = 'ALL' OR o.currency::text = ${currency})
    GROUP BY 1, 2
    ORDER BY 1 ASC
  `)
  const rows = result.rows as unknown as AdminRevenueSeriesRow[]
  return rows.map((x) => ({
    date: String(x.date),
    currency: String(x.currency),
    order_count: String(x.order_count),
    revenue: String(x.revenue),
    avg_order_value: x.avg_order_value != null ? String(x.avg_order_value) : null,
  }))
}

export interface AdminFunnelAggregatesRow {
  product_views: string
  add_to_cart: string
  checkout_starts: string
  purchases: string
}

export async function queryAdminAnalyticsFunnelAggregates({
  period,
}: {
  period: AnalyticsPeriod
}): Promise<AdminFunnelAggregatesRow> {
  const interval = periodToInterval(period)
  const intervalLiteral = `'${interval}'::interval`
  const result = await db.execute(sql`
    SELECT
      COALESCE(SUM(CASE WHEN metric = 'product_views' THEN value::numeric ELSE 0 END), 0)::text AS product_views,
      COALESCE(SUM(CASE WHEN metric = 'add_to_cart' THEN value::numeric ELSE 0 END), 0)::text AS add_to_cart,
      COALESCE(SUM(CASE WHEN metric = 'checkout_starts' THEN value::numeric ELSE 0 END), 0)::text AS checkout_starts,
      COALESCE(SUM(CASE WHEN metric = 'purchase_count' THEN value::numeric ELSE 0 END), 0)::text AS purchases
    FROM analytics.analytics_aggregates
    WHERE period = 'daily'
      AND period_start >= now() - ${sql.raw(intervalLiteral)}
  `)
  const row = result.rows[0] as Record<string, unknown> | undefined
  const r = row ?? {}
  return {
    product_views: String(r.product_views ?? '0'),
    add_to_cart: String(r.add_to_cart ?? '0'),
    checkout_starts: String(r.checkout_starts ?? '0'),
    purchases: String(r.purchases ?? '0'),
  }
}

export interface AdminRevenueByCurrencyRow {
  currency: string
  orders: string
  total_revenue: string
}

export async function queryAdminAnalyticsRevenueByCurrency({
  period,
}: {
  period: AnalyticsPeriod
}): Promise<AdminRevenueByCurrencyRow[]> {
  const interval = periodToInterval(period)
  const intervalLiteral = `'${interval}'::interval`
  const result = await db.execute(sql`
    SELECT
      o.currency::text AS currency,
      COUNT(*)::text AS orders,
      SUM(o.total)::text AS total_revenue
    FROM orders.orders o
    WHERE o.payment_state = 'PAID'
      AND o.created_at >= now() - ${sql.raw(intervalLiteral)}
    GROUP BY o.currency
    ORDER BY SUM(o.total) DESC
  `)
  const rows = result.rows as unknown as AdminRevenueByCurrencyRow[]
  return rows.map((x) => ({
    currency: String(x.currency),
    orders: String(x.orders),
    total_revenue: String(x.total_revenue),
  }))
}
