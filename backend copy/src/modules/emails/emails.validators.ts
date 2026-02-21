import { z } from 'zod';

export const sendEmailSchema = z.object({
    body: z.object({
        to: z.array(z.string().email()).min(1),
        cc: z.array(z.string().email()).default([]),
        bcc: z.array(z.string().email()).default([]),
        subject: z.string().min(1).max(500),
        body: z.string().min(1),
    }),
});

export const emailQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        folder: z.enum(['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE']).optional(),
        labelId: z.string().uuid().optional(),
        sortBy: z.enum(['receivedAt', 'subject']).default('receivedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const emailIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
