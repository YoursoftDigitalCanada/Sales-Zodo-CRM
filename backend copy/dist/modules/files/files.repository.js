"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.filesRepository = exports.FilesRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const fileInclude = {
    folder: { select: { id: true, name: true } },
    uploadedBy: { include: { user: { select: { firstName: true, lastName: true } } } },
};
class FilesRepository {
    async create(tenantId, data, uploadedById) {
        return prisma.file.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                mimeType: data.mimeType || 'application/octet-stream',
                size: data.size || 0,
                url: data.url || '',
                path: data.path,
                folderId: data.folderId,
                clientId: data.clientId,
                projectId: data.projectId,
                uploadedById,
            },
            include: fileInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.file.findFirst({ where: { id, tenantId }, include: fileInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, folderId, clientId, projectId, mimeType, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where = {
            tenantId,
            ...(folderId !== undefined && { folderId }),
            ...(clientId && { clientId }),
            ...(projectId && { projectId }),
            ...(mimeType && { mimeType: { startsWith: mimeType } }),
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.file.findMany({ where, include: fileInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.file.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.file.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.folderId !== undefined && { folderId: data.folderId }),
                ...(data.description !== undefined && { description: data.description }),
            },
            include: fileInclude,
        });
    }
    async delete(id) {
        return prisma.file.delete({ where: { id } });
    }
}
exports.FilesRepository = FilesRepository;
exports.filesRepository = new FilesRepository();
//# sourceMappingURL=files.repository.js.map