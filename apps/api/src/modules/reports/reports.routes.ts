/**
 * Admin reports API — reads pre-aggregated analytics + transactional data.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth'
import { validateQuery } from '../../middleware/validate'
import * as reportsService from './reports.service'

const router: IRouter = Router()

const periodSchema = z.enum(['7d', '30d', '90d', '1y'])

const periodQuerySchema = z.object({
  period: periodSchema.default('30d'),
})

const timeseriesQuerySchema = z.object({
  metric: z.string().min(1).max(100),
  period: periodSchema,
  dimension: z.string().optional(),
})

router.get(
  '/admin/reports',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const data = await reportsService.getFullReport({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data })
  },
)

router.get(
  '/admin/reports/sellers',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const sellers = await reportsService.getReportSellers({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { ...sellers, period: q.period } })
  },
)

router.get(
  '/admin/reports/most-viewed',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const rows = await reportsService.getMostViewedWithCartRates({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { products: rows, period: q.period } })
  },
)

router.get(
  '/admin/reports/cart-abandonment',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const rows = await reportsService.getReportCartAbandonment({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { rows, period: q.period } })
  },
)

router.get(
  '/admin/reports/returns',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const analysis = await reportsService.getReportReturns({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { ...analysis, period: q.period } })
  },
)

router.get(
  '/admin/reports/traffic',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const sources = await reportsService.getReportTraffic({ period: q.period })
    const devices = await reportsService.getReportDeviceTypes({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { sources, devices, period: q.period } })
  },
)

router.get(
  '/admin/reports/colors-sizes',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const colorsSizes = await reportsService.getReportColorsSizes({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { ...colorsSizes, period: q.period } })
  },
)

router.get(
  '/admin/reports/guest-vs-registered',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const data = await reportsService.getReportGuestVsRegistered({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { ...data, period: q.period } })
  },
)

router.get(
  '/admin/reports/wishlist',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const rows = await reportsService.getReportWishlist({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { rows, period: q.period } })
  },
)

router.get(
  '/admin/reports/funnel',
  requireAdmin,
  validateQuery(periodQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof periodQuerySchema> })
      .validatedQuery
    const funnel = await reportsService.getReportFunnel({ period: q.period })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data: { funnel, period: q.period } })
  },
)

router.get(
  '/admin/reports/timeseries',
  requireAdmin,
  validateQuery(timeseriesQuerySchema),
  async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof timeseriesQuerySchema> })
      .validatedQuery
    let dimensionJson: Record<string, unknown> | null = null
    if (q.dimension) {
      try {
        dimensionJson = JSON.parse(q.dimension) as Record<string, unknown>
      } catch {
        dimensionJson = null
      }
    }
    const data = await reportsService.getReportTimeSeries({
      metric:         q.metric,
      period:         q.period,
      dimensionJson,
    })
    res.set('Cache-Control', 'private, max-age=3600')
    res.status(200).json({ data })
  },
)

export { router as reportsRoutes }
