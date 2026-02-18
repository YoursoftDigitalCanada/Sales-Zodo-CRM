import { Request, Response, NextFunction } from 'express';
import { invoicesService } from './invoices.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';

export class InvoicesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.create(req.user!.tenantId!, req.body);
            sendCreated(res, invoice, 'Invoice created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await invoicesService.getMany(req.user!.tenantId!, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.getById(req.params.id, req.user!.tenantId!);
            sendSuccess(res, invoice);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.update(req.params.id, req.user!.tenantId!, req.body);
            sendSuccess(res, invoice, 'Invoice updated');
        } catch (e) { next(e); }
    }

    async markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.markAsPaid(req.params.id, req.user!.tenantId!);
            sendSuccess(res, invoice, 'Invoice marked as paid');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await invoicesService.delete(req.params.id, req.user!.tenantId!);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const invoicesController = new InvoicesController();
