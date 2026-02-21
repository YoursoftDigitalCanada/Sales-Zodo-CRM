import { invoicesRepository } from './invoices.repository';
import { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto, toInvoiceResponseDto } from './invoices.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

export class InvoicesService {
    async create(tenantId: string, data: CreateInvoiceDto) {
        const invoice = await invoicesRepository.create(tenantId, data);
        return toInvoiceResponseDto(invoice);
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
        const invoice = await invoicesRepository.update(id, data);
        return toInvoiceResponseDto(invoice);
    }

    async delete(id: string, tenantId: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await invoicesRepository.delete(id);
    }

    async markAsPaid(id: string, tenantId: string) {
        const existing = await invoicesRepository.findById(id, tenantId);
        if (!existing) throw new NotFoundError('Invoice not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const invoice = await invoicesRepository.markAsPaid(id);
        return toInvoiceResponseDto(invoice);
    }
}

export const invoicesService = new InvoicesService();
