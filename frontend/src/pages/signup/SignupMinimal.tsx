/**
 * THEME 1 — CLEAN SAAS MINIMAL
 * ─────────────────────────────
 * Stripe / Linear inspired.
 * Single-column centered, whitespace-heavy, razor-sharp type hierarchy.
 * No side panel — pure focus on the form.
 */

import { AnimatePresence, motion } from "framer-motion";
import type { ReactNode } from "react";
import {
  ArrowLeft,
  ArrowRight,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Eye,
  EyeOff,
  Globe2,
  Loader2,
  Lock,
  Mail,
  Phone,
  User2,
} from "lucide-react";
import { Link } from "react-router-dom";

import { OtpInput } from "@/components/signup/OtpInput";
import {
  useSignupWizard,
  STEPS,
  COUNTRIES,
  COMPANY_TYPES,
  PLAN_CARDS,
  formatTimer,
} from "@/hooks/useSignupWizard";
import logo from "@/Images/Logo/logo.png";

/* ──────────── micro-component: minimal text field ──────────── */
function MinimalField({
  label,
  value,
  onChange,
  onBlur,
  placeholder,
  icon: Icon,
  error,
  type = "text",
  suffix,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
  onBlur?: () => void;
  placeholder: string;
  icon: typeof User2;
  error?: string | null;
  type?: string;
  suffix?: ReactNode;
}) {
  return (
    <div style={{ marginBottom: 20 }}>
      <label
        style={{
          display: "block",
          fontSize: 13,
          fontWeight: 600,
          color: "#0F172A",
          marginBottom: 6,
          letterSpacing: "-0.01em",
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <Icon
          style={{
            position: "absolute",
            left: 14,
            top: "50%",
            transform: "translateY(-50%)",
            width: 16,
            height: 16,
            color: "#94A3B8",
            pointerEvents: "none",
          }}
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          style={{
            width: "100%",
            height: 48,
            padding: "0 40px 0 42px",
            border: `1.5px solid ${error ? "#F43F5E" : "#E2E8F0"}`,
            borderRadius: 8,
            backgroundColor: "#FFFFFF",
            fontSize: 15,
            color: "#0F172A",
            outline: "none",
            transition: "border-color 200ms ease, box-shadow 200ms ease",
            fontFamily: "Urbanist, system-ui, sans-serif",
          }}
          onFocus={(e) => {
            if (!error) {
              e.target.style.borderColor = "#0891B2";
              e.target.style.boxShadow = "0 0 0 3px rgba(8,145,178,0.08)";
            }
          }}
          onBlurCapture={(e) => {
            e.target.style.borderColor = error ? "#F43F5E" : "#E2E8F0";
            e.target.style.boxShadow = "none";
          }}
        />
        {suffix}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: "#F43F5E", marginTop: 5, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#F43F5E", display: "inline-block" }} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   THEME 1 COMPONENT
   ══════════════════════════════════════════════════ */

export default function SignupMinimal() {
  const w = useSignupWizard();

  return (
    <div
      style={{
        minHeight: "100vh",
        backgroundColor: "#F8FAFC",
        fontFamily: "Urbanist, system-ui, sans-serif",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
      }}
    >
      {/* ── Sticky top nav ── */}
      <div
        style={{
          position: "sticky",
          top: 0,
          width: "100%",
          zIndex: 50,
          backdropFilter: "blur(16px)",
          WebkitBackdropFilter: "blur(16px)",
          backgroundColor: "rgba(248,250,252,0.88)",
          borderBottom: "1px solid rgba(15,23,42,0.06)",
        }}
      >
        <div
          style={{
            maxWidth: 640,
            margin: "0 auto",
            padding: "14px 24px",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
          }}
        >
          <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
            <img src={logo} alt="Zodo CRM" style={{ height: 28, width: "auto" }} />
            <span style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", letterSpacing: "-0.02em" }}>
              Zodo
            </span>
          </Link>
          <span style={{ fontSize: 12, color: "#94A3B8", fontWeight: 500 }}>
            {w.step} of {STEPS.length}
          </span>
        </div>

        {/* ── Step pills ── */}
        <div style={{ maxWidth: 640, margin: "0 auto", padding: "0 24px 12px", display: "flex", gap: 6 }}>
          {STEPS.map((s) => {
            const isActive = s.id === w.step;
            const isDone = s.id < w.step;
            return (
              <div
                key={s.id}
                style={{
                  flex: 1,
                  height: 3,
                  borderRadius: 99,
                  backgroundColor: isDone
                    ? "#10B981"
                    : isActive
                      ? "#0891B2"
                      : "#E2E8F0",
                  transition: "background-color 300ms ease",
                }}
              />
            );
          })}
        </div>
      </div>

      {/* ── Main card ── */}
      <div
        style={{
          width: "100%",
          maxWidth: 640,
          padding: "40px 24px 60px",
          flex: 1,
        }}
      >
        {/* Step label */}
        <AnimatePresence mode="wait">
          <motion.div
            key={w.step}
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.22, ease: "easeOut" }}
          >
            <p
              style={{
                fontSize: 12,
                fontWeight: 700,
                letterSpacing: "0.1em",
                textTransform: "uppercase",
                color: "#0891B2",
                marginBottom: 8,
              }}
            >
              {STEPS[w.step - 1].eyebrow}
            </p>
            <h1
              style={{
                fontSize: 28,
                fontWeight: 700,
                color: "#0F172A",
                letterSpacing: "-0.03em",
                lineHeight: 1.2,
                marginBottom: 4,
              }}
            >
              {
                ({
                  1: "Create your account",
                  2: "Tell us about your company",
                  3: "Where should we reach you?",
                  4: "Pick the right plan",
                  5: "Verify and launch",
                } as Record<number, string>)[w.step]
              }
            </h1>
            <p style={{ fontSize: 14, color: "#475569", lineHeight: 1.6, marginBottom: 32 }}>
              {
                ({
                  1: "Start your 14-day free trial. No credit card required.",
                  2: "Help us tailor the experience for your business.",
                  3: "We'll use this only for account recovery and verification.",
                  4: "All plans include a 14-day trial. Upgrade anytime.",
                  5: "Enter the 6-digit code we sent to confirm your identity.",
                } as Record<number, string>)[w.step]
              }
            </p>

            {/* ═══ STEP 1: USER INFO ═══ */}
            {w.step === 1 && (
              <div>
                <MinimalField
                  label="Full Name"
                  value={w.form.name}
                  onChange={(v) => w.setField("name", v)}
                  onBlur={() => w.markTouched(["name"])}
                  placeholder="Alex Morgan"
                  icon={User2}
                  error={w.fieldError("name")}
                />
                <MinimalField
                  label="Work Email"
                  value={w.form.email}
                  onChange={(v) => w.setField("email", v)}
                  onBlur={() => w.markTouched(["email"])}
                  placeholder="alex@company.com"
                  icon={Mail}
                  error={w.fieldError("email")}
                  type="email"
                />
                <MinimalField
                  label="Password"
                  value={w.form.password}
                  onChange={(v) => w.setField("password", v)}
                  onBlur={() => w.markTouched(["password"])}
                  placeholder="Minimum 6 characters"
                  icon={Lock}
                  error={w.fieldError("password")}
                  type={w.showPassword ? "text" : "password"}
                  suffix={
                    <button
                      type="button"
                      onClick={() => w.setShowPassword(!w.showPassword)}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94A3B8",
                        padding: 4,
                      }}
                      tabIndex={-1}
                    >
                      {w.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  }
                />

                {/* Password strength bar */}
                {w.form.password && (
                  <div
                    style={{
                      marginBottom: 20,
                      padding: "12px 16px",
                      borderRadius: 8,
                      border: "1px solid #F1F5F9",
                      backgroundColor: "#FAFBFC",
                    }}
                  >
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                      <span style={{ color: "#475569", fontWeight: 500 }}>Password strength</span>
                      <span
                        style={{
                          fontWeight: 700,
                          color:
                            w.passwordStrength.tone === "weak"
                              ? "#EF4444"
                              : w.passwordStrength.tone === "good"
                                ? "#D97706"
                                : "#10B981",
                        }}
                      >
                        {w.passwordStrength.label}
                      </span>
                    </div>
                    <div
                      style={{
                        marginTop: 8,
                        height: 4,
                        borderRadius: 99,
                        backgroundColor: "#E2E8F0",
                        overflow: "hidden",
                      }}
                    >
                      <motion.div
                        style={{
                          height: "100%",
                          borderRadius: 99,
                          backgroundColor:
                            w.passwordStrength.tone === "weak"
                              ? "#EF4444"
                              : w.passwordStrength.tone === "good"
                                ? "#D97706"
                                : "#10B981",
                        }}
                        initial={{ width: 0 }}
                        animate={{ width: `${Math.max(w.passwordStrength.value, 8)}%` }}
                        transition={{ duration: 0.3 }}
                      />
                    </div>
                  </div>
                )}

                <MinimalField
                  label="Confirm Password"
                  value={w.form.confirmPassword}
                  onChange={(v) => w.setField("confirmPassword", v)}
                  onBlur={() => w.markTouched(["confirmPassword"])}
                  placeholder="Re-enter your password"
                  icon={Lock}
                  error={w.fieldError("confirmPassword")}
                  type={w.showConfirmPassword ? "text" : "password"}
                  suffix={
                    <button
                      type="button"
                      onClick={() => w.setShowConfirmPassword(!w.showConfirmPassword)}
                      style={{
                        position: "absolute",
                        right: 12,
                        top: "50%",
                        transform: "translateY(-50%)",
                        background: "none",
                        border: "none",
                        cursor: "pointer",
                        color: "#94A3B8",
                        padding: 4,
                      }}
                      tabIndex={-1}
                    >
                      {w.showConfirmPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                    </button>
                  }
                />
              </div>
            )}

            {/* ═══ STEP 2: COMPANY ═══ */}
            {w.step === 2 && (
              <div>
                <MinimalField
                  label="Company Name"
                  value={w.form.companyName}
                  onChange={(v) => w.setField("companyName", v)}
                  onBlur={() => w.markTouched(["companyName"])}
                  placeholder="Acme Corp"
                  icon={Building2}
                  error={w.fieldError("companyName")}
                />

                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0F172A",
                    marginBottom: 10,
                    letterSpacing: "-0.01em",
                  }}
                >
                  Company Type
                </label>
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                  {COMPANY_TYPES.map((ct) => {
                    const selected = w.form.companyType === ct.value;
                    return (
                      <button
                        key={ct.value}
                        type="button"
                        onClick={() => w.setField("companyType", ct.value)}
                        style={{
                          display: "flex",
                          alignItems: "flex-start",
                          gap: 10,
                          padding: "14px 16px",
                          border: `1.5px solid ${selected ? "#0891B2" : "#E2E8F0"}`,
                          borderRadius: 8,
                          backgroundColor: selected ? "rgba(8,145,178,0.04)" : "#FFFFFF",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 200ms ease",
                          fontFamily: "Urbanist, system-ui, sans-serif",
                        }}
                      >
                        <span style={{ fontSize: 20 }}>{ct.icon}</span>
                        <div>
                          <div
                            style={{
                              fontSize: 14,
                              fontWeight: 600,
                              color: selected ? "#0891B2" : "#0F172A",
                            }}
                          >
                            {ct.label}
                          </div>
                          <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>{ct.desc}</div>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            )}

            {/* ═══ STEP 3: CONTACT ═══ */}
            {w.step === 3 && (
              <div>
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0F172A",
                    marginBottom: 6,
                  }}
                >
                  Country
                </label>
                <div style={{ position: "relative", marginBottom: 20 }}>
                  <Globe2
                    style={{
                      position: "absolute",
                      left: 14,
                      top: "50%",
                      transform: "translateY(-50%)",
                      width: 16,
                      height: 16,
                      color: "#94A3B8",
                      pointerEvents: "none",
                      zIndex: 1,
                    }}
                  />
                  <select
                    value={w.form.countryCode}
                    onChange={(e) => w.setField("countryCode", e.target.value)}
                    style={{
                      width: "100%",
                      height: 48,
                      padding: "0 16px 0 42px",
                      border: "1.5px solid #E2E8F0",
                      borderRadius: 8,
                      backgroundColor: "#FFFFFF",
                      fontSize: 15,
                      color: "#0F172A",
                      appearance: "none",
                      outline: "none",
                      cursor: "pointer",
                      fontFamily: "Urbanist, system-ui, sans-serif",
                    }}
                  >
                    {COUNTRIES.map((c) => (
                      <option key={c.code} value={c.code}>
                        {c.flag} {c.name} ({c.dialCode})
                      </option>
                    ))}
                  </select>
                </div>

                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0F172A",
                    marginBottom: 6,
                  }}
                >
                  Phone Number
                </label>
                <div
                  style={{
                    display: "flex",
                    border: "1.5px solid #E2E8F0",
                    borderRadius: 8,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      height: 48,
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      padding: "0 14px",
                      borderRight: "1px solid #E2E8F0",
                      backgroundColor: "#F8FAFC",
                      fontSize: 14,
                      fontWeight: 600,
                      color: "#475569",
                      whiteSpace: "nowrap",
                    }}
                  >
                    <Phone style={{ width: 14, height: 14, color: "#94A3B8" }} />
                    {w.selectedCountry.flag} {w.selectedCountry.dialCode}
                  </div>
                  <input
                    value={w.form.phone}
                    onChange={(e) => w.setField("phone", e.target.value)}
                    onBlur={() => w.markTouched(["phone"])}
                    placeholder="555 010 2200"
                    style={{
                      flex: 1,
                      height: 48,
                      padding: "0 14px",
                      border: "none",
                      outline: "none",
                      fontSize: 15,
                      color: "#0F172A",
                      fontFamily: "Urbanist, system-ui, sans-serif",
                    }}
                  />
                </div>
                {w.fieldError("phone") && (
                  <p style={{ fontSize: 12, color: "#F43F5E", marginBottom: 12, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "#F43F5E", display: "inline-block" }} />
                    {w.fieldError("phone")}
                  </p>
                )}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "rgba(8,145,178,0.04)",
                    border: "1px solid rgba(8,145,178,0.10)",
                    fontSize: 12,
                    color: "#0891B2",
                  }}
                >
                  <Globe2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                  Auto-detected from your locale. You can change this anytime.
                </div>
              </div>
            )}

            {/* ═══ STEP 4: PLAN ═══ */}
            {w.step === 4 && (
              <div style={{ display: "grid", gap: 12 }}>
                {PLAN_CARDS.map((plan) => {
                  const selected = w.form.plan === plan.key;
                  return (
                    <button
                      key={plan.key}
                      type="button"
                      onClick={() => w.setField("plan", plan.key)}
                      style={{
                        position: "relative",
                        display: "block",
                        width: "100%",
                        padding: "20px 24px",
                        border: `1.5px solid ${selected ? "#0891B2" : "#E2E8F0"}`,
                        borderRadius: 10,
                        backgroundColor: selected ? "rgba(8,145,178,0.03)" : "#FFFFFF",
                        cursor: "pointer",
                        textAlign: "left",
                        transition: "all 200ms ease",
                        fontFamily: "Urbanist, system-ui, sans-serif",
                      }}
                    >
                      {plan.badge && (
                        <span
                          style={{
                            position: "absolute",
                            right: 16,
                            top: 16,
                            padding: "3px 10px",
                            borderRadius: 6,
                            backgroundColor: selected ? "#D97706" : "#0F172A",
                            color: "#FFFFFF",
                            fontSize: 10,
                            fontWeight: 700,
                            letterSpacing: "0.06em",
                            textTransform: "uppercase",
                          }}
                        >
                          {plan.badge}
                        </span>
                      )}

                      <p
                        style={{
                          fontSize: 12,
                          fontWeight: 600,
                          textTransform: "uppercase",
                          letterSpacing: "0.06em",
                          color: selected ? "#0891B2" : "#94A3B8",
                          marginBottom: 6,
                        }}
                      >
                        {plan.name}
                      </p>

                      <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                        <span style={{ fontSize: 28, fontWeight: 700, color: "#0F172A" }}>{plan.price}</span>
                        <span style={{ fontSize: 13, color: "#94A3B8" }}>/month</span>
                      </div>

                      <p style={{ fontSize: 13, color: "#475569", marginBottom: 14 }}>{plan.description}</p>

                      <div style={{ display: "grid", gap: 6 }}>
                        {plan.features.map((f) => (
                          <div
                            key={f}
                            style={{
                              display: "flex",
                              alignItems: "center",
                              gap: 8,
                              fontSize: 13,
                              color: selected ? "#0F172A" : "#475569",
                            }}
                          >
                            <Check
                              style={{
                                width: 14,
                                height: 14,
                                flexShrink: 0,
                                color: selected ? "#0891B2" : "#CBD5E1",
                              }}
                            />
                            {f}
                          </div>
                        ))}
                      </div>

                      {selected && (
                        <div
                          style={{
                            marginTop: 14,
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            gap: 6,
                            padding: "8px 0",
                            borderRadius: 6,
                            backgroundColor: "#0891B2",
                            color: "#FFFFFF",
                            fontSize: 12,
                            fontWeight: 700,
                          }}
                        >
                          <CheckCircle2 style={{ width: 14, height: 14 }} />
                          Selected
                        </div>
                      )}
                    </button>
                  );
                })}

                <div
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 8,
                    padding: "10px 14px",
                    borderRadius: 8,
                    backgroundColor: "rgba(16,185,129,0.05)",
                    border: "1px solid rgba(16,185,129,0.12)",
                    fontSize: 12,
                    color: "#059669",
                    marginTop: 4,
                  }}
                >
                  <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                  Upgrade anytime without losing data or tenant settings.
                </div>
              </div>
            )}

            {/* ═══ STEP 5: VERIFY ═══ */}
            {w.step === 5 && (
              <div>
                {/* OTP channel selector */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 24 }}>
                  {([
                    { channel: "email" as const, title: "Email OTP", desc: `Verify via ${w.form.email || "email"}`, icon: Mail },
                    { channel: "phone" as const, title: "Phone OTP", desc: "Use 123456 in test mode", icon: Phone },
                  ]).map((opt) => {
                    const selected = w.otpChannel === opt.channel;
                    return (
                      <button
                        key={opt.channel}
                        type="button"
                        onClick={() => w.switchOtpChannel(opt.channel)}
                        style={{
                          padding: "16px",
                          border: `1.5px solid ${selected ? "#0891B2" : "#E2E8F0"}`,
                          borderRadius: 8,
                          backgroundColor: selected ? "rgba(8,145,178,0.04)" : "#FFF",
                          cursor: "pointer",
                          textAlign: "left",
                          transition: "all 200ms ease",
                          fontFamily: "Urbanist, system-ui, sans-serif",
                        }}
                      >
                        <opt.icon style={{ width: 18, height: 18, color: selected ? "#0891B2" : "#94A3B8" }} />
                        <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A", marginTop: 10 }}>{opt.title}</p>
                        <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4 }}>{opt.desc}</p>
                      </button>
                    );
                  })}
                </div>

                {/* Send/resend OTP */}
                <div
                  style={{
                    padding: "14px 16px",
                    borderRadius: 8,
                    border: "1px solid #E2E8F0",
                    backgroundColor: "#FAFBFC",
                    marginBottom: 24,
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                    <div>
                      <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>
                        {w.hasSentOtp ? "Code sent" : "Request code"}
                      </p>
                      <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                        {w.hasSentOtp && w.otpSentTo
                          ? `Sent to ${w.otpSentTo}. Expires in ${formatTimer(w.otpExpiresIn)}.`
                          : w.otpChannel === "email"
                            ? "We simulate email delivery for now."
                            : "Phone verification uses static OTP 123456."}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => void w.requestOtp(w.otpChannel)}
                      disabled={w.isSendingOtp}
                      style={{
                        height: 34,
                        padding: "0 14px",
                        border: "1px solid #E2E8F0",
                        borderRadius: 6,
                        backgroundColor: "#FFF",
                        fontSize: 12,
                        fontWeight: 600,
                        color: "#475569",
                        cursor: w.isSendingOtp ? "not-allowed" : "pointer",
                        opacity: w.isSendingOtp ? 0.6 : 1,
                        display: "flex",
                        alignItems: "center",
                        gap: 6,
                        fontFamily: "Urbanist, system-ui, sans-serif",
                        transition: "all 200ms ease",
                      }}
                    >
                      {w.isSendingOtp && <Loader2 style={{ width: 12, height: 12, animation: "spin 1s linear infinite" }} />}
                      {w.hasSentOtp ? "Resend" : "Send OTP"}
                    </button>
                  </div>

                  {w.otpDebugCode && (
                    <div
                      style={{
                        marginTop: 10,
                        padding: "8px 12px",
                        borderRadius: 6,
                        backgroundColor: "rgba(8,145,178,0.06)",
                        border: "1px solid rgba(8,145,178,0.12)",
                        fontSize: 12,
                        color: "#0891B2",
                      }}
                    >
                      Demo OTP: <strong style={{ letterSpacing: "0.15em" }}>{w.otpDebugCode}</strong>
                    </div>
                  )}
                </div>

                {/* OTP input */}
                <label
                  style={{
                    display: "block",
                    fontSize: 13,
                    fontWeight: 600,
                    color: "#0F172A",
                    marginBottom: 10,
                    textAlign: "center",
                  }}
                >
                  Enter verification code
                </label>
                <OtpInput
                  value={w.otpCode}
                  onChange={(v) => w.setOtpCode(v)}
                  variant="minimal"
                />
              </div>
            )}

            {/* ═══ FOOTER ACTIONS ═══ */}
            <div
              style={{
                marginTop: 36,
                paddingTop: 24,
                borderTop: "1px solid #F1F5F9",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                flexWrap: "wrap",
                gap: 12,
              }}
            >
              <p style={{ fontSize: 13, color: "#94A3B8" }}>
                Already have an account?{" "}
                <Link
                  to="/login"
                  style={{ color: "#0891B2", fontWeight: 600, textDecoration: "none" }}
                >
                  Sign in
                </Link>
              </p>

              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                {w.step > 1 && (
                  <button
                    type="button"
                    onClick={w.goBack}
                    disabled={w.isSubmitting}
                    style={{
                      height: 42,
                      padding: "0 16px",
                      border: "none",
                      borderRadius: 8,
                      backgroundColor: "transparent",
                      color: "#475569",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "Urbanist, system-ui, sans-serif",
                      transition: "color 200ms ease",
                    }}
                  >
                    <ArrowLeft style={{ width: 16, height: 16 }} />
                    Back
                  </button>
                )}

                {w.step < 5 ? (
                  <button
                    type="button"
                    onClick={w.goNext}
                    disabled={!w.stepValid[w.step]}
                    style={{
                      height: 42,
                      padding: "0 24px",
                      border: "none",
                      borderRadius: 8,
                      backgroundColor: w.stepValid[w.step] ? "#0891B2" : "#CBD5E1",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: w.stepValid[w.step] ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "Urbanist, system-ui, sans-serif",
                      transition: "background-color 200ms ease",
                    }}
                  >
                    {w.step === 1 ? "Start Free Trial" : "Continue"}
                    <ArrowRight style={{ width: 16, height: 16 }} />
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={() => void w.handleVerifyAndSignup()}
                    disabled={!w.stepValid[5] || w.isSubmitting}
                    style={{
                      height: 42,
                      padding: "0 24px",
                      border: "none",
                      borderRadius: 8,
                      backgroundColor: w.stepValid[5] && !w.isSubmitting ? "#0891B2" : "#CBD5E1",
                      color: "#FFFFFF",
                      fontSize: 14,
                      fontWeight: 600,
                      cursor: w.stepValid[5] && !w.isSubmitting ? "pointer" : "not-allowed",
                      display: "flex",
                      alignItems: "center",
                      gap: 6,
                      fontFamily: "Urbanist, system-ui, sans-serif",
                      transition: "background-color 200ms ease",
                    }}
                  >
                    {w.isSubmitting ? (
                      <>
                        <Loader2 style={{ width: 16, height: 16, animation: "spin 1s linear infinite" }} />
                        Creating workspace…
                      </>
                    ) : (
                      <>
                        Verify & Create Account
                        <ChevronRight style={{ width: 16, height: 16 }} />
                      </>
                    )}
                  </button>
                )}
              </div>
            </div>
          </motion.div>
        </AnimatePresence>
      </div>

      <style>{`@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}`}</style>
    </div>
  );
}
