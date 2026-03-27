/**
 * Loyalty query functions — accounts, ledger, rules, grants, balance mutations.
 * No business logic. RORO. Balance mutations use withLoyaltyLock + db.transaction();
 * ledger INSERT + accounts UPDATE in same tx. Never UPDATE/DELETE ledger rows.
 */
import type { LoyaltyAccount, LoyaltyLedgerRow, LoyaltyRules } from '../schema/loyalty';
export declare function withLoyaltyLock<T>(userId: string, fn: () => Promise<T>): Promise<T>;
export declare function createLoyaltyAccount({ userId, }: {
    userId: string;
}): Promise<void>;
export declare function getLoyaltyAccount({ userId, }: {
    userId: string;
}): Promise<LoyaltyAccount | null>;
export declare function getLoyaltyAccountOrThrow({ userId, }: {
    userId: string;
}): Promise<LoyaltyAccount>;
export declare function getLoyaltyRules(): Promise<LoyaltyRules>;
export declare function updateLoyaltyRules({ earnRateJson, redemptionRateByCurrencyJson, tierThresholdsJson, multipliersJson, minRedeem, maxRedeemPercent, noStackWithSale, updatedByAdminId, }: {
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
    updatedByAdminId: string;
}): Promise<LoyaltyRules>;
export interface GetLedgerForUserResult {
    ledger: LoyaltyLedgerRow[];
    page: number;
    limit: number;
    total: number;
}
export declare function getLedgerForUser({ userId, page, limit, type: ledgerType, }: {
    userId: string;
    page?: number;
    limit?: number;
    type?: 'EARN' | 'REDEEM' | 'BONUS' | 'EXPIRY' | 'ADJUST';
}): Promise<GetLedgerForUserResult>;
export declare function getRolling12MonthEarned({ userId, }: {
    userId: string;
}): Promise<number>;
export declare function reconcileBalance({ userId, }: {
    userId: string;
}): Promise<{
    correctedBalance: number;
    ledgerSum: number;
}>;
export declare function earnPoints({ userId, points, orderId, metadataJson, }: {
    userId: string;
    points: number;
    orderId?: string | null;
    metadataJson?: Record<string, unknown>;
}): Promise<{
    newBalance: number;
}>;
export declare function redeemPoints({ userId, points, orderId, metadataJson, }: {
    userId: string;
    points: number;
    orderId: string;
    metadataJson?: Record<string, unknown>;
}): Promise<{
    newBalance: number;
}>;
export declare function adjustPoints({ userId, points, reason, adminId, }: {
    userId: string;
    points: number;
    reason: string;
    adminId: string;
}): Promise<{
    newBalance: number;
}>;
export declare function grantPoints({ userId, points, reason, adminId, }: {
    userId: string;
    points: number;
    reason: string;
    adminId: string;
}): Promise<{
    newBalance: number;
}>;
export declare function updateTier({ userId, }: {
    userId: string;
}): Promise<{
    newTier: 'BRONZE' | 'SILVER' | 'GOLD';
    earned12m: number;
}>;
//# sourceMappingURL=loyalty.d.ts.map