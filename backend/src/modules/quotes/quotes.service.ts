import { quotesRepository } from './quotes.repository';
import { CreateQuoteDto, UpdateQuoteDto, QuoteQueryDto, toQuoteResponseDto } from './quotes.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { eventBus } from '../../common/events/event-bus';

export class QuotesService {
    async create(tenantId: string, data: CreateQuoteDto, createdById?: string) {
        const quote = await quotesRepository.create(tenantId, data, createdById);
        const dto = toQuoteResponseDto(quote);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'CREATE', module: 'quotes',
            description: `Created quote "${dto.quoteNumber}"`,
            userId: createdById,
            metadata: { quoteNumber: dto.quoteNumber, total: dto.total, clientId: dto.client?.id },
        });

        eventBus.emit('quote.created', {
            tenantId,
            quoteId: dto.id,
            quoteNumber: dto.quoteNumber,
            clientId: dto.client?.id,
            leadId: dto.leadId || undefined,
            total: dto.total,
        });

        return dto;
    }

    async getById(id: string, tenantId: string) {
        const quote = await quotesRepository.findById(id, tenantId);
        if (!quote) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toQuoteResponseDto(quote);
    }

    async getMany(tenantId: string, query: QuoteQueryDto) {
        const { data, total } = await quotesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toQuoteResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, tenantId: string, data: UpdateQuoteDto) {
        const existing = await quotesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const quote = await quotesRepository.update(id, tenantId, data);
        const dto = toQuoteResponseDto(quote);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'UPDATE', module: 'quotes',
            description: `Updated quote "${dto.quoteNumber}"`,
            metadata: { updatedFields: Object.keys(data) },
        });

        return dto;
    }

    async delete(id: string, tenantId: string) {
        const existing = await quotesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: id,
            action: 'DELETE', module: 'quotes',
            description: `Deleted quote "${(existing as any).quoteNumber || id}"`,
        });

        await quotesRepository.delete(id, tenantId);
    }
    async updateStatus(id: string, tenantId: string, status: string, actorEmployeeId?: string) {
        const existing = await quotesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Quote not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const oldStatus = (existing as any).status;

        // Build update data with semantic timestamps
        const updateData: any = { status };
        if (status === 'SENT' && !(existing as any).sentAt) updateData.sentAt = new Date();
        if (status === 'ACCEPTED' && !(existing as any).acceptedAt) updateData.acceptedAt = new Date();

        const quote = await quotesRepository.update(id, tenantId, updateData);
        const dto = toQuoteResponseDto(quote);

        activityLogger.log({
            tenantId, entityType: 'Quote', entityId: dto.id,
            action: 'STATUS_CHANGE', module: 'quotes',
            description: `Quote "${dto.quoteNumber}" status: ${oldStatus} → ${status}`,
            metadata: { oldStatus, newStatus: status },
        });

        // Emit statusChanged with full payload for the master automation
        eventBus.emit('quote.statusChanged', {
            tenantId,
            quoteId: dto.id,
            quoteNumber: dto.quoteNumber,
            oldStatus,
            newStatus: status,
            clientId: dto.client?.id,
            leadId: dto.leadId || undefined,
            total: dto.total,
            createdById: actorEmployeeId,
            items: dto.items.map(i => ({ description: i.description, quantity: i.quantity, unitPrice: i.unitPrice, total: i.total })),
        });

        return dto;
    }
}

export const quotesService = new QuotesService();
