import { Request, Response, NextFunction } from 'express';
import { employeesService } from './employees.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class EmployeesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.create(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, emp, 'Employee created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await employeesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, emp);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, emp, 'Employee updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await employeesService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }

    async getAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const access = await employeesService.getAccess(req.params.id, req.context.tenantId);
            sendSuccess(res, access);
        } catch (e) { next(e); }
    }

    async setAccess(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const access = await employeesService.setAccess(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, access, 'Data access updated');
        } catch (e) { next(e); }
    }
}

export const employeesController = new EmployeesController();
