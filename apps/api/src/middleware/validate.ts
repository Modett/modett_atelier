/**
 * Zod validation middleware.
 * Validates request body against a schema and replaces req.body with the parsed value.
 * On validation error returns 400 { error: { code: 'VALIDATION_ERROR', message, details } }.
 */

import type { Request, Response, NextFunction } from 'express'
import type { z, ZodSchema } from 'zod'

export type ValidatedBody<T> = Request & { body: z.infer<T> }

export function validate<T extends ZodSchema>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.body)
    if (result.success) {
      ;(req as ValidatedBody<T>).body = result.data
      next()
      return
    }
    const details = result.error.flatten()
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid request body',
        details: details.fieldErrors,
      },
    })
  }
}
