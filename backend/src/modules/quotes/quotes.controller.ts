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

    // Send quote via email (authenticated)
    async send(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const tenantId = req.context.tenantId;
            const employeeId = req.user!.employeeId!;
            const dto = await quotesService.sendQuote(req.params.id, tenantId, employeeId);
            res.json({ success: true, message: 'Quote sent successfully', data: dto });
        } catch (e) { next(e); }
    }

    // Public: view quote by token (no auth)
    async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await quotesService.getByPublicToken(req.params.token);
            res.json(data);
        } catch (e) { next(e); }
    }

    // Public: accept/reject quote by token (no auth)
    async respondPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { action } = req.body;
            if (!action || !['accept', 'reject'].includes(action)) {
                res.status(400).json({ success: false, message: 'Invalid action. Must be "accept" or "reject".' });
                return;
            }
            const result = await quotesService.respondToQuote(req.params.token, action);
            res.json(result);
        } catch (e) { next(e); }
    }
}

export const quotesController = new QuotesController();
