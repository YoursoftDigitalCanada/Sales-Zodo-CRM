import api from "@/lib/axios";
import type { CreateProposalDto, UpdateProposalDto } from "@contracts/proposal";

export async function createProposal(payload: CreateProposalDto) {
  return api.post("/proposals", payload);
}

export async function updateProposal(id: string, payload: UpdateProposalDto) {
  return api.put(`/proposals/${id}`, payload);
}

export async function generateProposal(proposalId: string) {
  return api.post("/proposals/generate", { proposalId });
}

export async function downloadProposalPdf(id: string) {
  return api.get(`/proposals/${id}/pdf`, { responseType: "blob" });
}

