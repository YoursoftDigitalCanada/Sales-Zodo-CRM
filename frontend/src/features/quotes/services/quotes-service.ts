import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

// ---------- Types ----------
export interface QuoteItemEntity {
    description: string;
    quantity: number;
    unitPrice: number;
    total: number;
    sortOrder?: number;
}

export interface QuoteEntity {
    id: string;
    quoteNumber: string;
    status: string;
    client: { id: string; clientName: string } | null;
    lead?: { id: string; firstName: string; lastName: string; companyName: string | null } | null;
    leadId: string | null;
    issueDate: string;
    validUntil: string;
    currency: string;
    subtotal: number;
    taxRate: number | null;
    taxAmount: number;
    discountAmount: number;
    total: number;
    notes: string | null;
    terms: string | null;
    sourceEventId: string | null;
    items: QuoteItemEntity[];
    createdAt: string;
    updatedAt: string;
    sentAt: string | null;
    acceptedAt: string | null;
    roofEstimateId: string | null;
    [key: string]: unknown;
}

export interface QuoteQueryParams {
    page?: number;
    limit?: number;
    search?: string;
    status?: string;
    clientId?: string;
    leadId?: string;
    sortBy?: string;
    sortOrder?: "asc" | "desc";
}

// ---------- API functions ----------

export async function getQuotes(params?: QuoteQueryParams): Promise<{
    data: QuoteEntity[];
    meta: { page: number; limit: number; total: number; totalPages: number };
}> {
    const response = await api.get("/quotes", { params: { limit: 100, ...params } });
    // Backend returns { data: [...], meta: {...} }
    const payload = response.data;
    return {
        data: payload?.data || extractApiArray<QuoteEntity>(payload),
        meta: payload?.meta || { page: 1, limit: 100, total: 0, totalPages: 1 },
    };
}

export async function getQuoteById(id: string): Promise<QuoteEntity> {
    const response = await api.get(`/quotes/${id}`);
    return response.data?.data || response.data;
}

export async function createQuote(data: Record<string, unknown>): Promise<QuoteEntity> {
    const response = await api.post("/quotes", data);
    return response.data?.data || response.data;
}

export async function updateQuote(id: string, data: Record<string, unknown>): Promise<QuoteEntity> {
    const response = await api.put(`/quotes/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteQuote(id: string): Promise<void> {
    await api.delete(`/quotes/${id}`);
}

export async function updateQuoteStatus(id: string, status: string): Promise<QuoteEntity> {
    const response = await api.patch(`/quotes/${id}/status`, { status });
    return response.data?.data || response.data;
}

export async function sendQuoteEmail(id: string): Promise<{ success: boolean; message: string }> {
    const response = await api.post(`/quotes/${id}/send`);
    return response.data;
}
