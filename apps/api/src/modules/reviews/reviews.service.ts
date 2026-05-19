/**
 * Reviews service — token-gated submission, product/user lists, admin moderation.
 * RORO. Query layer throws OrderOperationError; mapped to AppError in callers where needed.
 */

import crypto from 'node:crypto'
import {
  getOrderById,
  getOrderItems,
  getOrderItemForReview,
  createReview as createReviewQuery,
  getReviewsForProduct,
  getReviewsForUser,
  getReviewByOrderItemId,
  getRatingAggregate,
  getReviewRequestTokenRow,
  generateReviewTokensForOrder,
  getReviewById,
  getEnrichedReviewById,
  setReviewStatus,
  setReviewFeatured,
  createManualFlag,
  resolveFlag,
  listAdminReviews,
  listFlaggedReviews,
  getFeaturedReviews as getFeaturedReviewsQuery,
} from '@modett/db'
import type { EnrichedAdminReview, EnrichedReview } from '@modett/db'
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

function snapshotString(
  snap: Record<string, unknown>,
  camel: string,
  snake: string,
): string | null {
  const a = snap[camel]
  const b = snap[snake]
  const v = (typeof a === 'string' ? a : null) ?? (typeof b === 'string' ? b : null)
  const t = v?.trim()
  return t ? t : null
}

function toIso(d: Date): string {
  return d.toISOString()
}

function toReviewApi(row: EnrichedReview) {
  return {
    id: row.id,
    userId: row.userId,
    orderId: row.orderId,
    orderItemId: row.orderItemId,
    productId: row.productId,
    variantId: row.variantId,
    rating: row.rating,
    body: row.body,
    status: row.status,
    featured: row.featured ?? false,
    createdAt: toIso(row.createdAt),
    updatedAt: toIso(row.updatedAt),
    mediaUrls: row.mediaUrls,
    reviewerFirstName: row.reviewerFirstName,
    variantColor: row.variantColor,
    variantSize: row.variantSize,
    productName: row.productName,
    productSlug: row.productSlug,
    productImageUrl: row.productImageUrl,
  }
}

function toFlagApi(
  f: NonNullable<EnrichedAdminReview['flag']>,
) {
  return {
    id: f.id,
    reviewId: f.reviewId,
    reason: f.reason,
    autoFlagged: f.autoFlagged,
    createdAt: toIso(f.createdAt),
    resolvedAt: f.resolvedAt ? toIso(f.resolvedAt) : null,
    resolvedByAdminId: f.resolvedByAdminId,
  }
}

function toAdminReviewApi(row: EnrichedAdminReview) {
  return {
    ...toReviewApi(row),
    flag: row.flag ? toFlagApi(row.flag) : null,
    autoFlagged: row.autoFlagged,
  }
}

export async function getTokenStatus({
  token,
  orderItemId,
}: {
  token: string
  orderItemId: string
}): Promise<{
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
}> {
  const invalid = (): {
    valid: false
    isUsed: boolean
    isExpired: boolean
    hasExistingReview: boolean
    product: null
  } => ({
    valid: false,
    isUsed: false,
    isExpired: false,
    hasExistingReview: false,
    product: null,
  })

  const hash = hashToken(token)
  const row = await getReviewRequestTokenRow({ orderItemId })
  if (!row) return invalid()

  if (row.tokenHash !== hash) return invalid()

  const isExpired = row.expiresAt.getTime() < Date.now()
  const isUsed = row.usedAt !== null
  const existing = await getReviewByOrderItemId({ orderItemId })
  const hasExistingReview = existing !== null

  const orderItem = await getOrderItemForReview({ orderItemId })
  if (!orderItem) {
    return {
      valid: false,
      isUsed,
      isExpired,
      hasExistingReview,
      product: null,
    }
  }

  const snap = orderItem.productSnapshotJson
  const displayName =
    snapshotString(snap, 'displayName', 'display_name') ?? 'Product'
  const keyImageUrl =
    (typeof snap.imageUrl === 'string' && snap.imageUrl) ||
    (typeof snap.image_url === 'string' ? snap.image_url : null) ||
    null
  const color = snapshotString(snap, 'color', 'Colour')
  const size = snapshotString(snap, 'size', 'Size')

  const valid = !isExpired && !isUsed && !hasExistingReview

  return {
    valid,
    isUsed,
    isExpired,
    hasExistingReview,
    product: valid
      ? {
          id: orderItem.productId,
          displayName,
          keyImageUrl,
          color,
          size,
        }
      : null,
  }
}

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
}): Promise<ReturnType<typeof toReviewApi>> {
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
    throw new AppError('TOO_MANY_MEDIA', 400, 'Maximum 5 images per review')
  }

  let createdId: string
  try {
    const review = await createReviewQuery({
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
    createdId = review.id
  } catch (err) {
    if (isOrderOperationError(err)) {
      throw new AppError(err.code, err.statusCode, err.message)
    }
    throw err
  }

  const enriched = await getEnrichedReviewById({ id: createdId })
  if (!enriched) {
    throw new AppError('REVIEW_NOT_FOUND', 404)
  }
  return toReviewApi(enriched)
}

export interface ReviewPhotoFile {
  buffer: Buffer
  mimetype: string
}

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
}): Promise<ReturnType<typeof toReviewApi>> {
  if (files.length > 5) {
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
  return submitReview({
    userId,
    plainToken,
    orderItemId,
    rating,
    body,
    mediaUrls: mediaUrls.length > 0 ? mediaUrls : undefined,
  })
}

function ratingToDistribution(agg: Awaited<ReturnType<typeof getRatingAggregate>>) {
  return {
    1: agg.oneStar,
    2: agg.twoStar,
    3: agg.threeStar,
    4: agg.fourStar,
    5: agg.fiveStar,
  }
}

export async function getProductReviews({
  productId,
  page = 1,
  limit = 20,
}: {
  productId: string
  page?: number
  limit?: number
}) {
  const { reviews, meta } = await getReviewsForProduct({
    productId,
    page,
    limit,
    visibleOnly: true,
  })
  const aggregate = await getRatingAggregate({ productId })
  return {
    reviews: reviews.map(toReviewApi),
    aggregate: {
      totalCount: aggregate.totalCount,
      averageRating: aggregate.averageRating,
      distribution: ratingToDistribution(aggregate),
    },
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function getMyReviews({
  userId,
  page = 1,
  limit = 10,
}: {
  userId: string
  page?: number
  limit?: number
}) {
  const { reviews, meta } = await getReviewsForUser({ userId, page, limit })
  return {
    reviews: reviews.map(toReviewApi),
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function generateTokensAfterDelivery({
  orderId,
}: {
  orderId: string
}): Promise<Array<{ orderItemId: string; plainToken: string }>> {
  const order = await getOrderById({ id: orderId })
  if (!order) {
    throw new AppError('ORDER_NOT_FOUND', 404)
  }
  const items = await getOrderItems({ orderId })
  const tokens = await generateReviewTokensForOrder({
    orderId,
    orderItems: items,
  })
  if (order.user_id) {
    for (const t of tokens) {
      const item = items.find((i) => i.id === t.orderItemId)
      const snap = item?.product_snapshot_json as Record<string, unknown> | undefined
      const productName =
        (typeof snap?.displayName === 'string' && snap.displayName) ||
        (typeof snap?.display_name === 'string' && snap.display_name) ||
        'Your item'
      const productImageUrl =
        (typeof snap?.imageUrl === 'string' && snap.imageUrl) ||
        (typeof snap?.image_url === 'string' && snap.image_url) ||
        null
      const productColor = snapshotString(snap ?? {}, 'color', 'Colour')
      const productSize = snapshotString(snap ?? {}, 'size', 'Size')
      await notifyReviewRequest({
        userId: order.user_id,
        orderItemId: t.orderItemId,
        productName,
        plainToken: t.plainToken,
        productImageUrl: productImageUrl || null,
        productColor,
        productSize,
      }).catch(() => {})
    }
  }
  return tokens
}

export async function adminGetProductReviews({
  productId,
  page = 1,
  limit = 20,
}: {
  productId: string
  page?: number
  limit?: number
}) {
  const { reviews, meta } = await getReviewsForProduct({
    productId,
    page,
    limit,
    visibleOnly: false,
  })
  const aggregate = await getRatingAggregate({ productId })
  return {
    reviews: reviews.map(toReviewApi),
    aggregate: {
      totalCount: aggregate.totalCount,
      averageRating: aggregate.averageRating,
      distribution: ratingToDistribution(aggregate),
    },
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function adminHideReview({
  reviewId,
  adminId: _adminId,
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
  adminId: _adminId,
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
  adminId: _adminId,
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

export async function adminSetReviewFeatured({
  reviewId,
  featured,
}: {
  reviewId: string
  featured: boolean
}): Promise<void> {
  const review = await getReviewById({ id: reviewId })
  if (!review) throw new AppError('REVIEW_NOT_FOUND', 404)
  if (featured && review.status !== 'VISIBLE') {
    throw new AppError(
      'REVIEW_NOT_VISIBLE',
      400,
      'Only visible reviews can be featured on the homepage.',
    )
  }
  await setReviewFeatured({ id: reviewId, featured })
}

export async function adminListReviews({
  page = 1,
  limit = 20,
  status,
  flagged = false,
  productId,
}: {
  page?: number
  limit?: number
  status?: 'VISIBLE' | 'HIDDEN'
  flagged?: boolean
  productId?: string
}) {
  const { reviews, meta } = await listAdminReviews({
    page,
    limit,
    status,
    flagged,
    productId,
  })
  return {
    reviews: reviews.map(toAdminReviewApi),
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function getFeaturedReviews() {
  return getFeaturedReviewsQuery()
}

export async function adminListFlaggedReviews({
  page = 1,
  limit = 50,
}: {
  page?: number
  limit?: number
}) {
  const { reviews, meta } = await listFlaggedReviews({ page, limit })
  return {
    reviews: reviews.map(toAdminReviewApi),
    page: meta.page,
    limit: meta.limit,
    total: meta.total,
  }
}

export async function getReviewUploadUrl({
  userId,
  filename,
  contentType,
}: {
  userId: string
  filename: string
  contentType: string
}): Promise<{ uploadUrl: string; publicUrl: string }> {
  const allowed = ['image/jpeg', 'image/png', 'image/webp']
  if (!allowed.includes(contentType)) {
    throw new AppError('INVALID_CONTENT_TYPE', 400)
  }
  const safeName = filename.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 200)
  const keySub = `${userId}/${crypto.randomUUID()}-${safeName}`
  const storage = getStorageService()
  const { uploadUrl, key } = await storage.getPresignedUploadUrl(
    'reviews',
    keySub,
    contentType,
    3600,
  )
  const publicUrl = storage.getPublicUrl(key)
  return { uploadUrl, publicUrl }
}
