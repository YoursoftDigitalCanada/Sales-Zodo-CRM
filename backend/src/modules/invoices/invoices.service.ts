import { invoicesRepository } from './invoices.repository';
import { toInvoiceResponseDto } from './invoices.dto';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '@contracts/invoice';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { eventBus } from '../../common/events/event-bus';
import { clientLifecycleService } from '../../common/services/client-lifecycle.service';
import { activityLogger } from '../../common/services/activity-logger.service';

export class InvoicesService {
    async create(tenantId: string, data: CreateInvoiceDto) {
        const invoice = await invoicesRepository.create(tenantId, data);
        const dto = toInvoiceResponseDto(invoice);

        eventBus.emit('invoice.created', {
            tenantId,
            invoiceId: dto.id,
            invoiceNumber: (invoice as any).invoiceNumber || '',
            clientId: (invoice as any).clientId,
            amount: (invoice as any).totalAmount || (invoice as any).total,
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: dto.id,
            action: 'CREATE', module: 'invoices',
            description: `Created invoice "${(invoice as any).invoiceNumber || dto.id}"`,
            metadata: { invoiceNumber: (invoice as any).invoiceNumber, clientId: (invoice as any).clientId },
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const invoice = await invoicesRepository.findById(id, tenantId);
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toInvoiceResponseDto(invoice);
    }

    async generatePdf(id: string, tenantId: string): Promise<{ buffer: Buffer; fileName: string }> {
        const invoice = await invoicesRepository.findById(id, tenantId);
        if (!invoice) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const { jsPDF } = await import('jspdf');
        const autoTable = (await import('jspdf-autotable')).default as any;
        const doc = new jsPDF();

        const issueDate = new Date((invoice as any).issueDate).toLocaleDateString();
        const dueDate = new Date((invoice as any).dueDate).toLocaleDateString();
        const invoiceNumber = (invoice as any).invoiceNumber || id;
        const clientName = (invoice as any).client?.clientName || 'Client';
        const currency = (invoice as any).currency || 'CAD';

        doc.setFontSize(18);
        doc.text(`Invoice ${invoiceNumber}`, 14, 18);
        doc.setFontSize(11);
        doc.text(`Client: ${clientName}`, 14, 28);
        doc.text(`Issue Date: ${issueDate}`, 14, 35);
        doc.text(`Due Date: ${dueDate}`, 14, 42);
        doc.text(`Status: ${(invoice as any).status}`, 14, 49);

        const items = ((invoice as any).items || []).map((item: any) => [
            item.description || 'Item',
            Number(item.quantity || 0).toFixed(2),
            Number(item.unitPrice || 0).toFixed(2),
            Number(item.amount || 0).toFixed(2),
        ]);

        autoTable(doc, {
            startY: 58,
            head: [['Description', 'Qty', 'Rate', 'Amount']],
            body: items,
        });

        const subtotal = Number((invoice as any).subtotal || 0).toFixed(2);
        const taxAmount = Number((invoice as any).taxAmount || 0).toFixed(2);
        const total = Number((invoice as any).total || 0).toFixed(2);
        const amountPaid = Number((invoice as any).amountPaid || 0).toFixed(2);
        const amountDue = Number((invoice as any).amountDue || 0).toFixed(2);
        const finalY = (doc as any).lastAutoTable?.finalY || 120;

        doc.text(`Subtotal: ${currency} ${subtotal}`, 14, finalY + 12);
        doc.text(`Tax: ${currency} ${taxAmount}`, 14, finalY + 19);
        doc.text(`Total: ${currency} ${total}`, 14, finalY + 26);
        doc.text(`Paid: ${currency} ${amountPaid}`, 14, finalY + 33);
        doc.text(`Amount Due: ${currency} ${amountDue}`, 14, finalY + 40);

        const arrayBuffer = doc.output('arraybuffer');
        const buffer = Buffer.from(arrayBuffer);
        const fileName = `invoice-${invoiceNumber}.pdf`;
        return { buffer, fileName };
    }

    async getMany(tenantId: string, query: InvoiceQueryDto) {
        const { data, total } = await invoicesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toInvoiceResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateInvoiceDto) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const invoice = await invoicesRepository.update(id, tenantId, data);
        const dto = toInvoiceResponseDto(invoice);

        eventBus.emit('invoice.updated', {
            tenantId,
            invoiceId: dto.id,
            invoiceNumber: (invoice as any).invoiceNumber || '',
            clientId: (invoice as any).clientId,
            updatedFields: Object.keys(data),
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: dto.id,
            action: 'UPDATE', module: 'invoices',
            description: `Updated invoice "${(invoice as any).invoiceNumber || dto.id}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'DELETE', module: 'invoices',
            description: `Deleted invoice "${(existing as any).invoiceNumber || id}"`,
        });

        await invoicesRepository.delete(id, tenantId);
    }

    async sendInvoice(id: string, tenantId: string, recipientEmail?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);

        // Mark invoice as SENT
        const invoice = await invoicesRepository.update(id, tenantId, { status: 'SENT' } as any);
        const dto = toInvoiceResponseDto(invoice);

        // Domain event: invoice sent
        eventBus.emit('invoice.sent', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            clientId: (existing as any).clientId || (existing as any).client?.id,
            recipientEmail,
        });

        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'STATUS_CHANGE', module: 'invoices',
            description: `Invoice "${(existing as any).invoiceNumber || id}" sent${recipientEmail ? ` to ${recipientEmail}` : ''}`,
            metadata: { newStatus: 'SENT', recipientEmail },
        });

        return dto;
    }

    async markAsPaid(id: string, tenantId: string, actorUserId?: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const oldStatus = (existing as any).status || 'UNPAID';
        const invoice = await invoicesRepository.markAsPaid(id, tenantId);
        const dto = toInvoiceResponseDto(invoice);

        // Domain event: invoice status changed
        eventBus.emit('invoice.statusChanged', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            oldStatus,
            newStatus: 'PAID',
            clientId: (existing as any).clientId || (existing as any).client?.id,
            ownerUserId: actorUserId,
        });

        // Lifecycle: paying client → ACTIVE
        const clientId = (existing as any).clientId || (existing as any).client?.id;
        if (clientId) {
            await clientLifecycleService.progressTo(clientId, tenantId, 'ACTIVE');
            await clientLifecycleService.reinforceEngagement(clientId, tenantId);
        }

        // Domain event: payment received (semantic alias for automation triggers)
        eventBus.emit('payment.received', {
            tenantId,
            invoiceId: id,
            invoiceNumber: (existing as any).invoiceNumber || '',
            clientId,
            amount: (existing as any).totalAmount || (existing as any).total,
            paidByUserId: actorUserId,
        });

        // Timeline: log payment (single entry — avoids duplicate with statusChanged)
        activityLogger.log({
            tenantId, entityType: 'Invoice', entityId: id,
            action: 'STATUS_CHANGE', module: 'invoices',
            description: `Invoice "${(existing as any).invoiceNumber || id}" marked as paid`,
            userId: actorUserId,
            metadata: { oldStatus, newStatus: 'PAID', clientId },
        });

        return dto;
    }
}

export const invoicesService = new InvoicesService();
