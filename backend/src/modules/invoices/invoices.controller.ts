import { Request, Response, NextFunction } from 'express';
import { invoicesService } from './invoices.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';

export class InvoicesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.create(req.context.tenantId, sanitizeBody(req.body));
            sendCreated(res, invoice, 'Invoice created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await invoicesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { csv, fileName } = await invoicesService.exportCsv(req.context.tenantId, req.query as any);
            res.setHeader('Content-Type', 'text/csv; charset=utf-8');
            res.setHeader('Content-Disposition', `attachment; filename="${fileName}"`);
            res.send(csv);
        } catch (e) { next(e); }
    }

    async importCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const file = (req as any).file as Express.Multer.File | undefined;
            const result = await invoicesService.importCsv(req.context.tenantId, file, req.user?.userId);
            sendSuccess(res, result, 'Invoice import processed');
        } catch (e) { next(e); }
    }

    async importPdfs(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const files = ((req as any).files || []) as Express.Multer.File[];
            const result = await invoicesService.importPdfs(req.context.tenantId, files, req.user?.userId);
            sendSuccess(res, result, 'Invoice PDFs imported');
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, invoice);
        } catch (e) { next(e); }
    }

    async downloadPdf(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const { buffer, fileName } = await invoicesService.generatePdf(req.params.id, req.context.tenantId);
            res.setHeader("Content-Type", "application/pdf");
            res.setHeader("Content-Disposition", `attachment; filename="${fileName}"`);
            res.send(buffer);
        } catch (e) { next(e); }
    }

    async saveDocument(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const document = await invoicesService.saveInvoicePdfToDocuments(req.context.tenantId, req.params.id, req.user?.userId);
            sendSuccess(res, document, 'Invoice PDF saved to Documents');
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));
            sendSuccess(res, invoice, 'Invoice updated');
        } catch (e) { next(e); }
    }

    async send(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.sendInvoice(
                req.params.id,
                req.context.tenantId,
                sanitizeBody(req.body)?.recipientEmail,
                req.user?.userId,
            );
            sendSuccess(res, invoice, 'Invoice sent');
        } catch (e) { next(e); }
    }

    async markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.markAsPaid(req.params.id, req.context.tenantId, req.user?.userId);
            sendSuccess(res, invoice, 'Invoice marked as paid');
        } catch (e) { next(e); }
    }

    async recordPayment(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.recordPayment(
                req.params.id,
                req.context.tenantId,
                sanitizeBody(req.body),
                req.user?.userId,
            );
            sendSuccess(res, invoice, 'Invoice payment recorded');
        } catch (e) { next(e); }
    }

    async updatePaymentStatus(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await invoicesService.updatePaymentStatus(
                req.params.id,
                req.params.paymentId,
                req.context.tenantId,
                sanitizeBody(req.body),
                req.user?.userId,
            );
            sendSuccess(res, result, 'Payment status updated');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            await invoicesService.delete(req.params.id, req.context.tenantId);
            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const invoicesController = new InvoicesController();
