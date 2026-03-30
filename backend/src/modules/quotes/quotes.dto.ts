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
    roofEstimateId?: string | null; // linked roof estimate for PDF attachment
    // Stage 3 fields
    paymentScheduleType?: string | null;  // "full_upfront", "50_50", "milestone", "net_30"
    warrantySelected?: string | null;     // "standard", "extended", "premium"
    validDays?: number;                   // days quote remains valid (default: 30)
    items: QuoteItemDto[];
}

export interface UpdateQuoteDto extends Partial<CreateQuoteDto> {
    status?: QuoteStatus;
    publicToken?: string | null;
    isContract?: boolean;
    contractVersion?: number;
    viewCount?: number;
    firstViewedAt?: Date | string | null;
    lastViewedAt?: Date | string | null;
    sentAt?: Date | string | null;
    acceptedAt?: Date | string | null;
    signedAt?: Date | string | null;
    signedBy?: string | null;
    signatureType?: string | null;
    signatureData?: string | null;
    signerIpAddress?: string | null;
    signerUserAgent?: string | null;
    contractSnapshot?: Record<string, unknown> | null;
    auditTrail?: Record<string, unknown> | null;
    signedPdfFileId?: string | null;
    rejectedAt?: Date | string | null;
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
    lead: { id: string; firstName: string; lastName: string; companyName: string | null } | null;
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
    roofEstimateId: string | null;
    items: QuoteItemDto[];
    createdAt: Date;
    updatedAt: Date;
    sentAt: Date | null;
    acceptedAt: Date | null;
    publicToken: string | null;
    isContract: boolean;
    contractVersion: number;
    viewCount: number;
    firstViewedAt: Date | null;
    lastViewedAt: Date | null;
    signedAt: Date | null;
    signedBy: string | null;
    signatureType: string | null;
    signedPdfFileId: string | null;
    rejectedAt: Date | null;
    linkedProjectId: string | null;
    auditTrail: Record<string, unknown> | null;
    // Stage 3 fields
    paymentScheduleType: string | null;
    warrantySelected: string | null;
    validDays: number;
}

type QuoteWithRelations = Quote & {
    client?: { id: string; clientName: string } | null;
    lead?: { id: string; firstName: string; lastName: string; companyName: string | null } | null;
    items?: { id: string; description: string; quantity: Decimal; unitPrice: Decimal; total: Decimal; sortOrder: number }[];
    projects?: { id: string }[];
};

export function toQuoteResponseDto(q: QuoteWithRelations): QuoteResponseDto {
    return {
        id: q.id,
        quoteNumber: q.quoteNumber,
        status: q.status,
        client: q.client ? { id: q.client.id, clientName: q.client.clientName } : null,
        lead: q.lead
            ? {
                id: q.lead.id,
                firstName: q.lead.firstName,
                lastName: q.lead.lastName,
                companyName: q.lead.companyName || null,
            }
            : null,
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
        roofEstimateId: q.roofEstimateId || null,
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
        publicToken: q.publicToken || null,
        isContract: (q as any).isContract ?? false,
        contractVersion: (q as any).contractVersion ?? 0,
        viewCount: (q as any).viewCount ?? 0,
        firstViewedAt: (q as any).firstViewedAt ?? null,
        lastViewedAt: (q as any).lastViewedAt ?? null,
        signedAt: (q as any).signedAt ?? null,
        signedBy: (q as any).signedBy ?? null,
        signatureType: (q as any).signatureType ?? null,
        signedPdfFileId: (q as any).signedPdfFileId ?? null,
        rejectedAt: (q as any).rejectedAt ?? null,
        linkedProjectId: (q as any).projects?.[0]?.id ?? null,
        auditTrail: ((q as any).auditTrail as Record<string, unknown> | null) ?? null,
        paymentScheduleType: (q as any).paymentScheduleType || null,
        warrantySelected: (q as any).warrantySelected || null,
        validDays: (q as any).validDays ?? 30,
    };
}
