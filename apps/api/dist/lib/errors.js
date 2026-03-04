"use strict";
/**
 * Application errors — expected errors with stable codes and status codes.
 * Route handlers catch AppError and return { error: { code, message } }.
 * Unexpected errors go to global handler → Sentry → 500.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.AppError = void 0;
class AppError extends Error {
    code;
    statusCode;
    constructor(code, statusCode, message) {
        super(message ?? code);
        this.code = code;
        this.statusCode = statusCode;
        this.name = 'AppError';
        Object.setPrototypeOf(this, AppError.prototype);
    }
}
exports.AppError = AppError;
//# sourceMappingURL=errors.js.map