import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";
import type {
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  PipelineTransitionDto,
} from "@contracts/lead";
import type { LeadStatus } from "@contracts/enums";

export interface LeadEntity {
    id: string | number;
    [key: string]: unknown;
}

type CreateLeadRequest = Partial<CreateLeadDto> & {
    skipDuplicateCheck?: boolean;
};

export async function getLeads(params?: Record<string, unknown>): Promise<LeadEntity[]> {
    const response = await api.get("/leads", { params: { limit: 100, ...params } });
    return extractApiArray<LeadEntity>(response.data);
}

export async function getLeadById(id: string | number): Promise<LeadEntity> {
    const response = await api.get(`/leads/${id}`);
    return response.data?.data || response.data;
}

export async function createLead(data: CreateLeadRequest): Promise<LeadEntity> {
    const response = await api.post("/leads", data);
    return response.data?.data || response.data;
}

export async function updateLead(id: string | number, data: UpdateLeadDto): Promise<LeadEntity> {
    const response = await api.put(`/leads/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteLead(id: string | number): Promise<void> {
    await api.delete(`/leads/${id}`);
}

export async function updateLeadStatus(
    id: string | number,
    status: LeadStatus,
    reasonPayload?: {
        closureReason?: string;
        duplicateOfLeadId?: string;
        reactivateAt?: string;
    }
): Promise<LeadEntity> {
    const response = await api.patch(`/leads/${id}/status`, {
        status,
        ...reasonPayload,
    });
    return response.data?.data || response.data;
}

export async function convertLead(id: string | number, data: ConvertLeadDto): Promise<unknown> {
    const response = await api.post(`/leads/${id}/convert`, data);
    return response.data?.data || response.data;
}

export async function pipelineTransition(payload: PipelineTransitionDto): Promise<LeadEntity> {
    const response = await api.post("/pipeline/transition", payload);
    return response.data?.data || response.data;
}

export async function checkDuplicates(
    data: { phone?: string; email?: string; propertyAddress?: string; excludeLeadId?: string }
): Promise<{ hasDuplicates: boolean; duplicates: any[] }> {
    const response = await api.post("/leads/check-duplicates", data);
    return response.data?.data || response.data;
}

export async function mergeLeads(
    targetLeadId: string,
    sourceLeadId: string
): Promise<any> {
    const response = await api.post(`/leads/${targetLeadId}/merge`, { sourceLeadId });
    return response.data?.data || response.data;
}
