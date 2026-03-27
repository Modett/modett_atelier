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
exports.shippingRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const validate_1 = require("../../middleware/validate");
const auth_1 = require("../../middleware/auth");
const shippingService = __importStar(require("./shipping.service"));
const router = (0, express_1.Router)();
const shippingMethodsQuerySchema = zod_1.z.object({
    countryCode: zod_1.z.string().length(2).toUpperCase(),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
    subtotal: zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
});
router.get('/shipping/methods', (0, validate_1.validateQuery)(shippingMethodsQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const methods = await shippingService.getMethodsForCheckout({
        countryCode: query.countryCode,
        currency: query.currency,
        subtotal: query.subtotal ?? null,
    });
    res.status(200).json({ data: { methods } });
});
const shippingEstimateQuerySchema = zod_1.z.object({
    countryCode: zod_1.z.string().length(2).toUpperCase(),
    currency: zod_1.z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
    subtotal: zod_1.z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number'),
});
router.get('/shipping/estimate', (0, validate_1.validateQuery)(shippingEstimateQuerySchema), async (req, res) => {
    const query = req
        .validatedQuery;
    const result = await shippingService.getShippingEstimate({
        countryCode: query.countryCode,
        currency: query.currency,
        subtotal: query.subtotal,
    });
    res.status(200).json({ data: result });
});
router.get('/admin/shipping/settings', auth_1.requireAdmin, async (_req, res) => {
    const settings = await shippingService.adminGetShippingSettings();
    res.status(200).json({ data: { settings } });
});
const updateShippingSettingsBodySchema = zod_1.z.object({
    freeThresholdLkr: zod_1.z.number().min(0).nullable().optional(),
    freeThresholdSgd: zod_1.z.number().min(0).nullable().optional(),
    freeThresholdUsd: zod_1.z.number().min(0).nullable().optional(),
    freeShippingLabel: zod_1.z.string().min(1).max(100).optional(),
});
router.patch('/admin/shipping/settings', auth_1.requireAdmin, (0, validate_1.validate)(updateShippingSettingsBodySchema), async (req, res) => {
    const body = req.body;
    const admin = req.admin;
    const settings = await shippingService.adminUpdateShippingSettings({
        ...body,
        adminId: admin.id,
    });
    res.status(200).json({ data: { settings } });
});
router.get('/admin/shipping/zones', auth_1.requireAdmin, async (_req, res) => {
    const zones = await shippingService.adminGetAllZones();
    res.status(200).json({ data: { zones } });
});
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
router.post('/admin/shipping/zones/:zoneId/countries', auth_1.requireAdmin, (0, validate_1.validate)(addCountryBodySchema), async (req, res) => {
    const body = req.body;
    await shippingService.adminAddCountryToZone({
        zoneId: req.params.zoneId,
        countryCode: body.countryCode,
    });
    res.status(200).json({ data: { ok: true } });
});
router.delete('/admin/shipping/zones/:zoneId/countries/:countryCode', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminRemoveCountryFromZone({
        zoneId: req.params.zoneId,
        countryCode: req.params.countryCode.toUpperCase(),
    });
    res.status(200).json({ data: { ok: true } });
});
router.delete('/admin/shipping/zones/:zoneId', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminDeleteZone({ id: req.params.zoneId });
    res.status(200).json({ data: { ok: true } });
});
const zoneMethodsQuerySchema = zod_1.z.object({
    includeInactive: zod_1.z.coerce.boolean().default(false),
});
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
router.patch('/admin/shipping/methods/:methodId', auth_1.requireAdmin, (0, validate_1.validate)(updateMethodBodySchema), async (req, res) => {
    const body = req.body;
    const method = await shippingService.adminUpdateMethod({
        id: req.params.methodId,
        ...body,
    });
    res.status(200).json({ data: { method } });
});
router.post('/admin/shipping/methods/:methodId/activate', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminActivateMethod({ id: req.params.methodId });
    res.status(200).json({ data: { ok: true } });
});
router.post('/admin/shipping/methods/:methodId/deactivate', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminDeactivateMethod({ id: req.params.methodId });
    res.status(200).json({ data: { ok: true } });
});
router.delete('/admin/shipping/methods/:methodId', auth_1.requireAdmin, async (req, res) => {
    await shippingService.adminDeleteMethod({ id: req.params.methodId });
    res.status(200).json({ data: { ok: true } });
});
exports.shippingRoutes = router;
