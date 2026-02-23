import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface GroupEntity {
    id: string;
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: string;
    members?: Array<{ id: string; clientName?: string;[key: string]: unknown }>;
    memberCount?: number;
    createdAt?: string;
    updatedAt?: string;
    [key: string]: unknown;
}

export interface CreateGroupPayload {
    name: string;
    description?: string;
    color?: string;
    icon?: string;
    type?: string;
    [key: string]: unknown;
}

export interface UpdateGroupPayload extends Partial<CreateGroupPayload> { }

export async function getGroups(params?: Record<string, unknown>): Promise<GroupEntity[]> {
    const response = await api.get("/groups", { params: { limit: 100, ...params } });
    return extractApiArray<GroupEntity>(response.data);
}

export async function getGroupById(id: string): Promise<GroupEntity> {
    const response = await api.get(`/groups/${id}`);
    return response.data?.data || response.data;
}

export async function createGroup(data: CreateGroupPayload): Promise<GroupEntity> {
    const response = await api.post("/groups", data);
    return response.data?.data || response.data;
}

export async function updateGroup(id: string, data: UpdateGroupPayload): Promise<GroupEntity> {
    const response = await api.put(`/groups/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteGroup(id: string): Promise<void> {
    await api.delete(`/groups/${id}`);
}

export async function addGroupMembers(groupId: string, clientIds: string[]): Promise<GroupEntity> {
    const response = await api.post(`/groups/${groupId}/members`, { clientIds });
    return response.data?.data || response.data;
}

export async function removeGroupMember(groupId: string, clientId: string): Promise<void> {
    await api.delete(`/groups/${groupId}/members/${clientId}`);
}
