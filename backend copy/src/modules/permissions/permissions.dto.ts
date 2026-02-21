import { Permission, RolePermission } from '@prisma/client';

export interface PermissionResponseDto {
    id: string;
    code: string;
    name: string;
    description: string | null;
    module: string;
    action: string;
}

export interface RolePermissionResponseDto {
    roleId: string;
    permissions: PermissionResponseDto[];
}

export interface AssignPermissionsDto {
    permissionIds: string[];
}

export interface PermissionQueryDto {
    module?: string;
}

export function toPermissionResponseDto(p: Permission): PermissionResponseDto {
    return {
        id: p.id,
        code: p.code,
        name: p.name,
        description: p.description,
        module: p.module,
        action: p.action,
    };
}
