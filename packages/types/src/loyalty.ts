/**
 * Loyalty API-facing types (camelCase JSON shapes where returned from API).
 */

import type { LedgerType, TierLevel } from './enums'

export type { TierLevel, LedgerType }

export interface EarnRateEntry {
  points: number
  per_amount: number
}

export interface RedemptionRateEntry {
  points: number
  value: number
}

export interface LoyaltyRulesPublic {
  earnRateJson: {
    LKR: EarnRateEntry
    SGD: EarnRateEntry
    USD: EarnRateEntry
  }
  redemptionRateByCurrencyJson: {
    LKR: RedemptionRateEntry
    SGD: RedemptionRateEntry
    USD: RedemptionRateEntry
  }
  tierThresholdsJson: {
    BRONZE: number
    SILVER: number
    GOLD: number
  }
  multipliersJson: {
    BRONZE: number
    SILVER: number
    GOLD: number
  }
  frequencyWeight: number
  spendWeight: number
  spendNormalisationFactor: number
  evaluationWindowMonths: number
  pointsExpiryMonths: number
  minRedeem: number
  maxRedeemPercent: number
  noStackWithSale: boolean
}

export interface LoyaltyAccountPublic {
  userId: string
  balance: number
  lifetimeEarned: number
  tier: TierLevel
  tierEvaluatedAt: string
  lastActivityAt: string
  compositeScore: number
}

export interface LedgerEntryPublic {
  id: string
  userId: string
  type: LedgerType
  points: number
  orderId: string | null
  metadataJson: Record<string, unknown>
  createdAt: string
}

export interface LoyaltyGrantPublic {
  id: string
  userId: string
  points: number
  reason: string
  grantedByAdminId: string | null
  createdAt: string
}

export interface LoyaltyAccountDetail {
  account: LoyaltyAccountPublic
  recentLedger: LedgerEntryPublic[]
  rules: LoyaltyRulesPublic
  frequencyLast12m: number
  spendLast12m: number
  nextTierThreshold: number
  nextTierName: TierLevel | null
  pointsUntilNextTier: number
}

export interface AdminUserLoyaltySummary {
  userId: string
  email: string
  firstName: string
  lastName: string
  account: LoyaltyAccountPublic
  frequencyLast12m: number
  spendLast12m: number
  recentLedger: LedgerEntryPublic[]
  grants: LoyaltyGrantPublic[]
}

export interface AdminLoyaltySearchRow {
  userId: string
  email: string
  firstName: string
  lastName: string
  balance: number
  tier: TierLevel
  compositeScore: number
  lastActivityAt: string | null
  frequencyLast12m: number
  spendLast12m: number
}

export interface AdminTopLoyaltyUserRow {
  userId: string
  email: string
  firstName: string
  lastName: string
  tier: TierLevel
  balance: number
  compositeScore: number
}
