"use strict";
/**
 * Zod validation middleware.
 * Validates request body against a schema and replaces req.body with the parsed value.
 * On validation error returns 400 { error: { code: 'VALIDATION_ERROR', message, details } }.
 */
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
function validate(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.body);
        if (result.success) {
            ;
            req.body = result.data;
            next();
            return;
        }
        const details = result.error.flatten();
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid request body',
                details: details.fieldErrors,
            },
        });
    };
}
//# sourceMappingURL=validate.js.map