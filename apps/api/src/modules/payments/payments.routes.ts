/**
 * Payments route handlers — session (JSDK params), webhook, status.
 *
 * POST /payments/session  → returns paymentParams for PAYable CDN SDK
 * POST /payments/webhook  → PAYable server callback; must always return { Status: 200 }
 *                           EXCEPT when checkValue is invalid (HTTP 400)
 * GET  /payments/status/:orderId → poll payment/order state after redirect
 *
 * All success responses: { data: T }
 * Webhook response: { Status: 200 } (PAYable requirement)
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
  currency: z.enum(['LKR', 'SGD', 'USD']),
  customerFirstName: z.string().min(1),
  customerLastName: z.string().min(1),
  customerEmail: z.string().email(),
  customerMobilePhone: z.string().min(7).max(15),
  billingAddress: z.object({
    street: z.string().min(1),
    city: z.string().min(1),
    province: z.string().default(''),
    country: z.string().min(2).max(3),
    postcode: z.string().default(''),
  }),
})

// POST /payments/session
// Returns snake_case payment params for PAYable CDN SDK (window.payable.startPayment)
router.post(
  '/payments/session',
  optionalAuth,
  validate(sessionBodySchema),
  async (req, res: Response) => {
    const body = (req as Request & { body: z.infer<typeof sessionBodySchema> }).body
    const result = await paymentsService.createPaymentSession({
      orderId: body.orderId,
      reservationId: body.reservationId,
      cartId: body.cartId,
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

// POST /payments/webhook — no auth; PAYable server-to-server callback
// Rule 8.2: ALWAYS respond { Status: 200 }, EXCEPT on invalid checkValue (HTTP 400)
router.post('/payments/webhook', async (req: Request, res: Response) => {
  try {
    await paymentsService.handleWebhook({ payload: req.body })
  } catch (err) {
    const code = (err as { code?: string })?.code
    const statusCode = (err as { statusCode?: number })?.statusCode
    if (code === 'WEBHOOK_INVALID_CHECKVALUE' || statusCode === 400) {
      return res.status(400).send()
    }
    console.error('[webhook] Unhandled error:', err)
    // Still return 200 to PAYable for non-checkValue errors (rule 8.2)
  }
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
