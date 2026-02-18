import { Request, Response, NextFunction } from 'express';
import { employeesService } from './employees.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class EmployeesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.create(req.user!.tenantId!, req.body);
            sendCreated(res, emp, 'Employee created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await employeesService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, emp);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const emp = await employeesService.update(req.params.id, req.user!.tenantId!, req.body);
            sendSuccess(res, emp, 'Employee updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await employeesService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const employeesController = new EmployeesController();
