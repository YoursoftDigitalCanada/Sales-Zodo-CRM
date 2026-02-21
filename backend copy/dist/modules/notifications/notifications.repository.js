"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsRepository = exports.NotificationsRepository = void 0;
const database_1 = require("../../config/database");
class NotificationsRepository {
    /**
     * Create notification
     */
    async create(data) {
        return database_1.prisma.notification.create({
            data: {
                userId: data.userId,
                tenantId: data.tenantId,
                title: data.title,
                message: data.message,
                type: data.type || 'INFO',
                actionUrl: data.actionUrl,
                actionLabel: data.actionLabel,
                metadata: data.metadata,
                expiresAt: data.expiresAt,
            },
        });
    }
    /**
     * Create multiple notifications
     */
    async createMany(notifications) {
        return database_1.prisma.notification.createMany({
            data: notifications.map((n) => ({
                userId: n.userId,
                tenantId: n.tenantId,
                title: n.title,
                message: n.message,
                type: n.type || 'INFO',
                actionUrl: n.actionUrl,
                actionLabel: n.actionLabel,
                metadata: n.metadata,
                expiresAt: n.expiresAt,
            })),
        });
    }
    /**
     * Find notifications for user
     */
    async findMany(userId, tenantId, query) {
        const { page = 1, limit = 20, isRead, type, startDate, endDate } = query;
        const where = {
            userId,
            tenantId,
            ...(isRead !== undefined && { isRead }),
            ...(type && { type }),
            ...(startDate || endDate
                ? {
                    createdAt: {
                        ...(startDate && { gte: startDate }),
                        ...(endDate && { lte: endDate }),
                    },
                }
                : {}),
            OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
        };
        const [data, total, unreadCount] = await Promise.all([
            database_1.prisma.notification.findMany({
                where,
                orderBy: { createdAt: 'desc' },
                skip: (page - 1) * limit,
                take: limit,
            }),
            database_1.prisma.notification.count({ where }),
            database_1.prisma.notification.count({
                where: { ...where, isRead: false },
            }),
        ]);
        return { data, total, unreadCount };
    }
    /**
     * Find notification by ID
     */
    async findById(id, userId, tenantId) {
        return database_1.prisma.notification.findFirst({
            where: { id, userId, tenantId },
        });
    }
    /**
     * Mark notification as read
     */
    async markAsRead(id, userId, tenantId) {
        return database_1.prisma.notification.updateMany({
            where: { id, userId, tenantId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }
    /**
     * Mark multiple notifications as read
     */
    async markManyAsRead(ids, userId, tenantId) {
        return database_1.prisma.notification.updateMany({
            where: {
                id: { in: ids },
                userId,
                tenantId,
                isRead: false,
            },
            data: { isRead: true, readAt: new Date() },
        });
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId, tenantId) {
        return database_1.prisma.notification.updateMany({
            where: { userId, tenantId, isRead: false },
            data: { isRead: true, readAt: new Date() },
        });
    }
    /**
     * Delete notification
     */
    async delete(id, userId, tenantId) {
        return database_1.prisma.notification.deleteMany({
            where: { id, userId, tenantId },
        });
    }
    /**
     * Delete old notifications
     */
    async deleteOlderThan(tenantId, date) {
        return database_1.prisma.notification.deleteMany({
            where: {
                tenantId,
                createdAt: { lt: date },
                isRead: true,
            },
        });
    }
    /**
     * Get unread count
     */
    async getUnreadCount(userId, tenantId) {
        return database_1.prisma.notification.count({
            where: {
                userId,
                tenantId,
                isRead: false,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
        });
    }
    /**
     * Get notification counts by type
     */
    async getCountByType(userId, tenantId) {
        const counts = await database_1.prisma.notification.groupBy({
            by: ['type'],
            where: {
                userId,
                tenantId,
                isRead: false,
                OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
            },
            _count: { type: true },
        });
        return counts.reduce((acc, curr) => ({
            ...acc,
            [curr.type]: curr._count.type,
        }), {});
    }
}
exports.NotificationsRepository = NotificationsRepository;
exports.notificationsRepository = new NotificationsRepository();
//# sourceMappingURL=notifications.repository.js.map