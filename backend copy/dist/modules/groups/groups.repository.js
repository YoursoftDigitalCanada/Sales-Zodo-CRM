"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.groupsRepository = exports.GroupsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const groupInclude = { _count: { select: { members: true } } };
class GroupsRepository {
    async create(tenantId, data) {
        return prisma.group.create({
            data: {
                tenantId,
                groupName: data.groupName,
                description: data.description,
                groupType: data.groupType || 'CUSTOM',
                icon: data.icon,
                color: data.color,
                autoUpdateMembers: data.autoUpdateMembers || false,
            },
            include: groupInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.group.findFirst({ where: { id, tenantId }, include: groupInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, groupType, sortBy = 'groupName', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(groupType && { groupType }),
            ...(search && { groupName: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.group.findMany({ where, include: groupInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.group.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.group.update({
            where: { id },
            data: {
                ...(data.groupName !== undefined && { groupName: data.groupName }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.groupType !== undefined && { groupType: data.groupType }),
                ...(data.icon !== undefined && { icon: data.icon }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.autoUpdateMembers !== undefined && { autoUpdateMembers: data.autoUpdateMembers }),
            },
            include: groupInclude,
        });
    }
    async delete(id) {
        await prisma.groupMember.deleteMany({ where: { groupId: id } });
        return prisma.group.delete({ where: { id } });
    }
    async addMembers(id, clientIds) {
        await prisma.groupMember.createMany({
            data: clientIds.map((clientId) => ({ groupId: id, clientId })),
            skipDuplicates: true,
        });
        return this.findById(id, '');
    }
    async removeMembers(id, clientIds) {
        await prisma.groupMember.deleteMany({ where: { groupId: id, clientId: { in: clientIds } } });
    }
}
exports.GroupsRepository = GroupsRepository;
exports.groupsRepository = new GroupsRepository();
//# sourceMappingURL=groups.repository.js.map