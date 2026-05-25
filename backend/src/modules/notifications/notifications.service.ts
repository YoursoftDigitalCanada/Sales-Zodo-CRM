import { notificationsRepository } from './notifications.repository';
import {
  CreateNotificationDto,
  NotificationQueryDto,
  NotificationResponseDto,
  NotificationListResponseDto,
  NotificationCountDto,
} from './notifications.dto';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
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
    await this.assertRecipientBelongsToTenant(data.userId, data.tenantId);
    const sanitized = this.sanitizeNotificationPayload(data);
    const notification = await notificationsRepository.create(sanitized);
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
    await Promise.all(userIds.map((userId) => this.assertRecipientBelongsToTenant(userId, tenantId)));
    const notifications = userIds.map((userId) => ({
      ...this.sanitizeNotificationPayload({ ...data, userId, tenantId }),
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

  private sanitizeNotificationPayload(data: CreateNotificationDto): CreateNotificationDto {
    const metadata = this.sanitizeMetadata(data.metadata || {});
    return {
      ...data,
      title: this.toSalesCrmText(data.title),
      message: this.toSalesCrmText(data.message),
      actionLabel: data.actionLabel ? this.toSalesCrmText(data.actionLabel) : data.actionLabel,
      actionUrl: this.resolveActionUrl(data.actionUrl, metadata),
      metadata,
    };
  }

  private sanitizeMetadata(metadata: Record<string, any>): Record<string, any> {
    const next = { ...metadata };
    if (next.projectId && !next.dealId) next.dealId = next.projectId;
    return next;
  }

  private toSalesCrmText(value: string): string {
    return String(value || '')
      .replace(/\bProject Status Updated\b/g, 'Deal Status Updated')
      .replace(/\bView Project\b/g, 'View Deal')
      .replace(/\bproject\b/g, 'deal')
      .replace(/\bProject\b/g, 'Deal');
  }

  private resolveActionUrl(actionUrl?: string, metadata: Record<string, any> = {}): string | undefined {
    const raw = typeof actionUrl === 'string' ? actionUrl.trim() : '';
    const fallback = this.actionUrlFromMetadata(metadata);
    if (!raw) return fallback;
    if (/^https?:\/\//i.test(raw)) return raw;

    const normalized = raw.startsWith('/') ? raw : `/${raw}`;
    const [pathname, query = ''] = normalized.split('?');
    const search = query ? `?${query}` : '';

    if (pathname === '/invoices') return `/invoice${search}`;
    if (/^\/invoices\/[^/]+$/.test(pathname)) return pathname.replace(/^\/invoices\//, '/invoice/') + search;
    if (pathname === '/projects' || pathname === '/kanban') return `/deals${search}`;
    if (/^\/projects\/[^/]+$/.test(pathname)) return this.withQuery('/deals', 'dealId', pathname.split('/')[2]);
    if (/^\/projects\/[^/]+\/documents$/.test(pathname)) {
      return `/documents?linkedEntityType=Deal&linkedEntityId=${encodeURIComponent(pathname.split('/')[2])}`;
    }
    if (/^\/deals\/[^/]+$/.test(pathname)) return this.withQuery('/deals', 'dealId', pathname.split('/')[2]);
    if (pathname === '/quotes') return `/proposals${search}`;
    if (/^\/quotes\/[^/]+$/.test(pathname)) return this.withQuery('/proposals', 'quoteId', pathname.split('/')[2]);
    if (/^\/proposals\/[^/]+$/.test(pathname)) return this.withQuery('/proposals', 'proposalId', pathname.split('/')[2]);
    if (/^\/contracts\/[^/]+$/.test(pathname)) return this.withQuery('/contracts', 'contractId', pathname.split('/')[2]);
    if (pathname === '/chat') return `/chats${search}`;
    if (/^\/chat\/[^/]+$/.test(pathname)) return this.withQuery('/chats', 'conversationId', pathname.split('/')[2]);
    if (/^\/tasks\/[^/]+$/.test(pathname)) return this.withQuery('/tasks', 'taskId', pathname.split('/')[2]);
    if (/^\/bookings\/[^/]+$/.test(pathname)) return this.withQuery('/calendar', 'bookingId', pathname.split('/')[2]);
    if (pathname === '/bookings') return `/calendar${search}`;

    return normalized;
  }

  private actionUrlFromMetadata(metadata: Record<string, any>): string | undefined {
    const read = (value: unknown) => (typeof value === 'string' && value.trim() ? value.trim() : undefined);
    const invoiceId = read(metadata.invoiceId);
    const dealId = read(metadata.dealId) || read(metadata.projectId);
    const leadId = read(metadata.leadId);
    const clientId = read(metadata.clientId) || read(metadata.organizationId) || read(metadata.companyId);
    const contactId = read(metadata.contactId);
    const proposalId = read(metadata.proposalId);
    const quoteId = read(metadata.quoteId);
    const contractId = read(metadata.contractId);
    const documentId = read(metadata.documentId) || read(metadata.fileId);
    const taskId = read(metadata.taskId);
    const expenseId = read(metadata.expenseId);
    const paymentId = read(metadata.paymentId);

    if (invoiceId) return `/invoice/${invoiceId}`;
    if (dealId) return this.withQuery('/deals', 'dealId', dealId);
    if (leadId) return `/leads/${leadId}`;
    if (clientId) return `/client-list/${clientId}`;
    if (contactId) return this.withQuery('/contacts', 'contactId', contactId);
    if (proposalId) return this.withQuery('/proposals', 'proposalId', proposalId);
    if (quoteId) return this.withQuery('/proposals', 'quoteId', quoteId);
    if (contractId) return this.withQuery('/contracts', 'contractId', contractId);
    if (documentId) return this.withQuery('/documents', 'documentId', documentId);
    if (taskId) return this.withQuery('/tasks', 'taskId', taskId);
    if (expenseId) return this.withQuery('/expenses', 'expenseId', expenseId);
    if (paymentId) return this.withQuery('/bookkeeping', 'paymentId', paymentId);
    return undefined;
  }

  private withQuery(pathname: string, key: string, value: string) {
    return `${pathname}?${key}=${encodeURIComponent(value)}`;
  }

  private async assertRecipientBelongsToTenant(userId: string, tenantId: string): Promise<void> {
    const user = await prisma.user.findFirst({
      where: {
        id: userId,
        OR: [
          { tenantId },
          { employees: { some: { tenantId } } },
        ],
      },
      select: { id: true },
    });

    if (!user) {
      throw new BadRequestError('Notification recipient does not belong to this tenant');
    }
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
