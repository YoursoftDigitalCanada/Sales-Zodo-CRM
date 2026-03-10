import { z } from 'zod';

// ============================================================================
// PROPOSALS Validators — Stage 3
// ============================================================================

export const createProposalSchema = z.object({
    leadId: z.string().uuid(),
    quoteId: z.string().uuid(),
    roofEstimateId: z.string().uuid().optional().nullable(),
    customMessageToClient: z.string().max(5000).optional().nullable(),
    scopeOfWork: z.string().max(10000).optional().nullable(),
    termsAndConditions: z.string().max(10000).optional().nullable(),
});

export const updateProposalSchema = z.object({
    status: z.enum(['DRAFT', 'GENERATED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
    customMessageToClient: z.string().max(5000).optional().nullable(),
    coverPageHtml: z.string().max(50000).optional().nullable(),
    scopeOfWork: z.string().max(10000).optional().nullable(),
    termsAndConditions: z.string().max(10000).optional().nullable(),
    pdfUrl: z.string().max(500).optional().nullable(),
});

export const proposalQuerySchema = z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(100).default(20),
    search: z.string().max(200).optional(),
    status: z.enum(['DRAFT', 'GENERATED', 'SENT', 'ACCEPTED', 'DECLINED', 'EXPIRED']).optional(),
    leadId: z.string().uuid().optional(),
    quoteId: z.string().uuid().optional(),
    sortBy: z.enum(['proposalNumber', 'createdAt', 'status']).default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
});

export const proposalIdParamSchema = z.object({
    id: z.string().uuid(),
});
