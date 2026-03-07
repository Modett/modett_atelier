/**
 * Reviews query functions — tokens, reviews, media, flags, aggregates.
 * No business logic. RORO. Atomic UPDATEs with conditions in WHERE; 0 rows → OrderOperationError.
 */

import crypto from 'node:crypto'
import { eq } from 'drizzle-orm'
import { sql } from 'drizzle-orm'
import { db, type TransactionClient } from '../client'
import { OrderOperationError } from '../errors'
import {
  reviewRequestTokens,
  reviewsTable,
  reviewMedia,
  reviewFlags,
} from '../schema/reviews.schema'
import type {
  Review,
  NewReview,
  ReviewRequestToken,
  ReviewFlag,
} from '../schema/reviews.schema'

const sha256 = (s: string): string =>
  crypto.createHash('sha256').update(s).digest('hex')

// —— Token queries ——

export async function generateTokenForOrderItem({
  orderItemId,
}: {
  orderItemId: string
}): Promise<{ plain: string; hash: string } | { plain: null; hash: null }> {
  const plain = crypto.randomUUID()
  const hash = sha256(plain)
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)

  const result = await db
    .insert(reviewRequestTokens)
    .values({
      orderItemId,
      tokenHash: hash,
      expiresAt,
    })
    .onConflictDoNothing({ target: reviewRequestTokens.orderItemId })
    .returning({ id: reviewRequestTokens.id })

  if (result.length === 0) {
    return { plain: null, hash: null }
  }
  return { plain, hash }
}

export async function consumeToken({
  tokenHash,
  orderItemId,
  tx,
}: {
  tokenHash: string
  orderItemId: string
  tx?: TransactionClient
}): Promise<void> {
  const client = tx ?? db
  const result = await client.execute(sql`
    UPDATE reviews.review_request_tokens
    SET    used_at = now()
    WHERE  token_hash    = ${tokenHash}
      AND  order_item_id = ${orderItemId}
      AND  expires_at    > now()
      AND  used_at       IS NULL
    RETURNING id, order_item_id
  `)
  if (result.rows.length === 0) {
    throw new OrderOperationError('REVIEW_TOKEN_INVALID', 401)
  }
}

export async function getTokenStatus({
  orderItemId,
}: {
  orderItemId: string
}): Promise<{ expiresAt: Date; isUsed: boolean } | null> {
  const rows = await db
    .select({
      expiresAt: reviewRequestTokens.expiresAt,
      isUsed: sql<boolean>`${reviewRequestTokens.usedAt} IS NOT NULL`.as(
        'is_used',
      ),
    })
    .from(reviewRequestTokens)
    .where(eq(reviewRequestTokens.orderItemId, orderItemId))
  const row = rows[0]
  if (!row) return null
  return {
    expiresAt: row.expiresAt,
    isUsed: row.isUsed,
  }
}

// —— Order item for review (product_id from variant) ——

export interface OrderItemForReview {
  orderId: string
  productId: string
  variantId: string | null
}

export async function getOrderItemForReview({
  orderItemId,
}: {
  orderItemId: string
}): Promise<OrderItemForReview | null> {
  const result = await db.execute(sql`
    SELECT oi.order_id AS "orderId",
           pv.product_id AS "productId",
           pv.id AS "variantId"
    FROM orders.order_items oi
    LEFT JOIN inventory.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.id = ${orderItemId}
  `)
  const row = result.rows[0] as
    | { orderId: string; productId: string | null; variantId: string | null }
    | undefined
  if (!row || row.productId == null) return null
  return {
    orderId: row.orderId,
    productId: row.productId,
    variantId: row.variantId,
  }
}

// —— Review write (createReview in transaction) ——

export async function createReview({
  userId,
  orderId,
  orderItemId,
  productId,
  variantId,
  rating,
  body,
  mediaUrls,
  tokenHash,
}: {
  userId: string
  orderId: string
  orderItemId: string
  productId: string
  variantId: string | null
  rating: number
  body: string | null
  mediaUrls: string[] | undefined
  tokenHash: string
}): Promise<Review> {
  return await db.transaction(async (tx) => {
    await consumeToken({ tokenHash, orderItemId, tx })

    let reviewRows: Review[]
    try {
      reviewRows = await tx
        .insert(reviewsTable)
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
        .returning()
    } catch (err: unknown) {
      const msg = err && typeof err === 'object' && 'code' in err ? (err as { code: string }).code : ''
      if (msg === '23505') {
        throw new OrderOperationError('REVIEW_ALREADY_EXISTS', 409)
      }
      throw err
    }
    const review = reviewRows[0]
    if (!review) throw new OrderOperationError('REVIEW_NOT_FOUND', 404)

    if (mediaUrls && mediaUrls.length > 0) {
      await tx.insert(reviewMedia).values(
        mediaUrls.map((url, i) => ({
          reviewId: review.id,
          url,
          type: 'IMAGE' as const,
          sortOrder: i,
        })),
      )
    }

    if (rating <= 2) {
      await tx
        .insert(reviewFlags)
        .values({
          reviewId: review.id,
          reason: 'AUTO: low rating',
          autoFlagged: true,
        })
        .onConflictDoNothing({ target: reviewFlags.reviewId })
    }

    return review
  })
}

// —— Review read ——

export async function getReviewById({
  id,
}: {
  id: string
}): Promise<Review | null> {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.id, id))
  return rows[0] ?? null
}

export async function getReviewByOrderItemId({
  orderItemId,
}: {
  orderItemId: string
}): Promise<Review | null> {
  const rows = await db
    .select()
    .from(reviewsTable)
    .where(eq(reviewsTable.orderItemId, orderItemId))
  return rows[0] ?? null
}

export interface ReviewWithMedia extends Review {
  mediaUrls: string[]
}

export interface GetReviewsForProductResult {
  reviews: ReviewWithMedia[]
  meta: { page: number; limit: number; total: number }
}

export async function getReviewsForProduct({
  productId,
  page = 1,
  limit = 20,
  visibleOnly = true,
}: {
  productId: string
  page?: number
  limit?: number
  visibleOnly?: boolean
}): Promise<GetReviewsForProductResult> {
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const offset = (page - 1) * safeLimit

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM reviews.reviews r
    WHERE r.product_id = ${productId}
      AND (${visibleOnly ? sql`r.status = 'VISIBLE'` : sql`TRUE`})
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT r.id, r.user_id AS "userId", r.order_id AS "orderId",
           r.order_item_id AS "orderItemId", r.product_id AS "productId",
           r.variant_id AS "variantId", r.rating, r.body, r.status,
           r.created_at AS "createdAt", r.updated_at AS "updatedAt",
           COALESCE(array_agg(rm.url ORDER BY rm.sort_order) FILTER (WHERE rm.id IS NOT NULL), ARRAY[]::text[]) AS "mediaUrls"
    FROM reviews.reviews r
    LEFT JOIN reviews.review_media rm ON rm.review_id = r.id
    WHERE r.product_id = ${productId}
      AND (${visibleOnly ? sql`r.status = 'VISIBLE'` : sql`TRUE`})
    GROUP BY r.id
    ORDER BY r.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const reviews: ReviewWithMedia[] = []
  for (const row of result.rows ?? []) {
    const r = row as Record<string, unknown>
    const urls = r.mediaUrls as string[] | undefined
    reviews.push({
      id: r.id as string,
      userId: r.userId as string,
      orderId: r.orderId as string,
      orderItemId: r.orderItemId as string,
      productId: r.productId as string,
      variantId: r.variantId as string | null,
      rating: r.rating as number,
      body: r.body as string | null,
      status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE') as
        | 'VISIBLE'
        | 'HIDDEN',
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
      mediaUrls: Array.isArray(urls) ? urls : [],
    })
  }
  return { reviews, meta: { page, limit: safeLimit, total } }
}

export async function getReviewsForUser({
  userId,
  page = 1,
  limit = 20,
}: {
  userId: string
  page?: number
  limit?: number
}): Promise<{ reviews: ReviewWithMedia[]; meta: { page: number; limit: number; total: number } }> {
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const offset = (page - 1) * safeLimit

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM reviews.reviews
    WHERE user_id = ${userId}
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
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
  `)

  const reviews: ReviewWithMedia[] = []
  for (const row of result.rows ?? []) {
    const r = row as Record<string, unknown>
    const urls = r.mediaUrls as string[] | undefined
    reviews.push({
      id: r.id as string,
      userId: r.userId as string,
      orderId: r.orderId as string,
      orderItemId: r.orderItemId as string,
      productId: r.productId as string,
      variantId: r.variantId as string | null,
      rating: r.rating as number,
      body: r.body as string | null,
      status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE') as
        | 'VISIBLE'
        | 'HIDDEN',
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
      mediaUrls: Array.isArray(urls) ? urls : [],
    })
  }
  return { reviews, meta: { page, limit: safeLimit, total } }
}

export interface RatingAggregate {
  totalCount: number
  averageRating: number
  fiveStar: number
  fourStar: number
  threeStar: number
  twoStar: number
  oneStar: number
}

export async function getRatingAggregate({
  productId,
}: {
  productId: string
}): Promise<RatingAggregate> {
  const result = await db.execute(sql`
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
  `)
  const row = result.rows[0] as
    | {
        totalCount: number
        averageRating: number
        fiveStar: number
        fourStar: number
        threeStar: number
        twoStar: number
        oneStar: number
      }
    | undefined
  if (!row) {
    return {
      totalCount: 0,
      averageRating: 0,
      fiveStar: 0,
      fourStar: 0,
      threeStar: 0,
      twoStar: 0,
      oneStar: 0,
    }
  }
  return row
}

// —— Moderation ——

export async function setReviewStatus({
  id,
  status,
}: {
  id: string
  status: 'VISIBLE' | 'HIDDEN'
}): Promise<void> {
  const opposite = status === 'VISIBLE' ? 'HIDDEN' : 'VISIBLE'
  const result = await db.execute(sql`
    UPDATE reviews.reviews
    SET    status     = ${status},
           updated_at = now()
    WHERE  id     = ${id}
      AND  status = ${opposite}
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new OrderOperationError(
      status === 'VISIBLE' ? 'REVIEW_ALREADY_VISIBLE' : 'REVIEW_ALREADY_HIDDEN',
      409,
    )
  }
}

export async function createManualFlag({
  reviewId,
  reason,
}: {
  reviewId: string
  reason: string
}): Promise<void> {
  await db
    .insert(reviewFlags)
    .values({
      reviewId,
      reason,
      autoFlagged: false,
    })
    .onConflictDoNothing({ target: reviewFlags.reviewId })
}

export async function resolveFlag({
  reviewId,
  resolvedByAdminId,
}: {
  reviewId: string
  resolvedByAdminId: string
}): Promise<void> {
  const result = await db.execute(sql`
    UPDATE reviews.review_flags
    SET    resolved_at           = now(),
           resolved_by_admin_id  = ${resolvedByAdminId}
    WHERE  review_id   = ${reviewId}
      AND  resolved_at IS NULL
    RETURNING id
  `)
  if (result.rows.length === 0) {
    throw new OrderOperationError('FLAG_ALREADY_RESOLVED', 409)
  }
}

export interface FlaggedReviewRow extends Review {
  reason: string
  autoFlagged: boolean
  flaggedAt: Date
}

export async function listFlaggedReviews({
  page = 1,
  limit = 50,
}: {
  page?: number
  limit?: number
}): Promise<{
  reviews: FlaggedReviewRow[]
  meta: { page: number; limit: number; total: number }
}> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const offset = (page - 1) * safeLimit

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM reviews.review_flags rf
    WHERE rf.resolved_at IS NULL
  `)
  const total = (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
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
  `)

  const reviews: FlaggedReviewRow[] = []
  for (const row of result.rows ?? []) {
    const r = row as Record<string, unknown>
    reviews.push({
      id: r.id as string,
      userId: r.userId as string,
      orderId: r.orderId as string,
      orderItemId: r.orderItemId as string,
      productId: r.productId as string,
      variantId: r.variantId as string | null,
      rating: r.rating as number,
      body: r.body as string | null,
      status: (r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE') as
        | 'VISIBLE'
        | 'HIDDEN',
      createdAt: r.createdAt as Date,
      updatedAt: r.updatedAt as Date,
      reason: r.reason as string,
      autoFlagged: r.autoFlagged as boolean,
      flaggedAt: r.flaggedAt as Date,
    })
  }
  return { reviews, meta: { page, limit: safeLimit, total } }
}

// —— Token generation batch ——

export async function generateReviewTokensForOrder({
  orderId,
  orderItems,
}: {
  orderId: string
  orderItems: { id: string }[]
}): Promise<Array<{ orderItemId: string; plainToken: string }>> {
  const out: Array<{ orderItemId: string; plainToken: string }> = []
  for (const item of orderItems) {
    const result = await generateTokenForOrderItem({ orderItemId: item.id })
    if (result.plain !== null) {
      out.push({ orderItemId: item.id, plainToken: result.plain })
    }
  }
  return out
}
