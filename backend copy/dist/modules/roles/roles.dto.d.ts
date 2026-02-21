import { Role } from '@prisma/client';
export interface CreateRoleDto {
    name: string;
    description?: string | null;
    permissions?: string[];
    isDefault?: boolean;
}
export interface UpdateRoleDto extends Partial<CreateRoleDto> {
}
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
    permissions: string[];
    isDefault: boolean;
    usersCount: number;
    createdAt: Date;
    updatedAt: Date;
}
type RoleWithCount = Role & {
    _count?: {
        users: number;
    };
};
export declare function toRoleResponseDto(role: RoleWithCount): RoleResponseDto;
export {};
//# sourceMappingURL=roles.dto.d.ts.map