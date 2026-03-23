import api from "@/lib/axios";

// ============================================
// ROLES API
// ============================================

export interface ApiRole {
    id: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    isDefault: boolean;
    employeesCount: number;
    createdAt: string;
    updatedAt: string;
    permissions: Array<{ id: string; code: string; name: string }>;
}

export interface ApiPermission {
    id: string;
    code: string;
    name: string;
    description: string | null;
    module: string;
    action: string;
}

export interface ApiEmployee {
    id: string;
    employeeNumber: string | null;
    department: string | null;
    position: string | null;
    isActive: boolean;
    userId: string;
    roleId: string;
    createdAt: string;
    user?: { email: string; firstName: string; lastName: string; lastLoginAt: string | null; status: string };
    role?: { id: string; name: string };
}

// --- Roles ---

export async function fetchRoles(): Promise<ApiRole[]> {
    const res = await api.get("/roles", { params: { limit: 100 } });
    return res.data?.data || [];
}

export async function createRole(data: { name: string; description?: string; permissionIds?: string[] }): Promise<ApiRole> {
    const res = await api.post("/roles", data);
    return res.data?.data;
}

export async function updateRole(id: string, data: { name?: string; description?: string; permissionIds?: string[] }): Promise<ApiRole> {
    const res = await api.put(`/roles/${id}`, data);
    return res.data?.data;
}

export async function deleteRole(id: string): Promise<void> {
    await api.delete(`/roles/${id}`);
}

// --- Permissions ---

export async function fetchAllPermissions(): Promise<ApiPermission[]> {
    const res = await api.get("/permissions");
    return res.data?.data || [];
}

export async function fetchPermissionModules(): Promise<string[]> {
    const res = await api.get("/permissions/modules");
    return res.data?.data || [];
}

export async function assignPermissionsToRole(roleId: string, permissionIds: string[]): Promise<void> {
    await api.post(`/permissions/roles/${roleId}/assign`, { permissionIds });
}

// --- Employees (for Users tab) ---

export async function fetchEmployees(): Promise<ApiEmployee[]> {
    const res = await api.get("/employees", { params: { limit: 100 } });
    return res.data?.data || [];
}

export async function updateEmployee(id: string, data: { roleId?: string; isActive?: boolean }): Promise<ApiEmployee> {
    const res = await api.put(`/employees/${id}`, data);
    return res.data?.data;
}
