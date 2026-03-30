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
        clientId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        attachmentsCount: z.number().int().min(0).optional().default(0),
    }).refine((data) => {
        const hasBodyText = Boolean(data.bodyText?.trim());
        const hasBodyHtml = Boolean(data.bodyHtml?.trim());
        return hasBodyText || hasBodyHtml || data.attachmentsCount > 0;
    }, {
        message: 'Provide email content or at least one attachment',
    }),
});

export const emailQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(200).default(20),
        search: z.string().optional(),
        folder: z.enum(['INBOX', 'SENT', 'DRAFTS', 'TRASH', 'SPAM', 'ARCHIVE']).optional(),
        clientId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        labelId: z.string().uuid().optional(),
        sortBy: z.enum(['receivedAt', 'subject']).default('receivedAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const emailIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

const emailEncryptionSchema = z.enum(['SSL/TLS', 'STARTTLS', 'NONE']);

export const updateMailboxSettingsSchema = z.object({
    body: z.object({
        smtp: z.object({
            host: z.string().trim().max(255).optional(),
            port: z.coerce.number().int().min(1).max(65535).optional(),
            username: z.string().trim().max(255).optional(),
            password: z.string().max(255).optional(),
            encryption: emailEncryptionSchema.optional(),
            senderName: z.string().trim().max(255).optional(),
            senderEmail: z.string().trim().email().optional(),
        }).optional(),
        imap: z.object({
            host: z.string().trim().max(255).optional(),
            port: z.coerce.number().int().min(1).max(65535).optional(),
            username: z.string().trim().max(255).optional(),
            password: z.string().max(255).optional(),
            encryption: emailEncryptionSchema.optional(),
        }).optional(),
    }).refine((data) => Boolean(data.smtp || data.imap), {
        message: 'Provide SMTP or IMAP mailbox settings to update',
    }),
});
