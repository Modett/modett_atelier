/**
 * Returns route handlers — customer submit/list/detail, admin list/detail
 * and status transitions (open, approve, reject, fulfil). Success: { data: T }.
 * No try/catch — errors propagate to global handler.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import type { AuthRequest, AdminRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import * as returnsService from './returns.service'
import { writeAuditLog } from '../../middleware/audit'

const router: IRouter = Router()

// —— Customer: POST /returns ——

const createReturnBodySchema = z.object({
  orderId: z.string().uuid(),
  type: z.enum(['REFUND', 'EXCHANGE']),
  reason: z.string().min(10).max(1000),
  policyVersion: z.string().min(1),
  items: z
    .array(
      z.object({
        orderItemId: z.string().uuid(),
        qty: z.number().int().min(1),
        requestedVariantChangeJson: z
          .object({
            color: z.string().optional(),
            size: z.string().optional(),
          })
          .optional(),
      }),
    )
    .min(1),
})

router.post(
  '/returns',
  requireAuth,
  validate(createReturnBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const body = (req as Request & { body: z.infer<typeof createReturnBodySchema> })
      .body
    const result = await returnsService.createReturn({
      orderId: body.orderId,
      userId: authReq.user.id,
      type: body.type,
      reason: body.reason,
      policyVersion: body.policyVersion,
      items: body.items.map(
        (i: z.infer<typeof createReturnBodySchema>['items'][number]) => ({
          orderItemId: i.orderItemId,
          qty: i.qty,
          requestedVariantChangeJson: i.requestedVariantChangeJson,
        }),
      ),
    })
    res.status(201).json({
      data: { returnRequest: result.returnRequest, items: result.items },
    })
  },
)

// —— Customer: GET /orders/:orderId/returns ——

router.get(
  '/orders/:orderId/returns',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const orderId = req.params.orderId as string
    const result = await returnsService.getMyReturnRequests({
      orderId,
      userId: authReq.user.id,
    })
    res.status(200).json({ data: { returns: result.returns } })
  },
)

// —— Customer: GET /returns/:returnRequestId ——

router.get(
  '/returns/:returnRequestId',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const returnRequestId = req.params.returnRequestId as string
    const result = await returnsService.getMyReturnDetail({
      returnRequestId,
      userId: authReq.user.id,
    })
    res.status(200).json({
      data: {
        request: result.request,
        items: result.items,
        events: result.events,
      },
    })
  },
)

// —— Admin: GET /admin/returns ——

const adminReturnsQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().max(100).default(50),
  status: z
    .enum([
      'SUBMITTED',
      'PENDING_REVIEW',
      'APPROVED',
      'REJECTED',
      'FULFILLED',
    ])
    .optional(),
  type: z.enum(['REFUND', 'EXCHANGE']).optional(),
})

router.get(
  '/admin/returns',
  requireAdmin,
  validateQuery(adminReturnsQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof adminReturnsQuerySchema> })
      .validatedQuery
    const result = await returnsService.adminListReturns({
      page: query.page,
      limit: query.limit,
      status: query.status,
      type: query.type,
    })
    res.status(200).json({
      data: {
        returns: result.returns,
        page: result.page,
        limit: result.limit,
        total: result.total,
      },
    })
  },
)

// —— Admin: GET /admin/returns/:returnRequestId ——

router.get(
  '/admin/returns/:returnRequestId',
  requireAdmin,
  async (req: Request, res: Response) => {
    const returnRequestId = req.params.returnRequestId as string
    const result = await returnsService.adminGetReturnDetail({
      returnRequestId,
    })
    res.status(200).json({
      data: {
        request: result.request,
        items: result.items,
        events: result.events,
      },
    })
  },
)

// —— Admin: POST /admin/returns/:returnRequestId/open ——

router.post(
  '/admin/returns/:returnRequestId/open',
  requireAdmin,
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    const returnRequestId = req.params.returnRequestId as string
    await returnsService.adminOpenForReview({
      returnRequestId,
      adminId: authReq.admin.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/returns/:returnRequestId/approve ——

const approveBodySchema = z.object({
  adminNote: z.string().optional(),
})

router.post(
  '/admin/returns/:returnRequestId/approve',
  requireAdmin,
  validate(approveBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    const body = (req as Request & { body: z.infer<typeof approveBodySchema> })
      .body
    const returnRequestId = req.params.returnRequestId as string
    await returnsService.adminApprove({
      returnRequestId,
      adminId: authReq.admin.id,
      adminNote: body.adminNote,
    })
    void writeAuditLog({
      req: authReq,
      action: 'APPROVE_RETURN',
      entityType: 'return_request',
      entityId: returnRequestId,
      entityLabel: returnRequestId,
      beforeJson: null,
      afterJson: { status: 'APPROVED' },
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/returns/:returnRequestId/reject ——

const rejectBodySchema = z.object({
  reason: z.string().min(1),
  adminNote: z.string().optional(),
})

router.post(
  '/admin/returns/:returnRequestId/reject',
  requireAdmin,
  validate(rejectBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    const body = (req as Request & { body: z.infer<typeof rejectBodySchema> })
      .body
    const returnRequestId = req.params.returnRequestId as string
    await returnsService.adminReject({
      returnRequestId,
      adminId: authReq.admin.id,
      reason: body.reason,
      adminNote: body.adminNote,
    })
    void writeAuditLog({
      req: authReq,
      action: 'REJECT_RETURN',
      entityType: 'return_request',
      entityId: returnRequestId,
      entityLabel: returnRequestId,
      beforeJson: null,
      afterJson: { status: 'REJECTED', reason: body.reason },
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin: POST /admin/returns/:returnRequestId/fulfil ——

const fulfilBodySchema = z.object({
  adminNote: z.string().optional(),
})

router.post(
  '/admin/returns/:returnRequestId/fulfil',
  requireAdmin,
  validate(fulfilBodySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AdminRequest
    const body = (req as Request & { body: z.infer<typeof fulfilBodySchema> })
      .body
    const returnRequestId = req.params.returnRequestId as string
    await returnsService.adminFulfil({
      returnRequestId,
      adminId: authReq.admin.id,
      adminNote: body.adminNote,
    })
    void writeAuditLog({
      req: authReq,
      action: 'FULFIL_RETURN',
      entityType: 'return_request',
      entityId: returnRequestId,
      entityLabel: returnRequestId,
      beforeJson: null,
      afterJson: { status: 'FULFILLED' },
    })
    res.status(200).json({ data: { ok: true } })
  },
)

export default router
