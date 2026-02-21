import { Request, Response, NextFunction } from 'express';
import { applicationsService } from './applications.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ApplicationsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const application = await applicationsService.create(tenantId, sanitizeBody(req.body));
            sendCreated(res, application, 'Application created successfully');
        } catch (error) {
            next(error);
        }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const result = await applicationsService.getMany(tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (error) {
            next(error);
        }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const application = await applicationsService.getById(req.params.id, tenantId);
            sendSuccess(res, application);
        } catch (error) {
            next(error);
        }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            const application = await applicationsService.update(req.params.id, tenantId, sanitizeBody(req.body));
            sendSuccess(res, application, 'Application updated successfully');
        } catch (error) {
            next(error);
        }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.user!.tenantId!;
            await applicationsService.delete(req.params.id, tenantId);
            sendNoContent(res);
        } catch (error) {
            next(error);
        }
    }
}

export const applicationsController = new ApplicationsController();
