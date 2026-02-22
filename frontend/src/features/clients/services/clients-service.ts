import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ClientEntity {
  id?: number;
  Id?: number;
  clientName?: string;
  ClientName?: string;
  name?: string;
  Name?: string;
  type?: string;
  Type?: string;
  clientId?: number;
  ClientId?: number;
  primaryContactName?: string;
  contactPerson?: string;
  ContactPerson?: string;
  primaryContactDesignation?: string;
  designation?: string;
  Designation?: string;
  department?: string;
  primaryEmail?: string;
  contactEmail?: string;
  ContactEmail?: string;
  email?: string;
  primaryContactPhone?: string;
  contactNo?: string;
  ContactNo?: string;
  phone?: string;
  mobile?: string;
  isPrimary?: boolean;
  lastInteractionDate?: string;
  lastContacted?: string;
  linkedin?: string;
  notes?: string;
}

export async function getClients(): Promise<ClientEntity[]> {
  const response = await api.get("/clients");
  return extractApiArray<ClientEntity>(response.data);
}

export async function getClientById(id: string | number): Promise<ClientEntity> {
  const response = await api.get(`/clients/${id}`);
  return response.data?.data || response.data;
}

export async function createClient(data: Record<string, unknown>): Promise<ClientEntity> {
  const response = await api.post("/clients", data);
  return response.data?.data || response.data;
}

export async function updateClient(id: string | number, data: Record<string, unknown>): Promise<ClientEntity> {
  const response = await api.put(`/clients/${id}`, data);
  return response.data?.data || response.data;
}

export async function deleteClient(id: string | number): Promise<void> {
  await api.delete(`/clients/${id}`);
}
