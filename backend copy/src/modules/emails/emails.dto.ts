import { Email, EmailFolder, EmailStatus } from '@prisma/client';

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
}

export interface EmailQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    folder?: EmailFolder;
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
    receivedAt: Date | null;
    sentAt: Date | null;
    createdAt: Date;
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
        receivedAt: e.receivedAt,
        sentAt: e.sentAt,
        createdAt: e.createdAt,
    };
}
