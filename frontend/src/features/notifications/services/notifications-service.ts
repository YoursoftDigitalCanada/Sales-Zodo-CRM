import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface NotificationEntity {
    id: string;
    type: string;
    title: string;
    message: string;
    isRead: boolean;
    link?: string;
    metadata?: Record<string, unknown>;
    createdAt: string;
    [key: string]: unknown;
}

export interface NotificationCounts {
    total: number;
    unread: number;
    [key: string]: unknown;
}

export async function getNotifications(params?: Record<string, unknown>): Promise<NotificationEntity[]> {
    const response = await api.get("/notifications", { params });
    return extractApiArray<NotificationEntity>(response.data);
}

export async function getNotificationById(id: string): Promise<NotificationEntity> {
    const response = await api.get(`/notifications/${id}`);
    return response.data?.data || response.data;
}

export async function getNotificationCounts(): Promise<NotificationCounts> {
    const response = await api.get("/notifications/counts");
    return response.data?.data || response.data;
}

export async function markNotificationAsRead(id: string): Promise<void> {
    await api.post(`/notifications/${id}/read`);
}

export async function markManyAsRead(ids: string[]): Promise<void> {
    await api.post("/notifications/read", { ids });
}

export async function markAllAsRead(): Promise<void> {
    await api.post("/notifications/read-all");
}

export async function deleteNotification(id: string): Promise<void> {
    await api.delete(`/notifications/${id}`);
}
