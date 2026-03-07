/**
 * Loyalty service — earn/redeem, tier, admin grants/adjust/reconcile, rules.
 * RORO. Maps db-layer errors to AppError. Uses Decimal.js for money/points.
 */
import type { LoyaltyRules } from '@modett/db';
type CurrencyCode = 'LKR' | 'SGD' | 'USD';
type TierLevel = 'BRONZE' | 'SILVER' | 'GOLD';
export declare function calculateEarnedPoints({ subtotal, currency, tier, rules, isSaleOrder, }: {
    subtotal: string;
    currency: CurrencyCode;
    tier: TierLevel;
    rules: LoyaltyRules;
    isSaleOrder: boolean;
}): number;
export declare function calculateRedemptionDiscount({ pointsToRedeem, subtotal, currency, rules, }: {
    pointsToRedeem: number;
    subtotal: string;
    currency: CurrencyCode;
    rules: LoyaltyRules;
}): {
    discountAmount: string;
    pointsActuallyUsed: number;
};
export declare function getMyLoyaltyAccount({ userId, }: {
    userId: string;
}): Promise<{
    balance: number;
    tier: "BRONZE" | "SILVER" | "GOLD";
    lifetimeEarned: number;
    earned12m: number;
    nextTier: {
        tier: "GOLD";
        pointsNeeded: number;
    } | {
        tier: "SILVER";
        pointsNeeded: number;
    } | null;
    minRedeem: number;
    maxRedeemPercent: number;
}>;
export declare function getMyLedger({ userId, page, limit, type, }: {
    userId: string;
    page?: number;
    limit?: number;
    type?: 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRY' | 'ADJUST';
}): Promise<{
    ledger: {
        id: string;
        created_at: Date;
        user_id: string;
        type: "EARN" | "REDEEM" | "BONUS" | "EXPIRY" | "ADJUST";
        order_id: string | null;
        points: number;
        metadata_json: unknown;
    }[];
    page: number;
    limit: number;
    total: number;
}>;
export declare function previewRedemption({ userId, pointsToRedeem, subtotal, currency, }: {
    userId: string;
    pointsToRedeem: number;
    subtotal: string;
    currency: CurrencyCode;
}): Promise<{
    discountAmount: string;
    pointsActuallyUsed: number;
    newBalanceAfter: number;
}>;
export declare function earnPointsForOrder({ userId, orderId, }: {
    userId: string;
    orderId: string;
}): Promise<{
    pointsEarned: number;
}>;
export declare function redeemPointsForOrder({ userId, orderId, pointsToRedeem, subtotal, currency, }: {
    userId: string;
    orderId: string;
    pointsToRedeem: number;
    subtotal: string;
    currency: CurrencyCode;
}): Promise<{
    discountAmount: string;
    pointsActuallyUsed: number;
}>;
export declare function adminGetUserLoyalty({ userId }: {
    userId: string;
}): Promise<{
    account: {
        user_id: string;
        balance: number;
        lifetime_earned: number;
        tier: "BRONZE" | "SILVER" | "GOLD";
        tier_evaluated_at: Date;
        last_activity_at: Date;
    };
    recentLedger: {
        id: string;
        created_at: Date;
        user_id: string;
        type: "EARN" | "REDEEM" | "BONUS" | "EXPIRY" | "ADJUST";
        order_id: string | null;
        points: number;
        metadata_json: unknown;
    }[];
}>;
export declare function adminGrantPoints({ userId, points, reason, adminId, }: {
    userId: string;
    points: number;
    reason: string;
    adminId: string;
}): Promise<{
    newBalance: number;
}>;
export declare function adminAdjustPoints({ userId, points, reason, adminId, }: {
    userId: string;
    points: number;
    reason: string;
    adminId: string;
}): Promise<{
    newBalance: number;
}>;
export declare function adminReconcileBalance({ userId, adminId, }: {
    userId: string;
    adminId: string;
}): Promise<{
    correctedBalance: number;
    ledgerSum: number;
}>;
export declare function adminGetLoyaltyRules(): Promise<{
    rules: {
        id: string;
        updated_at: Date;
        earn_rate_json: unknown;
        redemption_rate_by_currency_json: unknown;
        tier_thresholds_json: unknown;
        multipliers_json: unknown;
        min_redeem: number;
        max_redeem_percent: string;
        no_stack_with_sale: boolean;
        updated_by_admin_id: string | null;
    };
}>;
export declare function adminUpdateLoyaltyRules({ earnRateJson, redemptionRateByCurrencyJson, tierThresholdsJson, multipliersJson, minRedeem, maxRedeemPercent, noStackWithSale, adminId, }: {
    earnRateJson?: Record<string, {
        points: number;
        per_amount: number;
    }>;
    redemptionRateByCurrencyJson?: Record<string, {
        points: number;
        value: number;
    }>;
    tierThresholdsJson?: {
        BRONZE: number;
        SILVER: number;
        GOLD: number;
    };
    multipliersJson?: {
        BRONZE: number;
        SILVER: number;
        GOLD: number;
    };
    minRedeem?: number;
    maxRedeemPercent?: number;
    noStackWithSale?: boolean;
    adminId: string;
}): Promise<{
    rules: {
        id: string;
        updated_at: Date;
        earn_rate_json: unknown;
        redemption_rate_by_currency_json: unknown;
        tier_thresholds_json: unknown;
        multipliers_json: unknown;
        min_redeem: number;
        max_redeem_percent: string;
        no_stack_with_sale: boolean;
        updated_by_admin_id: string | null;
    };
}>;
export declare function adminReEvaluateTier({ userId }: {
    userId: string;
}): Promise<{
    newTier: "BRONZE" | "SILVER" | "GOLD";
    earned12m: number;
}>;
export {};
//# sourceMappingURL=loyalty.service.d.ts.map