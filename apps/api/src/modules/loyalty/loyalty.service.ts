/**
 * Loyalty service — earn/redeem, tier, admin grants/adjust/reconcile, rules.
 * RORO. Maps db-layer errors to AppError. Uses Decimal.js for money/points.
 */

import Decimal from 'decimal.js'
import { AppError } from '../../lib/errors'
import {
  getLoyaltyAccount,
  getLoyaltyAccountOrThrow,
  getLoyaltyRules,
  updateLoyaltyRules,
  getLedgerForUser,
  getRolling12MonthEarned,
  reconcileBalance,
  earnPoints,
  redeemPoints,
  adjustPoints,
  grantPoints,
  updateTier,
} from '@modett/db'
import { getOrderById } from '@modett/db'
import {
  notifyLoyaltyPointsEarned,
  notifyLoyaltyTierUpgraded,
} from '../messaging'
import type { LoyaltyRules } from '@modett/db'
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
  const earnedPoints = Math.floor(basePoints * multiplier)
  return Math.max(0, earnedPoints)
}

// —— Redemption calculation (local) ——

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

// —— Customer ——

export async function getMyLoyaltyAccount({
  userId,
}: {
  userId: string
}) {
  try {
    const account = await getLoyaltyAccountOrThrow({ userId })
    const rules = await getLoyaltyRules()
    const earned12m = await getRolling12MonthEarned({ userId })
    const thresholds = rules.tier_thresholds_json as {
      BRONZE: number
      SILVER: number
      GOLD: number
    }
    const nextTierInfo =
      account.tier === 'GOLD'
        ? null
        : account.tier === 'SILVER'
          ? { tier: 'GOLD' as const, pointsNeeded: thresholds.GOLD - earned12m }
          : {
              tier: 'SILVER' as const,
              pointsNeeded: thresholds.SILVER - earned12m,
            }
    return {
      balance: account.balance,
      tier: account.tier,
      lifetimeEarned: account.lifetime_earned,
      earned12m,
      nextTier: nextTierInfo,
      minRedeem: rules.min_redeem,
      maxRedeemPercent: Number(rules.max_redeem_percent),
    }
  } catch (err) {
    toAppError(err)
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
    const result = await getLedgerForUser({ userId, page, limit, type: type })
    return {
      ledger: result.ledger,
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
      newBalanceAfter: account.balance - pointsActuallyUsed,
    }
  } catch (err) {
    toAppError(err)
  }
}

// —— Order-linked (called by Payments / checkout) ——

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

    await earnPoints({
      userId,
      points: earned,
      orderId,
      metadataJson: {
        currency: order.currency,
        subtotal: String(order.subtotal),
        multiplier: (rules.multipliers_json as Record<string, number>)[
          account.tier
        ],
      },
    })
    const previousTier = account.tier
    updateTier({ userId })
      .then(({ newTier }) => {
        if (newTier !== previousTier) {
          notifyLoyaltyTierUpgraded({
            userId,
            newTier,
            previousTier,
          }).catch(() => {})
        }
      })
      .catch((err) =>
        console.error('[loyalty] tier update failed:', err),
      )
    const accountAfter = await getLoyaltyAccountOrThrow({ userId })
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

export async function adminGetUserLoyalty({ userId }: { userId: string }) {
  try {
    const account = await getLoyaltyAccountOrThrow({ userId })
    const { ledger } = await getLedgerForUser({ userId, limit: 10 })
    return { account, recentLedger: ledger }
  } catch (err) {
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
}) {
  if (points <= 0) throw new AppError('INVALID_POINTS', 400)
  try {
    const { newBalance } = await grantPoints({ userId, points, reason, adminId })
    return { newBalance }
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
}) {
  try {
    const { newBalance } = await adjustPoints({
      userId,
      points,
      reason,
      adminId,
    })
    return { newBalance }
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
    const account = await getLoyaltyAccountOrThrow({ userId })
    const previousBalance = account.balance
    const { correctedBalance, ledgerSum } = await reconcileBalance({ userId })
    if (correctedBalance !== previousBalance) {
      await adjustPoints({
        userId,
        points: correctedBalance - previousBalance,
        reason: 'reconciliation',
        adminId,
      })
    }
    return { correctedBalance, ledgerSum }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminGetLoyaltyRules() {
  try {
    const rules = await getLoyaltyRules()
    return { rules }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminUpdateLoyaltyRules({
  earnRateJson,
  redemptionRateByCurrencyJson,
  tierThresholdsJson,
  multipliersJson,
  minRedeem,
  maxRedeemPercent,
  noStackWithSale,
  adminId,
}: {
  earnRateJson?: Record<string, { points: number; per_amount: number }>
  redemptionRateByCurrencyJson?: Record<
    string,
    { points: number; value: number }
  >
  tierThresholdsJson?: { BRONZE: number; SILVER: number; GOLD: number }
  multipliersJson?: { BRONZE: number; SILVER: number; GOLD: number }
  minRedeem?: number
  maxRedeemPercent?: number
  noStackWithSale?: boolean
  adminId: string
}) {
  try {
    const rules = await updateLoyaltyRules({
      earnRateJson,
      redemptionRateByCurrencyJson,
      tierThresholdsJson,
      multipliersJson,
      minRedeem,
      maxRedeemPercent,
      noStackWithSale,
      updatedByAdminId: adminId,
    })
    return { rules }
  } catch (err) {
    toAppError(err)
  }
}

export async function adminReEvaluateTier({ userId }: { userId: string }) {
  try {
    const { newTier, earned12m } = await updateTier({ userId })
    return { newTier, earned12m }
  } catch (err) {
    toAppError(err)
  }
}
