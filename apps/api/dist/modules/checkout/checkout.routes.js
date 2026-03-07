"use strict";
/**
 * Checkout route handlers — start, address, contact, shipping, payment-intent, confirmation.
 * optionalAuth + resolveCheckoutIdentity on all routes. Success: { data: T }.
 * No try/catch — errors propagate to global handler.
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
exports.checkoutRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const rateLimit_1 = require("../../middleware/rateLimit");
const checkoutService = __importStar(require("./checkout.service"));
const router = (0, express_1.Router)();
function resolveCheckoutIdentity(req, _res, next) {
    const authReq = req;
    const checkoutReq = req;
    checkoutReq.checkoutUserId = authReq.user?.id ?? undefined;
    checkoutReq.checkoutSession = req.cookies?.['cid'] ?? '';
    next();
}
function validateOrderIdParam(req, res, next) {
    const result = zod_1.z.string().uuid().safeParse(req.params.orderId);
    if (!result.success) {
        res.status(400).json({
            error: { code: 'VALIDATION_ERROR', message: 'Invalid orderId' },
        });
        return;
    }
    next();
}
const checkoutStartBodySchema = zod_1.z.object({
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']),
    guestEmail: zod_1.z.string().email().optional(),
});
// POST /checkout/start
router.post('/checkout/start', auth_1.optionalAuth, resolveCheckoutIdentity, rateLimit_1.rateLimitCheckoutStart, (0, validate_1.validate)(checkoutStartBodySchema), async (req, res) => {
    const r = req;
    const body = req.body;
    const result = await checkoutService.startCheckout({
        userId: r.checkoutUserId,
        sessionId: r.checkoutSession,
        currency: body.currency,
        guestEmail: body.guestEmail,
    });
    res.status(201).json({
        data: {
            reservationId: result.reservationId,
            orderId: result.orderId,
            orderRef: result.orderRef,
            expiresAt: result.expiresAt.toISOString(),
            currency: result.currency,
            summary: result.summary,
        },
    });
});
const addressBodySchema = zod_1.z.object({
    kind: zod_1.z.enum(['SHIPPING', 'BILLING']),
    addressJson: zod_1.z.object({}).passthrough(),
    countryCode: zod_1.z.string().length(2),
});
// POST /checkout/:orderId/address
router.post('/checkout/:orderId/address', auth_1.optionalAuth, resolveCheckoutIdentity, validateOrderIdParam, (0, validate_1.validate)(addressBodySchema), async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    const result = await checkoutService.saveAddress({
        orderId,
        kind: body.kind,
        addressJson: body.addressJson,
        countryCode: body.countryCode,
    });
    res.status(200).json({ data: { order: result } });
});
const contactBodySchema = zod_1.z.object({
    primaryPhone: zod_1.z.string().min(7).max(20),
    extraPhones: zod_1.z.array(zod_1.z.string()).optional().default([]),
    isGift: zod_1.z.boolean().optional().default(false),
    giftReceiver: zod_1.z
        .object({
        name: zod_1.z.string(),
        phone: zod_1.z.string().optional(),
        note: zod_1.z.string().optional(),
    })
        .optional(),
});
// POST /checkout/:orderId/contact
router.post('/checkout/:orderId/contact', auth_1.optionalAuth, resolveCheckoutIdentity, validateOrderIdParam, (0, validate_1.validate)(contactBodySchema), async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    const result = await checkoutService.saveContact({
        orderId,
        primaryPhone: body.primaryPhone,
        extraPhones: body.extraPhones,
        isGift: body.isGift,
        giftReceiver: body.giftReceiver,
    });
    res.status(200).json({ data: { order: result } });
});
const shippingMethodsQuerySchema = zod_1.z.object({
    countryCode: zod_1.z.string().length(2),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
});
// GET /checkout/shipping-methods
router.get('/checkout/shipping-methods', auth_1.optionalAuth, resolveCheckoutIdentity, (0, validate_1.validateQuery)(shippingMethodsQuerySchema), async (req, res) => {
    const query = req.validatedQuery;
    const methods = await checkoutService.getShippingMethods({
        countryCode: query.countryCode,
        currency: query.currency,
    });
    res.status(200).json({ data: { methods } });
});
const shippingMethodBodySchema = zod_1.z.object({
    shippingMethodId: zod_1.z.string().uuid(),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']),
});
// POST /checkout/:orderId/shipping-method
router.post('/checkout/:orderId/shipping-method', auth_1.optionalAuth, resolveCheckoutIdentity, validateOrderIdParam, (0, validate_1.validate)(shippingMethodBodySchema), async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    const result = await checkoutService.selectShippingMethod({
        orderId,
        shippingMethodId: body.shippingMethodId,
        currency: body.currency,
    });
    res.status(200).json({ data: { order: result } });
});
// When the Payments module is built, this route will be extended to:
// 1. Create a Stripe PaymentIntent via Stripe SDK
// 2. Return { clientSecret } for the frontend Stripe Elements widget
// The stampPaymentSubmitted call (grace window) stays here — it must
// happen at the moment the customer submits payment, not in the webhook.
const paymentIntentBodySchema = zod_1.z.object({
    reservationId: zod_1.z.string().uuid(),
});
// POST /checkout/:orderId/payment-intent
router.post('/checkout/:orderId/payment-intent', auth_1.optionalAuth, resolveCheckoutIdentity, rateLimit_1.rateLimitPaymentIntent, validateOrderIdParam, (0, validate_1.validate)(paymentIntentBodySchema), async (req, res) => {
    const orderId = req.params.orderId;
    const body = req.body;
    const result = await checkoutService.initiatePayment({
        orderId,
        reservationId: body.reservationId,
    });
    res.status(200).json({
        data: {
            orderId: result.orderId,
            orderRef: result.orderRef,
            reservationId: result.reservationId,
            total: result.total,
            currency: result.currency,
            stripeReady: result.stripeReady,
        },
    });
});
const confirmationQuerySchema = zod_1.z.object({
    guestEmail: zod_1.z.string().email().optional(),
});
// GET /checkout/:orderId/confirmation
router.get('/checkout/:orderId/confirmation', auth_1.optionalAuth, resolveCheckoutIdentity, validateOrderIdParam, (0, validate_1.validateQuery)(confirmationQuerySchema), async (req, res) => {
    const orderId = req.params.orderId;
    const query = req.validatedQuery;
    const result = await checkoutService.getOrderConfirmation({
        orderId,
        userId: req.checkoutUserId,
        guestEmail: query.guestEmail,
    });
    res.status(200).json({ data: result });
});
exports.checkoutRoutes = router;
//# sourceMappingURL=checkout.routes.js.map