import { z } from 'zod';

export const createExpenseSchema = z.object({
    body: z.object({
        category: z.string().min(1).max(100),
        description: z.string().min(1).max(500),
        amount: z.number().min(0.01),
        currency: z.string().length(3).default('USD'),
        expenseDate: z.string().datetime(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).default('PENDING'),
        receipt: z.string().url().optional().nullable(),
        projectId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        notes: z.string().optional().nullable(),
    }),
});

export const updateExpenseSchema = z.object({
    body: z.object({
        category: z.string().min(1).max(100).optional(),
        description: z.string().min(1).max(500).optional(),
        amount: z.number().min(0.01).optional(),
        currency: z.string().length(3).optional(),
        expenseDate: z.string().datetime().optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
        receipt: z.string().url().optional().nullable(),
        projectId: z.string().uuid().optional().nullable(),
        clientId: z.string().uuid().optional().nullable(),
        notes: z.string().optional().nullable(),
    }),
});

export const expenseQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        status: z.enum(['PENDING', 'APPROVED', 'REJECTED', 'REIMBURSED']).optional(),
        category: z.string().optional(),
        sortBy: z.enum(['expenseDate', 'amount', 'category', 'status']).default('expenseDate'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const expenseIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
