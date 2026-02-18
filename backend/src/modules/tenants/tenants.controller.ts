import { Request, Response, NextFunction } from 'express';
import { tenantsService } from './tenants.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class TenantsController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenant = await tenantsService.create(req.body);
            sendCreated(res, tenant, 'Tenant created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await tenantsService.getMany(req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenant = await tenantsService.getById(req.params.id);
            sendSuccess(res, tenant);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenant = await tenantsService.update(req.params.id, req.body);
            sendSuccess(res, tenant, 'Tenant updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await tenantsService.delete(req.params.id);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const tenantsController = new TenantsController();
