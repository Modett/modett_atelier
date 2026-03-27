"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.validate = validate;
exports.validateQuery = validateQuery;
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
function validateQuery(schema) {
    return (req, res, next) => {
        const result = schema.safeParse(req.query);
        if (result.success) {
            ;
            req.validatedQuery = result.data;
            next();
            return;
        }
        const details = result.error.flatten();
        res.status(400).json({
            error: {
                code: 'VALIDATION_ERROR',
                message: 'Invalid query parameters',
                details: details.fieldErrors,
            },
        });
    };
}
