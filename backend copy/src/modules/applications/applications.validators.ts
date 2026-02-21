import { z } from 'zod';

export const createApplicationSchema = z.object({
    body: z.object({
        referenceNumber: z.string().min(1).max(100),
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        formData: z.record(z.any()).optional(),
        internalNotes: z.string().optional().nullable(),
    }),
});

export const updateApplicationSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN']).optional(),
        formData: z.record(z.any()).optional(),
        internalNotes: z.string().optional().nullable(),
    }),
});

export const applicationQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        status: z.enum(['DRAFT', 'SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'REJECTED', 'WITHDRAWN']).optional(),
        search: z.string().optional(),
        sortBy: z.enum(['createdAt', 'updatedAt', 'title', 'referenceNumber']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const applicationIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
