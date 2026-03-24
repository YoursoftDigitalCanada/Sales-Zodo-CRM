import api from "@/lib/axios";

export interface SendEmailPayload {
    toAddresses: { email: string; name?: string }[];
    ccAddresses?: { email: string; name?: string }[];
    bccAddresses?: { email: string; name?: string }[];
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    attachments?: File[];
}

export interface EmailResponse {
    id: string;
    subject: string;
    bodyHtml?: string;
    bodyText?: string;
    fromAddress?: string;
    fromName?: string;
    toAddresses: { email: string; name?: string }[];
    ccAddresses?: { email: string; name?: string }[];
    bccAddresses?: { email: string; name?: string }[];
    status: string;
    isRead: boolean;
    isStarred?: boolean;
    folder?: string;
    hasAttachments?: boolean;
    attachments?: {
        id: string;
        filename: string;
        mimeType: string;
        size: number;
        path: string;
    }[];
    createdAt: string;
    receivedAt?: string;
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
    const hasAttachments = Array.isArray(payload.attachments) && payload.attachments.length > 0;

    const response = hasAttachments
        ? await api.post("/emails/send", buildEmailFormData(payload), {
            headers: {
                "Content-Type": "multipart/form-data",
            },
        })
        : await api.post("/emails/send", payload);

    return response.data?.data || response.data;
}

export async function markAsRead(id: string): Promise<EmailResponse> {
    const response = await api.patch(`/emails/${id}/read`);
    return response.data?.data || response.data;
}

export async function deleteEmail(id: string): Promise<void> {
    await api.delete(`/emails/${id}`);
}

export async function toggleStar(id: string, isStarred: boolean): Promise<EmailResponse> {
    const response = await api.patch(`/emails/${id}/star`, { isStarred });
    return response.data?.data || response.data;
}

export async function moveToFolder(id: string, folder: string): Promise<EmailResponse> {
    const response = await api.patch(`/emails/${id}/folder`, { folder });
    return response.data?.data || response.data;
}

export async function getEmailConfigStatus(): Promise<{ smtpConfigured: boolean; imapConfigured: boolean }> {
    const response = await api.get("/emails/config-status");
    return response.data?.data || response.data;
}

export async function fetchEmailsNow(): Promise<{ fetched: number; error: string | null }> {
    const response = await api.post("/emails/fetch-now");
    return response.data?.data || response.data;
}

function buildEmailFormData(payload: SendEmailPayload): FormData {
    const formData = new FormData();
    formData.append("toAddresses", JSON.stringify(payload.toAddresses || []));
    formData.append("ccAddresses", JSON.stringify(payload.ccAddresses || []));
    formData.append("bccAddresses", JSON.stringify(payload.bccAddresses || []));
    formData.append("subject", payload.subject || "");

    if (typeof payload.bodyHtml === "string") {
        formData.append("bodyHtml", payload.bodyHtml);
    }

    if (typeof payload.bodyText === "string") {
        formData.append("bodyText", payload.bodyText);
    }

    for (const file of payload.attachments || []) {
        formData.append("attachments", file);
    }

    return formData;
}
