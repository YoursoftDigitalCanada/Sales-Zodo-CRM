import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ApplicationEntity {
    id: string;
    candidateName?: string;
    email?: string;
    phone?: string;
    position?: string;
    status?: string;
    resumeUrl?: string;
    coverLetter?: string;
    source?: string;
    rating?: number;
    notes?: string;
    appliedAt?: string;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CreateApplicationPayload {
    candidateName: string;
    email: string;
    phone?: string;
    position: string;
    status?: string;
    resumeUrl?: string;
    coverLetter?: string;
    source?: string;
    [key: string]: unknown;
}

export interface UpdateApplicationPayload extends Partial<CreateApplicationPayload> { }

export async function getApplications(params?: Record<string, unknown>): Promise<ApplicationEntity[]> {
    const response = await api.get("/applications", { params: { limit: 100, ...params } });
    return extractApiArray<ApplicationEntity>(response.data);
}

export async function getApplicationById(id: string): Promise<ApplicationEntity> {
    const response = await api.get(`/applications/${id}`);
    return response.data?.data || response.data;
}

export async function createApplication(data: CreateApplicationPayload): Promise<ApplicationEntity> {
    const response = await api.post("/applications", data);
    return response.data?.data || response.data;
}

export async function updateApplication(id: string, data: UpdateApplicationPayload): Promise<ApplicationEntity> {
    const response = await api.put(`/applications/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteApplication(id: string): Promise<void> {
    await api.delete(`/applications/${id}`);
}
