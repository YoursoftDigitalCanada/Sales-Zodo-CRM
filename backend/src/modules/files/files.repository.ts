import { Prisma } from '@prisma/client';
import { UploadFileDto, UpdateFileDto, FileQueryDto } from './files.dto';
import { v4 as uuidv4 } from 'uuid';
import { prisma } from '../../config/database';
const fileInclude = {
    folder: { select: { id: true, name: true } },
    tags: { include: { tag: { select: { id: true, name: true, color: true } } } },
};

export class FilesRepository {
    // ── CREATE ──
    async create(tenantId: string, data: UploadFileDto) {
        return prisma.file.create({
            data: {
                tenantId,
                name: data.name,
                originalName: data.originalName,
                mimeType: data.mimeType,
                size: BigInt(data.size),
                path: data.path,
                extension: data.extension,
                folderId: data.folderId,
                projectId: data.projectId,
                clientId: data.clientId,
                leadId: data.leadId,
                quoteId: data.quoteId,
                applicationId: data.applicationId,
                checksum: data.checksum,
            },
            include: fileInclude,
        });
    }

    // ── READ ──
    async findById(id: string, tenantId: string) {
        return prisma.file.findFirst({ where: { id, tenantId, deletedAt: null }, include: fileInclude });
    }

    async findByIdIncludingDeleted(id: string, tenantId: string) {
        return prisma.file.findFirst({ where: { id, tenantId }, include: fileInclude });
    }

    async findMany(tenantId: string, query: FileQueryDto) {
        const {
            page = 1,
            limit = 20,
            search,
            folderId,
            clientId,
            projectId,
            leadId,
            quoteId,
            mimeType,
            tag,
            sortBy = 'createdAt',
            sortOrder = 'desc',
        } = query;
        const where: Prisma.FileWhereInput = {
            tenantId,
            deletedAt: null,
            ...(folderId !== undefined && { folderId: folderId || null }),
            ...(clientId && { clientId }),
            ...(projectId && { projectId }),
            ...(leadId && { leadId }),
            ...(quoteId && { quoteId }),
            ...(mimeType && { mimeType: { contains: mimeType } }),
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
            ...(tag && { tags: { some: { tag: { name: { equals: tag, mode: 'insensitive' as const } } } } }),
        };
        const [data, total] = await Promise.all([
            prisma.file.findMany({ where, include: fileInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.file.count({ where }),
        ]);
        return { data, total };
    }

    async findRecent(tenantId: string, limit: number = 20) {
        return prisma.file.findMany({
            where: { tenantId, deletedAt: null },
            include: fileInclude,
            orderBy: { updatedAt: 'desc' },
            take: limit,
        });
    }

    async findStarred(tenantId: string) {
        return prisma.file.findMany({
            where: { tenantId, deletedAt: null, isStarred: true },
            include: fileInclude,
            orderBy: { updatedAt: 'desc' },
        });
    }

    async findTrashed(tenantId: string) {
        return prisma.file.findMany({
            where: { tenantId, deletedAt: { not: null } },
            include: fileInclude,
            orderBy: { deletedAt: 'desc' },
        });
    }

    async findByShareLink(shareLink: string) {
        return prisma.file.findFirst({
            where: { shareLink, deletedAt: null },
            include: fileInclude,
        });
    }

    // ── UPDATE ──
    async update(id: string, tenantId: string, data: UpdateFileDto) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');

        const updateData: Prisma.FileUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.folderId !== undefined) {
            if (data.folderId) {
                const folder = await prisma.folder.findFirst({ where: { id: data.folderId, tenantId, deletedAt: null } });
                if (!folder) throw new Error('Target folder not found or access denied');
            }
            updateData.folder = data.folderId ? { connect: { id: data.folderId } } : { disconnect: true };
        }
        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: updateData,
            include: fileInclude,
        });
    }

    async toggleStar(id: string, tenantId: string) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');
        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: { isStarred: !existing.isStarred },
            include: fileInclude,
        });
    }

    async moveToFolder(id: string, tenantId: string, folderId: string | null) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');

        // Validate target folder belongs to same tenant
        if (folderId) {
            const folder = await prisma.folder.findFirst({ where: { id: folderId, tenantId, deletedAt: null } });
            if (!folder) throw new Error('Target folder not found or access denied');
        }

        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: { folder: folderId ? { connect: { id: folderId } } : { disconnect: true } },
            include: fileInclude,
        });
    }

    async createShareLink(id: string, tenantId: string, expiresInHours?: number) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');

        const shareLink = uuidv4();
        const shareExpiresAt = expiresInHours
            ? new Date(Date.now() + expiresInHours * 60 * 60 * 1000)
            : null;

        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: { isShared: true, shareLink, shareExpiresAt },
            include: fileInclude,
        });
    }

    async removeShareLink(id: string, tenantId: string) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');
        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: { isShared: false, shareLink: null, shareExpiresAt: null },
            include: fileInclude,
        });
    }

    // ── DELETE / RESTORE ──
    async softDelete(id: string, tenantId: string) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');
        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: { deletedAt: new Date() },
        });
    }

    async restore(id: string, tenantId: string) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: { not: null } } });
        if (!existing) throw new Error('File not found in trash');
        return prisma.file.update({
            where: { id_tenantId: { id, tenantId } },
            data: { deletedAt: null },
            include: fileInclude,
        });
    }

    async permanentDelete(id: string, tenantId: string) {
        const existing = await prisma.file.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('File not found or access denied');
        return prisma.file.delete({ where: { id_tenantId: { id, tenantId } } });
    }

    // ── BULK ──
    async bulkSoftDelete(ids: string[], tenantId: string) {
        return prisma.file.updateMany({
            where: { id: { in: ids }, tenantId, deletedAt: null },
            data: { deletedAt: new Date() },
        });
    }

    async bulkMove(ids: string[], tenantId: string, folderId: string | null) {
        // Validate target folder
        if (folderId) {
            const folder = await prisma.folder.findFirst({ where: { id: folderId, tenantId, deletedAt: null } });
            if (!folder) throw new Error('Target folder not found or access denied');
        }
        return prisma.file.updateMany({
            where: { id: { in: ids }, tenantId, deletedAt: null },
            data: { folderId },
        });
    }

    // ── STORAGE ANALYTICS ──
    async getStorageStats(tenantId: string) {
        const result = await prisma.file.aggregate({
            where: { tenantId, deletedAt: null },
            _sum: { size: true },
            _count: true,
        });

        // Category breakdown
        const categories = await prisma.$queryRaw<{ category: string; total_size: bigint }[]>`
            SELECT 
                CASE
                    WHEN "mimeType" LIKE 'image/%' THEN 'images'
                    WHEN "mimeType" LIKE 'video/%' THEN 'videos'
                    WHEN "mimeType" LIKE 'audio/%' THEN 'audio'
                    WHEN "mimeType" LIKE 'application/pdf' OR "mimeType" LIKE 'application/msword%' OR "mimeType" LIKE 'application/vnd.openxml%' OR "mimeType" LIKE 'text/%' THEN 'documents'
                    ELSE 'other'
                END as category,
                SUM("size") as total_size
            FROM "File"
            WHERE "tenantId" = ${tenantId} AND "deletedAt" IS NULL
            GROUP BY category
        `;

        const breakdown: Record<string, number> = { documents: 0, images: 0, videos: 0, audio: 0, other: 0 };
        for (const cat of categories) {
            breakdown[cat.category] = Number(cat.total_size || 0);
        }

        return {
            totalUsed: Number(result._sum.size || 0),
            fileCount: result._count || 0,
            breakdown,
        };
    }

    // Legacy compat
    async delete(id: string, tenantId: string) {
        return this.softDelete(id, tenantId);
    }
}

export const filesRepository = new FilesRepository();
