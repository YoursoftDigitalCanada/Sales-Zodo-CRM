import { z } from 'zod';

const emailAddress = z.object({
    email: z.string().email(),
    name: z.string().optional(),
});

export const sendEmailSchema = z.object({
    body: z.object({
        toAddresses: z.array(emailAddress).min(1),
        ccAddresses: z.array(emailAddress).optional().default([]),
        bccAddresses: z.array(emailAddress).optional().default([]),
        subject: z.string().min(1).max(500),
        bodyText: z.string().optional(),
        bodyHtml: z.string().optional(),
    }).refine((data) => data.bodyText || data.bodyHtml, {
        message: 'Either bodyText or bodyHtml must be provided',
    }),
});

export const emailQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        folder: z.enum(['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE']).optional(),
        clientId: z.string().uuid().optional(),
        labelId: z.string().uuid().optional(),
        sortBy: z.enum(['receivedAt', 'subject']).default('receivedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const emailIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});
