import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service';
import { tasksManager } from './tasks.manager';
import {
    sendSuccess,
    sendCreated,
    sendNoContent,
} from '../../common/utils/responseFormatter';
import { CreateTaskDto, UpdateTaskDto } from './tasks.dto';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class TasksController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const employeeId = req.user!.employeeId;
            const data = sanitizeBody<CreateTaskDto>(req.body);

            const task = await tasksManager.createTask(req, tenantId, data as CreateTaskDto, employeeId);

            sendCreated(res, task, 'Task created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const query = req.query as any;

            const result = await tasksService.getMany(tenantId, query);

            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getKanban(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { assignedToId, projectId } = req.query as any;

            const kanban = await tasksService.getKanban(tenantId, { assignedToId, projectId });

            sendSuccess(res, kanban);
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;

            const statistics = await tasksService.getStatistics(tenantId);

            sendSuccess(res, statistics);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;

            const task = await tasksService.getById(id, tenantId);

            sendSuccess(res, task);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;
            const data = sanitizeBody<UpdateTaskDto>(req.body);

            const task = await tasksManager.updateTask(req, id, tenantId, data as UpdateTaskDto);

            sendSuccess(res, task, 'Task updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;
            const { status } = req.body;

            const task = await tasksManager.updateTaskStatus(req, id, tenantId, status);

            sendSuccess(res, task, 'Task status updated');
        } catch (error) {
            next(error);
        }
    }

    async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;
            const { assignedToId } = req.body;

            const task = await tasksManager.assignTask(req, id, tenantId, assignedToId);

            sendSuccess(res, task, 'Task assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const { id } = req.params;

            await tasksManager.deleteTask(req, id, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const tasksController = new TasksController();
