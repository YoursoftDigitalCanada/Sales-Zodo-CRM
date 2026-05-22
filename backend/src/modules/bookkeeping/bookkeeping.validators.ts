import { z } from 'zod';
import {
  BOOKKEEPING_ACCOUNT_TYPES,
  BOOKKEEPING_CATEGORY_TYPES,
  BOOKKEEPING_JOURNAL_STATUSES,
  BOOKKEEPING_RECONCILIATION_STATUSES,
  BOOKKEEPING_RECURRING_FREQUENCIES,
  BOOKKEEPING_TRANSACTION_STATUSES,
  BOOKKEEPING_TRANSACTION_TYPES,
} from './bookkeeping.dto';

const uuid = z.string().uuid();
const optionalUuid = uuid.optional().nullable();
const money = z.coerce.number().finite();
const positiveMoney = z.coerce.number().finite().positive();
const dateString = z.string().datetime().or(z.string().min(8));
const jsonObject = z.record(z.any()).default({});

export const idSchema = z.object({ params: z.object({ id: uuid }) });

export const listQuerySchema = z.object({
  query: z.object({
    page: z.coerce.number().int().min(1).default(1),
    limit: z.coerce.number().int().min(1).max(200).default(50),
    search: z.string().optional(),
    type: z.string().optional(),
    status: z.string().optional(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    vendorId: z.string().optional(),
    sourceType: z.string().optional(),
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    sortBy: z.string().default('createdAt'),
    sortOrder: z.enum(['asc', 'desc']).default('desc'),
  }),
});

export const reportQuerySchema = z.object({
  query: z.object({
    dateFrom: z.string().optional(),
    dateTo: z.string().optional(),
    accountId: z.string().optional(),
    categoryId: z.string().optional(),
    vendorId: z.string().optional(),
  }),
});

export const createAccountSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    code: z.string().max(40).optional().nullable(),
    type: z.enum(BOOKKEEPING_ACCOUNT_TYPES),
    subtype: z.string().max(100).optional().nullable(),
    currency: z.string().length(3).default('CAD'),
    openingBalance: money.default(0),
    institutionName: z.string().max(160).optional().nullable(),
    accountNumberLast4: z.string().max(8).optional().nullable(),
    isBankAccount: z.boolean().default(false),
  }),
});

export const updateAccountSchema = z.object({ body: createAccountSchema.shape.body.partial().extend({ isActive: z.boolean().optional() }) });

export const createCategorySchema = z.object({
  body: z.object({
    name: z.string().min(1).max(120),
    type: z.enum(BOOKKEEPING_CATEGORY_TYPES),
    accountId: optionalUuid,
    color: z.string().max(32).optional().nullable(),
  }),
});

export const updateCategorySchema = z.object({ body: createCategorySchema.shape.body.partial().extend({ isActive: z.boolean().optional() }) });

export const createVendorSchema = z.object({
  body: z.object({
    name: z.string().min(1).max(180),
    email: z.string().email().optional().nullable(),
    phone: z.string().max(40).optional().nullable(),
    website: z.string().max(255).optional().nullable(),
    address: z.string().max(500).optional().nullable(),
    taxId: z.string().max(80).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

export const updateVendorSchema = z.object({ body: createVendorSchema.shape.body.partial().extend({ isActive: z.boolean().optional() }) });

export const createTransactionSchema = z.object({
  body: z.object({
    accountId: optionalUuid,
    categoryId: optionalUuid,
    vendorId: optionalUuid,
    type: z.enum(BOOKKEEPING_TRANSACTION_TYPES),
    description: z.string().min(1).max(500),
    amount: positiveMoney,
    currency: z.string().length(3).default('CAD'),
    transactionDate: dateString,
    paymentMethod: z.string().max(60).optional().nullable(),
    reference: z.string().max(120).optional().nullable(),
    clientId: optionalUuid,
    projectId: optionalUuid,
    invoiceId: optionalUuid,
    expenseId: optionalUuid,
    fileId: optionalUuid,
    status: z.enum(BOOKKEEPING_TRANSACTION_STATUSES).default('POSTED'),
    metadata: jsonObject.optional(),
  }),
});

export const updateTransactionSchema = z.object({ body: createTransactionSchema.shape.body.partial() });

export const attachReceiptSchema = z.object({ body: z.object({ fileId: uuid }) });
export const reconcileTransactionSchema = z.object({ body: z.object({ reconciliationId: optionalUuid }).optional().default({}) });

export const createTransferSchema = z.object({
  body: z.object({
    fromAccountId: uuid,
    toAccountId: uuid,
    amount: positiveMoney,
    currency: z.string().length(3).default('CAD'),
    transferDate: dateString,
    reference: z.string().max(120).optional().nullable(),
    notes: z.string().max(2000).optional().nullable(),
  }),
});

const journalLine = z.object({
  accountId: uuid,
  debit: money.default(0),
  credit: money.default(0),
  description: z.string().max(500).optional().nullable(),
});

export const createJournalEntrySchema = z.object({
  body: z.object({
    description: z.string().min(1).max(500),
    entryDate: dateString,
    sourceType: z.string().max(80).optional().nullable(),
    sourceId: z.string().max(120).optional().nullable(),
    status: z.enum(BOOKKEEPING_JOURNAL_STATUSES).default('DRAFT'),
    lines: z.array(journalLine).min(2),
  }),
});

export const updateJournalEntrySchema = z.object({ body: createJournalEntrySchema.shape.body.partial() });

export const createReconciliationSchema = z.object({
  body: z.object({
    accountId: uuid,
    statementDate: dateString,
    statementStartingBalance: money.default(0),
    statementEndingBalance: money,
    notes: z.string().max(2000).optional().nullable(),
    transactionIds: z.array(uuid).optional().default([]),
  }),
});

export const updateReconciliationSchema = z.object({
  body: createReconciliationSchema.shape.body.partial().extend({
    status: z.enum(BOOKKEEPING_RECONCILIATION_STATUSES).optional(),
  }),
});

export const createRecurringRuleSchema = z.object({
  body: z.object({
    type: z.enum(['INCOME', 'EXPENSE']),
    name: z.string().min(1).max(160),
    description: z.string().max(500).optional().nullable(),
    amount: positiveMoney,
    currency: z.string().length(3).default('CAD'),
    accountId: optionalUuid,
    categoryId: optionalUuid,
    vendorId: optionalUuid,
    clientId: optionalUuid,
    projectId: optionalUuid,
    frequency: z.enum(BOOKKEEPING_RECURRING_FREQUENCIES),
    nextRunAt: dateString,
    endAt: z.string().optional().nullable(),
    metadata: jsonObject.optional(),
  }),
});

export const updateRecurringRuleSchema = z.object({ body: createRecurringRuleSchema.shape.body.partial().extend({ isActive: z.boolean().optional() }) });
