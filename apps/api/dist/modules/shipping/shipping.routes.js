"use strict";
/**
 * Shipping route handlers — storefront shipping methods, admin zones/methods CRUD.
 * Success: { data: T }. No try/catch — errors propagate to global handler.
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
exports.shippingRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const shippingService = __importStar(require("./shipping.service"));
const router = (0, express_1.Router)();
// —— Storefront (no auth) ——
const shippingMethodsQuerySchema = zod_1.z.object({
    countryCode: zod_1.z.string().length(2).toUpperCase(),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
});
/**
 * @swagger
 * /shipping/methods:
 *   get:
 *     tags: [Shipping]
 *     summary: Get shipping methods for a country and currency
 *     security: []
 *     parameters:
 *       - in: query
 *         name: countryCode
 *         required: true
 *         schema: { type: string, minLength: 2, maxLength: 2, example: 'LK' }
 *       - in: query
 *         name: currency
 *         schema: { type: string, enum: [LKR, SGD, USD], default: LKR }
 *     responses:
 *       200:
 *         description: List of shipping methods with resolved cost
 */
router.get('/shipping/methods', (0, validate_1.validateQuery)(shippingMethodsQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const methods = await shippingService.getMethodsForCheckout({
        countryCode: query.countryCode,
        currency: query.currency,
    });
    res.status(200).json({ data: { methods } });
});
// —— Admin zones ——
/**
 * @swagger
 * /admin/shipping/zones:
 *   get:
 *     tags: [Shipping Admin]
 *     summary: List all shipping zones with methods
 *     security: [adminCookieAuth]
 */
router.get('/admin/shipping/zones', auth_1.requireAdmin, async (_req, res) => {
    const zones = await shippingService.adminGetAllZones();
    res.status(200).json({ data: { zones } });
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}:
 *   get:
 *     tags: [Shipping Admin]
 *     summary: Get one zone with countries and methods
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.get('/admin/shipping/zones/:zoneId', auth_1.requireAdmin, async (req, res) => {
    const result = await shippingService.adminGetZone({
        id: req.params.zoneId,
    });
    res.status(200).json({ data: result });
});
const createZoneBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    countries: zod_1.z.array(zod_1.z.string().length(2).toUpperCase()).min(1),
});
/**
 * @swagger
 * /admin/shipping/zones:
 *   post:
 *     tags: [Shipping Admin]
 *     summary: Create a shipping zone
 *     security: [adminCookieAuth]
 *     requestBody:
 *       required: true
 *       content:
 *         application/json:
 *           schema:
 *             type: object
 *             required: [name, countries]
 *             properties:
 *               name: { type: string }
 *               countries: { type: array, items: { type: string, minLength: 2, maxLength: 2 } }
 */
router.post('/admin/shipping/zones', auth_1.requireAdmin, (0, validate_1.validate)(createZoneBodySchema), async (req, res) => {
    const body = req.body;
    const zone = await shippingService.adminCreateZone({
        name: body.name,
        countries: body.countries,
    });
    res.status(201).json({ data: { zone } });
});
const updateZoneBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}:
 *   patch:
 *     tags: [Shipping Admin]
 *     summary: Update zone name
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.patch('/admin/shipping/zones/:zoneId', auth_1.requireAdmin, (0, validate_1.validate)(updateZoneBodySchema), async (req, res) => {
    const body = req.body;
    const zone = await shippingService.adminUpdateZone({
        id: req.params.zoneId,
        name: body.name,
    });
    res.status(200).json({ data: { zone } });
});
const addCountryBodySchema = zod_1.z.object({
    countryCode: zod_1.z.string().length(2).toUpperCase(),
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}/countries:
 *   post:
 *     tags: [Shipping Admin]
 *     summary: Add country to zone
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.post('/admin/shipping/zones/:zoneId/countries', auth_1.requireAdmin, (0, validate_1.validate)(addCountryBodySchema), async (req, res) => {
    const body = req.body;
    await shippingService.adminAddCountryToZone({
        zoneId: req.params.zoneId,
        countryCode: body.countryCode,
    });
    res.status(200).json({ data: { ok: true } });
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}/countries/{countryCode}:
 *   delete:
 *     tags: [Shipping Admin]
 *     summary: Remove country from zone
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: path
 *         name: countryCode
 *         required: true
 *         schema: { type: string, minLength: 2, maxLength: 2 }
 */
router.delete('/admin/shipping/zones/:zoneId/countries/:countryCode', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminRemoveCountryFromZone({
        zoneId: req.params.zoneId,
        countryCode: req.params.countryCode.toUpperCase(),
    });
    res.status(200).json({ data: { ok: true } });
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}:
 *   delete:
 *     tags: [Shipping Admin]
 *     summary: Delete a zone (fails if zone has active methods)
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.delete('/admin/shipping/zones/:zoneId', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminDeleteZone({ id: req.params.zoneId });
    res.status(200).json({ data: { ok: true } });
});
// —— Admin methods ——
const zoneMethodsQuerySchema = zod_1.z.object({
    includeInactive: zod_1.z.coerce.boolean().default(false),
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}/methods:
 *   get:
 *     tags: [Shipping Admin]
 *     summary: List methods for a zone
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 *       - in: query
 *         name: includeInactive
 *         schema: { type: boolean, default: false }
 */
router.get('/admin/shipping/zones/:zoneId/methods', auth_1.requireAdmin, (0, validate_1.validateQuery)(zoneMethodsQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const methods = await shippingService.adminGetMethodsForZone({
        zoneId: req.params.zoneId,
        includeInactive: query.includeInactive,
    });
    res.status(200).json({ data: { methods } });
});
const createMethodBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100),
    carrier: zod_1.z.string().max(100).optional(),
    rateType: zod_1.z.enum(['FLAT', 'FREE', 'CALCULATED']),
    flatRateLkr: zod_1.z.number().min(0).optional(),
    flatRateSgd: zod_1.z.number().min(0).optional(),
    flatRateUsd: zod_1.z.number().min(0).optional(),
    estimatedDays: zod_1.z.string().max(20).optional(),
});
/**
 * @swagger
 * /admin/shipping/zones/{zoneId}/methods:
 *   post:
 *     tags: [Shipping Admin]
 *     summary: Create a shipping method
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: zoneId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.post('/admin/shipping/zones/:zoneId/methods', auth_1.requireAdmin, (0, validate_1.validate)(createMethodBodySchema), async (req, res) => {
    const body = req.body;
    const method = await shippingService.adminCreateMethod({
        zoneId: req.params.zoneId,
        name: body.name,
        carrier: body.carrier,
        rateType: body.rateType,
        flatRateLkr: body.flatRateLkr,
        flatRateSgd: body.flatRateSgd,
        flatRateUsd: body.flatRateUsd,
        estimatedDays: body.estimatedDays,
    });
    res.status(201).json({ data: { method } });
});
const updateMethodBodySchema = zod_1.z.object({
    name: zod_1.z.string().min(1).max(100).optional(),
    carrier: zod_1.z.string().max(100).optional(),
    estimatedDays: zod_1.z.string().max(20).optional(),
    flatRateLkr: zod_1.z.number().min(0).optional(),
    flatRateSgd: zod_1.z.number().min(0).optional(),
    flatRateUsd: zod_1.z.number().min(0).optional(),
});
/**
 * @swagger
 * /admin/shipping/methods/{methodId}:
 *   patch:
 *     tags: [Shipping Admin]
 *     summary: Update a shipping method
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.patch('/admin/shipping/methods/:methodId', auth_1.requireAdmin, (0, validate_1.validate)(updateMethodBodySchema), async (req, res) => {
    const body = req.body;
    const method = await shippingService.adminUpdateMethod({
        id: req.params.methodId,
        ...body,
    });
    res.status(200).json({ data: { method } });
});
/**
 * @swagger
 * /admin/shipping/methods/{methodId}/activate:
 *   post:
 *     tags: [Shipping Admin]
 *     summary: Activate a shipping method
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.post('/admin/shipping/methods/:methodId/activate', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminActivateMethod({ id: req.params.methodId });
    res.status(200).json({ data: { ok: true } });
});
/**
 * @swagger
 * /admin/shipping/methods/{methodId}/deactivate:
 *   post:
 *     tags: [Shipping Admin]
 *     summary: Deactivate a shipping method
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.post('/admin/shipping/methods/:methodId/deactivate', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminDeactivateMethod({ id: req.params.methodId });
    res.status(200).json({ data: { ok: true } });
});
/**
 * @swagger
 * /admin/shipping/methods/{methodId}:
 *   delete:
 *     tags: [Shipping Admin]
 *     summary: Soft-delete a shipping method (deactivate; historical orders retain reference)
 *     security: [adminCookieAuth]
 *     parameters:
 *       - in: path
 *         name: methodId
 *         required: true
 *         schema: { type: string, format: uuid }
 */
router.delete('/admin/shipping/methods/:methodId', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminDeleteMethod({ id: req.params.methodId });
    res.status(200).json({ data: { ok: true } });
});
exports.shippingRoutes = router;
//# sourceMappingURL=shipping.routes.js.map