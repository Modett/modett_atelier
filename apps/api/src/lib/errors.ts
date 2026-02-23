/**
 * Application errors — expected errors with stable codes and status codes.
 * Route handlers catch AppError and return { error: { code, message } }.
 * Unexpected errors go to global handler → Sentry → 500.
 */

export class AppError extends Error {
  constructor(
    public readonly code: string,
    public readonly statusCode: number,
    message?: string,
  ) {
    super(message ?? code)
    this.name = 'AppError'
    Object.setPrototypeOf(this, AppError.prototype)
  }
}
