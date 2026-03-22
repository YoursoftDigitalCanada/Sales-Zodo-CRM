import { z } from 'zod';

export const addFundsSchema = z.object({
    body: z.object({
        amount: z.number().positive({ message: 'Amount must be greater than 0' }),
        description: z.string().max(500).optional(),
    }),
});

export const checkBalanceSchema = z.object({
    body: z.object({
        amount: z.number().positive({ message: 'Amount must be greater than 0' }),
    }),
});

export const transactionQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1).optional(),
        limit: z.coerce.number().int().min(1).max(100).default(20).optional(),
    }),
});
