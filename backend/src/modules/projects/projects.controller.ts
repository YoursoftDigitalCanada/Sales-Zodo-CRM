import { Request, Response, NextFunction } from 'express';
import { projectsService } from './projects.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ProjectsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const project = await projectsService.create(req.user!.tenantId!, sanitizeBody(req.body));
            sendCreated(res, project, 'Project created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await projectsService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const project = await projectsService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, project);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const project = await projectsService.update(req.params.id, req.user!.tenantId!, sanitizeBody(req.body));
            sendSuccess(res, project, 'Project updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await projectsService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const projectsController = new ProjectsController();
