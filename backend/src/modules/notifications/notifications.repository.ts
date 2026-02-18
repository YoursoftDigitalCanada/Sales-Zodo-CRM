import { prisma } from '../../config/database';
import { NotificationType, Prisma } from '@prisma/client';
import { CreateNotificationDto, NotificationQueryDto } from './notifications.dto';

export class NotificationsRepository {
  /**
   * Create notification
   */
  async create(data: CreateNotificationDto) {
    return prisma.notification.create({
      data: {
        userId: data.userId,
        tenantId: data.tenantId,
        title: data.title,
        message: data.message,
        type: data.type || 'INFO',
        actionUrl: data.actionUrl,
        actionLabel: data.actionLabel,
        metadata: data.metadata as Prisma.JsonObject,
        expiresAt: data.expiresAt,
      },
    });
  }

  /**
   * Create multiple notifications
   */
  async createMany(notifications: CreateNotificationDto[]) {
    return prisma.notification.createMany({
      data: notifications.map((n) => ({
        userId: n.userId,
        tenantId: n.tenantId,
        title: n.title,
        message: n.message,
        type: n.type || 'INFO',
        actionUrl: n.actionUrl,
        actionLabel: n.actionLabel,
        metadata: n.metadata as Prisma.JsonObject,
        expiresAt: n.expiresAt,
      })),
    });
  }

  /**
   * Find notifications for user
   */
  async findMany(userId: string, tenantId: string, query: NotificationQueryDto) {
    const { page = 1, limit = 20, isRead, type, startDate, endDate } = query;

    const where: Prisma.NotificationWhereInput = {
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
      prisma.notification.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip: (page - 1) * limit,
        take: limit,
      }),
      prisma.notification.count({ where }),
      prisma.notification.count({
        where: { ...where, isRead: false },
      }),
    ]);

    return { data, total, unreadCount };
  }

  /**
   * Find notification by ID
   */
  async findById(id: string, userId: string, tenantId: string) {
    return prisma.notification.findFirst({
      where: { id, userId, tenantId },
    });
  }

  /**
   * Mark notification as read
   */
  async markAsRead(id: string, userId: string, tenantId: string) {
    return prisma.notification.updateMany({
      where: { id, userId, tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Mark multiple notifications as read
   */
  async markManyAsRead(ids: string[], userId: string, tenantId: string) {
    return prisma.notification.updateMany({
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
  async markAllAsRead(userId: string, tenantId: string) {
    return prisma.notification.updateMany({
      where: { userId, tenantId, isRead: false },
      data: { isRead: true, readAt: new Date() },
    });
  }

  /**
   * Delete notification
   */
  async delete(id: string, userId: string, tenantId: string) {
    return prisma.notification.deleteMany({
      where: { id, userId, tenantId },
    });
  }

  /**
   * Delete old notifications
   */
  async deleteOlderThan(tenantId: string, date: Date) {
    return prisma.notification.deleteMany({
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
  async getUnreadCount(userId: string, tenantId: string) {
    return prisma.notification.count({
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
  async getCountByType(userId: string, tenantId: string) {
    const counts = await prisma.notification.groupBy({
      by: ['type'],
      where: {
        userId,
        tenantId,
        isRead: false,
        OR: [{ expiresAt: null }, { expiresAt: { gt: new Date() } }],
      },
      _count: { type: true },
    });

    return counts.reduce(
      (acc, curr) => ({
        ...acc,
        [curr.type]: curr._count.type,
      }),
      {} as Record<NotificationType, number>
    );
  }
}

export const notificationsRepository = new NotificationsRepository();