import type { FeatureId, PlanKey } from "@/lib/enabled-features";

export const ONBOARDING_MODULES = {
  leads: {
    label: "Leads",
    description: "Capture, qualify, and manage prospects.",
    plans: ["basic", "standard", "premium"],
    featureIds: ["leads"],
  },
  clients: {
    label: "Clients",
    description: "Track customer records and relationships.",
    plans: ["basic", "standard", "premium"],
    featureIds: ["clients"],
  },
  finance: {
    label: "Finance",
    description: "Invoices, payments, quotes, and billing operations.",
    plans: ["basic", "standard", "premium"],
    featureIds: ["finance"],
  },
  letterbox: {
    label: "Letter Box",
    description: "Shared inbox and customer communication history.",
    plans: ["basic"],
    featureIds: ["letterbox"],
  },
  support: {
    label: "Support",
    description: "Support tickets and resolution workflows.",
    plans: ["basic", "standard", "premium"],
    featureIds: ["support"],
  },
  projects: {
    label: "Projects",
    description: "All Projects, Kanban, Time Tracking, and File Manager.",
    plans: ["standard", "premium"],
    featureIds: ["projects", "kanban", "timeTracking", "files"],
  },
  communication: {
    label: "Communication",
    description: "Chat plus Letter Box collaboration.",
    plans: ["standard", "premium"],
    featureIds: ["chat", "letterbox"],
  },
  team: {
    label: "Team",
    description: "Employees, users, roles, and permissions.",
    plans: ["standard", "premium"],
    featureIds: ["team"],
  },
  roofEstimator: {
    label: "AI Roof Estimator",
    description: "Premium AI-assisted roof measurements and estimates.",
    plans: ["premium"],
    featureIds: ["roofEstimator"],
    highlight: true,
  },
  analytics: {
    label: "Advanced Analytics",
    description: "Track revenue, performance, and pipeline signals.",
    plans: ["premium"],
    featureIds: ["analytics"],
    highlight: true,
  },
  reports: {
    label: "Reports",
    description: "Build reporting dashboards and exports.",
    plans: ["premium"],
    featureIds: ["reports"],
    highlight: true,
  },
  aiAssistant: {
    label: "Ask Experts (AI)",
    description: "AI copilots and guided expert support.",
    plans: ["premium"],
    featureIds: ["aiAssistant"],
    highlight: true,
  },
} as const;

export type OnboardingModuleId = keyof typeof ONBOARDING_MODULES;

export const PLAN_MODULE_SELECTION: Record<PlanKey, OnboardingModuleId[]> = {
  basic: ["leads", "clients", "finance", "letterbox", "support"],
  standard: ["leads", "clients", "finance", "support", "projects", "communication", "team"],
  premium: ["leads", "clients", "finance", "support", "projects", "communication", "team", "roofEstimator", "analytics", "reports", "aiAssistant"],
};

export const CURRENCY_OPTIONS = [
  { value: "USD", label: "USD - US Dollar" },
  { value: "CAD", label: "CAD - Canadian Dollar" },
  { value: "GBP", label: "GBP - British Pound" },
  { value: "EUR", label: "EUR - Euro" },
  { value: "AUD", label: "AUD - Australian Dollar" },
  { value: "INR", label: "INR - Indian Rupee" },
  { value: "JPY", label: "JPY - Japanese Yen" },
  { value: "CNY", label: "CNY - Chinese Yuan" },
] as const;

export const DATE_FORMAT_OPTIONS = [
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
] as const;

export const TEAM_ROLE_OPTIONS = [
  { value: "admin", label: "Admin" },
  { value: "manager", label: "Manager" },
  { value: "employee", label: "Employee" },
] as const;

export const PROJECT_STATUS_OPTIONS = [
  { value: "not_started", label: "Not Started" },
  { value: "in_progress", label: "In Progress" },
  { value: "completed", label: "Completed" },
] as const;

export const TASK_STATUS_OPTIONS = [
  { value: "pending", label: "Pending" },
  { value: "in_progress", label: "In Progress" },
  { value: "done", label: "Done" },
] as const;

export const AI_BUSINESS_TYPE_OPTIONS = [
  { value: "roofing", label: "Roofing" },
  { value: "construction", label: "Construction" },
  { value: "general_contractor", label: "General Contractor" },
  { value: "other", label: "Other" },
] as const;

export const ANALYTICS_METRIC_OPTIONS = [
  { value: "revenue", label: "Revenue" },
  { value: "leads", label: "Leads" },
  { value: "projects", label: "Projects" },
  { value: "performance", label: "Performance" },
] as const;

export type TeamRoleValue = (typeof TEAM_ROLE_OPTIONS)[number]["value"];
export type ProjectStatusValue = (typeof PROJECT_STATUS_OPTIONS)[number]["value"];
export type TaskStatusValue = (typeof TASK_STATUS_OPTIONS)[number]["value"];
export type AiBusinessTypeValue = (typeof AI_BUSINESS_TYPE_OPTIONS)[number]["value"];
export type AnalyticsMetricValue = (typeof ANALYTICS_METRIC_OPTIONS)[number]["value"];

export interface TeamInviteInput {
  email: string;
  role: TeamRoleValue;
}

export interface OnboardingPayload {
  modules: OnboardingModuleId[];
  settings: {
    currency: (typeof CURRENCY_OPTIONS)[number]["value"];
    timezone: string;
    dateFormat: (typeof DATE_FORMAT_OPTIONS)[number]["value"];
  };
  teamInvites: TeamInviteInput[];
  projectSettings?: {
    defaultProjectStatus: ProjectStatusValue;
    taskStatuses: TaskStatusValue[];
  };
  aiSettings?: {
    businessType: AiBusinessTypeValue;
    materialType?: string;
    costingMethod?: string;
  };
  analyticsSettings?: {
    metrics: AnalyticsMetricValue[];
  };
}

export interface TenantAccessPayload {
  id: string;
  name: string;
  slug: string;
  plan: PlanKey;
  companyType?: string;
  country?: string;
  onboardingCompleted: boolean;
  availableModules: string[];
  availableFeatures: FeatureId[];
  enabledModules: string[];
  enabledFeatures: FeatureId[];
}

export interface TenantOnboardingApiResponse {
  tenant: TenantAccessPayload;
  onboarding: OnboardingPayload;
}

export function getAllowedOnboardingModules(plan: PlanKey): OnboardingModuleId[] {
  return PLAN_MODULE_SELECTION[plan];
}

export function getDefaultOnboardingPayload(plan: PlanKey): OnboardingPayload {
  return {
    modules: [...PLAN_MODULE_SELECTION[plan]],
    settings: {
      currency: "USD",
      timezone: "UTC",
      dateFormat: "MM/DD/YYYY",
    },
    teamInvites: [{ email: "", role: "manager" }],
    ...(plan !== "basic"
      ? {
          projectSettings: {
            defaultProjectStatus: "not_started",
            taskStatuses: ["pending", "in_progress", "done"],
          },
        }
      : {}),
    ...(plan === "premium"
      ? {
          aiSettings: {
            businessType: "roofing",
            materialType: "",
            costingMethod: "",
          },
          analyticsSettings: {
            metrics: ["revenue", "leads", "projects", "performance"],
          },
        }
      : {}),
  };
}

export function resolveEnabledFeaturePreview(modules: OnboardingModuleId[]): FeatureId[] {
  return Array.from(
    new Set([
      "calendar",
      "tasks",
      ...modules.flatMap((moduleId) => ONBOARDING_MODULES[moduleId].featureIds),
    ])
  ) as FeatureId[];
}
