import { PrismaClient, Prisma } from '@prisma/client';
import { UploadFileDto, UpdateFileDto, FileQueryDto } from './files.dto';

const prisma = new PrismaClient();
const fileInclude = {
    folder: { select: { id: true, name: true } },
};

export class FilesRepository {
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
                applicationId: data.applicationId,
            },
            include: fileInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.file.findFirst({ where: { id, tenantId, deletedAt: null }, include: fileInclude });
    }

    async findMany(tenantId: string, query: FileQueryDto) {
        const { page = 1, limit = 20, search, folderId, mimeType, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where: Prisma.FileWhereInput = {
            tenantId,
            deletedAt: null,
            ...(folderId && { folderId }),
            ...(mimeType && { mimeType: { contains: mimeType } }),
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };
        const [data, total] = await Promise.all([
            prisma.file.findMany({ where, include: fileInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.file.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateFileDto) {
        // Verify tenant ownership
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');

        const updateData: Prisma.FileUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.folderId !== undefined) {
            updateData.folder = data.folderId ? { connect: { id: data.folderId } } : { disconnect: true };
        }
        return prisma.file.update({ where: { id }, data: updateData, include: fileInclude });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped soft delete
        const existing = await prisma.file.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('File not found or access denied');
        return prisma.file.update({ where: { id }, data: { deletedAt: new Date() } });
    }
}

export const filesRepository = new FilesRepository();
