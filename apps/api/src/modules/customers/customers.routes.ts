/**
 * Admin customer lookup routes.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAdmin, withAdmin } from '../../middleware/auth'
import { validateQuery } from '../../middleware/validate'
import * as customersService from './customers.service'

const router: IRouter = Router()

const searchQuerySchema = z.object({
  q: z.string().min(2),
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(50).default(20),
})

router.get(
  '/admin/customers/search',
  requireAdmin,
  validateQuery(searchQuerySchema),
  withAdmin(async (req: Request, res: Response) => {
    const q = (req as Request & { validatedQuery: z.infer<typeof searchQuerySchema> })
      .validatedQuery
    const { customers, total } = await customersService.adminSearchCustomers({
      q: q.q,
      page: q.page,
      limit: q.limit,
    })
    res.status(200).json({
      data: {
        customers,
        total,
        page: q.page,
        limit: q.limit,
      },
    })
  }),
)

router.get(
  '/admin/customers/:userId',
  requireAdmin,
  withAdmin(async (req: Request, res: Response) => {
    const parsed = z.string().uuid().safeParse(req.params.userId)
    if (!parsed.success) {
      res.status(400).json({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid user id' },
      })
      return
    }
    const data = await customersService.adminGetCustomerDetail({
      userId: parsed.data,
    })
    res.status(200).json({ data })
  }),
)

export { router as customersRoutes }
