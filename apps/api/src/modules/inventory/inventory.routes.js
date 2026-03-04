"use strict";
/**
 * Inventory route handlers — admin only. Zod for body/query. Success: { data: T }.
 */
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryRoutes = void 0;
var express_1 = require("express");
var zod_1 = require("zod");
var auth_1 = require("../../middleware/auth");
var inventoryService = require("./inventory.service");
var router = (0, express_1.Router)();
// GET /admin/inventory/variants/:variantId/stock
router.get('/admin/inventory/variants/:variantId/stock', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var stock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, inventoryService.getVariantStock({
                    variantId: req.params.variantId,
                })];
            case 1:
                stock = _a.sent();
                res.status(200).json({ data: { stock: stock } });
                return [2 /*return*/];
        }
    });
}); });
// GET /admin/inventory/variants/:variantId/details
router.get('/admin/inventory/variants/:variantId/details', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var details;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, inventoryService.getStockDetails({
                    variantId: req.params.variantId,
                })];
            case 1:
                details = _a.sent();
                res.status(200).json({ data: details });
                return [2 /*return*/];
        }
    });
}); });
var unitsQuerySchema = zod_1.z.object({
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
router.get('/admin/inventory/variants/:variantId/units', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, units;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = unitsQuerySchema.safeParse(req.query);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid query parameters',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.listUnitsForVariant({
                        variantId: req.params.variantId,
                        status: parsed.data.status,
                    })];
            case 1:
                units = _a.sent();
                res.status(200).json({ data: { units: units } });
                return [2 /*return*/];
        }
    });
}); });
var movementsQuerySchema = zod_1.z.object({
    limit: zod_1.z.coerce.number().int().min(1).max(200).default(50),
    offset: zod_1.z.coerce.number().int().min(0).default(0),
});
// GET /admin/inventory/variants/:variantId/movements
router.get('/admin/inventory/variants/:variantId/movements', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, movements;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = movementsQuerySchema.safeParse(req.query);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid query parameters',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.getMovementHistory({
                        variantId: req.params.variantId,
                        limit: parsed.data.limit,
                        offset: parsed.data.offset,
                    })];
            case 1:
                movements = _a.sent();
                res.status(200).json({ data: { movements: movements } });
                return [2 /*return*/];
        }
    });
}); });
var restockBodySchema = zod_1.z.object({
    qty: zod_1.z.number().int().min(1).max(500),
});
// POST /admin/inventory/variants/:variantId/restock
router.post('/admin/inventory/variants/:variantId/restock', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, result;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = restockBodySchema.safeParse(req.body);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request body',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.restockVariant({
                        variantId: req.params.variantId,
                        qty: parsed.data.qty,
                        adminId: req.admin.id,
                    })];
            case 1:
                result = _a.sent();
                res.status(201).json({ data: result });
                return [2 /*return*/];
        }
    });
}); });
// POST /admin/inventory/units/:unitId/damage
router.post('/admin/inventory/units/:unitId/damage', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var unit;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, inventoryService.markUnitDamaged({
                    unitId: req.params.unitId,
                    adminId: req.admin.id,
                })];
            case 1:
                unit = _a.sent();
                res.status(200).json({ data: { unit: unit } });
                return [2 /*return*/];
        }
    });
}); });
var adjustBodySchema = zod_1.z.object({
    deltaQty: zod_1.z.number().int().refine(function (n) { return n !== 0; }),
    reason: zod_1.z.string().min(1).max(500),
});
// POST /admin/inventory/variants/:variantId/adjust
router.post('/admin/inventory/variants/:variantId/adjust', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, stock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = adjustBodySchema.safeParse(req.body);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request body',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.adjustStock({
                        variantId: req.params.variantId,
                        deltaQty: parsed.data.deltaQty,
                        reason: parsed.data.reason,
                        adminId: req.admin.id,
                    })];
            case 1:
                stock = _a.sent();
                res.status(200).json({ data: { stock: stock } });
                return [2 /*return*/];
        }
    });
}); });
var thresholdBodySchema = zod_1.z.object({
    threshold: zod_1.z.number().int().min(0),
});
// PATCH /admin/inventory/variants/:variantId/threshold
router.patch('/admin/inventory/variants/:variantId/threshold', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, stock;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = thresholdBodySchema.safeParse(req.body);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request body',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.updateLowStockThreshold({
                        variantId: req.params.variantId,
                        threshold: parsed.data.threshold,
                        adminId: req.admin.id,
                    })];
            case 1:
                stock = _a.sent();
                res.status(200).json({ data: { stock: stock } });
                return [2 /*return*/];
        }
    });
}); });
var scanBodySchema = zod_1.z.object({
    barcodeValue: zod_1.z.string().min(1),
});
// POST /admin/inventory/scan
router.post('/admin/inventory/scan', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, unit;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = scanBodySchema.safeParse(req.body);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request body',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.scanBarcode({
                        barcodeValue: parsed.data.barcodeValue,
                    })];
            case 1:
                unit = _a.sent();
                res.status(200).json({ data: { unit: unit } });
                return [2 /*return*/];
        }
    });
}); });
var reconcileBodySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid().optional(),
});
// POST /admin/inventory/reconcile
router.post('/admin/inventory/reconcile', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, result;
    var _a;
    return __generator(this, function (_b) {
        switch (_b.label) {
            case 0:
                parsed = reconcileBodySchema.safeParse((_a = req.body) !== null && _a !== void 0 ? _a : {});
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request body',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.runReconciliation({
                        variantId: parsed.data.variantId,
                        adminId: req.admin.id,
                    })];
            case 1:
                result = _b.sent();
                res.status(200).json({ data: result });
                return [2 /*return*/];
        }
    });
}); });
var reconciliationLogQuerySchema = zod_1.z.object({
    variantId: zod_1.z.string().uuid().optional(),
    unresolvedOnly: zod_1.z
        .string()
        .optional()
        .transform(function (v) { return v === 'true' || v === '1'; }),
});
// GET /admin/inventory/reconciliation-log
router.get('/admin/inventory/reconciliation-log', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, logs;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = reconciliationLogQuerySchema.safeParse(req.query);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid query parameters',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.getReconciliationLog({
                        variantId: parsed.data.variantId,
                        unresolvedOnly: parsed.data.unresolvedOnly,
                    })];
            case 1:
                logs = _a.sent();
                res.status(200).json({ data: { logs: logs } });
                return [2 /*return*/];
        }
    });
}); });
var resolveLogBodySchema = zod_1.z.object({
    resolvedNote: zod_1.z.string().min(1),
});
// PATCH /admin/inventory/reconciliation-log/:logId/resolve
router.patch('/admin/inventory/reconciliation-log/:logId/resolve', auth_1.requireAdmin, function (req, res) { return __awaiter(void 0, void 0, void 0, function () {
    var parsed, log;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                parsed = resolveLogBodySchema.safeParse(req.body);
                if (!parsed.success) {
                    return [2 /*return*/, res.status(400).json({
                            error: {
                                code: 'VALIDATION_ERROR',
                                message: 'Invalid request body',
                                details: parsed.error.flatten().fieldErrors,
                            },
                        })];
                }
                return [4 /*yield*/, inventoryService.markReconciliationResolved({
                        logId: req.params.logId,
                        resolvedNote: parsed.data.resolvedNote,
                        adminId: req.admin.id,
                    })];
            case 1:
                log = _a.sent();
                res.status(200).json({ data: { log: log } });
                return [2 /*return*/];
        }
    });
}); });
exports.inventoryRoutes = router;
