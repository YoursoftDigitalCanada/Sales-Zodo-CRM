"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.tenantsRepository = exports.TenantsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
const tenantInclude = { _count: { select: { users: true } } };
class TenantsRepository {
    async create(data) {
        return prisma.tenant.create({
            data: {
                name: data.name,
                slug: data.slug,
                domain: data.domain,
                plan: data.plan || 'FREE',
                settings: data.settings || {},
            },
            include: tenantInclude,
        });
    }
    async findById(id) {
        return prisma.tenant.findUnique({ where: { id }, include: tenantInclude });
    }
    async findBySlug(slug) {
        return prisma.tenant.findUnique({ where: { slug }, include: tenantInclude });
    }
    async findMany(query) {
        const { page = 1, limit = 20, search, plan, isActive, sortBy = 'createdAt', sortOrder = 'desc' } = query;
        const where = {
            ...(plan && { plan }),
            ...(isActive !== undefined && { isActive }),
            ...(search && { OR: [{ name: { contains: search, mode: 'insensitive' } }, { slug: { contains: search, mode: 'insensitive' } }] }),
        };
        const [data, total] = await Promise.all([
            prisma.tenant.findMany({ where, include: tenantInclude, orderBy: { [sortBy]: sortOrder }, skip: (page - 1) * limit, take: limit }),
            prisma.tenant.count({ where }),
        ]);
        return { data, total };
    }
    async update(id, data) {
        return prisma.tenant.update({
            where: { id },
            data: {
                ...(data.name !== undefined && { name: data.name }),
                ...(data.domain !== undefined && { domain: data.domain }),
                ...(data.plan !== undefined && { plan: data.plan }),
                ...(data.settings !== undefined && { settings: data.settings }),
                ...(data.isActive !== undefined && { isActive: data.isActive }),
            },
            include: tenantInclude,
        });
    }
    async delete(id) {
        return prisma.tenant.delete({ where: { id } });
    }
}
exports.TenantsRepository = TenantsRepository;
exports.tenantsRepository = new TenantsRepository();
//# sourceMappingURL=tenants.repository.js.map