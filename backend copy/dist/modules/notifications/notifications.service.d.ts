import { CreateNotificationDto, NotificationQueryDto, NotificationResponseDto, NotificationListResponseDto, NotificationCountDto } from './notifications.dto';
export declare class NotificationsService {
    /**
     * Create notification
     */
    create(data: CreateNotificationDto): Promise<NotificationResponseDto>;
    /**
     * Create notifications for multiple users
     */
    createForUsers(userIds: string[], tenantId: string, data: Omit<CreateNotificationDto, 'userId' | 'tenantId'>): Promise<number>;
    /**
     * Get notifications for user
     */
    getNotifications(userId: string, tenantId: string, query: NotificationQueryDto): Promise<NotificationListResponseDto>;
    /**
     * Get single notification
     */
    getNotification(id: string, userId: string, tenantId: string): Promise<NotificationResponseDto>;
    /**
     * Mark notification as read
     */
    markAsRead(id: string, userId: string, tenantId: string): Promise<void>;
    /**
     * Mark multiple notifications as read
     */
    markManyAsRead(ids: string[], userId: string, tenantId: string): Promise<number>;
    /**
     * Mark all notifications as read
     */
    markAllAsRead(userId: string, tenantId: string): Promise<number>;
    /**
     * Delete notification
     */
    delete(id: string, userId: string, tenantId: string): Promise<void>;
    /**
     * Get notification counts
     */
    getCounts(userId: string, tenantId: string): Promise<NotificationCountDto>;
    /**
     * Cleanup old notifications
     */
    cleanup(tenantId: string, retentionDays?: number): Promise<number>;
    /**
     * Convert to response DTO
     */
    private toResponseDto;
}
export declare const notificationsService: NotificationsService;
//# sourceMappingURL=notifications.service.d.ts.map