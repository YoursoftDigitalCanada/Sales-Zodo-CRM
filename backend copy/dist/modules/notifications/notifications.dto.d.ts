import { NotificationType } from '@prisma/client';
export interface CreateNotificationDto {
    userId: string;
    tenantId: string;
    title: string;
    message: string;
    type?: NotificationType;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    expiresAt?: Date;
}
export interface CreateBulkNotificationDto {
    userIds: string[];
    tenantId: string;
    title: string;
    message: string;
    type?: NotificationType;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    expiresAt?: Date;
}
export interface NotificationQueryDto {
    page?: number;
    limit?: number;
    isRead?: boolean;
    type?: NotificationType;
    startDate?: Date;
    endDate?: Date;
}
export interface MarkReadDto {
    notificationIds: string[];
}
export interface NotificationResponseDto {
    id: string;
    title: string;
    message: string;
    type: NotificationType;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
    isRead: boolean;
    readAt?: Date;
    createdAt: Date;
    expiresAt?: Date;
}
export interface NotificationListResponseDto {
    data: NotificationResponseDto[];
    meta: {
        page: number;
        limit: number;
        total: number;
        totalPages: number;
        unreadCount: number;
    };
}
export interface NotificationCountDto {
    total: number;
    unread: number;
    byType: Record<NotificationType, number>;
}
export interface NotificationCreateOptions {
    userId: string;
    title: string;
    message: string;
    type?: NotificationType;
    actionUrl?: string;
    actionLabel?: string;
    metadata?: Record<string, any>;
}
//# sourceMappingURL=notifications.dto.d.ts.map