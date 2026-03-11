import { PrismaClient, Prisma, InvoiceStatus, Currency } from '@prisma/client';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto } from '@contracts/invoice';

const prisma = new PrismaClient();
const invoiceInclude = {
    client: { select: { id: true, clientName: true } },
    items: true,
};

function calculateTotals(items: { quantity: number; unitPrice: number; amount: number }[], taxRate?: number | null) {
    const subtotal = items.reduce((sum, item) => sum + item.amount, 0);
    const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + taxAmount;
    return { subtotal, taxAmount, total, amountDue: total };
}

export class InvoicesRepository {
    async create(tenantId: string, data: CreateInvoiceDto) {
        const { subtotal, taxAmount, total, amountDue } = calculateTotals(data.items as any, data.taxRate as any);

        return prisma.invoice.create({
            data: {
                tenantId,
                invoiceNumber: data.invoiceNumber,
                clientId: data.clientId || undefined,
                issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
                dueDate: new Date(data.dueDate),
                currency: data.currency || 'USD',
                status: 'DRAFT',
                taxRate: data.taxRate,
                notes: data.notes,
                terms: data.terms,
                subtotal,
                taxAmount,
                total,
                amountPaid: 0,
                amountDue,
                items: {
                    create: data.items.map((item: any, index: number) => ({
                        description: item.description || item.itemName || '',
                        quantity: item.quantity,
                        unitPrice: item.unitPrice ?? item.rate ?? 0,
                        amount: item.amount || (item.quantity * (item.unitPrice ?? item.rate ?? 0)),
                        taxRate: item.taxRate,
                        sortOrder: item.sortOrder || index,
                    })),
                },
            } as any,
            include: invoiceInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.invoice.findFirst({ where: { id, tenantId }, include: invoiceInclude });
    }

    async findMany(tenantId: string, query: InvoiceQueryDto) {
        const { page = 1, limit = 20, search, status, clientId, startDate, endDate, sortBy = 'issueDate', sortOrder = 'desc' } = query;
        const where: Prisma.InvoiceWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(startDate && { issueDate: { gte: new Date(startDate) } }),
            ...(endDate && { issueDate: { lte: new Date(endDate) } }),
            ...(search && {
                OR: [
                    { invoiceNumber: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.invoice.findMany({ where, include: invoiceInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.invoice.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateInvoiceDto) {
        // Verify tenant ownership
        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Invoice not found or access denied');

        let totals = {};
        if (data.items) {
            await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
            totals = calculateTotals(data.items as any, data.taxRate as any);
        }

        return prisma.invoice.update({
            where: { id },
            data: {
                ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
                ...(data.issueDate !== undefined && { issueDate: new Date(data.issueDate) }),
                ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.terms !== undefined && { terms: data.terms }),
                ...totals,
                ...(data.items && {
                    items: {
                        create: data.items.map((item: any, index: number) => ({
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            amount: item.amount,
                            taxRate: item.taxRate,
                            sortOrder: item.sortOrder || index,
                        })),
                    },
                }),
            } as any,
            include: invoiceInclude,
        });
    }

    async markAsPaid(id: string, tenantId: string) {
        // Verify tenant ownership
        const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!invoice) throw new Error('Invoice not found or access denied');

        return prisma.invoice.update({
            where: { id },
            data: { status: 'PAID', paidAt: new Date(), amountPaid: invoice.total || 0, amountDue: 0 },
            include: invoiceInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Invoice not found or access denied');

        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id } });
        return prisma.invoice.delete({ where: { id } });
    }
}

export const invoicesRepository = new InvoicesRepository();
