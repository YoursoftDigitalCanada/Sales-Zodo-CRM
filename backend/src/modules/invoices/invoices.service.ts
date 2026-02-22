import { invoicesRepository } from './invoices.repository';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto, toInvoiceResponseDto } from './invoices.dto';
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
