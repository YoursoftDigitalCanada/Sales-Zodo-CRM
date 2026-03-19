export const SIGNUP_PLANS = ['basic', 'standard', 'premium'] as const;

export type SignupPlan = (typeof SIGNUP_PLANS)[number];

export const SIGNUP_COMPANY_TYPES = [
  'individual',
  'startup',
  'sme',
  'enterprise',
] as const;

export type SignupCompanyType = (typeof SIGNUP_COMPANY_TYPES)[number];

export interface SignupPlanDefinition {
  key: SignupPlan;
  label: string;
  highlighted?: boolean;
  enabledModules: string[];
  uiFeatures: string[];
  crmFeatures: string[];
}

export const PLAN_FEATURES: Record<SignupPlan, SignupPlanDefinition> = {
  basic: {
    key: 'basic',
    label: 'Basic',
    enabledModules: [
      'leads',
      'clients',
      'tasks',
      'calendar',
      'finance',
      'letterbox',
      'support',
    ],
    uiFeatures: [
      'calendar',
      'tasks',
      'leads',
      'clients',
      'finance',
      'letterbox',
      'support',
    ],
    crmFeatures: [
      'Dashboard',
      'Calendar',
      'Tasks',
      'Leads',
      'Clients',
      'Invoices',
      'Quotes',
      'Payments',
      'Letter Box',
      'Support System',
    ],
  },
  standard: {
    key: 'standard',
    label: 'Standard',
    highlighted: true,
    enabledModules: [
      'leads',
      'clients',
      'tasks',
      'calendar',
      'finance',
      'letterbox',
      'support',
      'chat',
      'projects',
      'kanban',
      'time-tracking',
      'files',
      'team',
    ],
    uiFeatures: [
      'calendar',
      'tasks',
      'leads',
      'clients',
      'finance',
      'letterbox',
      'support',
      'chat',
      'projects',
      'kanban',
      'timeTracking',
      'files',
      'team',
    ],
    crmFeatures: [
      'All Basic Features',
      'Chats',
      'All Projects',
      'Kanban Board',
      'Time Tracking',
      'File Manager',
      'Employees',
      'Users',
      'Roles & Permissions',
    ],
  },
  premium: {
    key: 'premium',
    label: 'Premium',
    enabledModules: [
      'leads',
      'clients',
      'tasks',
      'calendar',
      'finance',
      'letterbox',
      'support',
      'chat',
      'projects',
      'kanban',
      'time-tracking',
      'files',
      'team',
      'roof-estimator',
      'analytics',
      'reports',
      'ai-assistant',
    ],
    uiFeatures: [
      'calendar',
      'tasks',
      'leads',
      'clients',
      'finance',
      'letterbox',
      'support',
      'chat',
      'projects',
      'kanban',
      'timeTracking',
      'files',
      'team',
      'roofEstimator',
      'analytics',
      'reports',
      'aiAssistant',
    ],
    crmFeatures: [
      'All Standard Features',
      'AI Roof Estimator',
      'Advanced Analytics',
      'Reports',
      'Ask Experts (AI)',
    ],
  },
};

export function isSignupPlan(value: string | null | undefined): value is SignupPlan {
  return !!value && SIGNUP_PLANS.includes(value as SignupPlan);
}

export function normalizeSignupPlan(value: string | null | undefined): SignupPlan {
  const normalized = String(value || '')
    .trim()
    .toLowerCase();

  if (isSignupPlan(normalized)) {
    return normalized;
  }

  return 'standard';
}

export function getPlanDefinition(plan: string | null | undefined): SignupPlanDefinition {
  return PLAN_FEATURES[normalizeSignupPlan(plan)];
}

export function getFullAccessDefinition(): SignupPlanDefinition {
  return {
    key: 'premium',
    label: 'Premium',
    enabledModules: Array.from(
      new Set(
        Object.values(PLAN_FEATURES)
          .flatMap((plan) => plan.enabledModules)
          .filter(Boolean)
      )
    ),
    uiFeatures: Array.from(
      new Set(
        Object.values(PLAN_FEATURES)
          .flatMap((plan) => plan.uiFeatures)
          .filter(Boolean)
      )
    ),
    crmFeatures: Array.from(
      new Set(
        Object.values(PLAN_FEATURES)
          .flatMap((plan) => plan.crmFeatures)
          .filter(Boolean)
      )
    ),
  };
}
