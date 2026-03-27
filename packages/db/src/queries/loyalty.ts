/**
 * Loyalty query functions — accounts, ledger, rules, grants, balance mutations.
 * No business logic. RORO. Balance mutations use withLoyaltyLock + db.transaction();
 * ledger INSERT + accounts UPDATE in same tx. Never UPDATE/DELETE ledger rows.
 */

import { randomUUID } from 'node:crypto'
import { eq, and, desc, sql } from 'drizzle-orm'
import { db } from '../client'
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
} from '../schema/loyalty'
import {
  LoyaltyAccountNotFoundError,
  InsufficientPointsError,
  LoyaltyRulesNotFoundError,
  BalanceWouldGoNegativeError,
  LoyaltyLockNotAcquiredError,
} from '../errors'

// —— Lock helper (RULE 3) ——

export async function withLoyaltyLock<T>(
  userId: string,
  fn: () => Promise<T>,
): Promise<T> {
  const key = `lock:loyalty:${userId}`
  const lockId = randomUUID()
  const acquired = await redis.set(key, lockId, 'EX', 5, 'NX')
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

// —— Rules query ——

export async function getLoyaltyRules(): Promise<LoyaltyRules> {
  const rows = await db
    .select()
    .from(loyaltyRules)
    .orderBy(desc(loyaltyRules.updated_at))
    .limit(1)
  const row = rows[0]
  if (!row) throw new LoyaltyRulesNotFoundError(500)
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
  updatedByAdminId,
}: {
  earnRateJson?: Record<string, { points: number; per_amount: number }>
  redemptionRateByCurrencyJson?: Record<string, { points: number; value: number }>
  tierThresholdsJson?: { BRONZE: number; SILVER: number; GOLD: number }
  multipliersJson?: { BRONZE: number; SILVER: number; GOLD: number }
  minRedeem?: number
  maxRedeemPercent?: number
  noStackWithSale?: boolean
  updatedByAdminId: string
}): Promise<LoyaltyRules> {
  const updates: Record<string, unknown> = {
    updated_at: new Date(),
    updated_by_admin_id: updatedByAdminId,
  }
  if (earnRateJson !== undefined) updates.earn_rate_json = earnRateJson
  if (redemptionRateByCurrencyJson !== undefined)
    updates.redemption_rate_by_currency_json = redemptionRateByCurrencyJson
  if (tierThresholdsJson !== undefined)
    updates.tier_thresholds_json = tierThresholdsJson
  if (multipliersJson !== undefined)
    updates.multipliers_json = multipliersJson
  if (minRedeem !== undefined) updates.min_redeem = minRedeem
  if (maxRedeemPercent !== undefined)
    updates.max_redeem_percent = String(maxRedeemPercent)
  if (noStackWithSale !== undefined)
    updates.no_stack_with_sale = noStackWithSale

  const result = await db
    .update(loyaltyRules)
    .set(updates as Record<string, unknown>)
    .returning()
  if (result.length === 0) throw new LoyaltyRulesNotFoundError(404)
  return result[0] as LoyaltyRules
}

// —— Ledger read queries ——

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

export async function getRolling12MonthEarned({
  userId,
}: {
  userId: string
}): Promise<number> {
  const result = await db.execute(sql`
    SELECT COALESCE(SUM(points), 0)::int AS earned
    FROM loyalty.loyalty_ledger
    WHERE user_id = ${userId}
      AND type IN ('EARN', 'BONUS')
      AND points > 0
      AND created_at >= now() - INTERVAL '12 months'
  `)
  const row = result.rows[0] as { earned: number } | undefined
  return row?.earned ?? 0
}

export async function reconcileBalance({
  userId,
}: {
  userId: string
}): Promise<{ correctedBalance: number; ledgerSum: number }> {
  return withLoyaltyLock(userId, async () => {
    const sumResult = await db.execute(sql`
      SELECT COALESCE(SUM(points), 0)::int AS ledger_sum
      FROM loyalty.loyalty_ledger
      WHERE user_id = ${userId}
    `)
    const ledgerSum =
      (sumResult.rows[0] as { ledger_sum: number } | undefined)?.ledger_sum ?? 0

    const updateResult = await db.execute(sql`
      UPDATE loyalty.loyalty_accounts
      SET balance = ${ledgerSum}, last_activity_at = now()
      WHERE user_id = ${userId}
      RETURNING balance
    `)
    if (updateResult.rows.length === 0) throw new LoyaltyAccountNotFoundError()
    const correctedBalance = (updateResult.rows[0] as { balance: number })
      .balance
    return { correctedBalance, ledgerSum }
  })
}

// —— Balance mutation queries (all use withLoyaltyLock + db.transaction) ——

export async function earnPoints({
  userId,
  points,
  orderId,
  metadataJson,
}: {
  userId: string
  points: number
  orderId?: string | null
  metadataJson?: Record<string, unknown>
}): Promise<{ newBalance: number }> {
  return withLoyaltyLock(userId, async () => {
    return db.transaction(async (tx) => {
      await tx.insert(loyaltyLedger).values({
        user_id: userId,
        type: 'EARN',
        points,
        order_id: orderId ?? null,
        metadata_json: metadataJson ?? {},
      })
      const result = await tx.execute(sql`
        UPDATE loyalty.loyalty_accounts
        SET balance = balance + ${points},
            lifetime_earned = lifetime_earned + ${points},
            last_activity_at = now()
        WHERE user_id = ${userId}
        RETURNING balance
      `)
      if (result.rows.length === 0) throw new LoyaltyAccountNotFoundError()
      return {
        newBalance: (result.rows[0] as { balance: number }).balance,
      }
    })
  })
}

export async function redeemPoints({
  userId,
  points,
  orderId,
  metadataJson,
}: {
  userId: string
  points: number
  orderId: string
  metadataJson?: Record<string, unknown>
}): Promise<{ newBalance: number }> {
  return withLoyaltyLock(userId, async () => {
    return db.transaction(async (tx) => {
      await tx.insert(loyaltyLedger).values({
        user_id: userId,
        type: 'REDEEM',
        points: -points,
        order_id: orderId,
        metadata_json: metadataJson ?? {},
      })
      const result = await tx.execute(sql`
        UPDATE loyalty.loyalty_accounts
        SET balance = balance - ${points},
            last_activity_at = now()
        WHERE user_id = ${userId}
          AND balance >= ${points}
        RETURNING balance
      `)
      if (result.rows.length === 0) throw new InsufficientPointsError()
      return {
        newBalance: (result.rows[0] as { balance: number }).balance,
      }
    })
  })
}

export async function adjustPoints({
  userId,
  points,
  reason,
  adminId,
}: {
  userId: string
  points: number
  reason: string
  adminId: string
}): Promise<{ newBalance: number }> {
  return withLoyaltyLock(userId, async () => {
    return db.transaction(async (tx) => {
      const balanceRow = await tx.execute(sql`
        SELECT balance FROM loyalty.loyalty_accounts
        WHERE user_id = ${userId}
        FOR UPDATE
      `)
      const balanceResult = balanceRow.rows[0] as { balance: number } | undefined
      if (!balanceResult) throw new LoyaltyAccountNotFoundError()
      const balance = balanceResult.balance
      if (balance + points < 0) throw new BalanceWouldGoNegativeError()

      await tx.insert(loyaltyLedger).values({
        user_id: userId,
        type: 'ADJUST',
        points,
        order_id: null,
        metadata_json: { reason, adminId },
      })
      const result = await tx.execute(sql`
        UPDATE loyalty.loyalty_accounts
        SET balance = balance + ${points},
            last_activity_at = now()
        WHERE user_id = ${userId}
        RETURNING balance
      `)
      if (result.rows.length === 0) throw new LoyaltyAccountNotFoundError()
      return {
        newBalance: (result.rows[0] as { balance: number }).balance,
      }
    })
  })
}

export async function grantPoints({
  userId,
  points,
  reason,
  adminId,
}: {
  userId: string
  points: number
  reason: string
  adminId: string
}): Promise<{ newBalance: number }> {
  const [grantRow] = await db
    .insert(loyaltyGrants)
    .values({
      user_id: userId,
      points,
      reason,
      granted_by_admin_id: adminId,
    })
    .returning({ id: loyaltyGrants.id })
  const grantId = grantRow?.id
  return earnPoints({
    userId,
    points,
    orderId: null,
    metadataJson: {
      type: 'admin_grant',
      grantId,
      reason,
    },
  })
}

export async function updateTier({
  userId,
}: {
  userId: string
}): Promise<{ newTier: 'BRONZE' | 'SILVER' | 'GOLD'; earned12m: number }> {
  const earned12m = await getRolling12MonthEarned({ userId })
  const rules = await getLoyaltyRules()
  const thresholds = rules.tier_thresholds_json as {
    BRONZE: number
    SILVER: number
    GOLD: number
  }
  const newTier: 'BRONZE' | 'SILVER' | 'GOLD' =
    earned12m >= thresholds.GOLD
      ? 'GOLD'
      : earned12m >= thresholds.SILVER
        ? 'SILVER'
        : 'BRONZE'

  const result = await db
    .update(loyaltyAccounts)
    .set({
      tier: newTier,
      tier_evaluated_at: new Date(),
    })
    .where(eq(loyaltyAccounts.user_id, userId))
    .returning({ tier: loyaltyAccounts.tier })
  if (result.length === 0) throw new LoyaltyAccountNotFoundError()
  return {
    newTier: result[0].tier as 'BRONZE' | 'SILVER' | 'GOLD',
    earned12m,
  }
}
