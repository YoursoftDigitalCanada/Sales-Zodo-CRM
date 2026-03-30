import { z } from 'zod';

// ── Quote Item Schema ───────────────────────────────────────────────────

const quoteItemSchema = z.object({
    description: z.string().min(1, 'Description is required'),
    quantity: z.number().positive('Quantity must be positive'),
    unitPrice: z.number().min(0, 'Unit price must be non-negative'),
    total: z.number().min(0, 'Total must be non-negative'),
    sortOrder: z.number().int().optional(),
});

// ── Create Quote ────────────────────────────────────────────────────────

export const createQuoteSchema = z.object({
    quoteNumber: z.string().optional(),
    clientId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    issueDate: z.string().optional(),
    validUntil: z.string().min(1, 'Valid until date is required'),
    currency: z.string().optional(),
    taxRate: z.number().min(0).max(100).nullable().optional(),
    discountAmount: z.number().min(0).optional(),
    notes: z.string().nullable().optional(),
    terms: z.string().nullable().optional(),
    sourceEventId: z.string().uuid().nullable().optional(),
    roofEstimateId: z.string().uuid().nullable().optional(),
    // Stage 3 fields
    paymentScheduleType: z.enum(['full_upfront', '50_50', 'milestone', 'net_30']).nullable().optional(),
    warrantySelected: z.enum(['standard', 'extended', 'premium']).nullable().optional(),
    validDays: z.number().int().min(1).max(365).optional(),
    items: z.array(quoteItemSchema).min(1, 'At least one item is required'),
});

// ── Update Quote ────────────────────────────────────────────────────────

export const updateQuoteSchema = z.object({
    quoteNumber: z.string().optional(),
    clientId: z.string().uuid().nullable().optional(),
    leadId: z.string().uuid().nullable().optional(),
    issueDate: z.string().optional(),
    validUntil: z.string().optional(),
    currency: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'SIGNED', 'REJECTED', 'EXPIRED']).optional(),
    taxRate: z.number().min(0).max(100).nullable().optional(),
    discountAmount: z.number().min(0).optional(),
    notes: z.string().nullable().optional(),
    terms: z.string().nullable().optional(),
    items: z.array(quoteItemSchema).optional(),
    roofEstimateId: z.string().uuid().nullable().optional(),
    paymentScheduleType: z.enum(['full_upfront', '50_50', 'milestone', 'net_30']).nullable().optional(),
    warrantySelected: z.enum(['standard', 'extended', 'premium']).nullable().optional(),
    validDays: z.number().int().min(1).max(365).optional(),
});

// ── Query ───────────────────────────────────────────────────────────────

export const quoteQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(20),
    search: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'VIEWED', 'ACCEPTED', 'SIGNED', 'REJECTED', 'EXPIRED']).optional(),
    clientId: z.string().uuid().optional(),
    leadId: z.string().uuid().optional(),
    sortBy: z.enum(['quoteNumber', 'issueDate', 'validUntil', 'total']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});
