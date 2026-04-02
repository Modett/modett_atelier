/**
 * Loyalty query functions — accounts, ledger, rules, grants, balance mutations.
 * Balance mutations: use withLoyaltyLock (service) + insertLedgerEntryInTx + updateBalanceInTx in one db.transaction().
 * Never UPDATE/DELETE ledger rows.
 */

import { randomUUID } from 'node:crypto'
import Decimal from 'decimal.js'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../client'
import type { TransactionClient } from '../client'
import { redis } from '../redis'
import {
  loyaltyAccounts,
  loyaltyLedger,
  loyaltyRules,
  loyaltyGrants,
} from '../schema/loyalty'
import type {
  LoyaltyAccount,
  LoyaltyLedgerRow,
  LoyaltyRules,
  LoyaltyGrant,
} from '../schema/loyalty'
import {
  LoyaltyAccountNotFoundError,
  InsufficientPointsError,
  LoyaltyRulesNotFoundError,
  BalanceWouldGoNegativeError,
  LoyaltyLockNotAcquiredError,
} from '../errors'

// —— Lock helper ——

export async function withLoyaltyLock<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `lock:loyalty:${userId}`
  const lockId = randomUUID()
  const acquired = await redis.set(key, lockId, 'EX', 10, 'NX')
  if (!acquired) {
    throw new LoyaltyLockNotAcquiredError()
  }
  try {
    return await fn()
  } finally {
    await redis.eval(
      `if redis.call('get', KEYS[1]) == ARGV[1]
       then return redis.call('del', KEYS[1])
       else return 0
       end`,
      1,
      key,
      lockId,
    )
  }
}

// —— Pure composite score (Decimal.js) ——

export function computeCompositeScore({
  orderCount,
  earnedPoints,
  frequencyWeight,
  spendWeight,
  spendNormalisationFactor,
}: {
  orderCount: number
  earnedPoints: number
  frequencyWeight: number
  spendWeight: number
  spendNormalisationFactor: number
}): number {
  const norm = new Decimal(spendNormalisationFactor)
  if (norm.lte(0)) return 0
  const normalisedSpend = new Decimal(earnedPoints).div(norm)
  const score = new Decimal(orderCount)
    .mul(frequencyWeight)
    .plus(normalisedSpend.mul(spendWeight))
  return score.toDecimalPlaces(4, Decimal.ROUND_HALF_UP).toNumber()
}

// —— Account queries ——

export async function createLoyaltyAccount({
  userId,
}: {
  userId: string
}): Promise<void> {
  await db
    .insert(loyaltyAccounts)
    .values({
      user_id: userId,
      balance: 0,
      lifetime_earned: 0,
      tier: 'BRONZE',
    })
    .onConflictDoNothing({ target: loyaltyAccounts.user_id })
}

export async function getLoyaltyAccount({
  userId,
}: {
  userId: string
}): Promise<LoyaltyAccount | null> {
  const rows = await db
    .select()
    .from(loyaltyAccounts)
    .where(eq(loyaltyAccounts.user_id, userId))
  return rows[0] ?? null
}

export async function getLoyaltyAccountOrThrow({
  userId,
}: {
  userId: string
}): Promise<LoyaltyAccount> {
  const account = await getLoyaltyAccount({ userId })
  if (!account) throw new LoyaltyAccountNotFoundError()
  return account
}

// —— Rules ——

export async function getLoyaltyRulesNullable(): Promise<LoyaltyRules | null> {
  const rows = await db
    .select()
    .from(loyaltyRules)
    .orderBy(desc(loyaltyRules.updated_at))
    .limit(1)
  return rows[0] ?? null
}

export async function getLoyaltyRules(): Promise<LoyaltyRules> {
  const row = await getLoyaltyRulesNullable()
  if (!row) throw new LoyaltyRulesNotFoundError(404)
  return row
}

export async function updateLoyaltyRules({
  earnRateJson,
  redemptionRateByCurrencyJson,
  tierThresholdsJson,
  multipliersJson,
  minRedeem,
  maxRedeemPercent,
  noStackWithSale,
  frequencyWeight,
  spendWeight,
  spendNormalisationFactor,
  evaluationWindowMonths,
  pointsExpiryMonths,
  updatedByAdminId,
}: {
  earnRateJson?: Record<string, { points: number; per_amount: number }>
  redemptionRateByCurrencyJson?: Record<string, { points: number; value: number }>
  tierThresholdsJson?: { BRONZE: number; SILVER: number; GOLD: number }
  multipliersJson?: { BRONZE: number; SILVER: number; GOLD: number }
  minRedeem?: number
  maxRedeemPercent?: number
  noStackWithSale?: boolean
  frequencyWeight?: number
  spendWeight?: number
  spendNormalisationFactor?: number
  evaluationWindowMonths?: number
  pointsExpiryMonths?: number
  updatedByAdminId: string
}): Promise<LoyaltyRules> {
  const updates: Record<string, unknown> = {
    updated_at: new Date(),
    updated_by_admin_id: updatedByAdminId,
  }
  if (earnRateJson !== undefined) updates.earn_rate_json = earnRateJson
  if (redemptionRateByCurrencyJson !== undefined) {
    updates.redemption_rate_by_currency_json = redemptionRateByCurrencyJson
  }
  if (tierThresholdsJson !== undefined) {
    updates.tier_thresholds_json = tierThresholdsJson
  }
  if (multipliersJson !== undefined) {
    updates.multipliers_json = multipliersJson
  }
  if (minRedeem !== undefined) updates.min_redeem = minRedeem
  if (maxRedeemPercent !== undefined) {
    updates.max_redeem_percent = String(maxRedeemPercent)
  }
  if (noStackWithSale !== undefined) {
    updates.no_stack_with_sale = noStackWithSale
  }
  if (frequencyWeight !== undefined) {
    updates.frequency_weight = String(frequencyWeight)
  }
  if (spendWeight !== undefined) {
    updates.spend_weight = String(spendWeight)
  }
  if (spendNormalisationFactor !== undefined) {
    updates.spend_normalisation_factor = spendNormalisationFactor
  }
  if (evaluationWindowMonths !== undefined) {
    updates.evaluation_window_months = evaluationWindowMonths
  }
  if (pointsExpiryMonths !== undefined) {
    updates.points_expiry_months = pointsExpiryMonths
  }

  const result = await db
    .update(loyaltyRules)
    .set(updates as Record<string, unknown>)
    .returning()
  if (result.length === 0) throw new LoyaltyRulesNotFoundError(404)
  return result[0] as LoyaltyRules
}

// —— Dual-axis window stats ——

export async function getOrderCountInWindow({
  userId,
  windowMonths,
}: {
  userId: string
  windowMonths: number
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COUNT(DISTINCT o.id)::int AS cnt
    FROM orders.orders o
    WHERE o.user_id = ${userId}
      AND o.payment_state = 'PAID'
      AND o.created_at >= now() - (${String(windowMonths)} || ' months')::interval
  `)
  const row = result.rows[0] as { cnt: number } | undefined
  return row?.cnt ?? 0
}

export async function getEarnedPointsInWindow({
  userId,
  windowMonths,
}: {
  userId: string
  windowMonths: number
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(points), 0)::int AS total
    FROM loyalty.loyalty_ledger
    WHERE user_id = ${userId}
      AND type IN ('EARN', 'BONUS')
      AND points > 0
      AND created_at >= now() - (${String(windowMonths)} || ' months')::interval
  `)
  const row = result.rows[0] as { total: number } | undefined
  return row?.total ?? 0
}

export async function updateCompositeScoreAndTier({
  userId,
  compositeScore,
  tier,
}: {
  userId: string
  compositeScore: number
  tier: 'BRONZE' | 'SILVER' | 'GOLD'
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE loyalty.loyalty_accounts
    SET composite_score = ${String(compositeScore)},
        tier = ${tier}::loyalty.tier_level,
        tier_evaluated_at = now()
    WHERE user_id = ${userId}
    RETURNING user_id
  `)
  if (result.rows.length === 0) throw new LoyaltyAccountNotFoundError()
}

// —— Ledger (inside tx) ——

export async function insertLedgerEntryInTx({
  tx,
  userId,
  type,
  points,
  orderId,
  metadataJson,
}: {
  tx: TransactionClient
  userId: string
  type: 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRY' | 'ADJUST'
  points: number
  orderId?: string | null
  metadataJson?: Record<string, unknown>
}): Promise<LoyaltyLedgerRow> {
  const [row] = await tx
    .insert(loyaltyLedger)
    .values({
      user_id: userId,
      type,
      points,
      order_id: orderId ?? null,
      metadata_json: metadataJson ?? {},
    })
    .returning()
  if (!row) throw new Error('insertLedgerEntryInTx: no row')
  return row
}

export async function updateBalanceInTx({
  tx,
  userId,
  delta,
}: {
  tx: TransactionClient
  userId: string
  delta: number
}): Promise<{ balance: number }> {
  const result = await tx.execute(sql`
    UPDATE loyalty.loyalty_accounts
    SET balance = balance + ${delta},
        lifetime_earned = lifetime_earned + GREATEST(${delta}, 0),
        last_activity_at = CASE WHEN ${delta} > 0 THEN now() ELSE last_activity_at END
    WHERE user_id = ${userId}
      AND balance + ${delta} >= 0
    RETURNING balance
  `)
  if (result.rows.length === 0) throw new InsufficientPointsError()
  return { balance: (result.rows[0] as { balance: number }).balance }
}

export async function insertGrantInTx({
  tx,
  userId,
  points,
  reason,
  grantedByAdminId,
}: {
  tx: TransactionClient
  userId: string
  points: number
  reason: string
  grantedByAdminId: string
}): Promise<LoyaltyGrant> {
  const [row] = await tx
    .insert(loyaltyGrants)
    .values({
      user_id: userId,
      points,
      reason,
      granted_by_admin_id: grantedByAdminId,
    })
    .returning()
  if (!row) throw new Error('insertGrantInTx: no row')
  return row
}

// —— Ledger reads ——

export interface GetLedgerForUserResult {
  ledger: LoyaltyLedgerRow[]
  page: number
  limit: number
  total: number
}

export async function getLedgerForUser({
  userId,
  page = 1,
  limit = 20,
  type: ledgerType,
}: {
  userId: string
  page?: number
  limit?: number
  type?: 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRY' | 'ADJUST'
}): Promise<GetLedgerForUserResult> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const offset = (page - 1) * safeLimit

  const countResult =
    ledgerType === undefined
      ? await db.execute(sql`
          SELECT COUNT(*)::int AS total
          FROM loyalty.loyalty_ledger
          WHERE user_id = ${userId}
        `)
      : await db.execute(sql`
          SELECT COUNT(*)::int AS total
          FROM loyalty.loyalty_ledger
          WHERE user_id = ${userId}
            AND type = ${ledgerType}
        `)
  const total =
    (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const where =
    ledgerType === undefined
      ? eq(loyaltyLedger.user_id, userId)
      : and(
          eq(loyaltyLedger.user_id, userId),
          eq(loyaltyLedger.type, ledgerType),
        )
  const ledger = await db
    .select()
    .from(loyaltyLedger)
    .where(where)
    .orderBy(desc(loyaltyLedger.created_at))
    .limit(safeLimit)
    .offset(offset)

  return { ledger, page, limit: safeLimit, total }
}

export async function getLedgerPointsSum({
  userId,
}: {
  userId: string
}): Promise<number> {
  const sumResult = await db.execute(sql`
    SELECT COALESCE(SUM(points), 0)::int AS ledger_sum
    FROM loyalty.loyalty_ledger
    WHERE user_id = ${userId}
  `)
  return (
    (sumResult.rows[0] as { ledger_sum: number } | undefined)?.ledger_sum ?? 0
  )
}

// —— Grants ——

export async function getGrantsForUser({
  userId,
}: {
  userId: string
}): Promise<LoyaltyGrant[]> {
  return db
    .select()
    .from(loyaltyGrants)
    .where(eq(loyaltyGrants.user_id, userId))
    .orderBy(desc(loyaltyGrants.created_at))
}

// —— Admin search / leaderboard ——

export interface SearchUserByEmailRow {
  user_id: string
  email: string
  first_name: string
  last_name: string
  balance: number | null
  tier: string | null
  composite_score: string | null
  last_activity_at: Date | null
  frequency_last12m: number
  spend_last12m: number
}

export async function searchUserByEmail({
  email,
  evaluationWindowMonths,
}: {
  email: string
  evaluationWindowMonths: number
}): Promise<SearchUserByEmailRow[]> {
  const pattern = `%${email}%`
  const result = await db.execute(sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.first_name,
      u.last_name,
      la.balance,
      la.tier::text AS tier,
      la.composite_score::text AS composite_score,
      la.last_activity_at,
      (
        SELECT COUNT(DISTINCT o.id)::int
        FROM orders.orders o
        WHERE o.user_id = u.id
          AND o.payment_state = 'PAID'
          AND o.created_at >= now() - (${String(evaluationWindowMonths)} || ' months')::interval
      ) AS frequency_last12m,
      (
        SELECT COALESCE(SUM(ll.points), 0)::int
        FROM loyalty.loyalty_ledger ll
        WHERE ll.user_id = u.id
          AND ll.type IN ('EARN', 'BONUS')
          AND ll.points > 0
          AND ll.created_at >= now() - (${String(evaluationWindowMonths)} || ' months')::interval
      ) AS spend_last12m
    FROM iam.users u
    LEFT JOIN loyalty.loyalty_accounts la ON la.user_id = u.id
    WHERE u.deleted_at IS NULL
      AND (u.email ILIKE ${pattern} OR u.email = ${email})
    ORDER BY u.email ASC
    LIMIT 10
  `)
  return result.rows as unknown as SearchUserByEmailRow[]
}

export interface TopLoyaltyUserRow {
  user_id: string
  email: string
  first_name: string
  last_name: string
  tier: string
  balance: number
  composite_score: string
}

export async function listTopLoyaltyUsers({
  limit = 25,
}: {
  limit?: number
}): Promise<TopLoyaltyUserRow[]> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const result = await db.execute(sql`
    SELECT
      u.id AS user_id,
      u.email,
      u.first_name,
      u.last_name,
      la.tier::text AS tier,
      la.balance,
      la.composite_score::text AS composite_score
    FROM loyalty.loyalty_accounts la
    INNER JOIN iam.users u ON u.id = la.user_id
    WHERE u.deleted_at IS NULL
    ORDER BY
      CASE la.tier::text
        WHEN 'GOLD' THEN 3
        WHEN 'SILVER' THEN 2
        ELSE 1
      END DESC,
      la.composite_score DESC,
      la.balance DESC
    LIMIT ${safeLimit}
  `)
  return result.rows as unknown as TopLoyaltyUserRow[]
}

// —— Expiry batch ——

export async function getUsersDueForExpiry({
  expiryMonths,
}: {
  expiryMonths: number
}): Promise<Array<{ userId: string; balance: number }>> {
  const result = await db.execute(sql`
    SELECT user_id, balance
    FROM loyalty.loyalty_accounts
    WHERE balance > 0
      AND last_activity_at < now() - (${String(expiryMonths)} || ' months')::interval
  `)
  return (result.rows as Array<{ user_id: string; balance: number }>).map(
    (r) => ({ userId: r.user_id, balance: r.balance }),
  )
}
