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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.cartRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const crypto_1 = __importDefault(require("crypto"));
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const cartService = __importStar(require("./cart.service"));
const router = (0, express_1.Router)();
const CID_MAX_AGE_MS = 21 * 24 * 60 * 60 * 1000;
function cartReq(req) {
    return req;
}
function setCidCookie(res, sessionId) {
    res.cookie('cid', sessionId, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: CID_MAX_AGE_MS,
        path: '/',
    });
}
function resolveCartIdentity(req, res, next) {
    const authReq = req;
    const cartReq = req;
    cartReq.cartUserId = authReq.user?.id;
    cartReq.cartSession = req.cookies?.cid ?? crypto_1.default.randomUUID();
    if (!req.cookies?.cid) {
        setCidCookie(res, cartReq.cartSession);
    }
    next();
}
const currencySchema = zod_1.z.enum(['LKR', 'SGD', 'USD']).default('LKR');
const addToCartBodySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid(),
    qty: zod_1.z.number().int().min(1).max(10).default(1),
});
const updateQtyBodySchema = zod_1.z.object({
    qty: zod_1.z.number().int().min(1).max(10),
});
router.get('/cart', auth_1.optionalAuth, resolveCartIdentity, async (req, res) => {
    const r = cartReq(req);
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR';
    const result = await cartService.getCart({
        userId: r.cartUserId,
        sessionId: r.cartSession,
        currency,
    });
    setCidCookie(res, result.sessionId);
    res.status(200).json({
        data: {
            cart: result.cart,
            items: result.items,
            summary: result.summary,
        },
    });
});
router.post('/cart/items', auth_1.optionalAuth, resolveCartIdentity, (0, validate_1.validate)(addToCartBodySchema), async (req, res) => {
    const r = cartReq(req);
    const body = req
        .body;
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR';
    const result = await cartService.addToCart({
        userId: r.cartUserId,
        sessionId: r.cartSession,
        variantId: body.variantId,
        qty: body.qty,
        currency,
    });
    setCidCookie(res, result.sessionId);
    res.status(200).json({
        data: {
            cart: result.cart,
            items: result.items,
            summary: result.summary,
        },
    });
});
router.patch('/cart/items/:variantId', auth_1.optionalAuth, resolveCartIdentity, (0, validate_1.validate)(updateQtyBodySchema), async (req, res) => {
    const r = cartReq(req);
    const variantId = req.params.variantId;
    const body = req
        .body;
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR';
    const result = await cartService.updateCartItemQty({
        userId: r.cartUserId,
        sessionId: r.cartSession,
        variantId,
        qty: body.qty,
        currency,
    });
    setCidCookie(res, result.sessionId);
    res.status(200).json({
        data: {
            cart: result.cart,
            items: result.items,
            summary: result.summary,
        },
    });
});
router.delete('/cart/items/:variantId', auth_1.optionalAuth, resolveCartIdentity, async (req, res) => {
    const r = cartReq(req);
    const variantId = req.params.variantId;
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR';
    const result = await cartService.removeFromCart({
        userId: r.cartUserId,
        sessionId: r.cartSession,
        variantId,
        currency,
    });
    setCidCookie(res, result.sessionId);
    res.status(200).json({
        data: {
            cart: result.cart,
            items: result.items,
            summary: result.summary,
        },
    });
});
router.delete('/cart', auth_1.optionalAuth, resolveCartIdentity, async (req, res) => {
    const r = cartReq(req);
    const currency = currencySchema.safeParse(req.query.currency).data ?? 'LKR';
    const result = await cartService.clearCart({
        userId: r.cartUserId,
        sessionId: r.cartSession,
        currency,
    });
    setCidCookie(res, result.sessionId);
    res.status(200).json({
        data: {
            cart: result.cart,
            items: result.items,
            summary: result.summary,
        },
    });
});
exports.cartRoutes = router;
