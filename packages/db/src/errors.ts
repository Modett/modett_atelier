/**
 * DB-layer errors — same shape as AppError so API global handler returns correct response.
 * Used by withInventoryLock when lock cannot be acquired; checkout queries for 0-row outcomes.
 */

export class LockNotAcquiredError extends Error {
  readonly code = 'LOCK_NOT_ACQUIRED'
  readonly statusCode = 409

  constructor(message = 'LOCK_NOT_ACQUIRED') {
    super(message)
    this.name = 'LockNotAcquiredError'
    Object.setPrototypeOf(this, LockNotAcquiredError.prototype)
  }
}

export class ReservationNotHeldError extends Error {
  readonly code = 'RESERVATION_NOT_HELD'
  readonly statusCode = 409

  constructor(message = 'RESERVATION_NOT_HELD') {
    super(message)
    this.name = 'ReservationNotHeldError'
    Object.setPrototypeOf(this, ReservationNotHeldError.prototype)
  }
}

export class InsufficientStockError extends Error {
  readonly code = 'INSUFFICIENT_STOCK'
  readonly statusCode = 409

  constructor(message = 'INSUFFICIENT_STOCK') {
    super(message)
    this.name = 'InsufficientStockError'
    Object.setPrototypeOf(this, InsufficientStockError.prototype)
  }
}

export class OrderNotDraftError extends Error {
  readonly code = 'ORDER_NOT_DRAFT'
  readonly statusCode = 409

  constructor(message = 'ORDER_NOT_DRAFT') {
    super(message)
    this.name = 'OrderNotDraftError'
    Object.setPrototypeOf(this, OrderNotDraftError.prototype)
  }
}

export class IntentNotPendingError extends Error {
  readonly code = 'INTENT_NOT_PENDING'
  readonly statusCode = 409

  constructor(message = 'INTENT_NOT_PENDING') {
    super(message)
    this.name = 'IntentNotPendingError'
    Object.setPrototypeOf(this, IntentNotPendingError.prototype)
  }
}

export class CartAlreadyCheckedOutError extends Error {
  readonly code = 'CART_ALREADY_CHECKED_OUT'
  readonly statusCode = 409

  constructor(message = 'CART_ALREADY_CHECKED_OUT') {
    super(message)
    this.name = 'CartAlreadyCheckedOutError'
    Object.setPrototypeOf(this, CartAlreadyCheckedOutError.prototype)
  }
}

export class StockConfirmFailedError extends Error {
  readonly code = 'STOCK_CONFIRM_FAILED'
  readonly statusCode = 409

  constructor(message = 'STOCK_CONFIRM_FAILED') {
    super(message)
    this.name = 'StockConfirmFailedError'
    Object.setPrototypeOf(this, StockConfirmFailedError.prototype)
  }
}

/** Used by orders module for transition/update failures (0 rows). API maps to 409/404. */
export class OrderOperationError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(code: string, statusCode = 409, message?: string) {
    super(message ?? code)
    this.name = 'OrderOperationError'
    this.code = code
    this.statusCode = statusCode
    Object.setPrototypeOf(this, OrderOperationError.prototype)
  }
}

// Loyalty module — API maps these to AppError with same code/statusCode
export class LoyaltyAccountNotFoundError extends Error {
  readonly code = 'LOYALTY_ACCOUNT_NOT_FOUND'
  readonly statusCode = 404

  constructor(message = 'LOYALTY_ACCOUNT_NOT_FOUND') {
    super(message)
    this.name = 'LoyaltyAccountNotFoundError'
    Object.setPrototypeOf(this, LoyaltyAccountNotFoundError.prototype)
  }
}

export class InsufficientPointsError extends Error {
  readonly code = 'INSUFFICIENT_POINTS'
  readonly statusCode = 409

  constructor(message = 'INSUFFICIENT_POINTS') {
    super(message)
    this.name = 'InsufficientPointsError'
    Object.setPrototypeOf(this, InsufficientPointsError.prototype)
  }
}

export class LoyaltyRulesNotFoundError extends Error {
  readonly code = 'LOYALTY_RULES_NOT_FOUND'
  readonly statusCode: number

  constructor(statusCode = 404, message = 'LOYALTY_RULES_NOT_FOUND') {
    super(message)
    this.name = 'LoyaltyRulesNotFoundError'
    this.statusCode = statusCode
    Object.setPrototypeOf(this, LoyaltyRulesNotFoundError.prototype)
  }
}

export class BalanceWouldGoNegativeError extends Error {
  readonly code = 'BALANCE_WOULD_GO_NEGATIVE'
  readonly statusCode = 409

  constructor(message = 'BALANCE_WOULD_GO_NEGATIVE') {
    super(message)
    this.name = 'BalanceWouldGoNegativeError'
    Object.setPrototypeOf(this, BalanceWouldGoNegativeError.prototype)
  }
}

export class LoyaltyLockNotAcquiredError extends Error {
  readonly code = 'LOYALTY_LOCK_NOT_ACQUIRED'
  readonly statusCode = 409

  constructor(message = 'LOYALTY_LOCK_NOT_ACQUIRED') {
    super(message)
    this.name = 'LoyaltyLockNotAcquiredError'
    Object.setPrototypeOf(this, LoyaltyLockNotAcquiredError.prototype)
  }
}

/** Messaging module — API maps to same code/statusCode. */
export class MessagingError extends Error {
  readonly code: string
  readonly statusCode: number

  constructor(code: string, statusCode: number, message?: string) {
    super(message ?? code)
    this.name = 'MessagingError'
    this.code = code
    this.statusCode = statusCode
    Object.setPrototypeOf(this, MessagingError.prototype)
  }
}
