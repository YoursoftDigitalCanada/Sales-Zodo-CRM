import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useTheme } from "next-themes";
import { useLocation, useNavigate } from "react-router-dom";
import {
  AlertTriangle,
  Bell,
  Building2,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  Clock3,
  CreditCard,
  Download,
  Globe2,
  Loader2,
  Mail,
  RefreshCw,
  Save,
  Settings,
  Shield,
  Upload,
  UserPlus,
  Users,
} from "lucide-react";
import { cn } from "@/lib/utils";
import AddressAutocompleteInput from "@/components/address/AddressAutocompleteInput";
import { useToast } from "@/hooks/use-toast";
import {
  cancelBillingSubscription,
  exportAuditLogs,
  getAuditLogs,
  getBillingInvoices,
  getBillingSettings,
  getCompanyProfile,
  getEmailSettings,
  getGeneralSettings,
  getNotificationSettings,
  getRoles,
  getSecuritySettings,
  getSessions,
  getTeamMembers,
  inviteUser,
  reactivateBillingSubscription,
  removeUser,
  revokeSession,
  sendTestEmail,
  updateCompanyProfile,
  updateBillingSettings,
  updateEmailTemplates,
  updateGeneralSettings,
  updateImapSettings,
  updateNotificationSettings,
  updateSecuritySettings,
  updateSmtpSettings,
  updateUserRole,
  uploadCompanyLogo,
  type AuditLogItem,
  type BillingCycle,
  type BillingInvoice,
  type BillingPlanKey,
  type BillingPlanOption,
  type BillingSettings,
  type CompanyProfile,
  type DateFormatValue,
  type EmailSettings,
  type EmailTemplateId,
  type GeneralSettings,
  type NotificationSettings,
  type RoleOption,
  type SecuritySettings,
  type SessionInfo,
  type UserTeamMember,
  type WorkspaceTheme,
} from "@/features/settings/services/settings-service";
import { useWorkspaceBranding } from "@/features/settings/context/workspace-branding";
import { getUserLocalizationSnapshot } from "@/lib/user-localization";
import { syncLegacyThemeStorage } from "@/lib/workspace-theme";
import useIsMobile from "@/hooks/useIsMobile";

type SettingsTab = "general" | "company" | "billing" | "email" | "security" | "notifications" | "team";

interface SettingsTabItem {
  id: SettingsTab;
  label: string;
  description: string;
  icon: typeof Settings;
}

const settingsTabs: SettingsTabItem[] = [
  { id: "general", label: "General", description: "Workspace preferences", icon: Settings },
  { id: "company", label: "Company Profile", description: "Branding and contact info", icon: Building2 },
  { id: "billing", label: "Billing & Plans", description: "Plan limits and usage", icon: CreditCard },
  { id: "email", label: "Email Settings", description: "Personal mailbox, sync, and templates", icon: Mail },
  { id: "security", label: "Security", description: "Sessions, policies, and audit", icon: Shield },
  { id: "notifications", label: "Notifications", description: "Workspace alerts", icon: Bell },
  { id: "team", label: "Team Management", description: "Invite and manage workspace members", icon: Users },
];

const routeMap: Record<string, SettingsTab> = {
  "/settings": "general",
  "/settings/general": "general",
  "/settings/company": "company",
  "/settings/billing": "billing",
  "/settings/email": "email",
  "/settings/security": "security",
  "/settings/notifications": "notifications",
  "/settings/team": "team",
};

const reverseRouteMap: Record<SettingsTab, string> = {
  general: "/settings/general",
  company: "/settings/company",
  billing: "/settings/billing",
  email: "/settings/email",
  security: "/settings/security",
  notifications: "/settings/notifications",
  team: "/settings/team",
};

const timezones = [
  "America/Toronto",
  "America/New_York",
  "America/Chicago",
  "America/Los_Angeles",
  "Europe/London",
  "Europe/Berlin",
  "Asia/Kolkata",
  "Asia/Tokyo",
  "UTC",
];

const languages = [
  { label: "English", value: "en" },
  { label: "French", value: "fr" },
  { label: "Spanish", value: "es" },
  { label: "German", value: "de" },
  { label: "Hindi", value: "hi" },
];

const currencies = ["CAD", "USD", "EUR", "GBP", "INR"];
const dateFormats: DateFormatValue[] = ["YYYY-MM-DD", "DD-MM-YYYY", "MM-DD-YYYY", "DD/MM/YYYY", "MM/DD/YYYY"];
const emailEncryptions = ["SSL/TLS", "STARTTLS", "NONE"] as const;
const MAX_COMPANY_LOGO_SIZE_BYTES = 2 * 1024 * 1024;

const fieldClass =
  "w-full rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-4 py-3 text-sm text-[#0F172A] outline-none transition focus:border-[#0891B2] focus:ring-4 focus:ring-[#22D3EE]/30";

const cardClass = "rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-6 shadow-sm hover:shadow-lg transition-shadow";

function getErrorMessage(error: unknown): string {
  const maybeError = error as { response?: { data?: { message?: string } }; message?: string };
  return maybeError.response?.data?.message || maybeError.message || "Something went wrong.";
}

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  const units = ["KB", "MB", "GB", "TB"];
  let value = bytes / 1024;
  let index = 0;
  while (value >= 1024 && index < units.length - 1) {
    value /= 1024;
    index += 1;
  }
  return `${value.toFixed(value >= 10 ? 0 : 1)} ${units[index]}`;
}

function formatMoney(value: number): string {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(value);
}

function formatDateTime(value?: string | null): string {
  if (!value) return "Never";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString();
}

function formatPlanLimit(value: number | null, formatter?: (amount: number) => string): string {
  if (value === null) return "Unlimited";
  return formatter ? formatter(value) : String(value);
}

function formatBillingStatus(status: string): string {
  const normalized = status.trim().toUpperCase();
  if (normalized === "ACTIVE") return "Active";
  if (normalized === "TRIAL") return "Trial";
  if (normalized === "CANCELLED") return "Cancelled";
  return normalized.replace(/_/g, " ");
}

function Field({ label, hint, children }: { label: string; hint?: string; children: React.ReactNode }) {
  return (
    <label className="space-y-1.5">
      <div className="flex items-center justify-between gap-3">
        <span className="text-sm font-medium text-[#0F172A]">{label}</span>
      </div>
      {children}
      {hint ? <p className="text-xs text-[#64748B]">{hint}</p> : null}
    </label>
  );
}

function SectionHeader({ title, description, badge }: { title: string; description: string; badge?: React.ReactNode }) {
  return (
    <div className="flex items-start justify-between gap-4">
      <div>
        <h2 className="text-lg font-semibold text-[#0F172A]">{title}</h2>
        <p className="mt-1 text-sm text-[#64748B]">{description}</p>
      </div>
      {badge}
    </div>
  );
}

function SaveButton({
  onClick,
  loading,
  label = "Save changes",
}: {
  onClick: () => void;
  loading: boolean;
  label?: string;
}) {
  return (
    <button
      onClick={onClick}
      disabled={loading}
      className="inline-flex w-full items-center justify-center gap-2 rounded-md bg-[#0891B2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0E7490] disabled:cursor-not-allowed disabled:opacity-70 sm:w-auto"
    >
      {loading ? <Loader2 size={15} className="animate-spin" /> : <Save size={15} />}
      {loading ? "Saving..." : label}
    </button>
  );
}

function Toggle({
  checked,
  onChange,
}: {
  checked: boolean;
  onChange: (next: boolean) => void;
}) {
  return (
    <button
      type="button"
      onClick={() => onChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full transition",
        checked ? "bg-[#0891B2]" : "bg-[#CBD5E1]"
      )}
    >
      <span
        className={cn(
          "inline-block h-5 w-5 transform rounded-full bg-white shadow transition",
          checked ? "translate-x-6" : "translate-x-1"
        )}
      />
    </button>
  );
}

function AccessDeniedCard({ label }: { label: string }) {
  return (
    <div className={cardClass}>
      <div className="flex items-start gap-3 rounded-md border border-[#FECACA] bg-[#FEF2F2] p-4 text-[#991B1B]">
        <AlertTriangle size={18} className="mt-0.5 flex-shrink-0" />
        <div>
          <p className="font-medium">Access restricted</p>
          <p className="mt-1 text-sm">You do not have permission to view {label} for this workspace.</p>
        </div>
      </div>
    </div>
  );
}

function UsageBar({
  label,
  used,
  limit,
  percent,
  formatter = (value: number) => String(value),
}: {
  label: string;
  used: number;
  limit: number | null;
  percent: number;
  formatter?: (value: number) => string;
}) {
  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between gap-4 text-sm">
        <span className="font-medium text-[#0F172A]">{label}</span>
        <span className="text-[#475569]">
          {formatter(used)} / {limit === null ? "Unlimited" : formatter(limit)}
        </span>
      </div>
      <div className="h-2 overflow-hidden rounded-full bg-[#E2E8F0]">
        <div className="h-full rounded-full bg-gradient-to-r from-[#0891B2] to-[#0E7490]" style={{ width: `${Math.min(percent, 100)}%` }} />
      </div>
    </div>
  );
}

interface BillingDraftState {
  planType: BillingPlanKey;
  billingCycle: BillingCycle;
}

export default function SettingsPage() {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const navigate = useNavigate();
  const { toast } = useToast();
  const { setTheme } = useTheme();
  const { updateBranding } = useWorkspaceBranding();
  const userLocalization = useMemo(() => getUserLocalizationSnapshot(), []);
  const [activeTab, setActiveTab] = useState<SettingsTab>(routeMap[location.pathname] || "general");
  const [isLoading, setIsLoading] = useState(true);
  const [savingSection, setSavingSection] = useState<string | null>(null);

  const [general, setGeneral] = useState<GeneralSettings | null>(null);
  const [company, setCompany] = useState<CompanyProfile | null>(null);
  const [billing, setBilling] = useState<BillingSettings | null>(null);
  const [billingDraft, setBillingDraft] = useState<BillingDraftState | null>(null);
  const [billingInvoices, setBillingInvoices] = useState<BillingInvoice[]>([]);
  const [emailSettings, setEmailSettings] = useState<EmailSettings | null>(null);
  const [security, setSecurity] = useState<SecuritySettings | null>(null);
  const [notifications, setNotifications] = useState<NotificationSettings | null>(null);
  const [sessions, setSessions] = useState<SessionInfo[]>([]);
  const [auditLogs, setAuditLogs] = useState<AuditLogItem[]>([]);
  const [teamMembers, setTeamMembers] = useState<UserTeamMember[]>([]);
  const [roles, setRoles] = useState<RoleOption[]>([]);
  const [testEmailAddress, setTestEmailAddress] = useState("");
  const [selectedTemplateId, setSelectedTemplateId] = useState<EmailTemplateId>("TEAM_INVITE");
  const [logoPreviewUrl, setLogoPreviewUrl] = useState<string | null>(null);
  const [inviteForm, setInviteForm] = useState({
    email: "",
    firstName: "",
    lastName: "",
    phone: "",
    roleId: "",
  });
  const logoInputRef = useRef<HTMLInputElement | null>(null);

  useEffect(() => {
    setActiveTab(routeMap[location.pathname] || "general");
  }, [location.pathname]);

  useEffect(() => {
    return () => {
      if (logoPreviewUrl?.startsWith("blob:")) {
        URL.revokeObjectURL(logoPreviewUrl);
      }
    };
  }, [logoPreviewUrl]);

  const replaceLogoPreview = useCallback((nextUrl: string | null) => {
    setLogoPreviewUrl((current) => {
      if (current?.startsWith("blob:")) {
        URL.revokeObjectURL(current);
      }
      return nextUrl;
    });
  }, []);

  const activeTabItem = settingsTabs.find((tab) => tab.id === activeTab);
  const showMobileSettingsIndex = isMobile && location.pathname === "/settings";
  const mobileSettingsGroups = [
    {
      label: "Workspace",
      items: [
        settingsTabs.find((tab) => tab.id === "general"),
        settingsTabs.find((tab) => tab.id === "company"),
        settingsTabs.find((tab) => tab.id === "billing"),
      ].filter(Boolean) as SettingsTabItem[],
    },
    {
      label: "Communication",
      items: [
        settingsTabs.find((tab) => tab.id === "email"),
        {
          id: "integrations-external",
          label: "Integrations",
          description: "Connected apps and external tools",
          icon: Globe2,
          path: "/settings/integrations",
        },
      ],
    },
    {
      label: "Security & Team",
      items: [
        settingsTabs.find((tab) => tab.id === "security"),
        settingsTabs.find((tab) => tab.id === "notifications"),
        settingsTabs.find((tab) => tab.id === "team"),
      ].filter(Boolean) as Array<SettingsTabItem | { id: string; label: string; description: string; icon: typeof Settings; path: string }>,
    },
  ];

  const selectedTemplate = useMemo(
    () => emailSettings?.templates.find((template) => template.id === selectedTemplateId) || null,
    [emailSettings, selectedTemplateId]
  );

  const selectedBillingPlan = useMemo(
    () => billing?.availablePlans.find((plan) => plan.key === (billingDraft?.planType || billing?.key)) || null,
    [billing, billingDraft?.planType]
  );
  const billingIsDirty = Boolean(
    billingDraft && billing && (billingDraft.planType !== billing.key || billingDraft.billingCycle !== billing.billingCycle)
  );
  const billingStatus = billing?.status.trim().toUpperCase() || "";
  const billingIsCancelled = billingStatus === "CANCELLED";

  const availableTimezones = useMemo(
    () => Array.from(new Set([userLocalization.timezone, ...(general?.timezone ? [general.timezone] : []), ...timezones])).filter(Boolean),
    [general?.timezone, userLocalization.timezone],
  );

  useEffect(() => {
    if (!billing) return;
    setBillingDraft({
      planType: billing.key,
      billingCycle: billing.billingCycle,
    });
  }, [billing]);

  const refreshBillingData = useCallback(async () => {
    const [billingResult, invoicesResult] = await Promise.all([getBillingSettings(), getBillingInvoices()]);
    setBilling(billingResult);
    setBillingInvoices(invoicesResult);
    return billingResult;
  }, []);

  const loadSettingsData = useCallback(async () => {
    setIsLoading(true);

    const [
      generalResult,
      companyResult,
      billingResult,
      billingInvoicesResult,
      emailResult,
      securityResult,
      notificationResult,
      sessionsResult,
      auditResult,
      teamResult,
      rolesResult,
    ] = await Promise.allSettled([
      getGeneralSettings(),
      getCompanyProfile(),
      getBillingSettings(),
      getBillingInvoices(),
      getEmailSettings(),
      getSecuritySettings(),
      getNotificationSettings(),
      getSessions(),
      getAuditLogs({ limit: 20 }),
      getTeamMembers(),
      getRoles(),
    ]);

    if (generalResult.status === "fulfilled") {
      setGeneral(generalResult.value);
      setTheme(generalResult.value.theme);
      syncLegacyThemeStorage(generalResult.value.theme);
    }
    if (companyResult.status === "fulfilled") setCompany(companyResult.value);
    if (billingResult.status === "fulfilled") setBilling(billingResult.value);
    if (billingInvoicesResult.status === "fulfilled") setBillingInvoices(billingInvoicesResult.value);
    if (emailResult.status === "fulfilled") {
      setEmailSettings(emailResult.value);
      setTestEmailAddress(emailResult.value.smtp.senderEmail || emailResult.value.smtp.username || emailResult.value.mailboxAddress || "");
    }
    if (securityResult.status === "fulfilled") setSecurity(securityResult.value);
    if (notificationResult.status === "fulfilled") setNotifications(notificationResult.value);
    if (sessionsResult.status === "fulfilled") setSessions(sessionsResult.value);
    if (auditResult.status === "fulfilled") setAuditLogs(auditResult.value);
    if (teamResult.status === "fulfilled") setTeamMembers(teamResult.value);
    if (rolesResult.status === "fulfilled") {
      setRoles(rolesResult.value);
      setInviteForm((current) => ({
        ...current,
        roleId: current.roleId || rolesResult.value.find((role) => role.isDefault)?.id || rolesResult.value[0]?.id || "",
      }));
    }

    setIsLoading(false);
  }, []);

  useEffect(() => {
    void loadSettingsData();
  }, [loadSettingsData]);

  const navigateToTab = (tabId: SettingsTab) => {
    setActiveTab(tabId);
    navigate(reverseRouteMap[tabId]);
  };

  const handleSaveGeneral = async () => {
    if (!general) return;
    setSavingSection("general");
    try {
      const next = await updateGeneralSettings(general);
      setGeneral(next);
      setTheme(next.theme);
      syncLegacyThemeStorage(next.theme);
      toast({ title: "General settings updated", description: "Workspace preferences saved successfully." });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveCompany = async () => {
    if (!company) return;
    setSavingSection("company");
    try {
      const next = await updateCompanyProfile({
        companyName: company.companyName,
        domain: company.domain,
        email: company.email,
        phone: company.phone,
        taxId: company.taxId,
        address: company.address,
      });
      setCompany(next);
      updateBranding(next);
      if (general) {
        setGeneral({ ...general, organizationName: next.companyName || general.organizationName });
      }
      toast({ title: "Company profile updated", description: "Branding and company details were saved." });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleUploadLogo = async (file: File) => {
    if (file.size > MAX_COMPANY_LOGO_SIZE_BYTES) {
      toast({
        title: "Upload failed",
        description: "Please upload a logo image smaller than 2MB.",
        variant: "destructive",
      });
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      return;
    }

    const localPreviewUrl = URL.createObjectURL(file);
    replaceLogoPreview(localPreviewUrl);
    setSavingSection("logo");
    try {
      const next = await uploadCompanyLogo(file);
      setCompany((current) => (current ? { ...current, logoUrl: next.logoUrl } : next));
      updateBranding(next);
      toast({ title: "Logo uploaded", description: "Your workspace logo was updated." });
    } catch (error) {
      replaceLogoPreview(null);
      toast({ title: "Upload failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      if (logoInputRef.current) {
        logoInputRef.current.value = "";
      }
      setSavingSection(null);
    }
  };

  const handleSaveBilling = async () => {
    if (!billingDraft) return;
    setSavingSection("billing");
    try {
      const next = await updateBillingSettings(billingDraft);
      setBilling(next);
      await refreshBillingData();
      toast({ title: "Billing updated", description: "Your workspace plan and billing cycle were saved." });
    } catch (error) {
      toast({ title: "Billing update failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleCancelBilling = async () => {
    if (!billing) return;
    const confirmed = window.confirm("Cancel future subscription renewals for this workspace?");
    if (!confirmed) return;

    setSavingSection("billing-cancel");
    try {
      const next = await cancelBillingSubscription();
      setBilling(next);
      await refreshBillingData();
      toast({ title: "Renewal cancelled", description: "Future billing renewals are now paused for this workspace." });
    } catch (error) {
      toast({ title: "Cancellation failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleReactivateBilling = async () => {
    setSavingSection("billing-reactivate");
    try {
      const next = await reactivateBillingSubscription();
      setBilling(next);
      await refreshBillingData();
      toast({ title: "Subscription reactivated", description: "Automatic renewals have been restored for this workspace." });
    } catch (error) {
      toast({ title: "Reactivation failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveNotifications = async () => {
    if (!notifications) return;
    setSavingSection("notifications");
    try {
      const next = await updateNotificationSettings(notifications);
      setNotifications(next);
      toast({ title: "Notifications updated", description: "Your workspace notification preferences were saved." });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveSecurity = async () => {
    if (!security) return;
    setSavingSection("security");
    try {
      const next = await updateSecuritySettings(security);
      setSecurity(next);
      toast({ title: "Security policy updated", description: "Security settings were saved for this workspace." });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveSmtp = async () => {
    if (!emailSettings) return;
    setSavingSection("smtp");
    try {
      const next = await updateSmtpSettings({
        host: emailSettings.smtp.host,
        port: emailSettings.smtp.port,
        username: emailSettings.smtp.username,
        password: emailSettings.smtp.passwordMasked === "••••••••" ? undefined : emailSettings.smtp.passwordMasked,
        encryption: emailSettings.smtp.encryption,
        senderName: emailSettings.smtp.senderName,
        senderEmail: emailSettings.smtp.senderEmail,
        signature: emailSettings.smtp.signature,
      });
      // connectionTest may be returned alongside the settings
      const connectionTest = (next as any).connectionTest as { ok: boolean; error?: string } | undefined;
      setEmailSettings(next);
      if (connectionTest?.ok) {
        toast({ title: "SMTP verified ✅", description: "Settings saved and connection test passed. Your mailbox is ready to send." });
      } else if (connectionTest && !connectionTest.ok) {
        toast({ title: "SMTP saved, but connection failed", description: connectionTest.error || "Could not verify SMTP. Check credentials and try again.", variant: "destructive" });
      } else {
        toast({ title: "SMTP settings updated", description: "Your personal outgoing mailbox configuration was saved." });
      }
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveImap = async () => {
    if (!emailSettings) return;
    setSavingSection("imap");
    try {
      const next = await updateImapSettings({
        host: emailSettings.imap.host,
        port: emailSettings.imap.port,
        username: emailSettings.imap.username,
        password: emailSettings.imap.passwordMasked === "••••••••" ? undefined : emailSettings.imap.passwordMasked,
        encryption: emailSettings.imap.encryption,
      });
      setEmailSettings(next);
      toast({ title: "IMAP settings updated", description: "Your personal incoming mailbox configuration was saved." });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSaveTemplate = async () => {
    if (!selectedTemplate) return;
    setSavingSection("template");
    try {
      const next = await updateEmailTemplates([selectedTemplate]);
      setEmailSettings(next);
      toast({ title: "Template updated", description: "Email template changes were saved." });
    } catch (error) {
      toast({ title: "Save failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleSendTestEmail = async () => {
    setSavingSection("test-email");
    try {
      await sendTestEmail(testEmailAddress);
      toast({ title: "Test email sent", description: `A test email was sent to ${testEmailAddress}.` });
    } catch (error) {
      toast({ title: "Test failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleInviteUser = async () => {
    setSavingSection("invite");
    try {
      const result = await inviteUser({
        email: inviteForm.email,
        firstName: inviteForm.firstName || undefined,
        lastName: inviteForm.lastName || undefined,
        phone: inviteForm.phone || undefined,
        roleId: inviteForm.roleId,
      });
      setTeamMembers((current) => [result.user, ...current]);
      setInviteForm({
        email: "",
        firstName: "",
        lastName: "",
        phone: "",
        roleId: roles.find((role) => role.isDefault)?.id || roles[0]?.id || "",
      });
      toast({
        title: "User invited",
        description: result.inviteEmailSent
          ? `${result.user.email} received an invitation email.`
          : `No SMTP invite was sent. Temporary password: ${result.temporaryPassword || "Unavailable"}`,
      });
    } catch (error) {
      toast({ title: "Invite failed", description: getErrorMessage(error), variant: "destructive" });
    } finally {
      setSavingSection(null);
    }
  };

  const handleRoleChange = async (userId: string, roleId: string) => {
    try {
      const updated = await updateUserRole(userId, roleId);
      setTeamMembers((current) => current.map((member) => (member.id === userId ? updated : member)));
      toast({ title: "Role updated", description: `${updated.fullName}'s role has been updated.` });
    } catch (error) {
      toast({ title: "Role update failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleRemoveUser = async (userId: string) => {
    try {
      await removeUser(userId);
      setTeamMembers((current) => current.filter((member) => member.id !== userId));
      toast({ title: "User removed", description: "The user was removed from this workspace." });
    } catch (error) {
      toast({ title: "Remove failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleRevokeSession = async (sessionId: string) => {
    try {
      await revokeSession(sessionId);
      setSessions((current) => current.filter((session) => session.id !== sessionId));
      toast({ title: "Session revoked", description: "The selected session has been revoked." });
    } catch (error) {
      toast({ title: "Revoke failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  const handleExportAudit = async () => {
    try {
      const blob = await exportAuditLogs();
      const url = URL.createObjectURL(blob);
      const anchor = document.createElement("a");
      anchor.href = url;
      anchor.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      anchor.click();
      URL.revokeObjectURL(url);
    } catch (error) {
      toast({ title: "Export failed", description: getErrorMessage(error), variant: "destructive" });
    }
  };

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC]">
        <div className="flex flex-col items-center gap-3 text-center">
          <Loader2 size={34} className="animate-spin text-[#0891B2]" />
          <p className="text-sm text-[#475569]">Loading workspace settings...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <header className="crm-module-header sticky top-0 z-20">
        <div className="mx-auto max-w-[1500px] px-4 sm:px-6">
          <div className="crm-toolbar-row">
            <div className="crm-toolbar-meta">
              <div className="crm-toolbar-breadcrumb">
                <span>Settings</span>
                {activeTabItem ? (
                  <>
                    <ChevronRight size={14} />
                    <span className="crm-toolbar-breadcrumb-current">{activeTabItem.label}</span>
                  </>
                ) : null}
              </div>
              <h1 className="crm-toolbar-title">Workspace Settings</h1>
              <p className="crm-toolbar-copy">
                {activeTabItem?.description || "Manage workspace preferences, billing, email, security, and team operations."}
              </p>
            </div>
            {activeTabItem ? <span className="crm-toolbar-status-chip hidden sm:inline-flex">{activeTabItem.label}</span> : null}
          </div>
        </div>
      </header>
      <div className="mx-auto flex max-w-[1500px] flex-col gap-6 px-4 py-6 sm:px-6 xl:flex-row">
        {isMobile ? (
          showMobileSettingsIndex ? (
            <div className="space-y-5">
              <div className="rounded-md bg-[linear-gradient(135deg,#0891B2_0%,#0E7490_55%,#0F172A_100%)] p-5 text-white shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-white/15 p-3">
                    <Settings size={22} />
                  </div>
                  <div>
                    <h1 className="text-xl font-semibold">Settings</h1>
                    <p className="mt-1 text-sm text-white/75">Manage workspace preferences, billing, email, security, and connected tools.</p>
                  </div>
                </div>
              </div>

              {mobileSettingsGroups.map((group) => (
                <div key={group.label} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                  <h2 className="mb-3 text-sm font-semibold uppercase tracking-[0.18em] text-[#64748B]">{group.label}</h2>
                  <div className="space-y-2">
                    {group.items.map((item) => {
                      const Icon = item.icon;
                      const path = "path" in item ? item.path : reverseRouteMap[item.id];
                      return (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => navigate(path)}
                          className="flex w-full items-center gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-4 py-4 text-left transition hover:border-[#22D3EE] hover:bg-white"
                        >
                          <div className="rounded-md bg-white p-2.5 shadow-sm">
                            <Icon size={18} className="text-[#0891B2]" />
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-sm font-semibold text-[#0F172A]">{item.label}</p>
                            <p className="mt-1 text-xs text-[#64748B]">{item.description}</p>
                          </div>
                          <ChevronRight size={16} className="text-[#94A3B8]" />
                        </button>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>
          ) : null
        ) : null}

        {!isMobile && (
        <aside className="xl:sticky xl:top-6 xl:h-[calc(100vh-3rem)] xl:w-[320px] xl:flex-shrink-0">
          <div className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white/90 p-5 shadow-sm backdrop-blur">
            <div className="mb-6 rounded-md bg-[linear-gradient(135deg,#0891B2_0%,#0E7490_55%,#0F172A_100%)] p-5 text-white">
              <div className="flex items-center gap-3">
                <div className="rounded-md bg-white/15 p-3">
                  <Settings size={22} />
                </div>
                <div>
                  <h1 className="text-xl font-semibold">Workspace Settings</h1>
                  <p className="mt-1 text-sm text-white/75">Production controls for billing, email, security, and team operations.</p>
                </div>
              </div>
            </div>

            <div className="space-y-2">
              {settingsTabs.map((tab) => {
                const Icon = tab.icon;
                const active = activeTab === tab.id;
                return (
                  <button
                    key={tab.id}
                    onClick={() => navigateToTab(tab.id)}
                    className={cn(
                      "flex w-full items-start gap-3 rounded-md px-4 py-3 text-left transition",
                      active ? "bg-[#0891B2]/5 text-[#0891B2]" : "hover:bg-[#F8FAFC] text-[#334155]"
                    )}
                  >
                    <div className={cn("rounded-md p-2.5", active ? "bg-[#0891B2]/10" : "bg-[#F1F5F9]")}>
                      <Icon size={18} />
                    </div>
                    <div>
                      <div className="text-sm font-semibold">{tab.label}</div>
                      <div className={cn("mt-0.5 text-xs", active ? "text-[#0891B2]/80" : "text-[#64748B]")}>{tab.description}</div>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </aside>
        )}

        {(!isMobile || !showMobileSettingsIndex) && (
        <main className="flex-1 space-y-6">
          {isMobile && activeTabItem ? (
            <div className="sticky top-0 z-10 -mx-4 border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/95 px-4 pb-4 pt-1 backdrop-blur sm:hidden">
              <button
                type="button"
                onClick={() => navigate("/settings")}
                className="mb-3 inline-flex items-center gap-2 text-sm font-medium text-[#0891B2]"
              >
                <ChevronLeft size={16} />
                Back to settings
              </button>
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-3">
                  <div className="rounded-md bg-[#0891B2]/10 p-2.5">
                    <activeTabItem.icon size={18} className="text-[#0891B2]" />
                  </div>
                  <div>
                    <h1 className="text-lg font-semibold text-[#0F172A]">{activeTabItem.label}</h1>
                    <p className="mt-1 text-xs text-[#64748B]">{activeTabItem.description}</p>
                  </div>
                </div>
              </div>
            </div>
          ) : null}
          {activeTab === "general" && (
            <div className="space-y-6">
              {general ? (
                <div className={cardClass}>
                  <SectionHeader title="General Preferences" description="Define the workspace language, time behavior, and visual defaults." />
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <Field label="Organization name">
                      <input className={fieldClass} value={general.organizationName} onChange={(event) => setGeneral({ ...general, organizationName: event.target.value })} />
                    </Field>
                    <Field label="Language">
                      <select className={fieldClass} value={general.language} onChange={(event) => setGeneral({ ...general, language: event.target.value })}>
                        {languages.map((language) => (
                          <option key={language.value} value={language.value}>
                            {language.label}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Timezone" hint="Shared schedules and automations use this workspace timezone. Each signed-in user now sees app timestamps in their own local timezone automatically.">
                      <select className={fieldClass} value={general.timezone} onChange={(event) => setGeneral({ ...general, timezone: event.target.value })}>
                        {availableTimezones.map((timezone) => (
                          <option key={timezone} value={timezone}>
                            {timezone}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Currency">
                      <select className={fieldClass} value={general.currency} onChange={(event) => setGeneral({ ...general, currency: event.target.value })}>
                        {currencies.map((currency) => (
                          <option key={currency} value={currency}>
                            {currency}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Date format">
                      <select className={fieldClass} value={general.dateFormat} onChange={(event) => setGeneral({ ...general, dateFormat: event.target.value as DateFormatValue })}>
                        {dateFormats.map((format) => (
                          <option key={format} value={format}>
                            {format}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Workspace theme">
                      <div className="flex gap-3">
                        {(["light", "dark"] as WorkspaceTheme[]).map((theme) => (
                          <button
                            key={theme}
                            type="button"
                            onClick={() => setGeneral({ ...general, theme })}
                            className={cn(
                              "flex flex-1 items-center justify-center gap-2 rounded-md border px-4 py-3 text-sm font-medium transition",
                              general.theme === theme
                                ? "border-[#0891B2] bg-[#0891B2]/5 text-[#0891B2]"
                                : "border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] text-[#475569]"
                            )}
                          >
                            {theme === "light" ? "Light" : "Dark"}
                          </button>
                        ))}
                      </div>
                    </Field>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <SaveButton onClick={handleSaveGeneral} loading={savingSection === "general"} />
                  </div>
                </div>
              ) : (
                <AccessDeniedCard label="general workspace preferences" />
              )}
            </div>
          )}

          {activeTab === "company" && (
            <div className="space-y-6">
              {company ? (
                <div className={cardClass}>
                  <SectionHeader title="Company Profile" description="Control how your workspace looks and how customers can contact you." />
                  <div className="mt-6 grid gap-6 xl:grid-cols-[280px_minmax(0,1fr)]">
                    <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-5">
                      <p className="text-sm font-medium text-[#0F172A]">Company logo</p>
                      <p className="mt-1 text-xs text-[#64748B]">PNG, JPG, WEBP, or SVG. Maximum 2MB.</p>
                      <div className="mt-5 flex aspect-square items-center justify-center overflow-hidden rounded-md bg-white">
                        {logoPreviewUrl || company.logoUrl ? (
                          <img src={logoPreviewUrl || company.logoUrl || ""} alt="Company logo" className="h-full w-full object-contain p-4" />
                        ) : (
                          <div className="text-center text-sm text-[#64748B]">
                            <Building2 size={28} className="mx-auto mb-2 text-[#94A3B8]" />
                            No logo uploaded
                          </div>
                        )}
                      </div>
                      <input
                        ref={logoInputRef}
                        type="file"
                        accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml"
                        className="hidden"
                        onChange={(event) => {
                          const file = event.target.files?.[0];
                          if (file) {
                            void handleUploadLogo(file);
                          }
                        }}
                      />
                      <button
                        type="button"
                        onClick={() => logoInputRef.current?.click()}
                        className="mt-5 inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] transition hover:border-[#0891B2]"
                      >
                        {savingSection === "logo" ? <Loader2 size={15} className="animate-spin" /> : <Upload size={15} />}
                        {savingSection === "logo" ? "Uploading..." : "Upload logo"}
                      </button>
                    </div>

                    <div className="grid gap-5 lg:grid-cols-2">
                      <Field label="Company name">
                        <input className={fieldClass} value={company.companyName} onChange={(event) => setCompany({ ...company, companyName: event.target.value })} />
                      </Field>
                      <Field label="Primary domain">
                        <input className={fieldClass} value={company.domain} onChange={(event) => setCompany({ ...company, domain: event.target.value })} />
                      </Field>
                      <Field label="Company email">
                        <input className={fieldClass} type="email" value={company.email} onChange={(event) => setCompany({ ...company, email: event.target.value })} />
                      </Field>
                      <Field label="Phone">
                        <input className={fieldClass} value={company.phone} onChange={(event) => setCompany({ ...company, phone: event.target.value })} />
                      </Field>
                      <Field label="Tax ID">
                        <input className={fieldClass} value={company.taxId} onChange={(event) => setCompany({ ...company, taxId: event.target.value })} />
                      </Field>
                      <Field label="Address">
                        <AddressAutocompleteInput
                          value={company.address}
                          onValueChange={(value) => setCompany({ ...company, address: value })}
                          onSelectAddress={(details) => setCompany({ ...company, address: details.formattedAddress || details.addressLine1 || company.address })}
                          className={fieldClass}
                          iconClassName="text-[#64748B]"
                        />
                      </Field>
                    </div>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <SaveButton onClick={handleSaveCompany} loading={savingSection === "company"} />
                  </div>
                </div>
              ) : (
                <AccessDeniedCard label="company profile settings" />
              )}
            </div>
          )}

          {activeTab === "billing" && (
            billing ? (
              <div className="space-y-6">
                <div className={cardClass}>
                  <SectionHeader
                    title={`${billing.name} Plan`}
                    description="Manage your workspace subscription, switch billing cadence, and review usage against current plan limits."
                    badge={
                      <div className="rounded-full bg-[#0891B2]/5 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-[#0891B2]">
                        {formatBillingStatus(billing.status)}
                      </div>
                    }
                  />
                  <div className="mt-6 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-5">
                    <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">Billing cycle</p>
                        <p className="mt-1 text-sm text-[#64748B]">Choose how this workspace should renew going forward.</p>
                      </div>
                      <div className="inline-flex rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-1">
                        {(["MONTHLY", "YEARLY"] as BillingCycle[]).map((cycle) => (
                          <button
                            key={cycle}
                            type="button"
                            onClick={() => setBillingDraft((current) => current ? { ...current, billingCycle: cycle } : { planType: billing.key, billingCycle: cycle })}
                            className={cn(
                              "rounded-md px-4 py-2 text-sm font-medium transition",
                              billingDraft?.billingCycle === cycle
                                ? "bg-[#0891B2] text-white shadow-sm"
                                : "text-[#475569] hover:bg-[#F8FAFC]"
                            )}
                          >
                            {cycle === "YEARLY" ? "Yearly" : "Monthly"}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="mt-5 grid gap-4 xl:grid-cols-3">
                      {billing.availablePlans.map((plan: BillingPlanOption) => {
                        const selected = billingDraft?.planType === plan.key;
                        const isCurrentPlan = billing.key === plan.key && billing.billingCycle === billingDraft?.billingCycle;
                        const displayPrice = billingDraft?.billingCycle === "YEARLY" ? plan.yearlyRate : plan.monthlyRate;
                        const originalYearlyPrice = plan.monthlyRate * 12;

                        return (
                          <button
                            key={plan.key}
                            type="button"
                            onClick={() => setBillingDraft((current) => ({ planType: plan.key, billingCycle: current?.billingCycle || billing.billingCycle }))}
                            className={cn(
                              "rounded-md border p-5 text-left transition",
                              selected
                                ? "border-[#0891B2] bg-white shadow-md ring-4 ring-[#22D3EE]/20"
                                : "border-[rgba(15,23,42,0.06)] bg-white hover:border-[#22D3EE]"
                            )}
                          >
                            <div className="flex items-start justify-between gap-4">
                              <div>
                                <p className="text-base font-semibold text-[#0F172A]">{plan.name}</p>
                                <p className="mt-1 text-sm text-[#64748B]">{plan.description}</p>
                              </div>
                              {isCurrentPlan ? (
                                <span className="rounded-full bg-[#DCFCE7] px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#166534]">
                                  Current
                                </span>
                              ) : null}
                            </div>

                            <div className="mt-5">
                              {billingDraft?.billingCycle === "YEARLY" ? (
                                <div className="space-y-2">
                                  <div className="flex items-end gap-2">
                                    <span className="text-lg font-medium text-[#94A3B8] line-through">{formatMoney(originalYearlyPrice)}</span>
                                    <span className="rounded-full bg-[#DCFCE7] px-2 py-0.5 text-[11px] font-semibold uppercase tracking-[0.12em] text-[#166534]">
                                      10% off
                                    </span>
                                  </div>
                                  <div className="flex items-end gap-2">
                                    <span className="text-3xl font-semibold text-[#0F172A]">{formatMoney(displayPrice)}</span>
                                    <span className="pb-1 text-sm text-[#64748B]">/year</span>
                                  </div>
                                </div>
                              ) : (
                                <div className="flex items-end gap-2">
                                  <span className="text-3xl font-semibold text-[#0F172A]">{formatMoney(displayPrice)}</span>
                                  <span className="pb-1 text-sm text-[#64748B]">/month</span>
                                </div>
                              )}
                            </div>

                            {billingDraft?.billingCycle === "YEARLY" ? (
                              <p className="mt-2 text-xs font-medium text-[#0891B2]">
                                {formatMoney(plan.monthlyRate)} per month when billed yearly
                              </p>
                            ) : (
                              <p className="mt-2 text-xs text-[#64748B]">
                                {formatMoney(plan.yearlyRate)} if billed yearly
                              </p>
                            )}

                            <div className="mt-4 grid grid-cols-2 gap-3 text-xs text-[#475569]">
                              <div className="rounded-md bg-[#F8FAFC] px-3 py-2">
                                <p className="font-semibold text-[#0F172A]">Users</p>
                                <p className="mt-1">{formatPlanLimit(plan.limits.users)}</p>
                              </div>
                              <div className="rounded-md bg-[#F8FAFC] px-3 py-2">
                                <p className="font-semibold text-[#0F172A]">Contacts</p>
                                <p className="mt-1">{formatPlanLimit(plan.limits.contacts)}</p>
                              </div>
                              <div className="rounded-md bg-[#F8FAFC] px-3 py-2">
                                <p className="font-semibold text-[#0F172A]">Storage</p>
                                <p className="mt-1">{formatPlanLimit(plan.limits.storageBytes, formatBytes)}</p>
                              </div>
                              <div className="rounded-md bg-[#F8FAFC] px-3 py-2">
                                <p className="font-semibold text-[#0F172A]">API calls</p>
                                <p className="mt-1">{formatPlanLimit(plan.limits.apiCalls)}</p>
                              </div>
                            </div>

                            <div className="mt-4 space-y-2">
                              {plan.features.map((feature) => (
                                <div key={feature} className="flex items-start gap-2 text-sm text-[#334155]">
                                  <CheckCircle2 size={15} className="mt-0.5 text-[#0891B2]" />
                                  <span>{feature}</span>
                                </div>
                              ))}
                            </div>
                          </button>
                        );
                      })}
                    </div>

                    <div className="mt-5 flex flex-col gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 lg:flex-row lg:items-center lg:justify-between">
                      <div>
                        <p className="text-sm font-semibold text-[#0F172A]">
                          {selectedBillingPlan ? `${selectedBillingPlan.name} ${billingDraft?.billingCycle === "YEARLY" ? "yearly" : "monthly"} plan selected` : "Select a plan"}
                        </p>
                        <p className="mt-1 text-sm text-[#64748B]">
                          {billingIsCancelled
                            ? "This workspace will not renew until you reactivate it."
                            : billing.nextBillingDate
                              ? `Next renewal scheduled for ${formatDateTime(billing.nextBillingDate)}.`
                              : "No renewal is scheduled yet for this workspace."}
                        </p>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        {billingIsCancelled ? (
                          <button
                            type="button"
                            onClick={handleReactivateBilling}
                            disabled={savingSection === "billing-reactivate"}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-[rgba(15,23,42,0.08)] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition hover:border-[#0891B2] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {savingSection === "billing-reactivate" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                            {savingSection === "billing-reactivate" ? "Reactivating..." : "Reactivate"}
                          </button>
                        ) : (
                          <button
                            type="button"
                            onClick={handleCancelBilling}
                            disabled={savingSection === "billing-cancel"}
                            className="inline-flex items-center justify-center gap-2 rounded-md border border-[#FECACA] bg-[#FEF2F2] px-4 py-2.5 text-sm font-medium text-[#991B1B] transition hover:bg-[#FEE2E2] disabled:cursor-not-allowed disabled:opacity-70"
                          >
                            {savingSection === "billing-cancel" ? <Loader2 size={15} className="animate-spin" /> : <AlertTriangle size={15} />}
                            {savingSection === "billing-cancel" ? "Cancelling..." : "Cancel renewal"}
                          </button>
                        )}
                        <SaveButton onClick={handleSaveBilling} loading={savingSection === "billing"} label={billingIsDirty ? "Save billing" : "Confirm plan"} />
                      </div>
                    </div>
                  </div>

                  <div className="mt-6 grid gap-4 lg:grid-cols-4">
                    <div className="rounded-md bg-[#0F172A] p-5 text-white">
                      <p className="text-xs uppercase tracking-[0.18em] text-white/65">Current rate</p>
                      <p className="mt-3 text-3xl font-semibold">{formatMoney(billing.currentRate)}</p>
                      <p className="mt-2 text-sm text-white/70">{billing.billingCycle === "YEARLY" ? "Billed yearly" : "Billed monthly"}</p>
                    </div>
                    <div className="rounded-md bg-[#F8FAFC] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Total paid</p>
                      <p className="mt-3 text-3xl font-semibold text-[#0F172A]">{formatMoney(billing.totalPaid)}</p>
                      <p className="mt-2 text-sm text-[#64748B]">Lifetime subscription payments</p>
                    </div>
                    <div className="rounded-md bg-[#F8FAFC] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">Selected plan price</p>
                      <p className="mt-3 text-3xl font-semibold text-[#0F172A]">
                        {formatMoney(billingDraft?.billingCycle === "YEARLY" ? selectedBillingPlan?.yearlyRate || billing.yearlyRate : selectedBillingPlan?.monthlyRate || billing.monthlyRate)}
                      </p>
                      <p className="mt-2 text-sm text-[#64748B]">
                        {billingDraft?.billingCycle === "YEARLY" ? "Yearly charge for the selected plan" : "Monthly charge for the selected plan"}
                      </p>
                    </div>
                    <div className="rounded-md bg-[#F8FAFC] p-5">
                      <p className="text-xs uppercase tracking-[0.18em] text-[#64748B]">{billingIsCancelled ? "Cancelled on" : "Next billing date"}</p>
                      <p className="mt-3 text-lg font-semibold text-[#0F172A]">
                        {billingIsCancelled ? formatDateTime(billing.cancelledAt) : billing.nextBillingDate ? formatDateTime(billing.nextBillingDate) : "Not scheduled"}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Usage Tracking" description="Track current workspace usage against your plan allowances." />
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <UsageBar label="Users" used={billing.usage.users.used} limit={billing.usage.users.limit} percent={billing.usage.users.percent} />
                    <UsageBar label="Contacts" used={billing.usage.contacts.used} limit={billing.usage.contacts.limit} percent={billing.usage.contacts.percent} />
                    <UsageBar
                      label="Storage"
                      used={billing.usage.storage.usedBytes}
                      limit={billing.usage.storage.limitBytes}
                      percent={billing.usage.storage.percent}
                      formatter={formatBytes}
                    />
                    <UsageBar label="API calls" used={billing.usage.apiCalls.used} limit={billing.usage.apiCalls.limit} percent={billing.usage.apiCalls.percent} />
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Billing Invoices" description="Recent subscription billing records for this workspace." />
                  <div className="mt-6 space-y-3">
                    {billingInvoices.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.06)] p-6 text-sm text-[#64748B]">
                        No billing invoices are available yet for this workspace.
                      </div>
                    ) : (
                      billingInvoices.map((invoice) => (
                        <div key={invoice.id} className="flex flex-col gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between">
                          <div>
                            <p className="font-medium text-[#0F172A]">{invoice.label}</p>
                            <p className="mt-1 text-sm text-[#64748B]">
                              {invoice.status === "PAID" ? `Paid on ${formatDateTime(invoice.billedAt)}` : `Due ${formatDateTime(invoice.dueAt)}`}
                            </p>
                          </div>
                          <div className="flex items-center gap-3">
                            <span className={cn("rounded-full px-3 py-1 text-xs font-semibold", invoice.status === "PAID" ? "bg-[#DCFCE7] text-[#166534]" : "bg-[#FEF3C7] text-[#92400E]")}>
                              {invoice.status}
                            </span>
                            <span className="text-sm font-semibold text-[#0F172A]">{formatMoney(invoice.amount)}</span>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <AccessDeniedCard label="billing and plan details" />
            )
          )}

          {activeTab === "email" && (
            emailSettings ? (
              <div className="space-y-6">
                <div className={cardClass}>
                  <div className="flex items-start gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                    <Mail size={18} className="mt-0.5 text-[#0891B2]" />
                    <div className="space-y-1">
                      <p className="font-medium text-[#0F172A]">Your personal mailbox powers all email actions</p>
                      <p className="text-sm text-[#64748B]">
                        The SMTP and IMAP settings below are tied to your user account. Zodo Mail, lead/client quick-send, and test email all use this same mailbox.
                      </p>
                      <p className="text-xs text-[#64748B]">
                        {emailSettings.mailboxAddress
                          ? `Currently connected as ${emailSettings.mailboxAddress}.`
                          : "No personal mailbox is connected yet."}
                      </p>
                    </div>
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Personal SMTP Configuration" description="Use your own mailbox for Zodo Mail sends, lead/client quick-send, and test email delivery." />
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <Field label="SMTP host">
                      <input className={fieldClass} value={emailSettings.smtp.host} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, host: event.target.value } })} />
                    </Field>
                    <Field label="Port">
                      <input className={fieldClass} type="number" value={emailSettings.smtp.port} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, port: Number(event.target.value || 0) } })} />
                    </Field>
                    <Field label="Username">
                      <input className={fieldClass} value={emailSettings.smtp.username} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, username: event.target.value } })} />
                    </Field>
                    <Field label="Password">
                      <input className={fieldClass} type="password" value={emailSettings.smtp.passwordMasked} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, passwordMasked: event.target.value } })} />
                    </Field>
                    <Field label="Encryption">
                      <select className={fieldClass} value={emailSettings.smtp.encryption} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, encryption: event.target.value as typeof emailSettings.smtp.encryption } })}>
                        {emailEncryptions.map((encryption) => (
                          <option key={encryption} value={encryption}>
                            {encryption}
                          </option>
                        ))}
                      </select>
                    </Field>
                    <Field label="Sender name">
                      <input className={fieldClass} value={emailSettings.smtp.senderName} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, senderName: event.target.value } })} />
                    </Field>
                    <Field label="Sender email">
                      <input className={fieldClass} type="email" value={emailSettings.smtp.senderEmail} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, senderEmail: event.target.value } })} />
                    </Field>
                    <Field label="Signature" hint="Stored with your mailbox profile for future personal email defaults.">
                      <textarea className={cn(fieldClass, "min-h-[120px]")} value={emailSettings.smtp.signature} onChange={(event) => setEmailSettings({ ...emailSettings, smtp: { ...emailSettings.smtp, signature: event.target.value } })} />
                    </Field>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
                      {emailSettings.smtp.configured ? <CheckCircle2 size={14} className="text-[#16A34A]" /> : <AlertTriangle size={14} className="text-[#D97706]" />}
                      {emailSettings.smtp.configured ? "SMTP configured for your account" : "SMTP incomplete for your account"}
                    </div>
                    <SaveButton onClick={handleSaveSmtp} loading={savingSection === "smtp"} />
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Personal IMAP Configuration" description="Connect your mailbox for Zodo Mail inbox sync. Each user must connect their own mailbox." />
                  <div className="mt-6 grid gap-5 lg:grid-cols-2">
                    <Field label="IMAP host">
                      <input className={fieldClass} value={emailSettings.imap.host} onChange={(event) => setEmailSettings({ ...emailSettings, imap: { ...emailSettings.imap, host: event.target.value } })} />
                    </Field>
                    <Field label="Port">
                      <input className={fieldClass} type="number" value={emailSettings.imap.port} onChange={(event) => setEmailSettings({ ...emailSettings, imap: { ...emailSettings.imap, port: Number(event.target.value || 0) } })} />
                    </Field>
                    <Field label="Username">
                      <input className={fieldClass} value={emailSettings.imap.username} onChange={(event) => setEmailSettings({ ...emailSettings, imap: { ...emailSettings.imap, username: event.target.value } })} />
                    </Field>
                    <Field label="Password">
                      <input className={fieldClass} type="password" value={emailSettings.imap.passwordMasked} onChange={(event) => setEmailSettings({ ...emailSettings, imap: { ...emailSettings.imap, passwordMasked: event.target.value } })} />
                    </Field>
                    <Field label="Encryption">
                      <select className={fieldClass} value={emailSettings.imap.encryption} onChange={(event) => setEmailSettings({ ...emailSettings, imap: { ...emailSettings.imap, encryption: event.target.value as typeof emailSettings.imap.encryption } })}>
                        {emailEncryptions.map((encryption) => (
                          <option key={encryption} value={encryption}>
                            {encryption}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                    <div className="inline-flex items-center gap-2 rounded-full bg-[#F8FAFC] px-3 py-1 text-xs font-medium text-[#475569]">
                      {emailSettings.imap.configured ? <CheckCircle2 size={14} className="text-[#16A34A]" /> : <AlertTriangle size={14} className="text-[#D97706]" />}
                      {emailSettings.imap.configured ? "IMAP configured for your account" : "IMAP incomplete for your account"}
                    </div>
                    <SaveButton onClick={handleSaveImap} loading={savingSection === "imap"} />
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Test Email & Templates" description="Verify your own mailbox delivery and manage workspace email templates." />
                  <div className="mt-6 grid gap-6 xl:grid-cols-[320px_minmax(0,1fr)]">
                    <div className="space-y-4 rounded-md bg-[#F8FAFC] p-4">
                      <Field label="Send a test email">
                        <input className={fieldClass} type="email" value={testEmailAddress} onChange={(event) => setTestEmailAddress(event.target.value)} />
                      </Field>
                      <button
                        onClick={handleSendTestEmail}
                        disabled={savingSection === "test-email"}
                        className="inline-flex w-full items-center justify-center gap-2 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-3 text-sm font-medium text-[#0F172A] transition hover:border-[#0891B2] disabled:opacity-70"
                      >
                        {savingSection === "test-email" ? <Loader2 size={15} className="animate-spin" /> : <RefreshCw size={15} />}
                        {savingSection === "test-email" ? "Sending..." : "Send test email"}
                      </button>
                      <div className="space-y-2">
                        <p className="text-sm font-medium text-[#0F172A]">Templates</p>
                        {emailSettings.templates.map((template) => (
                          <button
                            key={template.id}
                            type="button"
                            onClick={() => setSelectedTemplateId(template.id)}
                            className={cn(
                              "w-full rounded-md border px-4 py-3 text-left transition",
                              selectedTemplateId === template.id
                                ? "border-[#0891B2] bg-[#0891B2]/5"
                                : "border-[rgba(15,23,42,0.06)] bg-white hover:border-[#99F6E4]"
                            )}
                          >
                            <p className="text-sm font-semibold text-[#0F172A]">{template.name}</p>
                            <p className="mt-1 text-xs text-[#64748B]">{template.subject}</p>
                          </button>
                        ))}
                      </div>
                    </div>

                    {selectedTemplate ? (
                      <div className="space-y-4">
                        <Field label="Subject">
                          <input
                            className={fieldClass}
                            value={selectedTemplate.subject}
                            onChange={(event) =>
                              setEmailSettings({
                                ...emailSettings,
                                templates: emailSettings.templates.map((template) =>
                                  template.id === selectedTemplate.id ? { ...template, subject: event.target.value } : template
                                ),
                              })
                            }
                          />
                        </Field>
                        <Field label="HTML body">
                          <textarea
                            className={cn(fieldClass, "min-h-[200px]")}
                            value={selectedTemplate.bodyHtml}
                            onChange={(event) =>
                              setEmailSettings({
                                ...emailSettings,
                                templates: emailSettings.templates.map((template) =>
                                  template.id === selectedTemplate.id ? { ...template, bodyHtml: event.target.value } : template
                                ),
                              })
                            }
                          />
                        </Field>
                        <Field label="Plain text body">
                          <textarea
                            className={cn(fieldClass, "min-h-[160px]")}
                            value={selectedTemplate.bodyText}
                            onChange={(event) =>
                              setEmailSettings({
                                ...emailSettings,
                                templates: emailSettings.templates.map((template) =>
                                  template.id === selectedTemplate.id ? { ...template, bodyText: event.target.value } : template
                                ),
                              })
                            }
                          />
                        </Field>
                        <div className="flex justify-end">
                          <SaveButton onClick={handleSaveTemplate} loading={savingSection === "template"} label="Save template" />
                        </div>
                      </div>
                    ) : null}
                  </div>
                </div>
              </div>
            ) : (
              <AccessDeniedCard label="email configuration" />
            )
          )}

          {activeTab === "security" && (
            security ? (
              <div className="space-y-6">
                <div className={cardClass}>
                  <SectionHeader title="Security Policy" description="Set the authentication requirements and access guardrails for this workspace." />
                  <div className="mt-6 grid gap-6 lg:grid-cols-2">
                    <div className="rounded-md bg-[#F8FAFC] p-5">
                      <div className="flex items-center justify-between gap-4">
                        <div>
                          <p className="font-medium text-[#0F172A]">Require two-factor authentication</p>
                          <p className="mt-1 text-sm text-[#64748B]">Owners and admins can require 2FA for every member.</p>
                        </div>
                        <Toggle checked={security.enforce2FA} onChange={(next) => setSecurity({ ...security, enforce2FA: next })} />
                      </div>
                    </div>
                    <Field label="Password minimum length">
                      <input className={fieldClass} type="number" value={security.passwordMinLength} onChange={(event) => setSecurity({ ...security, passwordMinLength: Number(event.target.value || 8) })} />
                    </Field>
                    <Field label="Session timeout (minutes)">
                      <input className={fieldClass} type="number" value={security.sessionTimeoutMinutes} onChange={(event) => setSecurity({ ...security, sessionTimeoutMinutes: Number(event.target.value || 30) })} />
                    </Field>
                    <Field label="IP whitelist" hint="One IP address per line. Leave empty to allow all.">
                      <textarea
                        className={cn(fieldClass, "min-h-[140px]")}
                        value={security.ipWhitelist.join("\n")}
                        onChange={(event) =>
                          setSecurity({
                            ...security,
                            ipWhitelist: event.target.value.split("\n").map((value) => value.trim()).filter(Boolean),
                          })
                        }
                      />
                    </Field>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <SaveButton onClick={handleSaveSecurity} loading={savingSection === "security"} />
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Active Sessions" description="Current active sessions for your account." />
                  <div className="mt-6 space-y-3">
                    {sessions.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.06)] p-6 text-sm text-[#64748B]">
                        No active sessions were found.
                      </div>
                    ) : (
                      sessions.map((session) => (
                        <div key={session.id} className="flex flex-col gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 lg:flex-row lg:items-center lg:justify-between">
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-[#0F172A]">{session.device}</p>
                              {session.current ? (
                                <span className="rounded-full bg-[#DCFCE7] px-2.5 py-1 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#166534]">
                                  Current
                                </span>
                              ) : null}
                            </div>
                            <p className="mt-1 text-sm text-[#64748B]">
                              {session.browser} • {session.ip} • {session.location}
                            </p>
                            <p className="mt-1 text-xs text-[#94A3B8]">Last active {formatDateTime(session.lastActive)}</p>
                          </div>
                          <button
                            type="button"
                            disabled={session.current}
                            onClick={() => void handleRevokeSession(session.id)}
                            className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-2 text-sm font-medium text-[#0F172A] transition hover:border-[#DC2626] hover:text-[#DC2626] disabled:cursor-not-allowed disabled:opacity-50"
                          >
                            Revoke
                          </button>
                        </div>
                      ))
                    )}
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader
                    title="Audit Log"
                    description="Recent profile, security, export, and access events for this workspace."
                    badge={
                      <button onClick={handleExportAudit} className="inline-flex items-center gap-2 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-2 text-sm font-medium text-[#0F172A] transition hover:border-[#0891B2] hover:text-[#0891B2]">
                        <Download size={15} />
                        Export CSV
                      </button>
                    }
                  />
                  <div className="mt-6 space-y-3">
                    {auditLogs.length === 0 ? (
                      <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.06)] p-6 text-sm text-[#64748B]">
                        No audit events have been recorded yet.
                      </div>
                    ) : (
                      auditLogs.map((log) => (
                        <div key={log.id} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                          <div className="flex flex-col gap-2 lg:flex-row lg:items-center lg:justify-between">
                            <div>
                              <p className="font-medium text-[#0F172A]">{log.description}</p>
                              <p className="mt-1 text-sm text-[#64748B]">
                                {log.module} • {log.action} {log.user ? `• ${log.user.firstName} ${log.user.lastName}` : ""}
                              </p>
                            </div>
                            <div className="text-sm text-[#64748B]">{formatDateTime(log.createdAt)}</div>
                          </div>
                          <p className="mt-2 text-xs text-[#94A3B8]">IP: {log.ipAddress || "Unknown"}</p>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <AccessDeniedCard label="security settings" />
            )
          )}

          {activeTab === "notifications" && (
            notifications ? (
              <div className={cardClass}>
                <SectionHeader title="Notification Preferences" description="Choose which product and workflow notifications your workspace should receive." />
                <div className="mt-6 space-y-4">
                  {[
                    { key: "emailNotifications", label: "Email notifications", description: "Receive task, lead, and workflow updates by email." },
                    { key: "pushNotifications", label: "Push notifications", description: "Send push notifications to connected devices." },
                    { key: "desktopNotifications", label: "Desktop notifications", description: "Show browser desktop notifications while signed in." },
                    { key: "weeklyDigest", label: "Weekly digest", description: "Send a weekly workspace summary." },
                    { key: "productUpdates", label: "Product updates", description: "Receive release notes and product announcements." },
                  ].map((item) => (
                    <div key={item.key} className="flex items-center justify-between gap-4 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4">
                      <div>
                        <p className="font-medium text-[#0F172A]">{item.label}</p>
                        <p className="mt-1 text-sm text-[#64748B]">{item.description}</p>
                      </div>
                      <Toggle
                        checked={notifications[item.key as keyof NotificationSettings]}
                        onChange={(next) =>
                          setNotifications({
                            ...notifications,
                            [item.key]: next,
                          })
                        }
                      />
                    </div>
                  ))}
                </div>
                <div className="mt-6 flex justify-end">
                  <SaveButton onClick={handleSaveNotifications} loading={savingSection === "notifications"} />
                </div>
              </div>
            ) : (
              <AccessDeniedCard label="notification settings" />
            )
          )}

          {activeTab === "team" && (
            teamMembers.length > 0 || roles.length > 0 ? (
              <div className="space-y-6">
                <div className={cardClass}>
                  <SectionHeader title="Invite Team Members" description="Invite new members to this workspace and assign their role immediately." />
                  <div className="mt-6 grid gap-5 lg:grid-cols-2 xl:grid-cols-5">
                    <Field label="Email">
                      <input className={fieldClass} type="email" value={inviteForm.email} onChange={(event) => setInviteForm({ ...inviteForm, email: event.target.value })} />
                    </Field>
                    <Field label="First name">
                      <input className={fieldClass} value={inviteForm.firstName} onChange={(event) => setInviteForm({ ...inviteForm, firstName: event.target.value })} />
                    </Field>
                    <Field label="Last name">
                      <input className={fieldClass} value={inviteForm.lastName} onChange={(event) => setInviteForm({ ...inviteForm, lastName: event.target.value })} />
                    </Field>
                    <Field label="Phone">
                      <input className={fieldClass} value={inviteForm.phone} onChange={(event) => setInviteForm({ ...inviteForm, phone: event.target.value })} />
                    </Field>
                    <Field label="Role">
                      <select className={fieldClass} value={inviteForm.roleId} onChange={(event) => setInviteForm({ ...inviteForm, roleId: event.target.value })}>
                        {roles.map((role) => (
                          <option key={role.id} value={role.id}>
                            {role.name}
                          </option>
                        ))}
                      </select>
                    </Field>
                  </div>
                  <div className="mt-6 flex justify-end">
                    <button
                      onClick={handleInviteUser}
                      disabled={savingSection === "invite"}
                      className="inline-flex items-center gap-2 rounded-md bg-[#0891B2] px-4 py-2.5 text-sm font-medium text-white transition hover:bg-[#0E7490] disabled:opacity-70"
                    >
                      {savingSection === "invite" ? <Loader2 size={15} className="animate-spin" /> : <UserPlus size={15} />}
                      {savingSection === "invite" ? "Inviting..." : "Invite member"}
                    </button>
                  </div>
                </div>

                <div className={cardClass}>
                  <SectionHeader title="Team Directory" description="Review active workspace members, their roles, and access state." />
                  <div className="mt-6 space-y-3">
                    {teamMembers.map((member) => (
                      <div key={member.id} className="flex flex-col gap-4 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 xl:flex-row xl:items-center xl:justify-between">
                        <div>
                          <div className="flex items-center gap-3">
                            <div className="flex h-11 w-11 items-center justify-center rounded-md bg-[#0891B2]/10 text-sm font-semibold text-[#0891B2]">
                              {(member.fullName || member.email).slice(0, 2).toUpperCase()}
                            </div>
                            <div>
                              <p className="font-medium text-[#0F172A]">{member.fullName || member.email}</p>
                              <p className="text-sm text-[#64748B]">{member.email}</p>
                            </div>
                          </div>
                          <div className="mt-3 flex flex-wrap gap-2 text-xs">
                            <span className="rounded-full bg-white px-3 py-1 font-medium text-[#475569]">Status: {member.membershipStatus}</span>
                            <span className="rounded-full bg-white px-3 py-1 font-medium text-[#475569]">Last login: {formatDateTime(member.lastLoginAt)}</span>
                          </div>
                        </div>
                        <div className="flex flex-col gap-3 sm:flex-row sm:items-center">
                          <select
                            className={cn(fieldClass, "min-w-[180px] py-2.5")}
                            value={member.role?.id || ""}
                            onChange={(event) => void handleRoleChange(member.id, event.target.value)}
                          >
                            {roles.map((role) => (
                              <option key={role.id} value={role.id}>
                                {role.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="button"
                            onClick={() => void handleRemoveUser(member.id)}
                            className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-4 py-2.5 text-sm font-medium text-[#0F172A] transition hover:border-[#DC2626] hover:text-[#DC2626]"
                          >
                            Remove
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            ) : (
              <AccessDeniedCard label="team management" />
            )
          )}
        </main>
        )}
      </div>
    </div>
  );
}
