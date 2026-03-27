/**
 * DB-layer errors — same shape as AppError so API global handler returns correct response.
 * Used by withInventoryLock when lock cannot be acquired; checkout queries for 0-row outcomes.
 */
export declare class LockNotAcquiredError extends Error {
    readonly code = "LOCK_NOT_ACQUIRED";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class ReservationNotHeldError extends Error {
    readonly code = "RESERVATION_NOT_HELD";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class InsufficientStockError extends Error {
    readonly code = "INSUFFICIENT_STOCK";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class OrderNotDraftError extends Error {
    readonly code = "ORDER_NOT_DRAFT";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class IntentNotPendingError extends Error {
    readonly code = "INTENT_NOT_PENDING";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class CartAlreadyCheckedOutError extends Error {
    readonly code = "CART_ALREADY_CHECKED_OUT";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class StockConfirmFailedError extends Error {
    readonly code = "STOCK_CONFIRM_FAILED";
    readonly statusCode = 409;
    constructor(message?: string);
}
/** Used by orders module for transition/update failures (0 rows). API maps to 409/404. */
export declare class OrderOperationError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, statusCode?: number, message?: string);
}
export declare class LoyaltyAccountNotFoundError extends Error {
    readonly code = "LOYALTY_ACCOUNT_NOT_FOUND";
    readonly statusCode = 404;
    constructor(message?: string);
}
export declare class InsufficientPointsError extends Error {
    readonly code = "INSUFFICIENT_POINTS";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class LoyaltyRulesNotFoundError extends Error {
    readonly code = "LOYALTY_RULES_NOT_FOUND";
    readonly statusCode: number;
    constructor(statusCode?: number, message?: string);
}
export declare class BalanceWouldGoNegativeError extends Error {
    readonly code = "BALANCE_WOULD_GO_NEGATIVE";
    readonly statusCode = 409;
    constructor(message?: string);
}
export declare class LoyaltyLockNotAcquiredError extends Error {
    readonly code = "LOYALTY_LOCK_NOT_ACQUIRED";
    readonly statusCode = 409;
    constructor(message?: string);
}
/** Messaging module — API maps to same code/statusCode. */
export declare class MessagingError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, statusCode: number, message?: string);
}
//# sourceMappingURL=errors.d.ts.map