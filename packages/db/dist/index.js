"use strict";
/**
 * @modett/db — database client, schema, and inferred types
 *
 * Usage:
 *   import { db, users } from '@modett/db'
 *   import type { User, Order } from '@modett/db'
 *   const [user] = await db.select().from(users).where(eq(users.email, '...'))
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
exports.MessagingError = exports.LoyaltyLockNotAcquiredError = exports.BalanceWouldGoNegativeError = exports.LoyaltyRulesNotFoundError = exports.InsufficientPointsError = exports.LoyaltyAccountNotFoundError = exports.OrderOperationError = exports.StockConfirmFailedError = exports.CartAlreadyCheckedOutError = exports.IntentNotPendingError = exports.OrderNotDraftError = exports.InsufficientStockError = exports.ReservationNotHeldError = exports.LockNotAcquiredError = exports.withInventoryLock = exports.redis = exports.db = void 0;
var client_1 = require("./client");
Object.defineProperty(exports, "db", { enumerable: true, get: function () { return client_1.db; } });
var redis_1 = require("./redis");
Object.defineProperty(exports, "redis", { enumerable: true, get: function () { return redis_1.redis; } });
Object.defineProperty(exports, "withInventoryLock", { enumerable: true, get: function () { return redis_1.withInventoryLock; } });
var errors_1 = require("./errors");
Object.defineProperty(exports, "LockNotAcquiredError", { enumerable: true, get: function () { return errors_1.LockNotAcquiredError; } });
Object.defineProperty(exports, "ReservationNotHeldError", { enumerable: true, get: function () { return errors_1.ReservationNotHeldError; } });
Object.defineProperty(exports, "InsufficientStockError", { enumerable: true, get: function () { return errors_1.InsufficientStockError; } });
Object.defineProperty(exports, "OrderNotDraftError", { enumerable: true, get: function () { return errors_1.OrderNotDraftError; } });
Object.defineProperty(exports, "IntentNotPendingError", { enumerable: true, get: function () { return errors_1.IntentNotPendingError; } });
Object.defineProperty(exports, "CartAlreadyCheckedOutError", { enumerable: true, get: function () { return errors_1.CartAlreadyCheckedOutError; } });
Object.defineProperty(exports, "StockConfirmFailedError", { enumerable: true, get: function () { return errors_1.StockConfirmFailedError; } });
Object.defineProperty(exports, "OrderOperationError", { enumerable: true, get: function () { return errors_1.OrderOperationError; } });
Object.defineProperty(exports, "LoyaltyAccountNotFoundError", { enumerable: true, get: function () { return errors_1.LoyaltyAccountNotFoundError; } });
Object.defineProperty(exports, "InsufficientPointsError", { enumerable: true, get: function () { return errors_1.InsufficientPointsError; } });
Object.defineProperty(exports, "LoyaltyRulesNotFoundError", { enumerable: true, get: function () { return errors_1.LoyaltyRulesNotFoundError; } });
Object.defineProperty(exports, "BalanceWouldGoNegativeError", { enumerable: true, get: function () { return errors_1.BalanceWouldGoNegativeError; } });
Object.defineProperty(exports, "LoyaltyLockNotAcquiredError", { enumerable: true, get: function () { return errors_1.LoyaltyLockNotAcquiredError; } });
Object.defineProperty(exports, "MessagingError", { enumerable: true, get: function () { return errors_1.MessagingError; } });
__exportStar(require("./schema/index"), exports);
__exportStar(require("./queries/iam"), exports);
__exportStar(require("./queries/catalog"), exports);
__exportStar(require("./queries/inventory"), exports);
__exportStar(require("./queries/cart"), exports);
__exportStar(require("./queries/checkout"), exports);
__exportStar(require("./queries/orders"), exports);
__exportStar(require("./queries/payments"), exports);
__exportStar(require("./queries/shipping"), exports);
__exportStar(require("./queries/returns"), exports);
__exportStar(require("./queries/reviews"), exports);
__exportStar(require("./queries/loyalty"), exports);
__exportStar(require("./queries/messaging"), exports);
