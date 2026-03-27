"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.calculateEarnedPoints = calculateEarnedPoints;
exports.calculateRedemptionDiscount = calculateRedemptionDiscount;
exports.getMyLoyaltyAccount = getMyLoyaltyAccount;
exports.getMyLedger = getMyLedger;
exports.previewRedemption = previewRedemption;
exports.earnPointsForOrder = earnPointsForOrder;
exports.redeemPointsForOrder = redeemPointsForOrder;
exports.adminGetUserLoyalty = adminGetUserLoyalty;
exports.adminGrantPoints = adminGrantPoints;
exports.adminAdjustPoints = adminAdjustPoints;
exports.adminReconcileBalance = adminReconcileBalance;
exports.adminGetLoyaltyRules = adminGetLoyaltyRules;
exports.adminUpdateLoyaltyRules = adminUpdateLoyaltyRules;
exports.adminReEvaluateTier = adminReEvaluateTier;
const decimal_js_1 = __importDefault(require("decimal.js"));
const errors_1 = require("../../lib/errors");
const db_1 = require("@modett/db");
const db_2 = require("@modett/db");
const messaging_1 = require("../messaging");
const db_3 = require("@modett/db");
function toAppError(err) {
    if (err instanceof db_3.LoyaltyAccountNotFoundError ||
        err instanceof db_3.InsufficientPointsError ||
        err instanceof db_3.LoyaltyRulesNotFoundError ||
        err instanceof db_3.BalanceWouldGoNegativeError ||
        err instanceof db_3.LoyaltyLockNotAcquiredError) {
        throw new errors_1.AppError(err.code, err.statusCode, err.message);
    }
    throw err;
}
function calculateEarnedPoints({ subtotal, currency, tier, rules, isSaleOrder, }) {
    if (isSaleOrder && rules.no_stack_with_sale)
        return 0;
    const earnRates = rules.earn_rate_json;
    const rate = earnRates[currency];
    if (!rate)
        return 0;
    const basePoints = Math.floor(new decimal_js_1.default(subtotal).div(rate.per_amount).mul(rate.points).toNumber());
    const multipliers = rules.multipliers_json;
    const multiplier = multipliers[tier] ?? 1.0;
    const earnedPoints = Math.floor(basePoints * multiplier);
    return Math.max(0, earnedPoints);
}
function calculateRedemptionDiscount({ pointsToRedeem, subtotal, currency, rules, }) {
    if (pointsToRedeem < rules.min_redeem) {
        throw new errors_1.AppError('BELOW_MINIMUM_REDEEM', 400, `Minimum redeem is ${rules.min_redeem}, requested ${pointsToRedeem}`);
    }
    const maxRedeemPercent = Number(rules.max_redeem_percent);
    const maxDiscount = new decimal_js_1.default(subtotal)
        .mul(maxRedeemPercent)
        .div(100);
    const rates = rules.redemption_rate_by_currency_json;
    const rate = rates[currency];
    if (!rate)
        return { discountAmount: '0.00', pointsActuallyUsed: 0 };
    const requestedDiscount = new decimal_js_1.default(pointsToRedeem)
        .div(rate.points)
        .mul(rate.value);
    const finalDiscount = decimal_js_1.default.min(requestedDiscount, maxDiscount).toDecimalPlaces(2);
    const pointsActuallyUsed = Math.ceil(finalDiscount.div(rate.value).mul(rate.points).toNumber());
    return {
        discountAmount: finalDiscount.toFixed(2),
        pointsActuallyUsed,
    };
}
async function getMyLoyaltyAccount({ userId, }) {
    try {
        const account = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        const rules = await (0, db_1.getLoyaltyRules)();
        const earned12m = await (0, db_1.getRolling12MonthEarned)({ userId });
        const thresholds = rules.tier_thresholds_json;
        const nextTierInfo = account.tier === 'GOLD'
            ? null
            : account.tier === 'SILVER'
                ? { tier: 'GOLD', pointsNeeded: thresholds.GOLD - earned12m }
                : {
                    tier: 'SILVER',
                    pointsNeeded: thresholds.SILVER - earned12m,
                };
        return {
            balance: account.balance,
            tier: account.tier,
            lifetimeEarned: account.lifetime_earned,
            earned12m,
            nextTier: nextTierInfo,
            minRedeem: rules.min_redeem,
            maxRedeemPercent: Number(rules.max_redeem_percent),
        };
    }
    catch (err) {
        toAppError(err);
    }
}
async function getMyLedger({ userId, page, limit, type, }) {
    try {
        const result = await (0, db_1.getLedgerForUser)({ userId, page, limit, type: type });
        return {
            ledger: result.ledger,
            page: result.page,
            limit: result.limit,
            total: result.total,
        };
    }
    catch (err) {
        toAppError(err);
    }
}
async function previewRedemption({ userId, pointsToRedeem, subtotal, currency, }) {
    try {
        const account = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        if (pointsToRedeem > account.balance) {
            throw new errors_1.AppError('INSUFFICIENT_POINTS', 409);
        }
        const rules = await (0, db_1.getLoyaltyRules)();
        const { discountAmount, pointsActuallyUsed } = calculateRedemptionDiscount({
            pointsToRedeem,
            subtotal,
            currency,
            rules,
        });
        return {
            discountAmount,
            pointsActuallyUsed,
            newBalanceAfter: account.balance - pointsActuallyUsed,
        };
    }
    catch (err) {
        toAppError(err);
    }
}
async function earnPointsForOrder({ userId, orderId, }) {
    try {
        const order = await (0, db_2.getOrderById)({ id: orderId });
        if (!order)
            throw new errors_1.AppError('ORDER_NOT_FOUND', 404);
        if (order.payment_state !== 'PAID') {
            throw new errors_1.AppError('ORDER_NOT_PAID', 422);
        }
        const account = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        const rules = await (0, db_1.getLoyaltyRules)();
        const earned = calculateEarnedPoints({
            subtotal: String(order.subtotal),
            currency: order.currency,
            tier: account.tier,
            rules,
            isSaleOrder: false,
        });
        if (earned === 0)
            return { pointsEarned: 0 };
        await (0, db_1.earnPoints)({
            userId,
            points: earned,
            orderId,
            metadataJson: {
                currency: order.currency,
                subtotal: String(order.subtotal),
                multiplier: rules.multipliers_json[account.tier],
            },
        });
        const previousTier = account.tier;
        (0, db_1.updateTier)({ userId })
            .then(({ newTier }) => {
            if (newTier !== previousTier) {
                (0, messaging_1.notifyLoyaltyTierUpgraded)({
                    userId,
                    newTier,
                    previousTier,
                }).catch(() => { });
            }
        })
            .catch((err) => console.error('[loyalty] tier update failed:', err));
        const accountAfter = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        (0, messaging_1.notifyLoyaltyPointsEarned)({
            userId,
            points: earned,
            newBalance: accountAfter.balance,
            orderRef: order.order_ref,
        }).catch(() => { });
        return { pointsEarned: earned };
    }
    catch (err) {
        toAppError(err);
    }
}
async function redeemPointsForOrder({ userId, orderId, pointsToRedeem, subtotal, currency, }) {
    try {
        const account = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        const rules = await (0, db_1.getLoyaltyRules)();
        const { discountAmount, pointsActuallyUsed } = calculateRedemptionDiscount({
            pointsToRedeem,
            subtotal,
            currency,
            rules,
        });
        if (pointsActuallyUsed > account.balance) {
            throw new errors_1.AppError('INSUFFICIENT_POINTS', 409);
        }
        await (0, db_1.redeemPoints)({
            userId,
            points: pointsActuallyUsed,
            orderId,
            metadataJson: {
                discountAmount,
                currency,
                requestedPoints: pointsToRedeem,
            },
        });
        return { discountAmount, pointsActuallyUsed };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminGetUserLoyalty({ userId }) {
    try {
        const account = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        const { ledger } = await (0, db_1.getLedgerForUser)({ userId, limit: 10 });
        return { account, recentLedger: ledger };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminGrantPoints({ userId, points, reason, adminId, }) {
    if (points <= 0)
        throw new errors_1.AppError('INVALID_POINTS', 400);
    try {
        const { newBalance } = await (0, db_1.grantPoints)({ userId, points, reason, adminId });
        return { newBalance };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminAdjustPoints({ userId, points, reason, adminId, }) {
    try {
        const { newBalance } = await (0, db_1.adjustPoints)({
            userId,
            points,
            reason,
            adminId,
        });
        return { newBalance };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminReconcileBalance({ userId, adminId, }) {
    try {
        const account = await (0, db_1.getLoyaltyAccountOrThrow)({ userId });
        const previousBalance = account.balance;
        const { correctedBalance, ledgerSum } = await (0, db_1.reconcileBalance)({ userId });
        if (correctedBalance !== previousBalance) {
            await (0, db_1.adjustPoints)({
                userId,
                points: correctedBalance - previousBalance,
                reason: 'reconciliation',
                adminId,
            });
        }
        return { correctedBalance, ledgerSum };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminGetLoyaltyRules() {
    try {
        const rules = await (0, db_1.getLoyaltyRules)();
        return { rules };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminUpdateLoyaltyRules({ earnRateJson, redemptionRateByCurrencyJson, tierThresholdsJson, multipliersJson, minRedeem, maxRedeemPercent, noStackWithSale, adminId, }) {
    try {
        const rules = await (0, db_1.updateLoyaltyRules)({
            earnRateJson,
            redemptionRateByCurrencyJson,
            tierThresholdsJson,
            multipliersJson,
            minRedeem,
            maxRedeemPercent,
            noStackWithSale,
            updatedByAdminId: adminId,
        });
        return { rules };
    }
    catch (err) {
        toAppError(err);
    }
}
async function adminReEvaluateTier({ userId }) {
    try {
        const { newTier, earned12m } = await (0, db_1.updateTier)({ userId });
        return { newTier, earned12m };
    }
    catch (err) {
        toAppError(err);
    }
}
