import { z } from 'zod';

// ── Create Contract ─────────────────────────────────────────────────────

export const createContractSchema = z.object({
    contractNumber: z.string().optional(),
    title: z.string().min(1, 'Title is required'),
    description: z.string().nullable().optional(),
    clientId: z.string().uuid('Client ID must be a valid UUID'),
    contactId: z.string().uuid().nullable().optional(),
    quoteId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    value: z.number().min(0, 'Value must be non-negative'),
    currency: z.string().optional(),
    startDate: z.string().min(1, 'Start date is required'),
    endDate: z.string().min(1, 'End date is required'),
    terms: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

// ── Update Contract ─────────────────────────────────────────────────────

export const updateContractSchema = z.object({
    contractNumber: z.string().optional(),
    title: z.string().min(1).optional(),
    description: z.string().nullable().optional(),
    clientId: z.string().uuid().optional(),
    contactId: z.string().uuid().nullable().optional(),
    quoteId: z.string().uuid().nullable().optional(),
    projectId: z.string().uuid().nullable().optional(),
    value: z.number().min(0).optional(),
    currency: z.string().optional(),
    startDate: z.string().optional(),
    endDate: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']).optional(),
    terms: z.string().nullable().optional(),
    notes: z.string().nullable().optional(),
});

// ── Query ───────────────────────────────────────────────────────────────

export const contractQuerySchema = z.object({
    page: z.coerce.number().int().positive().optional().default(1),
    limit: z.coerce.number().int().min(1).max(200).optional().default(20),
    search: z.string().optional(),
    status: z.enum(['DRAFT', 'SENT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']).optional(),
    clientId: z.string().uuid().optional(),
    sortBy: z.enum(['contractNumber', 'title', 'startDate', 'endDate', 'value', 'createdAt']).optional(),
    sortOrder: z.enum(['asc', 'desc']).optional(),
});

// ── Status Update ───────────────────────────────────────────────────────

export const updateContractStatusSchema = z.object({
    status: z.enum(['DRAFT', 'SENT', 'ACTIVE', 'COMPLETED', 'CANCELLED', 'EXPIRED']),
});
