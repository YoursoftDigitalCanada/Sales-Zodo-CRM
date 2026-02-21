import { Role } from '@prisma/client';

export interface CreateRoleDto {
    name: string;
    description?: string | null;
    isDefault?: boolean;
    permissionIds?: string[];
}

export interface UpdateRoleDto extends Partial<CreateRoleDto> { }

export interface RoleQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    sortBy?: 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface RoleResponseDto {
    id: string;
    name: string;
    description: string | null;
    isSystemRole: boolean;
    isDefault: boolean;
    employeesCount: number;
    permissions: { id: string; code: string; name: string }[];
    createdAt: Date;
    updatedAt: Date;
}

type RoleWithRelations = Role & {
    _count?: { employees: number };
    permissions?: { permission: { id: string; code: string; name: string } }[];
};

export function toRoleResponseDto(r: RoleWithRelations): RoleResponseDto {
    return {
        id: r.id,
        name: r.name,
        description: r.description,
        isSystemRole: r.isSystemRole,
        isDefault: r.isDefault,
        employeesCount: r._count?.employees || 0,
        permissions: (r.permissions || []).map((rp) => rp.permission),
        createdAt: r.createdAt,
        updatedAt: r.updatedAt,
    };
}
