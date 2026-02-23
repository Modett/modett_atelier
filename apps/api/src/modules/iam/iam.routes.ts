/**
 * IAM route handlers — Express Router, Zod validation, rate limits, cookies.
 * Success: { data: T }. Errors via global handler (AppError) or validate middleware.
 */

import { Router, type Request, type Response } from 'express'
import { z } from 'zod'
import { validate } from '../../middleware/validate'
import {
  rateLimitSignup,
  rateLimitAuth,
  rateLimitAdminAuth,
  rateLimitAdminInvites,
  rateLimitAcceptInvite,
} from '../../middleware/rateLimit'
import { requireAuth, requireAdmin, requireOwner } from '../../middleware/auth'
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

// —— Customer auth ——

const signupSchema = z.object({
  firstName: z.string().min(1).max(100),
  lastName: z.string().min(1).max(100),
  email: z.string().email(),
  password: z.string().min(8).max(100),
  newsletterOptIn: z.boolean().optional().default(false),
})

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

router.post(
  '/auth/login',
  rateLimitAuth,
  validate(loginSchema),
  async (req: Request, res: Response) => {
    const body = (req as { body: z.infer<typeof loginSchema> }).body
    const { user, sessionId } = await iamService.login(body)
    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge })
    res.status(200).json({ data: { user } })
  },
)

router.post('/auth/logout', async (req: Request, res: Response) => {
  const sid = req.cookies?.sid
  if (sid) await iamService.logout({ sessionId: sid })
  res.clearCookie('sid', { path: '/' })
  res.status(200).json({ data: { ok: true } })
})

// —— Me (requireAuth) ——

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

router.get('/me/payment-methods', requireAuth, async (req: AuthRequest, res: Response) => {
  const paymentMethods = await iamService.listSavedPaymentMethodsForUser({
    userId: req.user!.id,
  })
  res.status(200).json({ data: { paymentMethods } })
})

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

router.post('/admin/auth/logout', requireAdmin, async (req: AdminRequest, res: Response) => {
  const sid = req.cookies?.sid
  if (sid) await iamService.adminLogout({ sessionId: sid })
  res.clearCookie('sid', { path: '/admin' })
  res.status(200).json({ data: { ok: true } })
})

router.get('/admin/me', requireAdmin, async (req: AdminRequest, res: Response) => {
  res.status(200).json({ data: { user: req.user, admin: req.admin } })
})

// —— Admin management (OWNER only) ——

const createInviteSchema = z.object({ email: z.string().email() })

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

router.get('/admin/admins', requireAdmin, async (_req: Request, res: Response) => {
  const admins = await iamService.listAdminsForOwner()
  res.status(200).json({ data: { admins } })
})

const updateRoleSchema = z.object({
  role: z.enum(['ADMIN', 'OWNER']),
})

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

export const iamRoutes = router
