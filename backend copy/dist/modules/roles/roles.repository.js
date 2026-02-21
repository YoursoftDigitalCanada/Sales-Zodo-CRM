"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.rolesRepository = exports.RolesRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const roleInclude = { _count: { select: { users: true } } };
class RolesRepository {
    async create(tenantId, data) {
        return prisma.role.create({
            data: {
                tenantId,
                name: data.name,
                description: data.description,
                permissions: data.permissions || [],
                isDefault: data.isDefault || false,
            },
            include: roleInclude,
        });
    }
    async findById(id, tenantId) {
        return prisma.role.findFirst({ where: { id, tenantId }, include: roleInclude });
    }
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, sortBy = 'name', sortOrder = 'asc' } = query;
        const where = {
            tenantId,
            ...(search && { name: { contains: search, mode: 'insensitive' } }),
        };
        const [data, total] = await Promise.all([
            prisma.role.findMany({ where, include: roleInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.role.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.role.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.description !== undefined && { description: data.description }),
                ...(data.permissions !== undefined && { permissions: data.permissions }),
                ...(data.isDefault !== undefined && { isDefault: data.isDefault }),
            },
            include: roleInclude,
        });
    }
    async delete(id) {
        return prisma.role.delete({ where: { id } });
    }
}
exports.RolesRepository = RolesRepository;
exports.rolesRepository = new RolesRepository();
//# sourceMappingURL=roles.repository.js.map