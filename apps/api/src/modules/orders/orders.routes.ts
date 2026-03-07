/**
 * Orders route handlers — customer order history/detail, admin list/detail,
 * fulfillment (pack/ship/deliver), cancel, shipping address, scan-to-pack.
 * Success: { data: T }. No try/catch — errors propagate to global handler.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAuth, requireAdmin } from '../../middleware/auth'
import type { AuthRequest, AdminRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import { withAdmin } from '../../middleware/auth'
import * as ordersService from './orders.service'

const router = Router()

// —— Customer routes ——

const myOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

router.get(
  '/orders',
  requireAuth,
  validateQuery(myOrdersQuerySchema),
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const query = (req as Request & { validatedQuery: z.infer<typeof myOrdersQuerySchema> })
      .validatedQuery
    const result = await ordersService.getMyOrders({
      userId: authReq.user.id,
      page: query.page,
      limit: query.limit,
    })
    res.status(200).json({ data: result })
  },
)

router.get(
  '/orders/:orderId',
  requireAuth,
  async (req: Request, res: Response) => {
    const authReq = req as AuthRequest
    const orderId = req.params.orderId as string
    const result = await ordersService.getMyOrderDetail({
      orderId,
      userId: authReq.user.id,
    })
    res.status(200).json({ data: result })
  },
)

// —— Admin read ——

const adminOrdersQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  orderState: z
    .enum(['DRAFT', 'PLACED', 'CANCELLED'])
    .optional(),
  paymentState: z
    .enum(['UNPAID', 'PAID', 'FAILED', 'REFUNDED', 'PARTIALLY_REFUNDED'])
    .optional(),
  fulfillmentState: z
    .enum(['NOT_STARTED', 'PACKED', 'SHIPPED', 'OUT_FOR_DELIVERY', 'DELIVERED'])
    .optional(),
  search: z.string().optional(),
})

router.get(
  '/admin/orders',
  requireAdmin,
  validateQuery(adminOrdersQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof adminOrdersQuerySchema> })
      .validatedQuery
    const result = await ordersService.adminListOrders({
      page: query.page,
      limit: query.limit,
      orderState: query.orderState,
      paymentState: query.paymentState,
      fulfillmentState: query.fulfillmentState,
      search: query.search,
    })
    res.status(200).json({ data: result })
  },
)

router.get(
  '/admin/orders/:orderId',
  requireAdmin,
  async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string
    const result = await ordersService.adminGetOrderDetail({ orderId })
    res.status(200).json({ data: result })
  },
)

// —— Admin fulfillment ——

const packBodySchema = z.object({
  note: z.string().optional(),
})

router.post(
  '/admin/orders/:orderId/pack',
  requireAdmin,
  validate(packBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof packBodySchema> }).body
    await ordersService.markOrderPacked({
      orderId,
      adminId: req.admin.id,
      note: body.note,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

const shipBodySchema = z.object({
  trackingNumber: z.string().optional(),
  carrier: z.string().optional(),
  note: z.string().optional(),
})

router.post(
  '/admin/orders/:orderId/ship',
  requireAdmin,
  validate(shipBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof shipBodySchema> }).body
    await ordersService.markOrderShipped({
      orderId,
      adminId: req.admin.id,
      trackingNumber: body.trackingNumber,
      carrier: body.carrier,
      note: body.note,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

const outForDeliveryBodySchema = z.object({
  note: z.string().optional(),
})

router.post(
  '/admin/orders/:orderId/out-for-delivery',
  requireAdmin,
  validate(outForDeliveryBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof outForDeliveryBodySchema> }).body
    await ordersService.markOrderOutForDelivery({
      orderId,
      adminId: req.admin.id,
      note: body.note,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

const deliverBodySchema = z.object({
  note: z.string().optional(),
})

router.post(
  '/admin/orders/:orderId/deliver',
  requireAdmin,
  validate(deliverBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof deliverBodySchema> }).body
    await ordersService.markOrderDelivered({
      orderId,
      adminId: req.admin.id,
      note: body.note,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

const cancelBodySchema = z.object({
  reason: z.string().min(1),
})

router.post(
  '/admin/orders/:orderId/cancel',
  requireAdmin,
  validate(cancelBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof cancelBodySchema> }).body
    await ordersService.cancelOrder({
      orderId,
      adminId: req.admin.id,
      reason: body.reason,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

const shippingAddressBodySchema = z.object({
  kind: z.enum(['SHIPPING', 'BILLING']),
  addressJson: z.object({}).passthrough(),
  countryCode: z.string().length(2),
})

router.patch(
  '/admin/orders/:orderId/shipping-address',
  requireAdmin,
  validate(shippingAddressBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof shippingAddressBodySchema> }).body
    await ordersService.updateShippingAddress({
      orderId,
      kind: body.kind,
      addressJson: body.addressJson,
      countryCode: body.countryCode,
      adminId: req.admin.id,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

// —— Scan-to-pack ——

const scanBodySchema = z.object({
  barcodeValue: z.string().min(1),
  orderItemId: z.string().uuid(),
})

router.post(
  '/admin/orders/scan',
  requireAdmin,
  validate(scanBodySchema),
  withAdmin(async (req: AdminRequest, res: Response) => {
    const body = (req as Request & { body: z.infer<typeof scanBodySchema> }).body
    const adminReq = req as AdminRequest
    const adminFullName = `${adminReq.user.firstName} ${adminReq.user.lastName}`
    const result = await ordersService.scanUnit({
      barcodeValue: body.barcodeValue,
      orderItemId: body.orderItemId,
      adminId: adminReq.admin.id,
      adminFullName,
    })
    res.status(200).json({ data: result })
  }),
)

router.delete(
  '/admin/orders/:orderId/allocations/:inventoryUnitId',
  requireAdmin,
  withAdmin(async (req: AdminRequest, res: Response) => {
    const orderId = req.params.orderId as string
    const inventoryUnitId = req.params.inventoryUnitId as string
    await ordersService.removeUnitAllocation({
      inventoryUnitId,
      adminId: req.admin.id,
      orderId,
    })
    res.status(200).json({ data: { ok: true } })
  }),
)

router.get(
  '/admin/orders/:orderId/packing-status',
  requireAdmin,
  async (req: Request, res: Response) => {
    const orderId = req.params.orderId as string
    const result = await ordersService.getOrderPackingStatus({ orderId })
    res.status(200).json({ data: result })
  },
)

export const ordersRoutes: IRouter = router
