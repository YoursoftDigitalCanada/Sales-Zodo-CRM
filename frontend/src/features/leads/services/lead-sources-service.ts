import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface LeadSourceEntity {
    id: string | number;
    [key: string]: unknown;
}

export async function getLeadSources(params?: Record<string, unknown>): Promise<LeadSourceEntity[]> {
    const response = await api.get("/lead-sources", { params: { limit: 100, ...params } });
    return extractApiArray<LeadSourceEntity>(response.data);
}

export async function getLeadSourceStats(): Promise<unknown[]> {
    const response = await api.get("/lead-sources/statistics");
    return response.data?.data || response.data || [];
}

export async function createLeadSource(data: Record<string, unknown>): Promise<LeadSourceEntity> {
    const response = await api.post("/lead-sources", data);
    return response.data?.data || response.data;
}

export async function updateLeadSource(id: string | number, data: Record<string, unknown>): Promise<LeadSourceEntity> {
    const response = await api.put(`/lead-sources/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteLeadSource(id: string | number): Promise<void> {
    await api.delete(`/lead-sources/${id}`);
}

export async function toggleLeadSourceActive(id: string | number, isActive: boolean): Promise<LeadSourceEntity> {
    const response = await api.put(`/lead-sources/${id}`, { isActive });
    return response.data?.data || response.data;
}
