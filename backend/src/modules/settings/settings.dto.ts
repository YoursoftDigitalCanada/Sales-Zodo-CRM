import { Currency, Subscription, Tenant, TenantSettings } from '@prisma/client';
import { decryptSecret } from '../../common/utils/secret-crypto';
import {
  BILLING_PLANS,
  DEFAULT_EMAIL_TEMPLATES,
  DEFAULT_GENERAL_SETTINGS,
  DEFAULT_NOTIFICATION_SETTINGS,
  DEFAULT_SECURITY_SETTINGS,
  normalizeBillingCycle,
  normalizePlanKey,
  type BillingCycle,
  type BillingPlanKey,
  type EmailEncryption,
  type EmailTemplateKey,
  type WorkspaceDateFormat,
  type WorkspaceTheme,
} from './settings.constants';

export interface GeneralSettingsDto {
  organizationName: string;
  language: string;
  timezone: string;
  currency: Currency;
  dateFormat: WorkspaceDateFormat;
  theme: WorkspaceTheme;
}

export interface CompanyProfileDto {
  companyName: string;
  domain: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  city: string;
  province: string;
  postalCode: string;
  country: string;
  invoiceDefaultFooter: string;
  logoUrl: string | null;
}

export interface NotificationSettingsDto {
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
}

export interface SecuritySettingsDto {
  enforce2FA: boolean;
  passwordMinLength: number;
  sessionTimeoutMinutes: number;
  ipWhitelist: string[];
}

export interface EmailTemplateDto {
  id: EmailTemplateKey;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface SmtpSettingsDto {
  host: string;
  port: number;
  username: string;
  passwordMasked: string;
  encryption: EmailEncryption;
  senderName: string;
  senderEmail: string;
  signature: string;
  configured: boolean;
}

export interface ImapSettingsDto {
  host: string;
  port: number;
  username: string;
  passwordMasked: string;
  encryption: EmailEncryption;
  configured: boolean;
}

export interface EmailSettingsResponseDto {
  smtp: SmtpSettingsDto;
  imap: ImapSettingsDto;
  mailboxAddress: string | null;
  templates: EmailTemplateDto[];
}

export interface BillingUsageMetricDto {
  used: number;
  limit: number | null;
  percent: number;
  remaining: number | null;
}

export interface BillingStorageMetricDto {
  usedBytes: number;
  limitBytes: number | null;
  percent: number;
  remainingBytes: number | null;
}

export interface BillingPlanOptionDto {
  key: BillingPlanKey;
  name: string;
  description: string;
  monthlyRate: number;
  yearlyRate: number;
  features: string[];
  limits: {
    users: number | null;
    contacts: number | null;
    storageBytes: number | null;
    apiCalls: number | null;
  };
}

export interface BillingPlanResponseDto {
  key: BillingPlanKey;
  name: string;
  description: string;
  billingCycle: BillingCycle;
  status: string;
  monthlyRate: number;
  yearlyRate: number;
  currentRate: number;
  totalPaid: number;
  nextBillingDate: Date | null;
  subscribedSince: Date | null;
  cancelledAt: Date | null;
  features: string[];
  availablePlans: BillingPlanOptionDto[];
  usage: {
    users: BillingUsageMetricDto;
    contacts: BillingUsageMetricDto;
    storage: BillingStorageMetricDto;
    apiCalls: BillingUsageMetricDto;
  };
}

export interface BillingInvoiceDto {
  id: string;
  label: string;
  amount: number;
  status: 'PAID' | 'UPCOMING';
  billedAt: Date | null;
  dueAt: Date | null;
}

export interface WorkspaceSettingsResponseDto {
  general: GeneralSettingsDto;
  company: CompanyProfileDto;
  email: EmailSettingsResponseDto;
  notifications: NotificationSettingsDto;
  security: SecuritySettingsDto;
  updatedAt: Date;
}

export interface UpdateGeneralSettingsDto extends Partial<GeneralSettingsDto> {}

export interface UpdateCompanyProfileDto extends Omit<Partial<CompanyProfileDto>, 'logoUrl'> {}

export interface UpdateNotificationSettingsDto extends Partial<NotificationSettingsDto> {}

export interface UpdateSecuritySettingsDto extends Partial<SecuritySettingsDto> {}

export interface UpdateBillingPlanDto {
  planType: BillingPlanKey;
  billingCycle: BillingCycle;
}

export interface UpdateSmtpSettingsDto {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: EmailEncryption;
  senderName?: string;
  senderEmail?: string;
  signature?: string;
}

export interface UpdateImapSettingsDto {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: EmailEncryption;
}

export interface UpdateEmailTemplateDto {
  id: EmailTemplateKey;
  subject?: string;
  bodyHtml?: string;
  bodyText?: string;
}

export interface UpdateSettingsDto {
  general?: UpdateGeneralSettingsDto;
  company?: UpdateCompanyProfileDto;
  notifications?: UpdateNotificationSettingsDto;
  security?: UpdateSecuritySettingsDto;
  smtp?: UpdateSmtpSettingsDto;
  imap?: UpdateImapSettingsDto;
  templates?: UpdateEmailTemplateDto[];
}

export interface WorkspaceSettingsRecord extends TenantSettings {
  tenant?: Pick<Tenant, 'id' | 'name' | 'domain' | 'logo' | 'fileStorageQuota' | 'fileStorageUsed'> | null;
}

function asObject(value: unknown): Record<string, unknown> {
  return typeof value === 'object' && value !== null ? (value as Record<string, unknown>) : {};
}

function asStringArray(value: unknown): string[] {
  return Array.isArray(value)
    ? value.map((entry) => String(entry).trim()).filter(Boolean)
    : [];
}

function getNotificationSettings(settings: TenantSettings): NotificationSettingsDto {
  const raw = asObject(settings.notificationSettings);

  return {
    emailNotifications: Boolean(raw.emailNotifications ?? raw.email ?? DEFAULT_NOTIFICATION_SETTINGS.emailNotifications),
    pushNotifications: Boolean(raw.pushNotifications ?? raw.push ?? DEFAULT_NOTIFICATION_SETTINGS.pushNotifications),
    desktopNotifications: Boolean(raw.desktopNotifications ?? raw.desktop ?? DEFAULT_NOTIFICATION_SETTINGS.desktopNotifications),
    weeklyDigest: Boolean(raw.weeklyDigest ?? raw.weekly ?? DEFAULT_NOTIFICATION_SETTINGS.weeklyDigest),
    productUpdates: Boolean(raw.productUpdates ?? raw.marketing ?? DEFAULT_NOTIFICATION_SETTINGS.productUpdates),
  };
}

function getSecuritySettings(settings: TenantSettings): SecuritySettingsDto {
  const integrations = asObject(settings.integrations);
  const raw = asObject(integrations.securitySettings);

  return {
    enforce2FA: Boolean(raw.enforce2FA ?? raw.requireMfa ?? DEFAULT_SECURITY_SETTINGS.enforce2FA),
    passwordMinLength: Number(raw.passwordMinLength ?? DEFAULT_SECURITY_SETTINGS.passwordMinLength),
    sessionTimeoutMinutes: Number(raw.sessionTimeoutMinutes ?? DEFAULT_SECURITY_SETTINGS.sessionTimeoutMinutes),
    ipWhitelist: asStringArray(raw.ipWhitelist ?? DEFAULT_SECURITY_SETTINGS.ipWhitelist),
  };
}

function getEmailTemplates(settings: TenantSettings): EmailTemplateDto[] {
  const integrations = asObject(settings.integrations);
  const templates = asObject(integrations.emailTemplates);

  return (Object.keys(DEFAULT_EMAIL_TEMPLATES) as EmailTemplateKey[]).map((key) => {
    const stored = asObject(templates[key]);
    const fallback = DEFAULT_EMAIL_TEMPLATES[key];

    return {
      id: key,
      name: fallback.name,
      subject: String(stored.subject ?? fallback.subject),
      bodyHtml: String(stored.bodyHtml ?? fallback.bodyHtml),
      bodyText: String(stored.bodyText ?? fallback.bodyText),
    };
  });
}

export function toGeneralSettingsDto(record: WorkspaceSettingsRecord): GeneralSettingsDto {
  const integrations = asObject(record.integrations);
  const workspaceTheme =
    typeof integrations.workspaceTheme === 'string'
      ? String(integrations.workspaceTheme)
      : integrations.darkMode
        ? 'dark'
        : DEFAULT_GENERAL_SETTINGS.theme;

  return {
    organizationName: String(integrations.organizationName ?? record.tenant?.name ?? ''),
    language: record.language || DEFAULT_GENERAL_SETTINGS.language,
    timezone: record.timezone || DEFAULT_GENERAL_SETTINGS.timezone,
    currency: record.currency,
    dateFormat: (record.dateFormat || DEFAULT_GENERAL_SETTINGS.dateFormat) as WorkspaceDateFormat,
    theme: workspaceTheme as WorkspaceTheme,
  };
}

export function toCompanyProfileDto(record: WorkspaceSettingsRecord): CompanyProfileDto {
  const integrations = asObject(record.integrations);

  return {
    companyName: String(integrations.companyName ?? record.tenant?.name ?? ''),
    domain: String(integrations.companyDomain ?? record.tenant?.domain ?? ''),
    email: String(integrations.companyEmail ?? ''),
    phone: String(integrations.companyPhone ?? ''),
    taxId: String(integrations.taxId ?? ''),
    address: String(integrations.companyAddress ?? ''),
    city: String(integrations.companyCity ?? ''),
    province: String(integrations.companyProvince ?? ''),
    postalCode: String(integrations.companyPostalCode ?? ''),
    country: String(integrations.companyCountry ?? 'Canada'),
    invoiceDefaultFooter: String(integrations.invoiceDefaultFooter ?? ''),
    logoUrl: record.tenant?.logo || null,
  };
}

export function toEmailSettingsDto(record: WorkspaceSettingsRecord): EmailSettingsResponseDto {
  const integrations = asObject(record.integrations);
  const smtpHost = String(integrations.smtpHost ?? '');
  const smtpUser = decryptSecret(String(integrations.smtpUser ?? ''));
  const smtpPass = String(integrations.smtpPass ?? '');
  const imapHost = String(integrations.imapHost ?? '');
  const imapUser = decryptSecret(String(integrations.imapUser ?? ''));
  const imapPass = String(integrations.imapPass ?? '');

  return {
    smtp: {
      host: smtpHost,
      port: Number(integrations.smtpPort ?? 587),
      username: smtpUser,
      passwordMasked: smtpPass ? '••••••••' : '',
      encryption: String(integrations.smtpEncryption ?? 'STARTTLS') as EmailEncryption,
      senderName: String(integrations.senderName ?? ''),
      senderEmail: String(integrations.senderEmail ?? ''),
      signature: record.emailSignature || '',
      configured: Boolean(smtpHost && smtpUser && smtpPass),
    },
    imap: {
      host: imapHost,
      port: Number(integrations.imapPort ?? 993),
      username: imapUser,
      passwordMasked: imapPass ? '••••••••' : '',
      encryption: String(integrations.imapEncryption ?? 'SSL/TLS') as EmailEncryption,
      configured: Boolean(imapHost && imapUser && imapPass),
    },
    mailboxAddress: String(integrations.senderEmail ?? '').trim() || smtpUser || imapUser || null,
    templates: getEmailTemplates(record),
  };
}

export function toWorkspaceSettingsResponseDto(record: WorkspaceSettingsRecord): WorkspaceSettingsResponseDto {
  return {
    general: toGeneralSettingsDto(record),
    company: toCompanyProfileDto(record),
    email: toEmailSettingsDto(record),
    notifications: getNotificationSettings(record),
    security: getSecuritySettings(record),
    updatedAt: record.updatedAt,
  };
}

function toUsageMetric(used: number, limit: number | null): BillingUsageMetricDto {
  if (limit === null) {
    return {
      used,
      limit: null,
      percent: 0,
      remaining: null,
    };
  }

  const percent = limit > 0 ? Math.min(100, Math.round((used / limit) * 100)) : 0;

  return {
    used,
    limit,
    percent,
    remaining: Math.max(limit - used, 0),
  };
}

function toStorageMetric(usedBytes: number, limitBytes: number | null): BillingStorageMetricDto {
  if (limitBytes === null) {
    return {
      usedBytes,
      limitBytes: null,
      percent: 0,
      remainingBytes: null,
    };
  }

  const percent = limitBytes > 0 ? Math.min(100, Math.round((usedBytes / limitBytes) * 100)) : 0;

  return {
    usedBytes,
    limitBytes,
    percent,
    remainingBytes: Math.max(limitBytes - usedBytes, 0),
  };
}

function toBillingPlanOptionDto(planKey: BillingPlanKey): BillingPlanOptionDto {
  const plan = BILLING_PLANS[planKey];

  return {
    key: plan.key,
    name: plan.name,
    description: plan.description,
    monthlyRate: plan.monthlyPrice,
    yearlyRate: plan.yearlyPrice,
    features: plan.features,
    limits: {
      users: plan.limits.users,
      contacts: plan.limits.contacts,
      storageBytes: plan.limits.storageBytes,
      apiCalls: plan.limits.apiCalls,
    },
  };
}

export function toBillingResponseDto(args: {
  subscription: Subscription | null;
  usersCount: number;
  contactsCount: number;
  apiCallsCount: number;
  tenant: Pick<Tenant, 'fileStorageQuota' | 'fileStorageUsed'>;
}): BillingPlanResponseDto {
  const planKey = normalizePlanKey(args.subscription?.planType);
  const plan = BILLING_PLANS[planKey];
  const billingCycle = normalizeBillingCycle(args.subscription?.billingCycle);
  const currentRate = billingCycle === 'YEARLY' ? plan.yearlyPrice : plan.monthlyPrice;

  return {
    key: plan.key,
    name: plan.name,
    description: plan.description,
    billingCycle,
    status: String(args.subscription?.status || 'ACTIVE'),
    monthlyRate: plan.monthlyPrice,
    yearlyRate: plan.yearlyPrice,
    currentRate,
    totalPaid: Number(args.subscription?.totalPaid || 0),
    nextBillingDate: args.subscription?.nextBillingDate || null,
    subscribedSince: args.subscription?.startDate || null,
    cancelledAt: args.subscription?.cancelledAt || null,
    features: plan.features,
    availablePlans: (Object.keys(BILLING_PLANS) as BillingPlanKey[]).map((entry) => toBillingPlanOptionDto(entry)),
    usage: {
      users: toUsageMetric(args.usersCount, plan.limits.users),
      contacts: toUsageMetric(args.contactsCount, plan.limits.contacts),
      storage: toStorageMetric(Number(args.tenant.fileStorageUsed), plan.limits.storageBytes),
      apiCalls: toUsageMetric(args.apiCallsCount, plan.limits.apiCalls),
    },
  };
}
