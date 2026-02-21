import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from './roles.dto';
export declare class RolesService {
    create(tenantId: string, data: CreateRoleDto): Promise<import("./roles.dto").RoleResponseDto>;
    getById(id: string, tenantId: string): Promise<import("./roles.dto").RoleResponseDto>;
    getMany(tenantId: string, query: RoleQueryDto): Promise<{
        data: import("./roles.dto").RoleResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, tenantId: string, data: UpdateRoleDto): Promise<import("./roles.dto").RoleResponseDto>;
    delete(id: string, tenantId: string): Promise<void>;
}
export declare const rolesService: RolesService;
//# sourceMappingURL=roles.service.d.ts.map