import { Prisma } from '@prisma/client';
import { CreateNotificationDto, NotificationQueryDto } from './notifications.dto';
export declare class NotificationsRepository {
    /**
     * Create notification
     */
    create(data: CreateNotificationDto): Promise<{
        message: string;
        type: import(".prisma/client").$Enums.NotificationType;
        userId: string;
        tenantId: string;
        metadata: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        title: string;
        actionUrl: string | null;
        actionLabel: string | null;
        isRead: boolean;
        readAt: Date | null;
    }>;
    /**
     * Create multiple notifications
     */
    createMany(notifications: CreateNotificationDto[]): Promise<Prisma.BatchPayload>;
    /**
     * Find notifications for user
     */
    findMany(userId: string, tenantId: string, query: NotificationQueryDto): Promise<{
        data: {
            message: string;
            type: import(".prisma/client").$Enums.NotificationType;
            userId: string;
            tenantId: string;
            metadata: Prisma.JsonValue | null;
            id: string;
            createdAt: Date;
            expiresAt: Date | null;
            title: string;
            actionUrl: string | null;
            actionLabel: string | null;
            isRead: boolean;
            readAt: Date | null;
        }[];
        total: number;
        unreadCount: number;
    }>;
    /**
     * Find notification by ID
     */
    findById(id: string, userId: string, tenantId: string): Promise<{
        message: string;
        type: import(".prisma/client").$Enums.NotificationType;
        userId: string;
        tenantId: string;
        metadata: Prisma.JsonValue | null;
        id: string;
        createdAt: Date;
        expiresAt: Date | null;
        title: string;
        actionUrl: string | null;
        actionLabel: string | null;
        isRead: boolean;
        readAt: Date | null;
    } | null>;
    /**
     * Mark notification as read
     */
    markAsRead(id: string, userId: string, tenantId: string): Promise<Prisma.BatchPayload>;
    /**
     * Mark multiple notifications as read
     */
    markManyAsRead(ids: string[], userId: string, tenantId: string): Promise<Prisma.BatchPayload>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(userId: string, tenantId: string): Promise<Prisma.BatchPayload>;
    /**
     * Delete notification
     */
    delete(id: string, userId: string, tenantId: string): Promise<Prisma.BatchPayload>;
    /**
     * Delete old notifications
     */
    deleteOlderThan(tenantId: string, date: Date): Promise<Prisma.BatchPayload>;
    /**
     * Get unread count
     */
    getUnreadCount(userId: string, tenantId: string): Promise<number>;
    /**
     * Get notification counts by type
     */
    getCountByType(userId: string, tenantId: string): Promise<Record<import(".prisma/client").$Enums.NotificationType, number>>;
}
export declare const notificationsRepository: NotificationsRepository;
//# sourceMappingURL=notifications.repository.d.ts.map