import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface TaskEntity {
    id: string | number;
    [key: string]: unknown;
}

export async function getTasks(params?: Record<string, unknown>): Promise<TaskEntity[]> {
    const response = await api.get("/tasks", { params });
    return extractApiArray<TaskEntity>(response.data);
}

export async function getKanbanTasks(): Promise<unknown> {
    const response = await api.get("/tasks/kanban");
    return response.data?.data || response.data;
}

export async function createTask(data: Record<string, unknown>): Promise<TaskEntity> {
    const response = await api.post("/tasks", data);
    return response.data?.data || response.data;
}

export async function updateTask(id: string | number, data: Record<string, unknown>): Promise<TaskEntity> {
    const response = await api.put(`/tasks/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteTask(id: string | number): Promise<void> {
    await api.delete(`/tasks/${id}`);
}

export async function updateTaskStatus(id: string | number, status: string): Promise<TaskEntity> {
    const response = await api.patch(`/tasks/${id}/status`, { status });
    return response.data?.data || response.data;
}
