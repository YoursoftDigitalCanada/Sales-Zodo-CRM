"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.projectIdSchema = exports.projectQuerySchema = exports.updateProjectSchema = exports.createProjectSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// PROJECTS - Create Project
// ============================================================================
const milestoneSchema = zod_1.z.object({
    title: zod_1.z.string().min(1).max(255),
    dueDate: zod_1.z.string().datetime().optional().nullable(),
    isCompleted: zod_1.z.boolean().default(false),
});
exports.createProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Basic Info
        projectTitle: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        category: zod_1.z.string().max(100).optional().nullable(),
        projectManagerId: zod_1.z.string().uuid().optional().nullable(),
        // Timeline & Progress
        startDate: zod_1.z.string().datetime().optional().nullable(),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
        progressPercentage: zod_1.z.number().min(0).max(100).default(0),
        status: zod_1.z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).default('NOT_STARTED'),
        // Milestones
        milestones: zod_1.z.array(milestoneSchema).default([]),
        // Team Members
        teamMembers: zod_1.z.array(zod_1.z.string().uuid()).default([]),
        // Attachments
        attachments: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            url: zod_1.z.string().url(),
            type: zod_1.z.string().optional(),
        })).default([]),
        // Status & Priority
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).default('MEDIUM'),
        // Budget & Time
        budget: zod_1.z.number().min(0).optional().nullable(),
        estimatedHours: zod_1.z.number().min(0).optional().nullable(),
        // Tags & Notifications
        tags: zod_1.z.array(zod_1.z.string()).default([]),
        notifyTeamMembers: zod_1.z.boolean().default(false),
    }),
});
exports.updateProjectSchema = zod_1.z.object({
    body: zod_1.z.object({
        // Basic Info
        projectTitle: zod_1.z.string().min(1).max(255).optional(),
        description: zod_1.z.string().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
        category: zod_1.z.string().max(100).optional().nullable(),
        projectManagerId: zod_1.z.string().uuid().optional().nullable(),
        // Timeline & Progress
        startDate: zod_1.z.string().datetime().optional().nullable(),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
        progressPercentage: zod_1.z.number().min(0).max(100).optional(),
        status: zod_1.z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
        // Milestones
        milestones: zod_1.z.array(milestoneSchema).optional(),
        // Team Members
        teamMembers: zod_1.z.array(zod_1.z.string().uuid()).optional(),
        // Attachments
        attachments: zod_1.z.array(zod_1.z.object({
            name: zod_1.z.string(),
            url: zod_1.z.string().url(),
            type: zod_1.z.string().optional(),
        })).optional(),
        // Status & Priority
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        // Budget & Time
        budget: zod_1.z.number().min(0).optional().nullable(),
        estimatedHours: zod_1.z.number().min(0).optional().nullable(),
        // Tags & Notifications
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        notifyTeamMembers: zod_1.z.boolean().optional(),
    }),
});
exports.projectQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(['NOT_STARTED', 'IN_PROGRESS', 'ON_HOLD', 'COMPLETED', 'CANCELLED']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'CRITICAL']).optional(),
        clientId: zod_1.z.string().uuid().optional(),
        projectManagerId: zod_1.z.string().uuid().optional(),
        sortBy: zod_1.z.enum(['projectTitle', 'createdAt', 'dueDate', 'priority']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.projectIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=projects.validators.js.map