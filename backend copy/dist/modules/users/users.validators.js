"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.userIdSchema = exports.userQuerySchema = exports.updateUserSchema = exports.createUserSchema = void 0;
const zod_1 = require("zod");
exports.createUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        email: zod_1.z.string().email(),
        password: zod_1.z.string().min(8).max(128),
        firstName: zod_1.z.string().min(1).max(100),
        lastName: zod_1.z.string().min(1).max(100),
        phone: zod_1.z.string().max(50).optional().nullable(),
        roleId: zod_1.z.string().uuid().optional(),
        isActive: zod_1.z.boolean().default(true),
    }),
});
exports.updateUserSchema = zod_1.z.object({
    body: zod_1.z.object({
        firstName: zod_1.z.string().min(1).max(100).optional(),
        lastName: zod_1.z.string().min(1).max(100).optional(),
        phone: zod_1.z.string().max(50).optional().nullable(),
        avatar: zod_1.z.string().url().optional().nullable(),
        roleId: zod_1.z.string().uuid().optional().nullable(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.userQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
        roleId: zod_1.z.string().uuid().optional(),
        sortBy: zod_1.z.enum(['firstName', 'lastName', 'email', 'createdAt']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.userIdSchema = zod_1.z.object({
    params: zod_1.z.object({
        id: zod_1.z.string().uuid(),
    }),
});
//# sourceMappingURL=users.validators.js.map