import { Prisma, QuoteStatus } from '@prisma/client';
import { CreateQuoteDto, UpdateQuoteDto, QuoteQueryDto } from './quotes.dto';
import { buildQuoteSelect, stripUnsupportedQuoteSignatureFields } from './quote-schema-compat';
import { prisma } from '../../config/database';
const quoteRelations = {
    client: { select: { id: true, clientName: true } },
    lead: { select: { id: true, firstName: true, lastName: true, companyName: true } },
    items: true,
    projects: {
        select: { id: true },
        orderBy: { createdAt: 'desc' as const },
        take: 1,
    },
};

function calculateTotals(items: { quantity: number; unitPrice: number; total: number }[], taxRate?: number | null, discountAmount = 0) {
    const subtotal = items.reduce((sum, item) => sum + item.total, 0);
    const taxAmount = taxRate ? (subtotal * taxRate) / 100 : 0;
    const total = subtotal + taxAmount - discountAmount;
    return { subtotal, taxAmount, total };
}

async function generateQuoteNumber(tenantId: string): Promise<string> {
    const count = await prisma.quote.count({ where: { tenantId } });
    const num = (count + 1).toString().padStart(5, '0');
    return `QT-${num}`;
}

export class QuotesRepository {
    async create(tenantId: string, data: CreateQuoteDto, createdById?: string): Promise<any> {
        const quoteNumber = data.quoteNumber || await generateQuoteNumber(tenantId);
        const { subtotal, taxAmount, total } = calculateTotals(data.items, data.taxRate, data.discountAmount);
        const select = await buildQuoteSelect(quoteRelations);

        return prisma.quote.create({
            data: {
                tenantId,
                quoteNumber,
                clientId: data.clientId || null,
                leadId: data.leadId || null,
                issueDate: data.issueDate ? new Date(data.issueDate) : new Date(),
                validUntil: new Date(data.validUntil),
                currency: data.currency || 'CAD',
                status: 'DRAFT',
                taxRate: data.taxRate,
                discountAmount: data.discountAmount || 0,
                notes: data.notes,
                terms: data.terms,
                sourceEventId: data.sourceEventId || null,
                roofEstimateId: data.roofEstimateId || null,
                paymentScheduleType: data.paymentScheduleType || null,
                warrantySelected: data.warrantySelected || null,
                validDays: data.validDays ?? 30,
                subtotal,
                taxAmount,
                total,
                createdById: createdById || null,
                items: {
                    create: data.items.map((item, index) => ({
                        tenantId,
                        description: item.description,
                        quantity: item.quantity,
                        unitPrice: item.unitPrice,
                        total: item.total || (item.quantity * item.unitPrice),
                        sortOrder: item.sortOrder ?? index,
                    })),
                },
            },
            select: select as any,
        });
    }

    async findById(id: string, tenantId: string): Promise<any> {
        const select = await buildQuoteSelect(quoteRelations);
        return prisma.quote.findFirst({ where: { id, tenantId }, select: select as any });
    }

    async findMany(tenantId: string, query: QuoteQueryDto): Promise<{ data: any[]; total: number }> {
        const { page = 1, limit = 20, search, status, clientId, leadId, sortBy = 'issueDate', sortOrder = 'desc' } = query;
        const select = await buildQuoteSelect(quoteRelations);
        const where: Prisma.QuoteWhereInput = {
            tenantId,
            ...(status && { status }),
            ...(clientId && { clientId }),
            ...(leadId && { leadId }),
            ...(search && {
                OR: [
                    { quoteNumber: { contains: search, mode: 'insensitive' as const } },
                    { notes: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            prisma.quote.findMany({ where, select: select as any, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.quote.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateQuoteDto): Promise<any> {
        const existing = await prisma.quote.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });
        if (!existing) throw new Error('Quote not found or access denied');

        let totals = {};
        if (data.items) {
            await prisma.quoteItem.deleteMany({ where: { quoteId: id, tenantId } });
            totals = calculateTotals(data.items, data.taxRate, data.discountAmount);
        }

        const updatePayload: any = {
                ...(data.quoteNumber !== undefined && { quoteNumber: data.quoteNumber }),
                ...(data.clientId !== undefined && { clientId: data.clientId }),
                ...(data.leadId !== undefined && { leadId: data.leadId }),
                ...(data.issueDate !== undefined && { issueDate: new Date(data.issueDate) }),
                ...(data.validUntil !== undefined && { validUntil: new Date(data.validUntil) }),
                ...(data.currency !== undefined && { currency: data.currency }),
                ...(data.status !== undefined && { status: data.status }),
                ...(data.taxRate !== undefined && { taxRate: data.taxRate }),
                ...(data.discountAmount !== undefined && { discountAmount: data.discountAmount }),
                ...(data.notes !== undefined && { notes: data.notes }),
                ...(data.terms !== undefined && { terms: data.terms }),
                ...(data.sourceEventId !== undefined && { sourceEventId: data.sourceEventId || null }),
                ...(data.roofEstimateId !== undefined && { roofEstimateId: data.roofEstimateId || null }),
                ...(data.paymentScheduleType !== undefined && { paymentScheduleType: data.paymentScheduleType || null }),
                ...(data.warrantySelected !== undefined && { warrantySelected: data.warrantySelected || null }),
                ...(data.validDays !== undefined && { validDays: data.validDays }),
                ...(data.publicToken !== undefined && { publicToken: data.publicToken || null }),
                ...(data.isContract !== undefined && { isContract: data.isContract }),
                ...(data.contractVersion !== undefined && { contractVersion: data.contractVersion }),
                ...(data.viewCount !== undefined && { viewCount: data.viewCount }),
                ...(data.firstViewedAt !== undefined && { firstViewedAt: data.firstViewedAt ? new Date(data.firstViewedAt) : null }),
                ...(data.lastViewedAt !== undefined && { lastViewedAt: data.lastViewedAt ? new Date(data.lastViewedAt) : null }),
                ...(data.sentAt !== undefined && { sentAt: data.sentAt ? new Date(data.sentAt) : null }),
                ...(data.acceptedAt !== undefined && { acceptedAt: data.acceptedAt ? new Date(data.acceptedAt) : null }),
                ...(data.signedAt !== undefined && { signedAt: data.signedAt ? new Date(data.signedAt) : null }),
                ...(data.signedBy !== undefined && { signedBy: data.signedBy || null }),
                ...(data.signatureType !== undefined && { signatureType: data.signatureType || null }),
                ...(data.signatureData !== undefined && { signatureData: data.signatureData || null }),
                ...(data.signerIpAddress !== undefined && { signerIpAddress: data.signerIpAddress || null }),
                ...(data.signerUserAgent !== undefined && { signerUserAgent: data.signerUserAgent || null }),
                ...(data.contractSnapshot !== undefined && { contractSnapshot: data.contractSnapshot as Prisma.InputJsonValue | null }),
                ...(data.auditTrail !== undefined && { auditTrail: data.auditTrail as Prisma.InputJsonValue | null }),
                ...(data.signedPdfFileId !== undefined && { signedPdfFileId: data.signedPdfFileId || null }),
                ...(data.rejectedAt !== undefined && { rejectedAt: data.rejectedAt ? new Date(data.rejectedAt) : null }),
                ...totals,
                ...(data.items && {
                    items: {
                        create: data.items.map((item, index) => ({
                            tenantId,
                            description: item.description,
                            quantity: item.quantity,
                            unitPrice: item.unitPrice,
                            total: item.total || (item.quantity * item.unitPrice),
                            sortOrder: item.sortOrder ?? index,
                        })),
                    },
                }),
        };
        const select = await buildQuoteSelect(quoteRelations);
        const safeUpdatePayload = await stripUnsupportedQuoteSignatureFields(updatePayload);

        return prisma.quote.update({
            where: { id_tenantId: { id, tenantId } },
            data: safeUpdatePayload as any,
            select: select as any,
        });
    }

    async delete(id: string, tenantId: string): Promise<{ id: string }> {
        const existing = await prisma.quote.findFirst({
            where: { id, tenantId },
            select: { id: true },
        });
        if (!existing) throw new Error('Quote not found or access denied');

        await prisma.quoteItem.deleteMany({ where: { quoteId: id, tenantId } });
        return prisma.quote.delete({
            where: { id_tenantId: { id, tenantId } },
            select: { id: true },
        });
    }
}

export const quotesRepository = new QuotesRepository();
