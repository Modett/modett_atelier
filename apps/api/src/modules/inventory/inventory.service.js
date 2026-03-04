"use strict";
/**
 * Inventory service — stock holds/releases, restock, damage, adjustment,
 * reconciliation. Uses withInventoryLock for all hold/release. RORO. Throws AppError.
 */
var __assign = (this && this.__assign) || function () {
    __assign = Object.assign || function(t) {
        for (var s, i = 1, n = arguments.length; i < n; i++) {
            s = arguments[i];
            for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p))
                t[p] = s[p];
        }
        return t;
    };
    return __assign.apply(this, arguments);
};
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
exports.getVariantStock = getVariantStock;
exports.getVariantAvailabilityForProduct = getVariantAvailabilityForProduct;
exports.getStockDetails = getStockDetails;
exports.restockVariant = restockVariant;
exports.holdStock = holdStock;
exports.releaseHold = releaseHold;
exports.markUnitDamaged = markUnitDamaged;
exports.adjustStock = adjustStock;
exports.updateLowStockThreshold = updateLowStockThreshold;
exports.scanBarcode = scanBarcode;
exports.runReconciliation = runReconciliation;
exports.getReconciliationLog = getReconciliationLog;
exports.markReconciliationResolved = markReconciliationResolved;
exports.listUnitsForVariant = listUnitsForVariant;
exports.getMovementHistory = getMovementHistory;
var db_1 = require("@modett/db");
var db_2 = require("@modett/db");
var errors_1 = require("../../lib/errors");
// —— Barcode generation (internal) ——
function generateUnitIdentifiers(_a) {
    var variantId = _a.variantId, sequence = _a.sequence;
    var prefix = variantId.replace(/-/g, '').slice(0, 8).toUpperCase();
    var padded = String(sequence).padStart(6, '0');
    return {
        barcodeValue: "MOD-".concat(prefix, "-").concat(padded),
        unitSku: "SKU-".concat(prefix, "-").concat(padded),
    };
}
// —— Stock read ——
function getVariantStock(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var stock;
        var variantId = _b.variantId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.getVariantStock)({ variantId: variantId })];
                case 1:
                    stock = _c.sent();
                    if (!stock)
                        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
                    return [2 /*return*/, stock];
            }
        });
    });
}
function getVariantAvailabilityForProduct(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var productId = _b.productId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.getVariantAvailabilityForProduct)({ productId: productId })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
function getStockDetails(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var availability, _c, units, recentMovements;
        var variantId = _b.variantId;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0: return [4 /*yield*/, (0, db_2.getVariantAvailability)({ variantId: variantId })];
                case 1:
                    availability = _d.sent();
                    if (!availability)
                        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
                    return [4 /*yield*/, Promise.all([
                            (0, db_2.listInventoryUnitsForVariant)({ variantId: variantId }),
                            (0, db_2.listInventoryMovements)({ variantId: variantId, limit: 20 }),
                        ])];
                case 2:
                    _c = _d.sent(), units = _c[0], recentMovements = _c[1];
                    return [2 /*return*/, { availability: availability, units: units, recentMovements: recentMovements }];
            }
        });
    });
}
// —— Restock ——
function restockVariant(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var currentCount, sequences, units, newUnits;
        var _this = this;
        var variantId = _b.variantId, qty = _b.qty, adminId = _b.adminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (qty <= 0 || qty > 500) {
                        throw new errors_1.AppError('INVALID_RESTOCK_QTY', 400);
                    }
                    return [4 /*yield*/, (0, db_2.countInStockUnits)({ variantId: variantId })];
                case 1:
                    currentCount = _c.sent();
                    sequences = Array.from({ length: qty }, function (_, i) { return currentCount + 1 + i; });
                    units = sequences.map(function (seq) { return (__assign({ variantId: variantId }, generateUnitIdentifiers({ variantId: variantId, sequence: seq }))); });
                    newUnits = [];
                    return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            var ok;
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, db_2.atomicRestock)({ variantId: variantId, qty: qty, tx: tx })];
                                    case 1:
                                        ok = _a.sent();
                                        if (!ok)
                                            throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
                                        return [4 /*yield*/, (0, db_2.createInventoryUnits)({ units: units, tx: tx })];
                                    case 2:
                                        newUnits = _a.sent();
                                        return [4 /*yield*/, (0, db_2.createInventoryMovement)({
                                                variantId: variantId,
                                                deltaQty: qty,
                                                reason: 'RESTOCK',
                                                referenceType: 'manual_adjustment',
                                                createdByAdminId: adminId,
                                                tx: tx,
                                            })];
                                    case 3:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    return [2 /*return*/, { restockedQty: qty, newUnits: newUnits }];
            }
        });
    });
}
// —— Hold / release (for checkout module) ——
function holdStock(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var success;
        var _this = this;
        var variantId = _b.variantId, qty = _b.qty;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.withInventoryLock)(variantId, function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, db_2.atomicHoldStock)({ variantId: variantId, qty: qty })];
                                case 1: return [2 /*return*/, _a.sent()];
                            }
                        });
                    }); })];
                case 1:
                    success = _c.sent();
                    if (!success)
                        throw new errors_1.AppError('INSUFFICIENT_STOCK', 409);
                    return [2 /*return*/];
            }
        });
    });
}
function releaseHold(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var _this = this;
        var variantId = _b.variantId, qty = _b.qty;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.withInventoryLock)(variantId, function () { return __awaiter(_this, void 0, void 0, function () {
                        return __generator(this, function (_a) {
                            switch (_a.label) {
                                case 0: return [4 /*yield*/, (0, db_2.atomicReleaseHold)({ variantId: variantId, qty: qty })];
                                case 1:
                                    _a.sent();
                                    return [2 /*return*/];
                            }
                        });
                    }); })];
                case 1:
                    _c.sent();
                    return [2 /*return*/];
            }
        });
    });
}
// —— Damage and adjustment ——
function markUnitDamaged(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var unit, u;
        var _this = this;
        var unitId = _b.unitId, adminId = _b.adminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.getInventoryUnit)({ unitId: unitId })];
                case 1:
                    unit = _c.sent();
                    if (!unit)
                        throw new errors_1.AppError('UNIT_NOT_FOUND', 404);
                    if (unit.status !== 'IN_STOCK') {
                        throw new errors_1.AppError('INVALID_UNIT_STATUS_TRANSITION', 409);
                    }
                    return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, db_2.updateInventoryUnitStatus)({
                                            unitId: unitId,
                                            status: 'DAMAGED',
                                            tx: tx,
                                        })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, (0, db_2.atomicRestock)({
                                                variantId: unit.variant_id,
                                                qty: -1,
                                                tx: tx,
                                            })];
                                    case 2:
                                        _a.sent();
                                        return [4 /*yield*/, (0, db_2.createInventoryMovement)({
                                                variantId: unit.variant_id,
                                                deltaQty: -1,
                                                reason: 'DAMAGE',
                                                referenceType: 'manual_adjustment',
                                                referenceId: unitId,
                                                createdByAdminId: adminId,
                                                tx: tx,
                                            })];
                                    case 3:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, (0, db_2.getInventoryUnit)({ unitId: unitId })];
                case 3:
                    u = _c.sent();
                    if (!u)
                        throw new errors_1.AppError('UNIT_NOT_FOUND', 404);
                    return [2 /*return*/, u];
            }
        });
    });
}
function adjustStock(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var stock, updated;
        var _this = this;
        var variantId = _b.variantId, deltaQty = _b.deltaQty, reason = _b.reason, adminId = _b.adminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (deltaQty === 0)
                        throw new errors_1.AppError('INVALID_ADJUSTMENT', 400);
                    return [4 /*yield*/, getVariantStock({ variantId: variantId })];
                case 1:
                    stock = _c.sent();
                    if (!stock)
                        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
                    if (stock.in_stock_qty + deltaQty < 0) {
                        throw new errors_1.AppError('ADJUSTMENT_WOULD_MAKE_STOCK_NEGATIVE', 400);
                    }
                    return [4 /*yield*/, db_1.db.transaction(function (tx) { return __awaiter(_this, void 0, void 0, function () {
                            return __generator(this, function (_a) {
                                switch (_a.label) {
                                    case 0: return [4 /*yield*/, (0, db_2.atomicRestock)({ variantId: variantId, qty: deltaQty, tx: tx })];
                                    case 1:
                                        _a.sent();
                                        return [4 /*yield*/, (0, db_2.createInventoryMovement)({
                                                variantId: variantId,
                                                deltaQty: deltaQty,
                                                reason: 'ADJUSTMENT',
                                                referenceType: 'manual_adjustment',
                                                createdByAdminId: adminId,
                                                tx: tx,
                                            })];
                                    case 2:
                                        _a.sent();
                                        return [2 /*return*/];
                                }
                            });
                        }); })];
                case 2:
                    _c.sent();
                    return [4 /*yield*/, getVariantStock({ variantId: variantId })];
                case 3:
                    updated = _c.sent();
                    if (!updated)
                        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
                    return [2 /*return*/, updated];
            }
        });
    });
}
function updateLowStockThreshold(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var stock;
        var variantId = _b.variantId, threshold = _b.threshold, adminId = _b.adminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0:
                    if (threshold < 0)
                        throw new errors_1.AppError('INVALID_THRESHOLD', 400);
                    return [4 /*yield*/, (0, db_2.updateVariantLowStockThreshold)({ variantId: variantId, threshold: threshold })];
                case 1:
                    stock = _c.sent();
                    if (!stock)
                        throw new errors_1.AppError('VARIANT_NOT_FOUND', 404);
                    return [2 /*return*/, stock];
            }
        });
    });
}
// —— Barcode scan ——
function scanBarcode(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var unit;
        var barcodeValue = _b.barcodeValue;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.getInventoryUnitByBarcode)({ barcodeValue: barcodeValue })];
                case 1:
                    unit = _c.sent();
                    if (!unit)
                        throw new errors_1.AppError('BARCODE_NOT_FOUND', 404);
                    return [2 /*return*/, unit];
            }
        });
    });
}
// —— Reconciliation ——
function runReconciliation(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var variantIds, _c, logs, _i, variantIds_1, vid, actualCount, stock, aggregateCount, log;
        var variantId = _b.variantId, adminId = _b.adminId;
        return __generator(this, function (_d) {
            switch (_d.label) {
                case 0:
                    if (!(variantId != null)) return [3 /*break*/, 1];
                    _c = [variantId];
                    return [3 /*break*/, 3];
                case 1: return [4 /*yield*/, (0, db_2.listActiveVariantIds)()];
                case 2:
                    _c = _d.sent();
                    _d.label = 3;
                case 3:
                    variantIds = _c;
                    logs = [];
                    _i = 0, variantIds_1 = variantIds;
                    _d.label = 4;
                case 4:
                    if (!(_i < variantIds_1.length)) return [3 /*break*/, 9];
                    vid = variantIds_1[_i];
                    return [4 /*yield*/, (0, db_2.countInStockUnits)({ variantId: vid })];
                case 5:
                    actualCount = _d.sent();
                    return [4 /*yield*/, getVariantStock({ variantId: vid })];
                case 6:
                    stock = _d.sent();
                    if (!stock)
                        return [3 /*break*/, 8];
                    aggregateCount = stock.in_stock_qty;
                    if (!(actualCount !== aggregateCount)) return [3 /*break*/, 8];
                    return [4 /*yield*/, (0, db_2.createReconciliationLog)({
                            variantId: vid,
                            actualCount: actualCount,
                            aggregateCount: aggregateCount,
                        })];
                case 7:
                    log = _d.sent();
                    logs.push(log);
                    _d.label = 8;
                case 8:
                    _i++;
                    return [3 /*break*/, 4];
                case 9: return [2 /*return*/, {
                        checked: variantIds.length,
                        discrepanciesFound: logs.length,
                        logs: logs,
                    }];
            }
        });
    });
}
function getReconciliationLog(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var variantId = _b.variantId, unresolvedOnly = _b.unresolvedOnly;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.listReconciliationLog)({
                        variantId: variantId,
                        unresolvedOnly: unresolvedOnly,
                    })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
function markReconciliationResolved(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var log;
        var logId = _b.logId, resolvedNote = _b.resolvedNote, adminId = _b.adminId;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.markReconciliationResolved)({ id: logId, resolvedNote: resolvedNote })];
                case 1:
                    log = _c.sent();
                    if (!log)
                        throw new errors_1.AppError('LOG_ENTRY_NOT_FOUND', 404);
                    return [2 /*return*/, log];
            }
        });
    });
}
// —— Admin list ——
function listUnitsForVariant(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var variantId = _b.variantId, status = _b.status;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.listInventoryUnitsForVariant)({ variantId: variantId, status: status })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
function getMovementHistory(_a) {
    return __awaiter(this, arguments, void 0, function (_b) {
        var variantId = _b.variantId, limit = _b.limit, offset = _b.offset;
        return __generator(this, function (_c) {
            switch (_c.label) {
                case 0: return [4 /*yield*/, (0, db_2.listInventoryMovements)({ variantId: variantId, limit: limit, offset: offset })];
                case 1: return [2 /*return*/, _c.sent()];
            }
        });
    });
}
