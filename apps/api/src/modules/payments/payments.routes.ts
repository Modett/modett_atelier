/**
 * Payments route handlers — session, webhook, status.
 * Success: { data: T }. Webhook returns { Status: 200 } for PAYable.
 */

import type { Request, Response, IRouter } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth } from '../../middleware/auth'
import type { AuthRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import * as paymentsService from './payments.service'

const router = Router()

const sessionBodySchema = z.object({
  orderId: z.string().uuid(),
  reservationId: z.string().uuid(),
  cartId: z.string().uuid(),
  amount: z.string(),
  currency: z.enum(['LKR', 'SGD', 'USD']),
  customerFirstName: z.string().min(1),
  customerLastName: z.string().min(1),
  customerEmail: z.string().email(),
  customerMobilePhone: z.string().min(7).max(20),
  billingAddress: z.object({
    street: z.string(),
    city: z.string(),
    province: z.string(),
    country: z.string().length(3),
    postcode: z.string(),
  }),
})

// POST /payments/session
router.post(
  '/payments/session',
  optionalAuth,
  validate(sessionBodySchema),
  async (req, res: Response) => {
    const body = (req as Request & { body: z.infer<typeof sessionBodySchema> })
      .body
    const result = await paymentsService.createPaymentSession({
      orderId: body.orderId,
      reservationId: body.reservationId,
      cartId: body.cartId,
      amount: body.amount,
      currency: body.currency,
      customerFirstName: body.customerFirstName,
      customerLastName: body.customerLastName,
      customerEmail: body.customerEmail,
      customerMobilePhone: body.customerMobilePhone,
      billingAddress: body.billingAddress,
    })
    res.status(200).json({ data: result })
  },
)

// POST /payments/webhook — no auth; PAYable sends JSON body
router.post('/payments/webhook', async (req: Request, res: Response) => {
  await paymentsService.handleWebhook({ payload: req.body })
  res.status(200).json({ Status: 200 })
})

const statusQuerySchema = z.object({
  guestEmail: z.string().email().optional(),
})

// GET /payments/status/:orderId
router.get(
  '/payments/status/:orderId',
  optionalAuth,
  validateQuery(statusQuerySchema),
  async (req, res: Response) => {
    const orderId = req.params.orderId as string
    const query = (req as Request & { validatedQuery: z.infer<typeof statusQuerySchema> })
      .validatedQuery
    const authReq = req as AuthRequest
    const result = await paymentsService.getPaymentStatus({
      orderId,
      userId: authReq.user?.id ?? null,
      guestEmail: query.guestEmail ?? null,
    })
    res.status(200).json({ data: result })
  },
)

export const paymentsRoutes: IRouter = router
