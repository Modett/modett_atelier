/**
 * Checkout route handlers — start, address, contact, shipping, payment-intent, confirmation.
 * optionalAuth + resolveCheckoutIdentity on all routes. Success: { data: T }.
 * No try/catch — errors propagate to global handler.
 */

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type IRouter,
} from 'express'
import { z } from 'zod'
import { optionalAuth } from '../../middleware/auth'
import type { AuthRequest } from '../../middleware/auth'
import { validate, validateQuery } from '../../middleware/validate'
import { rateLimitCheckoutStart, rateLimitPaymentIntent } from '../../middleware/rateLimit'
import * as checkoutService from './checkout.service'
import {
  validatePromoCode,
  calculatePromoDiscount,
  applyPromoCodeToOrder,
  getOrderById,
  removePromoCodeFromOrder,
} from '@modett/db'

const router = Router()

export type CheckoutIdentityRequest = Request & {
  checkoutUserId?: string
  checkoutSession: string
}

function resolveCheckoutIdentity(
  req: Request,
  _res: Response,
  next: NextFunction,
): void {
  const authReq = req as AuthRequest
  const checkoutReq = req as CheckoutIdentityRequest
  checkoutReq.checkoutUserId = authReq.user?.id ?? undefined
  checkoutReq.checkoutSession = req.cookies?.['cid'] ?? ''
  next()
}

function validateOrderIdParam(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const result = z.string().uuid().safeParse(req.params.orderId)
  if (!result.success) {
    res.status(400).json({
      error: { code: 'VALIDATION_ERROR', message: 'Invalid orderId' },
    })
    return
  }
  next()
}

const checkoutStartBodySchema = z.object({
  currency: z.enum(['LKR', 'SGD', 'USD']),
  guestEmail: z.string().email().optional(),
})

// POST /checkout/start
router.post(
  '/checkout/start',
  optionalAuth,
  resolveCheckoutIdentity,
  rateLimitCheckoutStart,
  validate(checkoutStartBodySchema),
  async (req, res) => {
    const r = req as CheckoutIdentityRequest
    const body = (req as Request & { body: z.infer<typeof checkoutStartBodySchema> }).body
    const result = await checkoutService.startCheckout({
      userId: r.checkoutUserId,
      sessionId: r.checkoutSession,
      currency: body.currency,
      guestEmail: body.guestEmail,
    })
    res.status(201).json({
      data: {
        reservationId: result.reservationId,
        orderId: result.orderId,
        orderRef: result.orderRef,
        expiresAt: result.expiresAt.toISOString(),
        currency: result.currency,
        summary: result.summary,
      },
    })
  },
)

const addressBodySchema = z.object({
  kind: z.enum(['SHIPPING', 'BILLING']),
  addressJson: z.object({}).passthrough(),
  countryCode: z.string().length(2),
})

// POST /checkout/:orderId/address
router.post(
  '/checkout/:orderId/address',
  optionalAuth,
  resolveCheckoutIdentity,
  validateOrderIdParam,
  validate(addressBodySchema),
  async (req, res) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof addressBodySchema> }).body
    const result = await checkoutService.saveAddress({
      orderId,
      kind: body.kind,
      addressJson: body.addressJson,
      countryCode: body.countryCode,
    })
    res.status(200).json({ data: { order: result } })
  },
)

const contactBodySchema = z.object({
  primaryPhone: z.string().min(7).max(20),
  extraPhones: z.array(z.string()).optional().default([]),
  isGift: z.boolean().optional().default(false),
  giftReceiver: z
    .object({
      name: z.string(),
      phone: z.string().optional(),
      note: z.string().optional(),
    })
    .optional(),
})

// POST /checkout/:orderId/contact
router.post(
  '/checkout/:orderId/contact',
  optionalAuth,
  resolveCheckoutIdentity,
  validateOrderIdParam,
  validate(contactBodySchema),
  async (req, res) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof contactBodySchema> }).body
    const result = await checkoutService.saveContact({
      orderId,
      primaryPhone: body.primaryPhone,
      extraPhones: body.extraPhones,
      isGift: body.isGift,
      giftReceiver: body.giftReceiver,
    })
    res.status(200).json({ data: { order: result } })
  },
)

const shippingMethodsQuerySchema = z.object({
  countryCode: z.string().length(2),
  currency: z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
})

// GET /checkout/shipping-methods
router.get(
  '/checkout/shipping-methods',
  optionalAuth,
  resolveCheckoutIdentity,
  validateQuery(shippingMethodsQuerySchema),
  async (req, res) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof shippingMethodsQuerySchema> }).validatedQuery
    const methods = await checkoutService.getShippingMethods({
      countryCode: query.countryCode,
      currency: query.currency,
    })
    res.status(200).json({ data: { methods } })
  },
)

const shippingMethodBodySchema = z.object({
  shippingMethodId: z.string().uuid(),
  currency: z.enum(['LKR', 'SGD', 'USD']),
})

// POST /checkout/:orderId/shipping-method
router.post(
  '/checkout/:orderId/shipping-method',
  optionalAuth,
  resolveCheckoutIdentity,
  validateOrderIdParam,
  validate(shippingMethodBodySchema),
  async (req, res) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof shippingMethodBodySchema> }).body
    const result = await checkoutService.selectShippingMethod({
      orderId,
      shippingMethodId: body.shippingMethodId,
      currency: body.currency,
    })
    res.status(200).json({ data: { order: result } })
  },
)

const applyPromoSchema = z.object({
  code: z.string().min(1).max(50),
})

// POST /checkout/:orderId/promo
router.post(
  '/checkout/:orderId/promo',
  optionalAuth,
  resolveCheckoutIdentity,
  validateOrderIdParam,
  validate(applyPromoSchema),
  async (req: Request, res: Response) => {
    const { orderId } = req.params as { orderId: string }
    const body = (req as Request & { body: z.infer<typeof applyPromoSchema> }).body

    const r = req as CheckoutIdentityRequest

    const order = await getOrderById({ id: orderId })
    if (!order) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      })
      return
    }
    if (order.order_state !== 'DRAFT') {
      res.status(409).json({
        error: {
          code: 'ORDER_NOT_DRAFT',
          message: 'Promo codes can only be applied to draft orders.',
        },
      })
      return
    }

    let promoRow: Awaited<ReturnType<typeof validatePromoCode>>
    try {
      promoRow = await validatePromoCode({
        code: body.code,
        userId: r.checkoutUserId ?? null,
        orderId,
        orderSubtotal: String(order.subtotal),
        currency: order.currency,
      })
    } catch (err) {
      const msg = (err as Error).message
      const userMessages: Record<string, string> = {
        PROMO_INVALID: 'This promo code is invalid or has expired.',
        PROMO_NOT_YET_ACTIVE: 'This promo code is not yet active.',
        PROMO_EXPIRED: 'This promo code has expired.',
        PROMO_MAX_USES_REACHED: 'This promo code has already been used.',
        PROMO_ALREADY_USED: 'You have already used this promo code.',
        PROMO_MIN_ORDER_NOT_MET:
          'Your order does not meet the minimum amount for this code.',
      }
      res.status(400).json({
        error: {
          code: msg,
          message:
            userMessages[msg] ?? 'This promo code cannot be applied.',
        },
      })
      return
    }

    const discountAmount = calculatePromoDiscount({
      promoCode: promoRow,
      subtotal: String(order.subtotal),
    })

    try {
      await applyPromoCodeToOrder({
        orderId,
        promoCodeId: promoRow.id,
        discountAmount,
        userId: r.checkoutUserId ?? null,
      })
    } catch (applyErr) {
      const applyMsg = (applyErr as Error).message
      if (applyMsg === 'PROMO_DISCOUNT_EXCEEDS_TOTAL') {
        res.status(400).json({
          error: {
            code: applyMsg,
            message: 'This discount cannot be applied to the current order total.',
          },
        })
        return
      }
      throw applyErr
    }

    const updated = await getOrderById({ id: orderId })
    res.status(200).json({
      data: {
        discountAmount,
        promoCode: promoRow.code,
        promoType: promoRow.type,
        promoValue: promoRow.value,
        newTotal: String(updated!.total),
      },
    })
  },
)

// DELETE /checkout/:orderId/promo
router.delete(
  '/checkout/:orderId/promo',
  optionalAuth,
  resolveCheckoutIdentity,
  validateOrderIdParam,
  async (req: Request, res: Response) => {
    const { orderId } = req.params as { orderId: string }

    const order = await getOrderById({ id: orderId })
    if (!order) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      })
      return
    }
    if (order.order_state !== 'DRAFT') {
      res.status(409).json({
        error: {
          code: 'ORDER_NOT_DRAFT',
          message: 'Promo codes can only be changed on draft orders.',
        },
      })
      return
    }

    const result = await removePromoCodeFromOrder({ orderId })
    if (!result) {
      res.status(404).json({
        error: { code: 'ORDER_NOT_FOUND', message: 'Order not found' },
      })
      return
    }

    res.status(200).json({
      data: { newTotal: result.newTotal },
    })
  },
)

// When the Payments module is built, this route will be extended to:
// 1. Create a Stripe PaymentIntent via Stripe SDK
// 2. Return { clientSecret } for the frontend Stripe Elements widget
// The stampPaymentSubmitted call (grace window) stays here — it must
// happen at the moment the customer submits payment, not in the webhook.

const paymentIntentBodySchema = z.object({
  reservationId: z.string().uuid(),
})

// POST /checkout/:orderId/payment-intent
router.post(
  '/checkout/:orderId/payment-intent',
  optionalAuth,
  resolveCheckoutIdentity,
  rateLimitPaymentIntent,
  validateOrderIdParam,
  validate(paymentIntentBodySchema),
  async (req, res) => {
    const orderId = req.params.orderId as string
    const body = (req as Request & { body: z.infer<typeof paymentIntentBodySchema> }).body
    const result = await checkoutService.initiatePayment({
      orderId,
      reservationId: body.reservationId,
    })
    res.status(200).json({
      data: {
        orderId: result.orderId,
        orderRef: result.orderRef,
        reservationId: result.reservationId,
        total: result.total,
        currency: result.currency,
        stripeReady: result.stripeReady,
      },
    })
  },
)

const confirmationQuerySchema = z.object({
  guestEmail: z.string().email().optional(),
})

// GET /checkout/:orderId/confirmation
router.get(
  '/checkout/:orderId/confirmation',
  optionalAuth,
  resolveCheckoutIdentity,
  validateOrderIdParam,
  validateQuery(confirmationQuerySchema),
  async (req, res) => {
    const orderId = req.params.orderId as string
    const query = (req as Request & { validatedQuery: z.infer<typeof confirmationQuerySchema> }).validatedQuery
    const result = await checkoutService.getOrderConfirmation({
      orderId,
      userId: (req as CheckoutIdentityRequest).checkoutUserId,
      guestEmail: query.guestEmail,
    })
    res.status(200).json({ data: result })
  },
)

export const checkoutRoutes: IRouter = router
