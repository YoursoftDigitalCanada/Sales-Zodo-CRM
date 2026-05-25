import api from "@/lib/axios";

export interface ContractEntity {
  id: string;
  contractNumber: string;
  title: string;
  description?: string | null;
  status: "DRAFT" | "SENT" | "ACTIVE" | "COMPLETED" | "CANCELLED" | "EXPIRED";
  client: { id: string; clientName: string } | null;
  clientId?: string;
  contact: { id: string; contactName: string; email?: string | null } | null;
  contactId?: string | null;
  quoteId?: string | null;
  projectId?: string | null;
  value: number;
  currency: string;
  startDate: string;
  endDate: string;
  signedAt?: string | null;
  terms?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ContractContactEntity {
  id: string;
  contactName?: string;
  firstName?: string;
  lastName?: string;
  email?: string | null;
  companyId?: string | null;
}

export interface ContractQuery {
  page?: number;
  limit?: number;
  search?: string;
  status?: string;
  clientId?: string;
}

export async function getContracts(params?: ContractQuery): Promise<{ data: ContractEntity[]; meta: { total: number; page: number; limit: number; totalPages: number } }> {
  const response = await api.get("/contracts", { params: { limit: 100, ...params } });
  const payload = response.data;
  return {
    data: payload?.data || [],
    meta: payload?.meta || { total: 0, page: 1, limit: 100, totalPages: 1 },
  };
}

export async function getContractContacts(): Promise<ContractContactEntity[]> {
  const response = await api.get("/contacts", { params: { limit: 200 } });
  const payload = response.data;
  return payload?.data || payload?.items || (Array.isArray(payload) ? payload : []);
}

export async function createContract(data: Record<string, unknown>): Promise<ContractEntity> {
  const response = await api.post("/contracts", data);
  return response.data?.data || response.data;
}

export async function updateContract(id: string, data: Record<string, unknown>): Promise<ContractEntity> {
  const response = await api.put(`/contracts/${id}`, data);
  return response.data?.data || response.data;
}

export async function deleteContract(id: string): Promise<void> {
  await api.delete(`/contracts/${id}`);
}

export async function sendContract(id: string): Promise<ContractEntity> {
  const response = await api.post(`/contracts/${id}/send`);
  return response.data?.data || response.data;
}

export async function signContract(id: string): Promise<ContractEntity> {
  const response = await api.post(`/contracts/${id}/sign`);
  return response.data?.data || response.data;
}

export async function declineContract(id: string, reason?: string): Promise<ContractEntity> {
  const response = await api.post(`/contracts/${id}/decline`, { reason });
  return response.data?.data || response.data;
}

export async function saveContractDocument(id: string, variant: "sent" | "signed" = "sent"): Promise<unknown> {
  const response = await api.post(`/contracts/${id}/save-document`, { variant });
  return response.data?.data || response.data;
}

export async function createInvoiceFromContract(id: string): Promise<unknown> {
  const response = await api.post(`/contracts/${id}/create-invoice`);
  return response.data?.data || response.data;
}

export async function downloadContractPdf(id: string): Promise<Blob> {
  const response = await api.get(`/contracts/${id}/pdf`, { responseType: "blob" });
  return response.data;
}
