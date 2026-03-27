"use strict";
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
const checkEmailQuerySchema = zod_1.z.object({
    email: zod_1.z.string().email(),
});
router.get('/auth/check-email', (0, rateLimit_1.rateLimit)({
    name: 'auth-check-email',
    windowMs: 15 * 60 * 1000,
    max: 20,
    key: (req) => req.ip ?? 'unknown',
}), (0, validate_1.validateQuery)(checkEmailQuerySchema), async (req, res) => {
    const query = req.validatedQuery;
    const exists = await iamService.checkEmailExists({ email: query.email });
    res.status(200).json({ data: { exists } });
});
const signupSchema = zod_1.z.object({
    firstName: zod_1.z.string().min(1).max(100),
    lastName: zod_1.z.string().min(1).max(100),
    email: zod_1.z.string().email(),
    password: zod_1.z.string().min(8).max(100),
    newsletterOptIn: zod_1.z.boolean().optional().default(false),
});
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
router.post('/auth/logout', async (req, res) => {
    const sid = req.cookies?.sid;
    if (sid)
        await iamService.logout({ sessionId: sid });
    res.clearCookie('sid', { path: '/' });
    res.status(200).json({ data: { ok: true } });
});
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
router.patch('/me', auth_1.requireAuth, (0, validate_1.validate)(updateMeSchema), async (req, res) => {
    const body = req.body;
    const user = await iamService.updateMe({ userId: req.user.id, data: body });
    res.status(200).json({ data: { user } });
});
const changePasswordSchema = zod_1.z.object({
    currentPassword: zod_1.z.string().min(1),
    newPassword: zod_1.z.string().min(8).max(100),
});
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
router.post('/me/addresses', auth_1.requireAuth, (0, validate_1.validate)(createAddressSchema), async (req, res) => {
    const body = req.body;
    const address = await iamService.createSavedAddressForUser({
        userId: req.user.id,
        ...body,
    });
    res.status(201).json({ data: { address } });
});
const updateAddressSchema = createAddressSchema.partial();
router.patch('/me/addresses/:addressId', auth_1.requireAuth, (0, validate_1.validate)(updateAddressSchema), async (req, res) => {
    const body = req.body;
    const address = await iamService.updateSavedAddressForUser({
        id: req.params.addressId,
        userId: req.user.id,
        data: body,
    });
    res.status(200).json({ data: { address } });
});
router.delete('/me/addresses/:addressId', auth_1.requireAuth, async (req, res) => {
    await iamService.deleteSavedAddressForUser({
        id: req.params.addressId,
        userId: req.user.id,
    });
    res.status(200).json({ data: { ok: true } });
});
router.get('/me/payment-methods', auth_1.requireAuth, async (req, res) => {
    const paymentMethods = await iamService.listSavedPaymentMethodsForUser({
        userId: req.user.id,
    });
    res.status(200).json({ data: { paymentMethods } });
});
router.delete('/me/payment-methods/:methodId', auth_1.requireAuth, async (req, res) => {
    await iamService.deleteSavedPaymentMethodForUser({
        id: req.params.methodId,
        userId: req.user.id,
    });
    res.status(200).json({ data: { ok: true } });
});
router.post('/admin/auth/login', rateLimit_1.rateLimitAdminAuth, (0, validate_1.validate)(zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) })), async (req, res) => {
    const body = req.body;
    const { user, admin, sessionId } = await iamService.adminLogin(body);
    res.cookie('sid', sessionId, {
        ...ADMIN_COOKIE_OPTIONS,
        maxAge: 8 * 60 * 60 * 1000,
    });
    res.status(200).json({ data: { user, admin } });
});
router.post('/admin/auth/logout', auth_1.requireAdmin, async (req, res) => {
    const sid = req.cookies?.sid;
    if (sid)
        await iamService.adminLogout({ sessionId: sid });
    res.clearCookie('sid', { path: '/admin' });
    res.status(200).json({ data: { ok: true } });
});
router.get('/admin/me', auth_1.requireAdmin, async (req, res) => {
    res.status(200).json({ data: { user: req.user, admin: req.admin } });
});
const createInviteSchema = zod_1.z.object({ email: zod_1.z.string().email() });
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
router.get('/admin/admins', auth_1.requireAdmin, async (_req, res) => {
    const admins = await iamService.listAdminsForOwner();
    res.status(200).json({ data: { admins } });
});
const updateRoleSchema = zod_1.z.object({
    role: zod_1.z.enum(['ADMIN', 'OWNER']),
});
router.patch('/admin/admins/:adminId/role', auth_1.requireOwner, (0, validate_1.validate)(updateRoleSchema), async (req, res) => {
    const body = req.body;
    const admin = await iamService.updateAdminRoleForOwner({
        targetAdminId: req.params.adminId,
        role: body.role,
        requestingAdminId: req.admin.id,
    });
    res.status(200).json({ data: { admin } });
});
router.post('/admin/admins/:adminId/suspend', auth_1.requireOwner, async (req, res) => {
    await iamService.suspendAdminForOwner({
        targetAdminId: req.params.adminId,
        requestingAdminId: req.admin.id,
    });
    res.status(200).json({ data: { ok: true } });
});
exports.iamRoutes = router;
