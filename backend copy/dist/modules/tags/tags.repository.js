"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tagsRepository = exports.TagsRepository = void 0;
const database_1 = require("../../config/database");
class TagsRepository {
    async create(tenantId, data) {
        return database_1.prisma.tag.create({
            data: {
                ...data,
                tenantId,
            },
        });
    }
    async findById(id, tenantId) {
        return database_1.prisma.tag.findFirst({
            where: { id, tenantId },
        });
    }
    async findByName(name, tenantId, excludeId) {
        return database_1.prisma.tag.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                tenantId,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 50, search } = query;
        const where = {
            tenantId,
            ...(search && {
                name: { contains: search, mode: 'insensitive' },
            }),
        };
        const [data, total] = await Promise.all([
            database_1.prisma.tag.findMany({
                where,
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            database_1.prisma.tag.count({ where }),
        ]);
        return { data, total };
    }
    async findAll(tenantId) {
        return database_1.prisma.tag.findMany({
            where: { tenantId },
            orderBy: { name: 'asc' },
        });
    }
    async update(id, tenantId, data) {
        return database_1.prisma.tag.update({
            where: { id },
            data,
        });
    }
    async delete(id, tenantId) {
        // Delete tag associations first
        await database_1.prisma.leadTag.deleteMany({ where: { tagId: id } });
        await database_1.prisma.taskTag.deleteMany({ where: { tagId: id } });
        await database_1.prisma.fileTag.deleteMany({ where: { tagId: id } });
        return database_1.prisma.tag.deleteMany({
            where: { id, tenantId },
        });
    }
    async hasAssociations(id) {
        const [leadCount, taskCount, fileCount] = await Promise.all([
            database_1.prisma.leadTag.count({ where: { tagId: id } }),
            database_1.prisma.taskTag.count({ where: { tagId: id } }),
            database_1.prisma.fileTag.count({ where: { tagId: id } }),
        ]);
        return leadCount + taskCount + fileCount > 0;
    }
}
exports.TagsRepository = TagsRepository;
exports.tagsRepository = new TagsRepository();
//# sourceMappingURL=tags.repository.js.map