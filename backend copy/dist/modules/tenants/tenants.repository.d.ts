import { Prisma } from '@prisma/client';
import { CreateTenantDto, UpdateTenantDto, TenantQueryDto } from './tenants.dto';
export declare class TenantsRepository {
    create(data: CreateTenantDto): Promise<{
        status: import(".prisma/client").$Enums.TenantStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        domain: string | null;
        logo: string | null;
        settings: Prisma.JsonValue;
        fileStorageQuota: bigint;
        fileStorageUsed: bigint;
        emailStorageQuota: bigint;
        emailStorageUsed: bigint;
        subscriptionTier: string;
        subscriptionExpiresAt: Date | null;
    }>;
    findById(id: string): Promise<({
        _count: {
            users: number;
        };
    } & {
        status: import(".prisma/client").$Enums.TenantStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        domain: string | null;
        logo: string | null;
        settings: Prisma.JsonValue;
        fileStorageQuota: bigint;
        fileStorageUsed: bigint;
        emailStorageQuota: bigint;
        emailStorageUsed: bigint;
        subscriptionTier: string;
        subscriptionExpiresAt: Date | null;
    }) | null>;
    findBySlug(slug: string): Promise<({
        _count: {
            users: number;
        };
    } & {
        status: import(".prisma/client").$Enums.TenantStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        domain: string | null;
        logo: string | null;
        settings: Prisma.JsonValue;
        fileStorageQuota: bigint;
        fileStorageUsed: bigint;
        emailStorageQuota: bigint;
        emailStorageUsed: bigint;
        subscriptionTier: string;
        subscriptionExpiresAt: Date | null;
    }) | null>;
    findMany(query: TenantQueryDto): Promise<{
        data: ({
            _count: {
                users: number;
            };
        } & {
            status: import(".prisma/client").$Enums.TenantStatus;
            id: string;
            createdAt: Date;
            updatedAt: Date;
            name: string;
            slug: string;
            domain: string | null;
            logo: string | null;
            settings: Prisma.JsonValue;
            fileStorageQuota: bigint;
            fileStorageUsed: bigint;
            emailStorageQuota: bigint;
            emailStorageUsed: bigint;
            subscriptionTier: string;
            subscriptionExpiresAt: Date | null;
        })[];
        total: number;
    }>;
    update(id: string, data: UpdateTenantDto): Promise<{
        status: import(".prisma/client").$Enums.TenantStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        domain: string | null;
        logo: string | null;
        settings: Prisma.JsonValue;
        fileStorageQuota: bigint;
        fileStorageUsed: bigint;
        emailStorageQuota: bigint;
        emailStorageUsed: bigint;
        subscriptionTier: string;
        subscriptionExpiresAt: Date | null;
    }>;
    delete(id: string): Promise<{
        status: import(".prisma/client").$Enums.TenantStatus;
        id: string;
        createdAt: Date;
        updatedAt: Date;
        name: string;
        slug: string;
        domain: string | null;
        logo: string | null;
        settings: Prisma.JsonValue;
        fileStorageQuota: bigint;
        fileStorageUsed: bigint;
        emailStorageQuota: bigint;
        emailStorageUsed: bigint;
        subscriptionTier: string;
        subscriptionExpiresAt: Date | null;
    }>;
}
export declare const tenantsRepository: TenantsRepository;
//# sourceMappingURL=tenants.repository.d.ts.map