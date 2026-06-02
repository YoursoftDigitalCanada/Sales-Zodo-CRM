import { Request, Response, NextFunction } from 'express';
import { permissionsService } from './permissions.service';
import { sendSuccess } from '../../common/utils/responseFormatter';

export class PermissionsController {
    async getCurrent(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            sendSuccess(res, {
                permissions: req.permissions || [],
                employee: req.employee
                    ? {
                        id: req.employee.id,
                        role: req.employee.role
                            ? {
                                id: req.employee.role.id,
                                name: req.employee.role.name,
                            }
                            : null,
                    }
                    : null,
            });
        } catch (error) {
            next(error);
        }
    }

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
            const permissions = await permissionsService.getRolePermissions(req.params.roleId, req.context.tenantId);
            sendSuccess(res, permissions);
        } catch (error) {
            next(error);
        }
    }

    async assignPermissions(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { permissionIds } = req.body;
            const permissions = await permissionsService.assignPermissionsToRole(req.params.roleId, req.context.tenantId, permissionIds);
            sendSuccess(res, permissions, 'Permissions assigned successfully');
        } catch (error) {
            next(error);
        }
    }
}

export const permissionsController = new PermissionsController();
