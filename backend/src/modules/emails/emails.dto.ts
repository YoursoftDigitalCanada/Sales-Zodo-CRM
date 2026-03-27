import { Email, EmailFolder, EmailStatus } from '@prisma/client';

export type EmailEncryption = 'SSL/TLS' | 'STARTTLS' | 'NONE';

// ============================================================================
// EMAILS DTOs - Matching Prisma Schema
// Email model fields: fromAddress, fromName, toAddresses(Json), ccAddresses(Json),
// bccAddresses(Json), subject, bodyText, bodyHtml, status(EmailStatus),
// folder(EmailFolder), isRead, isStarred, sentById, receivedAt, sentAt
// ============================================================================

export interface SendEmailDto {
    toAddresses: { email: string; name?: string }[];
    ccAddresses?: { email: string; name?: string }[];
    bccAddresses?: { email: string; name?: string }[];
    subject: string;
    bodyText?: string;
    bodyHtml?: string;
    fromName?: string;
    fromAddress?: string;
    clientId?: string;
    leadId?: string;
    attachments?: {
        filename: string;
        mimeType: string;
        size: number;
        path: string;
    }[];
}

export interface EmailQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    folder?: EmailFolder;
    clientId?: string;
    leadId?: string;
    labelId?: string;
    sortBy?: 'receivedAt' | 'subject';
    sortOrder?: 'asc' | 'desc';
}

export interface EmailResponseDto {
    id: string;
    subject: string;
    bodyText: string | null;
    bodyHtml: string | null;
    fromAddress: string;
    fromName: string | null;
    toAddresses: unknown;
    ccAddresses: unknown;
    bccAddresses: unknown;
    folder: EmailFolder;
    status: EmailStatus;
    isRead: boolean;
    isStarred: boolean;
    hasAttachments: boolean;
    attachments: {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
        path: string;
    }[];
    receivedAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
}

export interface MailboxSmtpSettingsDto {
    host: string;
    port: number;
    username: string;
    passwordMasked: string;
    encryption: EmailEncryption;
    senderName: string;
    senderEmail: string;
    configured: boolean;
}

export interface MailboxImapSettingsDto {
    host: string;
    port: number;
    username: string;
    passwordMasked: string;
    encryption: EmailEncryption;
    configured: boolean;
}

export interface MailboxSettingsResponseDto {
    smtp: MailboxSmtpSettingsDto;
    imap: MailboxImapSettingsDto;
    mailboxAddress: string | null;
}

export interface MailboxConfigStatusDto {
    smtpConfigured: boolean;
    imapConfigured: boolean;
    mailboxAddress: string | null;
}

export interface UpdateMailboxSmtpDto {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    encryption?: EmailEncryption;
    senderName?: string;
    senderEmail?: string;
}

export interface UpdateMailboxImapDto {
    host?: string;
    port?: number;
    username?: string;
    password?: string;
    encryption?: EmailEncryption;
}

export interface UpdateMailboxSettingsDto {
    smtp?: UpdateMailboxSmtpDto;
    imap?: UpdateMailboxImapDto;
}

type EmailWithRelations = Email & {
    sentBy?: { id: string; user: { firstName: string; lastName: string } } | null;
    labels?: { id: string; label: { id: string; name: string } }[];
    attachments?: { id: string; filename: string; mimeType: string; size: bigint; path: string }[];
};

export function toEmailResponseDto(e: EmailWithRelations): EmailResponseDto {
    return {
        id: e.id,
        subject: e.subject,
        bodyText: e.bodyText,
        bodyHtml: e.bodyHtml,
        fromAddress: e.fromAddress,
        fromName: e.fromName,
        toAddresses: e.toAddresses,
        ccAddresses: e.ccAddresses,
        bccAddresses: e.bccAddresses,
        folder: e.folder,
        status: e.status,
        isRead: e.isRead,
        isStarred: e.isStarred,
        hasAttachments: e.hasAttachments,
        attachments: (e.attachments || []).map((attachment) => ({
            id: attachment.id,
            filename: attachment.filename,
            mimeType: attachment.mimeType,
            size: Number(attachment.size || 0),
            path: attachment.path,
        })),
        receivedAt: e.receivedAt,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
    };
}
