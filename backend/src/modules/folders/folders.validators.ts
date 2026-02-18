import { z } from 'zod';

export const createFolderSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255),
        parentId: z.string().uuid().optional().nullable(),
        description: z.string().max(500).optional().nullable(),
    }),
});

export const updateFolderSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255).optional(),
        parentId: z.string().uuid().optional().nullable(),
        description: z.string().max(500).optional().nullable(),
    }),
});

export const folderQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(50),
        parentId: z.string().uuid().optional().nullable(),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'createdAt']).default('name'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const folderIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
