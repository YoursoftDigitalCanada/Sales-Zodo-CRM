"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.invoicesRepository = exports.InvoicesRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const invoiceInclude = {
    client: { select: { id: true, clientName: true } },
    items: true,
};
function calculateTotals(items, taxRates = []) {
    const subtotal = items.reduce((sum, item) => sum + (item.quantity * item.rate), 0);
    const taxableAmount = items.filter((i) => i.taxApplied).reduce((sum, i) => sum + (i.quantity * i.rate), 0);
    const totalTaxRate = taxRates.reduce((sum, t) => sum + t.rate, 0);
    const taxAmount = (taxableAmount * totalTaxRate) / 100;
    return { subtotal, taxAmount, total: subtotal + taxAmount };
}
class InvoicesRepository {
    async create(tenantId, data) {
        const { subtotal, taxAmount, total } = calculateTotals(data.items, data.taxRates);
        return prisma.invoice.create({
            data: {
                tenantId,
                invoiceNumber: data.invoiceNumber,
                invoiceDate: new Date(data.invoiceDate),
                paymentTerms: data.paymentTerms,
                dueDate: new Date(data.dueDate),
                currency: data.currency || 'CAD',
                status: 'DRAFT',
                taxProvince: data.taxProvince,
                taxRates: data.taxRates || [],
                businessName: data.businessName,
                businessEmail: data.businessEmail,
                businessPhone: data.businessPhone,
                businessAddress: data.businessAddress || null,
                businessGstHstNumber: data.businessGstHstNumber,
                clientId: data.clientId,
                clientBusinessName: data.clientBusinessName,
                clientEmail: data.clientEmail,
                clientPhone: data.clientPhone,
                clientAddress: data.clientAddress || null,
                clientGstHstNumber: data.clientGstHstNumber,
                subtotal,
                taxAmount,
                total,
                notes: data.notes,
                items: {
                    create: data.items.map((item) => ({
                        itemName: item.itemName,
                        description: item.description,
                        quantity: item.quantity,
                        rate: item.rate,
                        taxApplied: item.taxApplied || false,
                        lineTotal: item.quantity * item.rate,
                    })),
                },
            },
            include: invoiceInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.invoice.findFirst({ where: { id, tenantId }, include: invoiceInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, status, clientId, startDate, endDate, sortBy = 'invoiceDate', sortOrder = 'desc' } = query;
        const where = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(startDate && { invoiceDate: { gte: new Date(startDate) } }),
            ...(endDate && { invoiceDate: { lte: new Date(endDate) } }),
            ...(search && {
                OR: [
                    { invoiceNumber: { contains: search, mode: 'insensitive' } },
                    { clientBusinessName: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.invoice.findMany({ where, include: invoiceInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.invoice.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        // If items are updated, recalculate totals
        let totals = {};
        if (data.items) {
            await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
            totals = calculateTotals(data.items, data.taxRates);
        }
        return prisma.invoice.update({
            where: { id },
            data: {
                ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
                ...(data.invoiceDate !== undefined && { invoiceDate: new Date(data.invoiceDate) }),
                ...(data.paymentTerms !== undefined && { paymentTerms: data.paymentTerms }),
                ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.taxProvince !== undefined && { taxProvince: data.taxProvince }),
                ...(data.taxRates !== undefined && { taxRates: data.taxRates }),
                ...(data.businessName !== undefined && { businessName: data.businessName }),
                ...(data.businessEmail !== undefined && { businessEmail: data.businessEmail }),
                ...(data.businessPhone !== undefined && { businessPhone: data.businessPhone }),
                ...(data.businessAddress !== undefined && { businessAddress: data.businessAddress }),
                ...(data.businessGstHstNumber !== undefined && { businessGstHstNumber: data.businessGstHstNumber }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.clientBusinessName !== undefined && { clientBusinessName: data.clientBusinessName }),
                ...(data.clientEmail !== undefined && { clientEmail: data.clientEmail }),
                ...(data.clientPhone !== undefined && { clientPhone: data.clientPhone }),
                ...(data.clientAddress !== undefined && { clientAddress: data.clientAddress }),
                ...(data.clientGstHstNumber !== undefined && { clientGstHstNumber: data.clientGstHstNumber }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...totals,
                ...(data.items && {
                    items: {
                        create: data.items.map((item) => ({
                            itemName: item.itemName,
                            description: item.description,
                            quantity: item.quantity,
                            rate: item.rate,
                            taxApplied: item.taxApplied || false,
                            lineTotal: item.quantity * item.rate,
                        })),
                    },
                }),
            },
            include: invoiceInclude,
        });
    }
    async markAsPaid(id) {
        return prisma.invoice.update({
            where: { id },
            data: { status: 'PAID', paidAt: new Date() },
            include: invoiceInclude,
        });
    }
    async delete(id) {
        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        return prisma.invoice.delete({ where: { id } });
    }
}
exports.InvoicesRepository = InvoicesRepository;
exports.invoicesRepository = new InvoicesRepository();
//# sourceMappingURL=invoices.repository.js.map