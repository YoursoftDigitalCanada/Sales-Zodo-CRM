import { Prisma } from '@prisma/client';
import type { CreateInvoiceDto, UpdateInvoiceDto, InvoiceQueryDto, RecordInvoicePaymentDto } from '@contracts/invoice';
import { prisma } from '../../config/database';
const invoiceInclude = {
    client: {
        select: {
            id: true,
            clientName: true,
            companyName: true,
            primaryEmail: true,
            primaryPhone: true,
            streetAddress: true,
            city: true,
            province: true,
            postalCode: true,
            country: true,
        },
    },
    items: true,
    payments: {
        orderBy: { paymentDate: 'desc' as const },
    },
};

function calculateTotals(
    items: Array<{ quantity?: number; unitPrice?: number; rate?: number; amount?: number; lineTotal?: number }>,
    taxRate?: number | null,
    discountAmount?: number | null,
) {
    const subtotal = items.reduce((sum, item) => {
        const amt = Number(item.amount || item.lineTotal || ((item.quantity || 0) * (item.unitPrice ?? item.rate ?? 0)));
        return sum + amt;
    }, 0);
    const safeTaxRate = taxRate ? Number(taxRate) : 0;
    const taxAmount = safeTaxRate ? (subtotal * safeTaxRate) / 100 : 0;
    const safeDiscount = discountAmount ? Number(discountAmount) : 0;
    const total = subtotal + taxAmount - safeDiscount;
    return { subtotal, taxAmount, total, amountDue: total };
}

export class InvoicesRepository {
    async create(tenantId: string, data: CreateInvoiceDto) {
        const { subtotal, taxAmount, total, amountDue } = calculateTotals(
            data.items as any,
            data.taxRate as any,
            data.discountAmount as any,
        );

        return prisma.invoice.create({
            data: {
                tenantId,
                invoiceNumber: data.invoiceNumber,
                clientId: data.clientId || undefined,
                issueDate: data.issueDate ? new Date(data.issueDate) : data.invoiceDate ? new Date(data.invoiceDate as any) : new Date(),
                dueDate: new Date(data.dueDate),
                currency: data.currency || 'USD',
                status: 'DRAFT',
                taxRate: data.taxRate,
                notes: data.notes,
                terms: data.terms,
                subtotal,
                taxAmount,
                discountAmount: data.discountAmount ?? 0,
                total,
                amountPaid: 0,
                amountDue,
                items: {
                    create: data.items.map((item: any, index: number) => ({
                        tenantId,
                        description: item.description || item.itemName || '',
                        quantity: item.quantity || 0,
                        unitPrice: item.unitPrice ?? item.rate ?? 0,
                        amount: item.amount || item.lineTotal || ((item.quantity || 0) * (item.unitPrice ?? item.rate ?? 0)),
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
        if (data.items || data.taxRate !== undefined || data.discountAmount !== undefined) {
            const itemsForTotals = data.items
                ? (data.items as any)
                : await prisma.invoiceItem.findMany({
                    where: { invoiceId: id, tenantId },
                    select: { quantity: true, unitPrice: true, amount: true },
                });

            if (data.items) {
                await prisma.invoiceItem.deleteMany({ where: { invoiceId: id, tenantId } });
            }

            const calculated = calculateTotals(
                itemsForTotals as any,
                data.taxRate !== undefined ? (data.taxRate as any) : (existing as any).taxRate,
                data.discountAmount !== undefined ? (data.discountAmount as any) : (existing as any).discountAmount,
            );
            totals = {
                ...calculated,
                amountDue: Math.max(calculated.total - Number((existing as any).amountPaid || 0), 0),
            };
        }

        return prisma.invoice.update({
            where: { id_tenantId: { id, tenantId } },
            data: {
                ...(data.invoiceNumber !== undefined && { invoiceNumber: data.invoiceNumber }),
                ...((data.issueDate !== undefined || (data as any).invoiceDate !== undefined) && {
                    issueDate: new Date((data.issueDate ?? (data as any).invoiceDate) as any),
                }),
                ...(data.dueDate !== undefined && { dueDate: new Date(data.dueDate) }),
                ...((data as any).sentAt !== undefined && { sentAt: new Date((data as any).sentAt) }),
                ...((data as any).viewedAt !== undefined && { viewedAt: new Date((data as any).viewedAt) }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.terms !== undefined && { terms: data.terms }),
                ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount }),
                ...totals,
                ...(data.items && {
                    items: {
                        create: data.items.map((item: any, index: number) => ({
                            tenantId,
                            description: item.description || item.itemName || 'Item',
                            quantity: item.quantity || 0,
                            unitPrice: item.unitPrice ?? item.rate ?? 0,
                            amount: item.amount || item.lineTotal || ((item.quantity || 0) * (item.unitPrice ?? item.rate ?? 0)),
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
            where: { id_tenantId: { id, tenantId } },
            data: { status: 'PAID', paidAt: new Date(), amountPaid: invoice.total || 0, amountDue: 0 },
            include: invoiceInclude,
        });
    }

    async recordPayment(id: string, tenantId: string, data: RecordInvoicePaymentDto) {
        const invoice = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!invoice) throw new Error('Invoice not found or access denied');

        const nextAmountPaid = Number(invoice.amountPaid || 0) + Number(data.amount || 0);
        const invoiceTotal = Number(invoice.total || 0);
        const nextAmountDue = Math.max(invoiceTotal - nextAmountPaid, 0);

        return prisma.$transaction(async (tx) => {
            await tx.invoicePayment.create({
                data: {
                    invoiceId: id,
                    clientId: invoice.clientId,
                    projectId: invoice.projectId,
                    tenantId,
                    amount: Number(data.amount),
                    paymentMethod: data.paymentMethod,
                    paymentDate: data.paymentDate ? new Date(data.paymentDate) : new Date(),
                    reference: data.reference ?? null,
                    notes: data.notes ?? null,
                },
            });

            return tx.invoice.update({
                where: { id_tenantId: { id, tenantId } },
                data: {
                    amountPaid: nextAmountPaid,
                    amountDue: nextAmountDue,
                    paidAt: nextAmountDue === 0 ? new Date() : null,
                    status: nextAmountDue === 0 ? 'PAID' : 'PARTIALLY_PAID',
                },
                include: invoiceInclude,
            });
        });
    }

    async delete(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.invoice.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Invoice not found or access denied');

        await prisma.invoiceItem.deleteMany({ where: { invoiceId: id, tenantId } });
        return prisma.invoice.delete({ where: { id_tenantId: { id, tenantId } } });
    }
}

export const invoicesRepository = new InvoicesRepository();
