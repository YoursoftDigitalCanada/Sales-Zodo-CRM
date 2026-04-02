import { Prisma, EmailFolder } from '@prisma/client';
import { SendEmailDto, SaveDraftDto, EmailQueryDto } from './emails.dto';
import { prisma } from '../../config/database';

const DEFAULT_EMAIL_LABELS = [
    { name: 'Work', color: '#3B82F6' },
    { name: 'Personal', color: '#8B5CF6' },
    { name: 'Clients', color: '#22D3EE' },
    { name: 'Finance', color: '#22C55E' },
    { name: 'Urgent', color: '#EF4444' },
    { name: 'Social', color: '#EC4899' },
] as const;

const emailInclude = {
    sentBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    labels: { include: { label: true } },
    attachments: true,
};

export class EmailsRepository {
    private ownerWhere(tenantId: string, mailboxOwnerUserId: string) {
        return {
            tenantId,
            mailboxOwnerUserId,
        };
    }

    async ensureDefaultLabels(tenantId: string) {
        await prisma.emailLabel.createMany({
            data: DEFAULT_EMAIL_LABELS.map((label) => ({
                tenantId,
                name: label.name,
                color: label.color,
            })),
            skipDuplicates: true,
        });
    }

    async send(
        tenantId: string,
        data: SendEmailDto,
        options: { sentByEmployeeId?: string; mailboxOwnerUserId: string },
    ) {
        return prisma.email.create({
            data: {
                tenantId,
                subject: data.subject,
                bodyText: data.bodyText,
                bodyHtml: data.bodyHtml,
                fromName: data.fromName || null,
                fromAddress: data.fromAddress || '',
                clientId: data.clientId || null,
                leadId: data.leadId || null,
                toAddresses: data.toAddresses as unknown as Prisma.InputJsonValue,
                ccAddresses: data.ccAddresses as unknown as Prisma.InputJsonValue,
                bccAddresses: data.bccAddresses as unknown as Prisma.InputJsonValue,
                folder: 'SENT',
                status: 'SENT',
                sentById: options.sentByEmployeeId,
                mailboxOwnerUserId: options.mailboxOwnerUserId,
                sentAt: new Date(),
                hasAttachments: (data.attachments?.length || 0) > 0,
                attachments: data.attachments && data.attachments.length > 0
                    ? {
                        create: data.attachments.map((attachment) => ({
                            filename: attachment.filename,
                            mimeType: attachment.mimeType,
                            size: BigInt(attachment.size),
                            path: attachment.path,
                        })),
                    }
                    : undefined,
            },
            include: emailInclude,
        });
    }

    async saveDraft(
        tenantId: string,
        data: SaveDraftDto,
        options: { sentByEmployeeId?: string; mailboxOwnerUserId: string },
    ) {
        return prisma.email.create({
            data: {
                tenantId,
                subject: data.subject || '(Draft)',
                bodyText: data.bodyText,
                bodyHtml: data.bodyHtml,
                fromName: data.fromName || null,
                fromAddress: data.fromAddress || '',
                clientId: data.clientId || null,
                leadId: data.leadId || null,
                toAddresses: (data.toAddresses || []) as unknown as Prisma.InputJsonValue,
                ccAddresses: (data.ccAddresses || []) as unknown as Prisma.InputJsonValue,
                bccAddresses: (data.bccAddresses || []) as unknown as Prisma.InputJsonValue,
                folder: 'DRAFTS',
                status: 'DRAFT',
                sentById: options.sentByEmployeeId,
                mailboxOwnerUserId: options.mailboxOwnerUserId,
                scheduledFor: data.scheduledFor ? new Date(data.scheduledFor) : null,
                hasAttachments: (data.attachments?.length || 0) > 0,
                attachments: data.attachments && data.attachments.length > 0
                    ? {
                        create: data.attachments.map((attachment) => ({
                            filename: attachment.filename,
                            mimeType: attachment.mimeType,
                            size: BigInt(attachment.size),
                            path: attachment.path,
                        })),
                    }
                    : undefined,
            },
            include: emailInclude,
        });
    }

    async findById(id: string, tenantId: string, mailboxOwnerUserId: string) {
        return prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
            include: emailInclude,
        });
    }

    async findMany(tenantId: string, mailboxOwnerUserId: string, query: EmailQueryDto) {
        const { page = 1, limit = 20, search, folder, clientId, leadId, labelId, sortBy = 'receivedAt', sortOrder = 'desc' } = query;
        const now = new Date();
        const andFilters: Prisma.EmailWhereInput[] = [];

        if (folder === 'INBOX') {
            andFilters.push({
                OR: [
                    { snoozedUntil: null },
                    { snoozedUntil: { lte: now } },
                ],
            });
        }

        if (search) {
            andFilters.push({
                OR: [
                    { subject: { contains: search, mode: 'insensitive' as const } },
                    { fromAddress: { contains: search, mode: 'insensitive' as const } },
                ],
            });
        }

        const where: Prisma.EmailWhereInput = {
            ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            deletedAt: null,
            ...(folder && { folder }),
            ...(clientId && { clientId }),
            ...(leadId && { leadId }),
            ...(labelId && { labels: { some: { labelId } } }),
            ...(andFilters.length > 0 ? { AND: andFilters } : {}),
        };
        const [data, total] = await Promise.all([
            prisma.email.findMany({ where, include: emailInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.email.count({ where }),
        ]);
        return { data, total };
    }

    async markAsRead(id: string, tenantId: string, mailboxOwnerUserId: string) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isRead: true }, include: emailInclude });
    }

    async updateReadStatus(id: string, tenantId: string, mailboxOwnerUserId: string, isRead: boolean) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isRead }, include: emailInclude });
    }

    async toggleStar(id: string, tenantId: string, mailboxOwnerUserId: string, isStarred: boolean) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isStarred }, include: emailInclude });
    }

    async toggleImportant(id: string, tenantId: string, mailboxOwnerUserId: string, isImportant: boolean) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isImportant }, include: emailInclude });
    }

    async snooze(id: string, tenantId: string, mailboxOwnerUserId: string, snoozedUntil: Date | null) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { snoozedUntil }, include: emailInclude });
    }

    async moveToFolder(id: string, tenantId: string, mailboxOwnerUserId: string, folder: EmailFolder) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { folder }, include: emailInclude });
    }

    async listLabels(tenantId: string) {
        await this.ensureDefaultLabels(tenantId);
        return prisma.emailLabel.findMany({
            where: { tenantId },
            orderBy: [{ createdAt: 'asc' }, { name: 'asc' }],
        });
    }

    async createLabel(tenantId: string, name: string, color?: string | null) {
        return prisma.emailLabel.upsert({
            where: {
                tenantId_name: {
                    tenantId,
                    name,
                },
            },
            create: {
                tenantId,
                name,
                color: color ?? null,
            },
            update: {
                color: color ?? undefined,
            },
        });
    }

    async setLabels(id: string, tenantId: string, mailboxOwnerUserId: string, labelIds: string[]) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');

        const uniqueLabelIds = Array.from(new Set(labelIds));

        if (uniqueLabelIds.length > 0) {
            const labelCount = await prisma.emailLabel.count({
                where: {
                    tenantId,
                    id: { in: uniqueLabelIds },
                },
            });
            if (labelCount !== uniqueLabelIds.length) {
                throw new Error('One or more labels do not belong to this workspace');
            }
        }

        return prisma.$transaction(async (tx) => {
            await tx.emailLabelAssignment.deleteMany({
                where: { emailId: id },
            });

            if (uniqueLabelIds.length > 0) {
                await tx.emailLabelAssignment.createMany({
                    data: uniqueLabelIds.map((labelId) => ({
                        emailId: id,
                        labelId,
                    })),
                    skipDuplicates: true,
                });
            }

            return tx.email.findUniqueOrThrow({
                where: { id },
                include: emailInclude,
            });
        });
    }

    async delete(id: string, tenantId: string, mailboxOwnerUserId: string) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    async permanentlyDelete(id: string, tenantId: string, mailboxOwnerUserId: string) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.delete({ where: { id } });
    }

    async findScheduledDraftsDue() {
        return prisma.email.findMany({
            where: {
                deletedAt: null,
                status: 'DRAFT',
                folder: 'DRAFTS',
                mailboxOwnerUserId: { not: null },
                scheduledFor: { lte: new Date() },
            },
            include: emailInclude,
            orderBy: { scheduledFor: 'asc' },
            take: 25,
        });
    }

    async markDraftSent(
        id: string,
        data: {
            fromName: string;
            fromAddress: string;
            sentAt: Date;
        },
    ) {
        return prisma.email.update({
            where: { id },
            data: {
                folder: 'SENT',
                status: 'SENT',
                fromName: data.fromName,
                fromAddress: data.fromAddress,
                sentAt: data.sentAt,
                scheduledFor: null,
            },
            include: emailInclude,
        });
    }
}

export const emailsRepository = new EmailsRepository();
