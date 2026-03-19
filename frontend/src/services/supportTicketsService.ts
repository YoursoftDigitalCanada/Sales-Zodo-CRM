import api from "@/lib/axios";

export type SupportTicketStatus = "OPEN" | "IN_PROGRESS" | "WAITING" | "RESOLVED" | "CLOSED";
export type SupportTicketPriority = "LOW" | "MEDIUM" | "HIGH" | "URGENT";

export interface TicketAttachment {
  name: string;
  url: string;
  type?: string;
  size?: string;
  storedName?: string;
}

export interface TicketMessage {
  id: string;
  sender: string;
  message: string;
  isStaff: boolean;
  isInternal: boolean;
  createdAt: string;
}

export interface TicketActivity {
  id: string;
  type: "created" | "reply" | "internal_note";
  actor: string;
  content: string;
  createdAt: string;
}

export interface SupportTicket {
  id: string;
  ticketId: string;
  ticketNumber: string;
  subject: string;
  description: string;
  status: SupportTicketStatus;
  priority: SupportTicketPriority;
  category: string;
  requesterName: string;
  requesterEmail: string;
  userId: string | null;
  workspaceId: string;
  assignedTo: string | null;
  assignedToName: string | null;
  messagesCount: number;
  internalNotesCount: number;
  tags: string[];
  attachments: TicketAttachment[];
  messages: TicketMessage[];
  activity: TicketActivity[];
  createdAt: string;
  updatedAt: string;
  resolvedAt?: string | null;
}

export interface CreateTicketPayload {
  subject: string;
  description: string;
  priority?: SupportTicketPriority;
  category?: string;
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

export async function createTicketWithAttachments(payload: CreateTicketPayload, files: File[]): Promise<SupportTicket> {
  const formData = new FormData();
  formData.append("subject", payload.subject);
  formData.append("description", payload.description);
  if (payload.priority) formData.append("priority", payload.priority);
  if (payload.category) formData.append("category", payload.category);
  files.forEach((file) => formData.append("files", file));

  const response = await api.post("/support-tickets/with-attachments", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });

  return response.data?.data || response.data;
}

export async function getTicketById(id: string): Promise<SupportTicket> {
  const response = await api.get(`/support-tickets/${id}`);
  return response.data?.data || response.data;
}

export async function updateTicketStatus(id: string, status: SupportTicketStatus): Promise<SupportTicket> {
  const response = await api.patch(`/support-tickets/${id}/status`, { status });
  return response.data?.data || response.data;
}

export async function addTicketMessage(id: string, data: { message: string }): Promise<SupportTicket> {
  const response = await api.post(`/support-tickets/${id}/messages`, data);
  return response.data?.data || response.data;
}

export async function deleteTicket(id: string): Promise<void> {
  await api.delete(`/support-tickets/${id}`);
}

export async function getTicketStats(): Promise<{ open: number; inProgress: number; waiting: number; resolved: number; total: number }> {
  const response = await api.get("/support-tickets/stats");
  return response.data?.data || response.data;
}
