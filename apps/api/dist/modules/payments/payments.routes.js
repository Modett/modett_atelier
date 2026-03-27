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
exports.paymentsRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const validate_1 = require("../../middleware/validate");
const paymentsService = __importStar(require("./payments.service"));
const router = (0, express_1.Router)();
const sessionBodySchema = zod_1.z.object({
    orderId: zod_1.z.string().uuid(),
    reservationId: zod_1.z.string().uuid(),
    cartId: zod_1.z.string().uuid(),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']),
    customerFirstName: zod_1.z.string().min(1),
    customerLastName: zod_1.z.string().min(1),
    customerEmail: zod_1.z.string().email(),
    customerMobilePhone: zod_1.z.string().min(7).max(15),
    billingAddress: zod_1.z.object({
        street: zod_1.z.string().min(1),
        city: zod_1.z.string().min(1),
        province: zod_1.z.string().default(''),
        country: zod_1.z.string().min(2).max(3),
        postcode: zod_1.z.string().default(''),
    }),
});
router.post('/payments/session', auth_1.optionalAuth, (0, validate_1.validate)(sessionBodySchema), async (req, res) => {
    const body = req.body;
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
    });
    res.status(200).json({ data: result });
});
router.post('/payments/webhook', async (req, res) => {
    try {
        await paymentsService.handleWebhook({ payload: req.body });
    }
    catch (err) {
        const code = err?.code;
        const statusCode = err?.statusCode;
        if (code === 'WEBHOOK_INVALID_CHECKVALUE' || statusCode === 400) {
            return res.status(400).send();
        }
        console.error('[webhook] Unhandled error:', err);
    }
    res.status(200).json({ Status: 200 });
});
const statusQuerySchema = zod_1.z.object({
    guestEmail: zod_1.z.string().email().optional(),
});
router.get('/payments/status/:orderId', auth_1.optionalAuth, (0, validate_1.validateQuery)(statusQuerySchema), async (req, res) => {
    const orderId = req.params.orderId;
    const query = req
        .validatedQuery;
    const authReq = req;
    const result = await paymentsService.getPaymentStatus({
        orderId,
        userId: authReq.user?.id ?? null,
        guestEmail: query.guestEmail ?? null,
    });
    res.status(200).json({ data: result });
});
exports.paymentsRoutes = router;
