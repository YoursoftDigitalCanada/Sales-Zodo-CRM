"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.foldersRepository = exports.FoldersRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const folderInclude = {
    parent: { select: { id: true, name: true } },
    _count: { select: { files: true, children: true } },
};
class FoldersRepository {
    async create(tenantId, data) {
        return prisma.folder.create({
            data: { tenantId, name: data.name, parentId: data.parentId, description: data.description },
            include: folderInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.folder.findFirst({ where: { id, tenantId }, include: folderInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 50, parentId, search, sortBy = 'name', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(parentId !== undefined && { parentId }),
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.folder.findMany({ where, include: folderInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.folder.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.folder.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.parentId !== undefined && { parentId: data.parentId }),
                ...(data.description !== undefined && { description: data.description }),
            },
            include: folderInclude,
        });
    }
    async delete(id) {
        return prisma.folder.delete({ where: { id } });
    }
}
exports.FoldersRepository = FoldersRepository;
exports.foldersRepository = new FoldersRepository();
//# sourceMappingURL=folders.repository.js.map