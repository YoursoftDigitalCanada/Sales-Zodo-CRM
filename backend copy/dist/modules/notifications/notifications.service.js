"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.notificationsService = exports.NotificationsService = void 0;
const notifications_repository_1 = require("./notifications.repository");
const HttpErrors_1 = require("../../common/errors/HttpErrors");
const logger_1 = require("../../common/utils/logger");
class NotificationsService {
    /**
     * Create notification
     */
    async create(data) {
        const notification = await notifications_repository_1.notificationsRepository.create(data);
        return this.toResponseDto(notification);
    }
    /**
     * Create notifications for multiple users
     */
    async createForUsers(userIds, tenantId, data) {
        const notifications = userIds.map((userId) => ({
            ...data,
            userId,
            tenantId,
        }));
        const result = await notifications_repository_1.notificationsRepository.createMany(notifications);
        return result.count;
    }
    /**
     * Get notifications for user
     */
    async getNotifications(userId, tenantId, query) {
        const { data, total, unreadCount } = await notifications_repository_1.notificationsRepository.findMany(userId, tenantId, query);
        const page = query.page || 1;
        const limit = query.limit || 20;
        return {
            data: data.map((n) => this.toResponseDto(n)),
            meta: {
                page,
                limit,
                total,
                totalPages: Math.ceil(total / limit),
                unreadCount,
            },
        };
    }
    /**
     * Get single notification
     */
    async getNotification(id, userId, tenantId) {
        const notification = await notifications_repository_1.notificationsRepository.findById(id, userId, tenantId);
        if (!notification) {
            throw new HttpErrors_1.NotFoundError('Notification not found');
        }
        return this.toResponseDto(notification);
    }
    /**
     * Mark notification as read
     */
    async markAsRead(id, userId, tenantId) {
        await notifications_repository_1.notificationsRepository.markAsRead(id, userId, tenantId);
    }
    /**
     * Mark multiple notifications as read
     */
    async markManyAsRead(ids, userId, tenantId) {
        const result = await notifications_repository_1.notificationsRepository.markManyAsRead(ids, userId, tenantId);
        return result.count;
    }
    /**
     * Mark all notifications as read
     */
    async markAllAsRead(userId, tenantId) {
        const result = await notifications_repository_1.notificationsRepository.markAllAsRead(userId, tenantId);
        return result.count;
    }
    /**
     * Delete notification
     */
    async delete(id, userId, tenantId) {
        const result = await notifications_repository_1.notificationsRepository.delete(id, userId, tenantId);
        if (result.count === 0) {
            throw new HttpErrors_1.NotFoundError('Notification not found');
        }
    }
    /**
     * Get notification counts
     */
    async getCounts(userId, tenantId) {
        const [unread, byType] = await Promise.all([
            notifications_repository_1.notificationsRepository.getUnreadCount(userId, tenantId),
            notifications_repository_1.notificationsRepository.getCountByType(userId, tenantId),
        ]);
        const total = Object.values(byType).reduce((sum, count) => sum + count, 0);
        return {
            total,
            unread,
            byType,
        };
    }
    /**
     * Cleanup old notifications
     */
    async cleanup(tenantId, retentionDays = 30) {
        const cutoffDate = new Date();
        cutoffDate.setDate(cutoffDate.getDate() - retentionDays);
        const result = await notifications_repository_1.notificationsRepository.deleteOlderThan(tenantId, cutoffDate);
        logger_1.logger.info(`Cleaned up ${result.count} notifications`, { tenantId, retentionDays });
        return result.count;
    }
    /**
     * Convert to response DTO
     */
    toResponseDto(notification) {
        return {
            id: notification.id,
            title: notification.title,
            message: notification.message,
            type: notification.type,
            actionUrl: notification.actionUrl || undefined,
            actionLabel: notification.actionLabel || undefined,
            metadata: notification.metadata || undefined,
            isRead: notification.isRead,
            readAt: notification.readAt || undefined,
            createdAt: notification.createdAt,
            expiresAt: notification.expiresAt || undefined,
        };
    }
}
exports.NotificationsService = NotificationsService;
exports.notificationsService = new NotificationsService();
//# sourceMappingURL=notifications.service.js.map