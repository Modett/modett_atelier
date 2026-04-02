/**
 * Public analytics ingestion — always HTTP 200; invalid payloads discarded.
 * Admin analytics — requireAdmin.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import {
  insertAnalyticsEvent,
  queryAdminAnalyticsToday,
  queryAdminAnalyticsRevenue,
  queryAdminAnalyticsFunnelAggregates,
  queryAdminAnalyticsRevenueByCurrency,
  type AdminRevenueSeriesRow,
  type AdminRevenueByCurrencyRow,
} from '@modett/db'
import { rateLimitAnalyticsEvent } from '../../middleware/rateLimit'
import { requireAdmin, withAdmin } from '../../middleware/auth'
import { validateQuery } from '../../middleware/validate'

const router: IRouter = Router()

const analyticsPeriodSchema = z.enum(['7d', '30d', '90d', '1y'])
const analyticsCurrencySchema = z.enum(['LKR', 'SGD', 'USD', 'ALL'])

router.get(
  '/admin/analytics/today',
  requireAdmin,
  withAdmin(async (_req, res: Response) => {
    const row = await queryAdminAnalyticsToday()
    const ordersToday = Number.parseInt(row.orders_today, 10) || 0
    const purchasesToday = Number.parseInt(row.purchases_today, 10) || 0
    const productViewsToday = Number.parseInt(row.product_views_today, 10) || 0
    const activeSessionsNow = Number.parseInt(row.active_sessions, 10) || 0
    const conversionToday =
      productViewsToday > 0
        ? Math.round((purchasesToday / productViewsToday) * 10000) / 100
        : 0
    res.status(200).json({
      data: {
        ordersToday,
        revenueLkr: row.revenue_lkr,
        revenueSgd: row.revenue_sgd,
        revenueUsd: row.revenue_usd,
        avgOrderValueLkr: row.avg_lkr != null ? row.avg_lkr : '0',
        conversionToday,
        activeSessionsNow,
      },
    })
  }),
)

const revenueQuerySchema = z.object({
  period: analyticsPeriodSchema.default('30d'),
  currency: analyticsCurrencySchema.default('ALL'),
})

router.get(
  '/admin/analytics/revenue',
  requireAdmin,
  validateQuery(revenueQuerySchema),
  withAdmin(async (req, res: Response) => {
    const q = (req as unknown as Request & {
      validatedQuery: z.infer<typeof revenueQuerySchema>
    }).validatedQuery
    const rows = await queryAdminAnalyticsRevenue({
      period: q.period,
      currency: q.currency,
    })
    res.status(200).json({
      data: rows.map((r: AdminRevenueSeriesRow) => ({
        date: r.date,
        currency: r.currency,
        orderCount: Number.parseInt(r.order_count, 10) || 0,
        revenue: r.revenue,
        avgOrderValue: r.avg_order_value ?? '0',
      })),
    })
  }),
)

const periodOnlySchema = z.object({
  period: analyticsPeriodSchema.default('30d'),
})

router.get(
  '/admin/analytics/funnel',
  requireAdmin,
  validateQuery(periodOnlySchema),
  withAdmin(async (req, res: Response) => {
    const q = (req as unknown as Request & {
      validatedQuery: z.infer<typeof periodOnlySchema>
    }).validatedQuery
    const row = await queryAdminAnalyticsFunnelAggregates({ period: q.period })
    const productViews = Number.parseFloat(row.product_views) || 0
    const addToCart = Number.parseFloat(row.add_to_cart) || 0
    const checkoutStarts = Number.parseFloat(row.checkout_starts) || 0
    const purchases = Number.parseFloat(row.purchases) || 0
    const viewToCartPct =
      productViews > 0 ? Math.round((addToCart / productViews) * 10000) / 100 : 0
    const cartToCheckoutPct =
      addToCart > 0 ? Math.round((checkoutStarts / addToCart) * 10000) / 100 : 0
    const checkoutToPurchasePct =
      checkoutStarts > 0
        ? Math.round((purchases / checkoutStarts) * 10000) / 100
        : 0
    const overallConversionPct =
      productViews > 0 ? Math.round((purchases / productViews) * 10000) / 100 : 0
    res.status(200).json({
      data: {
        productViews: Math.round(productViews),
        addToCart: Math.round(addToCart),
        checkoutStarts: Math.round(checkoutStarts),
        purchases: Math.round(purchases),
        viewToCartPct,
        cartToCheckoutPct,
        checkoutToPurchasePct,
        overallConversionPct,
      },
    })
  }),
)

router.get(
  '/admin/analytics/revenue-by-currency',
  requireAdmin,
  validateQuery(periodOnlySchema),
  withAdmin(async (req, res: Response) => {
    const q = (req as unknown as Request & {
      validatedQuery: z.infer<typeof periodOnlySchema>
    }).validatedQuery
    const rows = await queryAdminAnalyticsRevenueByCurrency({ period: q.period })
    res.status(200).json({
      data: rows.map((r: AdminRevenueByCurrencyRow) => ({
        currency: r.currency,
        orders: Number.parseInt(r.orders, 10) || 0,
        totalRevenue: r.total_revenue,
      })),
    })
  }),
)

const analyticsEventBodySchema = z.object({
  type:       z.string().min(1).max(100),
  payload:    z.record(z.unknown()).default({}),
  sessionId:  z.string().min(1).max(200),
  userId:     z.string().uuid().nullable().optional(),
  deviceType: z.enum(['mobile', 'desktop', 'tablet']).optional(),
  referrer:   z.string().max(2000).optional(),
  utmParams:  z.record(z.string()).optional(),
  path:       z.string().max(500).optional(),
  timestamp:  z.string().optional(),
})

router.post(
  '/analytics/event',
  rateLimitAnalyticsEvent,
  async (req: Request, res: Response) => {
    const parsed = analyticsEventBodySchema.safeParse(req.body)
    if (!parsed.success) {
      res.status(200).json({ ok: true })
      return
    }

    const body = parsed.data
    const countryRaw = req.headers['cf-ipcountry']
    const countryCode = typeof countryRaw === 'string' ? countryRaw.slice(0, 2) : null

    let createdAt = new Date()
    if (body.timestamp) {
      const t = Date.parse(body.timestamp)
      if (!Number.isNaN(t)) createdAt = new Date(t)
    }

    const payloadJson: Record<string, unknown> = {
      ...body.payload,
      utmParams: body.utmParams ?? {},
      path:      body.path ?? '',
      referrer:  body.referrer ?? '',
    }

    try {
      await insertAnalyticsEvent({
        sessionId:   body.sessionId,
        userId:      body.userId ?? null,
        type:        body.type,
        payloadJson,
        deviceType:  body.deviceType ?? null,
        countryCode,
        createdAt,
      })
    } catch (err) {
      console.error('[analytics/event]', err)
    }

    res.status(200).json({ ok: true })
  },
)

export { router as analyticsRoutes }
