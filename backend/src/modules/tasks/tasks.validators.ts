import { z } from 'zod';

// ============================================================================
// TASKS - Create Task
// ============================================================================

export const createTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).default('TODO'),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        assignedToId: z.string().uuid().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        tags: z.array(z.string()).default([]),
        projectId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        estimatedHours: z.number().optional().nullable(),
    }),
});

export const updateTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        assignedToId: z.string().uuid().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        tags: z.array(z.string()).optional(),
        projectId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        estimatedHours: z.number().optional().nullable(),
    }),
});

export const taskQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        assignedToId: z.string().uuid().optional(),
        projectId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        sortBy: z.enum(['title', 'createdAt', 'dueDate', 'priority']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const taskIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
