import { z } from 'zod';

export const createRoleSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional().nullable(),
        permissions: z.array(z.string()).default([]),
        isDefault: z.boolean().default(false),
    }),
});

export const updateRoleSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        permissions: z.array(z.string()).optional(),
        isDefault: z.boolean().optional(),
    }),
});

export const roleQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'createdAt']).default('name'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const roleIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
