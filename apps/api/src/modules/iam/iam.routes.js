"use strict";
/**
 * IAM route handlers — Express Router, Zod validation, rate limits, cookies.
 * Success: { data: T }. Errors via global handler (AppError) or validate middleware.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.iamRoutes = void 0;
var express_1 = require("express");
var zod_1 = require("zod");
var validate_1 = require("../../middleware/validate");
var rateLimit_1 = require("../../middleware/rateLimit");
var auth_1 = require("../../middleware/auth");
var iamService = require("./iam.service");
var router = (0, express_1.Router)();
// Cookie helpers
var CUSTOMER_COOKIE_OPTIONS = {
    httpOnly: true,
    secure: true,
    sameSite: 'lax',
    path: '/',
};
var ADMIN_COOKIE_OPTIONS = __assign(__assign({}, CUSTOMER_COOKIE_OPTIONS), { sameSite: 'strict', path: '/admin' });
// —— Customer auth ——
var signupSchema = zod_1.z.object({
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
router.post('/auth/signup', rateLimit_1.rateLimitSignup, (0, validate_1.validate)(signupSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, _a, user, sessionId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.signup(body)];
            case 1:
                _a = _b.sent(), user = _a.user, sessionId = _a.sessionId;
                res.cookie('sid', sessionId, __assign(__assign({}, CUSTOMER_COOKIE_OPTIONS), { maxAge: 7 * 24 * 60 * 60 * 1000 }));
                res.status(201).json({ data: { user: user } });
                return [2 /*return*/];
        }
    });
}); });
var loginSchema = zod_1.z.object({
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
router.post('/auth/login', rateLimit_1.rateLimitAuth, (0, validate_1.validate)(loginSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, _a, user, sessionId, maxAge;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.login(body)];
            case 1:
                _a = _b.sent(), user = _a.user, sessionId = _a.sessionId;
                maxAge = body.rememberMe ? 30 * 24 * 60 * 60 * 1000 : 24 * 60 * 60 * 1000;
                res.cookie('sid', sessionId, __assign(__assign({}, CUSTOMER_COOKIE_OPTIONS), { maxAge: maxAge }));
                res.status(200).json({ data: { user: user } });
                return [2 /*return*/];
        }
    });
}); });
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
router.post('/auth/logout', function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sid;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sid = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sid;
                if (!sid) return [3 /*break*/, 2];
                return [4 /*yield*/, iamService.logout({ sessionId: sid })];
            case 1:
                _b.sent();
                _b.label = 2;
            case 2:
                res.clearCookie('sid', { path: '/' });
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
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
router.get('/me', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var user;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.getMe({ userId: req.user.id })];
            case 1:
                user = _a.sent();
                res.status(200).json({ data: { user: user } });
                return [2 /*return*/];
        }
    });
}); });
var updateMeSchema = zod_1.z.object({
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
router.patch('/me', auth_1.requireAuth, (0, validate_1.validate)(updateMeSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, user;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.updateMe({ userId: req.user.id, data: body })];
            case 1:
                user = _a.sent();
                res.status(200).json({ data: { user: user } });
                return [2 /*return*/];
        }
    });
}); });
var changePasswordSchema = zod_1.z.object({
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
router.patch('/me/password', auth_1.requireAuth, (0, validate_1.validate)(changePasswordSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, sessionId;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.changePassword({
                        userId: req.user.id,
                        currentPassword: body.currentPassword,
                        newPassword: body.newPassword,
                    })];
            case 1:
                sessionId = (_a.sent()).sessionId;
                res.clearCookie('sid', { path: '/' });
                res.cookie('sid', sessionId, __assign(__assign({}, CUSTOMER_COOKIE_OPTIONS), { maxAge: 24 * 60 * 60 * 1000 }));
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
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
router.get('/me/addresses', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var addresses;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.listSavedAddressesForUser({ userId: req.user.id })];
            case 1:
                addresses = _a.sent();
                res.status(200).json({ data: { addresses: addresses } });
                return [2 /*return*/];
        }
    });
}); });
var createAddressSchema = zod_1.z.object({
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
router.post('/me/addresses', auth_1.requireAuth, (0, validate_1.validate)(createAddressSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, address;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.createSavedAddressForUser(__assign({ userId: req.user.id }, body))];
            case 1:
                address = _a.sent();
                res.status(201).json({ data: { address: address } });
                return [2 /*return*/];
        }
    });
}); });
var updateAddressSchema = createAddressSchema.partial();
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
router.patch('/me/addresses/:addressId', auth_1.requireAuth, (0, validate_1.validate)(updateAddressSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, address;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.updateSavedAddressForUser({
                        id: req.params.addressId,
                        userId: req.user.id,
                        data: body,
                    })];
            case 1:
                address = _a.sent();
                res.status(200).json({ data: { address: address } });
                return [2 /*return*/];
        }
    });
}); });
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
router.delete('/me/addresses/:addressId', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.deleteSavedAddressForUser({
                    id: req.params.addressId,
                    userId: req.user.id,
                })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
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
router.get('/me/payment-methods', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var paymentMethods;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.listSavedPaymentMethodsForUser({
                    userId: req.user.id,
                })];
            case 1:
                paymentMethods = _a.sent();
                res.status(200).json({ data: { paymentMethods: paymentMethods } });
                return [2 /*return*/];
        }
    });
}); });
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
router.delete('/me/payment-methods/:methodId', auth_1.requireAuth, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.deleteSavedPaymentMethodForUser({
                    id: req.params.methodId,
                    userId: req.user.id,
                })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
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
router.post('/admin/auth/login', rateLimit_1.rateLimitAdminAuth, (0, validate_1.validate)(zod_1.z.object({ email: zod_1.z.string().email(), password: zod_1.z.string().min(1) })), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, _a, user, admin, sessionId;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.adminLogin(body)];
            case 1:
                _a = _b.sent(), user = _a.user, admin = _a.admin, sessionId = _a.sessionId;
                res.cookie('sid', sessionId, __assign(__assign({}, ADMIN_COOKIE_OPTIONS), { maxAge: 8 * 60 * 60 * 1000 }));
                res.status(200).json({ data: { user: user, admin: admin } });
                return [2 /*return*/];
        }
    });
}); });
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
router.post('/admin/auth/logout', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var sid;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                sid = (_a = req.cookies) === null || _a === void 0 ? void 0 : _a.sid;
                if (!sid) return [3 /*break*/, 2];
                return [4 /*yield*/, iamService.adminLogout({ sessionId: sid })];
            case 1:
                _b.sent();
                _b.label = 2;
            case 2:
                res.clearCookie('sid', { path: '/admin' });
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
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
router.get('/admin/me', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        res.status(200).json({ data: { user: req.user, admin: req.admin } });
        return [2 /*return*/];
    });
}); });
// —— Admin management (OWNER only) ——
var createInviteSchema = zod_1.z.object({ email: zod_1.z.string().email() });
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
router.post('/admin/invites', auth_1.requireOwner, rateLimit_1.rateLimitAdminInvites, (0, validate_1.validate)(createInviteSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, _a, invite, rawToken, data;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.createAdminInviteForOwner({
                        email: body.email,
                        createdByAdminId: req.admin.id,
                    })];
            case 1:
                _a = _b.sent(), invite = _a.invite, rawToken = _a.rawToken;
                data = process.env.NODE_ENV !== 'production'
                    ? { invite: __assign(__assign({}, invite), { rawToken: rawToken }) }
                    : { invite: invite };
                res.status(201).json({ data: data });
                return [2 /*return*/];
        }
    });
}); });
var acceptInviteSchema = zod_1.z.object({
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
router.post('/admin/invites/accept', rateLimit_1.rateLimitAcceptInvite, (0, validate_1.validate)(acceptInviteSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, _a, user, admin;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.acceptAdminInvite({
                        rawToken: body.token,
                        firstName: body.firstName,
                        lastName: body.lastName,
                        password: body.password,
                    })];
            case 1:
                _a = _b.sent(), user = _a.user, admin = _a.admin;
                res.status(200).json({ data: { user: user, admin: admin } });
                return [2 /*return*/];
        }
    });
}); });
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
router.get('/admin/admins', auth_1.requireAdmin, function (_req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var admins;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.listAdminsForOwner()];
            case 1:
                admins = _a.sent();
                res.status(200).json({ data: { admins: admins } });
                return [2 /*return*/];
        }
    });
}); });
var updateRoleSchema = zod_1.z.object({
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
router.patch('/admin/admins/:adminId/role', auth_1.requireOwner, (0, validate_1.validate)(updateRoleSchema), function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var body, admin;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                body = req.body;
                return [4 /*yield*/, iamService.updateAdminRoleForOwner({
                        targetAdminId: req.params.adminId,
                        role: body.role,
                        requestingAdminId: req.admin.id,
                    })];
            case 1:
                admin = _a.sent();
                res.status(200).json({ data: { admin: admin } });
                return [2 /*return*/];
        }
    });
}); });
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
router.post('/admin/admins/:adminId/suspend', auth_1.requireOwner, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, iamService.suspendAdminForOwner({
                    targetAdminId: req.params.adminId,
                    requestingAdminId: req.admin.id,
                })];
            case 1:
                _a.sent();
                res.status(200).json({ data: { ok: true } });
                return [2 /*return*/];
        }
    });
}); });
exports.iamRoutes = router;
