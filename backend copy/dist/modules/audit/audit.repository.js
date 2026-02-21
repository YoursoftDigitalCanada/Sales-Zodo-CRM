"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.auditRepository = exports.AuditRepository = void 0;
const database_1 = require("../../config/database");
class AuditRepository {
    /**
     * Create audit log entry
     */
    async create(data) {
        return database_1.prisma.auditLog.create({
            data: {
                action: data.action,
                module: data.module,
                description: data.description,
                entityType: data.entityType,
                entityId: data.entityId,
                oldValues: data.oldValues,
                newValues: data.newValues,
                ipAddress: data.ipAddress,
                userAgent: data.userAgent,
                requestMethod: data.requestMethod,
                requestPath: data.requestPath,
                userId: data.userId,
                tenantId: data.tenantId,
            },
        });
    }
    /**
     * Create multiple audit log entries
     */
    async createMany(logs) {
        return database_1.prisma.auditLog.createMany({
            data: logs.map((log) => ({
                action: log.action,
                module: log.module,
                description: log.description,
                entityType: log.entityType,
                entityId: log.entityId,
                oldValues: log.oldValues,
                newValues: log.newValues,
                ipAddress: log.ipAddress,
                userAgent: log.userAgent,
                requestMethod: log.requestMethod,
                requestPath: log.requestPath,
                userId: log.userId,
                tenantId: log.tenantId,
            })),
        });
    }
    /**
     * Find audit logs with filters
     */
    async findMany(tenantId, query) {
        const { page = 1, limit = 20, sortBy = 'createdAt', sortOrder = 'desc', action, module, entityType, entityId, userId, startDate, endDate, search, } = query;
        const where = {
            tenantId,
            ...(action && { action }),
            ...(module && { module }),
            ...(entityType && { entityType }),
            ...(entityId && { entityId }),
            ...(userId && { userId }),
            ...(startDate || endDate
                ? {
                    createdAt: {
                        ...(startDate && { gte: startDate }),
                        ...(endDate && { lte: endDate }),
                    },
                }
                : {}),
            ...(search && {
                OR: [
                    { description: { contains: search, mode: 'insensitive' } },
                    { module: { contains: search, mode: 'insensitive' } },
                    { entityType: { contains: search, mode: 'insensitive' } },
                ],
            }),
        };
        const [data, total] = await Promise.all([
            database_1.prisma.auditLog.findMany({
                where,
                include: {
                    user: {
                        select: {
                            id: true,
                            email: true,
                            firstName: true,
                            lastName: true,
                        },
                    },
                },
                orderBy: { [sortBy]: sortOrder },
                skip: (page - 1) * limit,
                take: limit,
            }),
            database_1.prisma.auditLog.count({ where }),
        ]);
        return { data, total };
    }
    /**
     * Find audit log by ID
     */
    async findById(id, tenantId) {
        return database_1.prisma.auditLog.findFirst({
            where: { id, tenantId },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
        });
    }
    /**
     * Find audit logs for a specific entity
     */
    async findByEntity(tenantId, entityType, entityId, limit = 50) {
        return database_1.prisma.auditLog.findMany({
            where: {
                tenantId,
                entityType,
                entityId,
            },
            include: {
                user: {
                    select: {
                        id: true,
                        email: true,
                        firstName: true,
                        lastName: true,
                    },
                },
            },
            orderBy: { createdAt: 'desc' },
            take: limit,
        });
    }
    /**
     * Delete old audit logs (for cleanup job)
     */
    async deleteOlderThan(tenantId, date) {
        return database_1.prisma.auditLog.deleteMany({
            where: {
                tenantId,
                createdAt: { lt: date },
            },
        });
    }
    /**
     * Get audit statistics
     */
    async getStatistics(tenantId, startDate, endDate) {
        const [byAction, byModule, byUser] = await Promise.all([
            database_1.prisma.auditLog.groupBy({
                by: ['action'],
                where: {
                    tenantId,
                    createdAt: { gte: startDate, lte: endDate },
                },
                _count: { action: true },
            }),
            database_1.prisma.auditLog.groupBy({
                by: ['module'],
                where: {
                    tenantId,
                    createdAt: { gte: startDate, lte: endDate },
                },
                _count: { module: true },
            }),
            database_1.prisma.auditLog.groupBy({
                by: ['userId'],
                where: {
                    tenantId,
                    createdAt: { gte: startDate, lte: endDate },
                    userId: { not: null },
                },
                _count: { userId: true },
                orderBy: { _count: { userId: 'desc' } },
                take: 10,
            }),
        ]);
        return { byAction, byModule, byUser };
    }
}
exports.AuditRepository = AuditRepository;
exports.auditRepository = new AuditRepository();
//# sourceMappingURL=audit.repository.js.map