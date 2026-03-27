/**
 * Cart route handlers — GET/POST/PATCH/DELETE cart and items.
 * optionalAuth + resolveCartIdentity on all routes. Success: { data: T }.
 */

import {
  Router,
  type Request,
  type Response,
  type NextFunction,
  type IRouter,
} from 'express'
import { z } from 'zod'
import crypto from 'crypto'
import { validate } from '../../middleware/validate'
import { optionalAuth } from '../../middleware/auth'
import type { AuthRequest } from '../../middleware/auth'
import * as cartService from './cart.service'

const router = Router()
const CID_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000 // 21 days

export type CartIdentityRequest = Request & {
  cartUserId?: string
  cartSession: string
}

function cartReq(req: Request): CartIdentityRequest {
  return req as CartIdentityRequest
}

function setCidCookie(res: Response, sessionId: string): void {
  res.cookie('cid', sessionId, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: CID_MAX_AGE_MS,
    path: '/',
  })
}

function resolveCartIdentity(
  req: Request,
  res: Response,
  next: NextFunction,
): void {
  const authReq = req as AuthRequest
  const cartReq = req as CartIdentityRequest
  cartReq.cartUserId = authReq.user?.id
  cartReq.cartSession = req.cookies?.cid ?? crypto.randomUUID()
  if (!req.cookies?.cid) {
    setCidCookie(res, cartReq.cartSession)
  }
  next()
}

const currencySchema = z.enum(['LKR', 'SGD', 'USD']).default('LKR')
const addToCartBodySchema = z.object({
  variantId: z.string().uuid(),
  qty: z.number().int().min(1).max(10).default(1),
})
const updateQtyBodySchema = z.object({
  qty: z.number().int().min(1).max(10),
})

// GET /cart
router.get('/cart', optionalAuth, resolveCartIdentity, async (req, res) => {
  const r = cartReq(req)
  const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR'
  const result = await cartService.getCart({
    userId: r.cartUserId,
    sessionId: r.cartSession,
    currency,
  })
  setCidCookie(res, result.sessionId)
  res.status(200).json({
    data: {
      cart: result.cart,
      items: result.items,
      summary: result.summary,
    },
  })
})

// POST /cart/items
router.post(
  '/cart/items',
  optionalAuth,
  resolveCartIdentity,
  validate(addToCartBodySchema),
  async (req, res) => {
    const r = cartReq(req)
    const body = (req as Request & { body: z.infer<typeof addToCartBodySchema> })
      .body
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR'
    const result = await cartService.addToCart({
      userId: r.cartUserId,
      sessionId: r.cartSession,
      variantId: body.variantId,
      qty: body.qty,
      currency,
    })
    setCidCookie(res, result.sessionId)
    res.status(200).json({
      data: {
        cart: result.cart,
        items: result.items,
        summary: result.summary,
      },
    })
  },
)

// PATCH /cart/items/:variantId
router.patch(
  '/cart/items/:variantId',
  optionalAuth,
  resolveCartIdentity,
  validate(updateQtyBodySchema),
  async (req, res) => {
    const r = cartReq(req)
    const variantId = req.params.variantId as string
    const body = (req as Request & { body: z.infer<typeof updateQtyBodySchema> })
      .body
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR'
    const result = await cartService.updateCartItemQty({
      userId: r.cartUserId,
      sessionId: r.cartSession,
      variantId,
      qty: body.qty,
      currency,
    })
    setCidCookie(res, result.sessionId)
    res.status(200).json({
      data: {
        cart: result.cart,
        items: result.items,
        summary: result.summary,
      },
    })
  },
)

// DELETE /cart/items/:variantId
router.delete(
  '/cart/items/:variantId',
  optionalAuth,
  resolveCartIdentity,
  async (req, res) => {
    const r = cartReq(req)
    const variantId = req.params.variantId as string
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR'
    const result = await cartService.removeFromCart({
      userId: r.cartUserId,
      sessionId: r.cartSession,
      variantId,
      currency,
    })
    setCidCookie(res, result.sessionId)
    res.status(200).json({
      data: {
        cart: result.cart,
        items: result.items,
        summary: result.summary,
      },
    })
  },
)

// DELETE /cart
router.delete('/cart', optionalAuth, resolveCartIdentity, async (req, res) => {
  const r = cartReq(req)
  const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR'
  const result = await cartService.clearCart({
    userId: r.cartUserId,
    sessionId: r.cartSession,
    currency,
  })
  setCidCookie(res, result.sessionId)
  res.status(200).json({
    data: {
      cart: result.cart,
      items: result.items,
      summary: result.summary,
    },
  })
})

export const cartRoutes: IRouter = router
