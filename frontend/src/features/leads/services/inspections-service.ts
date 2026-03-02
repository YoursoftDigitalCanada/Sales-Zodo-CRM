import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface InspectionEntity {
    id: string;
    [key: string]: unknown;
}

export async function getInspectionsByLeadId(leadId: string): Promise<InspectionEntity[]> {
    const response = await api.get(`/leads/${leadId}/inspections`);
    return extractApiArray<InspectionEntity>(response.data);
}

export async function getInspectionById(leadId: string, inspectionId: string): Promise<InspectionEntity> {
    const response = await api.get(`/leads/${leadId}/inspections/${inspectionId}`);
    return response.data?.data || response.data;
}

export async function createInspection(leadId: string, data: Record<string, unknown>): Promise<InspectionEntity> {
    const response = await api.post(`/leads/${leadId}/inspections`, data);
    return response.data?.data || response.data;
}

export async function updateInspection(leadId: string, inspectionId: string, data: Record<string, unknown>): Promise<InspectionEntity> {
    const response = await api.put(`/leads/${leadId}/inspections/${inspectionId}`, data);
    return response.data?.data || response.data;
}

export async function deleteInspection(leadId: string, inspectionId: string): Promise<void> {
    await api.delete(`/leads/${leadId}/inspections/${inspectionId}`);
}
