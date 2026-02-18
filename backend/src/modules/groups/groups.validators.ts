import { z } from 'zod';

export const createGroupSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100),
        description: z.string().max(500).optional().nullable(),
        color: z.string().max(20).optional().nullable(),
        autoUpdateEnabled: z.boolean().default(false),
        autoUpdateRules: z.record(z.unknown()).optional(),
    }),
});

export const updateGroupSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(100).optional(),
        description: z.string().max(500).optional().nullable(),
        color: z.string().max(20).optional().nullable(),
        autoUpdateEnabled: z.boolean().optional(),
        autoUpdateRules: z.record(z.unknown()).optional(),
    }),
});

export const groupQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        sortBy: z.enum(['name', 'createdAt']).default('name'),
        sortOrder: z.enum(['asc', 'desc']).default('asc'),
    }),
});

export const groupIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export const addMembersSchema = z.object({
    body: z.object({
        clientIds: z.array(z.string().uuid()).min(1),
    }),
});

export const removeMembersSchema = z.object({
    params: z.object({
        id: z.string().uuid(),
        clientId: z.string().uuid(),
    }),
});
