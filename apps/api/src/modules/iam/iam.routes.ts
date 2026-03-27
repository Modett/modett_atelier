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
import { requireAuth, requireAdmin, requireOwner } from '../../middleware/auth'
import { mergeCartsOnLogin } from '../cart'
import * as iamService from './iam.service'

const router = Router()

// Cookie helpers
const CUSTOMER_COOKIE_OPTIONS = {
  httpOnly: true,
  secure: true,
  sameSite: 'lax' as const,
  path: '/',
}
const ADMIN_COOKIE_OPTIONS = {
  ...CUSTOMER_COOKIE_OPTIONS,
  sameSite: 'strict' as const,
  path: '/admin',
}

type AuthRequest = Request & { user?: { id: string }; sessionId?: string }
type AdminRequest = Request & {
  user?: { id: string }
  admin?: { id: string; role: string }
  sessionId?: string
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
        res.cookie('cid', mergeResult.sessionId, {
          httpOnly: true,
          secure: process.env.NODE_ENV === 'production',
          sameSite: 'lax',
          maxAge: 21 * 24 * 60 * 60 * 1000,
          path: '/',
        })
      }
    } catch (err) {
      console.error('Cart merge on login failed', err)
    }
    res.status(200).json({ data: { user } })
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
  res.clearCookie('sid', { path: '/' })
  res.status(200).json({ data: { ok: true } })
})

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
router.get('/me', requireAuth, async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof changePasswordSchema> }).body
    const { sessionId } = await iamService.changePassword({
      userId: req.user!.id,
      currentPassword: body.currentPassword,
      newPassword: body.newPassword,
    })
    res.clearCookie('sid', { path: '/' })
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
router.get('/me/addresses', requireAuth, async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
    await iamService.deleteSavedAddressForUser({
      id: req.params.addressId!,
      userId: req.user!.id,
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
router.get('/me/payment-methods', requireAuth, async (req: AuthRequest, res: Response) => {
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
  async (req: AuthRequest, res: Response) => {
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
 *         description: Login successful. Sets admin sid cookie (SameSite=Strict, Path=/admin).
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
router.post('/admin/auth/logout', requireAdmin, async (req: AdminRequest, res: Response) => {
  const sid = req.cookies?.sid
  if (sid) await iamService.adminLogout({ sessionId: sid })
  res.clearCookie('sid', { path: '/admin' })
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
router.get('/admin/me', requireAdmin, async (req: AdminRequest, res: Response) => {
  res.status(200).json({ data: { user: req.user, admin: req.admin } })
})

// —— Admin management (OWNER only) ——

const createInviteSchema = z.object({ email: z.string().email() })

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
  async (req: AdminRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof createInviteSchema> }).body
    const { invite, rawToken } = await iamService.createAdminInviteForOwner({
      email: body.email,
      createdByAdminId: req.admin!.id,
    })
    const data =
      process.env.NODE_ENV !== 'production'
        ? { invite: { ...invite, rawToken } }
        : { invite }
    res.status(201).json({ data })
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
    const { user, admin } = await iamService.acceptAdminInvite({
      rawToken: body.token,
      firstName: body.firstName,
      lastName: body.lastName,
      password: body.password,
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
  async (req: AdminRequest, res: Response) => {
    const body = (req as { body: z.infer<typeof updateRoleSchema> }).body
    const admin = await iamService.updateAdminRoleForOwner({
      targetAdminId: req.params.adminId!,
      role: body.role,
      requestingAdminId: req.admin!.id,
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
  async (req: AdminRequest, res: Response) => {
    await iamService.suspendAdminForOwner({
      targetAdminId: req.params.adminId!,
      requestingAdminId: req.admin!.id,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

export const iamRoutes: IRouter = router
