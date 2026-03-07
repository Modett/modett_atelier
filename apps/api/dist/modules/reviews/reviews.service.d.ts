/**
 * Reviews service — token-gated submission, product/user lists, admin moderation.
 * Orchestrates query layer; throws AppError for expected failures.
 */
import { getReviewsForProduct, getReviewsForUser, listFlaggedReviews } from '@modett/db';
import type { Review, RatingAggregate } from '@modett/db';
export declare function submitReview({ userId, plainToken, orderItemId, rating, body, mediaUrls, }: {
    userId: string;
    plainToken: string;
    orderItemId: string;
    rating: number;
    body?: string | null;
    mediaUrls?: string[];
}): Promise<Review>;
export declare function getProductReviews({ productId, page, limit, }: {
    productId: string;
    page?: number;
    limit?: number;
}): Promise<{
    reviews: Awaited<ReturnType<typeof getReviewsForProduct>>['reviews'];
    aggregate: RatingAggregate;
    page: number;
    limit: number;
    total: number;
}>;
export declare function getMyReviews({ userId, page, limit, }: {
    userId: string;
    page?: number;
    limit?: number;
}): Promise<{
    reviews: Awaited<ReturnType<typeof getReviewsForUser>>['reviews'];
    page: number;
    limit: number;
    total: number;
}>;
export declare function getReviewTokenStatus({ userId, orderItemId, }: {
    userId: string;
    orderItemId: string;
}): Promise<{
    hasToken: boolean;
    isUsed: boolean;
    expiresAt: Date | null;
    hasReview: boolean;
}>;
export declare function generateTokensAfterDelivery({ orderId, }: {
    orderId: string;
}): Promise<Array<{
    orderItemId: string;
    plainToken: string;
}>>;
export declare function adminGetProductReviews({ productId, page, limit, }: {
    productId: string;
    page?: number;
    limit?: number;
}): Promise<{
    reviews: Awaited<ReturnType<typeof getReviewsForProduct>>['reviews'];
    aggregate: RatingAggregate;
    page: number;
    limit: number;
    total: number;
}>;
export declare function adminHideReview({ reviewId, adminId, }: {
    reviewId: string;
    adminId: string;
}): Promise<void>;
export declare function adminShowReview({ reviewId, adminId, }: {
    reviewId: string;
    adminId: string;
}): Promise<void>;
export declare function adminFlagReview({ reviewId, reason, adminId, }: {
    reviewId: string;
    reason: string;
    adminId: string;
}): Promise<void>;
export declare function adminResolveFlag({ reviewId, adminId, }: {
    reviewId: string;
    adminId: string;
}): Promise<void>;
export declare function adminListFlaggedReviews({ page, limit, }: {
    page?: number;
    limit?: number;
}): Promise<{
    reviews: Awaited<ReturnType<typeof listFlaggedReviews>>['reviews'];
    page: number;
    limit: number;
    total: number;
}>;
//# sourceMappingURL=reviews.service.d.ts.map