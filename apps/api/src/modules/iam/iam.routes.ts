/**
 * IAM route handlers — Express Router, Zod validation, rate limits, cookies.
 * Success: { data: T }. Errors via global handler (AppError) or validate middleware.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { validate, validateQuery } from '../../middleware/validate'
import {
  rateLimit,
  rateLimitSignup,
  rateLimitAuth,
  rateLimitAdminAuth,
  rateLimitAdminInvites,
  rateLimitAcceptInvite,
} from '../../middleware/rateLimit'
import { optionalAuth, requireAuth, requireAdmin, requireOwner } from '../../middleware/auth'
import type { AdminRequest as StrictAdminRequest } from '../../middleware/auth'
import { mergeCartsOnLogin } from '../cart'
import {
  crossOriginCookieAttributes,
  clearSidCookie,
  setCidCookie,
} from '../../lib/crossOriginCookies'
import * as iamService from './iam.service'
import {
  listAdminAuditLogs,
  getAdminById,
  getUserById,
  type AdminAuditLogListRow,
} from '@modett/db'
import { writeAuditLog } from '../../middleware/audit'

const router = Router()

const _cookieBase = crossOriginCookieAttributes()
const CUSTOMER_COOKIE_OPTIONS = {
  ..._cookieBase,
  path: '/' as const,
}
/** Prefix of mounted admin routes (`/api` + `/admin/...`); wrong path omits `sid` on fetch → 401. */
const ADMIN_COOKIE_OPTIONS = {
  ..._cookieBase,
  path: '/api/admin' as const,
}

/** Loose shapes so handlers type-check with Express; use StrictAdminRequest for audit helper. */
type IamAuthRequest = Request & { user?: { id: string }; sessionId?: string }
type IamAdminRequest = Request & {
  user?: { id: string }
  admin?: { id: string; role: string }
  sessionId?: string
}

const storefrontCurrencySchema = z.enum(['LKR', 'SGD', 'USD'])

function storefrontCurrencyFromRequest(req: Request): z.infer<typeof storefrontCurrencySchema> {
  const raw =
    (req.query.currency as string | undefined) ?? req.cookies?.currency ?? 'LKR'
  const parsed = storefrontCurrencySchema.safeParse(raw)
  return parsed.success ? parsed.data : 'LKR'
}

// —— Check email (checkout flow) ——

const checkEmailQuerySchema = z.object({
  email: z.string().email(),
})

router.get(
  '/auth/check-email',
  rateLimit({
    name: 'auth-check-email',
    windowMs: 15 * 60 * 1000,
    max: 20,
    key: (req) => req.ip ?? 'unknown',
  }),
  validateQuery(checkEmailQuerySchema),
  async (req: Request, res: Response) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof checkEmailQuerySchema> }).validatedQuery
    const exists = await iamService.checkEmailExists({ email: query.email })
    res.status(200).json({ data: { exists } })
  },
)

// —— Customer auth ——

const signupSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  newsletterOptIn: z.boolean().optional().default(false),
})

/**
 * @swagger
 * /auth/signup:
 *   post:
 *     tags: [Auth]
 *     summary: Register a new customer account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [firstName, lastName, email, password]
 *             properties:
 *               firstName:      { type: string, example: Kumudika }
 *               lastName:       { type: string, example: Jayawardena }
 *               email:          { type: string, format: email }
 *               password:       { type: string, minLength: 8, example: MyPassword123 }
 *               newsletterOptIn: { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Account created successfully
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       400: { description: Validation error, schema: { $ref: '#/components/schemas/ErrorResponse' } }
 *       409: { description: Email already registered }
 */
router.post(
  '/auth/signup',
  rateLimitSignup,
  validate(signupSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof signupSchema> }).body
    const { user, sessionId } = await iamService.signup(body)
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 })
    res.status(201).json({ data: { user } })
  },
)

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
  rememberMe: z.boolean().optional().default(false),
})

/**
 * @swagger
 * /auth/login:
 *   post:
 *     tags: [Auth]
 *     summary: Log in as a customer
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:      { type: string, format: email }
 *               password:   { type: string }
 *               rememberMe: { type: boolean, default: false }
 *     responses:
 *       200:
 *         description: Login successful. Sets sid cookie.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401: { description: Invalid credentials }
 */
router.post(
  '/auth/login',
  rateLimitAuth,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof loginSchema> }).body
    const { user, sessionId } = await iamService.login(body)
    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge })
    try {
      const mergeResult = await mergeCartsOnLogin({
        userId: user.id,
        guestSessionId: req.cookies?.cid ?? '',
      })
      if (mergeResult) {
        setCidCookie(res, mergeResult.sessionId)
      }
    } catch (err) {
      console.error('Cart merge on login failed', err)
    }
    res.status(200).json({ data: { user } })
  },
)

const forgotPasswordSchema = z.object({
  email: z.string().email(),
})

router.post(
  '/auth/forgot-password',
  rateLimit({
    name: 'auth-forgot-password',
    windowMs: 15 * 60 * 1000,
    max: 5,
    key: (req) => req.ip ?? 'unknown',
  }),
  validate(forgotPasswordSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof forgotPasswordSchema> }).body
    await iamService.requestPasswordReset({ email: body.email })
    res.status(200).json({ data: { ok: true } })
  },
)

const resetPasswordSchema = z.object({
  token: z.string().min(1),
  password: z.string().min(8).max(100),
})

router.post(
  '/auth/reset-password',
  rateLimit({
    name: 'auth-reset-password',
    windowMs: 15 * 60 * 1000,
    max: 10,
    key: (req) => req.ip ?? 'unknown',
  }),
  validate(resetPasswordSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof resetPasswordSchema> }).body
    await iamService.completePasswordReset({
      token: body.token,
      password: body.password,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

/**
 * @swagger
 * /auth/logout:
 *   post:
 *     tags: [Auth]
 *     summary: Log out the current customer session
 *     security: []
 *     responses:
 *       200: { description: Logged out. Clears sid cookie. }
 */
router.post('/auth/logout', async (req: Request, res: Response) => {
  const sid = req.cookies?.sid
  if (sid) await iamService.logout({ sessionId: sid })
  clearSidCookie(res, '/')
  res.status(200).json({ data: { ok: true } })
})

/**
 * Guest-safe session probe — always 200. Avoids 401 noise for logged-out users
 * (GET /me requires auth). Same cookies as /me; use for storefront session UI.
 */
router.get(
  '/auth/session',
  rateLimit({
    name:       'auth-session',
    windowMs:   60 * 1000,
    max:        120,
    key:        (req) => req.ip ?? 'unknown',
  }),
  optionalAuth,
  async (req: Request, res: Response) => {
    const user = (req as { user?: { id: string } }).user
    if (!user?.id) {
      res.status(200).json({ data: { user: null } })
      return
    }
    const profile = await iamService.getMe({ userId: user.id })
    res.status(200).json({ data: { user: profile } })
  },
)

// —— Me (requireAuth) ——

/**
 * @swagger
 * /me:
 *   get:
 *     tags: [Me]
 *     summary: Get current customer profile
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Current user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 */
router.get('/me', requireAuth, async (req: IamAuthRequest, res: Response) => {
  const user = await iamService.getMe({ userId: req.user!.id })
  res.status(200).json({ data: { user } })
})

const updateMeSchema = z.object({
  firstName: z.string().min(1).max(100).optional(),
  lastName: z.string().min(1).max(100).optional(),
  dob: z.string().optional(),
  dobConsent: z.boolean().optional(),
  newsletterOptIn: z.boolean().optional(),
})

/**
 * @swagger
 * /me:
 *   patch:
 *     tags: [Me]
 *     summary: Update current customer profile
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               firstName:      { type: string }
 *               lastName:       { type: string }
 *               dob:            { type: string, format: date, example: '1995-06-15' }
 *               dobConsent:     { type: boolean }
 *               newsletterOptIn: { type: boolean }
 *     responses:
 *       200:
 *         description: Profile updated
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user: { $ref: '#/components/schemas/User' }
 *       401: { description: Not authenticated }
 */
router.patch(
  '/me',
  requireAuth,
  validate(updateMeSchema),
  async (req: IamAuthRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof updateMeSchema> }).body
    const user = await iamService.updateMe({ userId: req.user!.id, data: body })
    res.status(200).json({ data: { user } })
  },
)

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

/**
 * @swagger
 * /me/password:
 *   patch:
 *     tags: [Me]
 *     summary: Change password (invalidates all existing sessions)
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [currentPassword, newPassword]
 *             properties:
 *               currentPassword: { type: string }
 *               newPassword:     { type: string, minLength: 8 }
 *     responses:
 *       200: { description: Password changed. New session cookie set. }
 *       401: { description: Current password incorrect }
 */
router.patch(
  '/me/password',
  requireAuth,
  validate(changePasswordSchema),
  async (req: IamAuthRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof changePasswordSchema> }).body
    const { sessionId } = await iamService.changePassword({
      userId: req.user!.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    })
    clearSidCookie(res, '/')
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge: 24 * 60 * 60 * 1000 })
    res.status(200).json({ data: { ok: true } })
  },
)

/**
 * @swagger
 * /me/addresses:
 *   get:
 *     tags: [Me]
 *     summary: List saved addresses
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: List of saved addresses
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     addresses:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/SavedAddress' }
 */
router.get('/me/addresses', requireAuth, async (req: IamAuthRequest, res: Response) => {
  const addresses = await iamService.listSavedAddressesForUser({ userId: req.user!.id })
  res.status(200).json({ data: { addresses } })
})

const createAddressSchema = z.object({
  label: z.string().optional(),
  addressJson: z.record(z.unknown()),
  countryCode: z.string().length(2),
  isDefault: z.boolean().optional().default(false),
})

/**
 * @swagger
 * /me/addresses:
 *   post:
 *     tags: [Me]
 *     summary: Add a saved address
 *     security: [{ cookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [addressJson, countryCode]
 *             properties:
 *               label:       { type: string, example: Home }
 *               addressJson: { type: object }
 *               countryCode: { type: string, example: LK }
 *               isDefault:   { type: boolean, default: false }
 *     responses:
 *       201:
 *         description: Address created
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     address: { $ref: '#/components/schemas/SavedAddress' }
 */
router.post(
  '/me/addresses',
  requireAuth,
  validate(createAddressSchema),
  async (req: IamAuthRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof createAddressSchema> }).body
    const address = await iamService.createSavedAddressForUser({
      userId: req.user!.id,
      ...body,
    })
    res.status(201).json({ data: { address } })
  },
)

const updateAddressSchema = createAddressSchema.partial()

/**
 * @swagger
 * /me/addresses/{addressId}:
 *   patch:
 *     tags: [Me]
 *     summary: Update a saved address
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             properties:
 *               label:       { type: string }
 *               addressJson: { type: object }
 *               countryCode: { type: string }
 *               isDefault:   { type: boolean }
 *     responses:
 *       200: { description: Address updated }
 *       404: { description: Address not found }
 */
router.patch(
  '/me/addresses/:addressId',
  requireAuth,
  validate(updateAddressSchema),
  async (req: IamAuthRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof updateAddressSchema> }).body
    const address = await iamService.updateSavedAddressForUser({
      id: req.params.addressId!,
      userId: req.user!.id,
      data: body,
    })
    res.status(200).json({ data: { address } })
  },
)

/**
 * @swagger
 * /me/addresses/{addressId}:
 *   delete:
 *     tags: [Me]
 *     summary: Delete a saved address
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: addressId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Address deleted }
 */
router.delete(
  '/me/addresses/:addressId',
  requireAuth,
  async (req: IamAuthRequest, res: Response) => {
    await iamService.deleteSavedAddressForUser({
      id: req.params.addressId!,
      userId: req.user!.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Wishlist ——

router.get('/me/wishlist', requireAuth, async (req: IamAuthRequest, res: Response) => {
  const currency = storefrontCurrencyFromRequest(req)
  const wishlist = await iamService.getWishlist({
    userId: req.user!.id,
    currency,
  })
  res.status(200).json({ data: { wishlist } })
})

router.post(
  '/me/wishlist/:productId',
  requireAuth,
  async (req: IamAuthRequest, res: Response) => {
    const { productId } = req.params as { productId: string }
    const item = await iamService.wishlistAdd({
      userId: req.user!.id,
      productId,
    })
    res.status(201).json({ data: { item } })
  },
)

router.delete(
  '/me/wishlist/:productId',
  requireAuth,
  async (req: IamAuthRequest, res: Response) => {
    const { productId } = req.params as { productId: string }
    await iamService.wishlistRemove({
      userId: req.user!.id,
      productId,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

/**
 * @swagger
 * /me/payment-methods:
 *   get:
 *     tags: [Me]
 *     summary: List saved payment methods
 *     security: [{ cookieAuth: [] }]
 *     responses:
 *       200:
 *         description: List of saved payment methods
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     paymentMethods:
 *                       type: array
 *                       items: { $ref: '#/components/schemas/SavedPaymentMethod' }
 */
router.get('/me/payment-methods', requireAuth, async (req: IamAuthRequest, res: Response) => {
  const paymentMethods = await iamService.listSavedPaymentMethodsForUser({
    userId: req.user!.id,
  })
  res.status(200).json({ data: { paymentMethods } })
})

/**
 * @swagger
 * /me/payment-methods/{methodId}:
 *   delete:
 *     tags: [Me]
 *     summary: Remove a saved payment method
 *     security: [{ cookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Payment method removed }
 */
router.delete(
  '/me/payment-methods/:methodId',
  requireAuth,
  async (req: IamAuthRequest, res: Response) => {
    await iamService.deleteSavedPaymentMethodForUser({
      id: req.params.methodId!,
      userId: req.user!.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin auth ——

/**
 * @swagger
 * /admin/auth/login:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Log in as an admin
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email, password]
 *             properties:
 *               email:    { type: string, format: email }
 *               password: { type: string }
 *     responses:
 *       200:
 *         description: Login successful. Sets admin sid cookie (Path=/api/admin, cross-origin attrs in production).
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:  { $ref: '#/components/schemas/User' }
 *                     admin: { $ref: '#/components/schemas/Admin' }
 *       401: { description: Invalid credentials }
 *       403: { description: Not an admin / suspended / invite not accepted }
 */
router.post(
  '/admin/auth/login',
  rateLimitAdminAuth,
  validate(z.object({ email: z.string().email(), password: z.string().min(1) })),
  async (req: Request, res: Response) => {
    const body = (req as { body: { email: string; password: string } }).body
    const { user, admin, sessionId } = await iamService.adminLogin(body)
    res.cookie('sid', sessionId, {
      ...ADMIN_COOKIE_OPTIONS,
      maxAge: 8 * 60 * 60 * 1000,
    })
    res.status(200).json({ data: { user, admin } })
  },
)

/**
 * @swagger
 * /admin/auth/logout:
 *   post:
 *     tags: [Admin Auth]
 *     summary: Log out the current admin session
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200: { description: Logged out }
 */
router.post('/admin/auth/logout', requireAdmin, async (req: IamAdminRequest, res: Response) => {
  const sid = req.cookies?.sid
  if (sid) await iamService.adminLogout({ sessionId: sid })
  clearSidCookie(res, '/api/admin')
  res.status(200).json({ data: { ok: true } })
})

/**
 * @swagger
 * /admin/me:
 *   get:
 *     tags: [Admin Auth]
 *     summary: Get current admin profile
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200:
 *         description: Current admin and user profile
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:  { $ref: '#/components/schemas/User' }
 *                     admin: { $ref: '#/components/schemas/Admin' }
 */
router.get('/admin/me', requireAdmin, async (req: IamAdminRequest, res: Response) => {
  res.status(200).json({ data: { user: req.user, admin: req.admin } })
})

const adminPatchMeSchema = z
  .object({
    firstName: z.string().min(1).max(100).optional(),
    lastName: z.string().min(1).max(100).optional(),
  })
  .refine((b) => b.firstName != null || b.lastName != null, {
    message: 'At least one of firstName, lastName is required',
  })

router.patch(
  '/admin/me',
  requireAdmin,
  validate(adminPatchMeSchema),
  async (req: IamAdminRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof adminPatchMeSchema> }).body
    const user = await iamService.updateAdminSelfProfile({
      userId: req.user!.id,
      firstName: body.firstName,
      lastName: body.lastName,
    })
    res.status(200).json({ data: { user, admin: req.admin } })
  },
)

const adminChangePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(8).max(100),
})

router.post(
  '/admin/auth/change-password',
  requireAdmin,
  validate(adminChangePasswordSchema),
  async (req: IamAdminRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof adminChangePasswordSchema> }).body
    await iamService.adminChangePassword({
      userId: req.user!.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

// —— Admin management (OWNER only) ——

const createInviteSchema = z.object({
  email: z.string().email(),
  role: z.enum(['ADMIN', 'OWNER']).default('ADMIN'),
})

/**
 * @swagger
 * /admin/invites:
 *   post:
 *     tags: [Admin Management]
 *     summary: Send an admin invite (OWNER only)
 *     security: [{ adminCookieAuth: [] }]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [email]
 *             properties:
 *               email: { type: string, format: email }
 *     responses:
 *       201:
 *         description: Invite created. In development, rawToken is included in response.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     invite:   { $ref: '#/components/schemas/AdminInvite' }
 *                     rawToken: { type: string, description: 'Dev only — not present in production' }
 *       403: { description: Not OWNER }
 */
router.post(
  '/admin/invites',
  requireOwner,
  rateLimitAdminInvites,
  validate(createInviteSchema),
  async (req: IamAdminRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof createInviteSchema> }).body
    const { invite } = await iamService.createAdminInviteForOwner({
      email: body.email,
      role: body.role,
      createdByAdminId: req.admin!.id,
    })
    void writeAuditLog({
      req: req as StrictAdminRequest,
      action: 'INVITE_ADMIN',
      entityType: 'admin_invite',
      entityId: invite.id,
      entityLabel: invite.email,
      beforeJson: null,
      afterJson: { email: invite.email, role: invite.role },
    })
    res.status(201).json({ data: { invite } })
  },
)

const acceptInviteSchema = z.object({
  token: z.string().min(1),
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  password: z.string().min(8).max(100),
})

/**
 * @swagger
 * /admin/invites/accept:
 *   post:
 *     tags: [Admin Management]
 *     summary: Accept an admin invite and set up account
 *     security: []
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [token, firstName, lastName, password]
 *             properties:
 *               token:     { type: string }
 *               firstName: { type: string }
 *               lastName:  { type: string }
 *               password:  { type: string, minLength: 8 }
 *     responses:
 *       200:
 *         description: Invite accepted. Account activated.
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     user:  { $ref: '#/components/schemas/User' }
 *                     admin: { $ref: '#/components/schemas/Admin' }
 *       400: { description: Invalid or expired token }
 */
router.post(
  '/admin/invites/accept',
  rateLimitAcceptInvite,
  validate(acceptInviteSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof acceptInviteSchema> }).body
    const { user, admin, sessionId } = await iamService.acceptAdminInvite({
      rawToken: body.token,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
    })
    res.cookie('sid', sessionId, {
      ...ADMIN_COOKIE_OPTIONS,
      maxAge: 8 * 60 * 60 * 1000,
    })
    res.status(200).json({ data: { user, admin } })
  },
)

/**
 * @swagger
 * /admin/admins:
 *   get:
 *     tags: [Admin Management]
 *     summary: List all admins
 *     security: [{ adminCookieAuth: [] }]
 *     responses:
 *       200:
 *         description: List of all admins with user info
 *         content:
 *           application/json:
 *             schema:
 *               type: object
 *               properties:
 *                 data:
 *                   type: object
 *                   properties:
 *                     admins:
 *                       type: array
 *                       items:
 *                         allOf:
 *                           - { $ref: '#/components/schemas/Admin' }
 *                           - type: object
 *                             properties:
 *                               user: { $ref: '#/components/schemas/User' }
 */
const auditLogQuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(50),
  adminId: z.string().uuid().optional(),
  action: z.string().min(1).optional(),
  entityType: z.string().min(1).optional(),
  entityId: z.string().min(1).optional(),
  from: z.string().optional(),
  to: z.string().optional(),
})

router.get(
  '/admin/audit-log',
  requireAdmin,
  validateQuery(auditLogQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof auditLogQuerySchema> })
      .validatedQuery
    const from =
      q.from != null && q.from.trim() !== '' ? new Date(q.from) : undefined
    const to = q.to != null && q.to.trim() !== '' ? new Date(q.to) : undefined
    if (from != null && Number.isNaN(from.getTime())) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid from date' },
      })
      return
    }
    if (to != null && Number.isNaN(to.getTime())) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid to date' },
      })
      return
    }
    const { logs, total } = await listAdminAuditLogs({
      page: q.page,
      limit: q.limit,
      adminId: q.adminId,
      action: q.action,
      entityType: q.entityType,
      entityId: q.entityId,
      from,
      to,
    })
    res.status(200).json({
      data: {
        logs: logs.map((l: AdminAuditLogListRow) => ({
          id: l.id,
          adminId: l.admin_id,
          adminEmail: l.admin_email,
          adminRole: l.admin_role,
          currentRole: l.current_role,
          action: l.action,
          entityType: l.entity_type,
          entityId: l.entity_id,
          entityLabel: l.entity_label,
          beforeJson: l.before_json,
          afterJson: l.after_json,
          ipAddress: l.ip_address,
          createdAt:
            l.created_at instanceof Date
              ? l.created_at.toISOString()
              : String(l.created_at),
        })),
        total,
        page: q.page,
        limit: q.limit,
      },
    })
  },
)

router.get('/admin/invites', requireAdmin, async (_req: Request, res: Response) => {
  const invites = await iamService.listPendingAdminInvitesForAdmin()
  res.status(200).json({ data: { invites } })
})

router.get('/admin/admins', requireAdmin, async (_req: Request, res: Response) => {
  const admins = await iamService.listAdminsForOwner()
  res.status(200).json({ data: { admins } })
})

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'OWNER']),
})

/**
 * @swagger
 * /admin/admins/{adminId}/role:
 *   patch:
 *     tags: [Admin Management]
 *     summary: Update an admin's role (OWNER only)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [role]
 *             properties:
 *               role: { type: string, enum: [ADMIN, OWNER] }
 *     responses:
 *       200: { description: Role updated }
 *       400: { description: Cannot modify own role }
 *       403: { description: Not OWNER }
 *       404: { description: Admin not found }
 */
router.patch(
  '/admin/admins/:adminId/role',
  requireOwner,
  validate(updateRoleSchema),
  async (req: IamAdminRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof updateRoleSchema> }).body
    const targetId = req.params.adminId!
    const beforeAdmin = await getAdminById({ id: targetId })
    const beforeUser =
      beforeAdmin != null ? await getUserById({ id: beforeAdmin.userId }) : null
    const admin = await iamService.updateAdminRoleForOwner({
      targetAdminId: targetId,
      role: body.role,
      requestingAdminId: req.admin!.id,
    })
    void writeAuditLog({
      req: req as StrictAdminRequest,
      action: 'CHANGE_ROLE',
      entityType: 'admin',
      entityId: targetId,
      entityLabel: beforeUser?.email ?? targetId,
      beforeJson: beforeAdmin != null ? { role: beforeAdmin.role } : null,
      afterJson: { role: body.role },
    })
    res.status(200).json({ data: { admin } })
  },
)

/**
 * @swagger
 * /admin/admins/{adminId}/suspend:
 *   post:
 *     tags: [Admin Management]
 *     summary: Suspend an admin account (OWNER only)
 *     security: [{ adminCookieAuth: [] }]
 *     parameters:
 *       - in: path
 *         name: adminId
 *         required: true
 *         schema: { type: string, format: uuid }
 *     responses:
 *       200: { description: Admin suspended. All active sessions invalidated. }
 *       400: { description: Cannot suspend self }
 *       403: { description: Not OWNER }
 *       404: { description: Admin not found }
 */
router.post(
  '/admin/admins/:adminId/suspend',
  requireOwner,
  async (req: IamAdminRequest, res: Response) => {
    const targetId = req.params.adminId!
    const beforeAdmin = await getAdminById({ id: targetId })
    const beforeUser =
      beforeAdmin != null ? await getUserById({ id: beforeAdmin.userId }) : null
    await iamService.suspendAdminForOwner({
      targetAdminId: targetId,
      requestingAdminId: req.admin!.id,
    })
    void writeAuditLog({
      req: req as StrictAdminRequest,
      action: 'SUSPEND_ADMIN',
      entityType: 'admin',
      entityId: targetId,
      entityLabel: beforeUser?.email ?? targetId,
      beforeJson: beforeAdmin != null ? { status: beforeAdmin.status } : null,
      afterJson: { status: 'SUSPENDED' },
    })
    res.status(200).json({ data: { ok: true } })
  },
)

router.post(
  '/admin/admins/:adminId/reinstate',
  requireOwner,
  async (req: IamAdminRequest, res: Response) => {
    await iamService.reinstateAdminForOwner({
      targetAdminId: req.params.adminId!,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

router.delete(
  '/admin/admins/:adminId',
  requireOwner,
  async (req: IamAdminRequest, res: Response) => {
    await iamService.suspendAdminForOwner({
      targetAdminId: req.params.adminId!,
      requestingAdminId: req.admin!.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

router.post(
  '/admin/invites/:inviteId/resend',
  requireOwner,
  async (req: IamAdminRequest, res: Response) => {
    await iamService.resendAdminInviteForOwner({
      inviteId: req.params.inviteId!,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

router.delete(
  '/admin/invites/:inviteId',
  requireOwner,
  async (req: IamAdminRequest, res: Response) => {
    await iamService.cancelAdminInviteForOwner({
      inviteId: req.params.inviteId!,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

export const iamRoutes: IRouter = router
