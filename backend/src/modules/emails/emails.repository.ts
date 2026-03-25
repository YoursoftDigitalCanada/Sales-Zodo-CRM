import { Prisma, EmailFolder } from '@prisma/client';
import { SendEmailDto, EmailQueryDto } from './emails.dto';
import { prisma } from '../../config/database';

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
        const { page = 1, limit = 20, search, folder, clientId, labelId, sortBy = 'receivedAt', sortOrder = 'desc' } = query;
        const where: Prisma.EmailWhereInput = {
            ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            deletedAt: null,
            ...(folder && { folder }),
            ...(clientId && { clientId }),
            ...(labelId && { labels: { some: { labelId } } }),
            ...(search && {
                OR: [
                    { subject: { contains: search, mode: 'insensitive' as const } },
                    { fromAddress: { contains: search, mode: 'insensitive' as const } },
                ],
            }),
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
        return prisma.email.update({ where: { id }, data: { isRead: true } });
    }

    async toggleStar(id: string, tenantId: string, mailboxOwnerUserId: string, isStarred: boolean) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isStarred } });
    }

    async moveToFolder(id: string, tenantId: string, mailboxOwnerUserId: string, folder: EmailFolder) {
        const existing = await prisma.email.findFirst({
            where: {
                id,
                ...this.ownerWhere(tenantId, mailboxOwnerUserId),
            },
        });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { folder } });
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
}

export const emailsRepository = new EmailsRepository();
