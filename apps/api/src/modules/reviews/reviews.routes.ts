/**
 * Reviews route handlers — storefront product reviews, customer submit/mine/token-status,
 * admin moderation (flagged list, hide/show, flag, resolve). Success: { data: T }.
 * No try/catch — errors propagate to global handler.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import type { AuthRequest, AdminRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import * as reviewsService from './reviews.service'

const router: IRouter = Router()

// —— Storefront: GET /products/:productId/reviews (no auth) ——

const productReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().max(50).default(20),
})

router.get(
  '/products/:productId/reviews',
  validateQuery(productReviewsQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof productReviewsQuerySchema> })
      .validatedQuery
    const result = await reviewsService.getProductReviews({
      productId: req.params.productId as string,
      page: query.page,
      limit: query.limit,
    })
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
    })
  },
)

// —— Customer: POST /reviews ——

const submitReviewBodySchema = z.object({
  token: z.string().uuid(),
  orderItemId: z.string().uuid(),
  rating: z.number().int().min(1).max(5),
  body: z.string().max(2000).optional(),
  mediaUrls: z.array(z.string().url()).max(5).optional(),
})

router.post(
  '/reviews',
  requireAuth,
  validate(submitReviewBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as Request & { body: z.infer<typeof submitReviewBodySchema> })
      .body
    const review = await reviewsService.submitReview({
      userId: authReq.user.id,
      plainToken: body.token,
      orderItemId: body.orderItemId,
      rating: body.rating,
      body: body.body,
      mediaUrls: body.mediaUrls,
    })
    res.status(201).json({ data: { review } })
  },
)

// —— Customer: GET /reviews/mine ——

const mineQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().max(50).default(20),
})

router.get(
  '/reviews/mine',
  requireAuth,
  validateQuery(mineQuerySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const query = (req as Request & { validatedQuery: z.infer<typeof mineQuerySchema> })
      .validatedQuery
    const result = await reviewsService.getMyReviews({
      userId: authReq.user.id,
      page: query.page,
      limit: query.limit,
    })
    res.status(200).json({
      data: {
        reviews: result.reviews,
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    })
  },
)

// —— Customer: GET /reviews/token-status ——

const tokenStatusQuerySchema = z.object({
  orderItemId: z.string().uuid(),
})

router.get(
  '/reviews/token-status',
  requireAuth,
  validateQuery(tokenStatusQuerySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const query = (req as Request & { validatedQuery: z.infer<typeof tokenStatusQuerySchema> })
      .validatedQuery
    const result = await reviewsService.getReviewTokenStatus({
      userId: authReq.user.id,
      orderItemId: query.orderItemId,
    })
    res.status(200).json({
      data: {
        hasToken: result.hasToken,
        isUsed: result.isUsed,
        expiresAt: result.expiresAt,
        hasReview: result.hasReview,
      },
    })
  },
)

// —— Admin: GET /admin/reviews/flagged ——

const flaggedQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().max(100).default(50),
})

router.get(
  '/admin/reviews/flagged',
  requireAdmin,
  validateQuery(flaggedQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof flaggedQuerySchema> })
      .validatedQuery
    const result = await reviewsService.adminListFlaggedReviews({
      page: query.page,
      limit: query.limit,
    })
    res.status(200).json({
      data: {
        reviews: result.reviews,
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    })
  },
)

// —— Admin: GET /admin/products/:productId/reviews ——

const adminProductReviewsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().max(100).default(50),
})

router.get(
  '/admin/products/:productId/reviews',
  requireAdmin,
  validateQuery(adminProductReviewsQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & {
      validatedQuery: z.infer<typeof adminProductReviewsQuerySchema>
    }).validatedQuery
    const result = await reviewsService.adminGetProductReviews({
      productId: req.params.productId as string,
      page: query.page,
      limit: query.limit,
    })
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
    })
  },
)

// —— Admin: POST /admin/reviews/:reviewId/hide ——

router.post(
  '/admin/reviews/:reviewId/hide',
  requireAdmin,
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    await reviewsService.adminHideReview({
      reviewId: req.params.reviewId as string,
      adminId: authReq.admin.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/reviews/:reviewId/show ——

router.post(
  '/admin/reviews/:reviewId/show',
  requireAdmin,
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    await reviewsService.adminShowReview({
      reviewId: req.params.reviewId as string,
      adminId: authReq.admin.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/reviews/:reviewId/flag ——

const flagBodySchema = z.object({
  reason: z.string().min(1).max(500),
})

router.post(
  '/admin/reviews/:reviewId/flag',
  requireAdmin,
  validate(flagBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    const body = (req as Request & { body: z.infer<typeof flagBodySchema> }).body
    await reviewsService.adminFlagReview({
      reviewId: req.params.reviewId as string,
      reason: body.reason,
      adminId: authReq.admin.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/reviews/:reviewId/resolve-flag ——

router.post(
  '/admin/reviews/:reviewId/resolve-flag',
  requireAdmin,
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    await reviewsService.adminResolveFlag({
      reviewId: req.params.reviewId as string,
      adminId: authReq.admin.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

export default router
