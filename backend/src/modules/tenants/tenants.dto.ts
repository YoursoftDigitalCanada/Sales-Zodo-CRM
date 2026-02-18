import { Tenant, TenantStatus } from '@prisma/client';

export interface CreateTenantDto {
    name: string;
    slug: string;
    domain?: string | null;
    settings?: Record<string, unknown>;
    subscriptionTier?: string;
}

export interface UpdateTenantDto {
    name?: string;
    domain?: string | null;
    status?: TenantStatus;
    settings?: Record<string, unknown>;
    subscriptionTier?: string;
}

export interface TenantQueryDto {
    page?: number;
    limit?: number;
    search?: string;
    status?: TenantStatus;
    sortBy?: 'name' | 'createdAt';
    sortOrder?: 'asc' | 'desc';
}

export interface TenantResponseDto {
    id: string;
    name: string;
    slug: string;
    domain: string | null;
    status: TenantStatus;
    settings: Record<string, unknown>;
    subscriptionTier: string;
    usersCount: number;
    createdAt: Date;
    updatedAt: Date;
}

type TenantWithCount = Tenant & { _count?: { users: number } };

export function toTenantResponseDto(t: TenantWithCount): TenantResponseDto {
    return {
        id: t.id,
        name: t.name,
        slug: t.slug,
        domain: t.domain,
        status: t.status,
        settings: (t.settings as Record<string, unknown>) || {},
        subscriptionTier: t.subscriptionTier,
        usersCount: t._count?.users || 0,
        createdAt: t.createdAt,
        updatedAt: t.updatedAt,
    };
}
