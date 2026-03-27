/**
 * Inventory route handlers — admin only. Zod for body/query. Success: { data: T }.
 */

import { Router, type Request, type Response, type IRouter } from 'express'
import { z } from 'zod'
import { requireAdmin } from '../../middleware/auth'
import type { AdminRequest } from '../../middleware/auth'
import * as inventoryService from './inventory.service'

const router = Router()

function adminReq(req: Request): AdminRequest {
  return req as AdminRequest
}

// GET /admin/inventory/variants/:variantId/stock
router.get(
  '/admin/inventory/variants/:variantId/stock',
  requireAdmin,
  async (req: Request, res: Response) => {
    const stock = await inventoryService.getVariantStock({
      variantId: req.params.variantId!,
    })
    res.status(200).json({ data: { stock } })
  },
)

// GET /admin/inventory/variants/:variantId/details
router.get(
  '/admin/inventory/variants/:variantId/details',
  requireAdmin,
  async (req: Request, res: Response) => {
    const details = await inventoryService.getStockDetails({
      variantId: req.params.variantId!,
    })
    res.status(200).json({ data: details })
  },
)

const unitsQuerySchema = z.object({
  status: z
    .enum([
      'IN_STOCK',
      'HELD',
      'SOLD',
      'RETURNED',
      'DAMAGED',
      'ADJUSTED_OUT',
    ])
    .optional(),
})

// GET /admin/inventory/variants/:variantId/units
router.get(
  '/admin/inventory/variants/:variantId/units',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = unitsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const units = await inventoryService.listUnitsForVariant({
      variantId: req.params.variantId!,
      status: parsed.data.status,
    })
    res.status(200).json({ data: { units } })
  },
)

const movementsQuerySchema = z.object({
  limit: z.coerce.number().int().min(1).max(200).default(50),
  offset: z.coerce.number().int().min(0).default(0),
})

// GET /admin/inventory/variants/:variantId/movements
router.get(
  '/admin/inventory/variants/:variantId/movements',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = movementsQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const movements = await inventoryService.getMovementHistory({
      variantId: req.params.variantId!,
      limit: parsed.data.limit,
      offset: parsed.data.offset,
    })
    res.status(200).json({ data: { movements } })
  },
)

const restockBodySchema = z.object({
  qty: z.number().int().min(1).max(500),
})

// POST /admin/inventory/variants/:variantId/restock
router.post(
  '/admin/inventory/variants/:variantId/restock',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = restockBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const result = await inventoryService.restockVariant({
      variantId: req.params.variantId!,
      qty: parsed.data.qty,
      adminId: adminReq(req).admin!.id,
    })
    res.status(201).json({ data: result })
  },
)

// POST /admin/inventory/units/:unitId/damage
router.post(
  '/admin/inventory/units/:unitId/damage',
  requireAdmin,
  async (req: Request, res: Response) => {
    const unit = await inventoryService.markUnitDamaged({
      unitId: req.params.unitId!,
      adminId: adminReq(req).admin!.id,
    })
    res.status(200).json({ data: { unit } })
  },
)

const adjustBodySchema = z.object({
  deltaQty: z.number().int().refine((n) => n !== 0),
  reason: z.string().min(1).max(500),
})

// POST /admin/inventory/variants/:variantId/adjust
router.post(
  '/admin/inventory/variants/:variantId/adjust',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = adjustBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const stock = await inventoryService.adjustStock({
      variantId: req.params.variantId!,
      deltaQty: parsed.data.deltaQty,
      reason: parsed.data.reason,
      adminId: adminReq(req).admin!.id,
    })
    res.status(200).json({ data: { stock } })
  },
)

const thresholdBodySchema = z.object({
  threshold: z.number().int().min(0),
})

// PATCH /admin/inventory/variants/:variantId/threshold
router.patch(
  '/admin/inventory/variants/:variantId/threshold',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = thresholdBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const stock = await inventoryService.updateLowStockThreshold({
      variantId: req.params.variantId!,
      threshold: parsed.data.threshold,
      adminId: adminReq(req).admin!.id,
    })
    res.status(200).json({ data: { stock } })
  },
)

const scanBodySchema = z.object({
  barcodeValue: z.string().min(1),
})

// POST /admin/inventory/scan
router.post(
  '/admin/inventory/scan',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = scanBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const unit = await inventoryService.scanBarcode({
      barcodeValue: parsed.data.barcodeValue,
    })
    res.status(200).json({ data: { unit } })
  },
)

const reconcileBodySchema = z.object({
  variantId: z.string().uuid().optional(),
})

// POST /admin/inventory/reconcile
router.post(
  '/admin/inventory/reconcile',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = reconcileBodySchema.safeParse(req.body ?? {})
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const result = await inventoryService.runReconciliation({
      variantId: parsed.data.variantId,
      adminId: adminReq(req).admin!.id,
    })
    res.status(200).json({ data: result })
  },
)

const reconciliationLogQuerySchema = z.object({
  variantId: z.string().uuid().optional(),
  unresolvedOnly: z
    .string()
    .optional()
    .transform((v) => v === 'true' || v === '1'),
})

// GET /admin/inventory/reconciliation-log
router.get(
  '/admin/inventory/reconciliation-log',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = reconciliationLogQuerySchema.safeParse(req.query)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid query parameters',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const logs = await inventoryService.getReconciliationLog({
      variantId: parsed.data.variantId,
      unresolvedOnly: parsed.data.unresolvedOnly,
    })
    res.status(200).json({ data: { logs } })
  },
)

const resolveLogBodySchema = z.object({
  resolvedNote: z.string().min(1),
})

// PATCH /admin/inventory/reconciliation-log/:logId/resolve
router.patch(
  '/admin/inventory/reconciliation-log/:logId/resolve',
  requireAdmin,
  async (req: Request, res: Response) => {
    const parsed = resolveLogBodySchema.safeParse(req.body)
    if (!parsed.success) {
      return res.status(400).json({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid request body',
          details: parsed.error.flatten().fieldErrors,
        },
      })
    }
    const log = await inventoryService.markReconciliationResolved({
      logId: req.params.logId!,
      resolvedNote: parsed.data.resolvedNote,
      adminId: adminReq(req).admin!.id,
    })
    res.status(200).json({ data: { log } })
  },
)

export const inventoryRoutes: IRouter = router
