import { Tenant, TenantPlan } from '@prisma/client';
export interface CreateTenantDto {
    name: string;
    slug: string;
    domain?: string | null;
    plan?: TenantPlan;
    settings?: Record<string, unknown>;
}
export interface UpdateTenantDto {
    name?: string;
    domain?: string | null;
    plan?: TenantPlan;
    settings?: Record<string, unknown>;
    isActive?: boolean;
}
export interface TenantQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    plan?: TenantPlan;
    isActive?: boolean;
    sortBy?: 'name' | 'createdAt' | 'plan';
    sortOrder?: 'asc' | 'desc';
}
export interface TenantResponseDto {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    plan: TenantPlan;
    isActive: boolean;
    settings: Record<string, unknown>;
    usersCount: number;
    createdAt: Date;
    updatedAt: Date;
}
type TenantWithCount = Tenant & {
    _count?: {
        users: number;
    };
};
export declare function toTenantResponseDto(t: TenantWithCount): TenantResponseDto;
export {};
//# sourceMappingURL=tenants.dto.d.ts.map