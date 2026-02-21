import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './tenants.dto';
export declare class TenantsService {
    create(data: CreateTenantDto): Promise<import("./tenants.dto").TenantResponseDto>;
    getById(id: string): Promise<import("./tenants.dto").TenantResponseDto>;
    getMany(query: TenantQueryDto): Promise<{
        data: import("./tenants.dto").TenantResponseDto[];
        meta: {
            page: number;
            limit: number;
            total: number;
            totalPages: number;
            hasNextPage: boolean;
            hasPrevPage: boolean;
        };
    }>;
    update(id: string, data: UpdateTenantDto): Promise<import("./tenants.dto").TenantResponseDto>;
    delete(id: string): Promise<void>;
}
export declare const tenantsService: TenantsService;
//# sourceMappingURL=tenants.service.d.ts.map