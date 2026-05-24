import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
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

/* ═══════════════════════════════════════════════
   TYPES
   ═══════════════════════════════════════════════ */

export type SignupStep = 1 | 2 | 3 | 4 | 5;
export type CompanyType = "individual" | "startup" | "sme" | "enterprise";

export interface CountryOption {
  code: string;
  name: string;
  dialCode: string;
  flag: string;
}

export interface SignupFormState {
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

export interface PasswordStrength {
  label: string;
  value: number;
  tone: string;
}

export interface StepMeta {
  id: SignupStep;
  label: string;
  eyebrow: string;
}

export interface PlanCard {
  key: SignupPlan;
  name: string;
  price: string;
  badge?: string;
  description: string;
  features: string[];
}

export interface CompanyTypeCard {
  value: CompanyType;
  label: string;
  desc: string;
  icon: string;
}

/* ═══════════════════════════════════════════════
   CONSTANTS
   ═══════════════════════════════════════════════ */

export const STEPS: StepMeta[] = [
  { id: 1, label: "User Info", eyebrow: "Step 1" },
  { id: 2, label: "Company", eyebrow: "Step 2" },
  { id: 3, label: "Contact", eyebrow: "Step 3" },
  { id: 4, label: "Plan", eyebrow: "Step 4" },
  { id: 5, label: "Verify", eyebrow: "Step 5" },
];

export const COUNTRIES: CountryOption[] = [
  { code: "US", name: "United States", dialCode: "+1", flag: "🇺🇸" },
  { code: "CA", name: "Canada", dialCode: "+1", flag: "🇨🇦" },
  { code: "GB", name: "United Kingdom", dialCode: "+44", flag: "🇬🇧" },
  { code: "AU", name: "Australia", dialCode: "+61", flag: "🇦🇺" },
  { code: "IN", name: "India", dialCode: "+91", flag: "🇮🇳" },
  { code: "DE", name: "Germany", dialCode: "+49", flag: "🇩🇪" },
  { code: "FR", name: "France", dialCode: "+33", flag: "🇫🇷" },
  { code: "IT", name: "Italy", dialCode: "+39", flag: "🇮🇹" },
  { code: "ES", name: "Spain", dialCode: "+34", flag: "🇪🇸" },
  { code: "NL", name: "Netherlands", dialCode: "+31", flag: "🇳🇱" },
  { code: "SE", name: "Sweden", dialCode: "+46", flag: "🇸🇪" },
  { code: "AE", name: "United Arab Emirates", dialCode: "+971", flag: "🇦🇪" },
  { code: "SG", name: "Singapore", dialCode: "+65", flag: "🇸🇬" },
  { code: "NZ", name: "New Zealand", dialCode: "+64", flag: "🇳🇿" },
  { code: "ZA", name: "South Africa", dialCode: "+27", flag: "🇿🇦" },
  { code: "BR", name: "Brazil", dialCode: "+55", flag: "🇧🇷" },
  { code: "MX", name: "Mexico", dialCode: "+52", flag: "🇲🇽" },
  { code: "JP", name: "Japan", dialCode: "+81", flag: "🇯🇵" },
  { code: "KR", name: "South Korea", dialCode: "+82", flag: "🇰🇷" },
];

export const COMPANY_TYPES: CompanyTypeCard[] = [
  { value: "individual", label: "Individual", desc: "Solo freelancer or contractor", icon: "👤" },
  { value: "startup", label: "Startup", desc: "Early-stage team (2–20)", icon: "🚀" },
  { value: "sme", label: "SME", desc: "Small-to-mid business (20–200)", icon: "🏢" },
  { value: "enterprise", label: "Enterprise", desc: "Large organization (200+)", icon: "🏛️" },
];

export const PLAN_CARDS: PlanCard[] = [
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
      "Zodo Mail",
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
      "AI Sales Assistant",
      "Advanced Analytics",
      "Reports",
      "Ask Zodo AI",
    ],
  },
];

/* ═══════════════════════════════════════════════
   HELPERS
   ═══════════════════════════════════════════════ */

export function detectCountryCode(): string {
  if (typeof navigator === "undefined") return "US";
  const locale = navigator.languages?.find(Boolean) || navigator.language || "en-US";
  const region = locale.split("-").pop()?.toUpperCase() || locale.split("_").pop()?.toUpperCase() || "US";
  return COUNTRIES.some((c) => c.code === region) ? region : "US";
}

export function buildPhoneNumber(raw: string, dialCode: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return "";
  if (trimmed.startsWith("+")) return trimmed;
  return `${dialCode} ${trimmed}`.trim();
}

export function formatTimer(seconds: number): string {
  const safe = Math.max(0, seconds);
  const m = Math.floor(safe / 60);
  const s = safe % 60;
  return `${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}`;
}

export function getPasswordStrength(password: string): PasswordStrength {
  let score = 0;
  if (password.length >= 6) score += 25;
  if (password.length >= 10) score += 20;
  if (/[A-Z]/.test(password)) score += 20;
  if (/\d/.test(password)) score += 15;
  if (/[^A-Za-z0-9]/.test(password)) score += 20;

  if (score < 45) return { label: "Weak", value: score, tone: "weak" };
  if (score < 75) return { label: "Good", value: score, tone: "good" };
  return { label: "Strong", value: score, tone: "strong" };
}

function getStepFields(step: SignupStep): Array<keyof SignupFormState | "confirmPassword"> {
  switch (step) {
    case 1: return ["name", "email", "password", "confirmPassword"];
    case 2: return ["companyName", "companyType"];
    case 3: return ["phone", "countryCode"];
    case 4: return ["plan"];
    default: return [];
  }
}

/* ═══════════════════════════════════════════════
   HOOK
   ═══════════════════════════════════════════════ */

export function useSignupWizard() {
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
  const [otpCode, setOtpCode] = useState("");
  const [otpSentTo, setOtpSentTo] = useState("");
  const [otpExpiresIn, setOtpExpiresIn] = useState(0);
  const [otpDebugCode, setOtpDebugCode] = useState<string | null>(null);
  const [isSendingOtp, setIsSendingOtp] = useState(false);
  const [hasSentOtp, setHasSentOtp] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirmPassword, setShowConfirmPassword] = useState(false);

  const selectedCountry = useMemo(
    () => COUNTRIES.find((c) => c.code === form.countryCode) || COUNTRIES[0],
    [form.countryCode],
  );

  const passwordStrength = useMemo(() => getPasswordStrength(form.password), [form.password]);

  const normalizedPhone = useMemo(
    () => buildPhoneNumber(form.phone, selectedCountry.dialCode),
    [form.phone, selectedCountry.dialCode],
  );

  const progress = useMemo(() => (step / STEPS.length) * 100, [step]);

  const validations = useMemo(() => {
    const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email.trim());
    const passwordValid = form.password.length >= 6;
    const confirmPasswordValid = form.confirmPassword.length > 0 && form.confirmPassword === form.password;
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

  const stepValid: Record<SignupStep, boolean> = {
    1: validations.name && validations.email && validations.password && validations.confirmPassword,
    2: validations.companyName && validations.companyType,
    3: validations.phone && validations.countryCode,
    4: validations.plan,
    5: hasSentOtp && otpCode.trim().length === 6,
  };

  // OTP countdown timer
  useEffect(() => {
    if (!otpExpiresIn) return undefined;
    const timer = window.setInterval(() => {
      setOtpExpiresIn((c) => (c > 0 ? c - 1 : 0));
    }, 1000);
    return () => window.clearInterval(timer);
  }, [otpExpiresIn]);

  const setField = <T extends keyof SignupFormState>(field: T, value: SignupFormState[T]) => {
    setForm((c) => ({ ...c, [field]: value }));
  };

  const markTouched = (fields: string[]) => {
    setTouched((c) => ({
      ...c,
      ...fields.reduce<Record<string, boolean>>((a, f) => { a[f] = true; return a; }, {}),
    }));
  };

  const fieldError = (field: keyof SignupFormState | "confirmPassword"): string | null => {
    if (!touched[field]) return null;
    switch (field) {
      case "name": return validations.name ? null : "Enter your first and last name.";
      case "email": return validations.email ? null : "Enter a valid work email address.";
      case "password": return validations.password ? null : "Password must be at least 6 characters.";
      case "confirmPassword": return validations.confirmPassword ? null : "Passwords must match.";
      case "companyName": return validations.companyName ? null : "Company name is required.";
      case "phone": return validations.phone ? null : "Enter a valid phone number.";
      case "countryCode": return validations.countryCode ? null : "Choose your country.";
      default: return null;
    }
  };

  const goNext = () => {
    const fields = getStepFields(step);
    markTouched(fields);
    if (!stepValid[step] || step >= 5) return;
    setStep((c) => (c + 1) as SignupStep);
  };

  const goBack = () => {
    if (step === 1) return;
    setStep((c) => (c - 1) as SignupStep);
  };

  const requestOtp = async () => {
    setIsSendingOtp(true);
    setOtpDebugCode(null);
    try {
      const response = await sendSignupOtp({
        email: form.email.trim().toLowerCase(),
        channel: "email",
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
        title: "Email OTP sent",
        description:
          debugCode
            ? `Dev OTP: ${debugCode}`
            : `We sent a 6-digit code to ${destination}.`,
      });
    } catch (error: any) {
      toast({
        title: "Could not send OTP",
        description: error?.response?.data?.message || error?.message || "Unable to send OTP right now.",
        variant: "destructive",
      });
    } finally {
      setIsSendingOtp(false);
    }
  };

  // Auto-send OTP when reaching step 5
  useEffect(() => {
    if (step !== 5 || hasSentOtp) return;
    void requestOtp();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step, hasSentOtp]);

  const handleVerifyAndSignup = async () => {
    if (!stepValid[5]) return;
    setIsSubmitting(true);
    try {
      await verifySignupOtp({
        email: form.email.trim().toLowerCase(),
        channel: "email",
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

      const availableFeatures = getFeatureAccessFromTenant(data?.tenant) || getFeatureAccessForPlan(form.plan);
      setAvailableFeatures(availableFeatures);
      clearEnabledFeatures();
      clearOnboardingData();
      setOnboardingCompleted((data?.tenant as Record<string, any> | undefined)?.onboardingCompleted === true);

      toast({
        title: "Welcome to Zodo CRM",
        description: "Your workspace is ready. Let's finish your onboarding.",
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
      toast({
        title: "Signup failed",
        description: error?.response?.data?.message || error?.message || "Signup failed. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return {
    // State
    step,
    form,
    touched,
    isSubmitting,
    otpCode,
    otpSentTo,
    otpExpiresIn,
    otpDebugCode,
    isSendingOtp,
    hasSentOtp,
    showPassword,
    showConfirmPassword,

    // Derived
    selectedCountry,
    passwordStrength,
    normalizedPhone,
    progress,
    validations,
    stepValid,

    // Actions
    setField,
    markTouched,
    fieldError,
    goNext,
    goBack,
    requestOtp,
    handleVerifyAndSignup,
    setOtpCode,
    setShowPassword,
    setShowConfirmPassword,
  };
}
