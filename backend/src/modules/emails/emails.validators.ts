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

export const saveDraftSchema = z.object({
    body: z.object({
        toAddresses: z.array(emailAddress).optional().default([]),
        ccAddresses: z.array(emailAddress).optional().default([]),
        bccAddresses: z.array(emailAddress).optional().default([]),
        subject: z.string().max(500).optional(),
        bodyText: z.string().optional(),
        bodyHtml: z.string().optional(),
        clientId: z.string().uuid().optional(),
        leadId: z.string().uuid().optional(),
        scheduledFor: z.string().datetime().nullable().optional(),
        attachmentsCount: z.number().int().min(0).optional().default(0),
    }).refine((data) => {
        const hasRecipients = (data.toAddresses?.length || 0) > 0 || (data.ccAddresses?.length || 0) > 0 || (data.bccAddresses?.length || 0) > 0;
        const hasBodyText = Boolean(data.bodyText?.trim());
        const hasBodyHtml = Boolean(data.bodyHtml?.trim());
        const hasSubject = Boolean(data.subject?.trim());
        return hasRecipients || hasBodyText || hasBodyHtml || hasSubject || data.attachmentsCount > 0;
    }, {
        message: 'Provide at least one draft field or attachment',
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

export const updateEmailReadSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        isRead: z.boolean().optional(),
    }),
});

export const updateEmailImportantSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        isImportant: z.boolean(),
    }),
});

export const updateEmailLabelsSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        labelIds: z.array(z.string().uuid()).default([]),
    }),
});

export const snoozeEmailSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
    body: z.object({
        snoozedUntil: z.string().datetime().nullable().optional(),
    }),
});

export const createEmailLabelSchema = z.object({
    body: z.object({
        name: z.string().trim().min(1).max(100),
        color: z.string().trim().max(32).nullable().optional(),
    }),
});

const emailEncryptionSchema = z.enum(['SSL/TLS', 'STARTTLS', 'NONE']);

function normalizeMailHost(host?: string): string {
    return String(host || '')
        .trim()
        .replace(/^(smtp|imap|pop3):\/\//i, '')
        .replace(/\/.*$/, '')
        .toLowerCase();
}

function isHostingerHost(host?: string): boolean {
    return normalizeMailHost(host).includes('hostinger.com');
}

function isTitanHost(host?: string): boolean {
    return normalizeMailHost(host).includes('titan.email');
}

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
        }).superRefine((data, ctx) => {
            if (isHostingerHost(data.host) && data.port !== undefined && ![465, 587].includes(data.port)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['port'],
                    message: 'Hostinger SMTP uses port 465 with SSL/TLS or port 587 with STARTTLS. Port 467 will timeout.',
                });
            }
            if (isTitanHost(data.host) && data.port !== undefined && ![465, 587].includes(data.port)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['port'],
                    message: 'Titan Mail SMTP uses port 465 with SSL/TLS or port 587 with STARTTLS.',
                });
            }
        }).optional(),
        imap: z.object({
            host: z.string().trim().max(255).optional(),
            port: z.coerce.number().int().min(1).max(65535).optional(),
            username: z.string().trim().max(255).optional(),
            password: z.string().max(255).optional(),
            encryption: emailEncryptionSchema.optional(),
        }).superRefine((data, ctx) => {
            const host = normalizeMailHost(data.host);
            if (host === 'imap.histinger.com') {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['host'],
                    message: 'Use imap.hostinger.com for Hostinger IMAP.',
                });
            }
            if (isHostingerHost(data.host) && data.port !== undefined && ![993, 143].includes(data.port)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['port'],
                    message: 'Hostinger IMAP uses port 993 with SSL/TLS or port 143 with STARTTLS.',
                });
            }
            if (isTitanHost(data.host) && data.port !== undefined && ![993, 143].includes(data.port)) {
                ctx.addIssue({
                    code: z.ZodIssueCode.custom,
                    path: ['port'],
                    message: 'Titan Mail IMAP uses port 993 with SSL/TLS or port 143 with STARTTLS.',
                });
            }
        }).optional(),
    }).refine((data) => Boolean(data.smtp || data.imap), {
        message: 'Provide SMTP or IMAP mailbox settings to update',
    }),
});
