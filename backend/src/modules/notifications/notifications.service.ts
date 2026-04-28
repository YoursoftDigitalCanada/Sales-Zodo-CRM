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
import { PushPayload, PushProvider } from './push.types';
import { WebPushProvider } from './web-push.provider';
import { prisma } from '../../config/database';
import { DEFAULT_NOTIFICATION_SETTINGS } from '../settings/settings.constants';

export class NotificationsService {
  private readonly pushProviders: PushProvider[];

  constructor(pushProviders: PushProvider[] = [new WebPushProvider()]) {
    this.pushProviders = pushProviders;
  }

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
   * Send push notification using configured providers.
   */
  async sendPushNotification(
    userId: string,
    title: string,
    message: string,
    data?: Record<string, unknown>
  ): Promise<void> {
    const tenantId = typeof data?.tenantId === 'string' && data.tenantId.trim()
      ? data.tenantId.trim()
      : await this.resolveTenantIdForUser(userId);

    if (tenantId) {
      const settings = await this.getTenantNotificationSettings(tenantId);

      if (!settings.pushNotifications) {
        logger.debug('[Notifications] Push skipped because workspace push notifications are disabled', {
          userId,
          tenantId,
        });
        return;
      }
    }

    const payload: PushPayload = { title, message, data };

    if (!this.pushProviders.length) {
      logger.debug('[Notifications] No push providers configured');
      return;
    }

    const results = await Promise.allSettled(
      this.pushProviders.map((provider) => provider.send(userId, payload))
    );

    for (const [index, result] of results.entries()) {
      if (result.status === 'rejected') {
        logger.error('[Notifications] Push provider failed', {
          userId,
          providerIndex: index,
          error: result.reason,
        });
      }
    }
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

  private async resolveTenantIdForUser(userId: string): Promise<string | null> {
    const user = await prisma.user.findUnique({
      where: { id: userId },
      select: {
        tenantId: true,
        employees: {
          where: { isActive: true },
          select: { tenantId: true },
          take: 1,
        },
      },
    });

    if (user?.tenantId) {
      return user.tenantId;
    }

    return user?.employees[0]?.tenantId ?? null;
  }

  private async getTenantNotificationSettings(tenantId: string): Promise<{
    pushNotifications: boolean;
  }> {
    const settingsRecord = await prisma.tenantSettings.findUnique({
      where: { tenantId },
      select: { notificationSettings: true },
    });

    const rawSettings = typeof settingsRecord?.notificationSettings === 'object' && settingsRecord.notificationSettings
      ? (settingsRecord.notificationSettings as Record<string, unknown>)
      : {};

    return {
      pushNotifications: Boolean(
        rawSettings.pushNotifications
        ?? rawSettings.push
        ?? DEFAULT_NOTIFICATION_SETTINGS.pushNotifications,
      ),
    };
  }
}

export const notificationsService = new NotificationsService();
