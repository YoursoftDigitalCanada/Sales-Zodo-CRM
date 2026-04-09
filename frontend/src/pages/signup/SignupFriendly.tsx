/**
 * THEME 2 — SOFT CRM FRIENDLY
 * ────────────────────────────
 * Rounded, approachable, slightly playful but professional.
 * Left panel with gradient blobs + hero. Right panel with rounded form card.
 * Pill-shaped buttons, generous border-radii, warm micro-interactions.
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
  ShieldCheck,
  Sparkles,
  Star,
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

/* ──────────── shared CSS keyframes ──────────── */
const FRIENDLY_STYLES = `
  @keyframes friendlyFloat { 0%,100%{transform:translateY(0)} 50%{transform:translateY(-6px)} }
  @keyframes friendlySpin { from{transform:rotate(0)} to{transform:rotate(360deg)} }
  @keyframes friendlyPulse { 0%,100%{opacity:0.6} 50%{opacity:1} }
  @keyframes friendlyBlob1 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(30px,-20px) scale(1.05)} 66%{transform:translate(-10px,15px) scale(0.95)} }
  @keyframes friendlyBlob2 { 0%,100%{transform:translate(0,0) scale(1)} 33%{transform:translate(-25px,15px) scale(1.08)} 66%{transform:translate(20px,-10px) scale(0.92)} }

  .friendly-input {
    width: 100%;
    height: 50px;
    padding: 0 40px 0 44px;
    border: 2px solid transparent;
    border-radius: 14px;
    background-color: #F1F5F9;
    font-size: 15px;
    color: #0F172A;
    outline: none;
    transition: all 250ms cubic-bezier(0.4,0,0.2,1);
    font-family: Urbanist, system-ui, sans-serif;
  }
  .friendly-input:focus {
    background-color: #FFFFFF;
    border-color: #0891B2;
    box-shadow: 0 0 0 4px rgba(8,145,178,0.08), 0 2px 8px rgba(8,145,178,0.06);
    transform: translateY(-1px);
  }
  .friendly-input::placeholder { color: #94A3B8; }
  .friendly-input.has-error { border-color: #F43F5E; background-color: rgba(244,63,94,0.03); }
  .friendly-input.has-error:focus { box-shadow: 0 0 0 4px rgba(244,63,94,0.08); }
`;

/* ──────────── field component ──────────── */
function FriendlyField({
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
    <div style={{ marginBottom: 18 }}>
      <label
        style={{
          display: "block",
          fontSize: 12,
          fontWeight: 700,
          letterSpacing: "0.06em",
          textTransform: "uppercase",
          color: "#475569",
          marginBottom: 7,
        }}
      >
        {label}
      </label>
      <div style={{ position: "relative" }}>
        <Icon
          style={{
            position: "absolute",
            left: 15,
            top: "50%",
            transform: "translateY(-50%)",
            width: 16,
            height: 16,
            color: "#94A3B8",
            pointerEvents: "none",
            transition: "color 200ms",
          }}
        />
        <input
          type={type}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          onBlur={onBlur}
          placeholder={placeholder}
          className={`friendly-input ${error ? "has-error" : ""}`}
        />
        {suffix}
      </div>
      {error && (
        <p style={{ fontSize: 12, color: "#F43F5E", marginTop: 5, display: "flex", alignItems: "center", gap: 5 }}>
          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#F43F5E", display: "inline-block" }} />
          {error}
        </p>
      )}
    </div>
  );
}

/* ══════════════════════════════════════════════════
   THEME 2 COMPONENT
   ══════════════════════════════════════════════════ */

export default function SignupFriendly() {
  const w = useSignupWizard();

  const stepTitles: Record<number, string> = {
    1: "Create your account",
    2: "Tell us about your company",
    3: "Where should we reach you?",
    4: "Pick the right plan",
    5: "Verify and launch",
  };

  return (
    <>
      <style>{FRIENDLY_STYLES}</style>

      <div
        style={{
          minHeight: "100vh",
          display: "grid",
          gridTemplateColumns: "1fr",
          fontFamily: "Urbanist, system-ui, sans-serif",
          background: "linear-gradient(180deg, #F8FAFC 0%, #F7F7FB 100%)",
          padding: "20px",
          gap: 20,
        }}
        className="friendly-root"
      >
        {/* ═══════════════ LEFT PANEL ═══════════════ */}
        <div
          className="friendly-left"
          style={{
            position: "relative",
            background: "linear-gradient(180deg, rgba(255,255,255,0.92) 0%, rgba(241,245,249,0.96) 100%)",
            padding: "28px 28px 30px",
            display: "flex",
            flexDirection: "column",
            justifyContent: "space-between",
            overflow: "hidden",
            color: "#0F172A",
            borderRadius: 28,
            border: "1px solid rgba(15,23,42,0.06)",
            boxShadow: "0 12px 38px rgba(15,23,42,0.06)",
          }}
        >
          {/* Gradient blobs */}
          <div
            style={{
              position: "absolute",
              top: -60,
              right: -60,
              width: 280,
              height: 280,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(8,145,178,0.16) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "friendlyBlob1 12s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              bottom: -40,
              left: -40,
              width: 240,
              height: 240,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(217,119,6,0.14) 0%, transparent 70%)",
              filter: "blur(40px)",
              animation: "friendlyBlob2 15s ease-in-out infinite",
            }}
          />
          <div
            style={{
              position: "absolute",
              top: "50%",
              left: "30%",
              width: 200,
              height: 200,
              borderRadius: "50%",
              background: "radial-gradient(circle, rgba(34,211,238,0.10) 0%, transparent 70%)",
              filter: "blur(60px)",
            }}
          />

          {/* Header */}
          <div style={{ position: "relative", zIndex: 1 }}>
            <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
              <Link to="/" style={{ display: "inline-flex", alignItems: "center", gap: 10, textDecoration: "none" }}>
                <img src={logo} alt="Zodo CRM" style={{ height: 36, width: "auto" }} />
              </Link>
              <div
                style={{
                  display: "flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "6px 14px",
                  borderRadius: 99,
                  backgroundColor: "rgba(34,211,238,0.1)",
                  border: "1px solid rgba(34,211,238,0.2)",
                  fontSize: 12,
                  fontWeight: 600,
                  color: "#0891B2",
                }}
              >
                <Sparkles style={{ width: 13, height: 13 }} />
                14-day free trial
              </div>
            </div>

            {/* Hero text */}
            <div style={{ marginTop: 48 }}>
              <div
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  gap: 6,
                  padding: "5px 12px",
                  borderRadius: 99,
                  backgroundColor: "rgba(8,145,178,0.12)",
                  border: "1px solid rgba(8,145,178,0.2)",
                  fontSize: 11,
                  fontWeight: 700,
                  letterSpacing: "0.08em",
                  color: "#0891B2",
                  marginBottom: 20,
                }}
              >
                <Star style={{ width: 12, height: 12 }} />
                BUILT FOR SERVICE BUSINESSES
              </div>
              <h1
                style={{
                  fontSize: 38,
                  fontWeight: 700,
                  lineHeight: 1.15,
                  letterSpacing: "-0.03em",
                  marginBottom: 14,
                  color: "#0F172A",
                }}
              >
                Launch your CRM workspace in{" "}
                <span style={{ color: "#0891B2" }}>minutes</span>
              </h1>
              <p style={{ fontSize: 15, lineHeight: 1.7, color: "#475569", maxWidth: 440 }}>
                Everything you need to manage leads, clients, invoices, and
                projects — powered by AI and built for teams who do real work.
              </p>
            </div>

            {/* Feature cards */}
            <div style={{ marginTop: 32, display: "flex", flexDirection: "column", gap: 12 }}>
              {[
                { icon: ShieldCheck, title: "OTP-secured signup", desc: "Email verification only" },
                { icon: Building2, title: "Multi-tenant ready", desc: "Isolated workspace per signup" },
                { icon: Sparkles, title: "AI-powered tools", desc: "Estimators, analytics, copilot" },
              ].map((f) => (
                <div
                  key={f.title}
                  style={{
                    display: "flex",
                    alignItems: "center",
                    gap: 14,
                    padding: "14px 16px",
                    borderRadius: 16,
                    backgroundColor: "rgba(255,255,255,0.72)",
                    border: "1px solid rgba(15,23,42,0.06)",
                    transition: "all 200ms ease",
                    boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
                  }}
                >
                  <div
                    style={{
                      width: 38,
                      height: 38,
                      borderRadius: 12,
                      backgroundColor: "rgba(8,145,178,0.10)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      flexShrink: 0,
                    }}
                  >
                    <f.icon style={{ width: 18, height: 18, color: "#0891B2" }} />
                  </div>
                  <div>
                    <p style={{ fontSize: 14, fontWeight: 600, color: "#0F172A" }}>{f.title}</p>
                    <p style={{ fontSize: 12, color: "#64748B" }}>{f.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Plan preview */}
          <div
            style={{
              position: "relative",
              zIndex: 1,
              marginTop: 32,
              padding: "18px 20px",
              borderRadius: 20,
              backgroundColor: "rgba(255,255,255,0.78)",
              border: "1px solid rgba(15,23,42,0.06)",
              backdropFilter: "blur(16px)",
              boxShadow: "0 4px 14px rgba(15,23,42,0.04)",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
              <div>
                <p style={{ fontSize: 10, fontWeight: 700, letterSpacing: "0.12em", textTransform: "uppercase", color: "#64748B" }}>
                  Selected Plan
                </p>
                <p style={{ fontSize: 18, fontWeight: 700, marginTop: 4 }}>
                  {PLAN_CARDS.find((p) => p.key === w.form.plan)?.name}
                </p>
              </div>
              <span style={{ fontSize: 24, fontWeight: 700, color: "#0891B2" }}>
                {PLAN_CARDS.find((p) => p.key === w.form.plan)?.price}
                <span style={{ fontSize: 12, color: "#64748B", fontWeight: 400 }}>/mo</span>
              </span>
            </div>
          </div>
        </div>

        {/* ═══════════════ RIGHT PANEL ═══════════════ */}
        <div
          className="friendly-right"
          style={{
            backgroundColor: "transparent",
            display: "flex",
            alignItems: "flex-start",
            justifyContent: "center",
            padding: "0",
            overflow: "visible",
          }}
        >
          <div style={{ width: "100%", maxWidth: 560 }}>
            {/* Form card */}
            <div
              style={{
                backgroundColor: "#FFFFFF",
                borderRadius: 18,
                border: "1px solid rgba(15,23,42,0.06)",
                boxShadow: "0 10px 32px rgba(15,23,42,0.06)",
                padding: "0 32px 28px",
                overflow: "hidden",
              }}
            >
              {/* Sticky step header */}
              <div
                style={{
                  position: "sticky",
                  top: 0,
                  zIndex: 10,
                  background: "rgba(255,255,255,0.96)",
                  backdropFilter: "blur(16px)",
                  padding: "26px 0 18px",
                  borderBottom: "1px solid rgba(15,23,42,0.06)",
                  marginBottom: 24,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
                  <p
                    style={{
                      fontSize: 11,
                      fontWeight: 700,
                      letterSpacing: "0.1em",
                      textTransform: "uppercase",
                      color: "#0891B2",
                    }}
                  >
                    {STEPS[w.step - 1].eyebrow}
                  </p>
                  <span style={{ fontSize: 12, fontWeight: 700, color: "#475569" }}>
                    Step {w.step} of {STEPS.length}
                  </span>
                </div>
                <h2
                  style={{
                    fontSize: 24,
                    fontWeight: 700,
                    color: "#0F172A",
                    letterSpacing: "-0.02em",
                    marginBottom: 12,
                  }}
                >
                  {stepTitles[w.step]}
                </h2>

                <div
                  style={{
                    height: 6,
                    borderRadius: 99,
                    backgroundColor: "#F1F5F9",
                    overflow: "hidden",
                    marginBottom: 12,
                  }}
                >
                  <motion.div
                    style={{
                      height: "100%",
                      borderRadius: 99,
                      background: "linear-gradient(90deg, #0891B2, #22D3EE)",
                    }}
                    initial={{ width: 0 }}
                    animate={{ width: `${w.progress}%` }}
                    transition={{ duration: 0.4, ease: "easeOut" }}
                  />
                </div>

                <div style={{ display: "flex", gap: 8, overflowX: "auto", paddingBottom: 2 }}>
                  {STEPS.map((s) => {
                    const isActive = s.id === w.step;
                    const isDone = s.id < w.step;
                    return (
                      <div
                        key={s.id}
                        style={{
                          minWidth: 84,
                          padding: "8px 10px",
                          borderRadius: 12,
                          textAlign: "center",
                          fontSize: 11,
                          fontWeight: 700,
                          transition: "all 250ms ease",
                          border: `1px solid ${isActive ? "rgba(8,145,178,0.24)" : "rgba(15,23,42,0.06)"}`,
                          backgroundColor: isActive
                            ? "rgba(8,145,178,0.08)"
                            : isDone
                              ? "rgba(16,185,129,0.08)"
                              : "#F8FAFC",
                          color: isActive ? "#0891B2" : isDone ? "#059669" : "#94A3B8",
                        }}
                      >
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 4 }}>
                          {isDone ? <Check style={{ width: 11, height: 11 }} /> : <span>{s.id}</span>}
                          <span>{s.label}</span>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* ── Form content ── */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={w.step}
                  initial={{ opacity: 0, x: 16 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -12 }}
                  transition={{ duration: 0.22, ease: "easeOut" }}
                >
                  {/* ═══ STEP 1 ═══ */}
                  {w.step === 1 && (
                    <div>
                      <FriendlyField label="Full Name" value={w.form.name} onChange={(v) => w.setField("name", v)} onBlur={() => w.markTouched(["name"])} placeholder="Alex Morgan" icon={User2} error={w.fieldError("name")} />
                      <FriendlyField label="Work Email" value={w.form.email} onChange={(v) => w.setField("email", v)} onBlur={() => w.markTouched(["email"])} placeholder="alex@company.com" icon={Mail} error={w.fieldError("email")} type="email" />
                      <FriendlyField
                        label="Password"
                        value={w.form.password}
                        onChange={(v) => w.setField("password", v)}
                        onBlur={() => w.markTouched(["password"])}
                        placeholder="Minimum 6 characters"
                        icon={Lock}
                        error={w.fieldError("password")}
                        type={w.showPassword ? "text" : "password"}
                        suffix={
                          <button type="button" onClick={() => w.setShowPassword(!w.showPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }} tabIndex={-1}>
                            {w.showPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                          </button>
                        }
                      />

                      {/* Strength bar */}
                      {w.form.password && (
                        <div style={{ marginBottom: 18, padding: "12px 16px", borderRadius: 14, backgroundColor: "#F8FAFC", border: "1px solid #F1F5F9" }}>
                          <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12 }}>
                            <span style={{ color: "#475569", fontWeight: 500 }}>Strength</span>
                            <span style={{ fontWeight: 700, color: w.passwordStrength.tone === "weak" ? "#EF4444" : w.passwordStrength.tone === "good" ? "#D97706" : "#10B981" }}>
                              {w.passwordStrength.label}
                            </span>
                          </div>
                          <div style={{ marginTop: 8, height: 6, borderRadius: 99, backgroundColor: "#E2E8F0", overflow: "hidden" }}>
                            <motion.div
                              style={{ height: "100%", borderRadius: 99, backgroundColor: w.passwordStrength.tone === "weak" ? "#EF4444" : w.passwordStrength.tone === "good" ? "#D97706" : "#10B981" }}
                              initial={{ width: 0 }}
                              animate={{ width: `${Math.max(w.passwordStrength.value, 8)}%` }}
                              transition={{ duration: 0.3 }}
                            />
                          </div>
                        </div>
                      )}

                      <FriendlyField
                        label="Confirm Password"
                        value={w.form.confirmPassword}
                        onChange={(v) => w.setField("confirmPassword", v)}
                        onBlur={() => w.markTouched(["confirmPassword"])}
                        placeholder="Re-enter password"
                        icon={Lock}
                        error={w.fieldError("confirmPassword")}
                        type={w.showConfirmPassword ? "text" : "password"}
                        suffix={
                          <button type="button" onClick={() => w.setShowConfirmPassword(!w.showConfirmPassword)} style={{ position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", cursor: "pointer", color: "#94A3B8", padding: 4 }} tabIndex={-1}>
                            {w.showConfirmPassword ? <EyeOff style={{ width: 16, height: 16 }} /> : <Eye style={{ width: 16, height: 16 }} />}
                          </button>
                        }
                      />
                    </div>
                  )}

                  {/* ═══ STEP 2 ═══ */}
                  {w.step === 2 && (
                    <div>
                      <FriendlyField label="Company Name" value={w.form.companyName} onChange={(v) => w.setField("companyName", v)} onBlur={() => w.markTouched(["companyName"])} placeholder="Acme Corp" icon={Building2} error={w.fieldError("companyName")} />

                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", marginBottom: 10 }}>
                        Company Type
                      </label>
                      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
                        {COMPANY_TYPES.map((ct) => {
                          const sel = w.form.companyType === ct.value;
                          return (
                            <button
                              key={ct.value}
                              type="button"
                              onClick={() => w.setField("companyType", ct.value)}
                              style={{
                                padding: "16px",
                                borderRadius: 16,
                                border: `2px solid ${sel ? "#0891B2" : "transparent"}`,
                                backgroundColor: sel ? "rgba(8,145,178,0.06)" : "#F8FAFC",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 250ms cubic-bezier(0.4,0,0.2,1)",
                                fontFamily: "Urbanist, system-ui, sans-serif",
                                transform: sel ? "translateY(-2px)" : "none",
                                boxShadow: sel ? "0 4px 14px rgba(8,145,178,0.12)" : "none",
                              }}
                            >
                              <span style={{ fontSize: 24, display: "block", marginBottom: 8 }}>{ct.icon}</span>
                              <div style={{ fontSize: 14, fontWeight: 700, color: sel ? "#0891B2" : "#0F172A" }}>{ct.label}</div>
                              <div style={{ fontSize: 12, color: "#94A3B8", marginTop: 3 }}>{ct.desc}</div>
                              {sel && (
                                <motion.div
                                  initial={{ scale: 0 }}
                                  animate={{ scale: 1 }}
                                  style={{ marginTop: 8, display: "flex", alignItems: "center", gap: 4, fontSize: 11, fontWeight: 700, color: "#0891B2" }}
                                >
                                  <CheckCircle2 style={{ width: 13, height: 13 }} /> Selected
                                </motion.div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  )}

                  {/* ═══ STEP 3 ═══ */}
                  {w.step === 3 && (
                    <div>
                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", marginBottom: 7 }}>
                        Country
                      </label>
                      <div style={{ position: "relative", marginBottom: 18 }}>
                        <Globe2 style={{ position: "absolute", left: 15, top: "50%", transform: "translateY(-50%)", width: 16, height: 16, color: "#94A3B8", pointerEvents: "none", zIndex: 1 }} />
                        <select
                          value={w.form.countryCode}
                          onChange={(e) => w.setField("countryCode", e.target.value)}
                          className="friendly-input"
                          style={{ paddingLeft: 44, cursor: "pointer", appearance: "none" }}
                        >
                          {COUNTRIES.map((c) => (
                            <option key={c.code} value={c.code}>{c.flag} {c.name} ({c.dialCode})</option>
                          ))}
                        </select>
                      </div>

                      <label style={{ display: "block", fontSize: 12, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase", color: "#475569", marginBottom: 7 }}>
                        Phone Number
                      </label>
                      <div style={{ display: "flex", borderRadius: 14, overflow: "hidden", border: "2px solid transparent", backgroundColor: "#F1F5F9", marginBottom: 16, transition: "all 250ms" }}>
                        <div style={{ height: 50, display: "flex", alignItems: "center", gap: 6, padding: "0 14px", borderRight: "1px solid #E2E8F0", fontSize: 14, fontWeight: 600, color: "#475569", whiteSpace: "nowrap" }}>
                          <Phone style={{ width: 14, height: 14, color: "#94A3B8" }} />
                          {w.selectedCountry.flag} {w.selectedCountry.dialCode}
                        </div>
                        <input
                          value={w.form.phone}
                          onChange={(e) => w.setField("phone", e.target.value)}
                          onBlur={() => w.markTouched(["phone"])}
                          placeholder="555 010 2200"
                          style={{ flex: 1, height: 50, padding: "0 14px", border: "none", outline: "none", backgroundColor: "transparent", fontSize: 15, color: "#0F172A", fontFamily: "Urbanist, system-ui, sans-serif" }}
                        />
                      </div>
                      {w.fieldError("phone") && (
                        <p style={{ fontSize: 12, color: "#F43F5E", marginBottom: 12, display: "flex", alignItems: "center", gap: 5 }}>
                          <span style={{ width: 5, height: 5, borderRadius: "50%", backgroundColor: "#F43F5E", display: "inline-block" }} />
                          {w.fieldError("phone")}
                        </p>
                      )}
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, backgroundColor: "rgba(8,145,178,0.05)", border: "1px solid rgba(8,145,178,0.1)", fontSize: 12, color: "#0891B2" }}>
                        <Globe2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                        Auto-detected from your locale. You can change this anytime.
                      </div>
                    </div>
                  )}

                  {/* ═══ STEP 4 ═══ */}
                  {w.step === 4 && (
                    <div>
                      <div style={{ display: "grid", gap: 12 }}>
                        {PLAN_CARDS.map((plan) => {
                          const sel = w.form.plan === plan.key;
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
                                borderRadius: 20,
                                border: `2px solid ${sel ? "#0891B2" : "transparent"}`,
                                backgroundColor: sel ? "rgba(8,145,178,0.04)" : "#F8FAFC",
                                cursor: "pointer",
                                textAlign: "left",
                                transition: "all 250ms cubic-bezier(0.4,0,0.2,1)",
                                fontFamily: "Urbanist, system-ui, sans-serif",
                                transform: sel ? "scale(1.01)" : "none",
                                boxShadow: sel ? "0 8px 30px rgba(8,145,178,0.10)" : "none",
                              }}
                            >
                              {plan.badge && (
                                <div style={{
                                  position: "absolute", top: -1, left: 0, right: 0, height: 3, borderRadius: "20px 20px 0 0",
                                  background: "linear-gradient(90deg, #D97706, #F59E0B)", display: sel ? "block" : "none",
                                }} />
                              )}
                              {plan.badge && (
                                <span style={{
                                  position: "absolute", right: 16, top: 16, padding: "4px 12px", borderRadius: 99,
                                  background: sel ? "linear-gradient(135deg, #D97706, #F59E0B)" : "#0F172A",
                                  color: "#FFF", fontSize: 10, fontWeight: 700, letterSpacing: "0.06em", textTransform: "uppercase",
                                }}>
                                  {plan.badge}
                                </span>
                              )}

                              <p style={{ fontSize: 11, fontWeight: 700, textTransform: "uppercase", letterSpacing: "0.06em", color: sel ? "#0891B2" : "#94A3B8", marginBottom: 8 }}>
                                {plan.name}
                              </p>
                              <div style={{ display: "flex", alignItems: "baseline", gap: 4, marginBottom: 6 }}>
                                <span style={{ fontSize: 28, fontWeight: 700, color: "#0F172A" }}>{plan.price}</span>
                                <span style={{ fontSize: 13, color: "#94A3B8" }}>/month</span>
                              </div>
                              <p style={{ fontSize: 13, color: "#475569", marginBottom: 14, lineHeight: 1.5 }}>{plan.description}</p>
                              <div style={{ display: "grid", gap: 6 }}>
                                {plan.features.map((f) => (
                                  <div key={f} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13, color: sel ? "#0F172A" : "#475569" }}>
                                    <div style={{ width: 18, height: 18, borderRadius: 99, backgroundColor: sel ? "#0891B2" : "#E2E8F0", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                                      <Check style={{ width: 10, height: 10, color: sel ? "#FFF" : "#94A3B8" }} />
                                    </div>
                                    {f}
                                  </div>
                                ))}
                              </div>
                              {sel && (
                                <motion.div
                                  initial={{ scale: 0.8, opacity: 0 }}
                                  animate={{ scale: 1, opacity: 1 }}
                                  style={{
                                    marginTop: 16, display: "flex", alignItems: "center", justifyContent: "center", gap: 6,
                                    padding: "10px 0", borderRadius: 99, background: "linear-gradient(135deg, #0891B2, #0E7490)",
                                    color: "#FFF", fontSize: 12, fontWeight: 700,
                                  }}
                                >
                                  <CheckCircle2 style={{ width: 14, height: 14 }} /> Selected
                                </motion.div>
                              )}
                            </button>
                          );
                        })}
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", borderRadius: 12, backgroundColor: "rgba(16,185,129,0.06)", border: "1px solid rgba(16,185,129,0.12)", fontSize: 12, color: "#059669", marginTop: 12 }}>
                        <CheckCircle2 style={{ width: 14, height: 14, flexShrink: 0 }} />
                        Upgrade anytime without losing data or tenant settings.
                      </div>
                    </div>
                  )}

                  {/* ═══ STEP 5 ═══ */}
                  {w.step === 5 && (
                    <div>
                      <div style={{
                        display: "flex",
                        alignItems: "center",
                        gap: 12,
                        padding: "16px",
                        borderRadius: 16,
                        backgroundColor: "#F8FAFC",
                        border: "1px solid #F1F5F9",
                        marginBottom: 24,
                      }}>
                        <div style={{
                          width: 44,
                          height: 44,
                          borderRadius: 14,
                          backgroundColor: "rgba(8,145,178,0.08)",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          flexShrink: 0,
                        }}>
                          <Mail style={{ width: 20, height: 20, color: "#0891B2" }} />
                        </div>
                        <div style={{ minWidth: 0 }}>
                          <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>Email verification</p>
                          <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 4, lineHeight: 1.5 }}>
                            We send your signup code only to {w.form.email || "your work email"}.
                          </p>
                        </div>
                      </div>

                      {/* Request code */}
                      <div style={{ padding: "14px 16px", borderRadius: 14, backgroundColor: "#F8FAFC", border: "1px solid #F1F5F9", marginBottom: 24 }}>
                        <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 8 }}>
                          <div>
                            <p style={{ fontSize: 14, fontWeight: 700, color: "#0F172A" }}>{w.hasSentOtp ? "Code sent ✓" : "Request code"}</p>
                            <p style={{ fontSize: 12, color: "#94A3B8", marginTop: 2 }}>
                              {w.hasSentOtp && w.otpSentTo ? `Sent to ${w.otpSentTo}. Expires ${formatTimer(w.otpExpiresIn)}.` : "We’ll send a 6-digit code to your email when you request it."}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() => void w.requestOtp()}
                            disabled={w.isSendingOtp}
                            style={{
                              height: 36, padding: "0 16px", borderRadius: 99, border: "none",
                              background: "linear-gradient(135deg, #0891B2, #0E7490)", color: "#FFF",
                              fontSize: 12, fontWeight: 700, cursor: w.isSendingOtp ? "not-allowed" : "pointer",
                              opacity: w.isSendingOtp ? 0.6 : 1, display: "flex", alignItems: "center", gap: 6,
                              fontFamily: "Urbanist, system-ui, sans-serif",
                            }}
                          >
                            {w.isSendingOtp && <Loader2 style={{ width: 12, height: 12, animation: "friendlySpin 1s linear infinite" }} />}
                            {w.hasSentOtp ? "Resend" : "Send OTP"}
                          </button>
                        </div>
                        {w.otpDebugCode && (
                          <div style={{ marginTop: 10, padding: "8px 12px", borderRadius: 10, backgroundColor: "rgba(8,145,178,0.06)", border: "1px solid rgba(8,145,178,0.12)", fontSize: 12, color: "#0891B2" }}>
                            Demo OTP: <strong style={{ letterSpacing: "0.15em" }}>{w.otpDebugCode}</strong>
                          </div>
                        )}
                      </div>

                      <p style={{ textAlign: "center", fontSize: 13, fontWeight: 600, color: "#475569", marginBottom: 12 }}>
                        Enter 6-digit code
                      </p>
                      <OtpInput value={w.otpCode} onChange={(v) => w.setOtpCode(v)} variant="friendly" />
                    </div>
                  )}
                </motion.div>
              </AnimatePresence>

              {/* ── Footer ── */}
              <div style={{ marginTop: 28, paddingTop: 20, borderTop: "1px solid #F1F5F9", display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 12 }}>
                <p style={{ fontSize: 13, color: "#94A3B8" }}>
                  Have an account?{" "}
                  <Link to="/login" style={{ color: "#0891B2", fontWeight: 700, textDecoration: "none" }}>Sign in</Link>
                </p>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {w.step > 1 && (
                    <button type="button" onClick={w.goBack} disabled={w.isSubmitting} style={{
                      height: 44, padding: "0 18px", borderRadius: 14, border: "1.5px solid #E2E8F0",
                      backgroundColor: "#FFF", color: "#475569", fontSize: 14, fontWeight: 600, cursor: "pointer",
                      display: "flex", alignItems: "center", gap: 6, fontFamily: "Urbanist, system-ui, sans-serif",
                      transition: "all 200ms",
                    }}>
                      <ArrowLeft style={{ width: 16, height: 16 }} /> Back
                    </button>
                  )}
                  {w.step < 5 ? (
                    <button type="button" onClick={w.goNext} disabled={!w.stepValid[w.step]} style={{
                      height: 44, padding: "0 28px", borderRadius: 14, border: "none",
                      background: w.stepValid[w.step] ? "linear-gradient(135deg, #0891B2, #0E7490)" : "#CBD5E1",
                      color: "#FFF", fontSize: 14, fontWeight: 700, cursor: w.stepValid[w.step] ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", gap: 6, fontFamily: "Urbanist, system-ui, sans-serif",
                      boxShadow: w.stepValid[w.step] ? "0 4px 14px rgba(8,145,178,0.25)" : "none",
                      transition: "all 250ms",
                    }}>
                      {w.step === 1 ? "Start Free Trial" : "Continue"}
                      <ArrowRight style={{ width: 16, height: 16 }} />
                    </button>
                  ) : (
                    <button type="button" onClick={() => void w.handleVerifyAndSignup()} disabled={!w.stepValid[5] || w.isSubmitting} style={{
                      height: 44, padding: "0 28px", borderRadius: 14, border: "none",
                      background: w.stepValid[5] && !w.isSubmitting ? "linear-gradient(135deg, #0891B2, #0E7490)" : "#CBD5E1",
                      color: "#FFF", fontSize: 14, fontWeight: 700, cursor: w.stepValid[5] && !w.isSubmitting ? "pointer" : "not-allowed",
                      display: "flex", alignItems: "center", gap: 6, fontFamily: "Urbanist, system-ui, sans-serif",
                      boxShadow: w.stepValid[5] ? "0 4px 14px rgba(8,145,178,0.25)" : "none",
                    }}>
                      {w.isSubmitting ? (
                        <><Loader2 style={{ width: 16, height: 16, animation: "friendlySpin 1s linear infinite" }} /> Creating…</>
                      ) : (
                        <>Verify & Create <ChevronRight style={{ width: 16, height: 16 }} /></>
                      )}
                    </button>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Responsive */}
      <style>{`
        @media (min-width: 1024px) {
          .friendly-root { grid-template-columns: 1.02fr 0.98fr !important; }
          .friendly-left { position: sticky; top: 20px; align-self: start; }
        }
        @media (max-width: 1023px) {
          .friendly-left { padding: 22px !important; }
          .friendly-right { padding: 0 !important; }
        }
        @media (max-width: 640px) {
          .friendly-root { padding: 12px !important; gap: 12px !important; }
        }
      `}</style>
    </>
  );
}
