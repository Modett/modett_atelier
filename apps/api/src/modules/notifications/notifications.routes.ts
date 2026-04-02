/**
 * Admin notifications — summary (poll) and feed (dropdown).
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAdmin, withAdmin } from '../../middleware/auth'
import { validateQuery } from '../../middleware/validate'
import * as notificationsService from './notifications.service'

const router: IRouter = Router()

const feedQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

router.get(
  '/admin/notifications/summary',
  requireAdmin,
  withAdmin(async (_req: Request, res: Response) => {
    const data = await notificationsService.getAdminNotificationsSummary()
    res.status(200).json({ data })
  }),
)

router.get(
  '/admin/notifications/feed',
  requireAdmin,
  validateQuery(feedQuerySchema),
  withAdmin(async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof feedQuerySchema> })
      .validatedQuery
    const { alerts, summary } = await notificationsService.getAdminNotificationsFeed({
      limit: q.limit,
    })
    res.status(200).json({ data: { alerts, summary } })
  }),
)

export { router as notificationsRoutes }
