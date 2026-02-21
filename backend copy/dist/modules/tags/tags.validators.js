"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagIdSchema = exports.tagQuerySchema = exports.updateTagSchema = exports.createTagSchema = void 0;
const zod_1 = require("zod");
const hexColorRegex = /^#([A-Fa-f0-9]{6}|[A-Fa-f0-9]{3})$/;
exports.createTagSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(50),
        color: zod_1.z
            .string()
            .regex(hexColorRegex, 'Color must be a valid hex color (e.g., #FF5733)')
            .optional()
            .nullable(),
    }),
});
exports.updateTagSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(50).optional(),
        color: zod_1.z
            .string()
            .regex(hexColorRegex, 'Color must be a valid hex color')
            .optional()
            .nullable(),
    }),
});
exports.tagQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 50)),
        search: zod_1.z.string().optional(),
    }),
});
exports.tagIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid tag ID'),
    }),
});
//# sourceMappingURL=tags.validators.js.map