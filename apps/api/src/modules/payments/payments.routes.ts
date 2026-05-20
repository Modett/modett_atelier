/**
 * Payments route handlers.
 *
 *   POST   /payments/session                    → SDK params (one-time | tokenize)
 *   POST   /payments/webhook                    → PAYable server callback ({ Status: 200 })
 *   GET    /payments/status/:orderId            → poll order/payment state after redirect
 *
 *   GET    /payments/saved-cards                → list current user's saved cards
 *   POST   /payments/saved-cards/:id/default    → mark as default
 *   DELETE /payments/saved-cards/:id            → soft-delete + best-effort PAYable delete
 *   POST   /payments/saved-cards/:id/pay        → server-to-server charge of saved card
 *
 * All success responses: { data: T }
 * Webhook response: { Status: 200 } (PAYable requirement)
 */

import type { Request, Response, IRouter } from 'express'
import { Router } from 'express'
import { z } from 'zod'
import { optionalAuth, requireAuth } from '../../middleware/auth'
import type { AuthRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import * as paymentsService from './payments.service'

const router = Router()

// ——— /payments/session ———

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
  /**
   * Save the card for future use. Only honored when the request carries a
   * valid customer session — the API forces ONE_TIME for guests regardless.
   */
  saveCard: z.boolean().optional().default(false),
})

router.post(
  '/payments/session',
  optionalAuth,
  validate(sessionBodySchema),
  async (req, res: Response) => {
    const body = (req as Request & { body: z.infer<typeof sessionBodySchema> }).body
    const authReq = req as AuthRequest
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
      userId: authReq.user?.id ?? null,
      saveCard: body.saveCard,
    })
    res.status(200).json({ data: result })
  },
)

// ——— /payments/webhook ———

// PAYable server-to-server callback. ALWAYS respond { Status: 200 }, except on
// invalid checkValue (HTTP 400 per rule 8.2).
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
    // Still return 200 — PAYable retries non-200 unless it's checkValue.
  }
  res.status(200).json({ Status: 200 })
})

// ——— /payments/status/:orderId ———

const statusQuerySchema = z.object({
  guestEmail: z.string().email().optional(),
})

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

// ——— /payments/saved-cards ———

router.get(
  '/payments/saved-cards',
  requireAuth,
  async (req, res: Response) => {
    const authReq = req as AuthRequest
    const result = await paymentsService.listSavedCards({ userId: authReq.user.id })
    res.status(200).json({ data: result })
  },
)

router.delete(
  '/payments/saved-cards/:id',
  requireAuth,
  async (req, res: Response) => {
    const authReq = req as AuthRequest
    const id = req.params.id as string
    const result = await paymentsService.deleteSavedCard({
      savedCardId: id,
      userId: authReq.user.id,
    })
    res.status(200).json({ data: result })
  },
)

router.post(
  '/payments/saved-cards/:id/default',
  requireAuth,
  async (req, res: Response) => {
    const authReq = req as AuthRequest
    const id = req.params.id as string
    const result = await paymentsService.setDefaultSavedCard({
      savedCardId: id,
      userId: authReq.user.id,
    })
    res.status(200).json({ data: result })
  },
)

const payWithSavedCardSchema = z.object({
  orderId: z.string().uuid(),
})

router.post(
  '/payments/saved-cards/:id/pay',
  requireAuth,
  validate(payWithSavedCardSchema),
  async (req, res: Response) => {
    const authReq = req as AuthRequest
    const savedCardId = req.params.id as string
    const body = (req as Request & { body: z.infer<typeof payWithSavedCardSchema> }).body
    const result = await paymentsService.payWithSavedCard({
      orderId: body.orderId,
      savedCardId,
      userId: authReq.user.id,
    })
    res.status(200).json({ data: result })
  },
)

export const paymentsRoutes: IRouter = router
