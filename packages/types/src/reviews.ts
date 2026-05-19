/**
 * Reviews — API / UI shapes (camelCase). Token flow is verified-purchase only.
 */

import type { ReviewMediaType, ReviewStatus } from './enums'

export type { ReviewMediaType, ReviewStatus }

export interface RatingAggregate {
  totalCount: number
  averageRating: number
  distribution: {
    1: number
    2: number
    3: number
    4: number
    5: number
  }
}

export interface ReviewMedia {
  id: string
  reviewId: string
  url: string
  type: ReviewMediaType
  sortOrder: number
}

export interface ReviewFlag {
  id: string
  reviewId: string
  reason: string
  autoFlagged: boolean
  createdAt: string
  resolvedAt: string | null
  resolvedByAdminId: string | null
}

export interface Review {
  id: string
  userId: string
  orderId: string
  orderItemId: string
  productId: string
  variantId: string | null
  rating: number
  body: string | null
  status: ReviewStatus
  featured: boolean
  createdAt: string
  updatedAt: string
  mediaUrls: string[]
  reviewerFirstName: string
  variantColor: string | null
  variantSize: string | null
  productName: string
  productSlug: string | null
  productImageUrl: string | null
}

export interface AdminReview extends Review {
  flag: ReviewFlag | null
  autoFlagged: boolean
}

export interface ReviewTokenStatus {
  valid: boolean
  isUsed: boolean
  isExpired: boolean
  hasExistingReview: boolean
  product: {
    id: string
    displayName: string
    keyImageUrl: string | null
    color: string | null
    size: string | null
  } | null
}

export interface ProductReviewsResponse {
  reviews: Review[]
  aggregate: RatingAggregate
  page: number
  limit: number
  total: number
}

export interface AdminReviewsListResponse {
  reviews: AdminReview[]
  page: number
  limit: number
  total: number
}

/** DB / internal — request token row (hash only, never plain token). */
export interface ReviewRequestToken {
  id: string
  order_item_id: string
  token_hash: string
  expires_at: string
  used_at?: string | null
}
