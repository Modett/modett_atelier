/**
 * Reviews query functions — tokens, reviews, media, flags, aggregates.
 * No business logic. RORO. Atomic UPDATEs with conditions in WHERE; 0 rows → OrderOperationError.
 */
import { type TransactionClient } from '../client';
import type { Review } from '../schema/reviews.schema';
export declare function generateTokenForOrderItem({ orderItemId, }: {
    orderItemId: string;
}): Promise<{
    plain: string;
    hash: string;
} | {
    plain: null;
    hash: null;
}>;
export declare function consumeToken({ tokenHash, orderItemId, tx, }: {
    tokenHash: string;
    orderItemId: string;
    tx?: TransactionClient;
}): Promise<void>;
export declare function getTokenStatus({ orderItemId, }: {
    orderItemId: string;
}): Promise<{
    expiresAt: Date;
    isUsed: boolean;
} | null>;
export interface OrderItemForReview {
    orderId: string;
    productId: string;
    variantId: string | null;
}
export declare function getOrderItemForReview({ orderItemId, }: {
    orderItemId: string;
}): Promise<OrderItemForReview | null>;
export declare function createReview({ userId, orderId, orderItemId, productId, variantId, rating, body, mediaUrls, tokenHash, }: {
    userId: string;
    orderId: string;
    orderItemId: string;
    productId: string;
    variantId: string | null;
    rating: number;
    body: string | null;
    mediaUrls: string[] | undefined;
    tokenHash: string;
}): Promise<Review>;
export declare function getReviewById({ id, }: {
    id: string;
}): Promise<Review | null>;
export declare function getReviewByOrderItemId({ orderItemId, }: {
    orderItemId: string;
}): Promise<Review | null>;
export interface ReviewWithMedia extends Review {
    mediaUrls: string[];
}
export interface GetReviewsForProductResult {
    reviews: ReviewWithMedia[];
    meta: {
        page: number;
        limit: number;
        total: number;
    };
}
export declare function getReviewsForProduct({ productId, page, limit, visibleOnly, }: {
    productId: string;
    page?: number;
    limit?: number;
    visibleOnly?: boolean;
}): Promise<GetReviewsForProductResult>;
export declare function getReviewsForUser({ userId, page, limit, }: {
    userId: string;
    page?: number;
    limit?: number;
}): Promise<{
    reviews: ReviewWithMedia[];
    meta: {
        page: number;
        limit: number;
        total: number;
    };
}>;
export interface RatingAggregate {
    totalCount: number;
    averageRating: number;
    fiveStar: number;
    fourStar: number;
    threeStar: number;
    twoStar: number;
    oneStar: number;
}
export declare function getRatingAggregate({ productId, }: {
    productId: string;
}): Promise<RatingAggregate>;
export declare function setReviewStatus({ id, status, }: {
    id: string;
    status: 'VISIBLE' | 'HIDDEN';
}): Promise<void>;
export declare function createManualFlag({ reviewId, reason, }: {
    reviewId: string;
    reason: string;
}): Promise<void>;
export declare function resolveFlag({ reviewId, resolvedByAdminId, }: {
    reviewId: string;
    resolvedByAdminId: string;
}): Promise<void>;
export interface FlaggedReviewRow extends Review {
    reason: string;
    autoFlagged: boolean;
    flaggedAt: Date;
}
export declare function listFlaggedReviews({ page, limit, }: {
    page?: number;
    limit?: number;
}): Promise<{
    reviews: FlaggedReviewRow[];
    meta: {
        page: number;
        limit: number;
        total: number;
    };
}>;
export declare function generateReviewTokensForOrder({ orderId, orderItems, }: {
    orderId: string;
    orderItems: {
        id: string;
    }[];
}): Promise<Array<{
    orderItemId: string;
    plainToken: string;
}>>;
//# sourceMappingURL=reviews.d.ts.map