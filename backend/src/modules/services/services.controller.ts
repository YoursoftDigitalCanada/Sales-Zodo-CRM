import { Request, Response, NextFunction } from 'express';
import { servicesService } from './services.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ServicesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const service = await servicesService.create(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, service, 'Service created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await servicesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const service = await servicesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, service);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const service = await servicesService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, service, 'Service updated');
        } catch (e) { next(e); }
    }

    async deactivate(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const service = await servicesService.deactivate(req.params.id, req.context.tenantId);
            sendSuccess(res, service, 'Service deactivated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await servicesService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const servicesController = new ServicesController();
