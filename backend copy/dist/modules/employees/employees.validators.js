"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.employeeIdSchema = exports.employeeQuerySchema = exports.updateEmployeeSchema = exports.createEmployeeSchema = void 0;
const zod_1 = require("zod");
exports.createEmployeeSchema = zod_1.z.object({
    body: zod_1.z.object({
        userId: zod_1.z.string().uuid(),
        employeeCode: zod_1.z.string().max(50).optional(),
        department: zod_1.z.string().max(100).optional().nullable(),
        position: zod_1.z.string().max(100).optional().nullable(),
        hireDate: zod_1.z.string().datetime().optional().nullable(),
        salary: zod_1.z.number().min(0).optional().nullable(),
        isActive: zod_1.z.boolean().default(true),
    }),
});
exports.updateEmployeeSchema = zod_1.z.object({
    body: zod_1.z.object({
        employeeCode: zod_1.z.string().max(50).optional(),
        department: zod_1.z.string().max(100).optional().nullable(),
        position: zod_1.z.string().max(100).optional().nullable(),
        hireDate: zod_1.z.string().datetime().optional().nullable(),
        salary: zod_1.z.number().min(0).optional().nullable(),
        isActive: zod_1.z.boolean().optional(),
    }),
});
exports.employeeQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        isActive: zod_1.z.coerce.boolean().optional(),
        department: zod_1.z.string().optional(),
        sortBy: zod_1.z.enum(['createdAt', 'hireDate', 'position']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.employeeIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=employees.validators.js.map