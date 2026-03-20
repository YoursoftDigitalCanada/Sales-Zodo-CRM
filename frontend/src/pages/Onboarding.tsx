// src/pages/Onboarding.tsx
// ============================================================================
// DYNAMIC PLAN-ADAPTIVE ONBOARDING WIZARD
// Steps adapt based on tenant plan: Basic (4), Standard (5), Premium (6)
// ============================================================================

import React, { useState, useEffect, useMemo, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  setEnabledFeatures,
  setOnboardingCompleted,
  PLAN_FEATURE_ACCESS,
  type FeatureId,
  type PlanKey,
} from "@/lib/enabled-features";
import { useNavigate, useLocation } from "react-router-dom";
import apiClient from "@/services/api/http-client";
import Confetti from "react-confetti";
import {
  ArrowRight,
  ArrowLeft,
  Check,
  CheckCircle2,
  Loader2,
  Sparkles,
  Rocket,
  Settings,
  Users,
  UserPlus,
  FolderKanban,
  Brain,
  PartyPopper,
  Calendar,
  ClipboardList,
  BarChart3,
  MessageSquare,
  FileText,
  Headphones,
  KanbanSquare,
  Clock,
  FolderOpen,
  Shield,
  PieChart,
  BookOpen,
  Bot,
  Cpu,
  DollarSign,
  Globe,
  Mail,
  Trash2,
  Plus,
  type LucideIcon,
} from "lucide-react";

// ============================================================================
// TYPES
// ============================================================================

type StepId = "modules" | "settings" | "team" | "projects" | "ai" | "complete";

interface StepConfig {
  id: StepId;
  title: string;
  subtitle: string;
  icon: LucideIcon;
  plans: PlanKey[]; // which plans see this step
  optional?: boolean;
}

interface ModuleDef {
  id: FeatureId;
  label: string;
  description: string;
  icon: LucideIcon;
  isAI?: boolean;
  planMin: PlanKey; // minimum plan needed
}

interface TeamMember {
  id: string;
  email: string;
  role: "admin" | "manager" | "employee";
}

interface OnboardingState {
  enabledModules: FeatureId[];
  currency: string;
  timezone: string;
  dateFormat: string;
  team: TeamMember[];
  projectStatuses: string[];
  taskStatuses: string[];
  businessType: string;
  materialType: string;
  costingMethod: string;
}

// ============================================================================
// CONSTANTS
// ============================================================================

const ALL_STEPS: StepConfig[] = [
  { id: "modules", title: "Module Setup", subtitle: "Choose the tools for your workspace", icon: Settings, plans: ["basic", "standard", "premium"] },
  { id: "settings", title: "Basic Settings", subtitle: "Configure your workspace defaults", icon: Globe, plans: ["basic", "standard", "premium"] },
  { id: "team", title: "Team Setup", subtitle: "Invite your team members", icon: Users, plans: ["basic", "standard", "premium"], optional: true },
  { id: "projects", title: "Project & Workflow", subtitle: "Set up project and task statuses", icon: FolderKanban, plans: ["standard", "premium"] },
  { id: "ai", title: "AI Configuration", subtitle: "Configure AI-powered tools", icon: Brain, plans: ["premium"] },
  { id: "complete", title: "All Set!", subtitle: "Your workspace is ready", icon: PartyPopper, plans: ["basic", "standard", "premium"] },
];

const MODULES: ModuleDef[] = [
  { id: "calendar", label: "Calendar", description: "Schedule events and appointments", icon: Calendar, planMin: "basic" },
  { id: "tasks", label: "Tasks", description: "Track to-dos and assignments", icon: ClipboardList, planMin: "basic" },
  { id: "leads", label: "Leads", description: "Capture and manage prospects", icon: BarChart3, planMin: "basic" },
  { id: "clients", label: "Clients", description: "Manage customer relationships", icon: Users, planMin: "basic" },
  { id: "finance", label: "Invoices & Payments", description: "Billing, invoices, and payment tracking", icon: DollarSign, planMin: "basic" },
  { id: "letterbox", label: "Letter Box", description: "Internal messaging and emails", icon: Mail, planMin: "basic" },
  { id: "support", label: "Support", description: "Ticket-based support system", icon: Headphones, planMin: "basic" },
  { id: "chat", label: "Chat", description: "Real-time team communication", icon: MessageSquare, planMin: "standard" },
  { id: "projects", label: "Projects", description: "Full project management suite", icon: FolderKanban, planMin: "standard" },
  { id: "kanban", label: "Kanban Board", description: "Visual task and workflow boards", icon: KanbanSquare, planMin: "standard" },
  { id: "timeTracking", label: "Time Tracking", description: "Log hours and track productivity", icon: Clock, planMin: "standard" },
  { id: "files", label: "File Manager", description: "Store and organize documents", icon: FolderOpen, planMin: "standard" },
  { id: "team", label: "Team Management", description: "Employees, users, roles & permissions", icon: Shield, planMin: "standard" },
  { id: "roofEstimator", label: "AI Roof Estimator", description: "AI-powered roofing cost estimation", icon: Cpu, isAI: true, planMin: "premium" },
  { id: "analytics", label: "Advanced Analytics", description: "Deep business intelligence dashboards", icon: PieChart, isAI: true, planMin: "premium" },
  { id: "reports", label: "Reports", description: "Generate detailed custom reports", icon: BookOpen, planMin: "premium" },
  { id: "aiAssistant", label: "Ask Experts (AI)", description: "AI-powered CRM assistant", icon: Bot, isAI: true, planMin: "premium" },
];

const CURRENCIES = [
  { value: "CAD", label: "CAD — Canadian Dollar" },
  { value: "USD", label: "USD — US Dollar" },
  { value: "EUR", label: "EUR — Euro" },
  { value: "GBP", label: "GBP — British Pound" },
  { value: "AUD", label: "AUD — Australian Dollar" },
  { value: "INR", label: "INR — Indian Rupee" },
];

const TIMEZONES = [
  { value: "America/Toronto", label: "Eastern Time (Toronto)" },
  { value: "America/New_York", label: "Eastern Time (New York)" },
  { value: "America/Chicago", label: "Central Time" },
  { value: "America/Denver", label: "Mountain Time" },
  { value: "America/Los_Angeles", label: "Pacific Time" },
  { value: "America/Vancouver", label: "Pacific Time (Vancouver)" },
  { value: "Europe/London", label: "GMT (London)" },
  { value: "Europe/Paris", label: "CET (Paris)" },
  { value: "Asia/Kolkata", label: "IST (India)" },
  { value: "Asia/Tokyo", label: "JST (Tokyo)" },
  { value: "Australia/Sydney", label: "AEST (Sydney)" },
];

const DATE_FORMATS = [
  { value: "DD/MM/YYYY", label: "DD/MM/YYYY" },
  { value: "MM/DD/YYYY", label: "MM/DD/YYYY" },
  { value: "YYYY-MM-DD", label: "YYYY-MM-DD" },
];

const PLAN_ORDER: Record<PlanKey, number> = { basic: 0, standard: 1, premium: 2 };

// ============================================================================
// HELPERS
// ============================================================================

function detectTimezone(): string {
  try {
    return Intl.DateTimeFormat().resolvedOptions().timeZone;
  } catch {
    return "America/Toronto";
  }
}

function getTenantPlan(): PlanKey {
  try {
    const tenant = JSON.parse(localStorage.getItem("tenant") || "{}");
    const plan = (tenant.plan || tenant.subscriptionTier || "standard").toLowerCase();
    if (plan === "basic" || plan === "standard" || plan === "premium") return plan;
  } catch { /* ignore */ }
  return "standard";
}

function generateId(): string {
  return Math.random().toString(36).substring(2, 9);
}

// ============================================================================
// ANIMATED BACKGROUND
// ============================================================================

const AnimatedBackground = () => (
  <div className="fixed inset-0 -z-10 bg-gradient-to-br from-slate-50 via-white to-cyan-50/30">
    <div className="absolute -top-32 -left-32 h-[500px] w-[500px] rounded-full bg-cyan-400/[0.06] blur-[100px]" />
    <div className="absolute -bottom-48 -right-48 h-[600px] w-[600px] rounded-full bg-violet-400/[0.04] blur-[120px]" />
    <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 h-[400px] w-[400px] rounded-full bg-teal-300/[0.04] blur-[80px]" />
    {/* Grid */}
    <div className="absolute inset-0 opacity-[0.02]" style={{
      backgroundImage: `linear-gradient(to right, #0F172A 1px, transparent 1px), linear-gradient(to bottom, #0F172A 1px, transparent 1px)`,
      backgroundSize: "60px 60px",
    }} />
  </div>
);

// ============================================================================
// GLASS CARD
// ============================================================================

const GlassCard = ({ children, className, ...props }: React.HTMLAttributes<HTMLDivElement>) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.4 }}
    className={cn("backdrop-blur-xl bg-white/80 border border-white/40 rounded-[5px] shadow-xl shadow-black/5", className)}
    {...props}
  >
    {children}
  </motion.div>
);

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export default function Onboarding() {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const plan = useMemo(() => getTenantPlan(), []);

  // Filter steps for this plan
  const visibleSteps = useMemo(
    () => ALL_STEPS.filter(s => s.plans.includes(plan)),
    [plan]
  );

  const planFeatures = useMemo(() => PLAN_FEATURE_ACCESS[plan], [plan]);
  const planModules = useMemo(
    () => MODULES.filter(m => PLAN_ORDER[m.planMin] <= PLAN_ORDER[plan]),
    [plan]
  );

  const [stepIndex, setStepIndex] = useState(0);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);

  const [state, setState] = useState<OnboardingState>({
    enabledModules: [...planFeatures],
    currency: "CAD",
    timezone: detectTimezone(),
    dateFormat: "DD/MM/YYYY",
    team: [],
    projectStatuses: ["Not Started", "In Progress", "Completed"],
    taskStatuses: ["Pending", "In Progress", "Done"],
    businessType: "",
    materialType: "",
    costingMethod: "",
  });

  // Pre-fill from signup
  useEffect(() => {
    const prefill = (location.state as any)?.prefill;
    if (prefill) {
      // Already handled by signup, just ensure timezone
      const detected = detectTimezone();
      if (detected && TIMEZONES.some(t => t.value === detected)) {
        setState(s => ({ ...s, timezone: detected }));
      }
    }
  }, [location.state]);

  const currentStep = visibleSteps[stepIndex];
  const progress = ((stepIndex) / (visibleSteps.length - 1)) * 100;

  const goNext = useCallback(() => {
    if (stepIndex < visibleSteps.length - 1) {
      setStepIndex(i => i + 1);
    }
  }, [stepIndex, visibleSteps.length]);

  const goBack = useCallback(() => {
    if (stepIndex > 0) setStepIndex(i => i - 1);
  }, [stepIndex]);

  const toggleModule = (id: FeatureId) => {
    setState(s => ({
      ...s,
      enabledModules: s.enabledModules.includes(id)
        ? s.enabledModules.filter(m => m !== id)
        : [...s.enabledModules, id],
    }));
  };

  const addTeamMember = () => {
    setState(s => ({
      ...s,
      team: [...s.team, { id: generateId(), email: "", role: "employee" }],
    }));
  };

  const updateTeamMember = (id: string, field: "email" | "role", value: string) => {
    setState(s => ({
      ...s,
      team: s.team.map(m => m.id === id ? { ...m, [field]: value } : m),
    }));
  };

  const removeTeamMember = (id: string) => {
    setState(s => ({ ...s, team: s.team.filter(m => m.id !== id) }));
  };

  // ── Complete onboarding ──
  const handleComplete = async () => {
    setIsSubmitting(true);
    setShowConfetti(true);

    try {
      // Save enabled features
      setEnabledFeatures(state.enabledModules);

      // Try to save to backend
      try {
        await apiClient.put("/tenants/settings", {
          settings: {
            enabledModules: state.enabledModules,
            businessType: state.businessType || "general",
            currency: state.currency,
            timezone: state.timezone,
            dateFormat: state.dateFormat,
            projectStatuses: state.projectStatuses,
            taskStatuses: state.taskStatuses,
            aiSettings: plan === "premium" ? {
              businessType: state.businessType,
              materialType: state.materialType,
              costingMethod: state.costingMethod,
            } : undefined,
          },
        });
      } catch {
        // Backend save is best-effort
      }

      // Send team invites
      if (state.team.length > 0) {
        const validMembers = state.team.filter(m => m.email.trim());
        if (validMembers.length > 0) {
          try {
            await apiClient.post("/tenants/invite", { members: validMembers });
          } catch {
            // Invites are best-effort
          }
        }
      }

      // Update localStorage
      try {
        const storedTenant = JSON.parse(localStorage.getItem("tenant") || "{}");
        localStorage.setItem("tenant", JSON.stringify({
          ...storedTenant,
          enabledModules: state.enabledModules,
          businessType: state.businessType || "general",
        }));
      } catch { /* ignore */ }

      // Mark onboarding complete
      setOnboardingCompleted(true);

      // Wait for confetti
      await new Promise(r => setTimeout(r, 2500));

      toast({ title: "Welcome to Zodo CRM! 🎉", description: "Your workspace is ready. Let's get started!" });
      navigate("/dashboard", { replace: true });
    } catch (err: any) {
      toast({ title: "Setup error", description: err?.message || "Something went wrong.", variant: "destructive" });
    } finally {
      setIsSubmitting(false);
    }
  };

  // ============================================================================
  // RENDER
  // ============================================================================

  return (
    <div className="min-h-screen relative overflow-hidden">
      <AnimatedBackground />
      {showConfetti && <Confetti recycle={false} numberOfPieces={300} gravity={0.15} />}

      <div className="relative z-10 flex min-h-screen">
        {/* ── SIDEBAR (desktop) ── */}
        <div className="hidden lg:block w-72 p-5 shrink-0">
          <GlassCard className="p-5 h-full flex flex-col">
            {/* Logo */}
            <div className="flex items-center gap-3 mb-6">
              <div className="w-10 h-10 bg-gradient-to-br from-cyan-500 to-teal-600 rounded-[5px] flex items-center justify-center shadow-lg shadow-cyan-200/40">
                <Sparkles size={20} className="text-white" />
              </div>
              <div>
                <h2 className="font-bold text-slate-900 text-sm">Zodo CRM Setup</h2>
                <p className="text-[11px] text-slate-400">Step {stepIndex + 1} of {visibleSteps.length}</p>
              </div>
            </div>

            {/* Progress */}
            <div className="h-1.5 bg-slate-100 rounded-full overflow-hidden mb-5">
              <motion.div
                className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full"
                animate={{ width: `${progress}%` }}
                transition={{ duration: 0.4 }}
              />
            </div>

            {/* Steps */}
            <nav className="space-y-1 flex-1">
              {visibleSteps.map((step, idx) => {
                const isCompleted = idx < stepIndex;
                const isCurrent = idx === stepIndex;
                const Icon = step.icon;
                return (
                  <button
                    key={step.id}
                    onClick={() => idx <= stepIndex && setStepIndex(idx)}
                    disabled={idx > stepIndex}
                    className={cn(
                      "w-full flex items-center gap-3 p-2.5 rounded-[5px] text-left transition-all duration-200",
                      isCurrent && "bg-cyan-50 border border-cyan-200 shadow-sm",
                      isCompleted && "hover:bg-slate-50 cursor-pointer",
                      idx > stepIndex && "opacity-35 cursor-not-allowed",
                    )}
                  >
                    <div className={cn(
                      "w-8 h-8 rounded-[5px] flex items-center justify-center shrink-0 transition-all",
                      isCurrent && "bg-gradient-to-br from-cyan-500 to-teal-500 text-white shadow-sm shadow-cyan-200",
                      isCompleted && "bg-emerald-100 text-emerald-600",
                      idx > stepIndex && "bg-slate-100 text-slate-300",
                    )}>
                      {isCompleted ? <Check size={14} /> : <Icon size={14} />}
                    </div>
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className={cn("text-xs font-semibold truncate", isCurrent ? "text-cyan-700" : isCompleted ? "text-slate-700" : "text-slate-400")}>
                          {step.title}
                        </span>
                        {step.optional && <Badge variant="outline" className="text-[8px] px-1 py-0 bg-white/50 border-slate-200">Skip</Badge>}
                      </div>
                      <p className="text-[10px] text-slate-400 truncate">{step.subtitle}</p>
                    </div>
                  </button>
                );
              })}
            </nav>

            {/* Plan badge */}
            <div className="mt-4 pt-4 border-t border-slate-100">
              <div className={cn(
                "flex items-center gap-2 px-3 py-2 rounded-[5px] text-xs font-semibold",
                plan === "premium" ? "bg-violet-50 text-violet-700 border border-violet-200" :
                plan === "standard" ? "bg-cyan-50 text-cyan-700 border border-cyan-200" :
                "bg-slate-50 text-slate-600 border border-slate-200"
              )}>
                <Sparkles size={12} />
                {plan.charAt(0).toUpperCase() + plan.slice(1)} Plan
              </div>
            </div>
          </GlassCard>
        </div>

        {/* ── MOBILE HEADER ── */}
        <div className="lg:hidden fixed top-0 left-0 right-0 z-50">
          <GlassCard className="mx-3 mt-3 p-3 !rounded-[5px]">
            <div className="flex items-center justify-between mb-2">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-[5px] flex items-center justify-center">
                  <currentStep.icon size={16} className="text-white" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{currentStep.title}</p>
                  <p className="text-[10px] text-slate-400">Step {stepIndex + 1} of {visibleSteps.length}</p>
                </div>
              </div>
              <span className="text-lg font-bold text-cyan-600">{Math.round(progress)}%</span>
            </div>
            <div className="h-1 bg-slate-100 rounded-full overflow-hidden">
              <motion.div className="h-full bg-gradient-to-r from-cyan-500 to-teal-400 rounded-full" animate={{ width: `${progress}%` }} />
            </div>
          </GlassCard>
        </div>

        {/* ── MAIN CONTENT ── */}
        <div className="flex-1 flex items-center justify-center p-4 pt-24 lg:pt-4 lg:pr-5">
          <div className="w-full max-w-[720px]">
            <AnimatePresence mode="wait">
              <motion.div
                key={currentStep.id}
                initial={{ opacity: 0, x: 30 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -30 }}
                transition={{ duration: 0.25 }}
              >
                {/* ── STEP: MODULES ── */}
                {currentStep.id === "modules" && (
                  <GlassCard className="p-5 sm:p-7">
                    <StepHeader icon={Settings} title="Module Setup" subtitle="Toggle the features you need. You can change these anytime in Settings." plan={plan} />

                    {/* Group by plan tier */}
                    {(["basic", "standard", "premium"] as PlanKey[])
                      .filter(p => PLAN_ORDER[p] <= PLAN_ORDER[plan])
                      .map(tier => {
                        const tierModules = planModules.filter(m => m.planMin === tier);
                        if (tierModules.length === 0) return null;
                        return (
                          <div key={tier} className="mt-5">
                            <div className="flex items-center gap-2 mb-3">
                              <span className={cn(
                                "text-[10px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-[5px]",
                                tier === "premium" ? "bg-violet-100 text-violet-700" :
                                tier === "standard" ? "bg-cyan-100 text-cyan-700" :
                                "bg-slate-100 text-slate-600"
                              )}>
                                {tier} features
                              </span>
                              {tier !== "basic" && <span className="text-[10px] text-slate-400">Included in your plan</span>}
                            </div>
                            <div className="grid gap-2">
                              {tierModules.map(mod => {
                                const enabled = state.enabledModules.includes(mod.id);
                                const Icon = mod.icon;
                                return (
                                  <div
                                    key={mod.id}
                                    className={cn(
                                      "flex items-center gap-3 p-3 rounded-[5px] border transition-all duration-200 cursor-pointer",
                                      enabled ? "bg-white border-cyan-200 shadow-sm" : "bg-slate-50/50 border-slate-100 opacity-60",
                                      mod.isAI && enabled && "border-violet-200 bg-violet-50/30",
                                    )}
                                    onClick={() => toggleModule(mod.id)}
                                  >
                                    <div className={cn(
                                      "w-9 h-9 rounded-[5px] flex items-center justify-center shrink-0",
                                      enabled
                                        ? mod.isAI ? "bg-gradient-to-br from-violet-500 to-purple-600 text-white" : "bg-gradient-to-br from-cyan-500 to-teal-500 text-white"
                                        : "bg-slate-100 text-slate-400"
                                    )}>
                                      <Icon size={16} />
                                    </div>
                                    <div className="flex-1 min-w-0">
                                      <div className="flex items-center gap-1.5">
                                        <span className="text-sm font-semibold text-slate-800">{mod.label}</span>
                                        {mod.isAI && <Badge variant="outline" className="text-[8px] px-1.5 py-0 border-violet-200 text-violet-600 bg-violet-50">AI</Badge>}
                                      </div>
                                      <p className="text-[11px] text-slate-400">{mod.description}</p>
                                    </div>
                                    <Switch checked={enabled} onCheckedChange={() => toggleModule(mod.id)} className="shrink-0" />
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        );
                      })}

                    <StepFooter onNext={goNext} nextLabel="Continue" />
                  </GlassCard>
                )}

                {/* ── STEP: SETTINGS ── */}
                {currentStep.id === "settings" && (
                  <GlassCard className="p-5 sm:p-7">
                    <StepHeader icon={Globe} title="Basic Settings" subtitle="Configure your workspace defaults. These can be changed later." plan={plan} />

                    <div className="mt-6 space-y-5">
                      <SettingsField label="Currency">
                        <Select value={state.currency} onValueChange={v => setState(s => ({ ...s, currency: v }))}>
                          <SelectTrigger className="h-11 rounded-[5px] border-slate-200">
                            <div className="flex items-center gap-2"><DollarSign size={14} className="text-slate-400" /><SelectValue /></div>
                          </SelectTrigger>
                          <SelectContent className="rounded-[5px]">
                            {CURRENCIES.map(c => <SelectItem key={c.value} value={c.value} className="rounded-[5px]">{c.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </SettingsField>

                      <SettingsField label="Timezone">
                        <Select value={state.timezone} onValueChange={v => setState(s => ({ ...s, timezone: v }))}>
                          <SelectTrigger className="h-11 rounded-[5px] border-slate-200">
                            <div className="flex items-center gap-2"><Globe size={14} className="text-slate-400" /><SelectValue /></div>
                          </SelectTrigger>
                          <SelectContent className="rounded-[5px] max-h-60">
                            {TIMEZONES.map(t => <SelectItem key={t.value} value={t.value} className="rounded-[5px]">{t.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </SettingsField>

                      <SettingsField label="Date Format">
                        <Select value={state.dateFormat} onValueChange={v => setState(s => ({ ...s, dateFormat: v }))}>
                          <SelectTrigger className="h-11 rounded-[5px] border-slate-200">
                            <div className="flex items-center gap-2"><Calendar size={14} className="text-slate-400" /><SelectValue /></div>
                          </SelectTrigger>
                          <SelectContent className="rounded-[5px]">
                            {DATE_FORMATS.map(f => <SelectItem key={f.value} value={f.value} className="rounded-[5px]">{f.label}</SelectItem>)}
                          </SelectContent>
                        </Select>
                      </SettingsField>
                    </div>

                    <StepFooter onBack={goBack} onNext={goNext} nextLabel="Continue" />
                  </GlassCard>
                )}

                {/* ── STEP: TEAM ── */}
                {currentStep.id === "team" && (
                  <GlassCard className="p-5 sm:p-7">
                    <StepHeader icon={Users} title="Team Setup" subtitle="Invite your team members. You can always do this later." plan={plan} />

                    <div className="mt-6 space-y-3">
                      {state.team.length === 0 ? (
                        <div className="text-center py-8 border border-dashed border-slate-200 rounded-[5px] bg-slate-50/50">
                          <UserPlus size={32} className="mx-auto text-slate-300 mb-3" />
                          <p className="text-sm text-slate-500 mb-1">No team members added yet</p>
                          <p className="text-xs text-slate-400">Click below to invite your first team member</p>
                        </div>
                      ) : (
                        state.team.map((member) => (
                          <div key={member.id} className="flex items-center gap-2 p-3 bg-white border border-slate-200 rounded-[5px]">
                            <div className="flex-1">
                              <Input
                                value={member.email}
                                onChange={e => updateTeamMember(member.id, "email", e.target.value)}
                                placeholder="team@company.com"
                                type="email"
                                className="h-9 rounded-[5px] border-slate-200 text-sm"
                              />
                            </div>
                            <Select value={member.role} onValueChange={v => updateTeamMember(member.id, "role", v)}>
                              <SelectTrigger className="h-9 w-32 rounded-[5px] border-slate-200 text-xs">
                                <SelectValue />
                              </SelectTrigger>
                              <SelectContent className="rounded-[5px]">
                                <SelectItem value="admin" className="rounded-[5px]">Admin</SelectItem>
                                <SelectItem value="manager" className="rounded-[5px]">Manager</SelectItem>
                                <SelectItem value="employee" className="rounded-[5px]">Employee</SelectItem>
                              </SelectContent>
                            </Select>
                            <button onClick={() => removeTeamMember(member.id)} className="p-1.5 rounded-[5px] text-slate-400 hover:text-red-500 hover:bg-red-50 transition-colors">
                              <Trash2 size={14} />
                            </button>
                          </div>
                        ))
                      )}

                      <Button variant="outline" size="sm" onClick={addTeamMember} className="rounded-[5px] border-dashed border-slate-300 text-slate-500 hover:border-cyan-300 hover:text-cyan-600 w-full">
                        <Plus size={14} className="mr-1.5" /> Add Team Member
                      </Button>
                    </div>

                    <StepFooter
                      onBack={goBack}
                      onNext={goNext}
                      nextLabel="Continue"
                      skipLabel="Skip for now"
                      onSkip={goNext}
                    />
                  </GlassCard>
                )}

                {/* ── STEP: PROJECTS (Standard + Premium) ── */}
                {currentStep.id === "projects" && (
                  <GlassCard className="p-5 sm:p-7">
                    <StepHeader icon={FolderKanban} title="Project & Workflow" subtitle="Set up your default project and task statuses." plan={plan} />

                    <div className="mt-6 space-y-6">
                      <EditableList
                        label="Project Statuses"
                        items={state.projectStatuses}
                        onChange={items => setState(s => ({ ...s, projectStatuses: items }))}
                        colors={["bg-slate-400", "bg-cyan-500", "bg-emerald-500"]}
                      />
                      <EditableList
                        label="Task Statuses"
                        items={state.taskStatuses}
                        onChange={items => setState(s => ({ ...s, taskStatuses: items }))}
                        colors={["bg-amber-400", "bg-cyan-500", "bg-emerald-500"]}
                      />
                    </div>

                    <StepFooter onBack={goBack} onNext={goNext} nextLabel="Continue" />
                  </GlassCard>
                )}

                {/* ── STEP: AI SETUP (Premium only) ── */}
                {currentStep.id === "ai" && (
                  <GlassCard className="p-5 sm:p-7">
                    <StepHeader icon={Brain} title="AI Configuration" subtitle="Configure AI-powered tools for your workspace." plan={plan} />

                    <div className="mt-6 space-y-5">
                      <SettingsField label="Business Type">
                        <Select value={state.businessType} onValueChange={v => setState(s => ({ ...s, businessType: v }))}>
                          <SelectTrigger className="h-11 rounded-[5px] border-slate-200">
                            <div className="flex items-center gap-2"><Cpu size={14} className="text-violet-400" /><SelectValue placeholder="Select your business type" /></div>
                          </SelectTrigger>
                          <SelectContent className="rounded-[5px]">
                            <SelectItem value="roofing" className="rounded-[5px]">🏠 Roofing</SelectItem>
                            <SelectItem value="construction" className="rounded-[5px]">🏗️ Construction</SelectItem>
                            <SelectItem value="general_contractor" className="rounded-[5px]">🔧 General Contractor</SelectItem>
                            <SelectItem value="other" className="rounded-[5px]">📦 Other</SelectItem>
                          </SelectContent>
                        </Select>
                      </SettingsField>

                      <SettingsField label="Material Type Preference (Optional)">
                        <Select value={state.materialType} onValueChange={v => setState(s => ({ ...s, materialType: v }))}>
                          <SelectTrigger className="h-11 rounded-[5px] border-slate-200">
                            <SelectValue placeholder="Select material type" />
                          </SelectTrigger>
                          <SelectContent className="rounded-[5px]">
                            <SelectItem value="asphalt" className="rounded-[5px]">Asphalt Shingles</SelectItem>
                            <SelectItem value="metal" className="rounded-[5px]">Metal Roofing</SelectItem>
                            <SelectItem value="tile" className="rounded-[5px]">Tile / Clay</SelectItem>
                            <SelectItem value="flat" className="rounded-[5px]">Flat / TPO / EPDM</SelectItem>
                            <SelectItem value="mixed" className="rounded-[5px]">Mixed / All Types</SelectItem>
                          </SelectContent>
                        </Select>
                      </SettingsField>

                      <SettingsField label="Costing Method (Optional)">
                        <Select value={state.costingMethod} onValueChange={v => setState(s => ({ ...s, costingMethod: v }))}>
                          <SelectTrigger className="h-11 rounded-[5px] border-slate-200">
                            <SelectValue placeholder="Select costing method" />
                          </SelectTrigger>
                          <SelectContent className="rounded-[5px]">
                            <SelectItem value="per_sqft" className="rounded-[5px]">Per Square Foot</SelectItem>
                            <SelectItem value="per_square" className="rounded-[5px]">Per Roofing Square (100 sqft)</SelectItem>
                            <SelectItem value="lump_sum" className="rounded-[5px]">Lump Sum</SelectItem>
                            <SelectItem value="time_materials" className="rounded-[5px]">Time & Materials</SelectItem>
                          </SelectContent>
                        </Select>
                      </SettingsField>

                      <div className="flex items-center gap-2 p-3 rounded-[5px] border border-violet-100 bg-violet-50/50 text-xs text-violet-700">
                        <Bot size={14} className="shrink-0" />
                        These settings help our AI provide more accurate estimates and recommendations.
                      </div>
                    </div>

                    <StepFooter onBack={goBack} onNext={goNext} nextLabel="Continue" />
                  </GlassCard>
                )}

                {/* ── STEP: COMPLETE ── */}
                {currentStep.id === "complete" && (
                  <GlassCard className="p-5 sm:p-8 text-center">
                    <motion.div
                      initial={{ scale: 0 }}
                      animate={{ scale: 1 }}
                      transition={{ type: "spring", stiffness: 200, delay: 0.1 }}
                      className="w-20 h-20 mx-auto mb-6 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-[5px] flex items-center justify-center shadow-xl shadow-cyan-200/40"
                    >
                      <Rocket size={36} className="text-white" />
                    </motion.div>

                    <motion.h2
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.2 }}
                      className="text-2xl sm:text-3xl font-bold text-slate-900"
                    >
                      Your workspace is ready 🚀
                    </motion.h2>

                    <motion.p
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.3 }}
                      className="text-slate-500 mt-2 max-w-md mx-auto"
                    >
                      We've configured {state.enabledModules.length} modules for your {plan} plan.
                      {state.team.length > 0 && ` ${state.team.filter(t => t.email).length} team invite(s) will be sent.`}
                    </motion.p>

                    {/* Summary cards */}
                    <motion.div
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: 0.4 }}
                      className="grid grid-cols-2 sm:grid-cols-4 gap-3 mt-6"
                    >
                      {[
                        { label: "Modules", value: state.enabledModules.length, color: "text-cyan-600" },
                        { label: "Currency", value: state.currency, color: "text-emerald-600" },
                        { label: "Team", value: state.team.filter(t => t.email).length || "Solo", color: "text-violet-600" },
                        { label: "Plan", value: plan.charAt(0).toUpperCase() + plan.slice(1), color: "text-amber-600" },
                      ].map(s => (
                        <div key={s.label} className="p-3 rounded-[5px] bg-white border border-slate-100">
                          <div className={cn("text-lg font-bold", s.color)}>{s.value}</div>
                          <div className="text-[10px] text-slate-400 uppercase tracking-wider">{s.label}</div>
                        </div>
                      ))}
                    </motion.div>

                    <motion.div
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      transition={{ delay: 0.5 }}
                      className="mt-8 flex flex-col sm:flex-row items-center justify-center gap-3"
                    >
                      <Button
                        variant="ghost"
                        className="rounded-[5px] text-slate-500"
                        onClick={goBack}
                        disabled={isSubmitting}
                      >
                        <ArrowLeft size={16} className="mr-1.5" /> Go Back
                      </Button>
                      <Button
                        className="h-12 px-8 rounded-[5px] bg-gradient-to-r from-cyan-600 to-teal-500 text-white text-sm font-semibold shadow-lg shadow-cyan-200/40 hover:shadow-xl hover:shadow-cyan-200/50 transition-all disabled:opacity-50"
                        onClick={handleComplete}
                        disabled={isSubmitting}
                      >
                        {isSubmitting ? (
                          <><Loader2 size={16} className="mr-2 animate-spin" /> Setting up workspace...</>
                        ) : (
                          <><Rocket size={16} className="mr-2" /> Go to Dashboard</>
                        )}
                      </Button>
                    </motion.div>
                  </GlassCard>
                )}
              </motion.div>
            </AnimatePresence>
          </div>
        </div>
      </div>
    </div>
  );
}

// ============================================================================
// SUB-COMPONENTS
// ============================================================================

function StepHeader({ icon: Icon, title, subtitle, plan }: { icon: LucideIcon; title: string; subtitle: string; plan: PlanKey }) {
  return (
    <div className="flex items-start gap-4">
      <div className="w-11 h-11 bg-gradient-to-br from-cyan-500 to-teal-500 rounded-[5px] flex items-center justify-center shadow-sm shadow-cyan-200/40 shrink-0">
        <Icon size={20} className="text-white" />
      </div>
      <div>
        <h2 className="text-lg sm:text-xl font-bold text-slate-900">{title}</h2>
        <p className="text-xs text-slate-400 mt-0.5">{subtitle}</p>
      </div>
    </div>
  );
}

function StepFooter({
  onBack,
  onNext,
  nextLabel,
  skipLabel,
  onSkip,
}: {
  onBack?: () => void;
  onNext: () => void;
  nextLabel: string;
  skipLabel?: string;
  onSkip?: () => void;
}) {
  return (
    <div className="mt-7 pt-5 border-t border-slate-100 flex items-center justify-between">
      <div className="flex items-center gap-2">
        {onBack && (
          <Button variant="ghost" size="sm" onClick={onBack} className="rounded-[5px] text-slate-500">
            <ArrowLeft size={14} className="mr-1" /> Back
          </Button>
        )}
        {skipLabel && onSkip && (
          <Button variant="ghost" size="sm" onClick={onSkip} className="rounded-[5px] text-slate-400 hover:text-slate-600 text-xs">
            {skipLabel}
          </Button>
        )}
      </div>
      <Button
        size="sm"
        onClick={onNext}
        className="h-9 px-5 rounded-[5px] bg-gradient-to-r from-cyan-600 to-teal-500 text-white text-xs font-semibold shadow-sm shadow-cyan-200/30 hover:shadow-md transition-all"
      >
        {nextLabel} <ArrowRight size={14} className="ml-1.5" />
      </Button>
    </div>
  );
}

function SettingsField({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="space-y-1.5">
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</Label>
      {children}
    </div>
  );
}

function EditableList({
  label,
  items,
  onChange,
  colors,
}: {
  label: string;
  items: string[];
  onChange: (items: string[]) => void;
  colors: string[];
}) {
  const updateItem = (index: number, value: string) => {
    const next = [...items];
    next[index] = value;
    onChange(next);
  };

  const addItem = () => onChange([...items, ""]);

  const removeItem = (index: number) => {
    if (items.length <= 1) return;
    onChange(items.filter((_, i) => i !== index));
  };

  return (
    <div>
      <Label className="text-xs font-semibold uppercase tracking-wider text-slate-500">{label}</Label>
      <div className="mt-2 space-y-2">
        {items.map((item, idx) => (
          <div key={idx} className="flex items-center gap-2">
            <div className={cn("w-2.5 h-2.5 rounded-full shrink-0", colors[idx % colors.length])} />
            <div className="flex items-center gap-1 px-2 py-0.5 rounded-[5px] bg-slate-100 text-[10px] text-slate-400 font-medium shrink-0 w-5 justify-center">
              {idx + 1}
            </div>
            <Input
              value={item}
              onChange={e => updateItem(idx, e.target.value)}
              className="h-9 rounded-[5px] border-slate-200 text-sm flex-1"
              placeholder={`Status ${idx + 1}`}
            />
            {items.length > 1 && (
              <button onClick={() => removeItem(idx)} className="p-1 text-slate-300 hover:text-red-500 transition-colors">
                <Trash2 size={12} />
              </button>
            )}
          </div>
        ))}
        <Button variant="ghost" size="sm" onClick={addItem} className="text-xs text-slate-400 hover:text-cyan-600">
          <Plus size={12} className="mr-1" /> Add Status
        </Button>
      </div>
    </div>
  );
}
