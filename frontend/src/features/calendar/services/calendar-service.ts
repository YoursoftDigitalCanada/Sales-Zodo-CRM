import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface CalendarEventEntity {
    id: string | number;
    [key: string]: unknown;
}

export async function getCalendarEvents(params?: Record<string, unknown>): Promise<CalendarEventEntity[]> {
    const response = await api.get("/calendar", { params: { limit: 200, ...params } });
    return extractApiArray<CalendarEventEntity>(response.data);
}

export async function createCalendarEvent(data: Record<string, unknown>): Promise<CalendarEventEntity> {
    const response = await api.post("/calendar", data);
    return response.data?.data || response.data;
}

export async function updateCalendarEvent(id: string | number, data: Record<string, unknown>): Promise<CalendarEventEntity> {
    const response = await api.put(`/calendar/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteCalendarEvent(id: string | number): Promise<void> {
    await api.delete(`/calendar/${id}`);
}
