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
const multer_config_1 = require("../../infrastructure/upload/multer.config");
const reviewsService = __importStar(require("./reviews.service"));
const router = (0, express_1.Router)();
const productReviewsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().max(50).default(20),
});
router.get('/products/:productId/reviews', (0, validate_1.validateQuery)(productReviewsQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const result = await reviewsService.getProductReviews({
        productId: req.params.productId,
        page: query.page,
        limit: query.limit,
    });
    res.status(200).json({
        data: {
            reviews: result.reviews,
            aggregate: {
                totalCount: result.aggregate.totalCount,
                averageRating: result.aggregate.averageRating,
                breakdown: {
                    5: result.aggregate.fiveStar,
                    4: result.aggregate.fourStar,
                    3: result.aggregate.threeStar,
                    2: result.aggregate.twoStar,
                    1: result.aggregate.oneStar,
                },
            },
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
const submitReviewBodySchema = zod_1.z.object({
    token: zod_1.z.string().uuid(),
    orderItemId: zod_1.z.string().uuid(),
    rating: zod_1.z.number().int().min(1).max(5),
    body: zod_1.z.string().max(2000).optional(),
    mediaUrls: zod_1.z.array(zod_1.z.string().url()).max(5).optional(),
});
const submitReviewMultipartSchema = zod_1.z.object({
    token: zod_1.z.string().uuid(),
    orderItemId: zod_1.z.string().uuid(),
    rating: zod_1.z.coerce.number().int().min(1).max(5),
    body: zod_1.z.string().max(2000).optional(),
});
router.post('/reviews', auth_1.requireAuth, (req, res, next) => {
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
        const multerHandler = multer_config_1.reviewPhotoUpload.fields([
            { name: 'token', maxCount: 1 },
            { name: 'orderItemId', maxCount: 1 },
            { name: 'rating', maxCount: 1 },
            { name: 'body', maxCount: 1 },
            { name: 'photos', maxCount: 3 },
        ]);
        return multerHandler(req, res, (err) => {
            if (err) {
                const message = err instanceof Error ? err.message : 'Upload failed';
                return res.status(400).json({
                    error: { code: 'UPLOAD_ERROR', message },
                });
            }
            next();
        });
    }
    next();
}, async (req, res) => {
    const authReq = req;
    const contentType = req.headers['content-type'] ?? '';
    if (contentType.includes('multipart/form-data')) {
        const parsed = submitReviewMultipartSchema.safeParse(req.body);
        if (!parsed.success) {
            return res.status(400).json({
                error: {
                    code: 'VALIDATION_ERROR',
                    message: 'Invalid form fields',
                    details: parsed.error.flatten().fieldErrors,
                },
            });
        }
        const body = parsed.data;
        const files = req.files?.photos ?? [];
        const review = await reviewsService.submitReviewWithPhotos({
            userId: authReq.user.id,
            plainToken: body.token,
            orderItemId: body.orderItemId,
            rating: body.rating,
            body: body.body,
            files: files.map((f) => ({ buffer: f.buffer, mimetype: f.mimetype })),
        });
        return res.status(201).json({ data: { review } });
    }
    const parsed = submitReviewBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const body = parsed.data;
    const review = await reviewsService.submitReview({
        userId: authReq.user.id,
        plainToken: body.token,
        orderItemId: body.orderItemId,
        rating: body.rating,
        body: body.body,
        mediaUrls: body.mediaUrls,
    });
    res.status(201).json({ data: { review } });
});
const mineQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().max(50).default(20),
});
router.get('/reviews/mine', auth_1.requireAuth, (0, validate_1.validateQuery)(mineQuerySchema), async (req, res) => {
    const authReq = req;
    const query = req
        .validatedQuery;
    const result = await reviewsService.getMyReviews({
        userId: authReq.user.id,
        page: query.page,
        limit: query.limit,
    });
    res.status(200).json({
        data: {
            reviews: result.reviews,
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
const tokenStatusQuerySchema = zod_1.z.object({
    orderItemId: zod_1.z.string().uuid(),
});
router.get('/reviews/token-status', auth_1.requireAuth, (0, validate_1.validateQuery)(tokenStatusQuerySchema), async (req, res) => {
    const authReq = req;
    const query = req
        .validatedQuery;
    const result = await reviewsService.getReviewTokenStatus({
        userId: authReq.user.id,
        orderItemId: query.orderItemId,
    });
    res.status(200).json({
        data: {
            hasToken: result.hasToken,
            isUsed: result.isUsed,
            expiresAt: result.expiresAt,
            hasReview: result.hasReview,
        },
    });
});
const flaggedQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().max(100).default(50),
});
router.get('/admin/reviews/flagged', auth_1.requireAdmin, (0, validate_1.validateQuery)(flaggedQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const result = await reviewsService.adminListFlaggedReviews({
        page: query.page,
        limit: query.limit,
    });
    res.status(200).json({
        data: {
            reviews: result.reviews,
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
const adminProductReviewsQuerySchema = zod_1.z.object({
    page: zod_1.z.coerce.number().int().min(1).default(1),
    limit: zod_1.z.coerce.number().int().max(100).default(50),
});
router.get('/admin/products/:productId/reviews', auth_1.requireAdmin, (0, validate_1.validateQuery)(adminProductReviewsQuerySchema), async (req, res) => {
    const query = req.validatedQuery;
    const result = await reviewsService.adminGetProductReviews({
        productId: req.params.productId,
        page: query.page,
        limit: query.limit,
    });
    res.status(200).json({
        data: {
            reviews: result.reviews,
            aggregate: {
                totalCount: result.aggregate.totalCount,
                averageRating: result.aggregate.averageRating,
                breakdown: {
                    5: result.aggregate.fiveStar,
                    4: result.aggregate.fourStar,
                    3: result.aggregate.threeStar,
                    2: result.aggregate.twoStar,
                    1: result.aggregate.oneStar,
                },
            },
            page: result.page,
            limit: result.limit,
            total: result.total,
        },
    });
});
router.post('/admin/reviews/:reviewId/hide', auth_1.requireAdmin, async (req, res) => {
    const authReq = req;
    await reviewsService.adminHideReview({
        reviewId: req.params.reviewId,
        adminId: authReq.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
router.post('/admin/reviews/:reviewId/show', auth_1.requireAdmin, async (req, res) => {
    const authReq = req;
    await reviewsService.adminShowReview({
        reviewId: req.params.reviewId,
        adminId: authReq.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
const flagBodySchema = zod_1.z.object({
    reason: zod_1.z.string().min(1).max(500),
});
router.post('/admin/reviews/:reviewId/flag', auth_1.requireAdmin, (0, validate_1.validate)(flagBodySchema), async (req, res) => {
    const authReq = req;
    const body = req.body;
    await reviewsService.adminFlagReview({
        reviewId: req.params.reviewId,
        reason: body.reason,
        adminId: authReq.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
router.post('/admin/reviews/:reviewId/resolve-flag', auth_1.requireAdmin, async (req, res) => {
    const authReq = req;
    await reviewsService.adminResolveFlag({
        reviewId: req.params.reviewId,
        adminId: authReq.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
exports.default = router;
