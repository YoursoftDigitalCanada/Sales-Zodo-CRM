"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.roleIdSchema = exports.roleQuerySchema = exports.updateRoleSchema = exports.createRoleSchema = void 0;
const zod_1 = require("zod");
exports.createRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100),
        description: zod_1.z.string().max(500).optional().nullable(),
        permissions: zod_1.z.array(zod_1.z.string()).default([]),
        isDefault: zod_1.z.boolean().default(false),
    }),
});
exports.updateRoleSchema = zod_1.z.object({
    body: zod_1.z.object({
        name: zod_1.z.string().min(1).max(100).optional(),
        description: zod_1.z.string().max(500).optional().nullable(),
        permissions: zod_1.z.array(zod_1.z.string()).optional(),
        isDefault: zod_1.z.boolean().optional(),
    }),
});
exports.roleQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['name', 'createdAt']).default('name'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('asc'),
    }),
});
exports.roleIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=roles.validators.js.map