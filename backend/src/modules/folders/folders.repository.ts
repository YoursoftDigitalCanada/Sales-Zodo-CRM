import { PrismaClient, Prisma } from '@prisma/client';
import { CreateFolderDto, UpdateFolderDto, FolderQueryDto } from './folders.dto';

const prisma = new PrismaClient();
const folderInclude = {
    parent: { select: { id: true, name: true } },
    _count: { select: { files: true, children: true } },
};

export class FoldersRepository {
    async create(tenantId: string, data: CreateFolderDto) {
        return prisma.folder.create({
            data: {
                tenantId,
                name: data.name,
                parentId: data.parentId,
                isShared: data.isShared || false,
                sharedWith: data.sharedWith || undefined,
            },
            include: folderInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.folder.findFirst({ where: { id, tenantId, deletedAt: null }, include: folderInclude });
    }

    async findMany(tenantId: string, query: FolderQueryDto) {
        const { page = 1, limit = 20, parentId, search, sortBy = 'name', sortOrder = 'asc' } = query;
        const where: Prisma.FolderWhereInput = {
            tenantId,
            deletedAt: null,
            ...(parentId !== undefined && { parentId }),
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };
        const [data, total] = await Promise.all([
            prisma.folder.findMany({ where, include: folderInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.folder.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateFolderDto) {
        // Verify tenant ownership
        const existing = await prisma.folder.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('Folder not found or access denied');

        const updateData: Prisma.FolderUpdateInput = {};
        if (data.name !== undefined) updateData.name = data.name;
        if (data.parentId !== undefined) {
            updateData.parent = data.parentId ? { connect: { id: data.parentId } } : { disconnect: true };
        }
        if (data.isShared !== undefined) updateData.isShared = data.isShared;
        if (data.sharedWith !== undefined) updateData.sharedWith = data.sharedWith as Prisma.InputJsonValue;

        return prisma.folder.update({
            where: { id },
            data: updateData,
            include: folderInclude,
        });
    }

    async softDelete(id: string, tenantId: string) {
        // Tenant-scoped soft delete
        const existing = await prisma.folder.findFirst({ where: { id, tenantId, deletedAt: null } });
        if (!existing) throw new Error('Folder not found or access denied');
        return prisma.folder.update({ where: { id }, data: { deletedAt: new Date() } });
    }

    async delete(id: string, tenantId: string) {
        // Tenant-scoped hard delete
        const existing = await prisma.folder.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Folder not found or access denied');
        return prisma.folder.delete({ where: { id } });
    }
}

export const foldersRepository = new FoldersRepository();
