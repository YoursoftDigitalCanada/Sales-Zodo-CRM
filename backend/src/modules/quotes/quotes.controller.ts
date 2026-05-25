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

    async downloadPdf(req: Request, res: Response, next: NextFunction) {
        try {
            const tenantId = req.context.tenantId;
            const { buffer, fileName } = await quotesService.downloadPdf(req.params.id, tenantId);
            res.setHeader('Content-Type', 'application/pdf');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(buffer);
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
            res.json({ success: true, message: 'Proposal sent successfully', data: dto });
        } catch (e) { next(e); }
    }

    // Public: view quote by token (no auth)
    async getPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const data = await quotesService.getByPublicToken(req.params.token);
            res.json(data);
        } catch (e) { next(e); }
    }

    // Public: sign/reject quote by token (no auth)
    async respondPublic(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { action } = req.body;
            if (!action || !['sign', 'reject'].includes(action)) {
                res.status(400).json({ success: false, message: 'Invalid action. Must be "sign" or "reject".' });
                return;
            }
            const forwardedFor = req.headers['x-forwarded-for'];
            const ipAddress = Array.isArray(forwardedFor)
                ? forwardedFor[0]
                : typeof forwardedFor === 'string'
                    ? forwardedFor.split(',')[0]?.trim()
                    : req.ip;
            const result = await quotesService.respondToQuote(req.params.token, action, {
                signedByName: req.body.signedByName,
                signatureData: req.body.signatureData,
                signatureType: req.body.signatureType,
                agreeToTerms: req.body.agreeToTerms,
                hasDrawnSignature: req.body.hasDrawnSignature,
                ipAddress,
                userAgent: req.get('user-agent') || undefined,
            });
            res.json(result);
        } catch (e) { next(e); }
    }
}

export const quotesController = new QuotesController();
