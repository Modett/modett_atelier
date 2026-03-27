"use strict";
/**
 * DB-layer errors — same shape as AppError so API global handler returns correct response.
 * Used by withInventoryLock when lock cannot be acquired; checkout queries for 0-row outcomes.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.MessagingError = exports.LoyaltyLockNotAcquiredError = exports.BalanceWouldGoNegativeError = exports.LoyaltyRulesNotFoundError = exports.InsufficientPointsError = exports.LoyaltyAccountNotFoundError = exports.OrderOperationError = exports.StockConfirmFailedError = exports.CartAlreadyCheckedOutError = exports.IntentNotPendingError = exports.OrderNotDraftError = exports.InsufficientStockError = exports.ReservationNotHeldError = exports.LockNotAcquiredError = void 0;
class LockNotAcquiredError extends Error {
    code = 'LOCK_NOT_ACQUIRED';
    statusCode = 409;
    constructor(message = 'LOCK_NOT_ACQUIRED') {
        super(message);
        this.name = 'LockNotAcquiredError';
        Object.setPrototypeOf(this, LockNotAcquiredError.prototype);
    }
}
exports.LockNotAcquiredError = LockNotAcquiredError;
class ReservationNotHeldError extends Error {
    code = 'RESERVATION_NOT_HELD';
    statusCode = 409;
    constructor(message = 'RESERVATION_NOT_HELD') {
        super(message);
        this.name = 'ReservationNotHeldError';
        Object.setPrototypeOf(this, ReservationNotHeldError.prototype);
    }
}
exports.ReservationNotHeldError = ReservationNotHeldError;
class InsufficientStockError extends Error {
    code = 'INSUFFICIENT_STOCK';
    statusCode = 409;
    constructor(message = 'INSUFFICIENT_STOCK') {
        super(message);
        this.name = 'InsufficientStockError';
        Object.setPrototypeOf(this, InsufficientStockError.prototype);
    }
}
exports.InsufficientStockError = InsufficientStockError;
class OrderNotDraftError extends Error {
    code = 'ORDER_NOT_DRAFT';
    statusCode = 409;
    constructor(message = 'ORDER_NOT_DRAFT') {
        super(message);
        this.name = 'OrderNotDraftError';
        Object.setPrototypeOf(this, OrderNotDraftError.prototype);
    }
}
exports.OrderNotDraftError = OrderNotDraftError;
class IntentNotPendingError extends Error {
    code = 'INTENT_NOT_PENDING';
    statusCode = 409;
    constructor(message = 'INTENT_NOT_PENDING') {
        super(message);
        this.name = 'IntentNotPendingError';
        Object.setPrototypeOf(this, IntentNotPendingError.prototype);
    }
}
exports.IntentNotPendingError = IntentNotPendingError;
class CartAlreadyCheckedOutError extends Error {
    code = 'CART_ALREADY_CHECKED_OUT';
    statusCode = 409;
    constructor(message = 'CART_ALREADY_CHECKED_OUT') {
        super(message);
        this.name = 'CartAlreadyCheckedOutError';
        Object.setPrototypeOf(this, CartAlreadyCheckedOutError.prototype);
    }
}
exports.CartAlreadyCheckedOutError = CartAlreadyCheckedOutError;
class StockConfirmFailedError extends Error {
    code = 'STOCK_CONFIRM_FAILED';
    statusCode = 409;
    constructor(message = 'STOCK_CONFIRM_FAILED') {
        super(message);
        this.name = 'StockConfirmFailedError';
        Object.setPrototypeOf(this, StockConfirmFailedError.prototype);
    }
}
exports.StockConfirmFailedError = StockConfirmFailedError;
/** Used by orders module for transition/update failures (0 rows). API maps to 409/404. */
class OrderOperationError extends Error {
    code;
    statusCode;
    constructor(code, statusCode = 409, message) {
        super(message ?? code);
        this.name = 'OrderOperationError';
        this.code = code;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, OrderOperationError.prototype);
    }
}
exports.OrderOperationError = OrderOperationError;
// Loyalty module — API maps these to AppError with same code/statusCode
class LoyaltyAccountNotFoundError extends Error {
    code = 'LOYALTY_ACCOUNT_NOT_FOUND';
    statusCode = 404;
    constructor(message = 'LOYALTY_ACCOUNT_NOT_FOUND') {
        super(message);
        this.name = 'LoyaltyAccountNotFoundError';
        Object.setPrototypeOf(this, LoyaltyAccountNotFoundError.prototype);
    }
}
exports.LoyaltyAccountNotFoundError = LoyaltyAccountNotFoundError;
class InsufficientPointsError extends Error {
    code = 'INSUFFICIENT_POINTS';
    statusCode = 409;
    constructor(message = 'INSUFFICIENT_POINTS') {
        super(message);
        this.name = 'InsufficientPointsError';
        Object.setPrototypeOf(this, InsufficientPointsError.prototype);
    }
}
exports.InsufficientPointsError = InsufficientPointsError;
class LoyaltyRulesNotFoundError extends Error {
    code = 'LOYALTY_RULES_NOT_FOUND';
    statusCode;
    constructor(statusCode = 404, message = 'LOYALTY_RULES_NOT_FOUND') {
        super(message);
        this.name = 'LoyaltyRulesNotFoundError';
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, LoyaltyRulesNotFoundError.prototype);
    }
}
exports.LoyaltyRulesNotFoundError = LoyaltyRulesNotFoundError;
class BalanceWouldGoNegativeError extends Error {
    code = 'BALANCE_WOULD_GO_NEGATIVE';
    statusCode = 409;
    constructor(message = 'BALANCE_WOULD_GO_NEGATIVE') {
        super(message);
        this.name = 'BalanceWouldGoNegativeError';
        Object.setPrototypeOf(this, BalanceWouldGoNegativeError.prototype);
    }
}
exports.BalanceWouldGoNegativeError = BalanceWouldGoNegativeError;
class LoyaltyLockNotAcquiredError extends Error {
    code = 'LOYALTY_LOCK_NOT_ACQUIRED';
    statusCode = 409;
    constructor(message = 'LOYALTY_LOCK_NOT_ACQUIRED') {
        super(message);
        this.name = 'LoyaltyLockNotAcquiredError';
        Object.setPrototypeOf(this, LoyaltyLockNotAcquiredError.prototype);
    }
}
exports.LoyaltyLockNotAcquiredError = LoyaltyLockNotAcquiredError;
/** Messaging module — API maps to same code/statusCode. */
class MessagingError extends Error {
    code;
    statusCode;
    constructor(code, statusCode, message) {
        super(message ?? code);
        this.name = 'MessagingError';
        this.code = code;
        this.statusCode = statusCode;
        Object.setPrototypeOf(this, MessagingError.prototype);
    }
}
exports.MessagingError = MessagingError;
