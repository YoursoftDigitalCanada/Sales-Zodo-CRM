import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface UserEntity {
    id: string | number;
    [key: string]: unknown;
}

export async function getUsers(): Promise<UserEntity[]> {
    const response = await api.get("/users");
    return extractApiArray<UserEntity>(response.data);
}

export async function createUser(data: Record<string, unknown>): Promise<UserEntity> {
    const response = await api.post("/users", data);
    return response.data?.data || response.data;
}

export async function updateUser(id: string | number, data: Record<string, unknown>): Promise<UserEntity> {
    const response = await api.put(`/users/${id}`, data);
    return response.data?.data || response.data;
}

export async function deleteUser(id: string | number): Promise<void> {
    await api.delete(`/users/${id}`);
}

export async function getEmployees(params?: Record<string, unknown>): Promise<UserEntity[]> {
    const response = await api.get("/employees", { params: { limit: 200, ...params } });
    return extractApiArray<UserEntity>(response.data);
}
