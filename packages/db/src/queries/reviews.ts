/**
 * Reviews query functions — tokens, reviews, media, flags, aggregates.
 * RORO. Atomic UPDATEs with conditions in WHERE; 0 rows → OrderOperationError.
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
import type { Review } from '../schema/reviews.schema'

const sha256 = (s: string): string =>
  crypto.createHash('sha256').update(s).digest('hex')

// —— Token row (for hash verification — never log hash) ——

export async function getReviewRequestTokenRow({
  orderItemId,
}: {
  orderItemId: string
}): Promise<{
  id: string
  tokenHash: string
  expiresAt: Date
  usedAt: Date | null
} | null> {
  const rows = await db
    .select({
      id: reviewRequestTokens.id,
      tokenHash: reviewRequestTokens.tokenHash,
      expiresAt: reviewRequestTokens.expiresAt,
      usedAt: reviewRequestTokens.usedAt,
    })
    .from(reviewRequestTokens)
    .where(eq(reviewRequestTokens.orderItemId, orderItemId))
  const row = rows[0]
  if (!row) return null
  return {
    id: row.id,
    tokenHash: row.tokenHash,
    expiresAt: row.expiresAt,
    usedAt: row.usedAt ?? null,
  }
}

/** @deprecated use getReviewRequestTokenRow — kept for internal compatibility */
export async function getTokenStatus({
  orderItemId,
}: {
  orderItemId: string
}): Promise<{ expiresAt: Date; isUsed: boolean } | null> {
  const row = await getReviewRequestTokenRow({ orderItemId })
  if (!row) return null
  return {
    expiresAt: row.expiresAt,
    isUsed: row.usedAt !== null,
  }
}

export async function orderItemIdsWithExistingTokensSafe({
  orderItemIds,
}: {
  orderItemIds: string[]
}): Promise<Set<string>> {
  if (orderItemIds.length === 0) return new Set()
  const result = await db.execute(sql`
    SELECT t.order_item_id AS "orderItemId"
    FROM reviews.review_request_tokens t
    WHERE t.order_item_id IN (${sql.join(
      orderItemIds.map((id) => sql`${id}`),
      sql`, `,
    )})
  `)
  const set = new Set<string>()
  for (const r of result.rows ?? []) {
    const id = (r as { orderItemId: string }).orderItemId
    if (id) set.add(id)
  }
  return set
}

export async function generateReviewTokensForOrder({
  orderId: _orderId,
  orderItems,
}: {
  orderId: string
  orderItems: { id: string }[]
}): Promise<Array<{ orderItemId: string; plainToken: string }>> {
  const existing = await orderItemIdsWithExistingTokensSafe({
    orderItemIds: orderItems.map((i) => i.id),
  })
  const pending = orderItems.filter((i) => !existing.has(i.id))
  if (pending.length === 0) return []

  const rows: Array<{ orderItemId: string; plainToken: string; hash: string }> =
    []
  for (const item of pending) {
    const plainToken = crypto.randomUUID()
    rows.push({
      orderItemId: item.id,
      plainToken,
      hash: sha256(plainToken),
    })
  }

  await db.insert(reviewRequestTokens).values(
    rows.map((r) => ({
      orderItemId: r.orderItemId,
      tokenHash: r.hash,
      expiresAt: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
    })),
  )

  return rows.map(({ orderItemId, plainToken }) => ({ orderItemId, plainToken }))
}

// —— Order item for review ——

export interface OrderItemForReview {
  orderId: string
  productId: string
  variantId: string | null
  productSnapshotJson: Record<string, unknown>
}

export async function getOrderItemForReview({
  orderItemId,
}: {
  orderItemId: string
}): Promise<OrderItemForReview | null> {
  const result = await db.execute(sql`
    SELECT oi.order_id AS "orderId",
           COALESCE(
             pv.product_id,
             NULLIF(trim(oi.product_snapshot_json->>'productId'), '')::uuid
           ) AS "productId",
           oi.variant_id AS "variantId",
           oi.product_snapshot_json AS "productSnapshotJson"
    FROM orders.order_items oi
    LEFT JOIN inventory.product_variants pv ON pv.id = oi.variant_id
    WHERE oi.id = ${orderItemId}
  `)
  const row = result.rows[0] as
    | {
        orderId: string
        productId: string | null
        variantId: string | null
        productSnapshotJson: unknown
      }
    | undefined
  if (!row || row.productId == null) return null
  const snap =
    row.productSnapshotJson &&
    typeof row.productSnapshotJson === 'object' &&
    !Array.isArray(row.productSnapshotJson)
      ? (row.productSnapshotJson as Record<string, unknown>)
      : {}
  return {
    orderId: row.orderId,
    productId: row.productId,
    variantId: row.variantId,
    productSnapshotJson: snap,
  }
}

// —— Create review (single transaction: consume token + review + media + auto-flag) ——

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
    const consumed = await tx.execute(sql`
      UPDATE reviews.review_request_tokens
      SET    used_at = now()
      WHERE  token_hash = ${tokenHash}
        AND  expires_at > now()
        AND  used_at IS NULL
      RETURNING order_item_id AS "orderItemId"
    `)
    if (consumed.rows.length === 0) {
      throw new OrderOperationError('REVIEW_TOKEN_INVALID', 401)
    }
    const returnedItemId = (consumed.rows[0] as { orderItemId: string })
      .orderItemId
    if (returnedItemId !== orderItemId) {
      throw new OrderOperationError('REVIEW_TOKEN_INVALID', 401)
    }

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
      const msg =
        err && typeof err === 'object' && 'code' in err
          ? (err as { code: string }).code
          : ''
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
}): Promise<{ id: string } | null> {
  const rows = await db
    .select({ id: reviewsTable.id })
    .from(reviewsTable)
    .where(eq(reviewsTable.orderItemId, orderItemId))
  return rows[0] ?? null
}

export interface EnrichedReview {
  id: string
  userId: string
  orderId: string
  orderItemId: string
  productId: string
  variantId: string | null
  rating: number
  body: string | null
  status: 'VISIBLE' | 'HIDDEN'
  createdAt: Date
  updatedAt: Date
  mediaUrls: string[]
  reviewerFirstName: string
  variantColor: string | null
  variantSize: string | null
  productName: string
  productSlug: string | null
  productImageUrl: string | null
}

export interface EnrichedAdminReview extends EnrichedReview {
  flag: {
    id: string
    reviewId: string
    reason: string
    autoFlagged: boolean
    createdAt: Date
    resolvedAt: Date | null
    resolvedByAdminId: string | null
  } | null
  autoFlagged: boolean
}

const reviewListSelectSql = sql`
  r.id,
  r.user_id AS "userId",
  r.order_id AS "orderId",
  r.order_item_id AS "orderItemId",
  r.product_id AS "productId",
  r.variant_id AS "variantId",
  r.rating,
  r.body,
  r.status,
  r.created_at AS "createdAt",
  r.updated_at AS "updatedAt",
  COALESCE(array_agg(rm.url ORDER BY rm.sort_order) FILTER (WHERE rm.id IS NOT NULL), ARRAY[]::text[]) AS "mediaUrls",
  COALESCE(NULLIF(trim(u.first_name), ''), 'Customer') AS "reviewerFirstName",
  p.display_name AS "productName",
  p.slug AS "productSlug",
  key_img.url AS "productImageUrl",
  COALESCE(
    NULLIF(trim(oi.product_snapshot_json->>'color'), ''),
    NULLIF(trim(oi.product_snapshot_json->>'Colour'), '')
  ) AS "variantColor",
  COALESCE(
    NULLIF(trim(oi.product_snapshot_json->>'size'), ''),
    NULLIF(trim(oi.product_snapshot_json->>'Size'), '')
  ) AS "variantSize"
`

function mapEnrichedRow(r: Record<string, unknown>): EnrichedReview {
  const urls = r.mediaUrls as string[] | undefined
  return {
    id: r.id as string,
    userId: r.userId as string,
    orderId: r.orderId as string,
    orderItemId: r.orderItemId as string,
    productId: r.productId as string,
    variantId: (r.variantId as string | null) ?? null,
    rating: Number(r.rating),
    body: (r.body as string | null) ?? null,
    status: r.status === 'HIDDEN' ? 'HIDDEN' : 'VISIBLE',
    createdAt: r.createdAt as Date,
    updatedAt: r.updatedAt as Date,
    mediaUrls: Array.isArray(urls) ? urls : [],
    reviewerFirstName: (r.reviewerFirstName as string) || 'Customer',
    variantColor: (r.variantColor as string | null) ?? null,
    variantSize: (r.variantSize as string | null) ?? null,
    productName: (r.productName as string) || 'Product',
    productSlug: (r.productSlug as string | null) ?? null,
    productImageUrl: (r.productImageUrl as string | null) ?? null,
  }
}

export async function getEnrichedReviewById({
  id,
}: {
  id: string
}): Promise<EnrichedReview | null> {
  const result = await db.execute(sql`
    SELECT ${reviewListSelectSql}
    FROM reviews.reviews r
    LEFT JOIN reviews.review_media rm ON rm.review_id = r.id
    JOIN iam.users u ON u.id = r.user_id
    JOIN catalog.products p ON p.id = r.product_id
    LEFT JOIN catalog.product_images key_img ON key_img.id = p.key_image_id
    JOIN orders.order_items oi ON oi.id = r.order_item_id
    WHERE r.id = ${id}
    GROUP BY r.id, u.first_name, p.display_name, p.slug, key_img.url,
             oi.product_snapshot_json
  `)
  const row = result.rows[0] as Record<string, unknown> | undefined
  if (!row) return null
  return mapEnrichedRow(row)
}

export interface GetReviewsForProductResult {
  reviews: EnrichedReview[]
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
  const total =
    (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT ${reviewListSelectSql}
    FROM reviews.reviews r
    LEFT JOIN reviews.review_media rm ON rm.review_id = r.id
    JOIN iam.users u ON u.id = r.user_id
    JOIN catalog.products p ON p.id = r.product_id
    LEFT JOIN catalog.product_images key_img ON key_img.id = p.key_image_id
    JOIN orders.order_items oi ON oi.id = r.order_item_id
    WHERE r.product_id = ${productId}
      AND (${visibleOnly ? sql`r.status = 'VISIBLE'` : sql`TRUE`})
    GROUP BY r.id, u.first_name, p.display_name, p.slug, key_img.url,
             oi.product_snapshot_json
    ORDER BY r.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const reviews: EnrichedReview[] = []
  for (const row of result.rows ?? []) {
    reviews.push(mapEnrichedRow(row as Record<string, unknown>))
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
}): Promise<{ reviews: EnrichedReview[]; meta: { page: number; limit: number; total: number } }> {
  const safeLimit = Math.min(Math.max(1, limit), 50)
  const offset = (page - 1) * safeLimit

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM reviews.reviews
    WHERE user_id = ${userId}
  `)
  const total =
    (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT ${reviewListSelectSql}
    FROM reviews.reviews r
    LEFT JOIN reviews.review_media rm ON rm.review_id = r.id
    JOIN iam.users u ON u.id = r.user_id
    JOIN catalog.products p ON p.id = r.product_id
    LEFT JOIN catalog.product_images key_img ON key_img.id = p.key_image_id
    JOIN orders.order_items oi ON oi.id = r.order_item_id
    WHERE r.user_id = ${userId}
    GROUP BY r.id, u.first_name, p.display_name, p.slug, key_img.url,
             oi.product_snapshot_json
    ORDER BY r.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const reviews: EnrichedReview[] = []
  for (const row of result.rows ?? []) {
    reviews.push(mapEnrichedRow(row as Record<string, unknown>))
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
      COALESCE(ROUND(AVG(rating)::numeric, 2), 0)::float AS "averageRating",
      COUNT(*) FILTER (WHERE rating = 5)::int AS "fiveStar",
      COUNT(*) FILTER (WHERE rating = 4)::int AS "fourStar",
      COUNT(*) FILTER (WHERE rating = 3)::int AS "threeStar",
      COUNT(*) FILTER (WHERE rating = 2)::int AS "twoStar",
      COUNT(*) FILTER (WHERE rating = 1)::int AS "oneStar"
    FROM reviews.reviews
    WHERE product_id = ${productId}
      AND status = 'VISIBLE'
  `)
  const r = result.rows[0] as
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
  if (!r) {
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
  return {
    totalCount: r.totalCount,
    averageRating: r.averageRating,
    fiveStar: r.fiveStar,
    fourStar: r.fourStar,
    threeStar: r.threeStar,
    twoStar: r.twoStar,
    oneStar: r.oneStar,
  }
}

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
    throw new OrderOperationError('REVIEW_NOT_FOUND', 404)
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

const adminReviewSelectSql = sql`
  ${reviewListSelectSql},
  rf.id AS "flagId",
  rf.review_id AS "flagReviewId",
  rf.reason AS "flagReason",
  rf.auto_flagged AS "flagAutoFlagged",
  rf.created_at AS "flagCreatedAt",
  rf.resolved_at AS "flagResolvedAt",
  rf.resolved_by_admin_id AS "flagResolvedByAdminId",
  EXISTS (
    SELECT 1 FROM reviews.review_flags af
    WHERE af.review_id = r.id AND af.auto_flagged = true
  ) AS "hasAnyAutoFlag"
`

export async function listAdminReviews({
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
}): Promise<{
  reviews: EnrichedAdminReview[]
  meta: { page: number; limit: number; total: number }
}> {
  const safeLimit = Math.min(Math.max(1, limit), 100)
  const offset = (page - 1) * safeLimit

  const statusCond =
    status === undefined ? sql`TRUE` : sql`r.status = ${status}`
  const flaggedCond = flagged
    ? sql`EXISTS (
        SELECT 1 FROM reviews.review_flags rf2
        WHERE rf2.review_id = r.id AND rf2.resolved_at IS NULL
      )`
    : sql`TRUE`
  const productCond =
    productId === undefined ? sql`TRUE` : sql`r.product_id = ${productId}`

  const countResult = await db.execute(sql`
    SELECT COUNT(*)::int AS total
    FROM reviews.reviews r
    WHERE ${statusCond}
      AND ${flaggedCond}
      AND ${productCond}
  `)
  const total =
    (countResult.rows[0] as { total: number } | undefined)?.total ?? 0

  const result = await db.execute(sql`
    SELECT ${adminReviewSelectSql}
    FROM reviews.reviews r
    LEFT JOIN reviews.review_media rm ON rm.review_id = r.id
    JOIN iam.users u ON u.id = r.user_id
    JOIN catalog.products p ON p.id = r.product_id
    LEFT JOIN catalog.product_images key_img ON key_img.id = p.key_image_id
    JOIN orders.order_items oi ON oi.id = r.order_item_id
    LEFT JOIN reviews.review_flags rf ON rf.review_id = r.id
    WHERE ${statusCond}
      AND ${flaggedCond}
      AND ${productCond}
    GROUP BY r.id, u.first_name, p.display_name, p.slug, key_img.url,
             oi.product_snapshot_json,
             rf.id, rf.review_id, rf.reason, rf.auto_flagged,
             rf.created_at, rf.resolved_at, rf.resolved_by_admin_id
    ORDER BY r.created_at DESC
    LIMIT ${safeLimit} OFFSET ${offset}
  `)

  const reviews: EnrichedAdminReview[] = []
  for (const row of result.rows ?? []) {
    const rec = row as Record<string, unknown>
    const base = mapEnrichedRow(rec)
    const flagId = rec.flagId as string | null | undefined
    const resolvedAt = rec.flagResolvedAt as Date | null | undefined
    const flag =
      flagId != null && resolvedAt == null
        ? {
            id: flagId,
            reviewId: rec.flagReviewId as string,
            reason: rec.flagReason as string,
            autoFlagged: Boolean(rec.flagAutoFlagged),
            createdAt: rec.flagCreatedAt as Date,
            resolvedAt: null,
            resolvedByAdminId:
              (rec.flagResolvedByAdminId as string | null) ?? null,
          }
        : null
    reviews.push({
      ...base,
      flag,
      autoFlagged: Boolean(rec.hasAnyAutoFlag),
    })
  }
  return { reviews, meta: { page, limit: safeLimit, total } }
}

export async function listFlaggedReviews({
  page = 1,
  limit = 50,
}: {
  page?: number
  limit?: number
}): Promise<{
  reviews: EnrichedAdminReview[]
  meta: { page: number; limit: number; total: number }
}> {
  return listAdminReviews({ page, limit, flagged: true })
}
