import { prisma } from '../../config/database';

export class PermissionsRepository {
    async findAll() {
        return prisma.permission.findMany({
            orderBy: [{ module: 'asc' }, { action: 'asc' }],
        });
    }

    async findByModule(module: string) {
        return prisma.permission.findMany({
            where: { module },
            orderBy: { action: 'asc' },
        });
    }

    async findByIds(ids: string[]) {
        return prisma.permission.findMany({
            where: { id: { in: ids } },
        });
    }

    async findRolePermissions(roleId: string, tenantId: string) {
        const role = await prisma.role.findFirst({
            where: { id: roleId, tenantId },
            include: {
                permissions: {
                    include: { permission: true },
                },
            },
        });
        return role?.permissions.map((rp) => rp.permission) || null;
    }

    async syncRolePermissions(roleId: string, tenantId: string, permissionIds: string[]) {
        const role = await prisma.role.findFirst({
            where: { id: roleId, tenantId },
            select: { id: true },
        });

        if (!role) {
            return null;
        }

        await prisma.$transaction(async (tx) => {
            await tx.rolePermission.deleteMany({ where: { roleId } });

            if (permissionIds.length > 0) {
                await tx.rolePermission.createMany({
                    data: permissionIds.map((permissionId) => ({
                        roleId,
                        permissionId,
                    })),
                });
            }
        });

        return this.findRolePermissions(roleId, tenantId);
    }

    async getAllModules() {
        const permissions = await prisma.permission.findMany({
            select: { module: true },
            distinct: ['module'],
            orderBy: { module: 'asc' },
        });
        return permissions.map(p => p.module);
    }
}

export const permissionsRepository = new PermissionsRepository();
