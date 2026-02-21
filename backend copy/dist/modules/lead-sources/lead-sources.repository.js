"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadSourcesRepository = exports.LeadSourcesRepository = void 0;
const database_1 = require("../../config/database");
class LeadSourcesRepository {
    /**
     * Create lead source
     */
    async create(tenantId, data) {
        return database_1.prisma.leadSource.create({
            data: {
                ...data,
                tenantId,
            },
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }
    /**
     * Find lead source by ID
     */
    async findById(id, tenantId) {
        return database_1.prisma.leadSource.findFirst({
            where: { id, tenantId },
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }
    /**
     * Find lead source by name (for uniqueness check)
     */
    async findByName(name, tenantId, excludeId) {
        return database_1.prisma.leadSource.findFirst({
            where: {
                name: { equals: name, mode: 'insensitive' },
                tenantId,
                ...(excludeId && { id: { not: excludeId } }),
            },
        });
    }
    /**
     * Find lead sources with filters
     */
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, search, isActive } = query;
        const where = {
            tenantId,
            ...(isActive !== undefined && { isActive }),
            ...(search && {
                OR: [
                    { name: { contains: search, mode: 'insensitive' } },
                    { description: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            database_1.prisma.leadSource.findMany({
                where,
                include: {
                    _count: {
                        select: { leads: true },
                    },
                },
                orderBy: { name: 'asc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            database_1.prisma.leadSource.count({ where }),
        ]);
        return { data, total };
    }
    /**
     * Update lead source
     */
    async update(id, tenantId, data) {
        return database_1.prisma.leadSource.update({
            where: { id },
            data,
            include: {
                _count: {
                    select: { leads: true },
                },
            },
        });
    }
    /**
     * Delete lead source
     */
    async delete(id, tenantId) {
        return database_1.prisma.leadSource.deleteMany({
            where: { id, tenantId },
        });
    }
    /**
     * Get lead source statistics
     */
    async getStatistics(tenantId) {
        const sources = await database_1.prisma.leadSource.findMany({
            where: { tenantId, isActive: true },
            include: {
                leads: {
                    select: {
                        id: true,
                        status: true,
                        potentialValue: true,
                    },
                },
            },
        });
        return sources.map((source) => {
            const leadCount = source.leads.length;
            const convertedCount = source.leads.filter((l) => l.status === 'WON').length;
            const totalValue = source.leads.reduce((sum, l) => sum + Number(l.potentialValue || 0), 0);
            return {
                id: source.id,
                name: source.name,
                description: source.description,
                isActive: source.isActive,
                leadCount,
                convertedCount,
                conversionRate: leadCount > 0 ? (convertedCount / leadCount) * 100 : 0,
                totalValue,
                createdAt: source.createdAt,
                updatedAt: source.updatedAt,
            };
        });
    }
    /**
     * Check if lead source has leads
     */
    async hasLeads(id, tenantId) {
        const count = await database_1.prisma.lead.count({
            where: { leadSourceId: id, tenantId },
        });
        return count > 0;
    }
}
exports.LeadSourcesRepository = LeadSourcesRepository;
exports.leadSourcesRepository = new LeadSourcesRepository();
//# sourceMappingURL=lead-sources.repository.js.map