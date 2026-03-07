"use strict";
/**
 * Messaging route handlers — preferences, inbox, BIS/price-drop subscriptions,
 * notify-me, admin campaigns. Success: { data: T }. No try/catch.
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
exports.messagingRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const messagingService = __importStar(require("./messaging.service"));
const router = (0, express_1.Router)();
const channelEnum = zod_1.z.enum(['EMAIL', 'SMS', 'WHATSAPP', 'PUSH']);
// —— Customer: GET /notifications/preferences ——
router.get('/notifications/preferences', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const preferences = await messagingService.getMyPreferences({
        userId: authReq.user.id,
    });
    res.status(200).json({ data: { preferences } });
});
// —— Customer: PATCH /notifications/preferences ——
const patchPreferencesBodySchema = zod_1.z.object({
    emailOptIn: zod_1.z.boolean().optional(),
    smsOptIn: zod_1.z.boolean().optional(),
    whatsappOptIn: zod_1.z.boolean().optional(),
    pushOptIn: zod_1.z.boolean().optional(),
});
router.patch('/notifications/preferences', auth_1.requireAuth, (0, validate_1.validate)(patchPreferencesBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    const preferences = await messagingService.updateMyPreferences({
        userId: authReq.user.id,
        ...body,
    });
    res.status(200).json({ data: { preferences } });
});
// —— Customer: GET /inbox ——
const getInboxQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(50).default(20),
    unreadOnly: zod_1.z
        .string()
        .optional()
        .default('false')
        .transform((s) => s === 'true'),
});
router.get('/inbox', auth_1.requireAuth, (0, validate_1.validateQuery)(getInboxQuerySchema), async (req, res) => {
    const authReq = req;
    const query = req.validatedQuery;
    const result = await messagingService.getMyInbox({
        userId: authReq.user.id,
        page: query.page,
        limit: query.limit,
        unreadOnly: query.unreadOnly,
    });
    res.status(200).json({
        data: {
            messages: result.messages,
            unreadCount: result.unreadCount,
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
// —— Customer: POST /inbox/:messageId/read ——
router.post('/inbox/:messageId/read', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const messageId = req.params.messageId;
    await messagingService.markRead({
        messageId,
        userId: authReq.user.id,
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Customer: POST /inbox/read-all ——
router.post('/inbox/read-all', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    await messagingService.markAllRead({ userId: authReq.user.id });
    res.status(200).json({ data: { ok: true } });
});
// —— Customer: POST /notifications/back-in-stock ——
const postBackInStockBodySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid(),
    channels: zod_1.z.array(channelEnum).optional(),
});
router.post('/notifications/back-in-stock', auth_1.requireAuth, (0, validate_1.validate)(postBackInStockBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    await messagingService.subscribeBackInStock({
        userId: authReq.user.id,
        variantId: body.variantId,
        channels: body.channels,
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Customer: DELETE /notifications/back-in-stock/:variantId ——
router.delete('/notifications/back-in-stock/:variantId', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const variantId = req.params.variantId;
    await messagingService.unsubscribeBackInStock({
        userId: authReq.user.id,
        variantId,
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Customer: POST /notifications/price-drop ——
const postPriceDropBodySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid(),
    targetPrice: zod_1.z.number().positive().optional(),
    channels: zod_1.z.array(channelEnum).optional(),
});
router.post('/notifications/price-drop', auth_1.requireAuth, (0, validate_1.validate)(postPriceDropBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    await messagingService.subscribePriceDrop({
        userId: authReq.user.id,
        variantId: body.variantId,
        targetPrice: body.targetPrice,
        channels: body.channels,
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Customer: DELETE /notifications/price-drop/:variantId ——
router.delete('/notifications/price-drop/:variantId', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const variantId = req.params.variantId;
    await messagingService.unsubscribePriceDrop({
        userId: authReq.user.id,
        variantId,
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Notify-me (optionalAuth — guest or logged-in) ——
const postNotifyMeBodySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid(),
    sessionId: zod_1.z.string().min(1),
});
router.post('/notifications/notify-me', auth_1.optionalAuth, (0, validate_1.validate)(postNotifyMeBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    await messagingService.recordNotifyMe({
        variantId: body.variantId,
        userId: authReq.user?.id,
        sessionId: body.sessionId,
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Admin: GET /admin/notifications/notify-me-demand ——
const getNotifyMeDemandQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
});
router.get('/admin/notifications/notify-me-demand', auth_1.requireAdmin, (0, validate_1.validateQuery)(getNotifyMeDemandQuerySchema), async (req, res) => {
    const query = req.validatedQuery;
    const demand = await messagingService.getNotifyMeDemand({ limit: query.limit });
    res.status(200).json({ data: { demand } });
});
// —— Admin: GET /admin/campaigns ——
const getCampaignsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().min(1).max(100).default(50),
    status: zod_1.z.enum(['DRAFT', 'SCHEDULED', 'SENT', 'CANCELLED']).optional(),
});
router.get('/admin/campaigns', auth_1.requireAdmin, (0, validate_1.validateQuery)(getCampaignsQuerySchema), async (req, res) => {
    const query = req.validatedQuery;
    const result = await messagingService.adminListCampaigns({
        page: query.page,
        limit: query.limit,
        status: query.status,
    });
    res.status(200).json({
        data: {
            campaigns: result.campaigns,
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
// —— Admin: GET /admin/campaigns/:id ——
router.get('/admin/campaigns/:id', auth_1.requireAdmin, async (req, res) => {
    const id = req.params.id;
    const campaign = await messagingService.adminGetCampaign({ id });
    res.status(200).json({ data: { campaign } });
});
// —— Admin: POST /admin/campaigns ——
const postCampaignBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200),
    contentJson: zod_1.z.record(zod_1.z.unknown()),
    channelsJson: zod_1.z.array(channelEnum).optional(),
    audienceFilterJson: zod_1.z.record(zod_1.z.unknown()).optional(),
});
router.post('/admin/campaigns', auth_1.requireAdmin, (0, validate_1.validate)(postCampaignBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    const campaign = await messagingService.adminCreateCampaign({
        name: body.name,
        contentJson: body.contentJson,
        channelsJson: body.channelsJson,
        audienceFilterJson: body.audienceFilterJson,
        adminId: authReq.admin.id,
    });
    res.status(201).json({ data: { campaign } });
});
// —— Admin: PATCH /admin/campaigns/:id ——
const patchCampaignBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(200).optional(),
    contentJson: zod_1.z.record(zod_1.z.unknown()).optional(),
    channelsJson: zod_1.z.array(channelEnum).optional(),
    audienceFilterJson: zod_1.z.record(zod_1.z.unknown()).optional(),
});
router.patch('/admin/campaigns/:id', auth_1.requireAdmin, (0, validate_1.validate)(patchCampaignBodySchema), async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    const campaign = await messagingService.adminUpdateCampaign({
        id,
        name: body.name,
        contentJson: body.contentJson,
        channelsJson: body.channelsJson,
        audienceFilterJson: body.audienceFilterJson,
    });
    res.status(200).json({ data: { campaign } });
});
// —— Admin: POST /admin/campaigns/:id/schedule ——
const scheduleCampaignBodySchema = zod_1.z.object({
    scheduledAt: zod_1.z.string().datetime(),
});
router.post('/admin/campaigns/:id/schedule', auth_1.requireAdmin, (0, validate_1.validate)(scheduleCampaignBodySchema), async (req, res) => {
    const id = req.params.id;
    const body = req.body;
    await messagingService.adminScheduleCampaign({
        id,
        scheduledAt: new Date(body.scheduledAt),
    });
    res.status(200).json({ data: { ok: true } });
});
// —— Admin: POST /admin/campaigns/:id/cancel ——
router.post('/admin/campaigns/:id/cancel', auth_1.requireAdmin, async (req, res) => {
    const id = req.params.id;
    await messagingService.adminCancelCampaign({ id });
    res.status(200).json({ data: { ok: true } });
});
exports.messagingRoutes = router;
//# sourceMappingURL=messaging.routes.js.map