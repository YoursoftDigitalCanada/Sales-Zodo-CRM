import { z } from 'zod';

export const createServiceSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255),
        description: z.string().max(2000).optional().nullable(),
        category: z.string().max(100).optional().nullable(),
        basePrice: z.coerce.number().min(0).optional().nullable(),
        durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
        isActive: z.boolean().default(true),
    }),
});

export const updateServiceSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255).optional(),
        description: z.string().max(2000).optional().nullable(),
        category: z.string().max(100).optional().nullable(),
        basePrice: z.coerce.number().min(0).optional().nullable(),
        durationMinutes: z.coerce.number().int().min(0).optional().nullable(),
        isActive: z.boolean().optional(),
    }),
});

export const serviceQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        category: z.string().optional(),
        isActive: z.coerce.boolean().optional(),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'createdAt', 'basePrice']).default('name'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const serviceIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
