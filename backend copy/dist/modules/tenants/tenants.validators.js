"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantIdSchema = exports.tenantQuerySchema = exports.updateTenantSchema = exports.createTenantSchema = void 0;
const zod_1 = require("zod");
exports.createTenantSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255),
        slug: zod_1.z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        domain: zod_1.z.string().max(255).optional().nullable(),
        plan: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE'),
        settings: zod_1.z.record(zod_1.z.unknown()).optional(),
    }),
});
exports.updateTenantSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(255).optional(),
        domain: zod_1.z.string().max(255).optional().nullable(),
        plan: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
        settings: zod_1.z.record(zod_1.z.unknown()).optional(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.tenantQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        plan: zod_1.z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt', 'plan']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.tenantIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=tenants.validators.js.map