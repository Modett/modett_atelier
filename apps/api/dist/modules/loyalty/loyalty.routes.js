"use strict";
/**
 * Loyalty route handlers — customer account/ledger/preview; admin user/rules.
 * Success: { data: T }. No try/catch — errors propagate to global handler.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.loyaltyRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const loyaltyService = __importStar(require("./loyalty.service"));
const router = (0, express_1.Router)();
// —— Customer routes (requireAuth) ——
router.get('/loyalty/account', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const result = await loyaltyService.getMyLoyaltyAccount({
        userId: authReq.user.id,
    });
    res.status(200).json({ data: result });
});
const ledgerQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
    type: zod_1.z
        .enum(['EARN', 'REDEEM', 'BONUS', 'EXPIRY', 'ADJUST'])
        .optional(),
});
router.get('/loyalty/ledger', auth_1.requireAuth, (0, validate_1.validateQuery)(ledgerQuerySchema), async (req, res) => {
    const authReq = req;
    const query = req.validatedQuery;
    const result = await loyaltyService.getMyLedger({
        userId: authReq.user.id,
        page: query.page,
        limit: query.limit,
        type: query.type,
    });
    res.status(200).json({ data: result });
});
const redeemPreviewBodySchema = zod_1.z.object({
    pointsToRedeem: zod_1.z.number().int().min(1),
    subtotal: zod_1.z.string(),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']),
});
router.post('/loyalty/redeem/preview', auth_1.requireAuth, (0, validate_1.validate)(redeemPreviewBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    const result = await loyaltyService.previewRedemption({
        userId: authReq.user.id,
        pointsToRedeem: body.pointsToRedeem,
        subtotal: body.subtotal,
        currency: body.currency,
    });
    res.status(200).json({ data: result });
});
// —— Admin routes (requireAdmin) ——
router.get('/admin/loyalty/users/:userId', auth_1.requireAdmin, async (req, res) => {
    const userId = req.params.userId;
    const result = await loyaltyService.adminGetUserLoyalty({ userId });
    res.status(200).json({ data: result });
});
const grantBodySchema = zod_1.z.object({
    points: zod_1.z.number().int().min(1),
    reason: zod_1.z.string().min(1),
});
router.post('/admin/loyalty/users/:userId/grant', auth_1.requireAdmin, (0, validate_1.validate)(grantBodySchema), async (req, res) => {
    const adminReq = req;
    const userId = req.params.userId;
    const body = req.body;
    const result = await loyaltyService.adminGrantPoints({
        userId,
        points: body.points,
        reason: body.reason,
        adminId: adminReq.admin.id,
    });
    res.status(200).json({ data: result });
});
const adjustBodySchema = zod_1.z.object({
    points: zod_1.z.number().int(),
    reason: zod_1.z.string().min(1),
});
router.post('/admin/loyalty/users/:userId/adjust', auth_1.requireAdmin, (0, validate_1.validate)(adjustBodySchema), async (req, res) => {
    const adminReq = req;
    const userId = req.params.userId;
    const body = req.body;
    const result = await loyaltyService.adminAdjustPoints({
        userId,
        points: body.points,
        reason: body.reason,
        adminId: adminReq.admin.id,
    });
    res.status(200).json({ data: result });
});
router.post('/admin/loyalty/users/:userId/reconcile', auth_1.requireAdmin, async (req, res) => {
    const adminReq = req;
    const userId = req.params.userId;
    const result = await loyaltyService.adminReconcileBalance({
        userId,
        adminId: adminReq.admin.id,
    });
    res.status(200).json({ data: result });
});
router.post('/admin/loyalty/users/:userId/re-evaluate-tier', auth_1.requireAdmin, async (req, res) => {
    const userId = req.params.userId;
    const result = await loyaltyService.adminReEvaluateTier({ userId });
    res.status(200).json({ data: result });
});
router.get('/admin/loyalty/rules', auth_1.requireAdmin, async (_req, res) => {
    const result = await loyaltyService.adminGetLoyaltyRules();
    res.status(200).json({ data: result });
});
const updateRulesBodySchema = zod_1.z.object({
    earnRateJson: zod_1.z
        .record(zod_1.z.object({
        points: zod_1.z.number(),
        per_amount: zod_1.z.number(),
    }))
        .optional(),
    redemptionRateByCurrencyJson: zod_1.z
        .record(zod_1.z.object({
        points: zod_1.z.number(),
        value: zod_1.z.number(),
    }))
        .optional(),
    tierThresholdsJson: zod_1.z
        .object({
        BRONZE: zod_1.z.number(),
        SILVER: zod_1.z.number(),
        GOLD: zod_1.z.number(),
    })
        .optional(),
    multipliersJson: zod_1.z
        .object({
        BRONZE: zod_1.z.number(),
        SILVER: zod_1.z.number(),
        GOLD: zod_1.z.number(),
    })
        .optional(),
    minRedeem: zod_1.z.number().int().min(1).optional(),
    maxRedeemPercent: zod_1.z.number().min(0).max(100).optional(),
    noStackWithSale: zod_1.z.boolean().optional(),
});
router.patch('/admin/loyalty/rules', auth_1.requireAdmin, (0, validate_1.validate)(updateRulesBodySchema), async (req, res) => {
    const adminReq = req;
    const body = req.body;
    const result = await loyaltyService.adminUpdateLoyaltyRules({
        ...body,
        adminId: adminReq.admin.id,
    });
    res.status(200).json({ data: result });
});
exports.loyaltyRoutes = router;
//# sourceMappingURL=loyalty.routes.js.map