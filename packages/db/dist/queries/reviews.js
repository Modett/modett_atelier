"use strict";
/**
 * Reviews query functions — tokens, reviews, media, flags, aggregates.
 * No business logic. RORO. Atomic UPDATEs with conditions in WHERE; 0 rows → OrderOperationError.
 */
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateTokenForOrderItem = generateTokenForOrderItem;
exports.consumeToken = consumeToken;
exports.getTokenStatus = getTokenStatus;
exports.getOrderItemForReview = getOrderItemForReview;
exports.createReview = createReview;
exports.getReviewById = getReviewById;
exports.getReviewByOrderItemId = getReviewByOrderItemId;
exports.getReviewsForProduct = getReviewsForProduct;
exports.getReviewsForUser = getReviewsForUser;
exports.getRatingAggregate = getRatingAggregate;
exports.setReviewStatus = setReviewStatus;
exports.createManualFlag = createManualFlag;
exports.resolveFlag = resolveFlag;
exports.listFlaggedReviews = listFlaggedReviews;
exports.generateReviewTokensForOrder = generateReviewTokensForOrder;
const node_crypto_1 = __importDefault(require("node:crypto"));
const drizzle_orm_1 = require("drizzle-orm");
const drizzle_orm_2 = require("drizzle-orm");
const client_1 = require("../client");
const errors_1 = require("../errors");
const reviews_schema_1 = require("../schema/reviews.schema");
const sha256 = (s) => node_crypto_1.default.createHash('sha256').update(s).digest('hex');
// —— Token queries ——
async function generateTokenForOrderItem({ orderItemId, }) {
    const plain = node_crypto_1.default.randomUUID();
    const hash = sha256(plain);
    const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);
    const result = await client_1.db
        .insert(reviews_schema_1.reviewRequestTokens)
        .values({
        orderItemId,
        tokenHash: hash,
        expiresAt,
    })
        .onConflictDoNothing({ target: reviews_schema_1.reviewRequestTokens.orderItemId })
        .returning({ id: reviews_schema_1.reviewRequestTokens.id });
    if (result.length === 0) {
        return { plain: null, hash: null };
    }
    return { plain, hash };
}
async function consumeToken({ tokenHash, orderItemId, tx, }) {
    const client = tx ?? client_1.db;
    const result = await client.execute((0, drizzle_orm_2.sql) `
    UPDATE reviews.review_request_tokens
    SET    used_at = now()
    WHERE  token_hash    = ${tokenHash}
      AND  order_item_id = ${orderItemId}
      AND  expires_at    > now()
      AND  used_at       IS NULL
    RETURNING id, order_item_id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.OrderOperationError('REVIEW_TOKEN_INVALID', 401);
    }
}
async function getTokenStatus({ orderItemId, }) {
    const rows = await client_1.db
        .select({
        expiresAt: reviews_schema_1.reviewRequestTokens.expiresAt,
        isUsed: (0, drizzle_orm_2.sql) `${reviews_schema_1.reviewRequestTokens.usedAt} IS NOT NULL`.as('is_used'),
    })
        .from(reviews_schema_1.reviewRequestTokens)
        .where((0, drizzle_orm_1.eq)(reviews_schema_1.reviewRequestTokens.orderItemId, orderItemId));
    const row = rows[0];
    if (!row)
        return null;
    return {
        expiresAt: row.expiresAt,
        isUsed: row.isUsed,
    };
}
async function getOrderItemForReview({ orderItemId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT oi.order_id AS "orderId",
           pv.product_id AS "productId",
           pv.id AS "variantId"
    FROM orders.order_items oi
    LEFT JOIN inventory.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.id = ${orderItemId}
  `);
    const row = result.rows[0];
    if (!row || row.productId == null)
        return null;
    return {
        orderId: row.orderId,
        productId: row.productId,
        variantId: row.variantId,
    };
}
// —— Review write (createReview in transaction) ——
async function createReview({ userId, orderId, orderItemId, productId, variantId, rating, body, mediaUrls, tokenHash, }) {
    return await client_1.db.transaction(async (tx) => {
        await consumeToken({ tokenHash, orderItemId, tx });
        let reviewRows;
        try {
            reviewRows = await tx
                .insert(reviews_schema_1.reviewsTable)
                .values({
                userId,
                orderId,
                orderItemId,
                productId,
                variantId: variantId ?? undefined,
                rating,
                body: body ?? null,
                status: 'VISIBLE',
            })
                .returning();
        }
        catch (err) {
            const msg = err && typeof err === 'object' && 'code' in err ? err.code : '';
            if (msg === '23505') {
                throw new errors_1.OrderOperationError('REVIEW_ALREADY_EXISTS', 409);
            }
            throw err;
        }
        const review = reviewRows[0];
        if (!review)
            throw new errors_1.OrderOperationError('REVIEW_NOT_FOUND', 404);
        if (mediaUrls && mediaUrls.length > 0) {
            await tx.insert(reviews_schema_1.reviewMedia).values(mediaUrls.map((url, i) => ({
                reviewId: review.id,
                url,
                type: 'IMAGE',
                sortOrder: i,
            })));
        }
        if (rating <= 2) {
            await tx
                .insert(reviews_schema_1.reviewFlags)
                .values({
                reviewId: review.id,
                reason: 'AUTO: low rating',
                autoFlagged: true,
            })
                .onConflictDoNothing({ target: reviews_schema_1.reviewFlags.reviewId });
        }
        return review;
    });
}
// —— Review read ——
async function getReviewById({ id, }) {
    const rows = await client_1.db
        .select()
        .from(reviews_schema_1.reviewsTable)
        .where((0, drizzle_orm_1.eq)(reviews_schema_1.reviewsTable.id, id));
    return rows[0] ?? null;
}
async function getReviewByOrderItemId({ orderItemId, }) {
    const rows = await client_1.db
        .select()
        .from(reviews_schema_1.reviewsTable)
        .where((0, drizzle_orm_1.eq)(reviews_schema_1.reviewsTable.orderItemId, orderItemId));
    return rows[0] ?? null;
}
async function getReviewsForProduct({ productId, page = 1, limit = 20, visibleOnly = true, }) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const offset = (page - 1) * safeLimit;
    const countResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COUNT(*)::int AS total
    FROM reviews.reviews r
    WHERE r.product_id = ${productId}
      AND (${visibleOnly ? (0, drizzle_orm_2.sql) `r.status = 'VISIBLE'` : (0, drizzle_orm_2.sql) `TRUE`})
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT r.id, r.user_id AS "userId", r.order_id AS "orderId",
           r.order_item_id AS "orderItemId", r.product_id AS "productId",
           r.variant_id AS "variantId", r.rating, r.body, r.status,
           r.created_at AS "createdAt", r.updated_at AS "updatedAt",
           COALESCE(array_agg(rm.url ORDER BY rm.sort_order) FILTER (WHERE rm.id IS NOT NULL), ARRAY[]::text[]) AS "mediaUrls"
    FROM reviews.reviews r
    LEFT JOIN reviews.review_media rm ON rm.review_id = r.id
    WHERE r.product_id = ${productId}
      AND (${visibleOnly ? (0, drizzle_orm_2.sql) `r.status = 'VISIBLE'` : (0, drizzle_orm_2.sql) `TRUE`})
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `);
    const reviews = [];
    for (const row of result.rows ?? []) {
        const r = row;
        const urls = r.mediaUrls;
        reviews.push({
            id: r.id,
            userId: r.userId,
            orderId: r.orderId,
            orderItemId: r.orderItemId,
            productId: r.productId,
            variantId: r.variantId,
            rating: r.rating,
            body: r.body,
            status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE'),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            mediaUrls: Array.isArray(urls) ? urls : [],
        });
    }
    return { reviews, meta: { page, limit: safeLimit, total } };
}
async function getReviewsForUser({ userId, page = 1, limit = 20, }) {
    const safeLimit = Math.min(Math.max(1, limit), 50);
    const offset = (page - 1) * safeLimit;
    const countResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COUNT(*)::int AS total
    FROM reviews.reviews
    WHERE user_id = ${userId}
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT r.id, r.user_id AS "userId", r.order_id AS "orderId",
           r.order_item_id AS "orderItemId", r.product_id AS "productId",
           r.variant_id AS "variantId", r.rating, r.body, r.status,
           r.created_at AS "createdAt", r.updated_at AS "updatedAt",
           rm_agg."mediaUrls"
    FROM reviews.reviews r
    LEFT JOIN LATERAL (
      SELECT array_agg(url ORDER BY sort_order) AS "mediaUrls"
      FROM reviews.review_media
      WHERE review_id = r.id
    ) rm_agg ON true
    WHERE r.user_id = ${userId}
    ORDER BY r.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `);
    const reviews = [];
    for (const row of result.rows ?? []) {
        const r = row;
        const urls = r.mediaUrls;
        reviews.push({
            id: r.id,
            userId: r.userId,
            orderId: r.orderId,
            orderItemId: r.orderItemId,
            productId: r.productId,
            variantId: r.variantId,
            rating: r.rating,
            body: r.body,
            status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE'),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            mediaUrls: Array.isArray(urls) ? urls : [],
        });
    }
    return { reviews, meta: { page, limit: safeLimit, total } };
}
async function getRatingAggregate({ productId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT
      COUNT(*)::int AS "totalCount",
      ROUND(AVG(rating), 1)::float AS "averageRating",
      COUNT(*) FILTER (WHERE rating = 5)::int AS "fiveStar",
      COUNT(*) FILTER (WHERE rating = 4)::int AS "fourStar",
      COUNT(*) FILTER (WHERE rating = 3)::int AS "threeStar",
      COUNT(*) FILTER (WHERE rating = 2)::int AS "twoStar",
      COUNT(*) FILTER (WHERE rating = 1)::int AS "oneStar"
    FROM reviews.reviews
    WHERE product_id = ${productId}
      AND status = 'VISIBLE'
  `);
    const row = result.rows[0];
    if (!row) {
        return {
            totalCount: 0,
            averageRating: 0,
            fiveStar: 0,
            fourStar: 0,
            threeStar: 0,
            twoStar: 0,
            oneStar: 0,
        };
    }
    return row;
}
// —— Moderation ——
async function setReviewStatus({ id, status, }) {
    const opposite = status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE';
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    UPDATE reviews.reviews
    SET    status     = ${status},
           updated_at = now()
    WHERE  id     = ${id}
      AND  status = ${opposite}
    RETURNING id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.OrderOperationError(status === 'VISIBLE' ? 'REVIEW_ALREADY_VISIBLE' : 'REVIEW_ALREADY_HIDDEN', 409);
    }
}
async function createManualFlag({ reviewId, reason, }) {
    await client_1.db
        .insert(reviews_schema_1.reviewFlags)
        .values({
        reviewId,
        reason,
        autoFlagged: false,
    })
        .onConflictDoNothing({ target: reviews_schema_1.reviewFlags.reviewId });
}
async function resolveFlag({ reviewId, resolvedByAdminId, }) {
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    UPDATE reviews.review_flags
    SET    resolved_at           = now(),
           resolved_by_admin_id  = ${resolvedByAdminId}
    WHERE  review_id   = ${reviewId}
      AND  resolved_at IS NULL
    RETURNING id
  `);
    if (result.rows.length === 0) {
        throw new errors_1.OrderOperationError('FLAG_ALREADY_RESOLVED', 409);
    }
}
async function listFlaggedReviews({ page = 1, limit = 50, }) {
    const safeLimit = Math.min(Math.max(1, limit), 100);
    const offset = (page - 1) * safeLimit;
    const countResult = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT COUNT(*)::int AS total
    FROM reviews.review_flags rf
    WHERE rf.resolved_at IS NULL
  `);
    const total = countResult.rows[0]?.total ?? 0;
    const result = await client_1.db.execute((0, drizzle_orm_2.sql) `
    SELECT r.id, r.user_id AS "userId", r.order_id AS "orderId",
           r.order_item_id AS "orderItemId", r.product_id AS "productId",
           r.variant_id AS "variantId", r.rating, r.body, r.status,
           r.created_at AS "createdAt", r.updated_at AS "updatedAt",
           rf.reason, rf.auto_flagged AS "autoFlagged",
           rf.created_at AS "flaggedAt"
    FROM reviews.review_flags rf
    JOIN reviews.reviews r ON r.id = rf.review_id
    WHERE rf.resolved_at IS NULL
    ORDER BY rf.created_at ASC
    LIMIT ${safeLimit} OFFSET ${offset}
  `);
    const reviews = [];
    for (const row of result.rows ?? []) {
        const r = row;
        reviews.push({
            id: r.id,
            userId: r.userId,
            orderId: r.orderId,
            orderItemId: r.orderItemId,
            productId: r.productId,
            variantId: r.variantId,
            rating: r.rating,
            body: r.body,
            status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE'),
            createdAt: r.createdAt,
            updatedAt: r.updatedAt,
            reason: r.reason,
            autoFlagged: r.autoFlagged,
            flaggedAt: r.flaggedAt,
        });
    }
    return { reviews, meta: { page, limit: safeLimit, total } };
}
// —— Token generation batch ——
async function generateReviewTokensForOrder({ orderId, orderItems, }) {
    const out = [];
    for (const item of orderItems) {
        const result = await generateTokenForOrderItem({ orderItemId: item.id });
        if (result.plain !== null) {
            out.push({ orderItemId: item.id, plainToken: result.plain });
        }
    }
    return out;
}
