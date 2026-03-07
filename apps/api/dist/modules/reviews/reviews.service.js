"use strict";
/**
 * Reviews service — token-gated submission, product/user lists, admin moderation.
 * Orchestrates query layer; throws AppError for expected failures.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.submitReview = submitReview;
exports.getProductReviews = getProductReviews;
exports.getMyReviews = getMyReviews;
exports.getReviewTokenStatus = getReviewTokenStatus;
exports.generateTokensAfterDelivery = generateTokensAfterDelivery;
exports.adminGetProductReviews = adminGetProductReviews;
exports.adminHideReview = adminHideReview;
exports.adminShowReview = adminShowReview;
exports.adminFlagReview = adminFlagReview;
exports.adminResolveFlag = adminResolveFlag;
exports.adminListFlaggedReviews = adminListFlaggedReviews;
const node_crypto_1 = __importDefault(require("node:crypto"));
const db_1 = require("@modett/db");
const db_2 = require("@modett/db");
const errors_1 = require("../../lib/errors");
const messaging_1 = require("../messaging");
function hashToken(plain) {
    return node_crypto_1.default.createHash('sha256').update(plain).digest('hex');
}
function isOrderOperationError(err) {
    return (err instanceof Error &&
        'code' in err &&
        'statusCode' in err &&
        typeof err.code === 'string' &&
        typeof err.statusCode === 'number');
}
// —— Customer ——
async function submitReview({ userId, plainToken, orderItemId, rating, body, mediaUrls, }) {
    const tokenHash = hashToken(plainToken);
    const orderItem = await (0, db_2.getOrderItemForReview)({ orderItemId });
    if (!orderItem) {
        throw new errors_1.AppError('ORDER_ITEM_NOT_FOUND', 404);
    }
    const order = await (0, db_1.getOrderById)({ id: orderItem.orderId });
    if (!order) {
        throw new errors_1.AppError('REVIEW_TOKEN_INVALID', 401);
    }
    if (order.user_id !== userId) {
        throw new errors_1.AppError('REVIEW_TOKEN_INVALID', 401);
    }
    if (rating < 1 || rating > 5) {
        throw new errors_1.AppError('INVALID_RATING', 400);
    }
    if (mediaUrls && mediaUrls.length > 5) {
        throw new errors_1.AppError('TOO_MANY_MEDIA', 400);
    }
    try {
        return await (0, db_2.createReview)({
            userId,
            orderId: orderItem.orderId,
            orderItemId,
            productId: orderItem.productId,
            variantId: orderItem.variantId,
            rating,
            body: body ?? null,
            mediaUrls,
            tokenHash,
        });
    }
    catch (err) {
        if (isOrderOperationError(err)) {
            throw new errors_1.AppError(err.code, err.statusCode, err.message);
        }
        throw err;
    }
}
async function getProductReviews({ productId, page = 1, limit = 20, }) {
    const { reviews, meta } = await (0, db_2.getReviewsForProduct)({
        productId,
        page,
        limit,
        visibleOnly: true,
    });
    const aggregate = await (0, db_2.getRatingAggregate)({ productId });
    return {
        reviews,
        aggregate,
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
    };
}
async function getMyReviews({ userId, page = 1, limit = 20, }) {
    const { reviews, meta } = await (0, db_2.getReviewsForUser)({ userId, page, limit });
    return {
        reviews,
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
    };
}
async function getReviewTokenStatus({ userId, orderItemId, }) {
    const orderItem = await (0, db_2.getOrderItemForReview)({ orderItemId });
    if (!orderItem) {
        return {
            hasToken: false,
            isUsed: false,
            expiresAt: null,
            hasReview: false,
        };
    }
    const order = await (0, db_1.getOrderById)({ id: orderItem.orderId });
    if (!order || order.user_id !== userId) {
        return {
            hasToken: false,
            isUsed: false,
            expiresAt: null,
            hasReview: false,
        };
    }
    const status = await (0, db_2.getTokenStatus)({ orderItemId });
    const hasReview = (await (0, db_2.getReviewByOrderItemId)({ orderItemId })) !== null;
    if (!status) {
        return {
            hasToken: false,
            isUsed: false,
            expiresAt: null,
            hasReview,
        };
    }
    return {
        hasToken: true,
        isUsed: status.isUsed,
        expiresAt: status.expiresAt,
        hasReview,
    };
}
// —— Admin (token generation after delivery) ——
async function generateTokensAfterDelivery({ orderId, }) {
    const order = await (0, db_1.getOrderById)({ id: orderId });
    if (!order) {
        return [];
    }
    const items = await (0, db_1.getOrderItems)({ orderId });
    const tokens = await (0, db_2.generateReviewTokensForOrder)({
        orderId,
        orderItems: items,
    });
    if (order.user_id) {
        for (const t of tokens) {
            const item = items.find((i) => i.id === t.orderItemId);
            const snapshot = item?.product_snapshot_json;
            const productName = snapshot?.displayName ?? 'Your item';
            await (0, messaging_1.notifyReviewRequest)({
                userId: order.user_id,
                orderItemId: t.orderItemId,
                productName,
                plainToken: t.plainToken,
            }).catch(() => { });
        }
    }
    return tokens;
}
// —— Admin (moderation) ——
async function adminGetProductReviews({ productId, page = 1, limit = 50, }) {
    const { reviews, meta } = await (0, db_2.getReviewsForProduct)({
        productId,
        page,
        limit,
        visibleOnly: false,
    });
    const aggregate = await (0, db_2.getRatingAggregate)({ productId });
    return {
        reviews,
        aggregate,
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
    };
}
async function adminHideReview({ reviewId, adminId, }) {
    try {
        await (0, db_2.setReviewStatus)({ id: reviewId, status: 'HIDDEN' });
    }
    catch (err) {
        if (isOrderOperationError(err)) {
            throw new errors_1.AppError(err.code, err.statusCode, err.message);
        }
        throw err;
    }
}
async function adminShowReview({ reviewId, adminId, }) {
    try {
        await (0, db_2.setReviewStatus)({ id: reviewId, status: 'VISIBLE' });
    }
    catch (err) {
        if (isOrderOperationError(err)) {
            throw new errors_1.AppError(err.code, err.statusCode, err.message);
        }
        throw err;
    }
}
async function adminFlagReview({ reviewId, reason, adminId, }) {
    const review = await (0, db_2.getReviewById)({ id: reviewId });
    if (!review) {
        throw new errors_1.AppError('REVIEW_NOT_FOUND', 404);
    }
    await (0, db_2.createManualFlag)({ reviewId, reason });
}
async function adminResolveFlag({ reviewId, adminId, }) {
    try {
        await (0, db_2.resolveFlag)({ reviewId, resolvedByAdminId: adminId });
    }
    catch (err) {
        if (isOrderOperationError(err)) {
            throw new errors_1.AppError(err.code, err.statusCode, err.message);
        }
        throw err;
    }
}
async function adminListFlaggedReviews({ page = 1, limit = 50, }) {
    const { reviews, meta } = await (0, db_2.listFlaggedReviews)({ page, limit });
    return {
        reviews,
        page: meta.page,
        limit: meta.limit,
        total: meta.total,
    };
}
//# sourceMappingURL=reviews.service.js.map