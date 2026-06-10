import { z } from 'zod';

export const importBookkeepingPayloadSchema = z.object({
    accountsToCreate: z.array(z.object({
        tempId: z.string(),
        name: z.string(),
        type: z.string(),
        isBankAccount: z.boolean().optional(),
    })).optional().default([]),
    vendorsToCreate: z.array(z.object({
        tempId: z.string(),
        name: z.string(),
    })).optional().default([]),
    categoriesToCreate: z.array(z.object({
        tempId: z.string(),
        name: z.string(),
        type: z.string(),
    })).optional().default([]),
    transactions: z.array(z.object({
        description: z.string(),
        amount: z.number(),
        currency: z.string().optional().default('CAD'),
        transactionDate: z.string(),
        type: z.enum(['INCOME', 'EXPENSE']),
        accountId: z.string(), // Can be tempId or existing UUID
        categoryId: z.string().optional().nullable(), // Can be tempId or existing UUID
        vendorId: z.string().optional().nullable(), // Can be tempId or existing UUID
        reference: z.string().optional().nullable(),
        paymentMethod: z.string().optional().nullable(),
        status: z.string().optional().default('POSTED'),
        sourceType: z.string().optional().default('CSV_IMPORT'),
    })),
    duplicateStrategy: z.enum(['SKIP', 'REPLACE', 'IMPORT_ALL']).default('SKIP'),
    duplicateTransactionIds: z.array(z.string()).optional().default([]),
});

export type ImportBookkeepingPayload = z.infer<typeof importBookkeepingPayloadSchema>;
