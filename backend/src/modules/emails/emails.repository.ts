import { PrismaClient, Prisma, EmailFolder } from '@prisma/client';
import { SendEmailDto, EmailQueryDto } from './emails.dto';

const prisma = new PrismaClient();
const emailInclude = {
    sentBy: { include: { user: { select: { firstName: true, lastName: true } } } },
    labels: { include: { label: true } },
    attachments: true,
};

export class EmailsRepository {
    async send(tenantId: string, data: SendEmailDto, sentById?: string) {
        return prisma.email.create({
            data: {
                tenantId,
                subject: data.subject,
                bodyText: data.bodyText,
                bodyHtml: data.bodyHtml,
                fromAddress: '', // Will be set by service with configured sender
                toAddresses: data.toAddresses as unknown as Prisma.InputJsonValue,
                ccAddresses: data.ccAddresses as unknown as Prisma.InputJsonValue,
                bccAddresses: data.bccAddresses as unknown as Prisma.InputJsonValue,
                folder: 'SENT',
                status: 'SENT',
                sentById,
                sentAt: new Date(),
                hasAttachments: false,
            },
            include: emailInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.email.findFirst({ where: { id, tenantId }, include: emailInclude });
    }

    async findMany(tenantId: string, query: EmailQueryDto) {
        const { page = 1, limit = 20, search, folder, labelId, sortBy = 'receivedAt', sortOrder = 'desc' } = query;
        const where: Prisma.EmailWhereInput = {
            tenantId,
            deletedAt: null,
            ...(folder && { folder }),
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

    async markAsRead(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.email.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isRead: true } });
    }

    async toggleStar(id: string, tenantId: string, isStarred: boolean) {
        // Verify tenant ownership
        const existing = await prisma.email.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { isStarred } });
    }

    async moveToFolder(id: string, tenantId: string, folder: EmailFolder) {
        // Verify tenant ownership
        const existing = await prisma.email.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { folder } });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped soft delete
        const existing = await prisma.email.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Email not found or access denied');
        return prisma.email.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}

export const emailsRepository = new EmailsRepository();
