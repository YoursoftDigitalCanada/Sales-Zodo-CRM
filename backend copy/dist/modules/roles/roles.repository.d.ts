import { CreateRoleDto, UpdateRoleDto, RoleQueryDto } from './roles.dto';
export declare class RolesRepository {
    create(tenantId: string, data: CreateRoleDto): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystemRole: boolean;
        isDefault: boolean;
    }>;
    findById(id: string, tenantId: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystemRole: boolean;
        isDefault: boolean;
    } | null>;
    findMany(tenantId: string, query: RoleQueryDto): Promise<{
        data: {
            tenantId: string;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            description: string | null;
            isSystemRole: boolean;
            isDefault: boolean;
        }[];
        total: number;
    }>;
    update(id: string, data: UpdateRoleDto): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystemRole: boolean;
        isDefault: boolean;
    }>;
    delete(id: string): Promise<{
        tenantId: string;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        description: string | null;
        isSystemRole: boolean;
        isDefault: boolean;
    }>;
}
export declare const rolesRepository: RolesRepository;
//# sourceMappingURL=roles.repository.d.ts.map