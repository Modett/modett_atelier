"use strict";
/**
 * Inventory route handlers — admin only. Zod for body/query. Success: { data: T }.
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
exports.inventoryRoutes = void 0;
const express_1 = require("express");
const zod_1 = require("zod");
const auth_1 = require("../../middleware/auth");
const inventoryService = __importStar(require("./inventory.service"));
const router = (0, express_1.Router)();
function adminReq(req) {
    return req;
}
// GET /admin/inventory/variants/:variantId/stock
router.get('/admin/inventory/variants/:variantId/stock', auth_1.requireAdmin, async (req, res) => {
    const stock = await inventoryService.getVariantStock({
        variantId: req.params.variantId,
    });
    res.status(200).json({ data: { stock } });
});
// GET /admin/inventory/variants/:variantId/details
router.get('/admin/inventory/variants/:variantId/details', auth_1.requireAdmin, async (req, res) => {
    const details = await inventoryService.getStockDetails({
        variantId: req.params.variantId,
    });
    res.status(200).json({ data: details });
});
const unitsQuerySchema = zod_1.z.object({
    status: zod_1.z
        .enum([
        'IN_STOCK',
        'HELD',
        'SOLD',
        'RETURNED',
        'DAMAGED',
        'ADJUSTED_OUT',
    ])
        .optional(),
});
// GET /admin/inventory/variants/:variantId/units
router.get('/admin/inventory/variants/:variantId/units', auth_1.requireAdmin, async (req, res) => {
    const parsed = unitsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const units = await inventoryService.listUnitsForVariant({
        variantId: req.params.variantId,
        status: parsed.data.status,
    });
    res.status(200).json({ data: { units } });
});
const movementsQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
// GET /admin/inventory/variants/:variantId/movements
router.get('/admin/inventory/variants/:variantId/movements', auth_1.requireAdmin, async (req, res) => {
    const parsed = movementsQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const movements = await inventoryService.getMovementHistory({
        variantId: req.params.variantId,
        limit: parsed.data.limit,
        offset: parsed.data.offset,
    });
    res.status(200).json({ data: { movements } });
});
const restockBodySchema = zod_1.z.object({
    qty: zod_1.z.number().int().min(1).max(500),
});
// POST /admin/inventory/variants/:variantId/restock
router.post('/admin/inventory/variants/:variantId/restock', auth_1.requireAdmin, async (req, res) => {
    const parsed = restockBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const result = await inventoryService.restockVariant({
        variantId: req.params.variantId,
        qty: parsed.data.qty,
        adminId: adminReq(req).admin.id,
    });
    res.status(201).json({ data: result });
});
// POST /admin/inventory/units/:unitId/damage
router.post('/admin/inventory/units/:unitId/damage', auth_1.requireAdmin, async (req, res) => {
    const unit = await inventoryService.markUnitDamaged({
        unitId: req.params.unitId,
        adminId: adminReq(req).admin.id,
    });
    res.status(200).json({ data: { unit } });
});
const adjustBodySchema = zod_1.z.object({
    deltaQty: zod_1.z.number().int().refine((n) => n !== 0),
    reason: zod_1.z.string().min(1).max(500),
});
// POST /admin/inventory/variants/:variantId/adjust
router.post('/admin/inventory/variants/:variantId/adjust', auth_1.requireAdmin, async (req, res) => {
    const parsed = adjustBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const stock = await inventoryService.adjustStock({
        variantId: req.params.variantId,
        deltaQty: parsed.data.deltaQty,
        reason: parsed.data.reason,
        adminId: adminReq(req).admin.id,
    });
    res.status(200).json({ data: { stock } });
});
const thresholdBodySchema = zod_1.z.object({
    threshold: zod_1.z.number().int().min(0),
});
// PATCH /admin/inventory/variants/:variantId/threshold
router.patch('/admin/inventory/variants/:variantId/threshold', auth_1.requireAdmin, async (req, res) => {
    const parsed = thresholdBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const stock = await inventoryService.updateLowStockThreshold({
        variantId: req.params.variantId,
        threshold: parsed.data.threshold,
        adminId: adminReq(req).admin.id,
    });
    res.status(200).json({ data: { stock } });
});
const scanBodySchema = zod_1.z.object({
    barcodeValue: zod_1.z.string().min(1),
});
// POST /admin/inventory/scan
router.post('/admin/inventory/scan', auth_1.requireAdmin, async (req, res) => {
    const parsed = scanBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const unit = await inventoryService.scanBarcode({
        barcodeValue: parsed.data.barcodeValue,
    });
    res.status(200).json({ data: { unit } });
});
const reconcileBodySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid().optional(),
});
// POST /admin/inventory/reconcile
router.post('/admin/inventory/reconcile', auth_1.requireAdmin, async (req, res) => {
    const parsed = reconcileBodySchema.safeParse(req.body ?? {});
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const result = await inventoryService.runReconciliation({
        variantId: parsed.data.variantId,
        adminId: adminReq(req).admin.id,
    });
    res.status(200).json({ data: result });
});
const reconciliationLogQuerySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid().optional(),
    unresolvedOnly: zod_1.z
        .string()
        .optional()
        .transform((v) => v === 'true' || v === '1'),
});
// GET /admin/inventory/reconciliation-log
router.get('/admin/inventory/reconciliation-log', auth_1.requireAdmin, async (req, res) => {
    const parsed = reconciliationLogQuerySchema.safeParse(req.query);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const logs = await inventoryService.getReconciliationLog({
        variantId: parsed.data.variantId,
        unresolvedOnly: parsed.data.unresolvedOnly,
    });
    res.status(200).json({ data: { logs } });
});
const resolveLogBodySchema = zod_1.z.object({
    resolvedNote: zod_1.z.string().min(1),
});
// PATCH /admin/inventory/reconciliation-log/:logId/resolve
router.patch('/admin/inventory/reconciliation-log/:logId/resolve', auth_1.requireAdmin, async (req, res) => {
    const parsed = resolveLogBodySchema.safeParse(req.body);
    if (!parsed.success) {
        return res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: parsed.error.flatten().fieldErrors,
            },
        });
    }
    const log = await inventoryService.markReconciliationResolved({
        logId: req.params.logId,
        resolvedNote: parsed.data.resolvedNote,
        adminId: adminReq(req).admin.id,
    });
    res.status(200).json({ data: { log } });
});
exports.inventoryRoutes = router;
//# sourceMappingURL=inventory.routes.js.map