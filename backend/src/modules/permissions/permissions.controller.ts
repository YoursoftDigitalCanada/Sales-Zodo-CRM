import { Request, Response, NextFunction } from 'express';
import { permissionsService } from './permissions.service';
import { sendSuccess } from '../../common/utils/responseFormatter';

export class PermissionsController {
    async getAll(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const permissions = await permissionsService.getAll();
            sendSuccess(res, permissions);
        } catch (error) {
            next(error);
        }
    }

    async getModules(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const modules = await permissionsService.getAllModules();
            sendSuccess(res, modules);
        } catch (error) {
            next(error);
        }
    }

    async getByModule(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const permissions = await permissionsService.getByModule(req.params.module);
            sendSuccess(res, permissions);
        } catch (error) {
            next(error);
        }
    }

    async getRolePermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const permissions = await permissionsService.getRolePermissions(req.params.roleId);
            sendSuccess(res, permissions);
        } catch (error) {
            next(error);
        }
    }

    async assignPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { permissionIds } = req.body;
            const permissions = await permissionsService.assignPermissionsToRole(req.params.roleId, permissionIds);
            sendSuccess(res, permissions, 'Permissions assigned successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const permissionsController = new PermissionsController();
