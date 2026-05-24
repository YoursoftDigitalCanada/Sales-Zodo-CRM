import { z } from 'zod';

const taskStatusSchema = z.enum(['TODO', 'PENDING', 'IN_PROGRESS', 'REVIEW', 'COMPLETED', 'DONE', 'CANCELLED', 'BLOCKED']);
const taskPrioritySchema = z.enum(['LOW', 'NORMAL', 'MEDIUM', 'HIGH', 'URGENT']);
const taskReferenceDoctypeSchema = z.enum([
    'Lead',
    'CRM Lead',
    'Contact',
    'Client',
    'Organization',
    'CRM Organization',
    'Deal',
    'Project',
    'CRM Deal',
    'Proposal',
    'Contract',
    'Invoice',
    'DealAutomation',
    'SalesAutomation',
    'SalesReminderSchedule',
    'SubscriptionAutomation',
    'SalesAI',
]).optional().nullable();
const taskSubtaskSchema = z.object({
    id: z.string().uuid().optional(),
    title: z.string().trim().min(1).max(255),
    completed: z.boolean().optional(),
});

// ============================================================================
// TASKS - Create Task
// ============================================================================

export const createTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255),
        description: z.string().optional().nullable(),
        status: taskStatusSchema.default('TODO'),
        priority: taskPrioritySchema.default('MEDIUM'),
        assignedToId: z.string().uuid().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        startDate: z.string().datetime().optional().nullable(),
        tags: z.array(z.string()).default([]),
        projectId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
        contactId: z.string().uuid().optional().nullable(),
        referenceDoctype: taskReferenceDoctypeSchema,
        referenceDocname: z.string().max(255).optional().nullable(),
        estimatedHours: z.number().optional().nullable(),
        actualMinutes: z.number().int().min(0).optional().nullable(),
        category: z.string().trim().max(100).optional().nullable(),
        subtasks: z.array(taskSubtaskSchema).default([]),
        isStarred: z.boolean().optional(),
        isRecurring: z.boolean().optional(),
    }).refine((data) => !data.referenceDoctype || Boolean(data.referenceDocname), {
        message: 'Reference id is required when a reference type is selected',
        path: ['referenceDocname'],
    }),
});

export const updateTaskSchema = z.object({
    body: z.object({
        title: z.string().min(1).max(255).optional(),
        description: z.string().optional().nullable(),
        status: taskStatusSchema.optional(),
        priority: taskPrioritySchema.optional(),
        assignedToId: z.string().uuid().optional().nullable(),
        dueDate: z.string().datetime().optional().nullable(),
        startDate: z.string().datetime().optional().nullable(),
        tags: z.array(z.string()).optional(),
        projectId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        leadId: z.string().uuid().optional().nullable(),
        contactId: z.string().uuid().optional().nullable(),
        referenceDoctype: taskReferenceDoctypeSchema,
        referenceDocname: z.string().max(255).optional().nullable(),
        estimatedHours: z.number().optional().nullable(),
        actualMinutes: z.number().int().min(0).optional().nullable(),
        category: z.string().trim().max(100).optional().nullable(),
        subtasks: z.array(taskSubtaskSchema).optional(),
        isStarred: z.boolean().optional(),
        isRecurring: z.boolean().optional(),
    }).refine((data) => !data.referenceDoctype || Boolean(data.referenceDocname), {
        message: 'Reference id is required when a reference type is selected',
        path: ['referenceDocname'],
    }),
});

export const taskQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(20),
        search: z.string().optional(),
        status: taskStatusSchema.optional(),
        priority: taskPrioritySchema.optional(),
        assignedToId: z.string().uuid().optional(),
        projectId: z.string().uuid().optional(),
        clientId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        contactId: z.string().uuid().optional(),
        sortBy: z.enum(['title', 'createdAt', 'dueDate', 'priority']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const taskIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

export const taskStatusUpdateSchema = z.object({
    body: z.object({
        status: taskStatusSchema,
    }),
});
