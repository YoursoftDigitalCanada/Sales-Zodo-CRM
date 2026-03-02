import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface InsuranceClaimEntity {
    id: string;
    [key: string]: unknown;
}

export async function getInsuranceClaimsByLeadId(leadId: string): Promise<InsuranceClaimEntity[]> {
    const response = await api.get(`/leads/${leadId}/insurance-claims`);
    return extractApiArray<InsuranceClaimEntity>(response.data);
}

export async function createInsuranceClaim(leadId: string, data: Record<string, unknown>): Promise<InsuranceClaimEntity> {
    const response = await api.post(`/leads/${leadId}/insurance-claims`, data);
    return response.data?.data || response.data;
}

export async function updateInsuranceClaim(leadId: string, claimId: string, data: Record<string, unknown>): Promise<InsuranceClaimEntity> {
    const response = await api.put(`/leads/${leadId}/insurance-claims/${claimId}`, data);
    return response.data?.data || response.data;
}

export async function deleteInsuranceClaim(leadId: string, claimId: string): Promise<void> {
    await api.delete(`/leads/${leadId}/insurance-claims/${claimId}`);
}
