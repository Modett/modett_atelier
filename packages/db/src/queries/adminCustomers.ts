/**
 * Admin customer search and profile fragments.
 */

import { sql } from 'drizzle-orm'
import { db } from '../client'

export interface AdminCustomerSearchRow {
  id: string
  first_name: string
  last_name: string
  email: string
  created_at: Date
  loyalty_balance: number | null
  loyalty_tier: string | null
  composite_score: string | null
  order_count: number
  total_spent_lkr: string
}

export async function searchAdminCustomers({
  q,
  page,
  limit,
}: {
  q: string
  page: number
  limit: number
}): Promise<{ customers: AdminCustomerSearchRow[]; total: number }> {
  const offset = (page - 1) * limit
  const like = `%${q.replace(/%/g, '\\%').replace(/_/g, '\\_')}%`
  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS c
    FROM iam.users u
    WHERE u.deleted_at IS NULL
      AND (
        u.email ILIKE ${like}
        OR u.first_name ILIKE ${like}
        OR u.last_name ILIKE ${like}
        OR CONCAT(u.first_name, ' ', u.last_name) ILIKE ${like}
      )
  `)
  const total = (countResult.rows[0] as { c: number } | undefined)?.c ?? 0

  const result = await db.execute(sql`
    SELECT
      u.id,
      u.first_name,
      u.last_name,
      u.email,
      u.created_at,
      la.balance AS loyalty_balance,
      la.tier::text AS loyalty_tier,
      la.composite_score::text AS composite_score,
      COUNT(DISTINCT o.id)::int AS order_count,
      COALESCE(
        SUM(CASE WHEN o.payment_state = 'PAID' AND o.currency = 'LKR' THEN o.total::numeric ELSE 0 END),
        0
      )::text AS total_spent_lkr
    FROM iam.users u
    LEFT JOIN loyalty.loyalty_accounts la ON la.user_id = u.id
    LEFT JOIN orders.orders o ON o.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND (
        u.email ILIKE ${like}
        OR u.first_name ILIKE ${like}
        OR u.last_name ILIKE ${like}
        OR CONCAT(u.first_name, ' ', u.last_name) ILIKE ${like}
      )
    GROUP BY u.id, u.first_name, u.last_name, u.email, u.created_at,
             la.balance, la.tier, la.composite_score
    ORDER BY order_count DESC, u.created_at DESC
    LIMIT ${limit}
    OFFSET ${offset}
  `)

  const customers = (result.rows ?? []) as unknown as AdminCustomerSearchRow[]
  return { customers, total }
}

export async function listAdminCustomerOrders({
  userId,
  limit,
}: {
  userId: string
  limit: number
}) {
  const result = await db.execute(sql`
    SELECT
      id,
      order_ref,
      order_state::text,
      payment_state::text,
      fulfillment_state::text,
      currency::text,
      total::text,
      created_at,
      placed_at
    FROM orders.orders
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)
  return (result.rows ?? []) as Record<string, unknown>[]
}

export async function listAdminCustomerReviews({
  userId,
  limit,
}: {
  userId: string
  limit: number
}) {
  const result = await db.execute(sql`
    SELECT
      r.id,
      r.rating,
      r.body,
      r.status::text,
      r.created_at,
      p.display_name AS product_name
    FROM reviews.reviews r
    INNER JOIN catalog.products p ON p.id = r.product_id
    WHERE r.user_id = ${userId}
    ORDER BY r.created_at DESC
    LIMIT ${limit}
  `)
  return (result.rows ?? []) as Record<string, unknown>[]
}

export async function listAdminCustomerReturns({
  userId,
}: {
  userId: string
}) {
  const result = await db.execute(sql`
    SELECT
      rr.id,
      rr.status::text,
      rr.created_at,
      o.order_ref,
      (SELECT COUNT(*)::int FROM returns.return_request_items ri
       WHERE ri.return_request_id = rr.id) AS item_count
    FROM returns.return_requests rr
    INNER JOIN orders.orders o ON o.id = rr.order_id
    WHERE o.user_id = ${userId}
      AND rr.status NOT IN ('FULFILLED', 'REJECTED')
    ORDER BY rr.created_at DESC
  `)
  return (result.rows ?? []) as Record<string, unknown>[]
}

export async function listLoyaltyLedgerForUser({
  userId,
  limit,
}: {
  userId: string
  limit: number
}) {
  const result = await db.execute(sql`
    SELECT id, type::text, points, order_id, metadata_json, created_at
    FROM loyalty.loyalty_ledger
    WHERE user_id = ${userId}
    ORDER BY created_at DESC
    LIMIT ${limit}
  `)
  return (result.rows ?? []) as Record<string, unknown>[]
}
