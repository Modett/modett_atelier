/**
 * Shipping route handlers — storefront shipping methods, admin zones/methods CRUD.
 * Success: { data: T }. No try/catch — errors propagate to global handler.
 */

import { Router, type Request, type IRouter } from 'express'
import { z } from 'zod'
import { validate, validateQuery } from '../../middleware/validate'
import { requireAdmin, type AdminRequest } from '../../middleware/auth'
import * as shippingService from './shipping.service'

const router = Router()

// —— Storefront (no auth) ——

const shippingMethodsQuerySchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  currency: z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number').optional(),
})

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
router.get(
  '/shipping/methods',
  validateQuery(shippingMethodsQuerySchema),
  async (req, res) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof shippingMethodsQuerySchema> })
      .validatedQuery
    const methods = await shippingService.getMethodsForCheckout({
      countryCode: query.countryCode,
      currency: query.currency,
      subtotal: query.subtotal ?? null,
    })
    res.status(200).json({ data: { methods } })
  },
)

// —— Shipping estimate (public) ——

const shippingEstimateQuerySchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
  currency: z.enum(['LKR', 'SGD', 'USD']).default('LKR'),
  subtotal: z.string().regex(/^\d+(\.\d{1,2})?$/, 'Must be a decimal number'),
})

router.get(
  '/shipping/estimate',
  validateQuery(shippingEstimateQuerySchema),
  async (req, res) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof shippingEstimateQuerySchema> })
      .validatedQuery
    const result = await shippingService.getShippingEstimate({
      countryCode: query.countryCode,
      currency: query.currency,
      subtotal: query.subtotal,
    })
    res.status(200).json({ data: result })
  },
)

// —— Admin shipping settings ——

router.get('/admin/shipping/settings', requireAdmin, async (_req, res) => {
  const settings = await shippingService.adminGetShippingSettings()
  res.status(200).json({ data: { settings } })
})

const updateShippingSettingsBodySchema = z.object({
  freeThresholdLkr: z.number().min(0).nullable().optional(),
  freeThresholdSgd: z.number().min(0).nullable().optional(),
  freeThresholdUsd: z.number().min(0).nullable().optional(),
  freeShippingLabel: z.string().min(1).max(100).optional(),
})

router.patch(
  '/admin/shipping/settings',
  requireAdmin,
  validate(updateShippingSettingsBodySchema),
  async (req, res) => {
    const body = (req as Request & { body: z.infer<typeof updateShippingSettingsBodySchema> }).body
    const admin = (req as AdminRequest).admin
    const settings = await shippingService.adminUpdateShippingSettings({
      ...body,
      adminId: admin.id,
    })
    res.status(200).json({ data: { settings } })
  },
)

// —— Admin zones ——

/**
 * @swagger
 * /admin/shipping/zones:
 *   get:
 *     tags: [Shipping Admin]
 *     summary: List all shipping zones with methods
 *     security: [adminCookieAuth]
 */
router.get('/admin/shipping/zones', requireAdmin, async (_req, res) => {
  const zones = await shippingService.adminGetAllZones()
  res.status(200).json({ data: { zones } })
})

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
router.get('/admin/shipping/zones/:zoneId', requireAdmin, async (req, res) => {
  const result = await shippingService.adminGetZone({
    id: req.params.zoneId,
  })
  res.status(200).json({ data: result })
})

const createZoneBodySchema = z.object({
  name: z.string().min(1).max(100),
  countries: z.array(z.string().length(2).toUpperCase()).min(1),
})

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
router.post(
  '/admin/shipping/zones',
  requireAdmin,
  validate(createZoneBodySchema),
  async (req, res) => {
    const body = (req as Request & { body: z.infer<typeof createZoneBodySchema> }).body
    const zone = await shippingService.adminCreateZone({
      name: body.name,
      countries: body.countries,
    })
    res.status(201).json({ data: { zone } })
  },
)

const updateZoneBodySchema = z.object({
  name: z.string().min(1).max(100),
})

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
router.patch(
  '/admin/shipping/zones/:zoneId',
  requireAdmin,
  validate(updateZoneBodySchema),
  async (req, res) => {
    const body = (req as Request & { body: z.infer<typeof updateZoneBodySchema> }).body
    const zone = await shippingService.adminUpdateZone({
      id: req.params.zoneId,
      name: body.name,
    })
    res.status(200).json({ data: { zone } })
  },
)

const addCountryBodySchema = z.object({
  countryCode: z.string().length(2).toUpperCase(),
})

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
router.post(
  '/admin/shipping/zones/:zoneId/countries',
  requireAdmin,
  validate(addCountryBodySchema),
  async (req, res) => {
    const body = (req as Request & { body: z.infer<typeof addCountryBodySchema> }).body
    await shippingService.adminAddCountryToZone({
      zoneId: req.params.zoneId,
      countryCode: body.countryCode,
    })
    res.status(200).json({ data: { ok: true } })
  },
)

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
router.delete(
  '/admin/shipping/zones/:zoneId/countries/:countryCode',
  requireAdmin,
  async (req, res) => {
    await shippingService.adminRemoveCountryFromZone({
      zoneId: req.params.zoneId,
      countryCode: req.params.countryCode.toUpperCase(),
    })
    res.status(200).json({ data: { ok: true } })
  },
)

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
router.delete('/admin/shipping/zones/:zoneId', requireAdmin, async (req, res) => {
  await shippingService.adminDeleteZone({ id: req.params.zoneId })
  res.status(200).json({ data: { ok: true } })
})

// —— Admin methods ——

const zoneMethodsQuerySchema = z.object({
  includeInactive: z.coerce.boolean().default(false),
})

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
router.get(
  '/admin/shipping/zones/:zoneId/methods',
  requireAdmin,
  validateQuery(zoneMethodsQuerySchema),
  async (req, res) => {
    const query = (req as Request & { validatedQuery: z.infer<typeof zoneMethodsQuerySchema> })
      .validatedQuery
    const methods = await shippingService.adminGetMethodsForZone({
      zoneId: req.params.zoneId,
      includeInactive: query.includeInactive,
    })
    res.status(200).json({ data: { methods } })
  },
)

const createMethodBodySchema = z.object({
  name: z.string().min(1).max(100),
  carrier: z.string().max(100).optional(),
  rateType: z.enum(['FLAT', 'FREE', 'CALCULATED']),
  flatRateLkr: z.number().min(0).optional(),
  flatRateSgd: z.number().min(0).optional(),
  flatRateUsd: z.number().min(0).optional(),
  estimatedDays: z.string().max(20).optional(),
})

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
router.post(
  '/admin/shipping/zones/:zoneId/methods',
  requireAdmin,
  validate(createMethodBodySchema),
  async (req, res) => {
    const body = (req as Request & { body: z.infer<typeof createMethodBodySchema> }).body
    const method = await shippingService.adminCreateMethod({
      zoneId: req.params.zoneId,
      name: body.name,
      carrier: body.carrier,
      rateType: body.rateType,
      flatRateLkr: body.flatRateLkr,
      flatRateSgd: body.flatRateSgd,
      flatRateUsd: body.flatRateUsd,
      estimatedDays: body.estimatedDays,
    })
    res.status(201).json({ data: { method } })
  },
)

const updateMethodBodySchema = z.object({
  name: z.string().min(1).max(100).optional(),
  carrier: z.string().max(100).optional(),
  estimatedDays: z.string().max(20).optional(),
  flatRateLkr: z.number().min(0).optional(),
  flatRateSgd: z.number().min(0).optional(),
  flatRateUsd: z.number().min(0).optional(),
})

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
router.patch(
  '/admin/shipping/methods/:methodId',
  requireAdmin,
  validate(updateMethodBodySchema),
  async (req, res) => {
    const body = (req as Request & { body: z.infer<typeof updateMethodBodySchema> }).body
    const method = await shippingService.adminUpdateMethod({
      id: req.params.methodId,
      ...body,
    })
    res.status(200).json({ data: { method } })
  },
)

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
router.post(
  '/admin/shipping/methods/:methodId/activate',
  requireAdmin,
  async (req, res) => {
    await shippingService.adminActivateMethod({ id: req.params.methodId })
    res.status(200).json({ data: { ok: true } })
  },
)

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
router.post(
  '/admin/shipping/methods/:methodId/deactivate',
  requireAdmin,
  async (req, res) => {
    await shippingService.adminDeactivateMethod({ id: req.params.methodId })
    res.status(200).json({ data: { ok: true } })
  },
)

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
router.delete('/admin/shipping/methods/:methodId', requireAdmin, async (req, res) => {
  await shippingService.adminDeleteMethod({ id: req.params.methodId })
  res.status(200).json({ data: { ok: true } })
})

export const shippingRoutes: IRouter = router
