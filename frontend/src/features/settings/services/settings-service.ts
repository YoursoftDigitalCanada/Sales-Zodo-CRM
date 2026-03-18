import api from "@/lib/axios";
import { API_ORIGIN } from "@/services/api/config";
import { extractApiArray } from "@/types/api";

export type WorkspaceTheme = "light" | "dark";
export type DateFormatValue = "YYYY-MM-DD" | "DD-MM-YYYY" | "MM-DD-YYYY" | "DD/MM/YYYY" | "MM/DD/YYYY";
export type EmailEncryption = "SSL/TLS" | "STARTTLS" | "NONE";
export type EmailTemplateId = "TEAM_INVITE" | "WELCOME" | "INVOICE_REMINDER";

export interface GeneralSettings {
  organizationName: string;
  language: string;
  timezone: string;
  currency: string;
  dateFormat: DateFormatValue;
  theme: WorkspaceTheme;
}

export interface CompanyProfile {
  companyName: string;
  domain: string;
  email: string;
  phone: string;
  taxId: string;
  address: string;
  logoUrl: string | null;
}

export interface NotificationSettings {
  emailNotifications: boolean;
  pushNotifications: boolean;
  desktopNotifications: boolean;
  weeklyDigest: boolean;
  productUpdates: boolean;
}

export interface SecuritySettings {
  enforce2FA: boolean;
  passwordMinLength: number;
  sessionTimeoutMinutes: number;
  ipWhitelist: string[];
}

export interface EmailTemplate {
  id: EmailTemplateId;
  name: string;
  subject: string;
  bodyHtml: string;
  bodyText: string;
}

export interface SmtpSettings {
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

export interface ImapSettings {
  host: string;
  port: number;
  username: string;
  passwordMasked: string;
  encryption: EmailEncryption;
  configured: boolean;
}

export interface EmailSettings {
  smtp: SmtpSettings;
  imap: ImapSettings;
  templates: EmailTemplate[];
}

export interface BillingMetric {
  used: number;
  limit: number | null;
  percent: number;
  remaining: number | null;
}

export interface StorageMetric {
  usedBytes: number;
  limitBytes: number | null;
  percent: number;
  remainingBytes: number | null;
}

export interface BillingSettings {
  key: string;
  name: string;
  description: string;
  billingCycle: string;
  status: string;
  monthlyRate: number;
  yearlyRate: number;
  currentRate: number;
  totalPaid: number;
  nextBillingDate: string | null;
  features: string[];
  usage: {
    users: BillingMetric;
    contacts: BillingMetric;
    storage: StorageMetric;
    apiCalls: BillingMetric;
  };
}

export interface BillingInvoice {
  id: string;
  label: string;
  amount: number;
  status: "PAID" | "UPCOMING";
  billedAt: string | null;
  dueAt: string | null;
}

export interface SessionInfo {
  id: string;
  device: string;
  browser: string;
  ip: string;
  location: string;
  lastActive: string;
  createdAt: string;
  current: boolean;
}

export interface AuditLogItem {
  id: string;
  action: string;
  module: string;
  description: string;
  entityType?: string;
  entityId?: string;
  ipAddress?: string;
  createdAt: string;
  user?: {
    id: string;
    email: string;
    firstName: string;
    lastName: string;
  };
}

export interface UserTeamMember {
  id: string;
  email: string;
  firstName: string;
  lastName: string;
  fullName: string;
  phone: string | null;
  avatar: string | null;
  status: string;
  emailVerified: boolean;
  lastLoginAt: string | null;
  employeeId: string | null;
  role: { id: string; name: string } | null;
  membershipStatus: "active" | "invited" | "suspended";
  createdAt: string;
  updatedAt: string;
}

export interface RoleOption {
  id: string;
  name: string;
  description: string | null;
  isSystemRole: boolean;
  isDefault: boolean;
}

export interface InviteUserPayload {
  email: string;
  firstName?: string;
  lastName?: string;
  phone?: string | null;
  roleId: string;
}

export interface InviteUserResponse {
  user: UserTeamMember;
  temporaryPassword?: string;
  inviteEmailSent: boolean;
}

export interface WorkspaceSettingsResponse {
  general: GeneralSettings;
  company: CompanyProfile;
  email: EmailSettings;
  notifications: NotificationSettings;
  security: SecuritySettings;
  updatedAt: string;
}

function extractData<T>(responseData: unknown): T {
  const raw = responseData as { data?: T };
  return (raw?.data ?? responseData) as T;
}

function normalizeLogoUrl(company: CompanyProfile): CompanyProfile {
  if (!company.logoUrl || /^https?:\/\//i.test(company.logoUrl)) {
    return company;
  }

  return {
    ...company,
    logoUrl: `${API_ORIGIN}${company.logoUrl}`,
  };
}

export async function getWorkspaceSettings(): Promise<WorkspaceSettingsResponse> {
  const response = await api.get("/settings");
  return extractData<WorkspaceSettingsResponse>(response.data);
}

export async function getGeneralSettings(): Promise<GeneralSettings> {
  const response = await api.get("/settings/general");
  return extractData<GeneralSettings>(response.data);
}

export async function updateGeneralSettings(payload: Partial<GeneralSettings>): Promise<GeneralSettings> {
  const response = await api.put("/settings/general", payload);
  return extractData<GeneralSettings>(response.data);
}

export async function getCompanyProfile(): Promise<CompanyProfile> {
  const response = await api.get("/settings/company");
  return normalizeLogoUrl(extractData<CompanyProfile>(response.data));
}

export async function updateCompanyProfile(payload: Partial<Omit<CompanyProfile, "logoUrl">>): Promise<CompanyProfile> {
  const response = await api.put("/settings/company", payload);
  return normalizeLogoUrl(extractData<CompanyProfile>(response.data));
}

export async function uploadCompanyLogo(file: File): Promise<CompanyProfile> {
  const formData = new FormData();
  formData.append("logo", file);
  const response = await api.post("/settings/company/logo", formData, {
    headers: { "Content-Type": "multipart/form-data" },
  });
  return normalizeLogoUrl(extractData<CompanyProfile>(response.data));
}

export async function getBillingSettings(): Promise<BillingSettings> {
  const response = await api.get("/settings/billing");
  return extractData<BillingSettings>(response.data);
}

export async function getBillingInvoices(): Promise<BillingInvoice[]> {
  const response = await api.get("/settings/invoices");
  return extractApiArray<BillingInvoice>(response.data);
}

export async function getEmailSettings(): Promise<EmailSettings> {
  const response = await api.get("/settings/email");
  return extractData<EmailSettings>(response.data);
}

export async function updateSmtpSettings(payload: {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: EmailEncryption;
  senderName?: string;
  senderEmail?: string;
  signature?: string;
}): Promise<EmailSettings> {
  const response = await api.post("/settings/email/smtp", payload);
  return extractData<EmailSettings>(response.data);
}

export async function updateImapSettings(payload: {
  host?: string;
  port?: number;
  username?: string;
  password?: string;
  encryption?: EmailEncryption;
}): Promise<EmailSettings> {
  const response = await api.post("/settings/email/imap", payload);
  return extractData<EmailSettings>(response.data);
}

export async function updateEmailTemplates(templates: Array<Partial<EmailTemplate> & { id: EmailTemplateId }>): Promise<EmailSettings> {
  const response = await api.put("/settings/email/templates", { templates });
  return extractData<EmailSettings>(response.data);
}

export async function sendTestEmail(toEmail: string): Promise<{ delivered: boolean; recipient: string }> {
  const response = await api.post("/settings/email/test", { toEmail });
  return extractData<{ delivered: boolean; recipient: string }>(response.data);
}

export async function getSecuritySettings(): Promise<SecuritySettings> {
  const response = await api.get("/settings/security");
  return extractData<SecuritySettings>(response.data);
}

export async function updateSecuritySettings(payload: Partial<SecuritySettings>): Promise<SecuritySettings> {
  const response = await api.put("/settings/security", payload);
  return extractData<SecuritySettings>(response.data);
}

export async function getNotificationSettings(): Promise<NotificationSettings> {
  const response = await api.get("/settings/notifications");
  return extractData<NotificationSettings>(response.data);
}

export async function updateNotificationSettings(payload: Partial<NotificationSettings>): Promise<NotificationSettings> {
  const response = await api.put("/settings/notifications", payload);
  return extractData<NotificationSettings>(response.data);
}

export async function getSessions(): Promise<SessionInfo[]> {
  const response = await api.get("/sessions");
  return extractApiArray<SessionInfo>(response.data);
}

export async function revokeSession(id: string): Promise<void> {
  await api.delete(`/sessions/${id}`);
}

export async function getAuditLogs(params?: Record<string, unknown>): Promise<AuditLogItem[]> {
  const response = await api.get("/audit-logs", { params });
  return extractApiArray<AuditLogItem>(response.data);
}

export async function exportAuditLogs(params?: Record<string, unknown>): Promise<Blob> {
  const response = await api.get("/audit-logs/export", {
    params,
    responseType: "blob",
  });
  return response.data as Blob;
}

export async function getTeamMembers(params?: Record<string, unknown>): Promise<UserTeamMember[]> {
  const response = await api.get("/users", { params: { limit: 100, ...params } });
  return extractApiArray<UserTeamMember>(response.data);
}

export async function inviteUser(payload: InviteUserPayload): Promise<InviteUserResponse> {
  const response = await api.post("/users/invite", payload);
  return extractData<InviteUserResponse>(response.data);
}

export async function updateUserRole(userId: string, roleId: string): Promise<UserTeamMember> {
  const response = await api.put(`/users/${userId}/role`, { roleId });
  return extractData<UserTeamMember>(response.data);
}

export async function removeUser(userId: string): Promise<void> {
  await api.delete(`/users/${userId}`);
}

export async function getRoles(): Promise<RoleOption[]> {
  const response = await api.get("/roles", { params: { limit: 100 } });
  return extractApiArray<RoleOption>(response.data);
}
