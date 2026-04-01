/**
 * Loyalty route handlers — customer account/ledger/preview; admin user/rules.
 * Success: { data: T }. No try/catch — errors propagate to global handler.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin, requireOwner } from '../../middleware/auth'
import type { AuthRequest, AdminRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import type { ValidatedBody, ValidatedQuery } from '../../middleware/validate'
import * as loyaltyService from './loyalty.service'

const router: IRouter = Router()

const rateEntrySchema = z.object({
  points: z.number(),
  per_amount: z.number(),
})

const redemptionEntrySchema = z.object({
  points: z.number(),
  value: z.number(),
})

// —— Customer routes (requireAuth) ——

router.get(
  '/account/loyalty',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const result = await loyaltyService.getMyLoyalty({
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
  '/account/loyalty/ledger',
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

router.get(
  '/loyalty/account',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const result = await loyaltyService.getMyLoyalty({
      userId: authReq.user.id,
    })
    res.status(200).json({ data: result })
  },
)

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

// —— Admin routes ——

const adminSearchQuerySchema = z.object({
  email: z.string().min(1),
})

router.get(
  '/admin/loyalty/users/search',
  requireAdmin,
  validateQuery(adminSearchQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as ValidatedQuery<typeof adminSearchQuerySchema>).validatedQuery
    const result = await loyaltyService.adminSearchUsers({ email: query.email })
    res.status(200).json({ data: result })
  },
)

const topUsersQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(100).optional(),
})

router.get(
  '/admin/loyalty/users/top',
  requireAdmin,
  validateQuery(topUsersQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as ValidatedQuery<typeof topUsersQuerySchema>).validatedQuery
    const result = await loyaltyService.adminListTopUsers({
      limit: query.limit,
    })
    res.status(200).json({ data: result })
  },
)

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
  points: z.number().int().min(1).max(10_000),
  reason: z.string().min(1).max(500),
})

router.post(
  '/admin/loyalty/users/:userId/grant',
  requireOwner,
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
  points: z
    .number()
    .int()
    .min(-10_000)
    .max(10_000)
    .refine((n) => n !== 0, 'Cannot be zero'),
  reason: z.string().min(1).max(500),
})

router.post(
  '/admin/loyalty/users/:userId/adjust',
  requireOwner,
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
    .object({
      LKR: rateEntrySchema,
      SGD: rateEntrySchema,
      USD: rateEntrySchema,
    })
    .optional(),
  redemptionRateByCurrencyJson: z
    .object({
      LKR: redemptionEntrySchema,
      SGD: redemptionEntrySchema,
      USD: redemptionEntrySchema,
    })
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
  frequencyWeight: z.number().min(0).max(1).optional(),
  spendWeight: z.number().min(0).max(1).optional(),
  spendNormalisationFactor: z.number().int().min(1).optional(),
  evaluationWindowMonths: z.number().int().min(1).max(36).optional(),
  pointsExpiryMonths: z.number().int().min(1).max(60).optional(),
  minRedeem: z.number().int().min(1).optional(),
  maxRedeemPercent: z.number().min(0).max(100).optional(),
  noStackWithSale: z.boolean().optional(),
})

router.patch(
  '/admin/loyalty/rules',
  requireOwner,
  validate(updateRulesBodySchema),
  async (req: Request, res: Response) => {
    const adminReq = req as AdminRequest
    const body = (req as ValidatedBody<typeof updateRulesBodySchema>).body
    const result = await loyaltyService.adminUpdateLoyaltyRules({
      fields: body,
      adminId: adminReq.admin.id,
    })
    res.status(200).json({ data: result })
  },
)

export const loyaltyRoutes: IRouter = router
