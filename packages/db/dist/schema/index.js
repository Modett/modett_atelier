"use strict";
/**
 * Drizzle schema — single entry point for all modules.
 * Mirrors packages/db/migrations/0001_initial.sql (schemas: iam, catalog, inventory, cart, orders, payments, returns, reviews, loyalty, messaging, shipping, analytics).
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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
__exportStar(require("./iam.schema"), exports);
__exportStar(require("./catalog.schema"), exports);
__exportStar(require("./inventory.schema"), exports);
__exportStar(require("./cart.schema"), exports);
__exportStar(require("./shipping.schema"), exports);
__exportStar(require("./orders.schema"), exports);
__exportStar(require("./payments.schema"), exports);
__exportStar(require("./returns.schema"), exports);
__exportStar(require("./reviews.schema"), exports);
__exportStar(require("./loyalty"), exports);
__exportStar(require("./messaging.schema"), exports);
__exportStar(require("./analytics.schema"), exports);
