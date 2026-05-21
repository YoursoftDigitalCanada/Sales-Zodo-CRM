import type { Prisma } from '@prisma/client';
import { tenantsRepository } from './tenants.repository';
import {
    CreateTenantDto,
    UpdateTenantDto,
    TenantQueryDto,
    TenantOnboardingDto,
    TenantOnboardingResponseDto,
    toTenantResponseDto,
} from './tenants.dto';
import { NotFoundError, BadRequestError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { normalizeBusinessType } from './business-type';
import { prisma } from '../../config/database';
import {
    DEFAULT_ANALYTICS_SELECTION,
    DEFAULT_LEAD_STAGES,
    DEFAULT_PLAN_MODULE_SELECTION,
    DEFAULT_PROJECT_COLUMNS,
    DEFAULT_PROJECT_TASK_SELECTION,
    DEFAULT_TASK_STATUS_CONFIG,
    ONBOARDING_AI_BUSINESS_TYPES,
    ONBOARDING_ANALYTICS_METRICS,
    ONBOARDING_MODULE_GROUPS,
    ONBOARDING_PROJECT_STATUSES,
    ONBOARDING_TASK_STATUSES,
    ONBOARDING_TEAM_ROLES,
    type OnboardingAiBusinessType,
    type OnboardingAnalyticsMetric,
    type OnboardingModuleId,
    type OnboardingTaskStatus,
    type OnboardingTeamRole,
    getAllowedOnboardingModules,
    resolveTenantOnboardingAccess,
} from './tenant-onboarding.config';
import { normalizeSignupPlan, type SignupPlan } from '../auth/signup-access';

type TenantRecord = Prisma.TenantGetPayload<{
    include: {
        tenantSettings: true;
        subscription: true;
    };
}>;

function asRecord(value: unknown): Record<string, any> {
    return value && typeof value === 'object' && !Array.isArray(value)
        ? value as Record<string, any>
        : {};
}

function normalizeStringArray(value: unknown): string[] {
    if (!Array.isArray(value)) {
        return [];
    }

    return Array.from(
        new Set(
            value
                .map((item) => String(item).trim())
                .filter(Boolean)
        )
    );
}

function isEnumValue<T extends readonly string[]>(allowed: T, value: unknown): value is T[number] {
    return typeof value === 'string' && allowed.includes(value as T[number]);
}

export class TenantsService {
    async create(data: CreateTenantDto) {
        const existing = await tenantsRepository.findBySlug(data.slug);
        if (existing) throw new BadRequestError('Tenant slug already exists', ErrorCodes.RESOURCE_ALREADY_EXISTS);
        const tenant = await tenantsRepository.create(data);
        return toTenantResponseDto(tenant);
    }

    async getById(id: string) {
        const tenant = await tenantsRepository.findById(id);
        if (!tenant) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        return toTenantResponseDto(tenant);
    }

    async getMany(query: TenantQueryDto) {
        const { data, total } = await tenantsRepository.findMany(query);
        const page = query.page || 1, limit = query.limit || 20;
        return {
            data: data.map(toTenantResponseDto),
            meta: { page, limit, total, totalPages: Math.ceil(total / limit), hasNextPage: page < Math.ceil(total / limit), hasPrevPage: page > 1 },
        };
    }

    async update(id: string, data: UpdateTenantDto) {
        const existing = await tenantsRepository.findById(id);
        if (!existing) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        const tenant = await tenantsRepository.update(id, data);
        return toTenantResponseDto(tenant);
    }

    async delete(id: string) {
        const existing = await tenantsRepository.findById(id);
        if (!existing) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        await tenantsRepository.delete(id);
    }

    /**
     * Update the tenant's businessType in settings JSON.
     * Input is normalized to a valid BusinessType enum value.
     * Unknown values fall back to 'general'.
     */
    async updateBusinessType(tenantId: string, rawBusinessType: string): Promise<{ businessType: string }> {
        const tenant = await tenantsRepository.findById(tenantId);
        if (!tenant) throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);

        const businessType = normalizeBusinessType(rawBusinessType);
        const existingSettings = (tenant.settings as Record<string, any>) || {};

        await prisma.tenant.update({
            where: { id: tenantId },
            data: {
                settings: {
                    ...existingSettings,
                    businessType,
                },
            },
        });

        return { businessType };
    }

    async getOnboarding(tenantId: string): Promise<TenantOnboardingResponseDto> {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { tenantSettings: true, subscription: true },
        });

        if (!tenant) {
            throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        return this.buildOnboardingResponse(tenant);
    }

    async completeOnboarding(tenantId: string, data: TenantOnboardingDto): Promise<TenantOnboardingResponseDto> {
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            include: { tenantSettings: true, subscription: true },
        });

        if (!tenant) {
            throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
        }

        const plan = this.getTenantPlan(tenant);
        const access = resolveTenantOnboardingAccess(plan, data.modules);
        const existingSettings = asRecord(tenant.settings);
        const teamInvites = this.normalizeTeamInvites(data.teamInvites);
        const projectSettings = this.normalizeProjectSettings(data.projectSettings);
        const aiSettings = this.normalizeAiSettings(data.aiSettings);
        const analyticsSettings = this.normalizeAnalyticsSettings(data.analyticsSettings);
        const completedAt = new Date().toISOString();

        const mergedSettings: Record<string, unknown> = {
            ...existingSettings,
            plan,
            modules: access.selectedModuleIds,
            enabledModules: access.enabledModules,
            uiFeatures: access.enabledFeatures,
            availableModules: access.availableModules,
            availableFeatures: access.availableFeatures,
            teamInvites,
            onboardingCompleted: true,
            pipelineSettings: {
                leadStages: DEFAULT_LEAD_STAGES,
            },
            automationSetup: {
                ready: true,
                initializedAt: completedAt,
                leadStages: DEFAULT_LEAD_STAGES,
                taskStatuses: (projectSettings?.taskStatuses || DEFAULT_PROJECT_TASK_SELECTION).map((status) =>
                    DEFAULT_TASK_STATUS_CONFIG.find((option) => option.key === status) || { key: status, label: status }
                ),
            },
            onboarding: {
                modules: access.selectedModuleIds,
                settings: data.settings,
                ...(data.companyProfile ? { companyProfile: data.companyProfile } : {}),
                ...(data.salesPreferences ? { salesPreferences: data.salesPreferences } : {}),
                ...(data.financePreferences ? { financePreferences: data.financePreferences } : {}),
                ...(data.documentPreferences ? { documentPreferences: data.documentPreferences } : {}),
                teamInvites,
                ...(projectSettings ? { projectSettings } : {}),
                ...(aiSettings ? { aiSettings } : {}),
                ...(analyticsSettings ? { analyticsSettings } : {}),
                completedAt,
            },
            ...(data.companyProfile ? { companyProfile: data.companyProfile } : {}),
            ...(data.salesPreferences ? { salesPreferences: data.salesPreferences } : {}),
            ...(data.financePreferences ? { financePreferences: data.financePreferences } : {}),
            ...(data.documentPreferences ? { documentPreferences: data.documentPreferences } : {}),
            ...(projectSettings ? { projectSettings } : {}),
            ...(aiSettings ? { aiSettings } : {}),
            ...(analyticsSettings ? { analyticsSettings } : {}),
        };

        if (aiSettings?.businessType) {
            mergedSettings.businessType = normalizeBusinessType(aiSettings.businessType);
        }

        const updatedTenant = await prisma.$transaction(async (tx) => {
            await tx.tenant.update({
                where: { id: tenantId },
                data: {
                    settings: mergedSettings as any,
                    onboardingCompleted: true,
                },
            });

            await tx.tenantSettings.upsert({
                where: { tenantId },
                create: {
                    tenantId,
                    currency: data.settings.currency as any,
                    timezone: data.settings.timezone,
                    dateFormat: data.settings.dateFormat,
                    timeFormat: 'HH:mm',
                    language: 'en',
                    invoicePrefix: 'INV-',
                    invoiceNextNumber: 1001,
                    ...(access.enabledModules.includes('finance')
                        ? {
                            invoiceTerms: 'Payment due within 14 days of issue.',
                            invoiceNotes: 'Thank you for choosing Zodo CRM.',
                        }
                        : {}),
                },
                update: {
                    currency: data.settings.currency as any,
                    timezone: data.settings.timezone,
                    dateFormat: data.settings.dateFormat,
                    ...(access.enabledModules.includes('finance')
                        ? {
                            invoiceTerms: 'Payment due within 14 days of issue.',
                            invoiceNotes: 'Thank you for choosing Zodo CRM.',
                        }
                        : {}),
                },
            });

            if (access.enabledModules.includes('projects')) {
                for (const column of DEFAULT_PROJECT_COLUMNS) {
                    await tx.projectStage.upsert({
                        where: {
                            tenantId_slug: {
                                tenantId,
                                slug: column.slug,
                            },
                        },
                        create: {
                            tenantId,
                            name: column.label,
                            slug: column.slug,
                            color: column.color,
                            order: column.order,
                            isDefault: projectSettings?.defaultProjectStatus === column.key,
                            isCompleted: "isCompleted" in column ? column.isCompleted : false,
                        },
                        update: {
                            name: column.label,
                            color: column.color,
                            order: column.order,
                            isDefault: projectSettings?.defaultProjectStatus === column.key,
                            isCompleted: "isCompleted" in column ? column.isCompleted : false,
                        },
                    });
                }
            }

            const refreshedTenant = await tx.tenant.findUnique({
                where: { id: tenantId },
                include: { tenantSettings: true, subscription: true },
            });

            if (!refreshedTenant) {
                throw new NotFoundError('Tenant not found', ErrorCodes.RESOURCE_NOT_FOUND);
            }

            return refreshedTenant;
        });

        return this.buildOnboardingResponse(updatedTenant);
    }

    private getTenantPlan(tenant: {
        subscriptionTier?: string | null;
        settings?: unknown;
        subscription?: { planType?: string | null } | null;
    }): SignupPlan {
        const settings = asRecord(tenant.settings);
        return normalizeSignupPlan(
            settings.plan ||
            tenant.subscription?.planType ||
            tenant.subscriptionTier
        );
    }

    private deriveSelectedModules(plan: SignupPlan, settings: Record<string, any>): OnboardingModuleId[] {
        const explicit = normalizeStringArray(settings.modules);
        const allowed = new Set(getAllowedOnboardingModules(plan));

        const selectedFromModules = explicit.filter(
            (value): value is OnboardingModuleId => allowed.has(value as OnboardingModuleId)
        );

        if (selectedFromModules.length > 0) {
            return selectedFromModules;
        }

        const enabledModules = new Set(normalizeStringArray(settings.enabledModules));
        const derived = getAllowedOnboardingModules(plan).filter((moduleId) =>
            ONBOARDING_MODULE_GROUPS[moduleId].moduleSlugs.some((slug) => enabledModules.has(slug))
        );

        return derived.length > 0 ? derived : DEFAULT_PLAN_MODULE_SELECTION[plan];
    }

    private normalizeTeamInvites(input: TenantOnboardingDto['teamInvites']): TenantOnboardingDto['teamInvites'] {
        const seen = new Set<string>();
        const invites = Array.isArray(input) ? input : [];

        return invites.flatMap((invite) => {
            const email = invite.email.trim().toLowerCase();
            const role = invite.role.trim().toLowerCase();
            if (!email || seen.has(email) || !isEnumValue(ONBOARDING_TEAM_ROLES, role)) {
                return [];
            }

            seen.add(email);
            return [{
                email,
                role: role as OnboardingTeamRole,
            }];
        });
    }

    private normalizeProjectSettings(input: TenantOnboardingDto['projectSettings']) {
        if (!input) {
            return undefined;
        }

        const defaultProjectStatus = isEnumValue(ONBOARDING_PROJECT_STATUSES, input.defaultProjectStatus)
            ? input.defaultProjectStatus
            : 'not_started';
        const taskStatuses = Array.from(
            new Set(
                (Array.isArray(input.taskStatuses) ? input.taskStatuses : [])
                    .filter((status): status is OnboardingTaskStatus => isEnumValue(ONBOARDING_TASK_STATUSES, status))
            )
        );

        return {
            defaultProjectStatus,
            taskStatuses,
        };
    }

    private normalizeAiSettings(input: TenantOnboardingDto['aiSettings']) {
        if (!input || !isEnumValue(ONBOARDING_AI_BUSINESS_TYPES, input.businessType)) {
            return undefined;
        }

        return {
            businessType: input.businessType as OnboardingAiBusinessType,
            ...(input.materialType ? { materialType: input.materialType.trim() } : {}),
            ...(input.costingMethod ? { costingMethod: input.costingMethod.trim() } : {}),
        };
    }

    private normalizeAnalyticsSettings(input: TenantOnboardingDto['analyticsSettings']) {
        if (!input) {
            return undefined;
        }

        const metrics = Array.from(
            new Set(
                (Array.isArray(input.metrics) ? input.metrics : [])
                    .filter((metric): metric is OnboardingAnalyticsMetric => isEnumValue(ONBOARDING_ANALYTICS_METRICS, metric))
            )
        );

        return metrics.length > 0 ? { metrics } : undefined;
    }

    private buildOnboardingResponse(tenant: NonNullable<TenantRecord>): TenantOnboardingResponseDto {
        const settings = asRecord(tenant.settings);
        const plan = this.getTenantPlan(tenant);
        const selectedModules = this.deriveSelectedModules(plan, settings);
        const access = resolveTenantOnboardingAccess(plan, selectedModules);
        const onboarding = asRecord(settings.onboarding);
        const projectSettings = this.normalizeProjectSettings(
            asRecord(onboarding.projectSettings).defaultProjectStatus
                ? asRecord(onboarding.projectSettings) as TenantOnboardingDto['projectSettings']
                : asRecord(settings.projectSettings) as TenantOnboardingDto['projectSettings']
        );
        const aiSettings = this.normalizeAiSettings(
            asRecord(onboarding.aiSettings).businessType
                ? asRecord(onboarding.aiSettings) as TenantOnboardingDto['aiSettings']
                : asRecord(settings.aiSettings) as TenantOnboardingDto['aiSettings']
        );
        const analyticsSettings = this.normalizeAnalyticsSettings(
            asRecord(onboarding.analyticsSettings).metrics
                ? asRecord(onboarding.analyticsSettings) as TenantOnboardingDto['analyticsSettings']
                : asRecord(settings.analyticsSettings) as TenantOnboardingDto['analyticsSettings']
        );
        const teamInvites = this.normalizeTeamInvites(
            Array.isArray(onboarding.teamInvites)
                ? onboarding.teamInvites as TenantOnboardingDto['teamInvites']
                : Array.isArray(settings.teamInvites)
                    ? settings.teamInvites as TenantOnboardingDto['teamInvites']
                    : []
        );

        return {
            tenant: {
                id: tenant.id,
                name: tenant.name,
                slug: tenant.slug,
                plan,
                companyType: typeof settings.companyType === 'string' ? settings.companyType : undefined,
                country: typeof settings.country === 'string' ? settings.country : undefined,
                onboardingCompleted: tenant.onboardingCompleted === true || settings.onboardingCompleted === true,
                availableModules: access.availableModules,
                availableFeatures: access.availableFeatures,
                enabledModules: access.enabledModules.length > 0 ? access.enabledModules : access.availableModules,
                enabledFeatures: access.enabledFeatures.length > 0 ? access.enabledFeatures : access.availableFeatures,
            },
            onboarding: {
                modules: access.selectedModuleIds,
                settings: {
                    currency: tenant.tenantSettings?.currency || 'USD',
                    timezone: tenant.tenantSettings?.timezone || 'UTC',
                    dateFormat: tenant.tenantSettings?.dateFormat || 'MM/DD/YYYY',
                },
                ...(asRecord(onboarding.companyProfile).workspaceName || asRecord(settings.companyProfile).workspaceName
                    ? { companyProfile: (asRecord(onboarding.companyProfile).workspaceName ? asRecord(onboarding.companyProfile) : asRecord(settings.companyProfile)) as any }
                    : {}),
                ...(asRecord(onboarding.salesPreferences).defaultPipeline || asRecord(settings.salesPreferences).defaultPipeline
                    ? { salesPreferences: (asRecord(onboarding.salesPreferences).defaultPipeline ? asRecord(onboarding.salesPreferences) : asRecord(settings.salesPreferences)) as any }
                    : {}),
                ...(asRecord(onboarding.financePreferences).invoicePrefix || asRecord(settings.financePreferences).invoicePrefix
                    ? { financePreferences: (asRecord(onboarding.financePreferences).invoicePrefix ? asRecord(onboarding.financePreferences) : asRecord(settings.financePreferences)) as any }
                    : {}),
                ...(asRecord(onboarding.documentPreferences).defaultFolders || asRecord(settings.documentPreferences).defaultFolders
                    ? { documentPreferences: (asRecord(onboarding.documentPreferences).defaultFolders ? asRecord(onboarding.documentPreferences) : asRecord(settings.documentPreferences)) as any }
                    : {}),
                teamInvites,
                ...(plan !== 'basic'
                    ? {
                        projectSettings: projectSettings || {
                            defaultProjectStatus: 'not_started',
                            taskStatuses: [...DEFAULT_PROJECT_TASK_SELECTION],
                        },
                    }
                    : {}),
                ...(plan === 'premium'
                    ? {
                        aiSettings: aiSettings || {
                            businessType: 'roofing',
                        },
                        analyticsSettings: analyticsSettings || {
                            metrics: [...DEFAULT_ANALYTICS_SELECTION],
                        },
                    }
                    : {}),
            },
        };
    }
}

export const tenantsService = new TenantsService();
