import { PrismaClient } from '@prisma/client';

const prisma = new PrismaClient();

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

    async findRolePermissions(roleId: string) {
        const rolePermissions = await prisma.rolePermission.findMany({
            where: { roleId },
            include: { permission: true },
        });
        return rolePermissions.map(rp => rp.permission);
    }

    async syncRolePermissions(roleId: string, permissionIds: string[]) {
        // Delete existing role permissions
        await prisma.rolePermission.deleteMany({ where: { roleId } });

        // Create new role permissions
        if (permissionIds.length > 0) {
            await prisma.rolePermission.createMany({
                data: permissionIds.map(permissionId => ({
                    roleId,
                    permissionId,
                })),
            });
        }

        // Return updated permissions
        return this.findRolePermissions(roleId);
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
