/**
 * Reviews service — token-gated submission, product/user lists, admin moderation.
 * Orchestrates query layer; throws AppError for expected failures.
 */

import crypto from 'node:crypto'
import { getOrderById, getOrderItems } from '@modett/db'
import {
  getOrderItemForReview,
  createReview as createReviewQuery,
  getReviewsForProduct,
  getReviewsForUser,
  getReviewByOrderItemId,
  getRatingAggregate,
  getTokenStatus,
  generateReviewTokensForOrder,
  getReviewById,
  setReviewStatus,
  createManualFlag,
  resolveFlag,
  listFlaggedReviews,
} from '@modett/db'
import type { Review, RatingAggregate } from '@modett/db'
import { AppError } from '../../lib/errors'
import { OrderOperationError } from '@modett/db'
import { getStorageService } from '../../infrastructure/storage'
import { StorageError } from '../../infrastructure/storage'
import { notifyReviewRequest } from '../messaging'

function hashToken(plain: string): string {
  return crypto.createHash('sha256').update(plain).digest('hex')
}

function isOrderOperationError(err: unknown): err is OrderOperationError {
  return (
    err instanceof Error &&
    'code' in err &&
    'statusCode' in err &&
    typeof (err as OrderOperationError).code === 'string' &&
    typeof (err as OrderOperationError).statusCode === 'number'
  )
}

// —— Customer ——

export async function submitReview({
  userId,
  plainToken,
  orderItemId,
  rating,
  body,
  mediaUrls,
}: {
  userId: string
  plainToken: string
  orderItemId: string
  rating: number
  body?: string | null
  mediaUrls?: string[]
}): Promise<Review> {
  const tokenHash = hashToken(plainToken)

  const orderItem = await getOrderItemForReview({ orderItemId })
  if (!orderItem) {
    throw new AppError('ORDER_ITEM_NOT_FOUND', 404)
  }

  const order = await getOrderById({ id: orderItem.orderId })
  if (!order) {
    throw new AppError('REVIEW_TOKEN_INVALID', 401)
  }
  if (order.user_id !== userId) {
    throw new AppError('REVIEW_TOKEN_INVALID', 401)
  }

  if (rating < 1 || rating > 5) {
    throw new AppError('INVALID_RATING', 400)
  }

  if (mediaUrls && mediaUrls.length > 5) {
    throw new AppError('TOO_MANY_MEDIA', 400)
  }

  return submitReviewInternal({
    orderItem,
    userId,
    plainToken,
    orderItemId,
    rating,
    body,
    mediaUrls,
  })
}

type OrderItemForReview = Awaited<ReturnType<typeof getOrderItemForReview>> extends infer R
  ? R extends null
    ? never
    : R
  : never

async function submitReviewInternal({
  orderItem,
  userId,
  plainToken,
  orderItemId,
  rating,
  body,
  mediaUrls,
}: {
  orderItem: OrderItemForReview
  userId: string
  plainToken: string
  orderItemId: string
  rating: number
  body?: string | null
  mediaUrls?: string[]
}): Promise<Review> {
  const tokenHash = hashToken(plainToken)
  try {
    return await createReviewQuery({
      userId,
      orderId: orderItem.orderId,
      orderItemId,
      productId: orderItem.productId,
      variantId: orderItem.variantId,
      rating,
      body: body ?? null,
      mediaUrls,
      tokenHash,
    })
  } catch (err) {
    if (isOrderOperationError(err)) {
      throw new AppError(err.code, err.statusCode, err.message)
    }
    throw err
  }
}

export interface ReviewPhotoFile {
  buffer: Buffer
  mimetype: string
}

/** Submit review with uploaded photo files. Uploads to R2 then creates review with media URLs. */
export async function submitReviewWithPhotos({
  userId,
  plainToken,
  orderItemId,
  rating,
  body,
  files,
}: {
  userId: string
  plainToken: string
  orderItemId: string
  rating: number
  body?: string | null
  files: ReviewPhotoFile[]
}): Promise<Review> {
  if (files.length > 3) {
    throw new AppError('TOO_MANY_MEDIA', 400)
  }
  const orderItem = await getOrderItemForReview({ orderItemId })
  if (!orderItem) {
    throw new AppError('ORDER_ITEM_NOT_FOUND', 404)
  }
  const order = await getOrderById({ id: orderItem.orderId })
  if (!order) {
    throw new AppError('REVIEW_TOKEN_INVALID', 401)
  }
  if (order.user_id !== userId) {
    throw new AppError('REVIEW_TOKEN_INVALID', 401)
  }
  if (rating < 1 || rating > 5) {
    throw new AppError('INVALID_RATING', 400)
  }
  const batchId = crypto.randomUUID()
  const storage = getStorageService()
  const mediaUrls: string[] = []
  for (let i = 0; i < files.length; i++) {
    try {
      const result = await storage.uploadFile(
        'reviews',
        `${batchId}/photo-${crypto.randomUUID()}`,
        files[i].buffer,
        files[i].mimetype,
      )
      mediaUrls.push(result.url)
    } catch (err) {
      if (err instanceof StorageError) {
        throw new AppError('STORAGE_ERROR', 500, err.message)
      }
      throw err
    }
  }
  return submitReviewInternal({
    orderItem,
    userId,
    plainToken,
    orderItemId,
    rating,
    body,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
  })
}

export async function getProductReviews({
  productId,
  page = 1,
  limit = 20,
}: {
  productId: string
  page?: number
  limit?: number
}): Promise<{
  reviews: Awaited<ReturnType<typeof getReviewsForProduct>>['reviews']
  aggregate: RatingAggregate
  page: number
  limit: number
  total: number
}> {
  const { reviews, meta } = await getReviewsForProduct({
    productId,
    page,
    limit,
    visibleOnly: true,
  })
  const aggregate = await getRatingAggregate({ productId })
  return {
    reviews,
    aggregate,
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function getMyReviews({
  userId,
  page = 1,
  limit = 20,
}: {
  userId: string
  page?: number
  limit?: number
}): Promise<{
  reviews: Awaited<ReturnType<typeof getReviewsForUser>>['reviews']
  page: number
  limit: number
  total: number
}> {
  const { reviews, meta } = await getReviewsForUser({ userId, page, limit })
  return {
    reviews,
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function getReviewTokenStatus({
  userId,
  orderItemId,
}: {
  userId: string
  orderItemId: string
}): Promise<{
  hasToken: boolean
  isUsed: boolean
  expiresAt: Date | null
  hasReview: boolean
}> {
  const orderItem = await getOrderItemForReview({ orderItemId })
  if (!orderItem) {
    return {
      hasToken: false,
      isUsed: false,
      expiresAt: null,
      hasReview: false,
    }
  }

  const order = await getOrderById({ id: orderItem.orderId })
  if (!order || order.user_id !== userId) {
    return {
      hasToken: false,
      isUsed: false,
      expiresAt: null,
      hasReview: false,
    }
  }

  const status = await getTokenStatus({ orderItemId })
  const hasReview = (await getReviewByOrderItemId({ orderItemId })) !== null

  if (!status) {
    return {
      hasToken: false,
      isUsed: false,
      expiresAt: null,
      hasReview,
    }
  }

  return {
    hasToken: true,
    isUsed: status.isUsed,
    expiresAt: status.expiresAt,
    hasReview,
  }
}

// —— Admin (token generation after delivery) ——

export async function generateTokensAfterDelivery({
  orderId,
}: {
  orderId: string
}): Promise<Array<{ orderItemId: string; plainToken: string }>> {
  const order = await getOrderById({ id: orderId })
  if (!order) {
    return []
  }
  const items = await getOrderItems({ orderId })
  const tokens = await generateReviewTokensForOrder({
    orderId,
    orderItems: items,
  })
  if (order.user_id) {
    for (const t of tokens) {
      const item = items.find((i) => i.id === t.orderItemId)
      const snapshot = item?.product_snapshot_json as { displayName?: string } | undefined
      const productName = snapshot?.displayName ?? 'Your item'
      await notifyReviewRequest({
        userId: order.user_id,
        orderItemId: t.orderItemId,
        productName,
        plainToken: t.plainToken,
      }).catch(() => {})
    }
  }
  return tokens
}

// —— Admin (moderation) ——

export async function adminGetProductReviews({
  productId,
  page = 1,
  limit = 50,
}: {
  productId: string
  page?: number
  limit?: number
}): Promise<{
  reviews: Awaited<ReturnType<typeof getReviewsForProduct>>['reviews']
  aggregate: RatingAggregate
  page: number
  limit: number
  total: number
}> {
  const { reviews, meta } = await getReviewsForProduct({
    productId,
    page,
    limit,
    visibleOnly: false,
  })
  const aggregate = await getRatingAggregate({ productId })
  return {
    reviews,
    aggregate,
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function adminHideReview({
  reviewId,
  adminId,
}: {
  reviewId: string
  adminId: string
}): Promise<void> {
  try {
    await setReviewStatus({ id: reviewId, status: 'HIDDEN' })
  } catch (err) {
    if (isOrderOperationError(err)) {
      throw new AppError(err.code, err.statusCode, err.message)
    }
    throw err
  }
}

export async function adminShowReview({
  reviewId,
  adminId,
}: {
  reviewId: string
  adminId: string
}): Promise<void> {
  try {
    await setReviewStatus({ id: reviewId, status: 'VISIBLE' })
  } catch (err) {
    if (isOrderOperationError(err)) {
      throw new AppError(err.code, err.statusCode, err.message)
    }
    throw err
  }
}

export async function adminFlagReview({
  reviewId,
  reason,
  adminId,
}: {
  reviewId: string
  reason: string
  adminId: string
}): Promise<void> {
  const review = await getReviewById({ id: reviewId })
  if (!review) {
    throw new AppError('REVIEW_NOT_FOUND', 404)
  }
  await createManualFlag({ reviewId, reason })
}

export async function adminResolveFlag({
  reviewId,
  adminId,
}: {
  reviewId: string
  adminId: string
}): Promise<void> {
  try {
    await resolveFlag({ reviewId, resolvedByAdminId: adminId })
  } catch (err) {
    if (isOrderOperationError(err)) {
      throw new AppError(err.code, err.statusCode, err.message)
    }
    throw err
  }
}

export async function adminListFlaggedReviews({
  page = 1,
  limit = 50,
}: {
  page?: number
  limit?: number
}): Promise<{
  reviews: Awaited<ReturnType<typeof listFlaggedReviews>>['reviews']
  page: number
  limit: number
  total: number
}> {
  const { reviews, meta } = await listFlaggedReviews({ page, limit })
  return {
    reviews,
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}
