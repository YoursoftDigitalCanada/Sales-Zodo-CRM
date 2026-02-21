import { PrismaClient, Prisma } from '@prisma/client';
import { CreateGroupDto, UpdateGroupDto, GroupQueryDto } from './groups.dto';

const prisma = new PrismaClient();
const groupInclude = {
    _count: { select: { members: true } },
    members: { include: { client: { select: { id: true, clientName: true } } } },
};

export class GroupsRepository {
    async create(tenantId: string, data: CreateGroupDto) {
        return prisma.clientGroup.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                color: data.color,
                autoUpdateEnabled: data.autoUpdateEnabled || false,
                autoUpdateRules: data.autoUpdateRules ? (data.autoUpdateRules as Prisma.InputJsonValue) : Prisma.JsonNull,
            },
            include: groupInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.clientGroup.findFirst({ where: { id, tenantId }, include: groupInclude });
    }

    async findMany(tenantId: string, query: GroupQueryDto) {
        const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
        const where: Prisma.ClientGroupWhereInput = {
            tenantId,
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };
        const [data, total] = await Promise.all([
            prisma.clientGroup.findMany({ where, include: groupInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.clientGroup.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, data: UpdateGroupDto) {
        return prisma.clientGroup.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.color !== undefined && { color: data.color }),
                ...(data.autoUpdateEnabled !== undefined && { autoUpdateEnabled: data.autoUpdateEnabled }),
                ...(data.autoUpdateRules !== undefined && { autoUpdateRules: data.autoUpdateRules as Prisma.InputJsonValue }),
            },
            include: groupInclude,
        });
    }

    async delete(id: string) {
        await prisma.clientGroupMember.deleteMany({ where: { groupId: id } });
        return prisma.clientGroup.delete({ where: { id } });
    }

    async addMember(groupId: string, clientId: string) {
        return prisma.clientGroupMember.create({
            data: { groupId, clientId, addedManually: true },
        });
    }

    async removeMember(groupId: string, clientId: string) {
        return prisma.clientGroupMember.deleteMany({
            where: { groupId, clientId },
        });
    }
}

export const groupsRepository = new GroupsRepository();
