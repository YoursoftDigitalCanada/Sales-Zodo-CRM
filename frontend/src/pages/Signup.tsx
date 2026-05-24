import { Fragment, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  Eye,
  EyeOff,
  Landmark,
  Mail,
  RefreshCw,
  Rocket,
  User,
} from "lucide-react";
import { Link } from "react-router-dom";

import { OtpInput } from "@/components/signup/OtpInput";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Label } from "@/components/ui/label";
import {
  COMPANY_TYPES,
  COUNTRIES,
  PLAN_CARDS,
  STEPS,
  formatTimer,
  useSignupWizard,
} from "@/hooks/useSignupWizard";
import { cn } from "@/lib/utils";
import { BrandLogo } from "@/components/public-v2/BrandLogo";
import { PublicV2Shell } from "@/components/public-v2/PublicV2Shell";

const slideVariants = {
  enter: (direction: number) => ({ x: direction > 0 ? 60 : -60, opacity: 0 }),
  center: { x: 0, opacity: 1 },
  exit: (direction: number) => ({ x: direction > 0 ? -60 : 60, opacity: 0 }),
};

const companyIcons = {
  individual: User,
  startup: Rocket,
  sme: Building2,
  enterprise: Landmark,
} as const;

const inputClassName =
  "h-11 w-full rounded-xl border border-border bg-card px-4 text-sm text-foreground shadow-sm outline-none transition-colors placeholder:text-muted-foreground focus:border-accent focus:ring-2 focus:ring-accent/15";

function maskEmail(value: string) {
  if (!value || !value.includes("@")) return value;
  const [local, domain] = value.split("@");
  return `${local.slice(0, 2)}${"*".repeat(Math.max(local.length - 2, 2))}@${domain}`;
}

function StepIndicator({ currentStep }: { currentStep: number }) {
  return (
    <div className="mb-8 flex items-center justify-center">
      {STEPS.map((step, index) => (
        <Fragment key={step.id}>
          <div className="flex flex-col items-center gap-1.5">
            <div
              className={cn(
                "flex h-9 w-9 items-center justify-center rounded-full border-2 text-sm font-semibold transition-colors",
                step.id < currentStep && "border-accent bg-accent text-accent-foreground",
                step.id === currentStep && "border-accent bg-accent text-accent-foreground shadow-md",
                step.id > currentStep && "border-border bg-card text-muted-foreground",
              )}
            >
              {step.id < currentStep ? <Check className="h-4 w-4" /> : step.id}
            </div>
            <span className={cn("hidden text-[10px] font-medium sm:block", step.id <= currentStep ? "text-foreground" : "text-muted-foreground")}>
              {step.label}
            </span>
          </div>
          {index < STEPS.length - 1 ? (
            <div className={cn("mx-1 mb-5 h-0.5 w-8 rounded-full sm:mx-2 sm:mb-4 sm:w-14", step.id < currentStep ? "bg-accent" : "bg-border")} />
          ) : null}
        </Fragment>
      ))}
    </div>
  );
}

export default function SignupPage() {
  const wizard = useSignupWizard();
  const [direction, setDirection] = useState(1);

  const currentCountry = useMemo(
    () => COUNTRIES.find((country) => country.code === wizard.form.countryCode) || COUNTRIES[0],
    [wizard.form.countryCode],
  );

  const stepDescriptions: Record<number, string> = {
    1: "Let's start with your personal details",
    2: "Tell us about your business",
    3: "How can we reach you?",
    4: "Select the plan that fits your business",
    5: "Confirm your email to create the workspace",
  };

  const handleNext = () => {
    setDirection(1);
    wizard.goNext();
  };

  const handleBack = () => {
    setDirection(-1);
    wizard.goBack();
  };

  return (
    <PublicV2Shell>
      <div className="relative min-h-screen overflow-hidden bg-hero-bg px-4 py-8">
        <div className="pointer-events-none absolute -right-40 -top-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />
        <div className="pointer-events-none absolute -bottom-40 -left-40 h-96 w-96 rounded-full bg-accent/5 blur-3xl" />

        <motion.div initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }} className="relative z-10 flex w-full flex-col items-center">
          <Link className="mb-8" to="/">
            <BrandLogo size="lg" />
          </Link>

          <StepIndicator currentStep={wizard.step} />

          <div className={cn("w-full transition-all", wizard.step === 4 ? "max-w-4xl" : "max-w-lg")}>
            <AnimatePresence custom={direction} mode="wait">
              <motion.div
                key={wizard.step}
                custom={direction}
                variants={slideVariants}
                initial="enter"
                animate="center"
                exit="exit"
                transition={{ duration: 0.3, ease: [0.4, 0, 0.2, 1] }}
              >
                <Card className="border-border/60 p-6 shadow-lg sm:p-8">
                  {wizard.step === 1 ? (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Create your account</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{stepDescriptions[1]}</p>
                      </div>

                      <div className="space-y-4">
                        <div>
                          <Label className="mb-1.5 block text-sm font-medium text-foreground">Full Name</Label>
                          <input
                            className={inputClassName}
                            value={wizard.form.name}
                            onBlur={() => wizard.markTouched(["name"])}
                            onChange={(event) => wizard.setField("name", event.target.value)}
                            placeholder="Alex Morgan"
                          />
                          {wizard.fieldError("name") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("name")}</p> : null}
                        </div>

                        <div>
                          <Label className="mb-1.5 block text-sm font-medium text-foreground">Work Email</Label>
                          <input
                            className={inputClassName}
                            type="email"
                            value={wizard.form.email}
                            onBlur={() => wizard.markTouched(["email"])}
                            onChange={(event) => wizard.setField("email", event.target.value)}
                            placeholder="alex@company.com"
                          />
                          {wizard.fieldError("email") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("email")}</p> : null}
                        </div>

                        <div>
                          <Label className="mb-1.5 block text-sm font-medium text-foreground">Password</Label>
                          <div className="relative">
                            <input
                              className={cn(inputClassName, "pr-10")}
                              type={wizard.showPassword ? "text" : "password"}
                              value={wizard.form.password}
                              onBlur={() => wizard.markTouched(["password"])}
                              onChange={(event) => wizard.setField("password", event.target.value)}
                              placeholder="Minimum 6 characters"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                              onClick={() => wizard.setShowPassword(!wizard.showPassword)}
                              aria-label={wizard.showPassword ? "Hide password" : "Show password"}
                            >
                              {wizard.showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {wizard.fieldError("password") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("password")}</p> : null}
                        </div>

                        <div>
                          <Label className="mb-1.5 block text-sm font-medium text-foreground">Confirm Password</Label>
                          <div className="relative">
                            <input
                              className={cn(inputClassName, "pr-10")}
                              type={wizard.showConfirmPassword ? "text" : "password"}
                              value={wizard.form.confirmPassword}
                              onBlur={() => wizard.markTouched(["confirmPassword"])}
                              onChange={(event) => wizard.setField("confirmPassword", event.target.value)}
                              placeholder="Re-enter password"
                            />
                            <button
                              type="button"
                              className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground transition-colors hover:text-foreground"
                              onClick={() => wizard.setShowConfirmPassword(!wizard.showConfirmPassword)}
                              aria-label={wizard.showConfirmPassword ? "Hide password" : "Show password"}
                            >
                              {wizard.showConfirmPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                            </button>
                          </div>
                          {wizard.fieldError("confirmPassword") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("confirmPassword")}</p> : null}
                        </div>
                      </div>

                      <Button className="w-full" onClick={handleNext} variant="accent">
                        Continue
                        <ArrowRight className="h-4 w-4" />
                      </Button>
                      <p className="text-center text-sm text-muted-foreground">
                        Have an account?{" "}
                        <Link className="font-medium text-accent hover:underline" to="/signin">
                          Sign in
                        </Link>
                      </p>
                    </div>
                  ) : null}

                  {wizard.step === 2 ? (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Company details</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{stepDescriptions[2]}</p>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-foreground">Company Name</Label>
                        <input
                          className={inputClassName}
                          value={wizard.form.companyName}
                          onBlur={() => wizard.markTouched(["companyName"])}
                          onChange={(event) => wizard.setField("companyName", event.target.value)}
                          placeholder="Acme Inc."
                        />
                        {wizard.fieldError("companyName") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("companyName")}</p> : null}
                      </div>

                      <div>
                        <Label className="mb-2 block text-sm font-medium text-foreground">Company Type</Label>
                        <div className="grid grid-cols-2 gap-3">
                          {COMPANY_TYPES.map((companyType) => {
                            const Icon = companyIcons[companyType.value];
                            const isSelected = wizard.form.companyType === companyType.value;
                            return (
                              <button
                                key={companyType.value}
                                type="button"
                                onClick={() => wizard.setField("companyType", companyType.value)}
                                className={cn(
                                  "flex flex-col items-start gap-1.5 rounded-xl border-2 p-4 text-left transition-colors",
                                  isSelected ? "border-accent bg-accent/5" : "border-border hover:border-accent/40",
                                )}
                              >
                                <div className={cn("flex h-9 w-9 items-center justify-center rounded-lg", isSelected ? "bg-accent text-accent-foreground" : "bg-muted text-muted-foreground")}>
                                  <Icon className="h-4.5 w-4.5" />
                                </div>
                                <span className="text-sm font-semibold text-foreground">{companyType.label}</span>
                                <span className="text-xs leading-snug text-muted-foreground">{companyType.desc}</span>
                                {isSelected ? (
                                  <Badge className="mt-1 border-accent/20 bg-accent/10 text-[10px] text-accent" variant="secondary">
                                    Selected
                                  </Badge>
                                ) : null}
                              </button>
                            );
                          })}
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <Button className="flex-1" onClick={handleBack} variant="heroOutline">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button className="flex-1" onClick={handleNext} variant="accent">
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {wizard.step === 3 ? (
                    <div className="space-y-5">
                      <div>
                        <h2 className="text-xl font-bold text-foreground">Contact information</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{stepDescriptions[3]}</p>
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-foreground">Country</Label>
                        <select
                          className={inputClassName}
                          value={wizard.form.countryCode}
                          onBlur={() => wizard.markTouched(["countryCode"])}
                          onChange={(event) => wizard.setField("countryCode", event.target.value as typeof wizard.form.countryCode)}
                        >
                          {COUNTRIES.map((country) => (
                            <option key={country.code} value={country.code}>
                              {country.name} ({country.dialCode})
                            </option>
                          ))}
                        </select>
                        {wizard.fieldError("countryCode") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("countryCode")}</p> : null}
                      </div>

                      <div>
                        <Label className="mb-1.5 block text-sm font-medium text-foreground">Phone Number</Label>
                        <div className="flex gap-2">
                          <div className="flex min-w-[76px] items-center justify-center rounded-xl border border-border bg-muted px-3 text-sm font-medium text-foreground">
                            {currentCountry.dialCode}
                          </div>
                          <input
                            className={cn(inputClassName, "flex-1")}
                            value={wizard.form.phone}
                            onBlur={() => wizard.markTouched(["phone"])}
                            onChange={(event) => wizard.setField("phone", event.target.value)}
                            placeholder="555 010 2200"
                          />
                        </div>
                        {wizard.fieldError("phone") ? <p className="mt-1 text-xs text-destructive">{wizard.fieldError("phone")}</p> : null}
                        <p className="mt-2 text-xs text-muted-foreground">Auto-detected from your locale. You can change this anytime.</p>
                      </div>

                      <div className="flex gap-3">
                        <Button className="flex-1" onClick={handleBack} variant="heroOutline">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button className="flex-1" onClick={handleNext} variant="accent">
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {wizard.step === 4 ? (
                    <div className="space-y-5">
                      <div className="text-center">
                        <h2 className="text-xl font-bold text-foreground">Choose your plan</h2>
                        <p className="mt-1 text-sm text-muted-foreground">{stepDescriptions[4]}</p>
                      </div>

                      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
                        {PLAN_CARDS.map((plan) => {
                          const isSelected = wizard.form.plan === plan.key;
                          return (
                            <button
                              key={plan.key}
                              type="button"
                              onClick={() => wizard.setField("plan", plan.key)}
                              className={cn(
                                "relative flex h-full flex-col rounded-xl border-2 p-5 text-left transition-colors",
                                isSelected ? "border-accent bg-accent/5 shadow-md" : "border-border hover:border-accent/40",
                              )}
                            >
                              {plan.badge ? (
                                <Badge className="absolute -top-2.5 left-1/2 -translate-x-1/2 border-0 bg-accent px-3 text-[10px] text-accent-foreground">
                                  {plan.badge}
                                </Badge>
                              ) : null}
                              <div className="text-base font-bold text-foreground">{plan.name}</div>
                              <div className="mt-2 flex items-baseline gap-0.5">
                                <span className="text-3xl font-extrabold text-foreground">{plan.price}</span>
                                <span className="text-sm text-muted-foreground">/month</span>
                              </div>
                              <p className="mt-2 text-xs leading-relaxed text-muted-foreground">{plan.description}</p>
                              <div className="mt-4 flex-1 space-y-2">
                                {plan.features.map((feature) => (
                                  <div key={feature} className="flex items-center gap-2">
                                    <Check className="h-3.5 w-3.5 shrink-0 text-accent" />
                                    <span className="text-xs text-foreground">{feature}</span>
                                  </div>
                                ))}
                              </div>
                              {isSelected ? (
                                <Badge className="mt-4 w-full justify-center border-accent/20 bg-accent/10 text-xs text-accent" variant="secondary">
                                  Selected
                                </Badge>
                              ) : null}
                            </button>
                          );
                        })}
                      </div>

                      <p className="text-center text-xs text-muted-foreground">
                        Upgrade anytime without losing data or tenant settings.
                      </p>

                      <div className="flex gap-3">
                        <Button className="flex-1" onClick={handleBack} variant="heroOutline">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button className="flex-1" onClick={handleNext} variant="accent">
                          Continue
                          <ArrowRight className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  ) : null}

                  {wizard.step === 5 ? (
                    <div className="space-y-6">
                      <div className="text-center">
                        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-accent/10">
                          <Mail className="h-7 w-7 text-accent" />
                        </div>
                        <h2 className="text-xl font-bold text-foreground">Email verification</h2>
                        <p className="mt-2 text-sm text-muted-foreground">
                          We sent a signup code to <span className="font-medium text-foreground">{wizard.form.email || "your email"}</span>
                        </p>
                      </div>

                      <div className="flex justify-center">
                        <Badge className="gap-1.5 rounded-full border-badge-green/20 bg-badge-green/10 px-4 py-1.5 text-xs font-semibold text-badge-green" variant="secondary">
                          <Check className="h-3.5 w-3.5" />
                          {wizard.isSendingOtp ? "Sending code..." : "Code sent"}
                        </Badge>
                      </div>

                      <div className="text-center">
                        <p className="text-xs text-muted-foreground">
                          Sent to <span className="font-medium">{maskEmail(wizard.otpSentTo || wizard.form.email)}</span>. Expires{" "}
                          <span className="font-semibold text-foreground">{formatTimer(wizard.otpExpiresIn || 0)}</span>.
                        </p>
                        {wizard.otpDebugCode ? (
                          <p className="mt-1 text-xs font-medium text-accent">Debug OTP: {wizard.otpDebugCode}</p>
                        ) : null}
                        <button
                          type="button"
                          onClick={() => void wizard.requestOtp()}
                          className="mt-1 inline-flex items-center gap-1 text-xs font-medium text-accent hover:underline"
                        >
                          <RefreshCw className="h-3 w-3" />
                          Resend
                        </button>
                      </div>

                      <div>
                        <Label className="mb-2 block text-center text-sm font-medium text-foreground">Enter 6-digit code</Label>
                        <OtpInput disabled={wizard.isSubmitting} onChange={wizard.setOtpCode} value={wizard.otpCode} variant="friendly" />
                      </div>

                      <div className="flex gap-3">
                        <Button className="flex-1" disabled={wizard.isSubmitting} onClick={handleBack} variant="heroOutline">
                          <ArrowLeft className="h-4 w-4" />
                          Back
                        </Button>
                        <Button className="flex-1" disabled={!wizard.stepValid[5] || wizard.isSubmitting} onClick={() => void wizard.handleVerifyAndSignup()} variant="accent">
                          {wizard.isSubmitting ? "Creating..." : "Verify & Create Account"}
                        </Button>
                      </div>
                    </div>
                  ) : null}
                </Card>
              </motion.div>
            </AnimatePresence>
          </div>
        </motion.div>
      </div>
    </PublicV2Shell>
  );
}
