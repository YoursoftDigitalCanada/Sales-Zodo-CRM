import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Bot,
  Check,
  CheckCircle2,
  FolderKanban,
  Layers3,
  Loader2,
  Rocket,
  Settings2,
  Sparkles,
  Users2,
} from "lucide-react";

import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
  AI_BUSINESS_TYPE_OPTIONS,
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
import {
  completeTenantOnboarding,
  getTenantOnboarding,
} from "@/features/onboarding/services/onboarding-service";
import logo from "../Images/Logo/logo.png";

type StepId = "modules" | "settings" | "team" | "projects" | "ai" | "analytics" | "complete";

interface WizardStep {
  id: StepId;
  title: string;
  subtitle: string;
  icon: typeof Layers3;
  optional?: boolean;
}

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

const STEP_META: Record<Exclude<StepId, "complete">, WizardStep> = {
  modules: {
    id: "modules",
    title: "Module Setup",
    subtitle: "Turn on the tools this workspace should launch with.",
    icon: Layers3,
  },
  settings: {
    id: "settings",
    title: "Basic Settings",
    subtitle: "Set the defaults your team will see everywhere.",
    icon: Settings2,
  },
  team: {
    id: "team",
    title: "Team Setup",
    subtitle: "Invite teammates now or skip and do it later.",
    icon: Users2,
    optional: true,
  },
  projects: {
    id: "projects",
    title: "Project Workflow",
    subtitle: "Configure your default delivery cadence.",
    icon: FolderKanban,
  },
  ai: {
    id: "ai",
    title: "AI Setup",
    subtitle: "Tune your AI estimator for the way you work.",
    icon: Bot,
  },
  analytics: {
    id: "analytics",
    title: "Analytics Setup",
    subtitle: "Choose the numbers that matter most to your team.",
    icon: BarChart3,
  },
};

const PLAN_ACCENTS: Record<PlanKey, { badge: string; tone: string; highlight: string }> = {
  basic: {
    badge: "Basic Plan",
    tone: "text-cyan-700",
    highlight: "from-cyan-500/15 via-sky-500/10 to-white",
  },
  standard: {
    badge: "Standard Plan",
    tone: "text-emerald-700",
    highlight: "from-emerald-500/15 via-cyan-500/10 to-white",
  },
  premium: {
    badge: "Premium Plan",
    tone: "text-fuchsia-700",
    highlight: "from-fuchsia-500/15 via-cyan-500/10 to-white",
  },
};

function detectLocaleSettings(): OnboardingPayload["settings"] {
  const timezone =
    Intl.DateTimeFormat().resolvedOptions().timeZone || "UTC";
  const locale = typeof navigator !== "undefined"
    ? navigator.languages?.find(Boolean) || navigator.language || "en-US"
    : "en-US";
  const country = locale.split("-").pop()?.toUpperCase() || "US";

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

  const dateFormat = country === "US"
    ? "MM/DD/YYYY"
    : country === "JP" || country === "CN"
      ? "YYYY-MM-DD"
      : "DD/MM/YYYY";

  return {
    currency: currencyByCountry[country] || "USD",
    timezone,
    dateFormat,
  };
}

function sanitizePayload(plan: PlanKey, payload: OnboardingPayload): OnboardingPayload {
  const modules = Array.from(
    new Set(
      payload.modules.filter((moduleId): moduleId is OnboardingModuleId =>
        getAllowedOnboardingModules(plan).includes(moduleId)
      )
    )
  );

  const teamInvites = payload.teamInvites
    .map((invite) => ({
      email: invite.email.trim().toLowerCase(),
      role: invite.role,
    }))
    .filter((invite) => invite.email.length > 0);

  return {
    modules,
    settings: {
      currency: payload.settings.currency,
      timezone: payload.settings.timezone.trim(),
      dateFormat: payload.settings.dateFormat,
    },
    teamInvites,
    ...(plan !== "basic"
      ? {
          projectSettings: {
            defaultProjectStatus:
              payload.projectSettings?.defaultProjectStatus || "not_started",
            taskStatuses:
              payload.projectSettings?.taskStatuses || ["pending", "in_progress", "done"],
          },
        }
      : {}),
    ...(plan === "premium"
      ? {
          aiSettings: {
            businessType: payload.aiSettings?.businessType || "roofing",
            ...(payload.aiSettings?.materialType?.trim()
              ? { materialType: payload.aiSettings.materialType.trim() }
              : {}),
            ...(payload.aiSettings?.costingMethod?.trim()
              ? { costingMethod: payload.aiSettings.costingMethod.trim() }
              : {}),
          },
          analyticsSettings: {
            metrics: payload.analyticsSettings?.metrics || ["revenue", "leads", "projects", "performance"],
          },
        }
      : {}),
  };
}

function buildSteps(plan: PlanKey): WizardStep[] {
  return [
    STEP_META.modules,
    STEP_META.settings,
    STEP_META.team,
    ...(plan !== "basic" ? [STEP_META.projects] : []),
    ...(plan === "premium" ? [STEP_META.ai, STEP_META.analytics] : []),
    {
      id: "complete",
      title: "Workspace Ready",
      subtitle: "Your workspace is configured and ready to use.",
      icon: CheckCircle2,
    },
  ];
}

function mergeIncomingPayload(plan: PlanKey, incoming?: OnboardingPayload): OnboardingPayload {
  const defaults = getDefaultOnboardingPayload(plan);
  const localeDefaults = detectLocaleSettings();

  return {
    ...defaults,
    ...(incoming || {}),
    modules: incoming?.modules?.length ? incoming.modules : defaults.modules,
    settings: {
      ...localeDefaults,
      ...defaults.settings,
      ...(incoming?.settings || {}),
    },
    teamInvites:
      incoming?.teamInvites?.length
        ? incoming.teamInvites
        : defaults.teamInvites,
    ...(plan !== "basic"
      ? {
          projectSettings: {
            ...defaults.projectSettings,
            ...(incoming?.projectSettings || {}),
            taskStatuses:
              incoming?.projectSettings?.taskStatuses?.length
                ? incoming.projectSettings.taskStatuses
                : defaults.projectSettings?.taskStatuses || [],
          },
        }
      : {}),
    ...(plan === "premium"
      ? {
          aiSettings: {
            ...defaults.aiSettings,
            ...(incoming?.aiSettings || {}),
          },
          analyticsSettings: {
            ...defaults.analyticsSettings,
            ...(incoming?.analyticsSettings || {}),
            metrics:
              incoming?.analyticsSettings?.metrics?.length
                ? incoming.analyticsSettings.metrics
                : defaults.analyticsSettings?.metrics || [],
          },
        }
      : {}),
  };
}

function getStepError(stepId: StepId, payload: OnboardingPayload): string | null {
  switch (stepId) {
    case "modules":
      return payload.modules.length > 0
        ? null
        : "Select at least one module to continue.";
    case "settings":
      return payload.settings.currency && payload.settings.timezone && payload.settings.dateFormat
        ? null
        : "Currency, timezone, and date format are required.";
    case "team": {
      const invalidInvite = payload.teamInvites.some((invite) => {
        const email = invite.email.trim();
        return email.length > 0 && !EMAIL_REGEX.test(email);
      });
      return invalidInvite ? "Please fix invalid teammate email addresses." : null;
    }
    case "projects":
      return payload.projectSettings?.defaultProjectStatus
        ? null
        : "Choose a default project status.";
    case "ai":
      return payload.aiSettings?.businessType
        ? null
        : "Select the business type that best fits your estimator.";
    case "analytics":
      return payload.analyticsSettings?.metrics?.length
        ? null
        : "Select at least one metric to track.";
    default:
      return null;
  }
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
  const steps = useMemo(() => buildSteps(plan), [plan]);
  const currentStep = steps[stepIndex] || steps[0];
  const progress = steps.length > 1 ? (stepIndex / (steps.length - 1)) * 100 : 0;
  const selectedFeatures = useMemo(
    () => resolveEnabledFeaturePreview(payload?.modules || []),
    [payload?.modules]
  );
  const allowedModules = useMemo(
    () => getAllowedOnboardingModules(plan),
    [plan]
  );
  const currentStepError = payload ? getStepError(currentStep?.id || "modules", payload) : null;

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

        if (!data?.tenant || cancelled) {
          return;
        }

        setTenant(data.tenant);
        setPayload(mergeIncomingPayload(data.tenant.plan, data.onboarding));
        setAvailableFeatures(normalizeEnabledFeatures(data.tenant.availableFeatures));
        setOnboardingCompleted(data.tenant.onboardingCompleted === true);

        if (data.tenant.onboardingCompleted) {
          setEnabledFeatures(normalizeEnabledFeatures(data.tenant.enabledFeatures));
          updateStoredTenant(data.tenant);
          setStepIndex(buildSteps(data.tenant.plan).length - 1);
        }
      } catch (error: any) {
        if (!cancelled) {
          toast({
            title: "Unable to load onboarding",
            description:
              error?.response?.data?.message ||
              error?.message ||
              "Please refresh and try again.",
            variant: "destructive",
          });
        }
      } finally {
        if (!cancelled) {
          setIsLoading(false);
        }
      }
    };

    void load();

    return () => {
      cancelled = true;
    };
  }, [navigate, toast]);

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

        if (!data?.tenant) {
          throw new Error(response?.message || "Onboarding could not be completed.");
        }

        setTenant(data.tenant);
        setPayload(mergeIncomingPayload(data.tenant.plan, data.onboarding));
        setAvailableFeatures(normalizeEnabledFeatures(data.tenant.availableFeatures));
        setEnabledFeatures(normalizeEnabledFeatures(data.tenant.enabledFeatures));
        clearOnboardingData();
        setOnboardingCompleted(true);
        updateStoredTenant(data.tenant);
        setShowValidation(false);
        setStepIndex(steps.length - 1);

        toast({
          title: "Workspace ready",
          description: "Your CRM is configured and ready to go.",
        });
      } catch (error: any) {
        toast({
          title: "Could not finish onboarding",
          description:
            error?.response?.data?.message ||
            error?.message ||
            "Please try again.",
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
          <Loader2 className="h-4 w-4 animate-spin text-cyan-600" />
          Loading your workspace setup...
        </div>
      </div>
    );
  }

  const accent = PLAN_ACCENTS[plan];
  const stepCountLabel =
    currentStep.id === "complete"
      ? "Complete"
      : `Step ${Math.min(stepIndex + 1, steps.length - 1)} of ${steps.length - 1}`;

  return (
    <div className="min-h-screen bg-[radial-gradient(circle_at_top_left,rgba(6,182,212,0.12),transparent_32%),radial-gradient(circle_at_bottom_right,rgba(168,85,247,0.10),transparent_30%),linear-gradient(180deg,#f8fafc_0%,#eef6ff_100%)] px-4 py-6 sm:px-6 lg:px-10 lg:py-10">
      <div className="mx-auto max-w-7xl">
        <div className="mb-6 flex items-center justify-between gap-4 rounded-[28px] border border-white/70 bg-white/80 px-5 py-4 shadow-[0_30px_80px_rgba(15,23,42,0.08)] backdrop-blur">
          <div className="flex items-center gap-3">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-slate-950 shadow-lg shadow-slate-950/15">
              <img src={logo} alt="Zodo CRM" className="h-7 w-auto" />
            </div>
            <div>
              <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                Zodo CRM
              </p>
              <h1 className="text-lg font-semibold text-slate-950">
                Configure your workspace
              </h1>
            </div>
          </div>
          <div className="flex items-center gap-2">
            <Badge className={cn("border-0 bg-white", accent.tone)}>
              {accent.badge}
            </Badge>
            <Badge variant="secondary" className="bg-slate-100 text-slate-600">
              Upgrade anytime
            </Badge>
          </div>
        </div>

        <div className="grid gap-6 lg:grid-cols-[340px_minmax(0,1fr)]">
          <aside className="space-y-5">
            <Card className={cn("overflow-hidden border-white/80 bg-gradient-to-br", accent.highlight)}>
              <CardContent className="space-y-5 p-6">
                <div className="space-y-2">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    {stepCountLabel}
                  </p>
                  <h2 className="text-2xl font-semibold text-slate-950">
                    {currentStep.title}
                  </h2>
                  <p className="text-sm leading-6 text-slate-600">
                    {currentStep.subtitle}
                  </p>
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between text-sm text-slate-500">
                    <span>Progress</span>
                    <span>{Math.round(progress)}%</span>
                  </div>
                  <Progress value={progress} className="h-2 bg-slate-200/70" />
                </div>

                <div className="rounded-2xl border border-white/70 bg-white/80 p-4">
                  <p className="text-xs font-semibold uppercase tracking-[0.24em] text-slate-400">
                    Automation Ready
                  </p>
                  <p className="mt-2 text-sm leading-6 text-slate-600">
                    Default stages, statuses, invoice settings, and module access
                    will be prepared as soon as you finish.
                  </p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                    <p className="text-2xl font-semibold text-slate-950">
                      {payload.modules.length}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Modules selected</p>
                  </div>
                  <div className="rounded-2xl border border-white/70 bg-white/75 p-4">
                    <p className="text-2xl font-semibold text-slate-950">
                      {selectedFeatures.length}
                    </p>
                    <p className="mt-1 text-sm text-slate-500">Features enabled</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-white/80 bg-white/80">
              <CardContent className="space-y-3 p-5">
                {steps.map((step, index) => {
                  const Icon = step.icon;
                  const isActive = index === stepIndex;
                  const isPast = index < stepIndex;

                  return (
                    <div
                      key={step.id}
                      className={cn(
                        "flex items-start gap-3 rounded-2xl border px-4 py-3 transition-all",
                        isActive
                          ? "border-cyan-200 bg-cyan-50/80"
                          : isPast
                            ? "border-emerald-100 bg-emerald-50/80"
                            : "border-slate-200/80 bg-white"
                      )}
                    >
                      <div
                        className={cn(
                          "flex h-10 w-10 items-center justify-center rounded-2xl",
                          isPast
                            ? "bg-emerald-500 text-white"
                            : isActive
                              ? "bg-slate-950 text-white"
                              : "bg-slate-100 text-slate-500"
                        )}
                      >
                        {isPast ? <Check className="h-4 w-4" /> : <Icon className="h-4 w-4" />}
                      </div>
                      <div className="min-w-0">
                        <p className="text-sm font-semibold text-slate-900">
                          {step.title}
                        </p>
                        <p className="text-sm leading-6 text-slate-500">
                          {step.subtitle}
                        </p>
                        {step.optional ? (
                          <p className="mt-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-slate-400">
                            Optional
                          </p>
                        ) : null}
                      </div>
                    </div>
                  );
                })}
              </CardContent>
            </Card>
          </aside>

          <section className="rounded-[32px] border border-white/70 bg-white/85 shadow-[0_40px_100px_rgba(15,23,42,0.08)] backdrop-blur">
            <div className="border-b border-slate-100 px-6 py-5 sm:px-8">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div>
                  <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-slate-400">
                    {tenant.name}
                  </p>
                  <h3 className="mt-1 text-2xl font-semibold text-slate-950">
                    {currentStep.title}
                  </h3>
                </div>
                <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-600">
                  {tenant.country || "Global workspace"}
                </div>
              </div>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, y: 14 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                transition={{ duration: 0.22, ease: "easeOut" }}
                className="px-6 py-6 sm:px-8 sm:py-8"
              >
                {currentStep.id === "modules" ? (
                  <div className="space-y-6">
                    <div className="rounded-3xl border border-slate-200/80 bg-slate-50/80 p-5">
                      <p className="text-sm text-slate-600">
                        Dashboard, calendar, and tasks are already ready for every workspace.
                        Choose the rest of the modules you want live on day one.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2">
                      {allowedModules.map((moduleId) => {
                        const module = ONBOARDING_MODULES[moduleId];
                        const enabled = payload.modules.includes(moduleId);

                        return (
                          <Card
                            key={moduleId}
                            className={cn(
                              "border transition-all",
                              enabled
                                ? "border-slate-950 bg-slate-950 text-white shadow-lg shadow-slate-950/10"
                                : "border-slate-200 bg-white hover:border-slate-300",
                              module.highlight && enabled
                                ? "bg-[radial-gradient(circle_at_top_left,rgba(34,211,238,0.22),transparent_35%),linear-gradient(145deg,#0f172a,#111827)]"
                                : ""
                            )}
                          >
                            <CardContent className="p-5">
                              <div className="flex items-start justify-between gap-3">
                                <div>
                                  <div className="flex items-center gap-2">
                                    <p className="text-base font-semibold">
                                      {module.label}
                                    </p>
                                    {module.highlight ? (
                                      <Badge
                                        className={cn(
                                          "border-0",
                                          enabled
                                            ? "bg-white/15 text-white"
                                            : "bg-fuchsia-100 text-fuchsia-700"
                                        )}
                                      >
                                        AI
                                      </Badge>
                                    ) : null}
                                  </div>
                                  <p
                                    className={cn(
                                      "mt-2 text-sm leading-6",
                                      enabled ? "text-slate-200" : "text-slate-600"
                                    )}
                                  >
                                    {module.description}
                                  </p>
                                </div>
                                <Switch
                                  checked={enabled}
                                  onCheckedChange={(checked) =>
                                    setPayload((current) =>
                                      current
                                        ? {
                                            ...current,
                                            modules: checked
                                              ? [...current.modules, moduleId]
                                              : current.modules.filter((value) => value !== moduleId),
                                          }
                                        : current
                                    )
                                  }
                                />
                              </div>

                              <div
                                className={cn(
                                  "mt-4 flex flex-wrap gap-2",
                                  enabled ? "text-slate-100" : "text-slate-500"
                                )}
                              >
                                {module.featureIds.map((feature) => (
                                  <span
                                    key={feature}
                                    className={cn(
                                      "rounded-full border px-3 py-1 text-xs font-medium capitalize",
                                      enabled
                                        ? "border-white/15 bg-white/10"
                                        : "border-slate-200 bg-slate-50"
                                    )}
                                  >
                                    {feature.replace(/([A-Z])/g, " $1")}
                                  </span>
                                ))}
                              </div>
                            </CardContent>
                          </Card>
                        );
                      })}
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "settings" ? (
                  <div className="grid gap-5 md:grid-cols-3">
                    <div className="space-y-2">
                      <Label>Currency</Label>
                      <Select
                        value={payload.settings.currency}
                        onValueChange={(value) =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  settings: { ...current.settings, currency: value as OnboardingPayload["settings"]["currency"] },
                                }
                              : current
                          )
                        }
                      >
                        <SelectTrigger className="h-12 rounded-2xl">
                          <SelectValue placeholder="Select currency" />
                        </SelectTrigger>
                        <SelectContent>
                          {CURRENCY_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Timezone</Label>
                      <Input
                        value={payload.settings.timezone}
                        onChange={(event) =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  settings: { ...current.settings, timezone: event.target.value },
                                }
                              : current
                          )
                        }
                        placeholder="e.g. America/New_York"
                        className="h-12 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2">
                      <Label>Date Format</Label>
                      <Select
                        value={payload.settings.dateFormat}
                        onValueChange={(value) =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  settings: { ...current.settings, dateFormat: value as OnboardingPayload["settings"]["dateFormat"] },
                                }
                              : current
                          )
                        }
                      >
                        <SelectTrigger className="h-12 rounded-2xl">
                          <SelectValue placeholder="Select format" />
                        </SelectTrigger>
                        <SelectContent>
                          {DATE_FORMAT_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "team" ? (
                  <div className="space-y-4">
                    {payload.teamInvites.map((invite, index) => {
                      const showInviteError =
                        showValidation &&
                        invite.email.trim().length > 0 &&
                        !EMAIL_REGEX.test(invite.email.trim());

                      return (
                        <div
                          key={`${index}-${invite.role}`}
                          className="grid gap-3 rounded-3xl border border-slate-200/80 bg-slate-50/70 p-4 md:grid-cols-[minmax(0,1fr)_200px_auto]"
                        >
                          <div className="space-y-2">
                            <Label>Teammate Email</Label>
                            <Input
                              value={invite.email}
                              onChange={(event) =>
                                setPayload((current) =>
                                  current
                                    ? {
                                        ...current,
                                        teamInvites: current.teamInvites.map((item, rowIndex) =>
                                          rowIndex === index
                                            ? { ...item, email: event.target.value }
                                            : item
                                        ),
                                      }
                                    : current
                                )
                              }
                              placeholder="name@company.com"
                              className={cn("h-12 rounded-2xl", showInviteError && "border-rose-300 focus-visible:ring-rose-200")}
                            />
                            {showInviteError ? (
                              <p className="text-sm text-rose-600">
                                Enter a valid email address.
                              </p>
                            ) : null}
                          </div>

                          <div className="space-y-2">
                            <Label>Role</Label>
                            <Select
                              value={invite.role}
                              onValueChange={(value) =>
                                setPayload((current) =>
                                  current
                                    ? {
                                        ...current,
                                        teamInvites: current.teamInvites.map((item, rowIndex) =>
                                          rowIndex === index
                                            ? { ...item, role: value as typeof invite.role }
                                            : item
                                        ),
                                      }
                                    : current
                                )
                              }
                            >
                              <SelectTrigger className="h-12 rounded-2xl">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent>
                                {TEAM_ROLE_OPTIONS.map((option) => (
                                  <SelectItem key={option.value} value={option.value}>
                                    {option.label}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          </div>

                          <div className="flex items-end">
                            <Button
                              type="button"
                              variant="ghost"
                              className="h-12 rounded-2xl text-slate-500"
                              onClick={() =>
                                setPayload((current) =>
                                  current
                                    ? {
                                        ...current,
                                        teamInvites:
                                          current.teamInvites.length === 1
                                            ? [{ email: "", role: "manager" }]
                                            : current.teamInvites.filter((_, rowIndex) => rowIndex !== index),
                                      }
                                    : current
                                )
                              }
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      );
                    })}

                    <div className="flex flex-wrap items-center gap-3">
                      <Button
                        type="button"
                        variant="outline"
                        className="rounded-2xl"
                        onClick={() =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  teamInvites: [...current.teamInvites, { email: "", role: "employee" }],
                                }
                              : current
                          )
                        }
                      >
                        Add another
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        className="rounded-2xl text-slate-500"
                        onClick={() => {
                          setPayload((current) =>
                            current
                              ? { ...current, teamInvites: [{ email: "", role: "manager" }] }
                              : current
                          );
                          setShowValidation(false);
                          setStepIndex((current) => Math.min(current + 1, steps.length - 1));
                        }}
                      >
                        Skip for now
                      </Button>
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "projects" ? (
                  <div className="space-y-6">
                    <div className="space-y-3">
                      <Label>Default Project Status</Label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {PROJECT_STATUS_OPTIONS.map((option) => {
                          const selected =
                            payload.projectSettings?.defaultProjectStatus === option.value;

                          return (
                            <button
                              key={option.value}
                              type="button"
                              onClick={() =>
                                setPayload((current) =>
                                  current
                                    ? {
                                        ...current,
                                        projectSettings: {
                                          defaultProjectStatus: option.value,
                                          taskStatuses:
                                            current.projectSettings?.taskStatuses || ["pending", "in_progress", "done"],
                                        },
                                      }
                                    : current
                                )
                              }
                              className={cn(
                                "rounded-3xl border px-4 py-4 text-left transition-all",
                                selected
                                  ? "border-slate-950 bg-slate-950 text-white"
                                  : "border-slate-200 bg-white text-slate-700 hover:border-slate-300"
                              )}
                            >
                              <p className="font-semibold">{option.label}</p>
                            </button>
                          );
                        })}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Label>Task Statuses</Label>
                      <div className="grid gap-3 md:grid-cols-3">
                        {TASK_STATUS_OPTIONS.map((option) => {
                          const selected =
                            payload.projectSettings?.taskStatuses?.includes(option.value) ?? false;

                          return (
                            <label
                              key={option.value}
                              className="flex items-center gap-3 rounded-2xl border border-slate-200 bg-slate-50/70 px-4 py-3"
                            >
                              <Checkbox
                                checked={selected}
                                onCheckedChange={(checked) =>
                                  setPayload((current) => {
                                    if (!current) return current;
                                    const currentStatuses = current.projectSettings?.taskStatuses || [];
                                    const nextStatuses = checked
                                      ? [...currentStatuses, option.value]
                                      : currentStatuses.filter((status) => status !== option.value);

                                    return {
                                      ...current,
                                      projectSettings: {
                                        defaultProjectStatus:
                                          current.projectSettings?.defaultProjectStatus || "not_started",
                                        taskStatuses: nextStatuses,
                                      },
                                    };
                                  })
                                }
                              />
                              <span className="text-sm font-medium text-slate-700">
                                {option.label}
                              </span>
                            </label>
                          );
                        })}
                      </div>
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "ai" ? (
                  <div className="grid gap-5 md:grid-cols-2">
                    <div className="space-y-2">
                      <Label>Business Type</Label>
                      <Select
                        value={payload.aiSettings?.businessType || "roofing"}
                        onValueChange={(value) =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  aiSettings: {
                                    businessType: value as NonNullable<typeof current.aiSettings>["businessType"],
                                    materialType: current.aiSettings?.materialType || "",
                                    costingMethod: current.aiSettings?.costingMethod || "",
                                  },
                                }
                              : current
                          )
                        }
                      >
                        <SelectTrigger className="h-12 rounded-2xl">
                          <SelectValue placeholder="Select business type" />
                        </SelectTrigger>
                        <SelectContent>
                          {AI_BUSINESS_TYPE_OPTIONS.map((option) => (
                            <SelectItem key={option.value} value={option.value}>
                              {option.label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="space-y-2">
                      <Label>Material Type</Label>
                      <Input
                        value={payload.aiSettings?.materialType || ""}
                        onChange={(event) =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  aiSettings: {
                                    businessType: current.aiSettings?.businessType || "roofing",
                                    materialType: event.target.value,
                                    costingMethod: current.aiSettings?.costingMethod || "",
                                  },
                                }
                              : current
                          )
                        }
                        placeholder="e.g. Asphalt shingle"
                        className="h-12 rounded-2xl"
                      />
                    </div>

                    <div className="space-y-2 md:col-span-2">
                      <Label>Costing Method</Label>
                      <Input
                        value={payload.aiSettings?.costingMethod || ""}
                        onChange={(event) =>
                          setPayload((current) =>
                            current
                              ? {
                                  ...current,
                                  aiSettings: {
                                    businessType: current.aiSettings?.businessType || "roofing",
                                    materialType: current.aiSettings?.materialType || "",
                                    costingMethod: event.target.value,
                                  },
                                }
                              : current
                          )
                        }
                        placeholder="e.g. Per square + labor blend"
                        className="h-12 rounded-2xl"
                      />
                    </div>
                  </div>
                ) : null}

                {currentStep.id === "analytics" ? (
                  <div className="grid gap-3 md:grid-cols-2">
                    {ANALYTICS_METRIC_OPTIONS.map((option) => {
                      const selected =
                        payload.analyticsSettings?.metrics?.includes(option.value) ?? false;

                      return (
                        <label
                          key={option.value}
                          className={cn(
                            "flex items-center gap-3 rounded-3xl border px-4 py-4 transition-all",
                            selected
                              ? "border-slate-950 bg-slate-950 text-white"
                              : "border-slate-200 bg-white text-slate-700"
                          )}
                        >
                          <Checkbox
                            checked={selected}
                            onCheckedChange={(checked) =>
                              setPayload((current) => {
                                if (!current) return current;
                                const metrics = current.analyticsSettings?.metrics || [];
                                const nextMetrics = checked
                                  ? [...metrics, option.value]
                                  : metrics.filter((metric) => metric !== option.value);

                                return {
                                  ...current,
                                  analyticsSettings: {
                                    metrics: nextMetrics,
                                  },
                                };
                              })
                            }
                          />
                          <div>
                            <p className="font-semibold">{option.label}</p>
                            <p className={cn("text-sm", selected ? "text-slate-200" : "text-slate-500")}>
                              Include {option.label.toLowerCase()} in your launch dashboard.
                            </p>
                          </div>
                        </label>
                      );
                    })}
                  </div>
                ) : null}

                {currentStep.id === "complete" ? (
                  <div className="space-y-6">
                    <div className="rounded-[28px] border border-emerald-200 bg-[radial-gradient(circle_at_top_left,rgba(16,185,129,0.18),transparent_35%),linear-gradient(145deg,#f0fdf4,#ffffff)] p-6">
                      <div className="flex items-center gap-3">
                        <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-emerald-500 text-white shadow-lg shadow-emerald-500/20">
                          <Rocket className="h-5 w-5" />
                        </div>
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.28em] text-emerald-600">
                            Workspace Ready
                          </p>
                          <h4 className="text-2xl font-semibold text-slate-950">
                            Your workspace is ready
                          </h4>
                        </div>
                      </div>
                      <p className="mt-4 text-sm leading-7 text-slate-600">
                        Modules, settings, and automation-ready defaults are now live for your team.
                      </p>
                    </div>

                    <div className="grid gap-4 md:grid-cols-4">
                      {[
                        { label: "Modules", value: payload.modules.length },
                        { label: "Features", value: selectedFeatures.length },
                        {
                          label: "Invites",
                          value: payload.teamInvites.filter((invite) => invite.email.trim()).length,
                        },
                        {
                          label: "Metrics",
                          value: payload.analyticsSettings?.metrics?.length || 0,
                        },
                      ].map((item) => (
                        <div key={item.label} className="rounded-3xl border border-slate-200 bg-slate-50/70 p-4">
                          <p className="text-2xl font-semibold text-slate-950">{item.value}</p>
                          <p className="mt-1 text-sm text-slate-500">{item.label}</p>
                        </div>
                      ))}
                    </div>

                    <Button
                      type="button"
                      onClick={() => navigate("/dashboard", { replace: true })}
                      className="h-12 rounded-2xl px-6"
                    >
                      <Rocket className="mr-2 h-4 w-4" />
                      Go to Dashboard
                    </Button>
                  </div>
                ) : null}

                {showValidation && currentStepError ? (
                  <p className="mt-6 text-sm font-medium text-rose-600">
                    {currentStepError}
                  </p>
                ) : null}
              </motion.div>
            </AnimatePresence>

            {currentStep.id !== "complete" ? (
              <div className="flex flex-col gap-3 border-t border-slate-100 px-6 py-5 sm:flex-row sm:items-center sm:justify-between sm:px-8">
                <Button
                  type="button"
                  variant="ghost"
                  className="rounded-2xl"
                  onClick={goBack}
                  disabled={stepIndex === 0 || isSaving}
                >
                  <ArrowLeft className="mr-2 h-4 w-4" />
                  Back
                </Button>

                <div className="flex flex-col items-stretch gap-3 sm:flex-row sm:items-center">
                  <div className="rounded-full border border-slate-200 bg-slate-50 px-4 py-2 text-sm text-slate-500">
                    {selectedFeatures.length} features will launch with this workspace
                  </div>
                  <Button
                    type="button"
                    onClick={() => void goNext()}
                    disabled={Boolean(currentStepError) || isSaving}
                    className="h-12 rounded-2xl px-5"
                  >
                    {isSaving ? (
                      <>
                        <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                        Finalizing
                      </>
                    ) : stepIndex === steps.length - 2 ? (
                      <>
                        Finish Setup
                        <Sparkles className="ml-2 h-4 w-4" />
                      </>
                    ) : (
                      <>
                        Continue
                        <ArrowRight className="ml-2 h-4 w-4" />
                      </>
                    )}
                  </Button>
                </div>
              </div>
            ) : null}
          </section>
        </div>
      </div>
    </div>
  );
}
