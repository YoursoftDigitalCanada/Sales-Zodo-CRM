import { useEffect, useMemo, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Globe2,
  Lock,
  Mail,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  User2,
} from "lucide-react";

import { Button } from "@/components/ui/button";
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
import { useToast } from "@/components/ui/use-toast";
import { setAuthSession } from "@/features/auth";
import {
  sendSignupOtp,
  signup,
  verifySignupOtp,
  type SignupPlan,
} from "@/features/auth/services/auth-service";
import {
  clearEnabledFeatures,
  clearOnboardingData,
  getFeatureAccessForPlan,
  getFeatureAccessFromTenant,
  setAvailableFeatures,
  setOnboardingCompleted,
} from "@/lib/enabled-features";
import { cn } from "@/lib/utils";
import logo from "../Images/Logo/logo.png";

type SignupStep = 1 | 2 | 3 | 4 | 5;
type CompanyType = "individual" | "startup" | "sme" | "enterprise";
type OtpChannel = "email" | "phone";

interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
}

interface SignupFormState {
  name: string;
  email: string;
  password: string;
  confirmPassword: string;
  companyName: string;
  companyType: CompanyType;
  phone: string;
  countryCode: string;
  plan: SignupPlan;
}

const STEPS: Array<{ id: SignupStep; label: string; eyebrow: string }> = [
  { id: 1, label: "User Info", eyebrow: "Step 1" },
  { id: 2, label: "Company", eyebrow: "Step 2" },
  { id: 3, label: "Contact", eyebrow: "Step 3" },
  { id: 4, label: "Plan", eyebrow: "Step 4" },
  { id: 5, label: "Verify", eyebrow: "Step 5" },
];

const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States", dialCode: "+1" },
  { code: "CA", name: "Canada", dialCode: "+1" },
  { code: "GB", name: "United Kingdom", dialCode: "+44" },
  { code: "AU", name: "Australia", dialCode: "+61" },
  { code: "IN", name: "India", dialCode: "+91" },
  { code: "DE", name: "Germany", dialCode: "+49" },
  { code: "FR", name: "France", dialCode: "+33" },
  { code: "IT", name: "Italy", dialCode: "+39" },
  { code: "ES", name: "Spain", dialCode: "+34" },
  { code: "NL", name: "Netherlands", dialCode: "+31" },
  { code: "SE", name: "Sweden", dialCode: "+46" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971" },
  { code: "SG", name: "Singapore", dialCode: "+65" },
  { code: "NZ", name: "New Zealand", dialCode: "+64" },
  { code: "ZA", name: "South Africa", dialCode: "+27" },
  { code: "BR", name: "Brazil", dialCode: "+55" },
  { code: "MX", name: "Mexico", dialCode: "+52" },
  { code: "JP", name: "Japan", dialCode: "+81" },
  { code: "KR", name: "South Korea", dialCode: "+82" },
];

const COMPANY_TYPES: Array<{ value: CompanyType; label: string }> = [
  { value: "individual", label: "Individual" },
  { value: "startup", label: "Startup" },
  { value: "sme", label: "SME" },
  { value: "enterprise", label: "Enterprise" },
];

const PLAN_CARDS: Array<{
  key: SignupPlan;
  name: string;
  price: string;
  badge?: string;
  description: string;
  features: string[];
}> = [
  {
    key: "basic",
    name: "Basic",
    price: "$29",
    description: "Core CRM and finance tools for lean teams.",
    features: [
      "Dashboard",
      "Calendar",
      "Tasks",
      "Leads",
      "Clients",
      "Invoices",
      "Quotes",
      "Payments",
      "Letter Box",
      "Support System",
    ],
  },
  {
    key: "standard",
    name: "Standard",
    price: "$79",
    badge: "Most Popular",
    description: "The best fit for scaling service and sales operations.",
    features: [
      "All Basic Features",
      "Chats",
      "All Projects",
      "Kanban Board",
      "Time Tracking",
      "File Manager",
      "Employees",
      "Users",
      "Roles & Permissions",
    ],
  },
  {
    key: "premium",
    name: "Premium",
    price: "$149",
    description: "Advanced intelligence, reporting, and AI-powered workflows.",
    features: [
      "All Standard Features",
      "AI Roof Estimator",
      "Advanced Analytics",
      "Reports",
      "Ask Experts (AI)",
    ],
  },
];

function detectCountryCode(): string {
  if (typeof navigator === "undefined") {
    return "US";
  }

  const locale =
    navigator.languages?.find(Boolean) ||
    navigator.language ||
    "en-US";

  const region =
    locale.split("-").pop()?.toUpperCase() ||
    locale.split("_").pop()?.toUpperCase() ||
    "US";

  return COUNTRIES.some((country) => country.code === region) ? region : "US";
}

function buildPhoneNumber(raw: string, dialCode: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  return `${dialCode} ${trimmed}`.trim();
}

function formatTimer(seconds: number): string {
  const safeSeconds = Math.max(0, seconds);
  const minutes = Math.floor(safeSeconds / 60);
  const remainingSeconds = safeSeconds % 60;
  return `${String(minutes).padStart(2, "0")}:${String(remainingSeconds).padStart(2, "0")}`;
}

function getPasswordStrength(password: string): {
  label: string;
  value: number;
  tone: string;
} {
  let score = 0;

  if (password.length >= 6) score += 25;
  if (password.length >= 10) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  if (score < 45) {
    return { label: "Weak", value: score, tone: "bg-rose-500" };
  }
  if (score < 75) {
    return { label: "Good", value: score, tone: "bg-amber-500" };
  }
  return { label: "Strong", value: score, tone: "bg-emerald-500" };
}

function getStepFields(step: SignupStep): Array<keyof SignupFormState | "confirmPassword"> {
  switch (step) {
    case 1:
      return ["name", "email", "password", "confirmPassword"];
    case 2:
      return ["companyName", "companyType"];
    case 3:
      return ["phone", "countryCode"];
    case 4:
      return ["plan"];
    default:
      return [];
  }
}

const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  const [step, setStep] = useState<SignupStep>(1);
  const [form, setForm] = useState<SignupFormState>({
    name: "",
    email: "",
    password: "",
    confirmPassword: "",
    companyName: "",
    companyType: "startup",
    phone: "",
    countryCode: detectCountryCode(),
    plan: "standard",
  });
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [otpChannel, setOtpChannel] = useState<OtpChannel>("email");
  const [otpCode, setOtpCode] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpDebugCode, setOtpDebugCode] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [hasSentOtp, setHasSentOtp] = useState(false);

  const selectedCountry = useMemo(
    () =>
      COUNTRIES.find((country) => country.code === form.countryCode) || COUNTRIES[0],
    [form.countryCode]
  );

  const passwordStrength = useMemo(
    () => getPasswordStrength(form.password),
    [form.password]
  );

  const normalizedPhone = useMemo(
    () => buildPhoneNumber(form.phone, selectedCountry.dialCode),
    [form.phone, selectedCountry.dialCode]
  );

  const progress = useMemo(
    () => (step / STEPS.length) * 100,
    [step]
  );

  const validations = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const passwordValid = form.password.length >= 6;
    const confirmPasswordValid =
      form.confirmPassword.length > 0 && form.confirmPassword === form.password;
    const nameValid = form.name.trim().split(/\s+/).length >= 2;
    const companyNameValid = form.companyName.trim().length >= 2;
    const phoneValid = normalizedPhone.replace(/[^\d]/g, "").length >= 8;

    return {
      name: nameValid,
      email: emailValid,
      password: passwordValid,
      confirmPassword: confirmPasswordValid,
      companyName: companyNameValid,
      companyType: Boolean(form.companyType),
      phone: phoneValid,
      countryCode: Boolean(form.countryCode),
      plan: Boolean(form.plan),
    };
  }, [form, normalizedPhone]);

  const stepValidations: Record<SignupStep, boolean> = {
    1:
      validations.name &&
      validations.email &&
      validations.password &&
      validations.confirmPassword,
    2: validations.companyName && validations.companyType,
    3: validations.phone && validations.countryCode,
    4: validations.plan,
    5: hasSentOtp && otpCode.trim().length === 6,
  };

  useEffect(() => {
    if (!otpExpiresIn) return undefined;

    const timer = window.setInterval(() => {
      setOtpExpiresIn((current) => (current > 0 ? current - 1 : 0));
    }, 1000);

    return () => window.clearInterval(timer);
  }, [otpExpiresIn]);

  const setField = <T extends keyof SignupFormState>(field: T, value: SignupFormState[T]) => {
    setForm((current) => ({ ...current, [field]: value }));
  };

  const markTouched = (fields: string[]) => {
    setTouched((current) => ({
      ...current,
      ...fields.reduce<Record<string, boolean>>((accumulator, field) => {
        accumulator[field] = true;
        return accumulator;
      }, {}),
    }));
  };

  const fieldError = (field: keyof SignupFormState | "confirmPassword"): string | null => {
    if (!touched[field]) return null;

    switch (field) {
      case "name":
        return validations.name ? null : "Enter your first and last name.";
      case "email":
        return validations.email ? null : "Enter a valid work email address.";
      case "password":
        return validations.password ? null : "Password must be at least 6 characters.";
      case "confirmPassword":
        return validations.confirmPassword ? null : "Passwords must match.";
      case "companyName":
        return validations.companyName ? null : "Company name is required.";
      case "phone":
        return validations.phone ? null : "Enter a valid phone number.";
      case "countryCode":
        return validations.countryCode ? null : "Choose your country.";
      default:
        return null;
    }
  };

  const goNext = () => {
    const fields = getStepFields(step);
    markTouched(fields);
    if (!stepValidations[step] || step >= 5) return;
    setStep((current) => (current + 1) as SignupStep);
  };

  const goBack = () => {
    if (step === 1) return;
    setStep((current) => (current - 1) as SignupStep);
  };

  const requestOtp = async (channel: OtpChannel) => {
    setIsSendingOtp(true);
    setOtpDebugCode(null);

    try {
      const response = await sendSignupOtp({
        email: form.email.trim().toLowerCase(),
        phone: normalizedPhone || undefined,
        channel,
      });
      const data = (response?.data as Record<string, unknown>) || {};
      const expiresIn = Number(data.expiresIn || 300);
      const destination = String(data.destination || "");
      const debugCode = typeof data.debugCode === "string" ? data.debugCode : null;

      setHasSentOtp(true);
      setOtpSentTo(destination);
      setOtpExpiresIn(expiresIn);
      setOtpDebugCode(debugCode);
      setOtpCode("");

      toast({
        title: channel === "email" ? "Email OTP sent" : "Phone OTP ready",
        description:
          debugCode && channel === "email"
            ? `Demo email OTP: ${debugCode}`
            : channel === "phone"
              ? "Use 123456 for phone verification in test mode."
              : `We sent a 6-digit code to ${destination}.`,
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Unable to send OTP right now.";

      toast({
        title: "Could not send OTP",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  useEffect(() => {
    if (step !== 5 || hasSentOtp) return;
    void requestOtp(otpChannel);
  }, [step, hasSentOtp, otpChannel]);

  const handleVerifyAndSignup = async () => {
    if (!stepValidations[5]) return;

    setIsSubmitting(true);

    try {
      await verifySignupOtp({
        email: form.email.trim().toLowerCase(),
        phone: normalizedPhone || undefined,
        channel: otpChannel,
        otp: otpCode.trim(),
      });

      const response = await signup({
        name: form.name.trim(),
        email: form.email.trim().toLowerCase(),
        password: form.password,
        companyName: form.companyName.trim(),
        companyType: form.companyType,
        phone: normalizedPhone,
        country: selectedCountry.name,
        plan: form.plan,
      });

      const data = (response?.data as Record<string, any>) || {};
      const accessToken = data?.tokens?.accessToken || data?.token;

      if (!response?.success || !accessToken) {
        throw new Error(response?.message || "Signup could not be completed.");
      }

      setAuthSession({
        accessToken,
        refreshToken: data?.tokens?.refreshToken,
        user: data?.user,
        employee: data?.employee,
        tenant: data?.tenant,
        permissions: data?.permissions,
      });

      const availableFeatures =
        getFeatureAccessFromTenant(data?.tenant) ||
        getFeatureAccessForPlan(form.plan);

      setAvailableFeatures(availableFeatures);
      clearEnabledFeatures();
      clearOnboardingData();
      setOnboardingCompleted(false);

      toast({
        title: "Welcome to Zodo CRM",
        description: "Your workspace is ready. Let’s finish your onboarding.",
      });

      navigate("/onboarding", {
        replace: true,
        state: {
          prefill: {
            fullName: form.name,
            email: form.email,
            company: form.companyName,
          },
        },
      });
    } catch (error: any) {
      const message =
        error?.response?.data?.message ||
        error?.message ||
        "Signup failed. Please try again.";

      toast({
        title: "Signup failed",
        description: message,
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen overflow-hidden bg-[#f5f7fb] text-slate-950">
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_left,_rgba(43,108,176,0.16),_transparent_28%),radial-gradient(circle_at_bottom_right,_rgba(15,23,42,0.08),_transparent_30%)]" />
      <div className="relative mx-auto grid min-h-screen max-w-[1440px] lg:grid-cols-[1.1fr_0.9fr]">
        <section className="relative overflow-hidden bg-[#0f172a] px-6 py-8 text-white sm:px-10 lg:px-14 lg:py-12">
          <div className="absolute inset-0 bg-[linear-gradient(135deg,rgba(47,84,235,0.22),rgba(15,23,42,0.1)_45%,rgba(16,185,129,0.12))]" />
          <div className="absolute -right-16 top-16 h-56 w-56 rounded-full bg-cyan-400/10 blur-3xl" />
          <div className="absolute bottom-0 left-0 h-64 w-64 rounded-full bg-emerald-400/10 blur-3xl" />

          <div className="relative z-10 flex h-full flex-col">
            <div className="flex items-center justify-between">
              <Link to="/" className="inline-flex items-center gap-3">
                <img src={logo} alt="Zodo CRM" className="h-11 w-auto" />
                <span className="hidden text-sm font-medium text-slate-200 sm:inline">
                  SaaS CRM for modern service teams
                </span>
              </Link>
              <div className="hidden rounded-full border border-white/15 bg-white/8 px-4 py-2 text-xs text-slate-200 lg:flex lg:items-center lg:gap-2">
                <Sparkles className="h-3.5 w-3.5 text-cyan-300" />
                14-day free trial
              </div>
            </div>

            <div className="mt-10 flex-1 lg:mt-16">
              <div className="max-w-xl">
                <div className="inline-flex items-center gap-2 rounded-full border border-cyan-400/20 bg-cyan-400/10 px-4 py-2 text-xs font-medium text-cyan-100">
                  <Star className="h-3.5 w-3.5 text-cyan-300" />
                  Built for multi-tenant CRM growth
                </div>
                <h1 className="mt-6 text-4xl font-semibold leading-tight tracking-[-0.03em] sm:text-5xl">
                  Launch your Zodo CRM workspace with the right plan from day one.
                </h1>
                <p className="mt-5 max-w-lg text-base leading-7 text-slate-300">
                  Start with just your name, email, and password. We’ll collect
                  company details, plan access, and OTP verification only when
                  they become relevant.
                </p>
              </div>

              <div className="mt-10 grid gap-4 sm:grid-cols-3">
                {[
                  {
                    icon: ShieldCheck,
                    title: "OTP secured",
                    body: "Email-first verification with a 5 minute expiry and rate-limited requests.",
                  },
                  {
                    icon: Building2,
                    title: "Tenant ready",
                    body: "Every signup provisions a workspace, admin user, and plan-aware feature access.",
                  },
                  {
                    icon: Sparkles,
                    title: "Upgrade anytime",
                    body: "Start on Standard by default and unlock more modules whenever you’re ready.",
                  },
                ].map((item) => (
                  <div
                    key={item.title}
                    className="rounded-3xl border border-white/10 bg-white/6 p-5 backdrop-blur"
                  >
                    <item.icon className="h-5 w-5 text-cyan-300" />
                    <p className="mt-4 text-sm font-semibold">{item.title}</p>
                    <p className="mt-2 text-sm leading-6 text-slate-300">
                      {item.body}
                    </p>
                  </div>
                ))}
              </div>
            </div>

            <div className="mt-10 rounded-[28px] border border-white/10 bg-white/8 p-5 backdrop-blur-xl">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.22em] text-slate-400">
                    Plan Preview
                  </p>
                  <h2 className="mt-2 text-xl font-semibold">
                    {PLAN_CARDS.find((plan) => plan.key === form.plan)?.name} plan
                  </h2>
                </div>
                <span className="rounded-full bg-white/12 px-3 py-1 text-xs text-slate-200">
                  Upgrade anytime
                </span>
              </div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                {PLAN_CARDS.find((plan) => plan.key === form.plan)?.features
                  .slice(0, 6)
                  .map((feature) => (
                    <div
                      key={feature}
                      className="flex items-center gap-3 rounded-2xl border border-white/8 bg-white/6 px-4 py-3 text-sm text-slate-100"
                    >
                      <CheckCircle2 className="h-4 w-4 text-emerald-300" />
                      <span>{feature}</span>
                    </div>
                  ))}
              </div>
            </div>
          </div>
        </section>

        <section className="relative flex items-center px-4 py-6 sm:px-8 lg:px-10">
          <div className="mx-auto w-full max-w-[560px]">
            <div className="rounded-[32px] border border-white/70 bg-white/90 p-5 shadow-[0_30px_80px_rgba(15,23,42,0.12)] backdrop-blur-xl sm:p-8">
              <div className="flex items-center justify-between gap-4">
                <div>
                  <p className="text-sm font-medium text-slate-500">
                    {STEPS[step - 1].eyebrow}
                  </p>
                  <h2 className="mt-1 text-2xl font-semibold tracking-[-0.02em] text-slate-950">
                    {step === 1 && "Create your account"}
                    {step === 2 && "Tell us about your company"}
                    {step === 3 && "Where should we reach you?"}
                    {step === 4 && "Pick the right plan"}
                    {step === 5 && "Verify and launch"}
                  </h2>
                </div>
                <div className="hidden text-right text-sm text-slate-500 sm:block">
                  <p>{step} of {STEPS.length}</p>
                  <p className="mt-1">Multi-step signup</p>
                </div>
              </div>

              <div className="mt-6 space-y-4">
                <Progress value={progress} className="h-2 bg-slate-100" />
                <div className="grid grid-cols-5 gap-2">
                  {STEPS.map((item) => {
                    const isActive = item.id === step;
                    const isCompleted = item.id < step;

                    return (
                      <div
                        key={item.id}
                        className={cn(
                          "rounded-2xl border px-3 py-3 text-center transition-all",
                          isActive
                            ? "border-slate-900 bg-slate-900 text-white shadow-lg shadow-slate-900/15"
                            : isCompleted
                              ? "border-emerald-200 bg-emerald-50 text-emerald-700"
                              : "border-slate-200 bg-slate-50 text-slate-400"
                        )}
                      >
                        <div className="text-xs font-semibold uppercase tracking-[0.2em]">
                          {item.id}
                        </div>
                        <div className="mt-1 text-[11px] font-medium sm:text-xs">
                          {item.label}
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              <div className="mt-8">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={step}
                    initial={{ opacity: 0, x: 18 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -18 }}
                    transition={{ duration: 0.24, ease: "easeOut" }}
                  >
                    {step === 1 && (
                      <div className="space-y-5">
                        <Field
                          label="Full Name"
                          value={form.name}
                          onChange={(value) => setField("name", value)}
                          onBlur={() => markTouched(["name"])}
                          placeholder="Alex Morgan"
                          icon={User2}
                          error={fieldError("name")}
                        />
                        <Field
                          label="Work Email"
                          value={form.email}
                          onChange={(value) => setField("email", value)}
                          onBlur={() => markTouched(["email"])}
                          placeholder="alex@yourcompany.com"
                          icon={Mail}
                          error={fieldError("email")}
                          type="email"
                        />
                        <Field
                          label="Password"
                          value={form.password}
                          onChange={(value) => setField("password", value)}
                          onBlur={() => markTouched(["password"])}
                          placeholder="Minimum 6 characters"
                          icon={Lock}
                          error={fieldError("password")}
                          type="password"
                        />
                        <div className="space-y-2 rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3">
                          <div className="flex items-center justify-between text-sm">
                            <span className="font-medium text-slate-700">
                              Password strength
                            </span>
                            <span className="text-slate-500">
                              {passwordStrength.label}
                            </span>
                          </div>
                          <div className="h-2 overflow-hidden rounded-full bg-slate-200">
                            <div
                              className={cn("h-full rounded-full transition-all", passwordStrength.tone)}
                              style={{ width: `${Math.max(passwordStrength.value, 8)}%` }}
                            />
                          </div>
                        </div>
                        <Field
                          label="Confirm Password"
                          value={form.confirmPassword}
                          onChange={(value) => setField("confirmPassword", value)}
                          onBlur={() => markTouched(["confirmPassword"])}
                          placeholder="Re-enter your password"
                          icon={Lock}
                          error={fieldError("confirmPassword")}
                          type="password"
                        />
                      </div>
                    )}

                    {step === 2 && (
                      <div className="space-y-5">
                        <Field
                          label="Company Name"
                          value={form.companyName}
                          onChange={(value) => setField("companyName", value)}
                          onBlur={() => markTouched(["companyName"])}
                          placeholder="Zodo CRM"
                          icon={Building2}
                          error={fieldError("companyName")}
                        />
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Company Type
                          </Label>
                          <Select
                            value={form.companyType}
                            onValueChange={(value) =>
                              setField("companyType", value as CompanyType)
                            }
                          >
                            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                              <SelectValue placeholder="Choose a company type" />
                            </SelectTrigger>
                            <SelectContent>
                              {COMPANY_TYPES.map((companyType) => (
                                <SelectItem key={companyType.value} value={companyType.value}>
                                  {companyType.label}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      </div>
                    )}

                    {step === 3 && (
                      <div className="space-y-5">
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Country
                          </Label>
                          <Select
                            value={form.countryCode}
                            onValueChange={(value) => setField("countryCode", value)}
                          >
                            <SelectTrigger className="h-12 rounded-2xl border-slate-200 bg-white">
                              <SelectValue placeholder="Select a country" />
                            </SelectTrigger>
                            <SelectContent className="max-h-72">
                              {COUNTRIES.map((country) => (
                                <SelectItem key={country.code} value={country.code}>
                                  {country.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                          {fieldError("countryCode") && (
                            <p className="text-sm text-rose-500">{fieldError("countryCode")}</p>
                          )}
                        </div>
                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Phone Number
                          </Label>
                          <div className="flex items-center overflow-hidden rounded-2xl border border-slate-200 bg-white">
                            <div className="flex h-12 items-center gap-2 border-r border-slate-200 px-4 text-sm font-medium text-slate-600">
                              <Phone className="h-4 w-4 text-slate-400" />
                              {selectedCountry.dialCode}
                            </div>
                            <Input
                              value={form.phone}
                              onChange={(event) => setField("phone", event.target.value)}
                              onBlur={() => markTouched(["phone"])}
                              placeholder="555 010 2200"
                              className="h-12 border-0 bg-transparent shadow-none focus-visible:ring-0"
                            />
                          </div>
                          {fieldError("phone") && (
                            <p className="text-sm text-rose-500">{fieldError("phone")}</p>
                          )}
                        </div>
                        <div className="rounded-2xl border border-slate-200 bg-slate-50 px-4 py-3 text-sm text-slate-600">
                          Auto-detected from your locale. You can change the country any time.
                        </div>
                      </div>
                    )}

                    {step === 4 && (
                      <div className="space-y-5">
                        <div className="grid gap-4 xl:grid-cols-3">
                          {PLAN_CARDS.map((plan) => {
                            const selected = form.plan === plan.key;

                            return (
                              <button
                                key={plan.key}
                                type="button"
                                onClick={() => setField("plan", plan.key)}
                                className={cn(
                                  "relative rounded-[28px] border p-5 text-left transition-all",
                                  selected
                                    ? "border-slate-950 bg-slate-950 text-white shadow-[0_24px_50px_rgba(15,23,42,0.18)]"
                                    : "border-slate-200 bg-slate-50 text-slate-900 hover:-translate-y-0.5 hover:border-slate-300"
                                )}
                              >
                                {plan.badge && (
                                  <span className={cn(
                                    "absolute right-4 top-4 rounded-full px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.18em]",
                                    selected
                                      ? "bg-cyan-300 text-slate-950"
                                      : "bg-slate-900 text-white"
                                  )}>
                                    {plan.badge}
                                  </span>
                                )}
                                <div className="pr-20">
                                  <p className={cn(
                                    "text-sm font-medium",
                                    selected ? "text-slate-300" : "text-slate-500"
                                  )}>
                                    {plan.name}
                                  </p>
                                  <div className="mt-2 flex items-end gap-2">
                                    <span className="text-3xl font-semibold">{plan.price}</span>
                                    <span className={cn(
                                      "pb-1 text-sm",
                                      selected ? "text-slate-300" : "text-slate-500"
                                    )}>
                                      /month
                                    </span>
                                  </div>
                                  <p className={cn(
                                    "mt-3 text-sm leading-6",
                                    selected ? "text-slate-300" : "text-slate-600"
                                  )}>
                                    {plan.description}
                                  </p>
                                </div>
                                <div className="mt-5 space-y-2">
                                  {plan.features.map((feature) => (
                                    <div
                                      key={feature}
                                      className={cn(
                                        "flex items-center gap-2 text-sm",
                                        selected ? "text-slate-100" : "text-slate-700"
                                      )}
                                    >
                                      <Check className="h-4 w-4 text-emerald-400" />
                                      <span>{feature}</span>
                                    </div>
                                  ))}
                                </div>
                              </button>
                            );
                          })}
                        </div>
                        <div className="flex items-center gap-2 rounded-2xl border border-emerald-100 bg-emerald-50 px-4 py-3 text-sm text-emerald-700">
                          <CheckCircle2 className="h-4 w-4" />
                          Upgrade anytime without losing data or tenant settings.
                        </div>
                      </div>
                    )}

                    {step === 5 && (
                      <div className="space-y-5">
                        <div className="grid gap-3 sm:grid-cols-2">
                          {([
                            {
                              channel: "email" as const,
                              title: "Email OTP",
                              body: `Primary verification via ${form.email || "your work email"}`,
                              icon: Mail,
                            },
                            {
                              channel: "phone" as const,
                              title: "Phone OTP",
                              body: "Secondary option for testing with static OTP 123456",
                              icon: Phone,
                            },
                          ]).map((option) => {
                            const selected = otpChannel === option.channel;

                            return (
                              <button
                                key={option.channel}
                                type="button"
                                onClick={() => {
                                  setOtpChannel(option.channel);
                                  setHasSentOtp(false);
                                  setOtpExpiresIn(0);
                                  setOtpSentTo("");
                                }}
                                className={cn(
                                  "rounded-3xl border px-5 py-4 text-left transition-all",
                                  selected
                                    ? "border-slate-950 bg-slate-950 text-white"
                                    : "border-slate-200 bg-slate-50 text-slate-900"
                                )}
                              >
                                <option.icon className={cn(
                                  "h-5 w-5",
                                  selected ? "text-cyan-300" : "text-slate-500"
                                )} />
                                <p className="mt-4 font-semibold">{option.title}</p>
                                <p className={cn(
                                  "mt-2 text-sm leading-6",
                                  selected ? "text-slate-300" : "text-slate-600"
                                )}>
                                  {option.body}
                                </p>
                              </button>
                            );
                          })}
                        </div>

                        <div className="rounded-3xl border border-slate-200 bg-slate-50 p-5">
                          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                            <div>
                              <p className="text-sm font-semibold text-slate-900">
                                {hasSentOtp ? "Verification code sent" : "Request verification code"}
                              </p>
                              <p className="mt-1 text-sm text-slate-600">
                                {hasSentOtp && otpSentTo
                                  ? `Sent to ${otpSentTo}. Expires in ${formatTimer(otpExpiresIn)}.`
                                  : otpChannel === "email"
                                    ? "We simulate email delivery for now."
                                    : "Phone verification uses static OTP 123456 in test mode."}
                              </p>
                            </div>
                            <Button
                              type="button"
                              variant="outline"
                              className="h-11 rounded-full border-slate-300 px-5"
                              onClick={() => void requestOtp(otpChannel)}
                              disabled={isSendingOtp}
                            >
                              {isSendingOtp ? "Sending..." : hasSentOtp ? "Resend OTP" : "Send OTP"}
                            </Button>
                          </div>

                          {otpDebugCode && (
                            <div className="mt-4 rounded-2xl border border-cyan-100 bg-cyan-50 px-4 py-3 text-sm text-cyan-800">
                              Demo email OTP: <span className="font-semibold">{otpDebugCode}</span>
                            </div>
                          )}
                        </div>

                        <div className="space-y-2">
                          <Label className="text-sm font-medium text-slate-700">
                            Enter OTP
                          </Label>
                          <Input
                            value={otpCode}
                            onChange={(event) =>
                              setOtpCode(event.target.value.replace(/[^\d]/g, "").slice(0, 6))
                            }
                            inputMode="numeric"
                            placeholder="6-digit code"
                            className="h-14 rounded-2xl border-slate-200 text-lg tracking-[0.3em]"
                          />
                        </div>
                      </div>
                    )}
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="mt-8 flex flex-col gap-3 border-t border-slate-100 pt-6 sm:flex-row sm:items-center sm:justify-between">
                <div className="text-sm text-slate-500">
                  Already have an account?{" "}
                  <Link to="/login" className="font-medium text-slate-900 hover:text-slate-700">
                    Sign in
                  </Link>
                </div>

                <div className="flex items-center gap-3">
                  {step > 1 && (
                    <Button
                      type="button"
                      variant="ghost"
                      className="h-12 rounded-full px-5 text-slate-600"
                      onClick={goBack}
                      disabled={isSubmitting}
                    >
                      <ArrowLeft className="mr-2 h-4 w-4" />
                      Back
                    </Button>
                  )}

                  {step < 5 ? (
                    <Button
                      type="button"
                      className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800 disabled:opacity-50"
                      onClick={goNext}
                      disabled={!stepValidations[step]}
                    >
                      {step === 1 ? "Start Free Trial" : "Continue"}
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  ) : (
                    <Button
                      type="button"
                      className="h-12 rounded-full bg-slate-950 px-6 text-white hover:bg-slate-800 disabled:opacity-50"
                      onClick={() => void handleVerifyAndSignup()}
                      disabled={!stepValidations[5] || isSubmitting}
                    >
                      {isSubmitting ? "Creating workspace..." : "Verify & Create Account"}
                      <ChevronRight className="ml-2 h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

function Field({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  icon: Icon,
  error,
  type = "text",
}: {
  label: string;
  value: string;
  onChange: (value: string) => void;
  onBlur?: () => void;
  placeholder: string;
  icon: typeof User2;
  error?: string | null;
  type?: string;
}) {
  return (
    <div className="space-y-2">
      <Label className="text-sm font-medium text-slate-700">{label}</Label>
      <div className="relative">
        <Icon className="pointer-events-none absolute left-4 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
        <Input
          type={type}
          value={value}
          onChange={(event) => onChange(event.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={cn(
            "h-12 rounded-2xl border-slate-200 bg-white pl-11 shadow-none focus-visible:ring-1 focus-visible:ring-slate-300",
            error && "border-rose-300 focus-visible:ring-rose-300"
          )}
        />
      </div>
      {error && <p className="text-sm text-rose-500">{error}</p>}
    </div>
  );
}

export default SignUpPage;
