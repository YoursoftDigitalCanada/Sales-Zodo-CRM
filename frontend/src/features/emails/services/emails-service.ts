import api from "@/lib/axios";

export async function getEmails(params?: Record<string, unknown>) {
    const response = await api.get("/emails", { params });
    const raw = response.data;
    return raw?.data || raw || [];
}
