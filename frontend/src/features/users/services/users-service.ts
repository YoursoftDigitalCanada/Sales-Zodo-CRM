import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export interface UserEntity {
    id: string | number;
    [key: string]: unknown;
}

export interface DepartmentEntity {
    id: string;
    name: string;
    code: string;
    description: string;
    headId?: string | null;
    headName?: string;
    headAvatar?: string | null;
    employeeCount: number;
    budget: number;
    color: string;
    createdAt: string;
    isActive: boolean;
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

export async function getDepartments(): Promise<DepartmentEntity[]> {
    const response = await api.get("/employees/departments");
    return extractApiArray<DepartmentEntity>(response.data);
}

export async function createDepartment(data: Record<string, unknown>): Promise<DepartmentEntity> {
    const response = await api.post("/employees/departments", data);
    return extractApiData<DepartmentEntity>(response.data);
}

export async function updateDepartment(id: string, data: Record<string, unknown>): Promise<DepartmentEntity> {
    const response = await api.put(`/employees/departments/${id}`, data);
    return extractApiData<DepartmentEntity>(response.data);
}

export async function deleteDepartment(id: string): Promise<void> {
    await api.delete(`/employees/departments/${id}`);
}
