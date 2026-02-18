import { Request } from 'express';
import { tasksService } from './tasks.service';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';
import { TaskStatus } from '@prisma/client';

export class TasksManager {
    async createTask(req: Request, tenantId: string, data: CreateTaskDto, createdById?: string) {
        const task = await tasksService.create(tenantId, data, createdById);
        // TODO: Add audit logging
        return task;
    }

    async updateTask(req: Request, id: string, tenantId: string, data: UpdateTaskDto) {
        const task = await tasksService.update(id, tenantId, data);
        // TODO: Add audit logging
        return task;
    }

    async deleteTask(req: Request, id: string, tenantId: string) {
        await tasksService.delete(id, tenantId);
        // TODO: Add audit logging
    }

    async updateTaskStatus(req: Request, id: string, tenantId: string, status: TaskStatus) {
        const task = await tasksService.updateStatus(id, tenantId, status);
        // TODO: Add audit logging
        return task;
    }

    async assignTask(req: Request, id: string, tenantId: string, assignedToId: string | null) {
        const task = await tasksService.assign(id, tenantId, assignedToId);
        // TODO: Add audit logging
        return task;
    }
}

export const tasksManager = new TasksManager();
