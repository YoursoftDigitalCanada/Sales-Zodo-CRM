import { z } from 'zod';
import {
    ONBOARDING_AI_BUSINESS_TYPES,
    ONBOARDING_ANALYTICS_METRICS,
    ONBOARDING_MODULE_IDS,
    ONBOARDING_PROJECT_STATUSES,
    ONBOARDING_TASK_STATUSES,
    ONBOARDING_TEAM_ROLES,
} from './tenant-onboarding.config';

export const createTenantSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255),
        slug: z.string().min(1).max(100).regex(/^[a-z0-9-]+$/),
        domain: z.string().max(255).optional().nullable(),
        plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).default('FREE'),
        settings: z.record(z.unknown()).optional(),
    }),
});

export const updateTenantSchema = z.object({
    body: z.object({
        name: z.string().min(1).max(255).optional(),
        domain: z.string().max(255).optional().nullable(),
        plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
        settings: z.record(z.unknown()).optional(),
        isActive: z.boolean().optional(),
    }),
});

export const tenantQuerySchema = z.object({
    query: z.object({
        page: z.coerce.number().int().min(1).default(1),
        limit: z.coerce.number().int().min(1).max(100).default(20),
        search: z.string().optional(),
        plan: z.enum(['FREE', 'STARTER', 'PROFESSIONAL', 'ENTERPRISE']).optional(),
        isActive: z.coerce.boolean().optional(),
        sortBy: z.enum(['name', 'createdAt', 'plan']).default('createdAt'),
        sortOrder: z.enum(['asc', 'desc']).default('desc'),
    }),
});

export const tenantIdSchema = z.object({
    params: z.object({ id: z.string().uuid() }),
});

const onboardingModuleSchema = z.enum(
    ONBOARDING_MODULE_IDS as [typeof ONBOARDING_MODULE_IDS[number], ...typeof ONBOARDING_MODULE_IDS[number][]]
);

const onboardingTeamInviteSchema = z.object({
    email: z.string().email(),
    role: z.enum(ONBOARDING_TEAM_ROLES),
});

const projectSettingsSchema = z.object({
    defaultProjectStatus: z.enum(ONBOARDING_PROJECT_STATUSES),
    taskStatuses: z.array(z.enum(ONBOARDING_TASK_STATUSES)).default([]),
});

const aiSettingsSchema = z.object({
    businessType: z.enum(ONBOARDING_AI_BUSINESS_TYPES),
    materialType: z.string().trim().max(120).optional(),
    costingMethod: z.string().trim().max(120).optional(),
});

const analyticsSettingsSchema = z.object({
    metrics: z.array(z.enum(ONBOARDING_ANALYTICS_METRICS)).min(1),
});

const shortText = z.string().trim().max(160);
const textList = z.array(shortText).max(12);

export const tenantOnboardingSchema = z.object({
    body: z.object({
        modules: z.array(onboardingModuleSchema).min(1),
        settings: z.object({
            currency: z.enum(['USD', 'EUR', 'GBP', 'CAD', 'AUD', 'INR', 'JPY', 'CNY']),
            timezone: z.string().trim().min(1).max(100),
            dateFormat: z.enum(['MM/DD/YYYY', 'DD/MM/YYYY', 'YYYY-MM-DD']),
        }),
        companyProfile: z.object({
            workspaceName: shortText.optional(),
            website: shortText.optional(),
            industry: shortText.optional(),
            businessType: shortText.optional(),
            companySize: shortText.optional(),
            country: shortText.optional(),
        }).optional(),
        salesPreferences: z.object({
            leadStages: textList.optional(),
            dealStages: textList.optional(),
            defaultPipeline: shortText.optional(),
            taskCadence: shortText.optional(),
        }).optional(),
        financePreferences: z.object({
            proposalPrefix: shortText.optional(),
            invoicePrefix: shortText.optional(),
            paymentTermsDays: z.coerce.number().int().min(0).max(365).optional(),
            defaultBillingCycle: shortText.optional(),
        }).optional(),
        documentPreferences: z.object({
            defaultFolders: textList.optional(),
            requireFileCategories: z.boolean().optional(),
            enableClientVisibleFiles: z.boolean().optional(),
        }).optional(),
        teamInvites: z.array(onboardingTeamInviteSchema).default([]),
        projectSettings: projectSettingsSchema.optional(),
        aiSettings: aiSettingsSchema.optional(),
        analyticsSettings: analyticsSettingsSchema.optional(),
    }),
});
