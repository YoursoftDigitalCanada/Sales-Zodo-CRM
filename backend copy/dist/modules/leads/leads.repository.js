"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.leadsRepository = exports.LeadsRepository = void 0;
const database_1 = require("../../config/database");
const client_1 = require("@prisma/client");
class LeadsRepository {
    // Default includes for lead queries
    defaultInclude = {
        leadSource: true,
        assignedTo: {
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                        email: true,
                        avatar: true,
                    },
                },
            },
        },
        createdBy: {
            include: {
                user: {
                    select: {
                        id: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        },
        tags: {
            include: {
                tag: true,
            },
        },
    };
    /**
     * Create a new lead
     */
    async create(tenantId, data, createdById) {
        const { tagIds, ...leadData } = data;
        return database_1.prisma.lead.create({
            data: {
                ...leadData,
                tenantId,
                createdById,
                potentialValue: data.potentialValue ? new client_1.Prisma.Decimal(data.potentialValue) : null,
                tags: tagIds?.length
                    ? {
                        create: tagIds.map((tagId) => ({
                            tag: { connect: { id: tagId } },
                        })),
                    }
                    : undefined,
            },
            include: this.defaultInclude,
        });
    }
    /**
     * Find lead by ID
     */
    async findById(id, tenantId) {
        return database_1.prisma.lead.findFirst({
            where: { id, tenantId },
            include: this.defaultInclude,
        });
    }
    /**
     * Find leads with filters and pagination
     */
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', search, status, temperature, leadSourceId, assignedToId, startDate, endDate, minValue, maxValue, } = query;
        const where = {
            tenantId,
            ...(status && { status }),
            ...(temperature && { temperature }),
            ...(leadSourceId && { leadSourceId }),
            ...(assignedToId && { assignedToId }),
            ...(startDate || endDate
                ? {
                    createdAt: {
                        ...(startDate && { gte: startDate }),
                        ...(endDate && { lte: endDate }),
                    },
                }
                : {}),
            ...(minValue !== undefined || maxValue !== undefined
                ? {
                    potentialValue: {
                        ...(minValue !== undefined && { gte: minValue }),
                        ...(maxValue !== undefined && { lte: maxValue }),
                    },
                }
                : {}),
            ...(search && {
                OR: [
                    { firstName: { contains: search, mode: 'insensitive' } },
                    { lastName: { contains: search, mode: 'insensitive' } },
                    { email: { contains: search, mode: 'insensitive' } },
                    { companyName: { contains: search, mode: 'insensitive' } },
                    { phone: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        // Build orderBy
        let orderBy = {};
        if (sortBy === 'name') {
            orderBy = { firstName: sortOrder };
        }
        else if (sortBy === 'value') {
            orderBy = { potentialValue: sortOrder };
        }
        else {
            orderBy = { [sortBy]: sortOrder };
        }
        const [data, total] = await Promise.all([
            database_1.prisma.lead.findMany({
                where,
                include: this.defaultInclude,
                orderBy,
                skip: (page - 1) * limit,
                take: limit,
            }),
            database_1.prisma.lead.count({ where }),
        ]);
        return { data, total };
    }
    /**
     * Update lead
     */
    async update(id, tenantId, data) {
        const { tagIds, ...leadData } = data;
        // If tagIds provided, update tags
        if (tagIds !== undefined) {
            // Delete existing tags
            await database_1.prisma.leadTag.deleteMany({
                where: { leadId: id },
            });
            // Create new tags
            if (tagIds.length > 0) {
                await database_1.prisma.leadTag.createMany({
                    data: tagIds.map((tagId) => ({
                        leadId: id,
                        tagId,
                    })),
                });
            }
        }
        return database_1.prisma.lead.update({
            where: { id },
            data: {
                ...leadData,
                potentialValue: data.potentialValue !== undefined
                    ? data.potentialValue
                        ? new client_1.Prisma.Decimal(data.potentialValue)
                        : null
                    : undefined,
            },
            include: this.defaultInclude,
        });
    }
    /**
     * Delete lead
     */
    async delete(id, tenantId) {
        return database_1.prisma.lead.deleteMany({
            where: { id, tenantId },
        });
    }
    /**
     * Update lead status
     */
    async updateStatus(id, tenantId, status) {
        return database_1.prisma.lead.update({
            where: { id },
            data: { status },
            include: this.defaultInclude,
        });
    }
    /**
     * Assign lead to employee
     */
    async assign(id, tenantId, assignedToId) {
        return database_1.prisma.lead.update({
            where: { id },
            data: { assignedToId },
            include: this.defaultInclude,
        });
    }
    /**
     * Bulk assign leads
     */
    async bulkAssign(ids, tenantId, assignedToId) {
        return database_1.prisma.lead.updateMany({
            where: {
                id: { in: ids },
                tenantId,
            },
            data: { assignedToId },
        });
    }
    /**
     * Bulk update status
     */
    async bulkUpdateStatus(ids, tenantId, status) {
        return database_1.prisma.lead.updateMany({
            where: {
                id: { in: ids },
                tenantId,
            },
            data: { status },
        });
    }
    /**
     * Mark lead as converted
     */
    async markConverted(id, tenantId, clientId) {
        return database_1.prisma.lead.update({
            where: { id },
            data: {
                status: 'WON',
                convertedAt: new Date(),
                convertedToClientId: clientId,
            },
            include: this.defaultInclude,
        });
    }
    /**
     * Get pipeline data (leads grouped by status)
     */
    async getPipeline(tenantId, filters) {
        const where = {
            tenantId,
            ...(filters?.assignedToId && { assignedToId: filters.assignedToId }),
            ...(filters?.leadSourceId && { leadSourceId: filters.leadSourceId }),
            ...(filters?.temperature && { temperature: filters.temperature }),
        };
        const statuses = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'];
        const pipeline = await Promise.all(statuses.map(async (status) => {
            const [leads, aggregation] = await Promise.all([
                database_1.prisma.lead.findMany({
                    where: { ...where, status },
                    include: this.defaultInclude,
                    orderBy: { createdAt: 'desc' },
                }),
                database_1.prisma.lead.aggregate({
                    where: { ...where, status },
                    _count: { id: true },
                    _sum: { potentialValue: true },
                }),
            ]);
            return {
                status,
                count: aggregation._count.id,
                totalValue: Number(aggregation._sum.potentialValue || 0),
                leads,
            };
        }));
        return pipeline;
    }
    /**
     * Get lead statistics
     */
    async getStatistics(tenantId, startDate, endDate) {
        const dateFilter = startDate || endDate
            ? {
                createdAt: {
                    ...(startDate && { gte: startDate }),
                    ...(endDate && { lte: endDate }),
                },
            }
            : {};
        const baseWhere = { tenantId, ...dateFilter };
        const [total, byStatus, byTemperature, bySource, valueStats, convertedCount, thisMonthNew, thisMonthConverted,] = await Promise.all([
            // Total count
            database_1.prisma.lead.count({ where: baseWhere }),
            // By status
            database_1.prisma.lead.groupBy({
                by: ['status'],
                where: baseWhere,
                _count: { status: true },
            }),
            // By temperature
            database_1.prisma.lead.groupBy({
                by: ['temperature'],
                where: baseWhere,
                _count: { temperature: true },
            }),
            // By source
            database_1.prisma.lead.groupBy({
                by: ['leadSourceId'],
                where: { ...baseWhere, leadSourceId: { not: null } },
                _count: { leadSourceId: true },
            }),
            // Value statistics
            database_1.prisma.lead.aggregate({
                where: baseWhere,
                _sum: { potentialValue: true },
                _avg: { potentialValue: true },
            }),
            // Converted count
            database_1.prisma.lead.count({
                where: { ...baseWhere, status: 'WON' },
            }),
            // New this month
            database_1.prisma.lead.count({
                where: {
                    tenantId,
                    createdAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
            // Converted this month
            database_1.prisma.lead.count({
                where: {
                    tenantId,
                    status: 'WON',
                    convertedAt: {
                        gte: new Date(new Date().getFullYear(), new Date().getMonth(), 1),
                    },
                },
            }),
        ]);
        // Get source names
        const sourceIds = bySource.map((s) => s.leadSourceId).filter(Boolean);
        const sources = await database_1.prisma.leadSource.findMany({
            where: { id: { in: sourceIds } },
            select: { id: true, name: true },
        });
        const sourceMap = new Map(sources.map((s) => [s.id, s.name]));
        return {
            total,
            byStatus: byStatus.reduce((acc, curr) => ({ ...acc, [curr.status]: curr._count.status }), {}),
            byTemperature: byTemperature.reduce((acc, curr) => ({ ...acc, [curr.temperature]: curr._count.temperature }), {}),
            bySource: bySource.map((s) => ({
                sourceId: s.leadSourceId,
                sourceName: sourceMap.get(s.leadSourceId) || 'Unknown',
                count: s._count.leadSourceId,
            })),
            totalValue: Number(valueStats._sum.potentialValue || 0),
            averageValue: Number(valueStats._avg.potentialValue || 0),
            conversionRate: total > 0 ? (convertedCount / total) * 100 : 0,
            newThisMonth: thisMonthNew,
            convertedThisMonth: thisMonthConverted,
        };
    }
    /**
     * Check if employee exists in tenant
     */
    async employeeExists(employeeId, tenantId) {
        const employee = await database_1.prisma.employee.findFirst({
            where: { id: employeeId, tenantId, isActive: true },
        });
        return !!employee;
    }
    /**
     * Check if lead source exists in tenant
     */
    async leadSourceExists(leadSourceId, tenantId) {
        const source = await database_1.prisma.leadSource.findFirst({
            where: { id: leadSourceId, tenantId },
        });
        return !!source;
    }
    /**
     * Check if tags exist in tenant
     */
    async tagsExist(tagIds, tenantId) {
        const count = await database_1.prisma.tag.count({
            where: { id: { in: tagIds }, tenantId },
        });
        return count === tagIds.length;
    }
}
exports.LeadsRepository = LeadsRepository;
exports.leadsRepository = new LeadsRepository();
//# sourceMappingURL=leads.repository.js.map