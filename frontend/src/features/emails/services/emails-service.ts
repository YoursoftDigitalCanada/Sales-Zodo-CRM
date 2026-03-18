import api from "@/lib/axios";

export interface SendEmailPayload {
    toAddresses: { email: string; name?: string }[];
    ccAddresses?: { email: string; name?: string }[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
}

export interface EmailResponse {
    id: string;
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    fromAddress?: string;
    toAddresses: { email: string; name?: string }[];
    ccAddresses?: { email: string; name?: string }[];
    status: string;
    isRead: boolean;
    createdAt: string;
    sentAt?: string;
}

export async function getEmails(params?: Record<string, unknown>): Promise<EmailResponse[]> {
    const response = await api.get("/emails", { params });
    const raw = response.data;
    return raw?.data || raw || [];
}

export async function getEmailById(id: string): Promise<EmailResponse> {
    const response = await api.get(`/emails/${id}`);
    return response.data?.data || response.data;
}

export async function sendEmail(payload: SendEmailPayload): Promise<EmailResponse> {
    const response = await api.post("/emails/send", payload);
    return response.data?.data || response.data;
}

export async function markAsRead(id: string): Promise<EmailResponse> {
    const response = await api.patch(`/emails/${id}/read`);
    return response.data?.data || response.data;
}

export async function deleteEmail(id: string): Promise<void> {
    await api.delete(`/emails/${id}`);
}
