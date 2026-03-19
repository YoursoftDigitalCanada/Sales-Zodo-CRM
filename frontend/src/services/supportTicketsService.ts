import api from "@/lib/axios";

export interface SupportTicket {
  id: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
  priority: "LOW" | "MEDIUM" | "HIGH" | "URGENT";
  category: string;
  requesterName: string;
  requesterEmail: string;
  assignee?: string;
  tags: string[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string;
  messages: TicketMessage[];
}

export interface TicketMessage {
  id: string;
  sender: string;
  message: string;
  isStaff: boolean;
  createdAt: string;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority?: string;
  category?: string;
  requesterName: string;
  requesterEmail: string;
}

export async function getTickets(params?: Record<string, unknown>): Promise<{ data: SupportTicket[]; meta: any }> {
  const response = await api.get("/support-tickets", { params });
  const raw = response.data;
  return { data: raw?.data || [], meta: raw?.meta || {} };
}

export async function createTicket(payload: CreateTicketPayload): Promise<SupportTicket> {
  const response = await api.post("/support-tickets", payload);
  return response.data?.data || response.data;
}

export async function getTicketById(id: string): Promise<SupportTicket> {
  const response = await api.get(`/support-tickets/${id}`);
  return response.data?.data || response.data;
}

export async function updateTicketStatus(id: string, status: string): Promise<SupportTicket> {
  const response = await api.patch(`/support-tickets/${id}/status`, { status });
  return response.data?.data || response.data;
}

export async function addTicketMessage(id: string, data: { sender: string; message: string; isStaff: boolean }): Promise<TicketMessage> {
  const response = await api.post(`/support-tickets/${id}/messages`, data);
  return response.data?.data || response.data;
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/support-tickets/${id}`);
}

export async function getTicketStats(): Promise<{ open: number; inProgress: number; resolved: number; total: number }> {
  const response = await api.get("/support-tickets/stats");
  return response.data?.data || response.data;
}
