/**
 * Zod validation middleware.
 * Validates request body or query against a schema.
 * On validation error returns 400 { error: { code: 'VALIDATION_ERROR', message, details } }.
 */

import type { Request, Response, NextFunction } from 'express'
import type { z, ZodTypeAny } from 'zod'

export type ValidatedBody<T extends ZodTypeAny> = Request & { body: z.infer<T> }

export type ValidatedQuery<T extends ZodTypeAny> = Request & {
  validatedQuery: z.infer<T>
}

export function validate<T extends ZodTypeAny>(schema: T) {
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

export function validateQuery<T extends ZodTypeAny>(schema: T) {
  return (req: Request, res: Response, next: NextFunction): void => {
    const result = schema.safeParse(req.query)
    if (result.success) {
      ;(req as ValidatedQuery<T>).validatedQuery = result.data
      next()
      return
    }
    const details = result.error.flatten()
    res.status(400).json({
      error: {
        code: 'VALIDATION_ERROR',
        message: 'Invalid query parameters',
        details: details.fieldErrors,
      },
    })
  }
}
