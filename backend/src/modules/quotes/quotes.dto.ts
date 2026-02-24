import { Quote, QuoteStatus } from '@prisma/client';
import { Decimal } from '@prisma/client/runtime/library';

// ============================================================================
// QUOTES DTOs - Matching Prisma Schema (Quote, QuoteItem)
// ============================================================================

export interface QuoteItemDto {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    sortOrder?: number;
}

export interface CreateQuoteDto {
    quoteNumber?: string;           // auto-generated if not provided
    clientId?: string | null;
    leadId?: string | null;
    issueDate?: Date | string;
    validUntil: Date | string;
    currency?: string;
    taxRate?: number | null;
    discountAmount?: number;
    notes?: string | null;
    terms?: string | null;
    sourceEventId?: string | null;  // calendar event that triggered this
    items: QuoteItemDto[];
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
    status?: QuoteStatus;
}

export interface QuoteQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: QuoteStatus;
    clientId?: string;
    leadId?: string;
    sortBy?: 'quoteNumber' | 'issueDate' | 'validUntil' | 'total';
    sortOrder?: 'asc' | 'desc';
}

export interface QuoteResponseDto {
    id: string;
    quoteNumber: string;
    status: QuoteStatus;
    client: { id: string; clientName: string } | null;
    leadId: string | null;
    issueDate: Date;
    validUntil: Date;
    currency: string;
    subtotal: number;
    taxRate: number | null;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes: string | null;
    terms: string | null;
    sourceEventId: string | null;
    items: QuoteItemDto[];
    createdAt: Date;
    updatedAt: Date;
    sentAt: Date | null;
    acceptedAt: Date | null;
}

type QuoteWithRelations = Quote & {
    client?: { id: string; clientName: string } | null;
    items?: { id: string; description: string; quantity: Decimal; unitPrice: Decimal; total: Decimal; sortOrder: number }[];
};

export function toQuoteResponseDto(q: QuoteWithRelations): QuoteResponseDto {
    return {
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        client: q.client ? { id: q.client.id, clientName: q.client.clientName } : null,
        leadId: q.leadId,
        issueDate: q.issueDate,
        validUntil: q.validUntil,
        currency: q.currency,
        subtotal: Number(q.subtotal),
        taxRate: q.taxRate ? Number(q.taxRate) : null,
        taxAmount: Number(q.taxAmount),
        discountAmount: Number(q.discountAmount),
        total: Number(q.total),
        notes: q.notes,
        terms: q.terms,
        sourceEventId: q.sourceEventId,
        items: (q.items || []).map((i) => ({
            description: i.description,
            quantity: Number(i.quantity),
            unitPrice: Number(i.unitPrice),
            total: Number(i.total),
            sortOrder: i.sortOrder,
        })),
        createdAt: q.createdAt,
        updatedAt: q.updatedAt,
        sentAt: q.sentAt,
        acceptedAt: q.acceptedAt,
    };
}
