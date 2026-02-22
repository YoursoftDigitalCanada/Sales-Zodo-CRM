import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { auditService } from '../audit/audit.service';
import { eventBus } from '../../common/events/event-bus';

export class ProjectsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const project = await projectsService.create(req.context.tenantId, sanitizeBody(req.body));

            const record = project as any;
            await auditService.logCreate(req, 'projects', 'Project', project.id, {
                name: record.name,
                status: record.status,
                clientId: record.clientId || record.client?.id,
            });

            // Emit event for automation
            eventBus.emit('project.created', {
                tenantId: req.context.tenantId,
                projectId: project.id,
                projectName: record.name,
                clientId: record.clientId || record.client?.id,
                assignedToUserId: req.user?.userId,
            });

            sendCreated(res, project, 'Project created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await projectsService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const project = await projectsService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, project);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const existing = await projectsService.getById(req.params.id, req.context.tenantId);
            const project = await projectsService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));

            await auditService.logUpdate(req, 'projects', 'Project', req.params.id, existing, project);

            sendSuccess(res, project, 'Project updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const existing = await projectsService.getById(req.params.id, req.context.tenantId);
            await projectsService.delete(req.params.id, req.context.tenantId);

            await auditService.logDelete(req, 'projects', 'Project', req.params.id, {
                name: (existing as any)?.name,
            });

            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const projectsController = new ProjectsController();
