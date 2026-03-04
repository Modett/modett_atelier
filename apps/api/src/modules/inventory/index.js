"use strict";
/**
 * Inventory module — admin stock management, restock, damage, adjustment, reconciliation.
 * Exports routes and service only (for checkout/payments to call holdStock/releaseHold).
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.inventoryService = exports.inventoryRoutes = void 0;
var inventory_routes_1 = require("./inventory.routes");
Object.defineProperty(exports, "inventoryRoutes", { enumerable: true, get: function () { return inventory_routes_1.inventoryRoutes; } });
exports.inventoryService = require("./inventory.service");
