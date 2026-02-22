import api from "@/lib/axios";

export async function getFiles(params?: Record<string, unknown>) {
    const response = await api.get("/files", { params });
    const raw = response.data;
    return raw?.data || raw || [];
}
