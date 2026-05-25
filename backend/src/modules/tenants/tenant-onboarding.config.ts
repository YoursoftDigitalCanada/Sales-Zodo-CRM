import { getFullAccessDefinition, getPlanDefinition, type SignupPlan } from '../auth/signup-access';

export const ONBOARDING_TEAM_ROLES = ['admin', 'manager', 'employee'] as const;
export type OnboardingTeamRole = (typeof ONBOARDING_TEAM_ROLES)[number];

export const ONBOARDING_PROJECT_STATUSES = [
    'not_started',
    'in_progress',
    'completed',
] as const;
export type OnboardingProjectStatus = (typeof ONBOARDING_PROJECT_STATUSES)[number];

export const ONBOARDING_TASK_STATUSES = [
    'pending',
    'in_progress',
    'done',
] as const;
export type OnboardingTaskStatus = (typeof ONBOARDING_TASK_STATUSES)[number];

export const ONBOARDING_AI_BUSINESS_TYPES = [
    'saas',
    'b2b_sales',
    'professional_services',
    'construction',
    'general_contractor',
    'other',
] as const;
export type OnboardingAiBusinessType = (typeof ONBOARDING_AI_BUSINESS_TYPES)[number];

export const ONBOARDING_ANALYTICS_METRICS = [
    'revenue',
    'leads',
    'projects',
    'performance',
] as const;
export type OnboardingAnalyticsMetric = (typeof ONBOARDING_ANALYTICS_METRICS)[number];

export const ONBOARDING_MODULE_GROUPS = {
    leads: {
        label: 'Leads',
        description: 'Capture, qualify, and manage prospects.',
        plans: ['basic', 'standard', 'premium'],
        moduleSlugs: ['leads'],
        featureIds: ['leads'],
    },
    clients: {
        label: 'Clients',
        description: 'Track customer records and relationships.',
        plans: ['basic', 'standard', 'premium'],
        moduleSlugs: ['clients'],
        featureIds: ['clients'],
    },
    finance: {
        label: 'Finance',
        description: 'Invoices, payments, quotes, and finance workflows.',
        plans: ['basic', 'standard', 'premium'],
        moduleSlugs: ['finance'],
        featureIds: ['finance'],
    },
    letterbox: {
        label: 'Zodo Mail',
        description: 'Shared inbox and customer communication history.',
        plans: ['basic'],
        moduleSlugs: ['letterbox'],
        featureIds: ['letterbox'],
    },
    support: {
        label: 'Support',
        description: 'Ticketing and customer support operations.',
        plans: ['basic', 'standard', 'premium'],
        moduleSlugs: ['support'],
        featureIds: ['support'],
    },
    projects: {
        label: 'Projects',
        description: 'All Projects, Kanban, Time Tracking, and File Manager.',
        plans: ['standard', 'premium'],
        moduleSlugs: ['projects', 'kanban', 'time-tracking', 'files'],
        featureIds: ['projects', 'kanban', 'timeTracking', 'files'],
    },
    communication: {
        label: 'Communication',
        description: 'Chat plus Zodo Mail collaboration.',
        plans: ['standard', 'premium'],
        moduleSlugs: ['chat', 'letterbox'],
        featureIds: ['chat', 'letterbox'],
    },
    team: {
        label: 'Team',
        description: 'Employees, users, and roles & permissions.',
        plans: ['standard', 'premium'],
        moduleSlugs: ['team'],
        featureIds: ['team'],
    },
    analytics: {
        label: 'Advanced Analytics',
        description: 'Revenue, pipeline, and performance intelligence.',
        plans: ['premium'],
        moduleSlugs: ['analytics'],
        featureIds: ['analytics'],
    },
    reports: {
        label: 'Reports',
        description: 'Reporting dashboards and exports.',
        plans: ['premium'],
        moduleSlugs: ['reports'],
        featureIds: ['reports'],
    },
    aiAssistant: {
        label: 'Ask Zodo AI',
        description: 'AI copilots and guided expert assistance.',
        plans: ['premium'],
        moduleSlugs: ['ai-assistant'],
        featureIds: ['aiAssistant'],
    },
} as const;

export type OnboardingModuleId = keyof typeof ONBOARDING_MODULE_GROUPS;
export const ONBOARDING_MODULE_IDS = Object.keys(ONBOARDING_MODULE_GROUPS) as OnboardingModuleId[];

export const DEFAULT_PLAN_MODULE_SELECTION: Record<SignupPlan, OnboardingModuleId[]> = {
    basic: ['leads', 'clients', 'finance', 'letterbox', 'support'],
    standard: ['leads', 'clients', 'finance', 'support', 'projects', 'communication', 'team'],
    premium: ['leads', 'clients', 'finance', 'support', 'projects', 'communication', 'team', 'analytics', 'reports', 'aiAssistant'],
};

const ALWAYS_ENABLED_ACCESS = {
    moduleSlugs: ['calendar', 'tasks'],
    featureIds: ['calendar', 'tasks'],
} as const;

export const DEFAULT_LEAD_STAGES = [
    { key: 'new', label: 'New' },
    { key: 'contacted', label: 'Contacted' },
    { key: 'qualified', label: 'Qualified' },
    { key: 'won', label: 'Won' },
] as const;

export const DEFAULT_TASK_STATUS_CONFIG = [
    { key: 'pending', label: 'Pending' },
    { key: 'in_progress', label: 'In Progress' },
    { key: 'done', label: 'Done' },
] as const;

export const DEFAULT_PROJECT_COLUMNS = [
    { key: 'not_started', label: 'Not Started', slug: 'not-started', color: '#94A3B8', order: 1 },
    { key: 'in_progress', label: 'In Progress', slug: 'in-progress', color: '#0EA5E9', order: 2 },
    { key: 'completed', label: 'Completed', slug: 'completed', color: '#10B981', order: 3, isCompleted: true },
] as const;

export const DEFAULT_ANALYTICS_SELECTION: OnboardingAnalyticsMetric[] = ['revenue', 'leads', 'projects', 'performance'];
export const DEFAULT_PROJECT_TASK_SELECTION: OnboardingTaskStatus[] = ['pending', 'in_progress', 'done'];

export function isOnboardingModuleId(value: string): value is OnboardingModuleId {
    return value in ONBOARDING_MODULE_GROUPS;
}

export function getAllowedOnboardingModules(plan: SignupPlan): OnboardingModuleId[] {
    return DEFAULT_PLAN_MODULE_SELECTION[plan];
}

export function normalizeOnboardingModuleIds(plan: SignupPlan, values: string[]): OnboardingModuleId[] {
    const allowed = new Set(getAllowedOnboardingModules(plan));
    return Array.from(
        new Set(
            values
                .map((value) => String(value).trim())
                .filter((value): value is OnboardingModuleId => isOnboardingModuleId(value) && allowed.has(value))
        )
    );
}

export function resolveTenantOnboardingAccess(plan: SignupPlan, values: string[]) {
    const selectedModuleIds = normalizeOnboardingModuleIds(plan, values);
    const selectedGroups = selectedModuleIds.map((id) => ONBOARDING_MODULE_GROUPS[id]);
    const planDefinition = getPlanDefinition(plan);

    return {
        plan,
        selectedModuleIds,
        availableModules: [...planDefinition.enabledModules],
        availableFeatures: [...planDefinition.uiFeatures],
        enabledModules: Array.from(
            new Set([
                ...ALWAYS_ENABLED_ACCESS.moduleSlugs,
                ...selectedGroups.flatMap((group) => group.moduleSlugs),
            ])
        ),
        enabledFeatures: Array.from(
            new Set([
                ...ALWAYS_ENABLED_ACCESS.featureIds,
                ...selectedGroups.flatMap((group) => group.featureIds),
            ])
        ),
    };
}

export function resolveLegacyTenantAccess() {
    const fullAccess = getFullAccessDefinition();
    return {
        availableModules: [...fullAccess.enabledModules],
        availableFeatures: [...fullAccess.uiFeatures],
    };
}
