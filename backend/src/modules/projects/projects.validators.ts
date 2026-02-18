import { z } from 'zod';

// ============================================================================
// PROJECTS - Create Project
// ============================================================================

const milestoneSchema = z.object({
    title: z.string().min(1).max(255),
    dueDate: z.string().datetime().optional().nullable(),
    isCompleted: z.boolean().default(false),
});

export const createProjectSchema = z.object({
    body: z.object({
        // Basic Info
        projectTitle: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        category: z.string().max(100).optional().nullable(),
        projectManagerId: z.string().uuid().optional().nullable(),

        // Timeline & Progress
        startDate: z.string().datetime().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        progressPercentage: z.number().min(0).max(100).default(0),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('NOT_STARTED'),

        // Milestones
        milestones: z.array(milestoneSchema).default([]),

        // Team Members
        teamMembers: z.array(z.string().uuid()).default([]),

        // Attachments
        attachments: z.array(z.object({
            name: z.string(),
            url: z.string().url(),
            type: z.string().optional(),
        })).default([]),

        // Status & Priority
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),

        // Budget & Time
        budget: z.number().min(0).optional().nullable(),
        estimatedHours: z.number().min(0).optional().nullable(),

        // Tags & Notifications
        tags: z.array(z.string()).default([]),
        notifyTeamMembers: z.boolean().default(false),
    }),
});

export const updateProjectSchema = z.object({
    body: z.object({
        // Basic Info
        projectTitle: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        category: z.string().max(100).optional().nullable(),
        projectManagerId: z.string().uuid().optional().nullable(),

        // Timeline & Progress
        startDate: z.string().datetime().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        progressPercentage: z.number().min(0).max(100).optional(),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),

        // Milestones
        milestones: z.array(milestoneSchema).optional(),

        // Team Members
        teamMembers: z.array(z.string().uuid()).optional(),

        // Attachments
        attachments: z.array(z.object({
            name: z.string(),
            url: z.string().url(),
            type: z.string().optional(),
        })).optional(),

        // Status & Priority
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),

        // Budget & Time
        budget: z.number().min(0).optional().nullable(),
        estimatedHours: z.number().min(0).optional().nullable(),

        // Tags & Notifications
        tags: z.array(z.string()).optional(),
        notifyTeamMembers: z.boolean().optional(),
    }),
});

export const projectQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
        priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        clientId: z.string().uuid().optional(),
        projectManagerId: z.string().uuid().optional(),
        sortBy: z.enum(['projectTitle', 'createdAt', 'dueDate', 'priority']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const projectIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
