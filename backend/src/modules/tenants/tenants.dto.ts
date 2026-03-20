import { Tenant, TenantStatus } from '@prisma/client';
import type {
    OnboardingAiBusinessType,
    OnboardingAnalyticsMetric,
    OnboardingModuleId,
    OnboardingProjectStatus,
    OnboardingTaskStatus,
    OnboardingTeamRole,
} from './tenant-onboarding.config';

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

export interface TenantOnboardingSettingsDto {
    currency: string;
    timezone: string;
    dateFormat: string;
}

export interface TenantOnboardingTeamInviteDto {
    email: string;
    role: OnboardingTeamRole;
}

export interface TenantOnboardingProjectSettingsDto {
    defaultProjectStatus: OnboardingProjectStatus;
    taskStatuses: OnboardingTaskStatus[];
}

export interface TenantOnboardingAiSettingsDto {
    businessType: OnboardingAiBusinessType;
    materialType?: string;
    costingMethod?: string;
}

export interface TenantOnboardingAnalyticsSettingsDto {
    metrics: OnboardingAnalyticsMetric[];
}

export interface TenantOnboardingDto {
    modules: OnboardingModuleId[];
    settings: TenantOnboardingSettingsDto;
    teamInvites: TenantOnboardingTeamInviteDto[];
    projectSettings?: TenantOnboardingProjectSettingsDto;
    aiSettings?: TenantOnboardingAiSettingsDto;
    analyticsSettings?: TenantOnboardingAnalyticsSettingsDto;
}

export interface TenantOnboardingResponseDto {
    tenant: {
        id: string;
        name: string;
        slug: string;
        plan: string;
        companyType?: string;
        country?: string;
        onboardingCompleted: boolean;
        availableModules: string[];
        availableFeatures: string[];
        enabledModules: string[];
        enabledFeatures: string[];
    };
    onboarding: TenantOnboardingDto;
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
