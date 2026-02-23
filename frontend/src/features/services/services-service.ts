import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ServiceEntity {
    id: string;
    name: string;
    description?: string;
    category?: string;
    basePrice?: number;
    durationMinutes?: number;
    isActive: boolean;
    createdAt: string;
    updatedAt: string;
    [key: string]: unknown;
}

export interface CreateServicePayload {
    name: string;
    description?: string;
    category?: string;
    basePrice?: number;
    durationMinutes?: number;
}

export interface UpdateServicePayload {
    name?: string;
    description?: string;
    category?: string;
    basePrice?: number;
    durationMinutes?: number;
}

export async function getServices(params?: Record<string, string>): Promise<ServiceEntity[]> {
    const response = await api.get("/services", { params });
    return extractApiArray<ServiceEntity>(response.data);
}

export async function getServiceById(id: string): Promise<ServiceEntity> {
    const response = await api.get(`/services/${id}`);
    return response.data?.data || response.data;
}

export async function createService(data: CreateServicePayload): Promise<ServiceEntity> {
    const response = await api.post("/services", data);
    return response.data?.data || response.data;
}

export async function updateService(id: string, data: UpdateServicePayload): Promise<ServiceEntity> {
    const response = await api.patch(`/services/${id}`, data);
    return response.data?.data || response.data;
}

export async function deactivateService(id: string): Promise<ServiceEntity> {
    const response = await api.patch(`/services/${id}/deactivate`);
    return response.data?.data || response.data;
}

export async function deleteService(id: string): Promise<void> {
    await api.delete(`/services/${id}`);
}
