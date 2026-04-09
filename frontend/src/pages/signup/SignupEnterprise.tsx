/**
 * THEME 3 — PREMIUM ENTERPRISE
 * ─────────────────────────────
 * Structured, data-oriented, slightly denser.
 * Dark sidebar with step navigator. Sticky bottom action bar.
 * Compact fields, floating labels, monospace OTP, trust badges.
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
  Shield,
  User2,
  Zap,
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

const ENT_STYLES = `
  @keyframes entSpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }

  .ent-input {
    width: 100%;
    height: 44px;
    padding: 0 12px 0 40px;
    border: 1px solid #CBD5E1;
    border-radius: 6px;
    background-color: #FFFFFF;
    font-size: 14px;
    color: #0F172A;
    outline: none;
    transition: border-color 150ms ease, box-shadow 150ms ease;
    font-family: Urbanist, system-ui, sans-serif;
  }
  .ent-input:focus {
    border-color: #0891B2;
    border-bottom-width: 2px;
    box-shadow: 0 0 0 2px rgba(8,145,178,0.06);
  }
  .ent-input::placeholder { color: #94A3B8; }
  .ent-input.has-error { border-color: #EF4444; }
  .ent-input.has-error:focus { box-shadow: 0 0 0 2px rgba(239,68,68,0.06); }
`;

/* ──────────── compact field ──────────── */
function EntField({
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
    <div style={{ marginBottom: 14 }}>
      <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <Icon style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94A3B8", pointerEvents: "none" }} />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`ent-input ${error ? "has-error" : ""}`}
        />
        {suffix}
      </div>
      {error && (
        <p style={{ fontSize: 11, color: "#EF4444", marginTop: 4, display: "flex", alignItems: "center", gap: 4 }}>
          <span style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#EF4444", display: "inline-block" }} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   THEME 3 COMPONENT
   ══════════════════════════════════════════════════ */

export default function SignupEnterprise() {
  const w = useSignupWizard();

  const stepTitles: Record<number, string> = {
    1: "Account credentials",
    2: "Organization details",
    3: "Contact information",
    4: "Select plan",
    5: "Identity verification",
  };

  const stepDescs: Record<number, string> = {
    1: "Create secure credentials for your workspace administrator account.",
    2: "Configure your organization profile and team structure.",
    3: "Provide contact details for account recovery and notifications.",
    4: "Choose the plan that best fits your operation scale.",
    5: "Complete OTP verification to activate your workspace.",
  };

  return (
    <>
      <style>{ENT_STYLES}</style>

      <div
        className="ent-root"
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr",
          fontFamily: "Urbanist, system-ui, sans-serif",
          overflow: "hidden",
        }}
      >
        {/* ═══════════════ DARK SIDEBAR ═══════════════ */}
        <aside
          className="ent-sidebar"
          style={{
            width: "100%",
            backgroundColor: "#0F172A",
            color: "#F1F5F9",
            padding: "28px 24px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            borderRight: "1px solid rgba(255,255,255,0.06)",
          }}
        >
          {/* Logo */}
          <div>
            <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none", marginBottom: 36 }}>
              <img src={logo} alt="Zodo CRM" style={{ height: 30, width: "auto" }} />
              <span style={{ fontSize: 14, fontWeight: 700, color: "#F1F5F9", letterSpacing: "-0.02em" }}>
                ZODO CRM
              </span>
            </Link>

            {/* Step progress */}
            <div style={{ marginTop: 4 }}>
              <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#475569", marginBottom: 16 }}>
                REGISTRATION PROGRESS
              </p>
              {STEPS.map((s) => {
                const isActive = s.id === w.step;
                const isDone = s.id < w.step;
                return (
                  <div
                    key={s.id}
                    style={{
                      display: "flex",
                      alignItems: "center",
                      gap: 12,
                      padding: "10px 12px",
                      borderRadius: 6,
                      marginBottom: 4,
                      backgroundColor: isActive ? "rgba(8,145,178,0.12)" : "transparent",
                      transition: "background 200ms",
                    }}
                  >
                    <div
                      style={{
                        width: 26,
                        height: 26,
                        borderRadius: 6,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        fontSize: 11,
                        fontWeight: 700,
                        flexShrink: 0,
                        backgroundColor: isDone
                          ? "#10B981"
                          : isActive
                            ? "#0891B2"
                            : "rgba(255,255,255,0.06)",
                        color: isDone || isActive ? "#FFFFFF" : "#64748B",
                        border: isDone || isActive ? "none" : "1px solid rgba(255,255,255,0.08)",
                      }}
                    >
                      {isDone ? <Check style={{ width: 12, height: 12 }} /> : s.id}
                    </div>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: isActive ? 700 : 500, color: isActive ? "#F1F5F9" : isDone ? "#94A3B8" : "#64748B" }}>
                        {s.label}
                      </p>
                    </div>
                    {isActive && (
                      <div style={{ marginLeft: "auto", width: 6, height: 6, borderRadius: "50%", backgroundColor: "#22D3EE", animation: "entSpin 2s linear infinite", boxShadow: "0 0 8px rgba(34,211,238,0.4)" }} />
                    )}
                  </div>
                );
              })}
            </div>

            {/* Counter bar */}
            <div style={{ marginTop: 24, padding: "12px 14px", borderRadius: 8, backgroundColor: "rgba(255,255,255,0.04)", border: "1px solid rgba(255,255,255,0.06)" }}>
              <div style={{ display: "flex", justifyContent: "space-between", fontSize: 11, color: "#64748B", marginBottom: 6 }}>
                <span>Progress</span>
                <span>{Math.round(w.progress)}%</span>
              </div>
              <div style={{ height: 3, borderRadius: 99, backgroundColor: "rgba(255,255,255,0.08)", overflow: "hidden" }}>
                <motion.div
                  style={{ height: "100%", borderRadius: 99, backgroundColor: "#0891B2" }}
                  animate={{ width: `${w.progress}%` }}
                  transition={{ duration: 0.4 }}
                />
              </div>
            </div>
          </div>

          {/* Trust badges */}
          <div style={{ marginTop: 24 }}>
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {[
                { icon: Shield, text: "SSL encrypted" },
                { icon: Zap, text: "SOC 2 ready" },
                { icon: CheckCircle2, text: "GDPR compliant" },
              ].map((b) => (
                <div key={b.text} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 11, color: "#64748B" }}>
                  <b.icon style={{ width: 13, height: 13, color: "#475569" }} />
                  {b.text}
                </div>
              ))}
            </div>
          </div>
        </aside>

        {/* ═══════════════ MAIN CONTENT ═══════════════ */}
        <main
          className="ent-main"
          style={{
            backgroundColor: "#F8FAFC",
            display: "flex",
            flexDirection: "column",
            overflowY: "auto",
          }}
        >
          {/* Top bar */}
          <div
            style={{
              position: "sticky",
              top: 0,
              zIndex: 20,
              backgroundColor: "rgba(255,255,255,0.95)",
              backdropFilter: "blur(12px)",
              borderBottom: "1px solid rgba(15,23,42,0.06)",
              padding: "12px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "#94A3B8" }}>
              <span>Registration</span>
              <ChevronRight style={{ width: 12, height: 12 }} />
              <span style={{ color: "#0F172A", fontWeight: 600 }}>{stepTitles[w.step]}</span>
            </div>
            <span style={{ fontSize: 12, fontWeight: 600, color: "#475569", padding: "4px 12px", borderRadius: 4, backgroundColor: "#F1F5F9" }}>
              Step {w.step} of {STEPS.length}
            </span>
          </div>

          {/* Content area */}
          <div style={{ flex: 1, padding: "28px 32px 100px" }}>
            <div style={{ maxWidth: 600 }}>
              <AnimatePresence mode="wait">
                <motion.div
                  key={w.step}
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, y: -6 }}
                  transition={{ duration: 0.18, ease: "easeOut" }}
                >
                  {/* Header */}
                  <h2 style={{ fontSize: 22, fontWeight: 700, color: "#0F172A", letterSpacing: "-0.02em", marginBottom: 4 }}>
                    {stepTitles[w.step]}
                  </h2>
                  <p style={{ fontSize: 13, color: "#64748B", lineHeight: 1.6, marginBottom: 24 }}>
                    {stepDescs[w.step]}
                  </p>

                  {/* Card container */}
                  <div
                    style={{
                      backgroundColor: "#FFFFFF",
                      borderRadius: 8,
                      border: "1px solid rgba(15,23,42,0.08)",
                      padding: "24px",
                    }}
                  >
                    {/* ═══ STEP 1 ═══ */}
                    {w.step === 1 && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "1fr", gap: 0 }}>
                          <EntField label="Full Name" value={w.form.name} onChange={(v) => w.setField("name", v)} onBlur={() => w.markTouched(["name"])} placeholder="Alex Morgan" icon={User2} error={w.fieldError("name")} />
                          <EntField label="Work Email" value={w.form.email} onChange={(v) => w.setField("email", v)} onBlur={() => w.markTouched(["email"])} placeholder="alex@company.com" icon={Mail} error={w.fieldError("email")} type="email" />
                        </div>

                        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                          <EntField
                            label="Password"
                            value={w.form.password}
                            onChange={(v) => w.setField("password", v)}
                            onBlur={() => w.markTouched(["password"])}
                            placeholder="Min. 6 characters"
                            icon={Lock}
                            error={w.fieldError("password")}
                            type={w.showPassword ? "text" : "password"}
                            suffix={
                              <button type="button" onClick={() => w.setShowPassword(!w.showPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2 }} tabIndex={-1}>
                                {w.showPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                              </button>
                            }
                          />
                          <EntField
                            label="Confirm Password"
                            value={w.form.confirmPassword}
                            onChange={(v) => w.setField("confirmPassword", v)}
                            onBlur={() => w.markTouched(["confirmPassword"])}
                            placeholder="Re-enter"
                            icon={Lock}
                            error={w.fieldError("confirmPassword")}
                            type={w.showConfirmPassword ? "text" : "password"}
                            suffix={
                              <button type="button" onClick={() => w.setShowConfirmPassword(!w.showConfirmPassword)} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 2 }} tabIndex={-1}>
                                {w.showConfirmPassword ? <EyeOff style={{ width: 14, height: 14 }} /> : <Eye style={{ width: 14, height: 14 }} />}
                              </button>
                            }
                          />
                        </div>

                        {/* Strength */}
                        {w.form.password && (
                          <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 12px", borderRadius: 6, backgroundColor: "#FAFBFC", border: "1px solid #F1F5F9", marginTop: 2 }}>
                            <div style={{ flex: 1 }}>
                              <div style={{ height: 3, borderRadius: 99, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
                                <motion.div
                                  style={{ height: "100%", borderRadius: 99, backgroundColor: w.passwordStrength.tone === "weak" ? "#EF4444" : w.passwordStrength.tone === "good" ? "#D97706" : "#10B981" }}
                                  animate={{ width: `${Math.max(w.passwordStrength.value, 8)}%` }}
                                  transition={{ duration: 0.3 }}
                                />
                              </div>
                            </div>
                            <span style={{ fontSize: 11, fontWeight: 600, whiteSpace: "nowrap", color: w.passwordStrength.tone === "weak" ? "#EF4444" : w.passwordStrength.tone === "good" ? "#D97706" : "#10B981" }}>
                              {w.passwordStrength.label}
                            </span>
                          </div>
                        )}
                      </div>
                    )}

                    {/* ═══ STEP 2 ═══ */}
                    {w.step === 2 && (
                      <div>
                        <EntField label="Company Name" value={w.form.companyName} onChange={(v) => w.setField("companyName", v)} onBlur={() => w.markTouched(["companyName"])} placeholder="Acme Corp" icon={Building2} error={w.fieldError("companyName")} />

                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 8 }}>
                          Organization type
                        </label>
                        <div style={{ display: "grid", gap: 6 }}>
                          {COMPANY_TYPES.map((ct) => {
                            const sel = w.form.companyType === ct.value;
                            return (
                              <button
                                key={ct.value}
                                type="button"
                                onClick={() => w.setField("companyType", ct.value)}
                                style={{
                                  display: "flex",
                                  alignItems: "center",
                                  gap: 14,
                                  padding: "12px 14px",
                                  borderRadius: 6,
                                  border: `1px solid ${sel ? "#0891B2" : "#E2E8F0"}`,
                                  backgroundColor: sel ? "rgba(8,145,178,0.03)" : "#FFFFFF",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 150ms ease",
                                  fontFamily: "Urbanist, system-ui, sans-serif",
                                }}
                              >
                                {/* Radio dot */}
                                <div style={{
                                  width: 18, height: 18, borderRadius: "50%",
                                  border: `2px solid ${sel ? "#0891B2" : "#CBD5E1"}`,
                                  display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0,
                                }}>
                                  {sel && <div style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#0891B2" }} />}
                                </div>
                                <span style={{ fontSize: 18, flexShrink: 0 }}>{ct.icon}</span>
                                <div style={{ flex: 1 }}>
                                  <span style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{ct.label}</span>
                                  <span style={{ fontSize: 12, color: "#94A3B8", marginLeft: 8 }}>{ct.desc}</span>
                                </div>
                              </button>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* ═══ STEP 3 ═══ */}
                    {w.step === 3 && (
                      <div>
                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>Country</label>
                        <div style={{ position: "relative", marginBottom: 14 }}>
                          <Globe2 style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", width: 15, height: 15, color: "#94A3B8", pointerEvents: "none", zIndex: 1 }} />
                          <select value={w.form.countryCode} onChange={(e) => w.setField("countryCode", e.target.value)} className="ent-input" style={{ paddingLeft: 40, cursor: "pointer", appearance: "none" }}>
                            {COUNTRIES.map((c) => (
                              <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dialCode})</option>
                            ))}
                          </select>
                        </div>

                        <label style={{ display: "block", fontSize: 12, fontWeight: 600, color: "#475569", marginBottom: 5 }}>Phone Number</label>
                        <div style={{ display: "flex", border: "1px solid #CBD5E1", borderRadius: 6, overflow: "hidden", marginBottom: 12 }}>
                          <div style={{
                            height: 44, display: "flex", alignItems: "center", gap: 6, padding: "0 12px",
                            borderRight: "1px solid #E2E8F0", backgroundColor: "#FAFBFC",
                            fontSize: 13, fontWeight: 600, color: "#475569", whiteSpace: "nowrap",
                          }}>
                            <Phone style={{ width: 13, height: 13, color: "#94A3B8" }} />
                            {w.selectedCountry.flag} {w.selectedCountry.dialCode}
                          </div>
                          <input
                            value={w.form.phone}
                            onChange={(e) => w.setField("phone", e.target.value)}
                            onBlur={() => w.markTouched(["phone"])}
                            placeholder="555 010 2200"
                            style={{ flex: 1, height: 44, padding: "0 12px", border: "none", outline: "none", fontSize: 14, color: "#0F172A", fontFamily: "Urbanist, system-ui, sans-serif" }}
                          />
                        </div>
                        {w.fieldError("phone") && (
                          <p style={{ fontSize: 11, color: "#EF4444", marginBottom: 10, display: "flex", alignItems: "center", gap: 4 }}>
                            <span style={{ width: 3, height: 3, borderRadius: "50%", backgroundColor: "#EF4444", display: "inline-block" }} />
                            {w.fieldError("phone")}
                          </p>
                        )}
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, backgroundColor: "rgba(8,145,178,0.04)", border: "1px solid rgba(8,145,178,0.08)", fontSize: 11, color: "#0891B2" }}>
                          <Globe2 style={{ width: 12, height: 12, flexShrink: 0 }} />
                          Auto-detected from your browser locale.
                        </div>
                      </div>
                    )}

                    {/* ═══ STEP 4 ═══ */}
                    {w.step === 4 && (
                      <div>
                        <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 10 }}>
                          {PLAN_CARDS.map((plan) => {
                            const sel = w.form.plan === plan.key;
                            return (
                              <button
                                key={plan.key}
                                type="button"
                                onClick={() => w.setField("plan", plan.key)}
                                style={{
                                  position: "relative",
                                  display: "flex",
                                  flexDirection: "column",
                                  padding: "18px 16px",
                                  borderRadius: 8,
                                  border: `1.5px solid ${sel ? "#0891B2" : "#E2E8F0"}`,
                                  backgroundColor: sel ? "rgba(8,145,178,0.02)" : "#FFFFFF",
                                  cursor: "pointer",
                                  textAlign: "left",
                                  transition: "all 150ms ease",
                                  fontFamily: "Urbanist, system-ui, sans-serif",
                                  flex: 1,
                                }}
                              >
                                {plan.badge && (
                                  <span style={{
                                    position: "absolute", top: -1, left: 0, right: 0,
                                    textAlign: "center", padding: "2px 0", borderRadius: "8px 8px 0 0",
                                    background: sel ? "#D97706" : "#0F172A",
                                    color: "#FFF", fontSize: 9, fontWeight: 700, letterSpacing: "0.08em", textTransform: "uppercase",
                                  }}>
                                    {plan.badge}
                                  </span>
                                )}

                                <p style={{ fontSize: 11, fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.06em", color: sel ? "#0891B2" : "#94A3B8", marginBottom: 6, marginTop: plan.badge ? 8 : 0 }}>
                                  {plan.name}
                                </p>
                                <div style={{ display: "flex", alignItems: "baseline", gap: 2, marginBottom: 6 }}>
                                  <span style={{ fontSize: 24, fontWeight: 700, color: "#0F172A" }}>{plan.price}</span>
                                  <span style={{ fontSize: 11, color: "#94A3B8" }}>/mo</span>
                                </div>
                                <p style={{ fontSize: 11, color: "#64748B", lineHeight: 1.5, marginBottom: 12 }}>{plan.description}</p>

                                <div style={{ display: "grid", gap: 4, flex: 1 }}>
                                  {plan.features.slice(0, 6).map((f) => (
                                    <div key={f} style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 11, color: sel ? "#0F172A" : "#64748B" }}>
                                      <Check style={{ width: 11, height: 11, flexShrink: 0, color: sel ? "#0891B2" : "#CBD5E1" }} />
                                      {f}
                                    </div>
                                  ))}
                                </div>

                                {sel && (
                                  <div style={{
                                    marginTop: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 4,
                                    padding: "6px 0", borderRadius: 4, backgroundColor: "#0891B2", color: "#FFF", fontSize: 11, fontWeight: 700,
                                  }}>
                                    <CheckCircle2 style={{ width: 12, height: 12 }} /> Active
                                  </div>
                                )}
                              </button>
                            );
                          })}
                        </div>
                        <div style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", borderRadius: 6, backgroundColor: "rgba(16,185,129,0.04)", border: "1px solid rgba(16,185,129,0.10)", fontSize: 11, color: "#059669", marginTop: 12 }}>
                          <CheckCircle2 style={{ width: 12, height: 12, flexShrink: 0 }} />
                          Plans can be upgraded anytime without data loss.
                        </div>
                      </div>
                    )}

                    {/* ═══ STEP 5 ═══ */}
                    {w.step === 5 && (
                      <div>
                        <div style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 10,
                          padding: "12px 14px",
                          borderRadius: 6,
                          border: "1px solid #E2E8F0",
                          backgroundColor: "#FFF",
                          marginBottom: 20,
                        }}>
                          <div style={{
                            width: 34,
                            height: 34,
                            borderRadius: 6,
                            backgroundColor: "rgba(8,145,178,0.08)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            flexShrink: 0,
                          }}>
                            <Mail style={{ width: 16, height: 16, color: "#0891B2" }} />
                          </div>
                          <div style={{ minWidth: 0 }}>
                            <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>Email verification</p>
                            <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 4, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                              Codes are sent only to {w.form.email || "your work email"}.
                            </p>
                          </div>
                        </div>

                        {/* Send/resend */}
                        <div style={{ padding: "12px 14px", borderRadius: 6, border: "1px solid #E2E8F0", backgroundColor: "#FAFBFC", marginBottom: 20 }}>
                          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8 }}>
                            <div>
                              <p style={{ fontSize: 13, fontWeight: 600, color: "#0F172A" }}>{w.hasSentOtp ? "Code delivered" : "Request code"}</p>
                              <p style={{ fontSize: 11, color: "#94A3B8", marginTop: 2 }}>
                                {w.hasSentOtp && w.otpSentTo ? `Sent to ${w.otpSentTo}. Expires ${formatTimer(w.otpExpiresIn)}.` : "We’ll send a 6-digit code to your email when requested."}
                              </p>
                            </div>
                            <button type="button" onClick={() => void w.requestOtp()} disabled={w.isSendingOtp} style={{
                              height: 32, padding: "0 14px", borderRadius: 4, border: "1px solid #0891B2", backgroundColor: "transparent",
                              color: "#0891B2", fontSize: 12, fontWeight: 600, cursor: w.isSendingOtp ? "not-allowed" : "pointer",
                              display: "flex", alignItems: "center", gap: 4, fontFamily: "Urbanist, system-ui, sans-serif",
                              opacity: w.isSendingOtp ? 0.6 : 1,
                            }}>
                              {w.isSendingOtp && <Loader2 style={{ width: 11, height: 11, animation: "entSpin 1s linear infinite" }} />}
                              {w.hasSentOtp ? "Resend" : "Send"}
                            </button>
                          </div>
                          {w.otpDebugCode && (
                            <div style={{ marginTop: 8, padding: "6px 10px", borderRadius: 4, backgroundColor: "rgba(8,145,178,0.05)", border: "1px solid rgba(8,145,178,0.10)", fontSize: 11, color: "#0891B2" }}>
                              Dev code: <strong style={{ fontFamily: "monospace", letterSpacing: "0.2em" }}>{w.otpDebugCode}</strong>
                            </div>
                          )}
                        </div>

                        {/* OTP input */}
                        <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
                          <Shield style={{ width: 14, height: 14, color: "#0891B2" }} />
                          <span style={{ fontSize: 12, fontWeight: 600, color: "#475569" }}>Enter verification code</span>
                        </div>
                        <OtpInput value={w.otpCode} onChange={(v) => w.setOtpCode(v)} variant="enterprise" />
                      </div>
                    )}
                  </div>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>

          {/* ── Sticky bottom action bar ── */}
          <div
            style={{
              position: "sticky",
              bottom: 0,
              zIndex: 20,
              backgroundColor: "rgba(255,255,255,0.96)",
              backdropFilter: "blur(12px)",
              borderTop: "1px solid rgba(15,23,42,0.06)",
              padding: "12px 32px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
            }}
          >
            <p style={{ fontSize: 12, color: "#94A3B8" }}>
              Have an account?{" "}
              <Link to="/login" style={{ color: "#0891B2", fontWeight: 600, textDecoration: "none" }}>Sign in</Link>
            </p>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {w.step > 1 && (
                <button type="button" onClick={w.goBack} disabled={w.isSubmitting} style={{
                  height: 38, padding: "0 16px", borderRadius: 6, border: "1px solid #E2E8F0",
                  backgroundColor: "#FFFFFF", color: "#475569", fontSize: 13, fontWeight: 600,
                  cursor: "pointer", display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "Urbanist, system-ui, sans-serif", transition: "all 150ms",
                }}>
                  <ArrowLeft style={{ width: 14, height: 14 }} /> Back
                </button>
              )}
              {w.step < 5 ? (
                <button type="button" onClick={w.goNext} disabled={!w.stepValid[w.step]} style={{
                  height: 38, padding: "0 20px", borderRadius: 6, border: "none",
                  backgroundColor: w.stepValid[w.step] ? "#0891B2" : "#CBD5E1",
                  color: "#FFF", fontSize: 13, fontWeight: 600,
                  cursor: w.stepValid[w.step] ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "Urbanist, system-ui, sans-serif", transition: "all 150ms",
                }}>
                  {w.step === 1 ? "Start Trial" : "Continue"} <ArrowRight style={{ width: 14, height: 14 }} />
                </button>
              ) : (
                <button type="button" onClick={() => void w.handleVerifyAndSignup()} disabled={!w.stepValid[5] || w.isSubmitting} style={{
                  height: 38, padding: "0 20px", borderRadius: 6, border: "none",
                  backgroundColor: w.stepValid[5] && !w.isSubmitting ? "#0891B2" : "#CBD5E1",
                  color: "#FFF", fontSize: 13, fontWeight: 600,
                  cursor: w.stepValid[5] && !w.isSubmitting ? "pointer" : "not-allowed",
                  display: "flex", alignItems: "center", gap: 5,
                  fontFamily: "Urbanist, system-ui, sans-serif",
                }}>
                  {w.isSubmitting ? <><Loader2 style={{ width: 14, height: 14, animation: "entSpin 1s linear infinite" }} /> Provisioning…</> : <>Verify & Create <ChevronRight style={{ width: 14, height: 14 }} /></>}
                </button>
              )}
            </div>
          </div>
        </main>
      </div>

      {/* Responsive */}
      <style>{`
        @media (min-width: 1024px) {
          .ent-root { grid-template-columns: 280px 1fr !important; }
        }
        @media (max-width: 1023px) {
          .ent-sidebar { display: none !important; }
        }
        @media (max-width: 700px) {
          .ent-root [style*="grid-template-columns: repeat(3"] {
            grid-template-columns: 1fr !important;
          }
        }
      `}</style>
    </>
  );
}
