import { notificationsRepository } from './notifications.repository';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationListResponseDto,
  NotificationCountDto,
} from './notifications.dto';
import { NotFoundError } from '../../common/errors/HttpErrors';
import { logger } from '../../common/utils/logger';

export class NotificationsService {
  /**
   * Create notification
   */
  async create(data: CreateNotificationDto): Promise<NotificationResponseDto> {
    const notification = await notificationsRepository.create(data);
    return this.toResponseDto(notification);
  }

  /**
   * Create notifications for multiple users
   */
  async createForUsers(
    userIds: string[],
    tenantId: string,
    data: Omit<CreateNotificationDto, 'userId' | 'tenantId'>
  ): Promise<number> {
    const notifications = userIds.map((userId) => ({
      ...data,
      userId,
      tenantId,
    }));

    const result = await notificationsRepository.createMany(notifications);
    return result.count;
  }

  /**
   * Get notifications for user
   */
  async getNotifications(
    userId: string,
    tenantId: string,
    query: NotificationQueryDto
  ): Promise<NotificationListResponseDto> {
    const { data, total, unreadCount } = await notificationsRepository.findMany(
      userId,
      tenantId,
      query
    );

    const page = query.page || 1;
    const limit = query.limit || 20;

    return {
      data: data.map((n) => this.toResponseDto(n)),
      meta: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
        hasNextPage: page < Math.ceil(total / limit),
        hasPrevPage: page > 1,
        unreadCount,
      },
    };
  }

  /**
   * Get single notification
   */
  async getNotification(
    id: string,
    userId: string,
    tenantId: string
  ): Promise<NotificationResponseDto> {
    const notification = await notificationsRepository.findById(id, userId, tenantId);

    if (!notification) {
      throw new NotFoundError('Notification not found');
    }

    return this.toResponseDto(notification);
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string, tenantId: string): Promise<void> {
    await notificationsRepository.markAsRead(id, userId, tenantId);
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(
    ids: string[],
    userId: string,
    tenantId: string
  ): Promise<number> {
    const result = await notificationsRepository.markManyAsRead(ids, userId, tenantId);
    return result.count;
  }

  /**
   * Mark all notifications as read
   */
  async markAllAsRead(userId: string, tenantId: string): Promise<number> {
    const result = await notificationsRepository.markAllAsRead(userId, tenantId);
    return result.count;
  }

  /**
   * Delete notification
   */
  async delete(id: string, userId: string, tenantId: string): Promise<void> {
    const result = await notificationsRepository.delete(id, userId, tenantId);

    if (result.count === 0) {
      throw new NotFoundError('Notification not found');
    }
  }

  /**
   * Get notification counts
   */
  async getCounts(userId: string, tenantId: string): Promise<NotificationCountDto> {
    const [unread, byType] = await Promise.all([
      notificationsRepository.getUnreadCount(userId, tenantId),
      notificationsRepository.getCountByType(userId, tenantId),
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
  async cleanup(tenantId: string, retentionDays: number = 30): Promise<number> {
    const cutoffDate = new Date();
    cutoffDate.setDate(cutoffDate.getDate() - retentionDays);

    const result = await notificationsRepository.deleteOlderThan(tenantId, cutoffDate);

    logger.info(`Cleaned up ${result.count} notifications`, { tenantId, retentionDays });

    return result.count;
  }

  /**
   * Convert to response DTO
   */
  private toResponseDto(notification: any): NotificationResponseDto {
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

export const notificationsService = new NotificationsService();