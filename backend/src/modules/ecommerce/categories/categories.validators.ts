import { z } from 'zod';

export const createCategorySchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        slug: z.string().min(1).max(255),
        parentId: z.string().uuid().optional().nullable(),
        image: z.string().optional().nullable(),
        sortOrder: z.coerce.number().int().min(0).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const updateCategorySchema = z.object({
    body: createCategorySchema.shape.body.partial(),
});

export const categoryQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        isActive: z.coerce.boolean().optional(),
        parentId: z.string().uuid().optional().nullable(),
        search: z.string().optional(),
        sortBy: z.enum(['createdAt', 'name', 'sortOrder']).default('sortOrder'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const categoryIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
