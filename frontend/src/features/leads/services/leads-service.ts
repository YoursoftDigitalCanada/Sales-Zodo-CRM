import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface LeadEntity {
    id: string | number;
    [key: string]: unknown;
}

export async function getLeads(params?: Record<string, unknown>): Promise<LeadEntity[]> {
    const response = await api.get("/leads", { params: { limit: 100, ...params } });
    return extractApiArray<LeadEntity>(response.data);
}

export async function getLeadById(id: string | number): Promise<LeadEntity> {
    const response = await api.get(`/leads/${id}`);
    return response.data?.data || response.data;
}

export async function createLead(data: Record<string, unknown>): Promise<LeadEntity> {
    const response = await api.post("/leads", data);
    return response.data?.data || response.data;
}

export async function updateLead(id: string | number, data: Record<string, unknown>): Promise<LeadEntity> {
    const response = await api.put(`/leads/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteLead(id: string | number): Promise<void> {
    await api.delete(`/leads/${id}`);
}

export async function updateLeadStatus(id: string | number, status: string): Promise<LeadEntity> {
    const response = await api.patch(`/leads/${id}/status`, { status });
    return response.data?.data || response.data;
}

export async function convertLead(id: string | number, data: { clientType: string; createContact: boolean }): Promise<unknown> {
    const response = await api.post(`/leads/${id}/convert`, data);
    return response.data?.data || response.data;
}
