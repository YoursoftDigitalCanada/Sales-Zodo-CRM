import { z } from 'zod';

export const createSessionSchema = z.object({
  body: z.object({
    name: z.string().max(200).optional(),
    notes: z.string().max(2000).optional(),
  }),
});

export const uploadFileSchema = z.object({
  body: z.object({
    fileContent: z.string().min(1, 'CSV content is required'),
    fileName: z.string().min(1, 'File name is required'),
    accountId: z.string().uuid().optional(),
  }),
});

export const sessionIdSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
  }),
});

export const rawTxIdSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
    rawTxId: z.string().uuid(),
  }),
});

export const matchActionSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
    rawTxId: z.string().uuid(),
  }),
  body: z.object({
    matchedRawTxId: z.string().uuid().optional(),
  }),
});

export const updateRawTxSchema = z.object({
  params: z.object({
    sessionId: z.string().uuid(),
    rawTxId: z.string().uuid(),
  }),
  body: z.object({
    category: z.string().max(100).optional(),
    vendor: z.string().max(200).optional(),
    transactionType: z.enum(['EXPENSE', 'INCOME', 'TRANSFER', 'REFUND']).optional(),
    isTransfer: z.boolean().optional(),
    status: z.enum(['CATEGORIZED', 'NEEDS_REVIEW', 'SKIPPED']).optional(),
  }),
});

export const listRawTxQuerySchema = z.object({
  query: z.object({
    status: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(5000).optional(),
    search: z.string().optional(),
  }).optional(),
});

export const auditLogQuerySchema = z.object({
  query: z.object({
    entityType: z.string().optional(),
    entityId: z.string().optional(),
    action: z.string().optional(),
    page: z.coerce.number().int().positive().optional(),
    limit: z.coerce.number().int().positive().max(200).optional(),
  }).optional(),
});
