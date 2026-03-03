import { useState, useEffect, useRef } from "react";
import { NavLink, useNavigate } from "react-router-dom";
import { useToast } from "@/components/ui/use-toast";
import { register, setAuthSession } from "@/features/auth";
import { clearEnabledFeatures, clearOnboardingData, setOnboardingCompleted } from "@/lib/enabled-features";
import logo from "../Images/Logo/logo.png";

/* ── Design Tokens ── */
const V = {
  primary: "#00d4ff", primaryDark: "#0066ff", accent: "#ff6b9d",
  success: "#10b981", warning: "#f59e0b", error: "#ef4444",
  panelGrad: "linear-gradient(135deg,#060d18 0%,#0a0f1e 40%,#0d1520 70%,#1a1040 100%)",
  rightBg: "#f8fafc", textWhite: "#ffffff", textDark: "#1e293b",
  textMid: "#475569", textLight: "#94a3b8", textPlaceholder: "#cbd5e1",
  inputBorder: "#e2e8f0", inputBg: "#ffffff",
  dmInputBg: "#1e293b", dmBorder: "#334155", dmText: "#f1f5f9", dmBg: "#0f172a",
  gradBtn: "linear-gradient(135deg,#00d4ff,#0066ff)",
  shadowGlow: "0 8px 25px rgba(0,102,255,0.40)",
  font: "'Inter',system-ui,sans-serif",
};

/* ── Particle Canvas ── */
const Particles = () => {
  const ref = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const c = ref.current; if (!c) return;
    const ctx = c.getContext("2d"); if (!ctx) return;
    let raf: number;
    const resize = () => { c.width = c.offsetWidth; c.height = c.offsetHeight; };
    resize(); window.addEventListener("resize", resize);
    const dots = Array.from({ length: 45 }, () => ({
      x: Math.random() * c.width, y: Math.random() * c.height,
      vx: (Math.random() - 0.5) * 0.8, vy: (Math.random() - 0.5) * 0.8,
      r: 1.5 + Math.random() * 1.5, o: 0.15 + Math.random() * 0.1,
    }));
    const draw = () => {
      ctx.clearRect(0, 0, c.width, c.height);
      dots.forEach(d => {
        d.x += d.vx; d.y += d.vy;
        if (d.x < 0) d.x = c.width; if (d.x > c.width) d.x = 0;
        if (d.y < 0) d.y = c.height; if (d.y > c.height) d.y = 0;
        ctx.beginPath(); ctx.arc(d.x, d.y, d.r, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(0,212,255,${d.o})`; ctx.fill();
      });
      raf = requestAnimationFrame(draw);
    };
    draw();
    return () => { cancelAnimationFrame(raf); window.removeEventListener("resize", resize); };
  }, []);
  return <canvas ref={ref} style={{ position: "absolute", inset: 0, width: "100%", height: "100%", zIndex: 0 }} />;
};

/* ── SVG Icons ── */
const MailIcon = ({ color = V.textLight }: { color?: string }) => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2"><rect x="2" y="4" width="20" height="16" rx="2" /><path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" /></svg>;
const LockIcon = ({ color = V.textLight }: { color?: string }) => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2"><rect width="18" height="11" x="3" y="11" rx="2" /><path d="M7 11V7a5 5 0 0 1 10 0v4" /></svg>;
const PersonIcon = ({ color = V.textLight }: { color?: string }) => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2"><circle cx="12" cy="8" r="5" /><path d="M20 21a8 8 0 0 0-16 0" /></svg>;
const BuildingIcon = ({ color = V.textLight }: { color?: string }) => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke={color} strokeWidth="2"><rect x="4" y="2" width="16" height="20" rx="2" /><path d="M9 22v-4h6v4" /><path d="M8 6h.01M16 6h.01M12 6h.01M8 10h.01M16 10h.01M12 10h.01M8 14h.01M16 14h.01M12 14h.01" /></svg>;
const EyeIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M2 12s3-7 10-7 10 7 10 7-3 7-10 7S2 12 2 12Z" /><circle cx="12" cy="12" r="3" /></svg>;
const EyeOffIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2"><path d="M9.88 9.88a3 3 0 1 0 4.24 4.24" /><path d="M10.73 5.08A10.43 10.43 0 0 1 12 5c7 0 10 7 10 7a13.16 13.16 0 0 1-1.67 2.68" /><path d="M6.61 6.61A13.526 13.526 0 0 0 2 12s3 7 10 7a9.74 9.74 0 0 0 5.39-1.61" /><line x1="2" x2="22" y1="2" y2="22" /></svg>;
const GoogleIcon = () => <svg width="18" height="18" viewBox="0 0 24 24"><path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92a5.06 5.06 0 0 1-2.2 3.32v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.1z" fill="#4285F4" /><path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853" /><path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18A11 11 0 0 0 1 12c0 1.77.43 3.45 1.18 4.93l3.66-2.84z" fill="#FBBC05" /><path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335" /></svg>;
const GithubIcon = ({ dark }: { dark: boolean }) => <svg width="18" height="18" viewBox="0 0 24 24" fill={dark ? "#fff" : "#24292e"}><path d="M12 .3a12 12 0 0 0-3.8 23.4c.6.1.8-.3.8-.6v-2c-3.3.7-4-1.6-4-1.6-.5-1.4-1.3-1.8-1.3-1.8-1-.7.1-.7.1-.7 1.2.1 1.8 1.2 1.8 1.2 1 1.8 2.8 1.3 3.5 1 .1-.8.4-1.3.7-1.6-2.7-.3-5.5-1.3-5.5-6 0-1.2.5-2.3 1.2-3.1-.1-.4-.5-1.5.1-3.2 0 0 1-.3 3.3 1.2a11.5 11.5 0 0 1 6 0C17.3 4.7 18.3 5 18.3 5c.7 1.7.2 2.8.1 3.2.8.8 1.2 1.9 1.2 3.1 0 4.6-2.8 5.6-5.5 5.9.4.4.8 1.1.8 2.2v3.3c0 .3.2.7.8.6A12 12 0 0 0 12 .3" /></svg>;
const MicrosoftIcon = () => <svg width="18" height="18" viewBox="0 0 24 24"><rect x="1" y="1" width="10" height="10" fill="#F25022" /><rect x="13" y="1" width="10" height="10" fill="#7FBA00" /><rect x="1" y="13" width="10" height="10" fill="#00A4EF" /><rect x="13" y="13" width="10" height="10" fill="#FFB900" /></svg>;
const ShieldIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#00d4ff" strokeWidth="2"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" /></svg>;
const ZapIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#00d4ff" strokeWidth="2"><polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" /></svg>;
const UsersIcon = () => <svg width="16" height="16" fill="none" viewBox="0 0 24 24" stroke="#00d4ff" strokeWidth="2"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" /><circle cx="9" cy="7" r="4" /><path d="M22 21v-2a4 4 0 0 0-3-3.87" /><path d="M16 3.13a4 4 0 0 1 0 7.75" /></svg>;
const CheckSvg = () => <svg width="12" height="12" fill="none" viewBox="0 0 24 24" stroke="#fff" strokeWidth="3"><polyline points="20 6 9 17 4 12" /></svg>;

/* ── Global Keyframes ── */
const STYLES = `
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
@keyframes gradientShift{0%{background-position:0% 50%}50%{background-position:100% 50%}100%{background-position:0% 50%}}
@keyframes floatCard{0%,100%{transform:translateY(0)}50%{transform:translateY(-8px)}}
@keyframes fadeInLeft{from{opacity:0;transform:translateX(-30px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeInRight{from{opacity:0;transform:translateX(30px)}to{opacity:1;transform:translateX(0)}}
@keyframes fadeInUp{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}
@keyframes shine{0%{left:-60%}100%{left:160%}}
@keyframes shake{0%,100%{transform:translateX(0)}20%{transform:translateX(-6px)}40%{transform:translateX(6px)}60%{transform:translateX(-4px)}80%{transform:translateX(4px)}}
@keyframes spin{from{transform:rotate(0)}to{transform:rotate(360deg)}}
`;

/* ━━━━━ SIGNUP PAGE ━━━━━ */
const SignUpPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const [form, setForm] = useState({ fullName: "", email: "", password: "", confirmPassword: "", company: "" });
  const [isLoading, setIsLoading] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [showCpw, setShowCpw] = useState(false);
  const [agreeTerms, setAgreeTerms] = useState(false);
  const [dark, setDark] = useState(() => localStorage.getItem("zodo-theme") === "dark");
  const [touched, setTouched] = useState<Record<string, boolean>>({});
  const [capsLock, setCapsLock] = useState(false);
  const [termsError, setTermsError] = useState(false);
  const [btnState, setBtnState] = useState<"idle" | "loading" | "success" | "error">("idle");
  const [pwFocused, setPwFocused] = useState(false);
  const nameRef = useRef<HTMLInputElement>(null);
  const mountedRef = useRef(false);
  const anim = (val: string): string | undefined => mountedRef.current ? undefined : val;

  useEffect(() => {
    nameRef.current?.focus();
    const t = setTimeout(() => { mountedRef.current = true; }, 1200);
    return () => clearTimeout(t);
  }, []);
  useEffect(() => {
    if (dark) document.body.classList.add("dark"); else document.body.classList.remove("dark");
    localStorage.setItem("zodo-theme", dark ? "dark" : "light");
  }, [dark]);

  const set = (k: string, v: string) => setForm(p => ({ ...p, [k]: v }));
  const touch = (k: string) => setTouched(p => ({ ...p, [k]: true }));

  /* Validations */
  const nameValid = /^[A-Za-z\s]{2,}$/.test(form.fullName.trim()) && form.fullName.trim().split(/\s+/).length >= 2;
  const emailValid = /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(form.email);
  const pwScore = (() => { let s = 0; const p = form.password; if (p.length >= 8) s += 20; if (p.length >= 12) s += 20; if (/[A-Z]/.test(p)) s += 20; if (/[0-9]/.test(p)) s += 20; if (/[^A-Za-z0-9]/.test(p)) s += 20; return s; })();
  const pwReqs = [
    { label: "At least 8 characters", met: form.password.length >= 8 },
    { label: "One uppercase letter (A-Z)", met: /[A-Z]/.test(form.password) },
    { label: "One number (0-9)", met: /[0-9]/.test(form.password) },
    { label: "One special character (!@#$)", met: /[^A-Za-z0-9]/.test(form.password) },
  ];
  const cpwValid = form.confirmPassword === form.password && form.confirmPassword.length > 0;
  const pwLabel = pwScore < 40 ? "Weak password" : pwScore < 80 ? "Medium strength" : "Strong password ✓";
  const pwColor = pwScore < 40 ? V.error : pwScore < 80 ? V.warning : V.success;
  const pwWidth = pwScore < 40 ? "33%" : pwScore < 80 ? "66%" : "100%";

  /* Progress bar */
  const totalFields = 4;
  const filled = [nameValid, emailValid, pwScore >= 40, cpwValid].filter(Boolean).length;
  const progress = (filled / totalFields) * 100;

  const handleSignUp = async (e: React.FormEvent) => {
    e.preventDefault();
    setTouched({ fullName: true, email: true, password: true, confirmPassword: true });
    if (!agreeTerms) { setTermsError(true); return; }
    if (!nameValid || !emailValid || pwScore < 40 || !cpwValid) return;

    setBtnState("loading"); setIsLoading(true);
    try {
      const response = await register({ name: form.fullName, email: form.email, company: form.company, password: form.password });
      const d = response?.data as any;
      const accessToken = d?.tokens?.accessToken;
      if (response?.success && accessToken) {
        setAuthSession({ accessToken, refreshToken: d?.tokens?.refreshToken, user: d?.user, employee: d?.employee, tenant: d?.tenant, permissions: d?.permissions });
        setOnboardingCompleted(false); clearEnabledFeatures(); clearOnboardingData();
        setBtnState("success");
        setTimeout(() => navigate("/onboarding", { state: { prefill: { fullName: form.fullName, email: form.email, company: form.company } } }), 1500);
      } else {
        setBtnState("error");
        toast({ title: "Sign Up Failed", description: response?.message || "Unable to create account", variant: "destructive" });
        setTimeout(() => setBtnState("idle"), 2000);
      }
    } catch (error: any) {
      setBtnState("error");
      const msg = error?.response?.data?.message || error?.message || "Server not reachable";
      toast({ title: "Sign Up Failed", description: msg, variant: "destructive" });
      setTimeout(() => setBtnState("idle"), 2000);
    } finally { setIsLoading(false); }
  };

  const social = (p: string) => toast({ title: "Coming Soon", description: `${p} signup will be available soon!` });

  const rightBg = dark ? V.dmBg : V.rightBg;
  const border = dark ? V.dmBorder : V.inputBorder;
  const textH = dark ? V.dmText : V.textDark;
  const textSub = dark ? V.textLight : "#64748b";
  const cardBg = dark ? V.dmInputBg : V.inputBg;

  const [focusMap, setFocusMap] = useState<Record<string, boolean>>({});
  const setFocus = (k: string, v: boolean) => setFocusMap(p => ({ ...p, [k]: v }));

  const inputS = (field: string, valid: boolean | null): React.CSSProperties => {
    const f = focusMap[field];
    return {
      width: "100%", height: 48, padding: "0 44px",
      border: `1.5px solid ${valid === false ? V.error : valid === true ? V.success : f ? V.primary : border}`,
      borderRadius: 12, background: dark ? V.dmInputBg : V.inputBg, fontFamily: V.font, fontSize: 15,
      color: dark ? V.dmText : V.textDark, outline: "none", transition: "all 0.25s ease",
      boxShadow: valid === false ? "0 0 0 4px rgba(239,68,68,0.10)" : valid === true ? "0 0 0 4px rgba(16,185,129,0.10)" : f ? "0 0 0 4px rgba(0,212,255,0.10)" : "none",
      animation: valid === false && touched[field] ? "shake 0.5s" : undefined,
    };
  };
  const iL: React.CSSProperties = { position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", transition: "color 0.2s" };
  const iR: React.CSSProperties = { position: "absolute", right: 14, top: "50%", transform: "translateY(-50%)" };
  const validIcon = <svg width="16" height="16" fill={V.success} viewBox="0 0 24 24"><path d="M9 16.17 4.83 12l-1.42 1.41L9 19 21 7l-1.41-1.41z" /></svg>;
  const invalidIcon = <svg width="16" height="16" fill={V.error} viewBox="0 0 24 24"><path d="M19 6.41 17.59 5 12 10.59 6.41 5 5 6.41 10.59 12 5 17.59 6.41 19 12 13.41 17.59 19 19 17.59 13.41 12z" /></svg>;

  const Field = ({ field, label, icon, placeholder, type = "text", optional, validation, errorMsg, idx }: { field: string; label: string; icon: React.ReactNode; placeholder: string; type?: string; optional?: boolean; validation?: boolean | null; errorMsg?: string; idx: number }) => {
    const isPasswordField = type === "password";
    const showPassword = field === "password" ? showPw : showCpw;
    const togglePassword = () => field === "password" ? setShowPw(!showPw) : setShowCpw(!showCpw);
    const inputType = isPasswordField ? (showPassword ? "text" : "password") : type;
    const f = focusMap[field];
    const isTouched = touched[field];
    const currentInputStyle: React.CSSProperties = {
      width: "100%", height: 48, padding: "0 44px",
      border: `1.5px solid ${isTouched && validation === false ? V.error : isTouched && validation === true ? V.success : f ? V.primary : border}`,
      borderRadius: 12, background: dark ? V.dmInputBg : V.inputBg, fontFamily: V.font, fontSize: 15,
      color: dark ? V.dmText : V.textDark, outline: "none", transition: "all 0.25s ease",
      boxShadow: isTouched && validation === false ? "0 0 0 4px rgba(239,68,68,0.10)" : isTouched && validation === true ? "0 0 0 4px rgba(16,185,129,0.10)" : f ? "0 0 0 4px rgba(0,212,255,0.10)" : "none",
      animation: isTouched && validation === false ? "shake 0.5s" : undefined,
    };

    return (
      <div style={{ marginBottom: 14, animation: anim(`fadeInUp 0.5s ease ${0.5 + idx * 0.05}s both`) }}>
        <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 14, fontWeight: 600, color: dark ? "#e2e8f0" : "#374151", marginBottom: 6, transition: "color 0.3s" }}>
          {label}{optional && <span style={{ fontSize: 11, color: V.textLight, fontWeight: 400 }}>(optional)</span>}
        </label>
        <div style={{ position: "relative" }}>
          <span style={iL}>{icon}</span>
          <input
            key={field}
            type={inputType}
            value={(form as any)[field]}
            placeholder={placeholder}
            aria-label={label}
            aria-required={!optional ? "true" : undefined}
            ref={field === "fullName" ? nameRef : undefined}
            onChange={e => set(field, e.target.value)}
            onFocus={() => { setFocus(field, true); if (field === "password") setPwFocused(true); }}
            onBlur={() => { setFocus(field, false); touch(field); if (field === "password") setPwFocused(false); }}
            onKeyUp={e => { if (isPasswordField) setCapsLock(e.getModifierState("CapsLock")); }}
            disabled={isLoading}
            style={currentInputStyle}
          />
          {isPasswordField && (
            <button type="button" onClick={togglePassword} aria-label="Show/Hide password"
              style={{ ...iR, background: "none", border: "none", cursor: "pointer", color: V.textLight, transition: "color 0.2s", padding: 0 }}>
              {showPassword ? <EyeOffIcon /> : <EyeIcon />}
            </button>
          )}
          {!isPasswordField && isTouched && validation != null && <span style={iR}>{validation ? validIcon : invalidIcon}</span>}
        </div>
        {isTouched && validation === false && errorMsg && <p role="alert" aria-live="polite" style={{ color: V.error, fontSize: 12, marginTop: 4 }}>{errorMsg}</p>}
      </div>
    );
  };

  return (
    <>
      <style>{STYLES}</style>
      <div style={{ width: "100vw", height: "100vh", display: "grid", gridTemplateColumns: "45% 55%", overflow: "hidden", fontFamily: V.font }}>

        {/* ═══ LEFT PANEL ═══ */}
        <div className="signup-left-panel" style={{ background: V.panelGrad, backgroundSize: "400% 400%", animation: "gradientShift 10s ease infinite, fadeInLeft 0.6s ease", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 40, position: "relative", overflow: "hidden" }}>
          <Particles />
          <div style={{ zIndex: 1 }}>
            <a href="/" aria-label="ZODO CRM Home" style={{ display: "inline-block", cursor: "pointer" }}>
              <img src={logo} alt="ZODO CRM" style={{ width: 130, height: "auto", transition: "opacity 0.3s" }} onMouseEnter={e => (e.currentTarget.style.opacity = "0.85")} onMouseLeave={e => (e.currentTarget.style.opacity = "1")} />
            </a>
          </div>
          <div style={{ zIndex: 1 }}>
            <span style={{ display: "inline-flex", alignItems: "center", background: "rgba(0,212,255,0.08)", border: "1px solid rgba(0,212,255,0.20)", borderRadius: 9999, padding: "6px 14px", color: V.primary, fontSize: 12, fontWeight: 500, marginBottom: 20 }}>✦ AI-Powered CRM Platform</span>
            <h1 style={{ fontSize: 36, fontWeight: 700, lineHeight: 1.15, marginBottom: 16, color: V.textWhite }}>Start growing<br /><span style={{ color: V.accent }}>your business</span></h1>
            <p style={{ color: V.textLight, fontSize: 15, fontWeight: 400, lineHeight: 1.6, marginBottom: 32 }}>Access your CRM, manage clients, and automate your business with AI-powered tools.</p>
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              {[{ icon: <ShieldIcon />, t: "Enterprise-grade security" }, { icon: <ZapIcon />, t: "Lightning-fast performance" }, { icon: <UsersIcon />, t: "Trusted by 500+ companies" }].map((f, i) => (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 12 }}>
                  <div style={{ width: 36, height: 36, background: "rgba(255,255,255,0.06)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 8, display: "flex", alignItems: "center", justifyContent: "center", transition: "all 0.3s" }}>{f.icon}</div>
                  <span style={{ fontSize: 14, color: V.textPlaceholder, fontWeight: 500 }}>{f.t}</span>
                </div>
              ))}
            </div>
            <div style={{ marginTop: 32, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(20px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: 20, animation: "floatCard 4s ease-in-out infinite" }}>
              <div style={{ display: "flex", justifyContent: "space-around", alignItems: "center" }}>
                {[{ e: "📈", n: "2,400+", l: "Active Users" }, { e: "💼", n: "98%", l: "Satisfaction" }, { e: "⚡", n: "60%", l: "Time Saved" }].map((s, i, a) => (
                  <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, flex: 1, justifyContent: "center", borderRight: i < a.length - 1 ? "1px solid rgba(255,255,255,0.06)" : "none" }}>
                    <span style={{ fontSize: 20 }}>{s.e}</span>
                    <div><div style={{ color: V.textWhite, fontSize: 18, fontWeight: 700 }}>{s.n}</div><div style={{ color: V.textLight, fontSize: 12 }}>{s.l}</div></div>
                  </div>
                ))}
              </div>
            </div>
          </div>
          <div style={{ zIndex: 1, background: "rgba(255,255,255,0.04)", backdropFilter: "blur(16px)", border: "1px solid rgba(255,255,255,0.08)", borderRadius: 16, padding: "20px 24px" }}>
            <div style={{ color: V.warning, fontSize: 13, marginBottom: 10 }}>⭐⭐⭐⭐⭐</div>
            <p style={{ color: "#e2e8f0", fontSize: 14, fontStyle: "italic", fontWeight: 400, lineHeight: 1.6, marginBottom: 14 }}>"ZODO CRM transformed how we manage clients. The AI chatbot handles 60% of our support queries automatically."</p>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <div style={{ width: 36, height: 36, borderRadius: "50%", background: V.gradBtn, display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 700, fontSize: 14 }}>B</div>
              <div><div style={{ color: V.textWhite, fontSize: 14, fontWeight: 600 }}>Bharti Dhawan</div><div style={{ color: V.textLight, fontSize: 12 }}>CEO, Zodo</div></div>
            </div>
          </div>
        </div>

        {/* ═══ RIGHT PANEL ═══ */}
        <div style={{ background: rightBg, display: "flex", alignItems: "center", justifyContent: "center", padding: 48, position: "relative", overflowY: "auto", animation: "fadeInRight 0.6s ease", transition: "background 0.3s" }}>
          <button onClick={() => setDark(!dark)} aria-label="Toggle dark mode" style={{ position: "absolute", top: 24, right: 24, width: 40, height: 40, borderRadius: "50%", background: dark ? V.dmInputBg : "#f1f5f9", border: `1px solid ${border}`, display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 16, transition: "all 0.2s" }}>{dark ? "☀️" : "🌙"}</button>
          <div className="signup-mobile-logo" style={{ display: "none" }}>
            <a href="/" aria-label="ZODO CRM Home"><img src={logo} alt="ZODO CRM" style={{ width: 100, margin: "0 auto 28px", display: "block", cursor: "pointer" }} /></a>
          </div>
          <div style={{ width: "100%", maxWidth: 420 }}>
            <span style={{ display: "inline-block", background: "rgba(16,185,129,0.08)", border: "1px solid rgba(16,185,129,0.20)", borderRadius: 9999, padding: "6px 16px", color: V.success, fontSize: 13, fontWeight: 500, marginBottom: 16, animation: anim("fadeInUp 0.5s ease 0.1s both") }}>✦ Free 14-Day Trial</span>
            <h2 style={{ fontSize: 28, fontWeight: 700, color: textH, marginBottom: 8, animation: anim("fadeInUp 0.5s ease 0.2s both"), transition: "color 0.3s" }}>Create your free account</h2>
            <p style={{ fontSize: 14, color: textSub, marginBottom: 12, animation: anim("fadeInUp 0.5s ease 0.3s both"), transition: "color 0.3s" }}>Start your 14-day free trial.<br />No credit card required. Cancel anytime.</p>

            {/* Progress Bar */}
            <div style={{ height: 3, background: dark ? V.dmBorder : V.inputBorder, borderRadius: 99, overflow: "hidden", marginBottom: 24, animation: anim("fadeInUp 0.5s ease 0.35s both") }}>
              <div style={{ height: "100%", borderRadius: 99, width: `${progress}%`, background: V.gradBtn, transition: "width 0.4s ease" }} />
            </div>

            {/* Social */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10, marginBottom: 20, animation: anim("fadeInUp 0.5s ease 0.4s both") }}>
              {[{ icon: <GoogleIcon />, label: "Google" }, { icon: <GithubIcon dark={dark} />, label: "GitHub" }, { icon: <MicrosoftIcon />, label: "Microsoft" }].map(b => (
                <button key={b.label} onClick={() => social(b.label)} style={{ height: 44, background: cardBg, border: `1.5px solid ${border}`, borderRadius: 12, display: "flex", alignItems: "center", justifyContent: "center", gap: 8, fontSize: 13, fontWeight: 500, color: dark ? V.dmText : "#374151", cursor: "pointer", transition: "all 0.25s" }}
                  onMouseEnter={e => { e.currentTarget.style.borderColor = V.primary; e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={e => { e.currentTarget.style.borderColor = border; e.currentTarget.style.transform = "translateY(0)"; }}>
                  {b.icon}<span className="social-label">{b.label}</span>
                </button>
              ))}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "4px 0 20px", animation: anim("fadeInUp 0.5s ease 0.45s both") }}>
              <div style={{ flex: 1, height: 1, background: border, transition: "background 0.3s" }} />
              <span style={{ fontSize: 12, color: V.textLight }}>or sign up with email</span>
              <div style={{ flex: 1, height: 1, background: border, transition: "background 0.3s" }} />
            </div>

            <form onSubmit={handleSignUp}>
              <Field field="fullName" label="Full Name" icon={<PersonIcon color={focusMap.fullName ? V.primary : V.textLight} />} placeholder="John Smith" validation={nameValid} errorMsg="Please enter your full name" idx={0} />
              <Field field="email" label="Work Email" icon={<MailIcon color={focusMap.email ? V.primary : V.textLight} />} placeholder="john@company.com" type="email" validation={emailValid} errorMsg="Please enter a valid email address" idx={1} />

              {/* Password with strength + requirements */}
              <Field field="password" label="Create Password" icon={<LockIcon color={focusMap.password ? V.primary : V.textLight} />} placeholder="Min. 8 characters" type="password" validation={pwScore >= 40} errorMsg="Password is too weak" idx={2} />

              {form.password && (
                <div style={{ marginTop: -10, marginBottom: 14 }}>
                  <div style={{ height: 3, background: dark ? V.dmBorder : V.inputBorder, borderRadius: 99, overflow: "hidden", marginBottom: 6 }}>
                    <div style={{ height: "100%", borderRadius: 99, width: pwWidth, background: pwColor, transition: "width 0.4s ease, background 0.4s ease" }} />
                  </div>
                  <span style={{ fontSize: 12, fontWeight: 500, color: pwColor }}>{pwLabel}</span>
                  {pwFocused && (
                    <div style={{ marginTop: 8, background: dark ? "rgba(255,255,255,0.04)" : "rgba(0,0,0,0.03)", border: `1px solid ${border}`, borderRadius: 10, padding: 12 }}>
                      {pwReqs.map((r, i) => (
                        <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: i < 3 ? 6 : 0 }}>
                          <span style={{ color: r.met ? V.success : V.textLight, fontSize: 12 }}>{r.met ? "✓" : "○"}</span>
                          <span style={{ fontSize: 12, color: r.met ? V.success : V.textLight }}>{r.label}</span>
                        </div>
                      ))}
                    </div>
                  )}
                  {capsLock && <p style={{ fontSize: 12, color: V.warning, marginTop: 6 }}>⚠️ Caps Lock is on</p>}
                </div>
              )}

              <Field field="confirmPassword" label="Confirm Password" icon={<LockIcon color={focusMap.confirmPassword ? V.primary : V.textLight} />} placeholder="Re-enter your password" type="password" validation={cpwValid} errorMsg="Passwords do not match" idx={3} />
              <Field field="company" label="Company Name" icon={<BuildingIcon color={focusMap.company ? V.primary : V.textLight} />} placeholder="Your company name" optional idx={4} />

              {/* Terms */}
              <div style={{ display: "flex", alignItems: "flex-start", gap: 8, margin: "16px 0", animation: anim("fadeInUp 0.5s ease 0.8s both") }}>
                <div onClick={() => { setAgreeTerms(!agreeTerms); setTermsError(false); }} style={{ width: 18, height: 18, borderRadius: 5, border: agreeTerms ? "none" : `1.5px solid ${termsError ? V.error : border}`, background: agreeTerms ? V.gradBtn : (dark ? V.dmInputBg : "#fff"), display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", transition: "all 0.2s", flexShrink: 0, marginTop: 2 }}>
                  {agreeTerms && <CheckSvg />}
                </div>
                <span style={{ fontSize: 14, color: dark ? V.textLight : V.textMid, transition: "color 0.3s" }}>
                  I agree to the{" "}
                  <a href="#" style={{ color: V.primary, textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>Terms of Service</a>
                  {" "}and{" "}
                  <a href="#" style={{ color: V.primary, textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>Privacy Policy</a>
                </span>
              </div>
              {termsError && <p role="alert" style={{ color: V.error, fontSize: 12, marginTop: -8, marginBottom: 8 }}>Please accept terms to continue</p>}

              {/* Submit */}
              <button type="submit" disabled={isLoading} aria-label="Create free account" style={{
                width: "100%", height: 52, background: btnState === "success" ? "linear-gradient(135deg,#10b981,#059669)" : V.gradBtn,
                border: "none", borderRadius: 12, color: "#fff", fontSize: 15, fontWeight: 600, letterSpacing: 0.3, cursor: isLoading ? "not-allowed" : "pointer",
                position: "relative", overflow: "hidden", transition: "all 0.3s", marginBottom: 20, opacity: isLoading ? 0.85 : 1,
                transform: btnState === "success" ? "scale(1.01)" : undefined, animation: btnState === "error" ? "shake 0.5s" : anim("fadeInUp 0.5s ease 0.85s both"),
              }} onMouseEnter={e => { if (!isLoading) { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = V.shadowGlow; } }}
                onMouseLeave={e => { e.currentTarget.style.transform = "translateY(0)"; e.currentTarget.style.boxShadow = "none"; }}>
                <span style={{ position: "relative", zIndex: 1, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                  {btnState === "loading" ? <><svg width="18" height="18" viewBox="0 0 24 24" style={{ animation: "spin 1s linear infinite" }}><circle cx="12" cy="12" r="10" stroke="#fff" strokeWidth="3" fill="none" strokeDasharray="60" strokeLinecap="round" /></svg>Creating your account...</> :
                    btnState === "success" ? "🎉 Account created! Redirecting..." :
                      btnState === "error" ? "Something went wrong. Try again." : <>Create Free Account  →</>}
                </span>
                <span style={{ position: "absolute", top: 0, width: "40%", height: "100%", background: "linear-gradient(90deg,transparent,rgba(255,255,255,0.18),transparent)", transform: "skewX(-20deg)", animation: "shine 3.5s infinite", zIndex: 0 }} />
              </button>
            </form>

            <p style={{ textAlign: "center", fontSize: 14, color: textSub, marginBottom: 24, animation: anim("fadeInUp 0.5s ease 0.9s both"), transition: "color 0.3s" }}>
              Already have an account?{" "}
              <NavLink to="/login" style={{ color: V.primary, fontWeight: 600, textDecoration: "none" }} onMouseEnter={e => (e.currentTarget.style.textDecoration = "underline")} onMouseLeave={e => (e.currentTarget.style.textDecoration = "none")}>Sign in</NavLink>
            </p>

            <div style={{ paddingTop: 20, borderTop: `1px solid ${border}`, display: "flex", justifyContent: "center", alignItems: "center", gap: 20, animation: anim("fadeInUp 0.5s ease 0.95s both"), transition: "border-color 0.3s" }}>
              {[{ e: "🔒", t: "SSL Secured" }, null, { e: "🛡️", t: "SOC 2 Ready" }, null, { e: "✅", t: "GDPR Compliant" }].map((b, i) =>
                b ? <span key={i} style={{ display: "flex", alignItems: "center", gap: 5, fontSize: 12, color: V.textLight }}>{b.e} {b.t}</span>
                  : <span key={i} style={{ width: 1, height: 14, background: border, transition: "background 0.3s" }} />
              )}
            </div>
          </div>
        </div>
      </div>

      <style>{`
        @media(max-width:767px){
          div[style*="grid-template-columns: 45% 55%"]{display:flex!important;flex-direction:column!important;}
          .signup-left-panel{display:none!important}
          .signup-mobile-logo{display:block!important;text-align:center;margin-top:20px;}
          div[style*="gridTemplateColumns: 1fr 1fr 1fr"]{grid-template-columns:1fr!important}
        }
      `}</style>
    </>
  );
};

export default SignUpPage;
