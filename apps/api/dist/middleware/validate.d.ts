/**
 * Zod validation middleware.
 * Validates request body against a schema and replaces req.body with the parsed value.
 * On validation error returns 400 { error: { code: 'VALIDATION_ERROR', message, details } }.
 */
import type { Request, Response, NextFunction } from 'express';
import type { z, ZodTypeAny } from 'zod';
export type ValidatedBody<T extends ZodTypeAny> = Request & {
    body: z.infer<T>;
};
export declare function validate<T extends ZodTypeAny>(schema: T): (req: Request, res: Response, next: NextFunction) => void;
//# sourceMappingURL=validate.d.ts.map