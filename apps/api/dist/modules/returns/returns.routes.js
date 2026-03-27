"use strict";
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
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const returnsService = __importStar(require("./returns.service"));
const router = (0, express_1.Router)();
const createReturnBodySchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid(),
    type: zod_1.z.enum(['REFUND', 'EXCHANGE']),
    reason: zod_1.z.string().min(10).max(1000),
    policyVersion: zod_1.z.string().min(1),
    items: zod_1.z
        .array(zod_1.z.object({
        orderItemId: zod_1.z.string().uuid(),
        qty: zod_1.z.number().int().min(1),
        requestedVariantChangeJson: zod_1.z
            .object({
            color: zod_1.z.string().optional(),
            size: zod_1.z.string().optional(),
        })
            .optional(),
    }))
        .min(1),
});
router.post('/returns', auth_1.requireAuth, (0, validate_1.validate)(createReturnBodySchema), async (req, res) => {
    const authReq = req;
    const body = req
        .body;
    const result = await returnsService.createReturn({
        orderId: body.orderId,
        userId: authReq.user.id,
        type: body.type,
        reason: body.reason,
        policyVersion: body.policyVersion,
        items: body.items.map((i) => ({
            orderItemId: i.orderItemId,
            qty: i.qty,
            requestedVariantChangeJson: i.requestedVariantChangeJson,
        })),
    });
    res.status(201).json({
        data: { returnRequest: result.returnRequest, items: result.items },
    });
});
router.get('/orders/:orderId/returns', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const orderId = req.params.orderId;
    const result = await returnsService.getMyReturnRequests({
        orderId,
        userId: authReq.user.id,
    });
    res.status(200).json({ data: { returns: result.returns } });
});
router.get('/returns/:returnRequestId', auth_1.requireAuth, async (req, res) => {
    const authReq = req;
    const returnRequestId = req.params.returnRequestId;
    const result = await returnsService.getMyReturnDetail({
        returnRequestId,
        userId: authReq.user.id,
    });
    res.status(200).json({
        data: {
            request: result.request,
            items: result.items,
            events: result.events,
        },
    });
});
const adminReturnsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().max(100).default(50),
    status: zod_1.z
        .enum([
        'SUBMITTED',
        'PENDING_REVIEW',
        'APPROVED',
        'REJECTED',
        'FULFILLED',
    ])
        .optional(),
    type: zod_1.z.enum(['REFUND', 'EXCHANGE']).optional(),
});
router.get('/admin/returns', auth_1.requireAdmin, (0, validate_1.validateQuery)(adminReturnsQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const result = await returnsService.adminListReturns({
        page: query.page,
        limit: query.limit,
        status: query.status,
        type: query.type,
    });
    res.status(200).json({
        data: {
            returns: result.returns,
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
router.get('/admin/returns/:returnRequestId', auth_1.requireAdmin, async (req, res) => {
    const returnRequestId = req.params.returnRequestId;
    const result = await returnsService.adminGetReturnDetail({
        returnRequestId,
    });
    res.status(200).json({
        data: {
            request: result.request,
            items: result.items,
            events: result.events,
        },
    });
});
router.post('/admin/returns/:returnRequestId/open', auth_1.requireAdmin, async (req, res) => {
    const authReq = req;
    const returnRequestId = req.params.returnRequestId;
    await returnsService.adminOpenForReview({
        returnRequestId,
        adminId: authReq.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
const approveBodySchema = zod_1.z.object({
    adminNote: zod_1.z.string().optional(),
});
router.post('/admin/returns/:returnRequestId/approve', auth_1.requireAdmin, (0, validate_1.validate)(approveBodySchema), async (req, res) => {
    const authReq = req;
    const body = req
        .body;
    await returnsService.adminApprove({
        returnRequestId: req.params.returnRequestId,
        adminId: authReq.admin.id,
        adminNote: body.adminNote,
    });
    res.status(200).json({ data: { ok: true } });
});
const rejectBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(1),
    adminNote: zod_1.z.string().optional(),
});
router.post('/admin/returns/:returnRequestId/reject', auth_1.requireAdmin, (0, validate_1.validate)(rejectBodySchema), async (req, res) => {
    const authReq = req;
    const body = req
        .body;
    await returnsService.adminReject({
        returnRequestId: req.params.returnRequestId,
        adminId: authReq.admin.id,
        reason: body.reason,
        adminNote: body.adminNote,
    });
    res.status(200).json({ data: { ok: true } });
});
const fulfilBodySchema = zod_1.z.object({
    adminNote: zod_1.z.string().optional(),
});
router.post('/admin/returns/:returnRequestId/fulfil', auth_1.requireAdmin, (0, validate_1.validate)(fulfilBodySchema), async (req, res) => {
    const authReq = req;
    const body = req
        .body;
    await returnsService.adminFulfil({
        returnRequestId: req.params.returnRequestId,
        adminId: authReq.admin.id,
        adminNote: body.adminNote,
    });
    res.status(200).json({ data: { ok: true } });
});
exports.default = router;
