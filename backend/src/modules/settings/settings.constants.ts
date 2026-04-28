export type WorkspaceTheme = 'light' | 'dark';
export type WorkspaceDateFormat =
  | 'YYYY-MM-DD'
  | 'DD-MM-YYYY'
  | 'MM-DD-YYYY'
  | 'DD/MM/YYYY'
  | 'MM/DD/YYYY';
export type EmailEncryption = 'SSL/TLS' | 'STARTTLS' | 'NONE';
export type BillingPlanKey = 'STARTER' | 'PROFESSIONAL' | 'ENTERPRISE';
export type BillingCycle = 'MONTHLY' | 'YEARLY';
export type EmailTemplateKey = 'TEAM_INVITE' | 'WELCOME' | 'INVOICE_REMINDER';

export interface PlanLimits {
  users: number | null;
  contacts: number | null;
  storageBytes: number | null;
  apiCalls: number | null;
}

export interface BillingPlanDefinition {
  key: BillingPlanKey;
  name: string;
  description: string;
  monthlyPrice: number;
  yearlyPrice: number;
  limits: PlanLimits;
  features: string[];
}

export interface EmailTemplateDefinition {
  id: EmailTemplateKey;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export const DEFAULT_GENERAL_SETTINGS = {
  language: 'en',
  timezone: 'America/Toronto',
  currency: 'CAD',
  dateFormat: 'YYYY-MM-DD' as WorkspaceDateFormat,
  theme: 'light' as WorkspaceTheme,
};

export const DEFAULT_NOTIFICATION_SETTINGS = {
  emailNotifications: true,
  pushNotifications: true,
  desktopNotifications: true,
  weeklyDigest: true,
  productUpdates: false,
};

export const DEFAULT_SECURITY_SETTINGS = {
  enforce2FA: false,
  passwordMinLength: 8,
  sessionTimeoutMinutes: 30,
  ipWhitelist: [] as string[],
};

export const DEFAULT_EMAIL_TEMPLATES: Record<EmailTemplateKey, EmailTemplateDefinition> = {
  TEAM_INVITE: {
    id: 'TEAM_INVITE',
    name: 'Team Invitation',
    subject: 'You are invited to join {{workspaceName}}',
    bodyHtml:
      '<p>Hello {{firstName}},</p><p>You have been invited to join <strong>{{workspaceName}}</strong> as a {{roleName}}.</p><p>Temporary password: <strong>{{temporaryPassword}}</strong></p><p>Please sign in and update your password right away.</p>',
    bodyText:
      'Hello {{firstName}},\n\nYou have been invited to join {{workspaceName}} as a {{roleName}}.\nTemporary password: {{temporaryPassword}}\nPlease sign in and update your password right away.',
  },
  WELCOME: {
    id: 'WELCOME',
    name: 'Welcome',
    subject: 'Welcome to {{workspaceName}}',
    bodyHtml:
      '<p>Welcome {{firstName}},</p><p>We are glad to have you in <strong>{{workspaceName}}</strong>.</p><p>{{signature}}</p>',
    bodyText:
      'Welcome {{firstName}},\n\nWe are glad to have you in {{workspaceName}}.\n\n{{signature}}',
  },
  INVOICE_REMINDER: {
    id: 'INVOICE_REMINDER',
    name: 'Invoice Reminder',
    subject: 'Reminder: invoice {{invoiceNumber}} is due soon',
    bodyHtml:
      '<p>Hello {{clientName}},</p><p>This is a reminder that invoice <strong>{{invoiceNumber}}</strong> for {{amountDue}} is due on {{dueDate}}.</p><p>{{signature}}</p>',
    bodyText:
      'Hello {{clientName}},\n\nThis is a reminder that invoice {{invoiceNumber}} for {{amountDue}} is due on {{dueDate}}.\n\n{{signature}}',
  },
};

export const BILLING_PLANS: Record<BillingPlanKey, BillingPlanDefinition> = {
  STARTER: {
    key: 'STARTER',
    name: 'Starter',
    description: 'For small teams getting started with the CRM.',
    monthlyPrice: 149,
    yearlyPrice: 1609,
    limits: {
      users: 10,
      contacts: 1000,
      storageBytes: 5 * 1024 * 1024 * 1024,
      apiCalls: 10000,
    },
    features: ['Lead pipeline', 'Email inbox', 'Basic analytics', 'Team collaboration'],
  },
  PROFESSIONAL: {
    key: 'PROFESSIONAL',
    name: 'Professional',
    description: 'For growing sales and operations teams.',
    monthlyPrice: 249,
    yearlyPrice: 2689,
    limits: {
      users: 50,
      contacts: 25000,
      storageBytes: 50 * 1024 * 1024 * 1024,
      apiCalls: 100000,
    },
    features: ['Advanced automation', 'Email sync', 'Custom dashboards', 'Priority support'],
  },
  ENTERPRISE: {
    key: 'ENTERPRISE',
    name: 'Enterprise',
    description: 'For complex multi-team deployments with unlimited scale.',
    monthlyPrice: 399,
    yearlyPrice: 4309,
    limits: {
      users: null,
      contacts: null,
      storageBytes: null,
      apiCalls: null,
    },
    features: ['Unlimited users', 'Unlimited contacts', 'Advanced security', 'Dedicated support'],
  },
};

export function normalizePlanKey(planType?: string | null): BillingPlanKey {
  const normalized = String(planType || '')
    .trim()
    .toUpperCase();

  if (normalized === 'ENTERPRISE') return 'ENTERPRISE';
  if (normalized === 'PROFESSIONAL' || normalized === 'PRO') return 'PROFESSIONAL';

  return 'STARTER';
}

export function normalizeBillingCycle(billingCycle?: string | null): BillingCycle {
  return String(billingCycle || '').trim().toUpperCase() === 'YEARLY' ? 'YEARLY' : 'MONTHLY';
}
