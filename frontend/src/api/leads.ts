import api from "@/lib/axios";
import type {
  CreateLeadDto,
  UpdateLeadDto,
  ConvertLeadDto,
  PipelineTransitionDto,
} from "@contracts/lead";
import type { LeadStatus } from "@contracts/enums";

export async function createLead(payload: CreateLeadDto | Partial<CreateLeadDto>) {
  return api.post("/leads", payload);
}

export async function updateLead(id: string, payload: UpdateLeadDto) {
  return api.put(`/leads/${id}`, payload);
}

export async function updateLeadStatus(id: string, status: LeadStatus) {
  return api.patch(`/leads/${id}/status`, { status });
}

export async function convertLead(id: string, payload: ConvertLeadDto) {
  return api.post(`/leads/${id}/convert`, payload);
}

export async function transitionPipeline(payload: PipelineTransitionDto) {
  return api.post("/pipeline/transition", payload);
}

