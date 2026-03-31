import { prisma } from '../../config/database';

const BASE_QUOTE_SCALAR_SELECT = {
    id: true,
    quoteNumber: true,
    status: true,
    clientId: true,
    leadId: true,
    issueDate: true,
    validUntil: true,
    currency: true,
    subtotal: true,
    taxRate: true,
    taxAmount: true,
    discountAmount: true,
    total: true,
    notes: true,
    terms: true,
    sourceEventId: true,
    roofEstimateId: true,
    createdById: true,
    tenantId: true,
    createdAt: true,
    updatedAt: true,
    sentAt: true,
    acceptedAt: true,
    publicToken: true,
    paymentScheduleType: true,
    warrantySelected: true,
    validDays: true,
} as const;

const SIGNATURE_QUOTE_SCALAR_SELECT = {
    isContract: true,
    contractVersion: true,
    viewCount: true,
    firstViewedAt: true,
    lastViewedAt: true,
    signedAt: true,
    signedBy: true,
    signatureType: true,
    signatureData: true,
    signerIpAddress: true,
    signerUserAgent: true,
    contractSnapshot: true,
    auditTrail: true,
    signedPdfFileId: true,
    rejectedAt: true,
} as const;

const SIGNATURE_QUOTE_FIELDS = Object.keys(
    SIGNATURE_QUOTE_SCALAR_SELECT,
) as Array<keyof typeof SIGNATURE_QUOTE_SCALAR_SELECT>;

let quoteColumnsCache: Set<string> | null = null;
let quoteColumnsPromise: Promise<Set<string>> | null = null;

async function loadQuoteColumns(): Promise<Set<string>> {
    if (quoteColumnsCache) {
        return quoteColumnsCache;
    }

    if (!quoteColumnsPromise) {
        quoteColumnsPromise = prisma
            .$queryRaw<Array<{ column_name: string }>>`
                SELECT column_name
                FROM information_schema.columns
                WHERE table_schema = 'public'
                  AND table_name = 'Quote'
            `
            .then((rows) => {
                const columns = new Set(rows.map((row) => row.column_name));
                quoteColumnsCache = columns;
                return columns;
            })
            .finally(() => {
                quoteColumnsPromise = null;
            });
    }

    return quoteColumnsPromise;
}

export async function supportsQuoteSignatureFields(): Promise<boolean> {
    const columns = await loadQuoteColumns();
    return SIGNATURE_QUOTE_FIELDS.every((field) => columns.has(field));
}

export async function buildQuoteSelect(
    relations: Record<string, unknown> = {},
): Promise<Record<string, unknown>> {
    const select: Record<string, unknown> = {
        ...BASE_QUOTE_SCALAR_SELECT,
        ...relations,
    };

    if (await supportsQuoteSignatureFields()) {
        Object.assign(select, SIGNATURE_QUOTE_SCALAR_SELECT);
    }

    return select;
}

export async function stripUnsupportedQuoteSignatureFields<T extends Record<string, unknown>>(
    data: T,
): Promise<Partial<T>> {
    if (await supportsQuoteSignatureFields()) {
        return data;
    }

    const sanitized = { ...data } as Record<string, unknown>;
    for (const field of SIGNATURE_QUOTE_FIELDS) {
        delete sanitized[field];
    }

    return sanitized as Partial<T>;
}
