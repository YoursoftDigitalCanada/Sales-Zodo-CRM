import { z } from 'zod';

export const uploadFileSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255).optional(),
        folderId: z.string().uuid().optional().nullable(),
        description: z.string().max(500).optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        projectId: z.string().uuid().optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
        quoteId: z.string().uuid().optional().nullable(),
    }),
});

export const updateFileSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255).optional(),
        folderId: z.string().uuid().optional().nullable(),
        description: z.string().max(500).optional().nullable(),
    }),
});

export const moveFileSchema = z.object({
    body: z.object({
        folderId: z.string().uuid().nullable(),
    }),
});

export const copyFileSchema = z.object({
    body: z.object({
        folderId: z.string().uuid().optional().nullable(),
        name: z.string().min(1).max(255).optional(),
    }),
});

export const shareFileSchema = z.object({
    body: z.object({
        expiresInHours: z.coerce.number().int().min(1).max(8760).optional(), // max 1 year
    }),
});

export const bulkActionSchema = z.object({
    body: z.object({
        fileIds: z.array(z.string().uuid()).min(1).max(100),
    }),
});

export const bulkMoveSchema = z.object({
    body: z.object({
        fileIds: z.array(z.string().uuid()).min(1).max(100),
        folderId: z.string().uuid().nullable(),
    }),
});

export const fileQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        folderId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional(),
        projectId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        quoteId: z.string().uuid().optional(),
        mimeType: z.string().optional(),
        tag: z.string().optional(),
        sortBy: z.enum(['name', 'createdAt', 'size']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const fileIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
