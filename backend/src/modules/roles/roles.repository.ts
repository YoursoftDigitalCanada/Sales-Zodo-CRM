import { PrismaClient, Prisma } from '@prisma/client';
import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from './roles.dto';

const prisma = new PrismaClient();
const roleInclude = {
    _count: { select: { employees: true } },
    permissions: { include: { permission: { select: { id: true, code: true, name: true } } } },
};

export class RolesRepository {
    async create(tenantId: string, data: CreateRoleDto) {
        return prisma.role.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                isDefault: data.isDefault || false,
                ...(data.permissionIds?.length && {
                    permissions: {
                        create: data.permissionIds.map((permissionId) => ({ permissionId })),
                    },
                }),
            },
            include: roleInclude,
        });
    }

    async findById(id: string, tenantId: string) {
        return prisma.role.findFirst({ where: { id, tenantId }, include: roleInclude });
    }

    async findMany(tenantId: string, query: RoleQueryDto) {
        const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
        const where: Prisma.RoleWhereInput = {
            tenantId,
            ...(search && { name: { contains: search, mode: 'insensitive' as const } }),
        };
        const [data, total] = await Promise.all([
            prisma.role.findMany({ where, include: roleInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.role.count({ where }),
        ]);
        return { data, total };
    }

    async update(id: string, tenantId: string, data: UpdateRoleDto) {
        // Verify tenant ownership
        const existing = await prisma.role.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Role not found or access denied');

        // If permissionIds provided, replace all permissions
        if (data.permissionIds) {
            await prisma.rolePermission.deleteMany({ where: { roleId: id } });
        }

        return prisma.role.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
                ...(data.permissionIds && {
                    permissions: {
                        create: data.permissionIds.map((permissionId) => ({ permissionId })),
                    },
                }),
            },
            include: roleInclude,
        });
    }

    async delete(id: string, tenantId: string) {
        // Verify tenant ownership
        const existing = await prisma.role.findFirst({ where: { id, tenantId } });
        if (!existing) throw new Error('Role not found or access denied');

        await prisma.rolePermission.deleteMany({ where: { roleId: id } });
        return prisma.role.delete({ where: { id } });
    }
}

export const rolesRepository = new RolesRepository();
