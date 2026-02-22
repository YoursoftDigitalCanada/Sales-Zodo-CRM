import { Request } from 'express';
import { tasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';
import { TaskStatus } from '@prisma/client';
import { auditService } from '../audit/audit.service';
import { eventBus } from '../../common/events/event-bus';

export class TasksManager {
    async createTask(req: Request, tenantId: string, data: CreateTaskDto, createdById?: string) {
        const task = await tasksService.create(tenantId, data, createdById);

        await auditService.logCreate(req, 'tasks', 'Task', task.id, {
            title: task.title,
            status: task.status,
            priority: task.priority,
        });

        return task;
    }

    async updateTask(req: Request, id: string, tenantId: string, data: UpdateTaskDto) {
        const existing = await tasksService.getById(id, tenantId);
        const task = await tasksService.update(id, tenantId, data);

        await auditService.logUpdate(req, 'tasks', 'Task', id, existing, task);

        return task;
    }

    async deleteTask(req: Request, id: string, tenantId: string) {
        const existing = await tasksService.getById(id, tenantId);
        await tasksService.delete(id, tenantId);

        await auditService.logDelete(req, 'tasks', 'Task', id, {
            title: (existing as any)?.title,
        });
    }

    async updateTaskStatus(req: Request, id: string, tenantId: string, status: TaskStatus) {
        const existing = await tasksService.getById(id, tenantId);
        const task = await tasksService.updateStatus(id, tenantId, status);

        await auditService.logStatusChange(
            req, 'tasks', 'Task', id,
            (existing as any)?.status || 'UNKNOWN',
            status,
        );

        // Emit task.completed event when status changes to DONE
        if (status === 'DONE') {
            eventBus.emit('task.completed', {
                tenantId,
                taskId: id,
                taskTitle: (task as any)?.title || '',
                completedByUserId: req.user?.userId || '',
            });
        }

        return task;
    }

    async assignTask(req: Request, id: string, tenantId: string, assignedToId: string | null) {
        const task = await tasksService.assign(id, tenantId, assignedToId);

        await auditService.logWithContext(req, 'UPDATE' as any, 'tasks', `Task assigned to ${assignedToId || 'unassigned'}`, {
            entityType: 'Task',
            entityId: id,
            newValues: { assignedToId },
        });

        return task;
    }
}

export const tasksManager = new TasksManager();
