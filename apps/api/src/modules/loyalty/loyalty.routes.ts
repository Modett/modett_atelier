/**
 * Loyalty route handlers — customer account/ledger/preview; admin user/rules.
 * Success: { data: T }. No try/catch — errors propagate to global handler.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import type { AuthRequest, AdminRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import type { ValidatedBody, ValidatedQuery } from '../../middleware/validate'
import * as loyaltyService from './loyalty.service'

const router: IRouter = Router()

// —— Customer routes (requireAuth) ——

router.get(
  '/loyalty/account',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const result = await loyaltyService.getMyLoyaltyAccount({
      userId: authReq.user.id,
    })
    res.status(200).json({ data: result })
  },
)

const ledgerQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  type: z
    .enum(['EARN', 'REDEEM', 'BONUS', 'EXPIRY', 'ADJUST'])
    .optional(),
})

router.get(
  '/loyalty/ledger',
  requireAuth,
  validateQuery(ledgerQuerySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const query = (req as ValidatedQuery<typeof ledgerQuerySchema>).validatedQuery
    const result = await loyaltyService.getMyLedger({
      userId: authReq.user.id,
      page: query.page,
      limit: query.limit,
      type: query.type,
    })
    res.status(200).json({ data: result })
  },
)

const redeemPreviewBodySchema = z.object({
  pointsToRedeem: z.number().int().min(1),
  subtotal: z.string(),
  currency: z.enum(['LKR', 'SGD', 'USD']),
})

router.post(
  '/loyalty/redeem/preview',
  requireAuth,
  validate(redeemPreviewBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as ValidatedBody<typeof redeemPreviewBodySchema>).body
    const result = await loyaltyService.previewRedemption({
      userId: authReq.user.id,
      pointsToRedeem: body.pointsToRedeem,
      subtotal: body.subtotal,
      currency: body.currency,
    })
    res.status(200).json({ data: result })
  },
)

// —— Admin routes (requireAdmin) ——

router.get(
  '/admin/loyalty/users/:userId',
  requireAdmin,
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string
    const result = await loyaltyService.adminGetUserLoyalty({ userId })
    res.status(200).json({ data: result })
  },
)

const grantBodySchema = z.object({
  points: z.number().int().min(1),
  reason: z.string().min(1),
})

router.post(
  '/admin/loyalty/users/:userId/grant',
  requireAdmin,
  validate(grantBodySchema),
  async (req: Request, res: Response) => {
    const adminReq = req as AdminRequest
    const userId = req.params.userId as string
    const body = (req as ValidatedBody<typeof grantBodySchema>).body
    const result = await loyaltyService.adminGrantPoints({
      userId,
      points: body.points,
      reason: body.reason,
      adminId: adminReq.admin.id,
    })
    res.status(200).json({ data: result })
  },
)

const adjustBodySchema = z.object({
  points: z.number().int(),
  reason: z.string().min(1),
})

router.post(
  '/admin/loyalty/users/:userId/adjust',
  requireAdmin,
  validate(adjustBodySchema),
  async (req: Request, res: Response) => {
    const adminReq = req as AdminRequest
    const userId = req.params.userId as string
    const body = (req as ValidatedBody<typeof adjustBodySchema>).body
    const result = await loyaltyService.adminAdjustPoints({
      userId,
      points: body.points,
      reason: body.reason,
      adminId: adminReq.admin.id,
    })
    res.status(200).json({ data: result })
  },
)

router.post(
  '/admin/loyalty/users/:userId/reconcile',
  requireAdmin,
  async (req: Request, res: Response) => {
    const adminReq = req as AdminRequest
    const userId = req.params.userId as string
    const result = await loyaltyService.adminReconcileBalance({
      userId,
      adminId: adminReq.admin.id,
    })
    res.status(200).json({ data: result })
  },
)

router.post(
  '/admin/loyalty/users/:userId/re-evaluate-tier',
  requireAdmin,
  async (req: Request, res: Response) => {
    const userId = req.params.userId as string
    const result = await loyaltyService.adminReEvaluateTier({ userId })
    res.status(200).json({ data: result })
  },
)

router.get(
  '/admin/loyalty/rules',
  requireAdmin,
  async (_req: Request, res: Response) => {
    const result = await loyaltyService.adminGetLoyaltyRules()
    res.status(200).json({ data: result })
  },
)

const updateRulesBodySchema = z.object({
  earnRateJson: z
    .record(
      z.object({
        points: z.number(),
        per_amount: z.number(),
      }),
    )
    .optional(),
  redemptionRateByCurrencyJson: z
    .record(
      z.object({
        points: z.number(),
        value: z.number(),
      }),
    )
    .optional(),
  tierThresholdsJson: z
    .object({
      BRONZE: z.number(),
      SILVER: z.number(),
      GOLD: z.number(),
    })
    .optional(),
  multipliersJson: z
    .object({
      BRONZE: z.number(),
      SILVER: z.number(),
      GOLD: z.number(),
    })
    .optional(),
  minRedeem: z.number().int().min(1).optional(),
  maxRedeemPercent: z.number().min(0).max(100).optional(),
  noStackWithSale: z.boolean().optional(),
})

router.patch(
  '/admin/loyalty/rules',
  requireAdmin,
  validate(updateRulesBodySchema),
  async (req: Request, res: Response) => {
    const adminReq = req as AdminRequest
    const body = (req as ValidatedBody<typeof updateRulesBodySchema>).body
    const result = await loyaltyService.adminUpdateLoyaltyRules({
      ...body,
      adminId: adminReq.admin.id,
    })
    res.status(200).json({ data: result })
  },
)

export const loyaltyRoutes: IRouter = router
