"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesService = exports.InvoicesService = void 0;
const invoices_repository_1 = require("./invoices.repository");
const invoices_dto_1 = require("./invoices.dto");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const errorCodes_1 = require("../../common/errors/errorCodes");
class InvoicesService {
    async create(tenantId, data) {
        const invoice = await invoices_repository_1.invoicesRepository.create(tenantId, data);
        return (0, invoices_dto_1.toInvoiceResponseDto)(invoice);
    }
    async getById(id, tenantId) {
        const invoice = await invoices_repository_1.invoicesRepository.findById(id, tenantId);
        if (!invoice)
            throw new HttpErrors_1.NotFoundError('Invoice not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        return (0, invoices_dto_1.toInvoiceResponseDto)(invoice);
    }
    async getMany(tenantId, query) {
        const { data, total } = await invoices_repository_1.invoicesRepository.findMany(tenantId, query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(invoices_dto_1.toInvoiceResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }
    async update(id, tenantId, data) {
        const existing = await invoices_repository_1.invoicesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Invoice not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const invoice = await invoices_repository_1.invoicesRepository.update(id, tenantId, data);
        return (0, invoices_dto_1.toInvoiceResponseDto)(invoice);
    }
    async delete(id, tenantId) {
        const existing = await invoices_repository_1.invoicesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Invoice not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        await invoices_repository_1.invoicesRepository.delete(id);
    }
    async markAsPaid(id, tenantId) {
        const existing = await invoices_repository_1.invoicesRepository.findById(id, tenantId);
        if (!existing)
            throw new HttpErrors_1.NotFoundError('Invoice not found', errorCodes_1.ErrorCodes.RESOURCE_NOT_FOUND);
        const invoice = await invoices_repository_1.invoicesRepository.markAsPaid(id, Number(existing.total));
        return (0, invoices_dto_1.toInvoiceResponseDto)(invoice);
    }
}
exports.InvoicesService = InvoicesService;
exports.invoicesService = new InvoicesService();
//# sourceMappingURL=invoices.service.js.map