import { Request, Response, NextFunction } from 'express';
import { invoicesService } from './invoices.service';
import { sendSuccess, sendCreated, sendNoContent } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { auditService } from '../audit/audit.service';
import { eventBus } from '../../common/events/event-bus';

export class InvoicesController {
    async create(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.create(req.context.tenantId, sanitizeBody(req.body));

            const record = invoice as any;
            await auditService.logCreate(req, 'invoices', 'Invoice', invoice.id, {
                invoiceNumber: record.invoiceNumber,
                status: record.status,
                totalAmount: record.totalAmount || record.total,
                clientId: record.clientId || record.client?.id,
            });

            sendCreated(res, invoice, 'Invoice created');
        } catch (e) { next(e); }
    }

    async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const result = await invoicesService.getMany(req.context.tenantId, req.query as any);
            sendSuccess(res, result.data, undefined, 200, result.meta);
        } catch (e) { next(e); }
    }

    async getById(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const invoice = await invoicesService.getById(req.params.id, req.context.tenantId);
            sendSuccess(res, invoice);
        } catch (e) { next(e); }
    }

    async update(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const existing = await invoicesService.getById(req.params.id, req.context.tenantId);
            const invoice = await invoicesService.update(req.params.id, req.context.tenantId, sanitizeBody(req.body));

            await auditService.logUpdate(req, 'invoices', 'Invoice', req.params.id, existing, invoice);

            sendSuccess(res, invoice, 'Invoice updated');
        } catch (e) { next(e); }
    }

    async markAsPaid(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const existing = await invoicesService.getById(req.params.id, req.context.tenantId);
            const invoice = await invoicesService.markAsPaid(req.params.id, req.context.tenantId);

            await auditService.logStatusChange(
                req, 'invoices', 'Invoice', req.params.id,
                (existing as any)?.status || 'UNPAID',
                'PAID',
            );

            // Emit event for automation
            eventBus.emit('invoice.statusChanged', {
                tenantId: req.context.tenantId,
                invoiceId: req.params.id,
                invoiceNumber: (existing as any)?.invoiceNumber || '',
                oldStatus: (existing as any)?.status || 'UNPAID',
                newStatus: 'PAID',
                clientId: (existing as any)?.clientId || (existing as any)?.client?.id,
                ownerUserId: req.user?.userId,
            });

            sendSuccess(res, invoice, 'Invoice marked as paid');
        } catch (e) { next(e); }
    }

    async delete(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const existing = await invoicesService.getById(req.params.id, req.context.tenantId);
            await invoicesService.delete(req.params.id, req.context.tenantId);

            await auditService.logDelete(req, 'invoices', 'Invoice', req.params.id, {
                invoiceNumber: (existing as any)?.invoiceNumber,
            });

            sendNoContent(res);
        } catch (e) { next(e); }
    }
}

export const invoicesController = new InvoicesController();
