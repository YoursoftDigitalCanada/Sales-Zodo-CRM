"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.taskIdSchema = exports.taskQuerySchema = exports.updateTaskSchema = exports.createTaskSchema = void 0;
const zod_1 = require("zod");
// ============================================================================
// TASKS - Create Task
// ============================================================================
exports.createTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        taskTitle: zod_1.z.string().min(1).max(255),
        description: zod_1.z.string().optional().nullable(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).default('TODO'),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
        assignee: zod_1.z.string().uuid().optional().nullable(),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).default([]),
        projectId: zod_1.z.string().uuid().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
    }),
});
exports.updateTaskSchema = zod_1.z.object({
    body: zod_1.z.object({
        taskTitle: zod_1.z.string().min(1).max(255).optional(),
        description: zod_1.z.string().optional().nullable(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        assignee: zod_1.z.string().uuid().optional().nullable(),
        dueDate: zod_1.z.string().datetime().optional().nullable(),
        tags: zod_1.z.array(zod_1.z.string()).optional(),
        projectId: zod_1.z.string().uuid().optional().nullable(),
        clientId: zod_1.z.string().uuid().optional().nullable(),
    }),
});
exports.taskQuerySchema = zod_1.z.object({
    query: zod_1.z.object({
        page: zod_1.z.coerce.number().int().min(1).default(1),
        limit: zod_1.z.coerce.number().int().min(1).max(100).default(20),
        search: zod_1.z.string().optional(),
        status: zod_1.z.enum(['TODO', 'IN_PROGRESS', 'REVIEW', 'DONE']).optional(),
        priority: zod_1.z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
        assignee: zod_1.z.string().uuid().optional(),
        projectId: zod_1.z.string().uuid().optional(),
        clientId: zod_1.z.string().uuid().optional(),
        sortBy: zod_1.z.enum(['taskTitle', 'createdAt', 'dueDate', 'priority']).default('createdAt'),
        sortOrder: zod_1.z.enum(['asc', 'desc']).default('desc'),
    }),
});
exports.taskIdSchema = zod_1.z.object({
    params: zod_1.z.object({ id: zod_1.z.string().uuid() }),
});
//# sourceMappingURL=tasks.validators.js.map