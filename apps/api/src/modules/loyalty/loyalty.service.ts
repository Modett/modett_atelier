/**
 * Loyalty service — earn/redeem, dual-axis tier, admin grants/adjust/reconcile, rules.
 * RORO. Maps db-layer errors to AppError. Uses Decimal.js for money/points arithmetic.
 */

import Decimal from 'decimal.js'
import { db } from '@modett/db'
import { AppError } from '../../lib/errors'
import {
  getLoyaltyAccount,
  getLoyaltyAccountOrThrow,
  getLoyaltyRules,
  getLoyaltyRulesNullable,
  updateLoyaltyRules,
  getLedgerForUser,
  getOrderCountInWindow,
  getEarnedPointsInWindow,
  computeCompositeScore,
  updateCompositeScoreAndTier,
  insertLedgerEntryInTx,
  updateBalanceInTx,
  insertGrantInTx,
  withLoyaltyLock,
  getLedgerPointsSum,
  getGrantsForUser,
  searchUserByEmail,
  listTopLoyaltyUsers,
} from '@modett/db'
import { getOrderById, getUserById } from '@modett/db'
import {
  notifyLoyaltyPointsEarned,
  notifyLoyaltyTierUpgraded,
} from '../messaging'
import type { LoyaltyRules } from '@modett/db'
import type {
  LoyaltyAccountDetail,
  AdminUserLoyaltySummary,
  AdminLoyaltySearchRow,
  AdminTopLoyaltyUserRow,
  LoyaltyAccountPublic,
  LedgerEntryPublic,
  LoyaltyGrantPublic,
  LoyaltyRulesPublic,
} from '@modett/types'
import type {
  SearchUserByEmailRow,
  TopLoyaltyUserRow,
} from '@modett/db'
import {
  LoyaltyAccountNotFoundError,
  InsufficientPointsError,
  LoyaltyRulesNotFoundError,
  BalanceWouldGoNegativeError,
  LoyaltyLockNotAcquiredError,
} from '@modett/db'

type CurrencyCode = 'LKR' | 'SGD' | 'USD'
type TierLevel = 'BRONZE' | 'SILVER' | 'GOLD'

function toAppError(err: unknown): never {
  if (
    err instanceof LoyaltyAccountNotFoundError ||
    err instanceof InsufficientPointsError ||
    err instanceof LoyaltyRulesNotFoundError ||
    err instanceof BalanceWouldGoNegativeError ||
    err instanceof LoyaltyLockNotAcquiredError
  ) {
    throw new AppError(err.code, err.statusCode, err.message)
  }
  throw err
}

function tierRank(t: string): number {
  const u = t.toUpperCase()
  if (u === 'GOLD') return 3
  if (u === 'SILVER') return 2
  return 1
}

function parseRulesRow(row: LoyaltyRules): LoyaltyRulesPublic {
  return {
    earnRateJson: row.earn_rate_json as LoyaltyRulesPublic['earnRateJson'],
    redemptionRateByCurrencyJson:
      row.redemption_rate_by_currency_json as LoyaltyRulesPublic['redemptionRateByCurrencyJson'],
    tierThresholdsJson:
      row.tier_thresholds_json as LoyaltyRulesPublic['tierThresholdsJson'],
    multipliersJson: row.multipliers_json as LoyaltyRulesPublic['multipliersJson'],
    frequencyWeight: Number(row.frequency_weight),
    spendWeight: Number(row.spend_weight),
    spendNormalisationFactor: row.spend_normalisation_factor,
    evaluationWindowMonths: row.evaluation_window_months,
    pointsExpiryMonths: row.points_expiry_months,
    minRedeem: row.min_redeem,
    maxRedeemPercent: Number(row.max_redeem_percent),
    noStackWithSale: row.no_stack_with_sale,
  }
}

function mapAccountToPublic(row: {
  user_id: string
  balance: number
  lifetime_earned: number
  tier: string
  tier_evaluated_at: Date
  last_activity_at: Date
  composite_score?: string | null
}): LoyaltyAccountPublic {
  return {
    userId: row.user_id,
    balance: row.balance,
    lifetimeEarned: row.lifetime_earned,
    tier: row.tier as TierLevel,
    tierEvaluatedAt: row.tier_evaluated_at.toISOString(),
    lastActivityAt: row.last_activity_at.toISOString(),
    compositeScore: Number(row.composite_score ?? 0),
  }
}

function mapLedgerRow(row: {
  id: string
  user_id: string
  type: string
  points: number
  order_id: string | null
  metadata_json: unknown
  created_at: Date
}): LedgerEntryPublic {
  const meta =
    row.metadata_json != null &&
    typeof row.metadata_json === 'object' &&
    !Array.isArray(row.metadata_json)
      ? (row.metadata_json as Record<string, unknown>)
      : {}
  return {
    id: row.id,
    userId: row.user_id,
    type: row.type as LedgerEntryPublic['type'],
    points: row.points,
    orderId: row.order_id,
    metadataJson: meta,
    createdAt: row.created_at.toISOString(),
  }
}

function mapGrantRow(row: {
  id: string
  user_id: string
  points: number
  reason: string
  granted_by_admin_id: string | null
  created_at: Date
}): LoyaltyGrantPublic {
  return {
    id: row.id,
    userId: row.user_id,
    points: row.points,
    reason: row.reason,
    grantedByAdminId: row.granted_by_admin_id,
    createdAt: row.created_at.toISOString(),
  }
}

// —— Tier computation (no Redis lock) ——

export async function computeAndUpdateTier({
  userId,
}: {
  userId: string
}): Promise<{ newTier: TierLevel; compositeScore: number }> {
  const rules = await getLoyaltyRulesNullable()
  if (!rules) throw new AppError('RULES_NOT_FOUND', 404)

  const windowM = rules.evaluation_window_months
  const [orderCount, earnedPoints] = await Promise.all([
    getOrderCountInWindow({ userId, windowMonths: windowM }),
    getEarnedPointsInWindow({ userId, windowMonths: windowM }),
  ])

  const compositeScore = computeCompositeScore({
    orderCount,
    earnedPoints,
    frequencyWeight: Number(rules.frequency_weight),
    spendWeight: Number(rules.spend_weight),
    spendNormalisationFactor: rules.spend_normalisation_factor,
  })

  const thresholds = rules.tier_thresholds_json as {
    BRONZE: number
    SILVER: number
    GOLD: number
  }
  const newTier: TierLevel =
    compositeScore >= thresholds.GOLD
      ? 'GOLD'
      : compositeScore >= thresholds.SILVER
        ? 'SILVER'
        : 'BRONZE'

  await updateCompositeScoreAndTier({ userId, compositeScore, tier: newTier })
  return { newTier, compositeScore }
}

// —— Balance mutations (lock + single tx) ——

export async function earnPoints({
  userId,
  points,
  orderId,
  type = 'EARN',
  metadataJson,
}: {
  userId: string
  points: number
  orderId?: string | null
  type?: 'EARN' | 'BONUS'
  metadataJson?: Record<string, unknown>
}): Promise<{ newBalance: number }> {
  if (points <= 0) throw new AppError('EARN_POINTS_MUST_BE_POSITIVE', 400)
  try {
    return await withLoyaltyLock(userId, async () => {
      const { newBalance } = await db.transaction(async (tx) => {
        await insertLedgerEntryInTx({
          tx,
          userId,
          type,
          points,
          orderId: orderId ?? null,
          metadataJson,
        })
        const { balance } = await updateBalanceInTx({ tx, userId, delta: points })
        return { newBalance: balance }
      })
      await computeAndUpdateTier({ userId })
      return { newBalance }
    })
  } catch (err) {
    toAppError(err)
  }
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
  if (points <= 0) throw new AppError('REDEEM_POINTS_MUST_BE_POSITIVE', 400)
  try {
    const account = await getLoyaltyAccount({ userId })
    if (!account) throw new AppError('LOYALTY_ACCOUNT_NOT_FOUND', 404)
    if (account.balance < points) throw new AppError('INSUFFICIENT_POINTS', 409)

    return await withLoyaltyLock(userId, async () => {
      const { newBalance } = await db.transaction(async (tx) => {
        await insertLedgerEntryInTx({
          tx,
          userId,
          type: 'REDEEM',
          points: -points,
          orderId,
          metadataJson,
        })
        const { balance } = await updateBalanceInTx({ tx, userId, delta: -points })
        return { newBalance: balance }
      })
      return { newBalance }
    })
  } catch (err) {
    if (err instanceof AppError) throw err
    toAppError(err)
  }
}

export async function adminGrantPoints({
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
  if (points <= 0) throw new AppError('GRANT_POINTS_MUST_BE_POSITIVE', 400)
  if (!reason?.trim()) throw new AppError('REASON_REQUIRED', 400)

  const account = await getLoyaltyAccount({ userId })
  if (!account) throw new AppError('LOYALTY_ACCOUNT_NOT_FOUND', 404)

  try {
    return await withLoyaltyLock(userId, async () => {
      const { newBalance } = await db.transaction(async (tx) => {
        const grant = await insertGrantInTx({
          tx,
          userId,
          points,
          reason: reason.trim(),
          grantedByAdminId: adminId,
        })
        await insertLedgerEntryInTx({
          tx,
          userId,
          type: 'BONUS',
          points,
          orderId: null,
          metadataJson: {
            type: 'admin_grant',
            grantId: grant.id,
            reason: reason.trim(),
            adminId,
          },
        })
        const { balance } = await updateBalanceInTx({ tx, userId, delta: points })
        return { newBalance: balance }
      })
      await computeAndUpdateTier({ userId })
      return { newBalance }
    })
  } catch (err) {
    toAppError(err)
  }
}

export async function adminAdjustPoints({
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
  if (points === 0) throw new AppError('ADJUST_POINTS_CANNOT_BE_ZERO', 400)
  if (!reason?.trim()) throw new AppError('REASON_REQUIRED', 400)

  const account = await getLoyaltyAccount({ userId })
  if (!account) throw new AppError('LOYALTY_ACCOUNT_NOT_FOUND', 404)
  if (points < 0 && account.balance < Math.abs(points)) {
    throw new AppError('BALANCE_WOULD_GO_NEGATIVE', 409)
  }

  try {
    return await withLoyaltyLock(userId, async () => {
      const { newBalance } = await db.transaction(async (tx) => {
        await insertLedgerEntryInTx({
          tx,
          userId,
          type: 'ADJUST',
          points,
          orderId: null,
          metadataJson: { reason: reason.trim(), adminId },
        })
        const { balance } = await updateBalanceInTx({ tx, userId, delta: points })
        return { newBalance: balance }
      })
      await computeAndUpdateTier({ userId })
      return { newBalance }
    })
  } catch (err) {
    toAppError(err)
  }
}

// —— Earn calculation (local) ——

export function calculateEarnedPoints({
  subtotal,
  currency,
  tier,
  rules,
  isSaleOrder,
}: {
  subtotal: string
  currency: CurrencyCode
  tier: TierLevel
  rules: LoyaltyRules
  isSaleOrder: boolean
}): number {
  if (isSaleOrder && rules.no_stack_with_sale) return 0
  const earnRates = rules.earn_rate_json as Record<
    string,
    { points: number; per_amount: number }
  >
  const rate = earnRates[currency]
  if (!rate) return 0
  const basePoints = Math.floor(
    new Decimal(subtotal).div(rate.per_amount).mul(rate.points).toNumber(),
  )
  const multipliers = rules.multipliers_json as Record<string, number>
  const multiplier = multipliers[tier] ?? 1.0
  const earnedPoints = Math.floor(new Decimal(basePoints).mul(multiplier).toNumber())
  return Math.max(0, earnedPoints)
}

export function calculateRedemptionDiscount({
  pointsToRedeem,
  subtotal,
  currency,
  rules,
}: {
  pointsToRedeem: number
  subtotal: string
  currency: CurrencyCode
  rules: LoyaltyRules
}): { discountAmount: string; pointsActuallyUsed: number } {
  if (pointsToRedeem < rules.min_redeem) {
    throw new AppError(
      'BELOW_MINIMUM_REDEEM',
      400,
      `Minimum redeem is ${rules.min_redeem}, requested ${pointsToRedeem}`,
    )
  }
  const maxRedeemPercent = Number(rules.max_redeem_percent)
  const maxDiscount = new Decimal(subtotal)
    .mul(maxRedeemPercent)
    .div(100)
  const rates = rules.redemption_rate_by_currency_json as Record<
    string,
    { points: number; value: number }
  >
  const rate = rates[currency]
  if (!rate) return { discountAmount: '0.00', pointsActuallyUsed: 0 }
  const requestedDiscount = new Decimal(pointsToRedeem)
    .div(rate.points)
    .mul(rate.value)
  const finalDiscount = Decimal.min(requestedDiscount, maxDiscount).toDecimalPlaces(
    2,
  )
  const pointsActuallyUsed = Math.ceil(
    finalDiscount.div(rate.value).mul(rate.points).toNumber(),
  )
  return {
    discountAmount: finalDiscount.toFixed(2),
    pointsActuallyUsed,
  }
}

function nextTierProgress({
  tier,
  compositeScore,
  thresholds,
}: {
  tier: TierLevel
  compositeScore: number
  thresholds: { BRONZE: number; SILVER: number; GOLD: number }
}): {
  nextTierThreshold: number
  nextTierName: TierLevel | null
  pointsUntilNextTier: number
} {
  if (tier === 'GOLD') {
    return {
      nextTierThreshold: thresholds.GOLD,
      nextTierName: null,
      pointsUntilNextTier: 0,
    }
  }
  if (tier === 'SILVER') {
    const need = thresholds.GOLD
    return {
      nextTierThreshold: need,
      nextTierName: 'GOLD',
      pointsUntilNextTier: Math.max(0, new Decimal(need).minus(compositeScore).toNumber()),
    }
  }
  const need = thresholds.SILVER
  return {
    nextTierThreshold: need,
    nextTierName: 'SILVER',
    pointsUntilNextTier: Math.max(0, new Decimal(need).minus(compositeScore).toNumber()),
  }
}

// —— Customer ——

export async function getMyLoyalty({ userId }: { userId: string }): Promise<LoyaltyAccountDetail> {
  try {
    const account = await getLoyaltyAccountOrThrow({ userId })
    const rules = await getLoyaltyRules()
    const rulesPublic = parseRulesRow(rules)
    const windowM = rules.evaluation_window_months
    const [frequencyLast12m, spendLast12m, ledgerPage] = await Promise.all([
      getOrderCountInWindow({ userId, windowMonths: windowM }),
      getEarnedPointsInWindow({ userId, windowMonths: windowM }),
      getLedgerForUser({ userId, page: 1, limit: 20 }),
    ])
    const thresholds = rules.tier_thresholds_json as {
      BRONZE: number
      SILVER: number
      GOLD: number
    }
    const compositeScore = Number(account.composite_score ?? 0)
    const tier = account.tier as TierLevel
    const progress = nextTierProgress({ tier, compositeScore, thresholds })

    return {
      account: mapAccountToPublic(account),
      recentLedger: ledgerPage.ledger.map(mapLedgerRow),
      rules: rulesPublic,
      frequencyLast12m,
      spendLast12m,
      nextTierThreshold: progress.nextTierThreshold,
      nextTierName: progress.nextTierName,
      pointsUntilNextTier: progress.pointsUntilNextTier,
    }
  } catch (err) {
    toAppError(err)
  }
}

/** @deprecated Use getMyLoyalty — kept for gradual client migration */
export async function getMyLoyaltyAccount({ userId }: { userId: string }) {
  const detail = await getMyLoyalty({ userId })
  return {
    balance: detail.account.balance,
    tier: detail.account.tier,
    lifetimeEarned: detail.account.lifetimeEarned,
    earned12m: detail.spendLast12m,
    nextTier:
      detail.nextTierName === null
        ? null
        : {
            tier: detail.nextTierName,
            pointsNeeded: detail.pointsUntilNextTier,
          },
    minRedeem: detail.rules.minRedeem,
    maxRedeemPercent: detail.rules.maxRedeemPercent,
    compositeScore: detail.account.compositeScore,
    frequencyLast12m: detail.frequencyLast12m,
    rules: detail.rules,
  }
}

export async function getMyLedger({
  userId,
  page,
  limit,
  type,
}: {
  userId: string
  page?: number
  limit?: number
  type?: 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRY' | 'ADJUST'
}) {
  try {
    const result = await getLedgerForUser({ userId, page, limit, type })
    return {
      entries: result.ledger.map(mapLedgerRow),
      ledger: result.ledger.map(mapLedgerRow),
      page: result.page,
      limit: result.limit,
      total: result.total,
    }
  } catch (err) {
    toAppError(err)
  }
}

export async function previewRedemption({
  userId,
  pointsToRedeem,
  subtotal,
  currency,
}: {
  userId: string
  pointsToRedeem: number
  subtotal: string
  currency: CurrencyCode
}) {
  try {
    const account = await getLoyaltyAccountOrThrow({ userId })
    if (pointsToRedeem > account.balance) {
      throw new AppError('INSUFFICIENT_POINTS', 409)
    }
    const rules = await getLoyaltyRules()
    const { discountAmount, pointsActuallyUsed } = calculateRedemptionDiscount({
      pointsToRedeem,
      subtotal,
      currency,
      rules,
    })
    return {
      discountAmount,
      pointsActuallyUsed,
      newBalanceAfter: new Decimal(account.balance)
        .minus(pointsActuallyUsed)
        .toNumber(),
    }
  } catch (err) {
    toAppError(err)
  }
}

// —— Order-linked ——

export async function earnPointsForOrder({
  userId,
  orderId,
}: {
  userId: string
  orderId: string
}) {
  try {
    const order = await getOrderById({ id: orderId })
    if (!order) throw new AppError('ORDER_NOT_FOUND', 404)
    if (order.payment_state !== 'PAID') {
      throw new AppError('ORDER_NOT_PAID', 422)
    }
    const account = await getLoyaltyAccountOrThrow({ userId })
    const rules = await getLoyaltyRules()
    const earned = calculateEarnedPoints({
      subtotal: String(order.subtotal),
      currency: order.currency as CurrencyCode,
      tier: account.tier as TierLevel,
      rules,
      isSaleOrder: false,
    })
    if (earned === 0) return { pointsEarned: 0 }

    const previousTier = account.tier as TierLevel
    await earnPoints({
      userId,
      points: earned,
      orderId,
      metadataJson: {
        currency: order.currency,
        subtotal: String(order.subtotal),
        order_ref: order.order_ref,
        multiplier: (rules.multipliers_json as Record<string, number>)[account.tier],
      },
    })
    const accountAfter = await getLoyaltyAccountOrThrow({ userId })
    const newTier = accountAfter.tier as TierLevel
    if (tierRank(newTier) > tierRank(previousTier)) {
      notifyLoyaltyTierUpgraded({
        userId,
        newTier,
        previousTier,
      }).catch(() => {})
    }
    notifyLoyaltyPointsEarned({
      userId,
      points: earned,
      newBalance: accountAfter.balance,
      orderRef: order.order_ref,
    }).catch(() => {})
    return { pointsEarned: earned }
  } catch (err) {
    toAppError(err)
  }
}

export async function redeemPointsForOrder({
  userId,
  orderId,
  pointsToRedeem,
  subtotal,
  currency,
}: {
  userId: string
  orderId: string
  pointsToRedeem: number
  subtotal: string
  currency: CurrencyCode
}) {
  try {
    const account = await getLoyaltyAccountOrThrow({ userId })
    const rules = await getLoyaltyRules()
    const { discountAmount, pointsActuallyUsed } = calculateRedemptionDiscount({
      pointsToRedeem,
      subtotal,
      currency,
      rules,
    })
    if (pointsActuallyUsed > account.balance) {
      throw new AppError('INSUFFICIENT_POINTS', 409)
    }
    await redeemPoints({
      userId,
      points: pointsActuallyUsed,
      orderId,
      metadataJson: {
        discountAmount,
        currency,
        requestedPoints: pointsToRedeem,
      },
    })
    return { discountAmount, pointsActuallyUsed }
  } catch (err) {
    toAppError(err)
  }
}

// —— Admin ——

export async function adminSearchUsers({ email }: { email: string }) {
  try {
    const rules = await getLoyaltyRules()
    const windowM = rules.evaluation_window_months
    const rows = await searchUserByEmail({ email, evaluationWindowMonths: windowM })
    const usersOut: AdminLoyaltySearchRow[] = rows.map((r: SearchUserByEmailRow) => ({
      userId: r.user_id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      balance: r.balance ?? 0,
      tier: (r.tier ?? 'BRONZE') as TierLevel,
      compositeScore: Number(r.composite_score ?? 0),
      lastActivityAt: r.last_activity_at?.toISOString() ?? null,
      frequencyLast12m: Number(r.frequency_last12m ?? 0),
      spendLast12m: Number(r.spend_last12m ?? 0),
    }))
    return { users: usersOut }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminListTopUsers({ limit }: { limit?: number } = {}) {
  try {
    const rows = await listTopLoyaltyUsers({ limit: limit ?? 25 })
    const users: AdminTopLoyaltyUserRow[] = rows.map((r: TopLoyaltyUserRow) => ({
      userId: r.user_id,
      email: r.email,
      firstName: r.first_name,
      lastName: r.last_name,
      tier: r.tier as TierLevel,
      balance: r.balance,
      compositeScore: Number(r.composite_score ?? 0),
    }))
    return { users }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminGetUserLoyalty({ userId }: { userId: string }) {
  try {
    const user = await getUserById({ id: userId })
    if (!user) throw new AppError('USER_NOT_FOUND', 404)
    const account = await getLoyaltyAccountOrThrow({ userId })
    const rules = await getLoyaltyRules()
    const windowM = rules.evaluation_window_months
    const [frequencyLast12m, spendLast12m, ledgerPage, grants] = await Promise.all([
      getOrderCountInWindow({ userId, windowMonths: windowM }),
      getEarnedPointsInWindow({ userId, windowMonths: windowM }),
      getLedgerForUser({ userId, page: 1, limit: 10 }),
      getGrantsForUser({ userId }),
    ])
    const summary: AdminUserLoyaltySummary = {
      userId: user.id,
      email: user.email,
      firstName: user.firstName ?? '',
      lastName: user.lastName ?? '',
      account: mapAccountToPublic(account),
      frequencyLast12m,
      spendLast12m,
      recentLedger: ledgerPage.ledger.map(mapLedgerRow),
      grants: grants.map(mapGrantRow),
    }
    return summary
  } catch (err) {
    toAppError(err)
  }
}

export async function adminReconcileBalance({
  userId,
  adminId,
}: {
  userId: string
  adminId: string
}) {
  try {
    return await withLoyaltyLock(userId, async () => {
      const account = await getLoyaltyAccountOrThrow({ userId })
      const previousBalance = account.balance
      const ledgerSum = await getLedgerPointsSum({ userId })
      if (ledgerSum === previousBalance) {
        return {
          correctedBalance: previousBalance,
          ledgerSum,
          hadDrift: false,
        }
      }
      const delta = new Decimal(ledgerSum).minus(previousBalance).toNumber()
      await db.transaction(async (tx) => {
        await insertLedgerEntryInTx({
          tx,
          userId,
          type: 'ADJUST',
          points: delta,
          orderId: null,
          metadataJson: {
            reason: 'reconciliation',
            adminId,
            previousBalance,
            ledgerSum,
          },
        })
        await updateBalanceInTx({ tx, userId, delta })
      })
      await computeAndUpdateTier({ userId })
      const after = await getLoyaltyAccountOrThrow({ userId })
      return {
        correctedBalance: after.balance,
        ledgerSum,
        hadDrift: true,
      }
    })
  } catch (err) {
    toAppError(err)
  }
}

export async function adminGetLoyaltyRules() {
  try {
    const rules = await getLoyaltyRules()
    return { rules: parseRulesRow(rules) }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminUpdateLoyaltyRules({
  fields,
  adminId,
}: {
  fields: {
    earnRateJson?: Record<string, { points: number; per_amount: number }>
    redemptionRateByCurrencyJson?: Record<
      string,
      { points: number; value: number }
    >
    tierThresholdsJson?: { BRONZE: number; SILVER: number; GOLD: number }
    multipliersJson?: { BRONZE: number; SILVER: number; GOLD: number }
    frequencyWeight?: number
    spendWeight?: number
    spendNormalisationFactor?: number
    evaluationWindowMonths?: number
    pointsExpiryMonths?: number
    minRedeem?: number
    maxRedeemPercent?: number
    noStackWithSale?: boolean
  }
  adminId: string
}) {
  if (
    fields.frequencyWeight !== undefined &&
    fields.spendWeight !== undefined
  ) {
    const sum = new Decimal(fields.frequencyWeight).plus(fields.spendWeight)
    if (!sum.minus(1).abs().lte(0.001)) {
      throw new AppError(
        'WEIGHTS_MUST_SUM_TO_ONE',
        400,
        `frequencyWeight (${fields.frequencyWeight}) + spendWeight (${fields.spendWeight}) must equal 1.0`,
      )
    }
  }
  if (fields.evaluationWindowMonths !== undefined) {
    const m = fields.evaluationWindowMonths
    if (m < 1 || m > 36) {
      throw new AppError('EVALUATION_WINDOW_OUT_OF_RANGE', 400, 'Must be 1–36 months')
    }
  }
  if (fields.pointsExpiryMonths !== undefined) {
    const m = fields.pointsExpiryMonths
    if (m < 1 || m > 60) {
      throw new AppError('EXPIRY_MONTHS_OUT_OF_RANGE', 400, 'Must be 1–60 months')
    }
  }

  try {
    const rules = await updateLoyaltyRules({
      earnRateJson: fields.earnRateJson,
      redemptionRateByCurrencyJson: fields.redemptionRateByCurrencyJson,
      tierThresholdsJson: fields.tierThresholdsJson,
      multipliersJson: fields.multipliersJson,
      minRedeem: fields.minRedeem,
      maxRedeemPercent: fields.maxRedeemPercent,
      noStackWithSale: fields.noStackWithSale,
      frequencyWeight: fields.frequencyWeight,
      spendWeight: fields.spendWeight,
      spendNormalisationFactor: fields.spendNormalisationFactor,
      evaluationWindowMonths: fields.evaluationWindowMonths,
      pointsExpiryMonths: fields.pointsExpiryMonths,
      updatedByAdminId: adminId,
    })
    return { rules: parseRulesRow(rules) }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminReEvaluateTier({ userId }: { userId: string }) {
  try {
    return await computeAndUpdateTier({ userId })
  } catch (err) {
    toAppError(err)
  }
}
