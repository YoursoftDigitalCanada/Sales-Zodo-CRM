"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadSourceIdSchema = exports.leadSourceQuerySchema = exports.updateLeadSourceSchema = exports.createLeadSourceSchema = void 0;
const zod_1 = require("zod");
exports.createLeadSourceSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1, 'Name is required').max(100),
        description: zod_1.z.string().max(500).optional().nullable(),
        isActive: zod_1.z.boolean().optional().default(true),
    }),
});
exports.updateLeadSourceSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().max(500).optional().nullable(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.leadSourceQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 1)),
        limit: zod_1.z.string().optional().transform((val) => (val ? parseInt(val, 10) : 20)),
        search: zod_1.z.string().optional(),
        isActive: zod_1.z.string().optional().transform((val) => val === 'true' ? true : val === 'false' ? false : undefined),
    }),
});
exports.leadSourceIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid('Invalid lead source ID'),
    }),
});
//# sourceMappingURL=lead-sources.validators.js.map