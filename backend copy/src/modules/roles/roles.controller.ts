import { Request, Response, NextFunction } from 'express';
import { rolesService } from './roles.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class RolesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const role = await rolesService.create(req.user!.tenantId!, req.body);
            sendCreated(res, role, 'Role created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await rolesService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const role = await rolesService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, role);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const role = await rolesService.update(req.params.id, req.user!.tenantId!, req.body);
            sendSuccess(res, role, 'Role updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await rolesService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const rolesController = new RolesController();
