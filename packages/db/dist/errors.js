/**
 * DB-layer errors — same shape as AppError so API global handler returns correct response.
 * Used by withInventoryLock when lock cannot be acquired.
 */
export class LockNotAcquiredError extends Error {
    code = 'LOCK_NOT_ACQUIRED';
    statusCode = 409;
    constructor(message = 'LOCK_NOT_ACQUIRED') {
        super(message);
        this.name = 'LockNotAcquiredError';
        Object.setPrototypeOf(this, LockNotAcquiredError.prototype);
    }
}
