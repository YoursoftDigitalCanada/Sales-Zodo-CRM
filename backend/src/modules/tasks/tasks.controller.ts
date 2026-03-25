import { Request, Response, NextFunction } from 'express';
import { tasksService } from './tasks.service';
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
            const tenantId = req.context.tenantId;
            const employeeId = req.user!.employeeId;
            const data = sanitizeBody<CreateTaskDto>(req.body);

            const task = await tasksService.create(tenantId, data as CreateTaskDto, employeeId);

            sendCreated(res, task, 'Task created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const query = req.query as any;

            const result = await tasksService.getMany(tenantId, query, req.dataAccess);

            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getKanban(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { assignedToId, projectId } = req.query as any;

            const kanban = await tasksService.getKanban(tenantId, { assignedToId, projectId }, req.dataAccess);

            sendSuccess(res, kanban);
        } catch (error) {
            next(error);
        }
    }

    async getStatistics(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;

            const statistics = await tasksService.getStatistics(tenantId, req.dataAccess);

            sendSuccess(res, statistics);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            const task = await tasksService.getById(id, tenantId);

            sendSuccess(res, task);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const data = sanitizeBody<UpdateTaskDto>(req.body);

            const task = await tasksService.update(id, tenantId, data as UpdateTaskDto);

            sendSuccess(res, task, 'Task updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const { status } = req.body;

            const task = await tasksService.updateStatus(id, tenantId, status, req.user?.userId);

            sendSuccess(res, task, 'Task status updated');
        } catch (error) {
            next(error);
        }
    }

    async assign(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;
            const { assignedToId } = req.body;

            const task = await tasksService.assign(id, tenantId, assignedToId);

            sendSuccess(res, task, 'Task assigned successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const { id } = req.params;

            await tasksService.delete(id, tenantId);

            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const tasksController = new TasksController();
