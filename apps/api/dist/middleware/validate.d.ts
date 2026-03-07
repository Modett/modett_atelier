/**
 * Zod validation middleware.
 * Validates request body or query against a schema.
 * On validation error returns 400 { error: { code: 'VALIDATION_ERROR', message, details } }.
 */
import type { Request, Response, NextFunction } from 'express';
import type { z, ZodTypeAny } from 'zod';
export type ValidatedBody<T extends ZodTypeAny> = Request & {
    body: z.infer<T>;
};
export type ValidatedQuery<T extends ZodTypeAny> = Request & {
    validatedQuery: z.infer<T>;
};
export declare function validate<T extends ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
export declare function validateQuery<T extends ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map