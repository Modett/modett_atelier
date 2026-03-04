/**
 * Application errors — expected errors with stable codes and status codes.
 * Route handlers catch AppError and return { error: { code, message } }.
 * Unexpected errors go to global handler → Sentry → 500.
 */
export declare class AppError extends Error {
    readonly code: string;
    readonly statusCode: number;
    constructor(code: string, statusCode: number, message?: string);
}
//# sourceMappingURL=errors.d.ts.map