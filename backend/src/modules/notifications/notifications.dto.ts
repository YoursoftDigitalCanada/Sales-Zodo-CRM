import { NotificationType } from '@prisma/client';

// ============================================================================
// REQUEST DTOs
// ============================================================================

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

// ============================================================================
// RESPONSE DTOs
// ============================================================================

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
    hasNextPage: boolean;
    hasPrevPage: boolean;
    unreadCount: number;
  };
}

export interface NotificationCountDto {
  total: number;
  unread: number;
  byType: Record<NotificationType, number>;
}

// ============================================================================
// INTERNAL DTOs (for manager use)
// ============================================================================

export interface NotificationCreateOptions {
  userId: string;
  title: string;
  message: string;
  type?: NotificationType;
  actionUrl?: string;
  actionLabel?: string;
  metadata?: Record<string, any>;
}