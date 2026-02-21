import { Request, Response, NextFunction } from 'express';
import { expensesService } from './expenses.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class ExpensesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const expense = await expensesService.create(req.user!.tenantId!, sanitizeBody(req.body), req.user!.employeeId);
            sendCreated(res, expense, 'Expense created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await expensesService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const expense = await expensesService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, expense);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const expense = await expensesService.update(req.params.id, req.user!.tenantId!, sanitizeBody(req.body));
            sendSuccess(res, expense, 'Expense updated');
        } catch (e) { next(e); }
    }

    async approve(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const expense = await expensesService.approve(req.params.id, req.user!.tenantId!, req.user!.employeeId!);
            sendSuccess(res, expense, 'Expense approved');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await expensesService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const expensesController = new ExpensesController();
