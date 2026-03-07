"use strict";
/**
 * IAM route handlers — Express Router, Zod validation, rate limits, cookies.
 * Success: { data: T }. Errors via global handler (AppError) or validate middleware.
 */
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || (function () {
    var ownKeys = function(o) {
        ownKeys = Object.getOwnPropertyNames || function (o) {
            var ar = [];
            for (var k in o) if (Object.prototype.hasOwnProperty.call(o, k)) ar[ar.length] = k;
            return ar;
        };
        return ownKeys(o);
    };
    return function (mod) {
        if (mod && mod.__esModule) return mod;
        var result = {};
        if (mod != null) for (var k = ownKeys(mod), i = 0; i < k.length; i++) if (k[i] !== "default") __createBinding(result, mod, k[i]);
        __setModuleDefault(result, mod);
        return result;
    };
})();
Object.defineProperty(exports, "__esModule", { value: true });
exports.iamRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const rateLimit_1 = require("../../middleware/rateLimit");
const auth_1 = require("../../middleware/auth");
const cart_1 = require("../cart");
const iamService = __importStar(require("./iam.service"));
const router = (0, express_1.Router)();
// Cookie helpers
const CUSTOMER_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
};
const ADMIN_COOKIE_OPTIONS = {
    ...CUSTOMER_COOKIE_OPTIONS,
    sameSite: 'strict',
    path: '/admin',
};
// —— Customer auth ——
const signupSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
    newsletterOptIn: zod_1.z.boolean().optional().default(false),
});
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
router.post('/auth/signup', rateLimit_1.rateLimitSignup, (0, validate_1.validate)(signupSchema), async (req, res) => {
    const body = req.body;
    const { user, sessionId } = await iamService.signup(body);
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge: 7 * 24 * 60 * 60 * 1000 });
    res.status(201).json({ data: { user } });
});
const loginSchema = zod_1.z.object({
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(1),
    rememberMe: zod_1.z.boolean().optional().default(false),
});
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
router.post('/auth/login', rateLimit_1.rateLimitAuth, (0, validate_1.validate)(loginSchema), async (req, res) => {
    const body = req.body;
    const { user, sessionId } = await iamService.login(body);
    const maxAge = body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge });
    try {
        const mergeResult = await (0, cart_1.mergeCartsOnLogin)({
            userId: user.id,
            guestSessionId: req.cookies?.cid ?? '',
        });
        if (mergeResult) {
            res.cookie('cid', mergeResult.sessionId, {
                httpOnly: true,
                secure: process.env.NODE_ENV === 'production',
                sameSite: 'lax',
                maxAge: 21 * 24 * 60 * 60 * 1000,
                path: '/',
            });
        }
    }
    catch (err) {
        console.error('Cart merge on login failed', err);
    }
    res.status(200).json({ data: { user } });
});
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
router.post('/auth/logout', async (req, res) => {
    const sid = req.cookies?.sid;
    if (sid)
        await iamService.logout({ sessionId: sid });
    res.clearCookie('sid', { path: '/' });
    res.status(200).json({ data: { ok: true } });
});
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
router.get('/me', auth_1.requireAuth, async (req, res) => {
    const user = await iamService.getMe({ userId: req.user.id });
    res.status(200).json({ data: { user } });
});
const updateMeSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100).optional(),
    lastName: zod_1.z.string().min(1).max(100).optional(),
    dob: zod_1.z.string().optional(),
    dobConsent: zod_1.z.boolean().optional(),
    newsletterOptIn: zod_1.z.boolean().optional(),
});
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
router.patch('/me', auth_1.requireAuth, (0, validate_1.validate)(updateMeSchema), async (req, res) => {
    const body = req.body;
    const user = await iamService.updateMe({ userId: req.user.id, data: body });
    res.status(200).json({ data: { user } });
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(100),
});
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
router.patch('/me/password', auth_1.requireAuth, (0, validate_1.validate)(changePasswordSchema), async (req, res) => {
    const body = req.body;
    const { sessionId } = await iamService.changePassword({
        userId: req.user.id,
        currentPassword: body.currentPassword,
        newPassword: body.newPassword,
    });
    res.clearCookie('sid', { path: '/' });
    res.cookie('sid', sessionId, { ...CUSTOMER_COOKIE_OPTIONS, maxAge: 24 * 60 * 60 * 1000 });
    res.status(200).json({ data: { ok: true } });
});
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
router.get('/me/addresses', auth_1.requireAuth, async (req, res) => {
    const addresses = await iamService.listSavedAddressesForUser({ userId: req.user.id });
    res.status(200).json({ data: { addresses } });
});
const createAddressSchema = zod_1.z.object({
    label: zod_1.z.string().optional(),
    addressJson: zod_1.z.record(zod_1.z.unknown()),
    countryCode: zod_1.z.string().length(2),
    isDefault: zod_1.z.boolean().optional().default(false),
});
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
router.post('/me/addresses', auth_1.requireAuth, (0, validate_1.validate)(createAddressSchema), async (req, res) => {
    const body = req.body;
    const address = await iamService.createSavedAddressForUser({
        userId: req.user.id,
        ...body,
    });
    res.status(201).json({ data: { address } });
});
const updateAddressSchema = createAddressSchema.partial();
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
router.patch('/me/addresses/:addressId', auth_1.requireAuth, (0, validate_1.validate)(updateAddressSchema), async (req, res) => {
    const body = req.body;
    const address = await iamService.updateSavedAddressForUser({
        id: req.params.addressId,
        userId: req.user.id,
        data: body,
    });
    res.status(200).json({ data: { address } });
});
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
router.delete('/me/addresses/:addressId', auth_1.requireAuth, async (req, res) => {
    await iamService.deleteSavedAddressForUser({
        id: req.params.addressId,
        userId: req.user.id,
    });
    res.status(200).json({ data: { ok: true } });
});
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
router.get('/me/payment-methods', auth_1.requireAuth, async (req, res) => {
    const paymentMethods = await iamService.listSavedPaymentMethodsForUser({
        userId: req.user.id,
    });
    res.status(200).json({ data: { paymentMethods } });
});
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
router.delete('/me/payment-methods/:methodId', auth_1.requireAuth, async (req, res) => {
    await iamService.deleteSavedPaymentMethodForUser({
        id: req.params.methodId,
        userId: req.user.id,
    });
    res.status(200).json({ data: { ok: true } });
});
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
router.post('/admin/auth/login', rateLimit_1.rateLimitAdminAuth, (0, validate_1.validate)(zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) })), async (req, res) => {
    const body = req.body;
    const { user, admin, sessionId } = await iamService.adminLogin(body);
    res.cookie('sid', sessionId, {
        ...ADMIN_COOKIE_OPTIONS,
        maxAge: 8 * 60 * 60 * 1000,
    });
    res.status(200).json({ data: { user, admin } });
});
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
router.post('/admin/auth/logout', auth_1.requireAdmin, async (req, res) => {
    const sid = req.cookies?.sid;
    if (sid)
        await iamService.adminLogout({ sessionId: sid });
    res.clearCookie('sid', { path: '/admin' });
    res.status(200).json({ data: { ok: true } });
});
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
router.get('/admin/me', auth_1.requireAdmin, async (req, res) => {
    res.status(200).json({ data: { user: req.user, admin: req.admin } });
});
// —— Admin management (OWNER only) ——
const createInviteSchema = zod_1.z.object({ email: zod_1.z.string().email() });
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
router.post('/admin/invites', auth_1.requireOwner, rateLimit_1.rateLimitAdminInvites, (0, validate_1.validate)(createInviteSchema), async (req, res) => {
    const body = req.body;
    const { invite, rawToken } = await iamService.createAdminInviteForOwner({
        email: body.email,
        createdByAdminId: req.admin.id,
    });
    const data = process.env.NODE_ENV !== 'production'
        ? { invite: { ...invite, rawToken } }
        : { invite };
    res.status(201).json({ data });
});
const acceptInviteSchema = zod_1.z.object({
    token: zod_1.z.string().min(1),
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    password: zod_1.z.string().min(8).max(100),
});
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
router.post('/admin/invites/accept', rateLimit_1.rateLimitAcceptInvite, (0, validate_1.validate)(acceptInviteSchema), async (req, res) => {
    const body = req.body;
    const { user, admin } = await iamService.acceptAdminInvite({
        rawToken: body.token,
        firstName: body.firstName,
        lastName: body.lastName,
        password: body.password,
    });
    res.status(200).json({ data: { user, admin } });
});
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
router.get('/admin/admins', auth_1.requireAdmin, async (_req, res) => {
    const admins = await iamService.listAdminsForOwner();
    res.status(200).json({ data: { admins } });
});
const updateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'OWNER']),
});
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
router.patch('/admin/admins/:adminId/role', auth_1.requireOwner, (0, validate_1.validate)(updateRoleSchema), async (req, res) => {
    const body = req.body;
    const admin = await iamService.updateAdminRoleForOwner({
        targetAdminId: req.params.adminId,
        role: body.role,
        requestingAdminId: req.admin.id,
    });
    res.status(200).json({ data: { admin } });
});
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
router.post('/admin/admins/:adminId/suspend', auth_1.requireOwner, async (req, res) => {
    await iamService.suspendAdminForOwner({
        targetAdminId: req.params.adminId,
        requestingAdminId: req.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
exports.iamRoutes = router;
//# sourceMappingURL=iam.routes.js.map