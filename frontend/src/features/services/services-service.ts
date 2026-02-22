import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ServiceEntity {
    id: string | number;
    name: string;
    price: number;
    durationMinutes: number;
    isActive: boolean;
    [key: string]: unknown;
}

export async function getServices(): Promise<ServiceEntity[]> {
    const response = await api.get("/services");
    return extractApiArray<ServiceEntity>(response.data);
}

export async function createService(
    data: Record<string, unknown>
): Promise<ServiceEntity> {
    const response = await api.post("/services", data);
    return response.data?.data || response.data;
}

export async function deleteService(id: string | number): Promise<void> {
    await api.delete(`/services/${id}`);
}
