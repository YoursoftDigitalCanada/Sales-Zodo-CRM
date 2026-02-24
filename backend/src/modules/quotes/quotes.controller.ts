import { Request, Response, NextFunction } from 'express';
import { quotesService } from './quotes.service';

export class QuotesController {
    async create(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const createdById = req.user!.employeeId!;
            const dto = await quotesService.create(tenantId, req.body, createdById);
            res.status(201).json(dto);
        } catch (err) { next(err); }
    }

    async getById(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const dto = await quotesService.getById(req.params.id, tenantId);
            res.json(dto);
        } catch (err) { next(err); }
    }

    async getMany(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const result = await quotesService.getMany(tenantId, req.query as any);
            res.json(result);
        } catch (err) { next(err); }
    }

    async update(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const dto = await quotesService.update(req.params.id, tenantId, req.body);
            res.json(dto);
        } catch (err) { next(err); }
    }

    async delete(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            await quotesService.delete(req.params.id, tenantId);
            res.status(204).send();
        } catch (err) { next(err); }
    }
    async updateStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = req.user!.employeeId!;
            const quote = await quotesService.updateStatus(req.params.id, tenantId, req.body.status, employeeId);
            res.json(quote);
        } catch (e) { next(e); }
    }
}

export const quotesController = new QuotesController();
