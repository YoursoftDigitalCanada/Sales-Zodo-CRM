import { z } from 'zod';

export const createEmployeeSchema = z.object({
    body: z.object({
        userId: z.string().uuid(),
        employeeCode: z.string().max(50).optional(),
        department: z.string().max(100).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        hireDate: z.string().datetime().optional().nullable(),
        salary: z.number().min(0).optional().nullable(),
        isActive: z.boolean().default(true),
    }),
});

export const updateEmployeeSchema = z.object({
    body: z.object({
        roleId: z.string().uuid().optional(),
        employeeCode: z.string().max(50).optional(),
        department: z.string().max(100).optional().nullable(),
        position: z.string().max(100).optional().nullable(),
        hireDate: z.string().datetime().optional().nullable(),
        salary: z.number().min(0).optional().nullable(),
        isActive: z.boolean().optional(),
    }),
});

export const employeeQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(20),
        search: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        department: z.string().optional(),
        sortBy: z.enum(['createdAt', 'hireDate', 'position']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const employeeIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

const departmentBodySchema = z.object({
    name: z.string().trim().min(2).max(100),
    code: z.string().trim().min(2).max(5).transform((value) => value.toUpperCase()),
    description: z.string().trim().min(10).max(500),
    headId: z.string().optional().nullable(),
    budget: z.coerce.number().min(0),
    color: z.string().trim().min(1).max(20),
    isActive: z.boolean().optional(),
});

export const createDepartmentSchema = z.object({
    body: departmentBodySchema,
});

export const updateDepartmentSchema = z.object({
    body: departmentBodySchema.partial(),
});

export const departmentIdSchema = z.object({
    params: z.object({ departmentId: z.string().min(1) }),
});
