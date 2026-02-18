import { z } from 'zod';

export const createTenantSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        domain: z.string().max(255).optional().nullable(),
        plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE'),
        settings: z.record(z.unknown()).optional(),
    }),
});

export const updateTenantSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255).optional(),
        domain: z.string().max(255).optional().nullable(),
        plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
        settings: z.record(z.unknown()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const tenantQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
        isActive: z.coerce.boolean().optional(),
        sortBy: z.enum(['name', 'createdAt', 'plan']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const tenantIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
