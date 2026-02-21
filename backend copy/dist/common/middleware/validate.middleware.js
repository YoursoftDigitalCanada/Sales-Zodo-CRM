"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.searchSchema = exports.idParamSchema = exports.paginationSchema = void 0;
exports.validate = validate;
exports.validateBody = validateBody;
exports.validateQuery = validateQuery;
exports.validateParams = validateParams;
const zod_1 = require("zod");
const HttpErrors_1 = require("../errors/HttpErrors");
/**
 * Validation middleware factory
 * Validates request against a Zod schema
 */
function validate(schema) {
    return async (req, res, next) => {
        try {
            await schema.parseAsync({
                body: req.body,
                query: req.query,
                params: req.params,
            });
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = formatZodErrors(error);
                next(new HttpErrors_1.ValidationError('Validation failed', {
                    errors: formattedErrors,
                }));
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * Validate only request body
 */
function validateBody(schema) {
    return async (req, res, next) => {
        try {
            const result = await schema.parseAsync(req.body);
            req.body = result; // Replace with parsed/transformed data
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = formatZodErrors(error);
                next(new HttpErrors_1.ValidationError('Validation failed', {
                    errors: formattedErrors,
                }));
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * Validate only query parameters
 */
function validateQuery(schema) {
    return async (req, res, next) => {
        try {
            const result = await schema.parseAsync(req.query);
            req.query = result;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = formatZodErrors(error);
                next(new HttpErrors_1.ValidationError('Invalid query parameters', {
                    errors: formattedErrors,
                }));
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * Validate only URL parameters
 */
function validateParams(schema) {
    return async (req, res, next) => {
        try {
            const result = await schema.parseAsync(req.params);
            req.params = result;
            next();
        }
        catch (error) {
            if (error instanceof zod_1.ZodError) {
                const formattedErrors = formatZodErrors(error);
                next(new HttpErrors_1.ValidationError('Invalid URL parameters', {
                    errors: formattedErrors,
                }));
            }
            else {
                next(error);
            }
        }
    };
}
/**
 * Format Zod errors into a more readable format
 */
function formatZodErrors(error) {
    const formattedErrors = {};
    for (const issue of error.issues) {
        const path = issue.path.join('.');
        const key = path || 'general';
        if (!formattedErrors[key]) {
            formattedErrors[key] = [];
        }
        formattedErrors[key].push(issue.message);
    }
    return formattedErrors;
}
/**
 * Common validation schemas
 */
const zod_2 = require("zod");
exports.paginationSchema = zod_2.z.object({
    page: zod_2.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 1))
        .refine((val) => val > 0, 'Page must be a positive number'),
    limit: zod_2.z
        .string()
        .optional()
        .transform((val) => (val ? parseInt(val, 10) : 20))
        .refine((val) => val > 0 && val <= 100, 'Limit must be between 1 and 100'),
    sortBy: zod_2.z.string().optional(),
    sortOrder: zod_2.z.enum(['asc', 'desc']).optional().default('desc'),
});
exports.idParamSchema = zod_2.z.object({
    id: zod_2.z.string().uuid('Invalid ID format'),
});
exports.searchSchema = zod_2.z.object({
    search: zod_2.z.string().optional(),
    ...exports.paginationSchema.shape,
});
//# sourceMappingURL=validate.middleware.js.map