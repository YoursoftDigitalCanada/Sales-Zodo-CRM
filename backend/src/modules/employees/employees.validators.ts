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
