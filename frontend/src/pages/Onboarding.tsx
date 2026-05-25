import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Building2,
  Check,
  CheckCircle2,
  ClipboardList,
  FileText,
  Layers3,
  Loader2,
  ReceiptText,
  Settings2,
  Sparkles,
  Users2,
  X,
  Zap,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { useToast } from "@/components/ui/use-toast";
import { AUTH_STORAGE_KEYS, getAccessToken } from "@/features/auth/lib/auth-storage";
import {
  clearOnboardingData,
  normalizeEnabledFeatures,
  setAvailableFeatures,
  setEnabledFeatures,
  setOnboardingCompleted,
  type PlanKey,
} from "@/lib/enabled-features";
import {
  ANALYTICS_METRIC_OPTIONS,
  CURRENCY_OPTIONS,
  DATE_FORMAT_OPTIONS,
  ONBOARDING_MODULES,
  PROJECT_STATUS_OPTIONS,
  TASK_STATUS_OPTIONS,
  TEAM_ROLE_OPTIONS,
  getAllowedOnboardingModules,
  getDefaultOnboardingPayload,
  resolveEnabledFeaturePreview,
  type OnboardingModuleId,
  type OnboardingPayload,
  type TenantAccessPayload,
  type TenantOnboardingApiResponse,
} from "@/lib/onboarding-config";
import { cn } from "@/lib/utils";
import { completeTenantOnboarding, getTenantOnboarding } from "@/features/onboarding/services/onboarding-service";
import { detectUserLocalization } from "@/lib/user-localization";
import logo from "../Images/Logo/logo.png";

type StepId = "workspace" | "modules" | "pipeline" | "team" | "finance" | "documents" | "intelligence" | "review" | "complete";
type WizardStep = {
  id: StepId;
  title: string;
  subtitle: string;
  icon: typeof Layers3;
  optional?: boolean;
};

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_META: Record<Exclude<StepId, "complete">, WizardStep> = {
  workspace: {
    id: "workspace",
    title: "Workspace Profile",
    subtitle: "Set the company, industry, size, country, timezone, and currency for your sales team.",
    icon: Building2,
  },
  modules: {
    id: "modules",
    title: "Sales Modules",
    subtitle: "Choose the modules your Sales CRM workspace should launch with.",
    icon: Layers3,
  },
  pipeline: {
    id: "pipeline",
    title: "Pipeline Setup",
    subtitle: "Configure lead stages, deal stages, and task cadence for the sales process.",
    icon: ClipboardList,
  },
  team: {
    id: "team",
    title: "Team Setup",
    subtitle: "Invite sales reps, managers, and admins now or skip and do it later.",
    icon: Users2,
    optional: true,
  },
  finance: {
    id: "finance",
    title: "Billing Defaults",
    subtitle: "Set proposal, invoice, payment, and subscription defaults.",
    icon: ReceiptText,
  },
  documents: {
    id: "documents",
    title: "Documents",
    subtitle: "Prepare file categories and document visibility defaults.",
    icon: FileText,
  },
  intelligence: {
    id: "intelligence",
    title: "AI & Analytics",
    subtitle: "Tune the assistant, lead scoring, reporting, and website analytics preferences.",
    icon: Bot,
    optional: true,
  },
  review: {
    id: "review",
    title: "Review & Finish",
    subtitle: "Confirm the workspace setup before entering the Sales CRM.",
    icon: CheckCircle2,
  },
};

const PLAN_ACCENTS: Record<PlanKey, { badge: string; tone: string }> = {
  basic: { badge: "Basic Plan", tone: "text-cyan-700" },
  standard: { badge: "Standard Plan", tone: "text-emerald-700" },
  premium: { badge: "Premium Plan", tone: "text-fuchsia-700" },
};

const MODULE_CARD_TONES = [
  "from-emerald-400 to-emerald-600",
  "from-violet-500 to-fuchsia-600",
  "from-sky-400 to-blue-600",
  "from-orange-400 to-orange-600",
  "from-indigo-400 to-blue-600",
  "from-lime-400 to-emerald-500",
  "from-cyan-400 to-teal-600",
  "from-purple-400 to-violet-600",
] as const;

const COMPANY_SIZE_OPTIONS = ["1-10", "11-50", "51-200", "201-500", "500+"];
const INDUSTRY_OPTIONS = [
  { value: "sales_crm", label: "Sales CRM" },
  { value: "b2b_saas", label: "B2B SaaS" },
  { value: "crm_sales", label: "CRM Sales" },
  { value: "professional_services", label: "Professional Services" },
];
const BUSINESS_TYPE_OPTIONS = [
  { value: "b2b_saas", label: "B2B SaaS" },
  { value: "inside_sales", label: "Inside Sales" },
  { value: "field_sales", label: "Field Sales" },
  { value: "hybrid_sales", label: "Hybrid Sales" },
];
const DEFAULT_LEAD_STAGE_OPTIONS = ["New", "Contacted", "Qualified", "Nurture"];
const DEFAULT_DEAL_STAGE_OPTIONS = ["Qualification", "Demo Scheduled", "Proposal Sent", "Negotiation", "Won", "Lost"];
const DEFAULT_FOLDER_OPTIONS = ["Proposals", "Contracts", "Invoices", "Receipts", "Client Files", "Reports", "Templates"];

function detectLocaleSettings(): OnboardingPayload["settings"] {
  const detected = detectUserLocalization();
  const country = detected.countryCode;
  const currencyByCountry: Record<string, OnboardingPayload["settings"]["currency"]> = {
    US: "USD",
    CA: "CAD",
    GB: "GBP",
    AU: "AUD",
    IN: "INR",
    JP: "JPY",
    CN: "CNY",
    DE: "EUR",
    FR: "EUR",
    IT: "EUR",
    ES: "EUR",
    NL: "EUR",
  };

  return {
    currency: currencyByCountry[country] || "USD",
    timezone: detected.timezone,
    dateFormat: country === "US" ? "MM/DD/YYYY" : country === "JP" || country === "CN" ? "YYYY-MM-DD" : "DD/MM/YYYY",
  };
}

function buildSteps(): WizardStep[] {
  return [
    STEP_META.workspace,
    STEP_META.modules,
    STEP_META.pipeline,
    STEP_META.team,
    STEP_META.finance,
    STEP_META.documents,
    STEP_META.intelligence,
    STEP_META.review,
    { id: "complete", title: "Workspace Ready", subtitle: "Your Sales CRM is configured and ready to use.", icon: CheckCircle2 },
  ];
}

function mergeIncomingPayload(plan: PlanKey, incoming?: OnboardingPayload, tenant?: TenantAccessPayload): OnboardingPayload {
  const defaults = getDefaultOnboardingPayload(plan);
  const localeDefaults = detectLocaleSettings();
  return {
    ...defaults,
    ...(incoming || {}),
    modules: incoming?.modules?.length ? incoming.modules : defaults.modules,
    settings: { ...localeDefaults, ...defaults.settings, ...(incoming?.settings || {}) },
    companyProfile: {
      ...defaults.companyProfile,
      workspaceName: tenant?.name || "",
      country: tenant?.country || "Canada",
      ...(incoming?.companyProfile || {}),
    },
    salesPreferences: { ...defaults.salesPreferences, ...(incoming?.salesPreferences || {}) },
    financePreferences: { ...defaults.financePreferences, ...(incoming?.financePreferences || {}) },
    documentPreferences: { ...defaults.documentPreferences, ...(incoming?.documentPreferences || {}) },
    teamInvites: incoming?.teamInvites?.length ? incoming.teamInvites : defaults.teamInvites,
    ...(plan !== "basic" ? { projectSettings: { ...defaults.projectSettings, ...(incoming?.projectSettings || {}) } } : {}),
    ...(plan === "premium" ? { aiSettings: { ...defaults.aiSettings, ...(incoming?.aiSettings || {}) }, analyticsSettings: { ...defaults.analyticsSettings, ...(incoming?.analyticsSettings || {}) } } : {}),
  };
}

function sanitizePayload(plan: PlanKey, payload: OnboardingPayload): OnboardingPayload {
  const modules = Array.from(new Set(payload.modules.filter((moduleId): moduleId is OnboardingModuleId => getAllowedOnboardingModules(plan).includes(moduleId))));
  const teamInvites = payload.teamInvites
    .map((invite) => ({ email: invite.email.trim().toLowerCase(), role: invite.role }))
    .filter((invite) => invite.email.length > 0 && EMAIL_REGEX.test(invite.email));

  return {
    modules,
    settings: {
      currency: payload.settings.currency,
      timezone: payload.settings.timezone.trim(),
      dateFormat: payload.settings.dateFormat,
    },
    companyProfile: {
      workspaceName: payload.companyProfile?.workspaceName?.trim() || "",
      website: payload.companyProfile?.website?.trim() || "",
      industry: payload.companyProfile?.industry || "sales_crm",
      businessType: payload.companyProfile?.businessType || "b2b_saas",
      companySize: payload.companyProfile?.companySize || "1-10",
      country: payload.companyProfile?.country?.trim() || "Canada",
    },
    salesPreferences: {
      leadStages: payload.salesPreferences?.leadStages?.length ? payload.salesPreferences.leadStages : DEFAULT_LEAD_STAGE_OPTIONS,
      dealStages: payload.salesPreferences?.dealStages?.length ? payload.salesPreferences.dealStages : DEFAULT_DEAL_STAGE_OPTIONS,
      defaultPipeline: payload.salesPreferences?.defaultPipeline?.trim() || "Sales CRM Pipeline",
      taskCadence: payload.salesPreferences?.taskCadence || "daily",
    },
    financePreferences: {
      proposalPrefix: payload.financePreferences?.proposalPrefix?.trim() || "PROP-",
      invoicePrefix: payload.financePreferences?.invoicePrefix?.trim() || "INV-",
      paymentTermsDays: Number(payload.financePreferences?.paymentTermsDays) || 14,
      defaultBillingCycle: payload.financePreferences?.defaultBillingCycle || "monthly",
    },
    documentPreferences: {
      defaultFolders: payload.documentPreferences?.defaultFolders?.length ? payload.documentPreferences.defaultFolders : DEFAULT_FOLDER_OPTIONS.slice(0, 4),
      requireFileCategories: payload.documentPreferences?.requireFileCategories !== false,
      enableClientVisibleFiles: payload.documentPreferences?.enableClientVisibleFiles === true,
    },
    teamInvites,
    ...(plan !== "basic" ? { projectSettings: { defaultProjectStatus: payload.projectSettings?.defaultProjectStatus || "not_started", taskStatuses: payload.projectSettings?.taskStatuses || ["pending", "in_progress", "done"] } } : {}),
    ...(plan === "premium" ? { aiSettings: { businessType: "saas", materialType: "Sales CRM", costingMethod: "subscription" }, analyticsSettings: { metrics: payload.analyticsSettings?.metrics || ["revenue", "leads", "projects", "performance"] } } : {}),
  };
}

function getStepError(stepId: StepId, payload: OnboardingPayload): string | null {
  if (stepId === "workspace") {
    if (!payload.companyProfile?.workspaceName?.trim()) return "Workspace name is required.";
    if (!payload.settings.currency || !payload.settings.timezone || !payload.settings.dateFormat) return "Currency, timezone, and date format are required.";
  }
  if (stepId === "modules" && payload.modules.length === 0) return "Select at least one module to continue.";
  if (stepId === "pipeline") {
    if (!payload.salesPreferences?.leadStages?.length) return "Select at least one lead stage.";
    if (!payload.salesPreferences?.dealStages?.length) return "Select at least one deal stage.";
  }
  if (stepId === "team") {
    const invalidInvite = payload.teamInvites.some((invite) => invite.email.trim().length > 0 && !EMAIL_REGEX.test(invite.email.trim()));
    return invalidInvite ? "Please fix invalid teammate email addresses." : null;
  }
  return null;
}

function updateStoredTenant(tenant: TenantAccessPayload): void {
  localStorage.setItem(AUTH_STORAGE_KEYS.tenant, JSON.stringify(tenant));
}

export default function OnboardingPage() {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [tenant, setTenant] = useState<TenantAccessPayload | null>(null);
  const [payload, setPayload] = useState<OnboardingPayload | null>(null);
  const [stepIndex, setStepIndex] = useState(0);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [showValidation, setShowValidation] = useState(false);

  const plan = tenant?.plan || "standard";
  const steps = useMemo(() => buildSteps(), []);
  const currentStep = steps[stepIndex] || steps[0];
  const progress = steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 0;
  const allowedModules = useMemo(() => getAllowedOnboardingModules(plan), [plan]);
  const selectedFeatures = useMemo(() => resolveEnabledFeaturePreview(payload?.modules || []), [payload?.modules]);
  const currentStepError = payload ? getStepError(currentStep.id, payload) : null;
  const accent = PLAN_ACCENTS[plan];

  useEffect(() => {
    if (!getAccessToken()) {
      navigate("/login", { replace: true });
      return;
    }
    let cancelled = false;
    const load = async () => {
      try {
        const response = await getTenantOnboarding();
        const data = response?.data as TenantOnboardingApiResponse | undefined;
        if (!data?.tenant || cancelled) return;
        setTenant(data.tenant);
        setPayload(mergeIncomingPayload(data.tenant.plan, data.onboarding, data.tenant));
        setAvailableFeatures(normalizeEnabledFeatures(data.tenant.availableFeatures));
        setOnboardingCompleted(data.tenant.onboardingCompleted === true);
        if (data.tenant.onboardingCompleted) {
          setEnabledFeatures(normalizeEnabledFeatures(data.tenant.enabledFeatures));
          updateStoredTenant(data.tenant);
          setStepIndex(buildSteps().length - 1);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast({
            title: "Unable to load onboarding",
            description: error?.response?.data?.message || error?.message || "Please refresh and try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) setIsLoading(false);
      }
    };
    void load();
    return () => { cancelled = true; };
  }, [navigate, toast]);

  const updatePayload = (updater: (current: OnboardingPayload) => OnboardingPayload) => setPayload((current) => (current ? updater(current) : current));

  const goNext = async () => {
    if (!payload || !tenant) return;
    if (currentStep.id !== "complete" && currentStepError) {
      setShowValidation(true);
      return;
    }
    if (stepIndex === steps.length - 2) {
      setIsSaving(true);
      try {
        const response = await completeTenantOnboarding(sanitizePayload(plan, payload));
        const data = response?.data as TenantOnboardingApiResponse | undefined;
        if (!data?.tenant) throw new Error(response?.message || "Onboarding could not be completed.");
        setTenant(data.tenant);
        setPayload(mergeIncomingPayload(data.tenant.plan, data.onboarding, data.tenant));
        setAvailableFeatures(normalizeEnabledFeatures(data.tenant.availableFeatures));
        setEnabledFeatures(normalizeEnabledFeatures(data.tenant.enabledFeatures));
        clearOnboardingData();
        setOnboardingCompleted(true);
        updateStoredTenant(data.tenant);
        setShowValidation(false);
        setStepIndex(steps.length - 1);
        toast({ title: "Workspace ready", description: "Your Sales CRM is configured and ready to go." });
      } catch (error: any) {
        toast({
          title: "Could not finish onboarding",
          description: error?.response?.data?.message || error?.message || "Please try again.",
          variant: "destructive",
        });
      } finally {
        setIsSaving(false);
      }
      return;
    }
    setShowValidation(false);
    setStepIndex((current) => Math.min(current + 1, steps.length - 1));
  };

  const goBack = () => {
    setShowValidation(false);
    setStepIndex((current) => Math.max(current - 1, 0));
  };

  if (isLoading || !tenant || !payload) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.15),transparent_35%),radial-gradient(circle_at_bottom_right,rgba(34,197,94,0.12),transparent_30%),#f8fafc]">
        <div className="flex items-center gap-3 rounded-full border border-slate-200 bg-white/85 px-5 py-3 text-sm font-medium text-slate-700 shadow-lg backdrop-blur">
          <Loader2 className="h-3 w-3 animate-spin text-cyan-600" />
          Loading your workspace setup...
        </div>
      </div>
    );
  }

  const stepCountLabel = currentStep.id === "complete" ? "Complete" : `Step ${Math.min(stepIndex + 1, steps.length - 1)} of ${steps.length - 1}`;
  const countryLabel = payload.companyProfile?.country || tenant.country || "Canada";
  const countryFlag = /canada/i.test(countryLabel) ? "🇨🇦" : "🌐";

  return (
    <div className="min-h-screen bg-white text-[#10172A]">
      <div className="grid min-h-screen overflow-hidden bg-white lg:grid-cols-[280px_minmax(0,1fr)]">
        <aside className="relative hidden min-h-screen overflow-hidden border-r border-slate-100 bg-[linear-gradient(180deg,#ffffff_0%,#f8fffd_56%,#edf9f6_100%)] lg:flex lg:flex-col lg:px-6 lg:py-5">
          <div className="flex items-center gap-2">
            <img src={logo} alt="Zodo CRM" className="h-7 w-auto" />
            <span className="text-lg font-semibold tracking-tight text-slate-500">Sales CRM</span>
          </div>
          <div className="mt-5">
            <h1 className="text-[23px] font-semibold leading-[1.08] tracking-[-0.01em] text-[#111827]">Configure your workspace</h1>
            <div className="mt-3 flex flex-wrap items-center gap-2">
              <Badge className={cn("border border-amber-200 bg-amber-50 px-2.5 py-1 text-[12px] font-medium", accent.tone)}>{accent.badge}</Badge>
              <span className="text-xs text-slate-500">Upgrade anytime</span>
            </div>
          </div>
          <p className="mt-5 text-sm font-medium text-[#111827]">{stepCountLabel}</p>
          <div className="relative mt-3 flex-1">
            <div className="absolute bottom-6 left-[15px] top-6 w-px bg-slate-200" />
            <div className="relative space-y-2">
              {steps.map((step, index) => {
                const Icon = step.icon;
                const isActive = index === stepIndex;
                const isPast = index < stepIndex;
                return (
                  <div key={step.id} className={cn("relative flex items-start gap-3 rounded-xl px-3 py-2 transition-all", isActive ? "bg-emerald-50 shadow-[0_14px_35px_rgba(16,185,129,0.10)] ring-1 ring-emerald-100" : isPast ? "bg-white" : "bg-transparent")}>
                    <div className={cn("relative z-10 flex h-8 w-8 shrink-0 items-center justify-center rounded-full border", isPast ? "border-emerald-200 bg-emerald-500 text-white" : isActive ? "border-emerald-500 bg-emerald-500 text-white" : "border-slate-200 bg-white text-slate-400")}>
                      {isPast ? <Check className="h-3 w-3" /> : <Icon className="h-3 w-3" />}
                    </div>
                    <div className="min-w-0">
                      <p className="text-[13px] font-semibold text-slate-900">{step.title}</p>
                      <p className="mt-0.5 text-[11px] leading-4 text-slate-500">{step.subtitle}</p>
                      {step.optional ? <p className="mt-1 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-[11px] font-medium text-slate-500">Optional</p> : null}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
          <div className="pointer-events-none -mx-6 mt-4 h-28 bg-[radial-gradient(circle_at_20%_100%,rgba(16,185,129,0.18),transparent_38%),radial-gradient(circle_at_90%_88%,rgba(59,130,246,0.12),transparent_34%)]" />
        </aside>

        <section className="flex min-w-0 flex-col bg-white">
          <div className="flex items-center justify-between gap-4 border-b border-slate-100 px-4 py-3 sm:px-6">
            <div className="flex flex-wrap items-center gap-4">
              <span className="text-sm font-medium text-slate-900">{payload.companyProfile?.workspaceName || tenant.name}</span>
              <span className="flex items-center gap-2 text-sm font-medium text-slate-700"><span>{countryFlag}</span><span>{countryLabel}</span></span>
            </div>
            <Button type="button" variant="outline" size="icon" className="h-8 w-8 rounded-lg border-slate-200" onClick={() => navigate("/dashboard", { replace: true })}>
              <X className="h-3 w-3" />
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto px-4 py-4 sm:px-6">
            <div className="rounded-xl border border-slate-200/80 bg-white px-4 py-3 shadow-[0_12px_40px_rgba(15,23,42,0.04)]">
              <div className="grid gap-3 lg:grid-cols-[1fr_1.35fr_0.55fr_0.55fr] lg:items-center">
                <div className="space-y-2 border-slate-100 lg:border-r lg:pr-10">
                  <p className="text-sm font-medium text-slate-700">Progress</p>
                  <div className="flex items-center gap-4"><span className="text-xl font-semibold text-emerald-600">{Math.round(progress)}%</span><Progress value={progress} className="h-1.5 flex-1 bg-slate-100" /></div>
                </div>
                <div className="flex items-center gap-4 border-slate-100 lg:border-r lg:px-10">
                  <div className="flex h-10 w-10 items-center justify-center rounded-full bg-emerald-50 text-emerald-600"><Zap className="h-5 w-5" /></div>
                  <div>
                    <p className="font-semibold text-slate-900">Sales Automation Ready</p>
                    <p className="mt-1 text-xs leading-4 text-slate-500">Lead, deal, task, proposal, subscription, document, AI, and analytics defaults are prepared when you finish.</p>
                  </div>
                </div>
                <div className="border-slate-100 text-center lg:border-r"><p className="text-xl font-semibold text-emerald-600">{payload.modules.length}</p><p className="mt-1 text-sm text-slate-500">Modules selected</p></div>
                <div className="text-center"><p className="text-xl font-semibold text-sky-500">{selectedFeatures.length}</p><p className="mt-1 text-sm text-slate-500">Features enabled</p></div>
              </div>
            </div>

            <div className="mt-5"><h2 className="text-xl font-semibold tracking-[-0.01em] text-slate-950">{currentStep.title}</h2><p className="mt-1.5 text-xs text-slate-500">{currentStep.subtitle}</p></div>

            <AnimatePresence mode="wait">
              <motion.div key={currentStep.id} initial={{ opacity: 0, y: 14 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0, y: -10 }} transition={{ duration: 0.22, ease: "easeOut" }} className="py-4">
                {currentStep.id === "workspace" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput label="Workspace Name *" value={payload.companyProfile?.workspaceName || ""} placeholder="Zodo Sales" onChange={(value) => updatePayload((current) => ({ ...current, companyProfile: { ...current.companyProfile, workspaceName: value } }))} />
                    <TextInput label="Website / Domain" value={payload.companyProfile?.website || ""} placeholder="zodo.ca" onChange={(value) => updatePayload((current) => ({ ...current, companyProfile: { ...current.companyProfile, website: value } }))} />
                    <SelectInput label="Industry" value={payload.companyProfile?.industry || "sales_crm"} options={INDUSTRY_OPTIONS} onChange={(value) => updatePayload((current) => ({ ...current, companyProfile: { ...current.companyProfile, industry: value } }))} />
                    <SelectInput label="Business Type" value={payload.companyProfile?.businessType || "b2b_saas"} options={BUSINESS_TYPE_OPTIONS} onChange={(value) => updatePayload((current) => ({ ...current, companyProfile: { ...current.companyProfile, businessType: value } }))} />
                    <SelectInput label="Company Size" value={payload.companyProfile?.companySize || "1-10"} options={COMPANY_SIZE_OPTIONS.map((value) => ({ value, label: value }))} onChange={(value) => updatePayload((current) => ({ ...current, companyProfile: { ...current.companyProfile, companySize: value } }))} />
                    <TextInput label="Country" value={payload.companyProfile?.country || ""} placeholder="Canada" onChange={(value) => updatePayload((current) => ({ ...current, companyProfile: { ...current.companyProfile, country: value } }))} />
                    <SelectInput label="Currency" value={payload.settings.currency} options={CURRENCY_OPTIONS} onChange={(value) => updatePayload((current) => ({ ...current, settings: { ...current.settings, currency: value as OnboardingPayload["settings"]["currency"] } }))} />
                    <SelectInput label="Date Format" value={payload.settings.dateFormat} options={DATE_FORMAT_OPTIONS} onChange={(value) => updatePayload((current) => ({ ...current, settings: { ...current.settings, dateFormat: value as OnboardingPayload["settings"]["dateFormat"] } }))} />
                    <div className="space-y-2 md:col-span-2">
                      <Label>Timezone</Label>
                      <Input value={payload.settings.timezone} onChange={(event) => updatePayload((current) => ({ ...current, settings: { ...current.settings, timezone: event.target.value } }))} className="h-10 rounded-xl" />
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "modules" ? (
                  <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
                    {allowedModules.map((moduleId, moduleIndex) => {
                      const module = ONBOARDING_MODULES[moduleId];
                      const enabled = payload.modules.includes(moduleId);
                      return (
                        <button key={moduleId} type="button" onClick={() => updatePayload((current) => ({ ...current, modules: enabled ? current.modules.filter((value) => value !== moduleId) : [...current.modules, moduleId] }))} className={cn("group relative min-h-[112px] rounded-xl border bg-white p-4 text-left transition-all hover:-translate-y-0.5 hover:shadow-[0_18px_45px_rgba(15,23,42,0.08)]", enabled ? "border-emerald-200 shadow-[0_12px_34px_rgba(15,23,42,0.05)]" : "border-slate-200")}>
                          <div className="flex items-start gap-4">
                            <div className={cn("flex h-9 w-9 shrink-0 items-center justify-center rounded-xl bg-gradient-to-br text-white shadow-lg", MODULE_CARD_TONES[moduleIndex % MODULE_CARD_TONES.length])}><Layers3 className="h-4 w-4" /></div>
                            <div className="min-w-0 pr-5"><p className="font-semibold text-slate-950">{module.label}</p><p className="mt-1 text-xs leading-4 text-slate-500">{module.description}</p></div>
                          </div>
                          {enabled ? <span className="absolute right-3 top-3 flex h-4 w-4 items-center justify-center rounded-md bg-emerald-500 text-white"><Check className="h-3 w-3" /></span> : null}
                        </button>
                      );
                    })}
                  </div>
                ) : null}

                {currentStep.id === "pipeline" ? (
                  <div className="space-y-4">
                    <TextInput label="Default Pipeline" value={payload.salesPreferences?.defaultPipeline || ""} placeholder="Sales CRM Pipeline" onChange={(value) => updatePayload((current) => ({ ...current, salesPreferences: { ...current.salesPreferences, defaultPipeline: value } }))} />
                    <OptionCards title="Lead Stages" values={DEFAULT_LEAD_STAGE_OPTIONS} selected={payload.salesPreferences?.leadStages || []} onToggle={(value) => updatePayload((current) => ({ ...current, salesPreferences: { ...current.salesPreferences, leadStages: toggleValue(current.salesPreferences?.leadStages || [], value) } }))} />
                    <OptionCards title="Deal Stages" values={DEFAULT_DEAL_STAGE_OPTIONS} selected={payload.salesPreferences?.dealStages || []} onToggle={(value) => updatePayload((current) => ({ ...current, salesPreferences: { ...current.salesPreferences, dealStages: toggleValue(current.salesPreferences?.dealStages || [], value) } }))} />
                    <SelectInput label="Task Follow-up Cadence" value={payload.salesPreferences?.taskCadence || "daily"} options={[{ value: "daily", label: "Daily" }, { value: "every_2_days", label: "Every 2 days" }, { value: "weekly", label: "Weekly" }]} onChange={(value) => updatePayload((current) => ({ ...current, salesPreferences: { ...current.salesPreferences, taskCadence: value } }))} />
                    {plan !== "basic" ? (
                      <div className="grid gap-3 md:grid-cols-2">
                        <SelectInput label="Default Deal Status" value={payload.projectSettings?.defaultProjectStatus || "not_started"} options={PROJECT_STATUS_OPTIONS} onChange={(value) => updatePayload((current) => ({ ...current, projectSettings: { defaultProjectStatus: value as any, taskStatuses: current.projectSettings?.taskStatuses || ["pending", "in_progress", "done"] } }))} />
                        <OptionCards compact title="Task Statuses" values={TASK_STATUS_OPTIONS.map((option) => option.value)} labels={Object.fromEntries(TASK_STATUS_OPTIONS.map((option) => [option.value, option.label]))} selected={payload.projectSettings?.taskStatuses || []} onToggle={(value) => updatePayload((current) => ({ ...current, projectSettings: { defaultProjectStatus: current.projectSettings?.defaultProjectStatus || "not_started", taskStatuses: toggleValue(current.projectSettings?.taskStatuses || [], value as any) } }))} />
                      </div>
                    ) : null}
                  </div>
                ) : null}

                {currentStep.id === "team" ? (
                  <div className="space-y-4">
                    {payload.teamInvites.map((invite, index) => {
                      const showInviteError = showValidation && invite.email.trim().length > 0 && !EMAIL_REGEX.test(invite.email.trim());
                      return (
                        <div key={`${index}-${invite.role}`} className="grid gap-3 rounded-xl border border-slate-200 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1fr)_200px]">
                          <div className="space-y-2">
                            <Label>Teammate Email</Label>
                            <Input value={invite.email} onChange={(event) => updatePayload((current) => ({ ...current, teamInvites: current.teamInvites.map((item, rowIndex) => rowIndex === index ? { ...item, email: event.target.value } : item) }))} placeholder="name@zodo.ca" className={cn("h-10 rounded-xl", showInviteError && "border-rose-300 focus-visible:ring-rose-200")} />
                            {showInviteError ? <p className="text-sm text-rose-600">Enter a valid email address.</p> : null}
                          </div>
                          <SelectInput label="Role" value={invite.role} options={TEAM_ROLE_OPTIONS} onChange={(value) => updatePayload((current) => ({ ...current, teamInvites: current.teamInvites.map((item, rowIndex) => rowIndex === index ? { ...item, role: value as typeof invite.role } : item) }))} />
                        </div>
                      );
                    })}
                    <Button type="button" variant="outline" className="h-10 rounded-xl" onClick={() => updatePayload((current) => ({ ...current, teamInvites: [...current.teamInvites, { email: "", role: "employee" }] }))}>Add teammate</Button>
                  </div>
                ) : null}

                {currentStep.id === "finance" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    <TextInput label="Proposal Prefix" value={payload.financePreferences?.proposalPrefix || ""} placeholder="PROP-" onChange={(value) => updatePayload((current) => ({ ...current, financePreferences: { ...current.financePreferences, proposalPrefix: value } }))} />
                    <TextInput label="Invoice Prefix" value={payload.financePreferences?.invoicePrefix || ""} placeholder="INV-" onChange={(value) => updatePayload((current) => ({ ...current, financePreferences: { ...current.financePreferences, invoicePrefix: value } }))} />
                    <TextInput label="Payment Terms Days" type="number" value={String(payload.financePreferences?.paymentTermsDays || 14)} onChange={(value) => updatePayload((current) => ({ ...current, financePreferences: { ...current.financePreferences, paymentTermsDays: Number(value) || 14 } }))} />
                    <SelectInput label="Default Billing Cycle" value={payload.financePreferences?.defaultBillingCycle || "monthly"} options={[{ value: "monthly", label: "Monthly" }, { value: "annual", label: "Annual" }]} onChange={(value) => updatePayload((current) => ({ ...current, financePreferences: { ...current.financePreferences, defaultBillingCycle: value } }))} />
                  </div>
                ) : null}

                {currentStep.id === "documents" ? (
                  <div className="space-y-4">
                    <OptionCards title="Default Document Folders" values={DEFAULT_FOLDER_OPTIONS} selected={payload.documentPreferences?.defaultFolders || []} onToggle={(value) => updatePayload((current) => ({ ...current, documentPreferences: { ...current.documentPreferences, defaultFolders: toggleValue(current.documentPreferences?.defaultFolders || [], value) } }))} />
                    <div className="grid gap-3 md:grid-cols-2">
                      <TogglePanel label="Require document categories" checked={payload.documentPreferences?.requireFileCategories !== false} onChange={(checked) => updatePayload((current) => ({ ...current, documentPreferences: { ...current.documentPreferences, requireFileCategories: checked } }))} />
                      <TogglePanel label="Allow client-visible files" checked={payload.documentPreferences?.enableClientVisibleFiles === true} onChange={(checked) => updatePayload((current) => ({ ...current, documentPreferences: { ...current.documentPreferences, enableClientVisibleFiles: checked } }))} />
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "intelligence" ? (
                  <div className="space-y-4">
                    <div className="grid gap-3 md:grid-cols-2">
                      <TogglePanel label="AI Sales Assistant" checked={payload.modules.includes("aiAssistant")} onChange={(checked) => updatePayload((current) => ({ ...current, modules: checked ? Array.from(new Set([...current.modules, "aiAssistant" as OnboardingModuleId])) : current.modules.filter((module) => module !== "aiAssistant") }))} />
                      <TogglePanel label="Advanced Analytics" checked={payload.modules.includes("analytics")} onChange={(checked) => updatePayload((current) => ({ ...current, modules: checked ? Array.from(new Set([...current.modules, "analytics" as OnboardingModuleId])) : current.modules.filter((module) => module !== "analytics") }))} />
                    </div>
                    {plan === "premium" ? <OptionCards title="Analytics Focus" values={ANALYTICS_METRIC_OPTIONS.map((option) => option.value)} labels={Object.fromEntries(ANALYTICS_METRIC_OPTIONS.map((option) => [option.value, option.label]))} selected={payload.analyticsSettings?.metrics || []} onToggle={(value) => updatePayload((current) => ({ ...current, analyticsSettings: { metrics: toggleValue(current.analyticsSettings?.metrics || [], value as any) } }))} /> : null}
                  </div>
                ) : null}

                {currentStep.id === "review" ? <ReviewPanel payload={payload} selectedFeatures={selectedFeatures.length} /> : null}

                {currentStep.id === "complete" ? (
                  <div className="flex min-h-[360px] flex-col items-center justify-center text-center">
                    <div className="flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500 text-white shadow-[0_18px_45px_rgba(16,185,129,0.22)]"><CheckCircle2 className="h-8 w-8" /></div>
                    <h2 className="mt-5 text-2xl font-semibold text-slate-950">Your Sales CRM is ready</h2>
                    <p className="mt-2 max-w-xl text-sm leading-6 text-slate-500">Your modules, pipeline, team defaults, billing preferences, documents, AI, and analytics setup are ready.</p>
                    <Button className="mt-6 h-11 rounded-xl bg-emerald-600 px-6 text-white hover:bg-emerald-700" onClick={() => navigate("/dashboard", { replace: true })}>Go to dashboard</Button>
                  </div>
                ) : null}
              </motion.div>
            </AnimatePresence>

            {showValidation && currentStepError ? <div className="mb-3 rounded-xl border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700">{currentStepError}</div> : null}

            {currentStep.id !== "complete" ? (
              <div className="sticky bottom-0 -mx-4 border-t border-slate-100 bg-white/90 px-4 py-3 backdrop-blur sm:-mx-6 sm:px-6">
                <div className="flex items-center justify-between gap-3">
                  <Button type="button" variant="outline" className="h-10 rounded-xl border-slate-200" onClick={goBack} disabled={stepIndex === 0 || isSaving}><ArrowLeft className="mr-2 h-4 w-4" />Back</Button>
                  <Button type="button" className="h-10 rounded-xl bg-emerald-600 px-5 text-white hover:bg-emerald-700" onClick={goNext} disabled={isSaving}>{isSaving ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : null}{stepIndex === steps.length - 2 ? "Finish setup" : "Continue"}{!isSaving ? <ArrowRight className="ml-2 h-4 w-4" /> : null}</Button>
                </div>
              </div>
            ) : null}
          </div>
        </section>
      </div>
    </div>
  );
}

function toggleValue<T extends string>(values: T[], value: T): T[] {
  return values.includes(value) ? values.filter((item) => item !== value) : [...values, value];
}

function TextInput({ label, value, placeholder, type = "text", onChange }: { label: string; value: string; placeholder?: string; type?: string; onChange: (value: string) => void }) {
  return <div className="space-y-2"><Label>{label}</Label><Input type={type} value={value} placeholder={placeholder} onChange={(event) => onChange(event.target.value)} className="h-10 rounded-xl" /></div>;
}

function SelectInput({ label, value, options, onChange }: { label: string; value: string; options: readonly { value: string; label: string }[]; onChange: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger className="h-10 rounded-xl"><SelectValue /></SelectTrigger>
        <SelectContent>{options.map((option) => <SelectItem key={option.value} value={option.value}>{option.label}</SelectItem>)}</SelectContent>
      </Select>
    </div>
  );
}

function OptionCards({ title, values, labels, selected, compact, onToggle }: { title: string; values: string[]; labels?: Record<string, string>; selected: string[]; compact?: boolean; onToggle: (value: string) => void }) {
  return (
    <div className="space-y-2">
      <Label>{title}</Label>
      <div className={cn("grid gap-3", compact ? "grid-cols-1" : "md:grid-cols-3")}>
        {values.map((value) => {
          const active = selected.includes(value);
          return (
            <button key={value} type="button" onClick={() => onToggle(value)} className={cn("rounded-xl border px-4 py-3 text-left text-sm font-medium transition-all", active ? "border-slate-950 bg-slate-950 text-white" : "border-slate-200 bg-white text-slate-700 hover:border-slate-300")}>
              {labels?.[value] || value}
            </button>
          );
        })}
      </div>
    </div>
  );
}

function TogglePanel({ label, checked, onChange }: { label: string; checked: boolean; onChange: (checked: boolean) => void }) {
  return <label className="flex items-center justify-between gap-4 rounded-xl border border-slate-200 bg-slate-50/70 p-4"><span className="text-sm font-medium text-slate-700">{label}</span><Switch checked={checked} onCheckedChange={onChange} /></label>;
}

function ReviewPanel({ payload, selectedFeatures }: { payload: OnboardingPayload; selectedFeatures: number }) {
  const rows = [
    ["Workspace", payload.companyProfile?.workspaceName || "Sales CRM"],
    ["Industry", payload.companyProfile?.industry || "Sales CRM"],
    ["Company Size", payload.companyProfile?.companySize || "1-10"],
    ["Modules", `${payload.modules.length} selected`],
    ["Enabled Features", `${selectedFeatures} features`],
    ["Pipeline", payload.salesPreferences?.defaultPipeline || "Sales CRM Pipeline"],
    ["Deal Stages", `${payload.salesPreferences?.dealStages?.length || 0} stages`],
    ["Team Invites", `${payload.teamInvites.filter((invite) => invite.email.trim()).length} pending`],
    ["Billing", `${payload.financePreferences?.defaultBillingCycle || "monthly"} / ${payload.financePreferences?.paymentTermsDays || 14} day terms`],
    ["Documents", `${payload.documentPreferences?.defaultFolders?.length || 0} folders`],
  ];
  return (
    <div className="grid gap-3 md:grid-cols-2">
      {rows.map(([label, value]) => (
        <Card key={label} className="border-slate-200">
          <CardContent className="p-4">
            <p className="text-xs font-semibold uppercase tracking-[0.22em] text-slate-400">{label}</p>
            <p className="mt-2 text-sm font-semibold text-slate-900">{value}</p>
          </CardContent>
        </Card>
      ))}
      <div className="md:col-span-2 rounded-xl border border-emerald-100 bg-emerald-50 p-4 text-sm leading-6 text-emerald-800">
        <Sparkles className="mr-2 inline h-4 w-4" />
        When you finish, the CRM will enable selected modules and store these Sales CRM setup preferences for your tenant.
      </div>
    </div>
  );
}
