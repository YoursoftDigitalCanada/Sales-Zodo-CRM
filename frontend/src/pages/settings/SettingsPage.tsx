import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Save, Upload, Trash2, Plus, X, Check, Copy, Eye, EyeOff,
    Moon, Sun, Bell, BellOff, CheckCircle2, AlertTriangle,
    LogOut, Monitor, Smartphone, Globe, Lock, Shield, Mail,
    ChevronDown, Settings, ExternalLink, RefreshCw,
} from "lucide-react";
import {
    settingsTabs, timezones, currencies, dateFormats, languages,
    billingPlans, teamMembers, auditLogs, sessions,
    type SettingsTab, type TeamMember,
} from "./data";

import { useLocation } from "react-router-dom";

export default function SettingsPage() {
    
    const [activeTab, setActiveTab] = useState<SettingsTab>("general");
    const { toast } = useToast();
    const location = useLocation();

    // Sync tab from URL path
    useEffect(() => {
        const path = location.pathname;
        const tabMap: Record<string, SettingsTab> = {
            "/settings/general": "general",
            "/settings/company": "company",
            "/settings/billing": "billing",
            "/settings/email": "email",
            "/settings/security": "security",
        };
        if (tabMap[path]) setActiveTab(tabMap[path]);
    }, [location.pathname]);

    // General Settings State
    const [orgName, setOrgName] = useState("ZODO Technologies Inc.");
    const [timezone, setTimezone] = useState("America/Toronto");
    const [currency, setCurrency] = useState("CAD");
    const [dateFormat, setDateFormat] = useState("MM/DD/YYYY");
    const [language, setLanguage] = useState("English");
    const [darkMode, setDarkMode] = useState(false);
    const [notifications, setNotifications] = useState({ email: true, push: true, desktop: true, weekly: true, marketing: false });

    // Company State
    const [companyName, setCompanyName] = useState("ZODO Technologies Inc.");
    const [companyDomain, setCompanyDomain] = useState("zodo.ca");
    const [companyEmail, setCompanyEmail] = useState("hello@zodo.ca");
    const [companyPhone, setCompanyPhone] = useState("+1 (888) 555-ZODO");
    const [companyAddress, setCompanyAddress] = useState("100 King Street West, Suite 3400\nToronto, ON M5X 1A1\nCanada");
    const [taxId, setTaxId] = useState("BN 123456789");

    // Email State
    const [smtpHost, setSmtpHost] = useState("smtp.gmail.com");
    const [smtpPort, setSmtpPort] = useState("587");
    const [smtpUser, setSmtpUser] = useState("noreply@zodo.ca");
    const [smtpPass, setSmtpPass] = useState("••••••••••••");
    const [showSmtpPass, setShowSmtpPass] = useState(false);
    const [senderName, setSenderName] = useState("ZODO CRM");
    const [senderEmail, setSenderEmail] = useState("noreply@zodo.ca");
    const [emailSignature, setEmailSignature] = useState("Best regards,\nThe ZODO CRM Team\nzodo.ca");

    // Security State
    const [enforce2FA, setEnforce2FA] = useState(true);
    const [passwordMinLength, setPasswordMinLength] = useState("12");
    const [sessionTimeout, setSessionTimeout] = useState("30");
    const [ipWhitelist, setIpWhitelist] = useState("");
    const [localMembers, setLocalMembers] = useState(teamMembers);

    // Billing State
    const [localPlans, setLocalPlans] = useState(billingPlans);

    // ============================================
    // HANDLERS
    // ============================================

    const handleSave = (section: string) => {
        toast({ title: "Settings Saved", description: `${section} settings have been updated successfully.` });
    };

    const handleUpgradePlan = (planId: string) => {
        setLocalPlans((prev) =>
            prev.map((p) => ({ ...p, current: p.id === planId }))
        );
        const plan = localPlans.find((p) => p.id === planId);
        toast({ title: "Plan Updated", description: `You've switched to the ${plan?.name} plan.` });
    };

    const handleToggle2FA = (member: TeamMember) => {
        setLocalMembers((prev) =>
            prev.map((m) => m.id === member.id ? { ...m, twoFA: !m.twoFA } : m)
        );
        toast({ title: "2FA Updated", description: `Two-factor authentication ${member.twoFA ? "disabled" : "enabled"} for ${member.name}.` });
    };

    const handleSuspendUser = (member: TeamMember) => {
        setLocalMembers((prev) =>
            prev.map((m) => m.id === member.id ? { ...m, status: m.status === "suspended" ? "active" as const : "suspended" as const } : m)
        );
        toast({ title: member.status === "suspended" ? "User Reactivated" : "User Suspended", description: `${member.name} has been ${member.status === "suspended" ? "reactivated" : "suspended"}.` });
    };

    const handleRevokeSession = (sessionId: string) => {
        toast({ title: "Session Revoked", description: "The session has been terminated." });
    };

    const handleTestEmail = () => {
        toast({ title: "Test Email Sent", description: `A test email has been sent to ${smtpUser}.` });
    };

    // Field component
    const Field = ({ label, children, hint }: { label: string; children: React.ReactNode; hint?: string }) => (
        <div className="space-y-1.5">
            <label className="text-sm font-medium text-[#0F172A]">{label}</label>
            {children}
            {hint && <p className="text-[11px] text-[#94A3B8]">{hint}</p>}
        </div>
    );

    const inputClass = "w-full h-10 px-4 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm text-[#0F172A] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]/30 transition-all";
    const selectClass = inputClass + " appearance-none cursor-pointer";

    const Toggle = ({ enabled, onToggle }: { enabled: boolean; onToggle: () => void }) => (
        <button onClick={onToggle} className={cn("relative w-11 h-6 rounded-full transition-colors", enabled ? "bg-[#0891B2]" : "bg-[#CBD5E1]")}>
            <span className={cn("absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-transform", enabled ? "left-[22px]" : "left-0.5")} />
        </button>
    );

    return (
        <div className="flex h-screen bg-[#F8FAFC]">

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex-shrink-0">
                    <div className="flex items-center gap-3">
                        <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                            <Settings size={20} className="text-[#0891B2]" />
                        </div>
                        <div>
                            <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Settings</h1>
                            <p className="text-sm text-[#475569] mt-0.5">Manage your workspace preferences and configuration</p>
                        </div>
                    </div>
                </header>

                <div className="flex-1 flex overflow-hidden">
                    {/* Settings Sidebar */}
                    <div className="w-64 bg-white border-r border-[rgba(15,23,42,0.06)] p-4 flex-shrink-0 overflow-auto">
                        <nav className="space-y-1">
                            {settingsTabs.map((tab) => (
                                <button
                                    key={tab.id}
                                    onClick={() => setActiveTab(tab.id)}
                                    className={cn(
                                        "flex items-center gap-3 w-full px-3 py-2.5 rounded-lg text-sm font-medium transition-all text-left",
                                        activeTab === tab.id
                                            ? "bg-[#0891B2]/10 text-[#0891B2]"
                                            : "text-[#475569] hover:bg-[#F8FAFC] hover:text-[#0F172A]"
                                    )}
                                >
                                    <tab.icon size={18} />
                                    <div>
                                        <span className="block">{tab.label}</span>
                                        <span className="block text-[10px] text-[#94A3B8] font-normal mt-0.5">{tab.description}</span>
                                    </div>
                                </button>
                            ))}
                        </nav>
                    </div>

                    {/* Settings Content */}
                    <main className="flex-1 p-6 overflow-auto">
                        <div className="max-w-3xl mx-auto space-y-6 page-enter">

                            {/* ========== GENERAL ========== */}
                            {activeTab === "general" && (
                                <>
                                    {/* Workspace */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Workspace Preferences</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Field label="Organization Name">
                                                <input className={inputClass} value={orgName} onChange={(e) => setOrgName(e.target.value)} />
                                            </Field>
                                            <Field label="Language">
                                                <select className={selectClass} value={language} onChange={(e) => setLanguage(e.target.value)}>
                                                    {languages.map((l) => <option key={l}>{l}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Timezone">
                                                <select className={selectClass} value={timezone} onChange={(e) => setTimezone(e.target.value)}>
                                                    {timezones.map((tz) => <option key={tz}>{tz}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Currency">
                                                <select className={selectClass} value={currency} onChange={(e) => setCurrency(e.target.value)}>
                                                    {currencies.map((c) => <option key={c}>{c}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Date Format">
                                                <select className={selectClass} value={dateFormat} onChange={(e) => setDateFormat(e.target.value)}>
                                                    {dateFormats.map((f) => <option key={f}>{f}</option>)}
                                                </select>
                                            </Field>
                                            <Field label="Appearance">
                                                <div className="flex items-center gap-3">
                                                    <Toggle enabled={darkMode} onToggle={() => setDarkMode(!darkMode)} />
                                                    <span className="text-sm text-[#475569]">{darkMode ? "Dark" : "Light"} Mode</span>
                                                </div>
                                            </Field>
                                        </div>
                                        <div className="flex justify-end mt-6">
                                            <button onClick={() => handleSave("Workspace")} className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors">
                                                <Save size={14} /> Save Changes
                                            </button>
                                        </div>
                                    </div>

                                    {/* Notifications */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Notification Preferences</h3>
                                        <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                                            {[
                                                { key: "email" as const, label: "Email Notifications", desc: "Receive updates via email" },
                                                { key: "push" as const, label: "Push Notifications", desc: "Mobile push alerts" },
                                                { key: "desktop" as const, label: "Desktop Notifications", desc: "Browser desktop alerts" },
                                                { key: "weekly" as const, label: "Weekly Digest", desc: "Summary of weekly activity" },
                                                { key: "marketing" as const, label: "Product Updates", desc: "New features and product news" },
                                            ].map((item) => (
                                                <div key={item.key} className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-sm font-medium text-[#0F172A]">{item.label}</p>
                                                        <p className="text-xs text-[#94A3B8]">{item.desc}</p>
                                                    </div>
                                                    <Toggle enabled={notifications[item.key]} onToggle={() => setNotifications((p) => ({ ...p, [item.key]: !p[item.key] }))} />
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end mt-4">
                                            <button onClick={() => handleSave("Notification")} className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors">
                                                <Save size={14} /> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== COMPANY PROFILE ========== */}
                            {activeTab === "company" && (
                                <>
                                    {/* Logo & Brand */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Brand & Logo</h3>
                                        <div className="flex items-center gap-6">
                                            <div className="w-24 h-24 rounded-xl bg-gradient-to-br from-[#0891B2] to-[#0E7490] flex items-center justify-center text-white text-xl sm:text-2xl font-bold shadow-lg">
                                                ZD
                                            </div>
                                            <div className="space-y-2">
                                                <p className="text-sm text-[#475569]">Upload your company logo (PNG, JPG, SVG — max 2MB)</p>
                                                <div className="flex gap-2">
                                                    <button onClick={() => toast({ title: "Upload", description: "File picker opened. Select your logo." })}
                                                        className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                                        <Upload size={14} /> Upload Logo
                                                    </button>
                                                    <button onClick={() => toast({ title: "Removed", description: "Logo has been reset to default." })}
                                                        className="flex items-center gap-2 px-4 py-2 bg-white border border-[rgba(15,23,42,0.12)] text-[#475569] rounded-lg text-sm font-medium hover:bg-[#F8FAFC]">
                                                        <Trash2 size={14} /> Remove
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    </div>

                                    {/* Company Details */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Company Information</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Field label="Company Name">
                                                <input className={inputClass} value={companyName} onChange={(e) => setCompanyName(e.target.value)} />
                                            </Field>
                                            <Field label="Domain">
                                                <input className={inputClass} value={companyDomain} onChange={(e) => setCompanyDomain(e.target.value)} />
                                            </Field>
                                            <Field label="Email">
                                                <input className={inputClass} value={companyEmail} onChange={(e) => setCompanyEmail(e.target.value)} />
                                            </Field>
                                            <Field label="Phone">
                                                <input className={inputClass} value={companyPhone} onChange={(e) => setCompanyPhone(e.target.value)} />
                                            </Field>
                                            <Field label="Tax ID / Business Number">
                                                <input className={inputClass} value={taxId} onChange={(e) => setTaxId(e.target.value)} />
                                            </Field>
                                        </div>
                                        <div className="mt-5">
                                            <Field label="Address">
                                                <textarea className={inputClass + " h-24 py-3 resize-none"} value={companyAddress} onChange={(e) => setCompanyAddress(e.target.value)} />
                                            </Field>
                                        </div>
                                        <div className="flex justify-end mt-6">
                                            <button onClick={() => handleSave("Company")} className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                                <Save size={14} /> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== BILLING ========== */}
                            {activeTab === "billing" && (
                                <>
                                    {/* Current Plan */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-2">Current Plan</h3>
                                        <p className="text-sm text-[#475569] mb-4">You're on the <span className="font-semibold text-[#0891B2]">{localPlans.find((p) => p.current)?.name}</span> plan</p>

                                        {/* Usage Bar */}
                                        <div className="bg-[#F8FAFC] rounded-lg p-4 space-y-3">
                                            {[
                                                { label: "Users", used: 6, total: 50 },
                                                { label: "Contacts", used: 8420, total: 25000 },
                                                { label: "Storage", used: 3.2, total: 10, unit: "GB" },
                                                { label: "API Calls", used: 45200, total: 100000 },
                                            ].map((item) => (
                                                <div key={item.label}>
                                                    <div className="flex justify-between text-xs mb-1">
                                                        <span className="text-[#475569]">{item.label}</span>
                                                        <span className="text-[#0F172A] font-medium">
                                                            {typeof item.used === "number" && item.used > 999 ? item.used.toLocaleString() : item.used}
                                                            {item.unit ? ` ${item.unit}` : ""} / {typeof item.total === "number" && item.total > 999 ? item.total.toLocaleString() : item.total}{item.unit ? ` ${item.unit}` : ""}
                                                        </span>
                                                    </div>
                                                    <div className="w-full h-2 bg-[#E2E8F0] rounded-full overflow-hidden">
                                                        <div
                                                            className="h-full bg-[#0891B2] rounded-full transition-all"
                                                            style={{ width: `${Math.min((item.used / item.total) * 100, 100)}%` }}
                                                        />
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Plans */}
                                    <div>
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Available Plans</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                            {localPlans.map((plan) => (
                                                <div key={plan.id} className={cn(
                                                    "bg-white rounded-lg card-shadow p-5 relative",
                                                    plan.current && "ring-2 ring-[#0891B2]"
                                                )}>
                                                    {plan.popular && (
                                                        <span className="absolute -top-2.5 left-1/2 -translate-x-1/2 px-3 py-0.5 bg-[#0891B2] text-white text-[10px] font-bold rounded-full uppercase">Popular</span>
                                                    )}
                                                    <h4 className="font-bold text-[#0F172A]">{plan.name}</h4>
                                                    <div className="flex items-baseline gap-1 mt-2">
                                                        <span className="text-3xl font-bold text-[#0F172A]">{plan.price}</span>
                                                        <span className="text-sm text-[#94A3B8]">{plan.period}</span>
                                                    </div>
                                                    <p className="text-xs text-[#475569] mt-1 mb-4">{plan.description}</p>

                                                    <div className="space-y-2 mb-5">
                                                        {plan.features.map((f) => (
                                                            <div key={f.name} className="flex items-center gap-2 text-xs">
                                                                {f.included
                                                                    ? <CheckCircle2 size={14} className="text-[#16A34A] flex-shrink-0" />
                                                                    : <X size={14} className="text-[#CBD5E1] flex-shrink-0" />}
                                                                <span className={f.included ? "text-[#0F172A]" : "text-[#94A3B8]"}>{f.name}</span>
                                                            </div>
                                                        ))}
                                                    </div>

                                                    {plan.current ? (
                                                        <div className="w-full py-2.5 text-center bg-[#F8FAFC] border border-[rgba(15,23,42,0.08)] rounded-lg text-sm font-medium text-[#475569]">
                                                            Current Plan
                                                        </div>
                                                    ) : (
                                                        <button
                                                            onClick={() => handleUpgradePlan(plan.id)}
                                                            className="w-full py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors"
                                                        >
                                                            {localPlans.findIndex((p) => p.current) < localPlans.findIndex((p) => p.id === plan.id) ? "Upgrade" : "Downgrade"}
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Invoice History */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Invoice History</h3>
                                        <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                                            {[
                                                { date: "Feb 1, 2026", amount: "$474.00", status: "Paid", id: "INV-2026-002" },
                                                { date: "Jan 1, 2026", amount: "$474.00", status: "Paid", id: "INV-2026-001" },
                                                { date: "Dec 1, 2025", amount: "$474.00", status: "Paid", id: "INV-2025-012" },
                                                { date: "Nov 1, 2025", amount: "$474.00", status: "Paid", id: "INV-2025-011" },
                                            ].map((inv) => (
                                                <div key={inv.id} className="flex items-center justify-between py-3">
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm text-[#0F172A] font-medium">{inv.id}</span>
                                                        <span className="text-xs text-[#94A3B8]">{inv.date}</span>
                                                    </div>
                                                    <div className="flex items-center gap-4">
                                                        <span className="text-sm font-medium text-[#0F172A]">{inv.amount}</span>
                                                        <span className="px-2 py-0.5 rounded-full bg-[#16A34A]/10 text-[#16A34A] text-[10px] font-semibold uppercase">{inv.status}</span>
                                                        <button onClick={() => toast({ title: "Download", description: `Downloading ${inv.id}.pdf...` })}
                                                            className="text-[#0891B2] hover:text-[#0891B2]/80 text-xs font-medium">Download</button>
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== EMAIL SETTINGS ========== */}
                            {activeTab === "email" && (
                                <>
                                    {/* SMTP */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">SMTP Configuration</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Field label="SMTP Host">
                                                <input className={inputClass} value={smtpHost} onChange={(e) => setSmtpHost(e.target.value)} />
                                            </Field>
                                            <Field label="SMTP Port">
                                                <input className={inputClass} value={smtpPort} onChange={(e) => setSmtpPort(e.target.value)} />
                                            </Field>
                                            <Field label="Username">
                                                <input className={inputClass} value={smtpUser} onChange={(e) => setSmtpUser(e.target.value)} />
                                            </Field>
                                            <Field label="Password">
                                                <div className="relative">
                                                    <input className={inputClass + " pr-10"} type={showSmtpPass ? "text" : "password"} value={smtpPass} onChange={(e) => setSmtpPass(e.target.value)} />
                                                    <button onClick={() => setShowSmtpPass(!showSmtpPass)} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]">
                                                        {showSmtpPass ? <EyeOff size={14} /> : <Eye size={14} />}
                                                    </button>
                                                </div>
                                            </Field>
                                        </div>
                                        <div className="flex items-center gap-3 mt-5">
                                            <button onClick={handleTestEmail} className="flex items-center gap-2 px-4 py-2 bg-white border border-[rgba(15,23,42,0.12)] text-[#0F172A] rounded-lg text-sm font-medium hover:bg-[#F8FAFC]">
                                                <Mail size={14} /> Send Test Email
                                            </button>
                                            <button onClick={() => handleSave("SMTP")} className="flex items-center gap-2 px-5 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                                <Save size={14} /> Save
                                            </button>
                                        </div>
                                    </div>

                                    {/* Sender Info */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Default Sender</h3>
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                            <Field label="Sender Name" hint="Name shown in recipients' inbox">
                                                <input className={inputClass} value={senderName} onChange={(e) => setSenderName(e.target.value)} />
                                            </Field>
                                            <Field label="Sender Email" hint="Reply-to address">
                                                <input className={inputClass} value={senderEmail} onChange={(e) => setSenderEmail(e.target.value)} />
                                            </Field>
                                        </div>
                                        <div className="mt-5">
                                            <Field label="Email Signature">
                                                <textarea className={inputClass + " h-28 py-3 resize-none font-mono text-xs"} value={emailSignature} onChange={(e) => setEmailSignature(e.target.value)} />
                                            </Field>
                                        </div>
                                        <div className="flex justify-end mt-5">
                                            <button onClick={() => handleSave("Email")} className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                                <Save size={14} /> Save Changes
                                            </button>
                                        </div>
                                    </div>
                                </>
                            )}

                            {/* ========== SECURITY ========== */}
                            {activeTab === "security" && (
                                <>
                                    {/* Auth Policies */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Authentication Policies</h3>
                                        <div className="space-y-4">
                                            <div className="flex items-center justify-between">
                                                <div><p className="text-sm font-medium text-[#0F172A]">Enforce Two-Factor Authentication</p><p className="text-xs text-[#94A3B8]">Require all users to enable 2FA</p></div>
                                                <Toggle enabled={enforce2FA} onToggle={() => setEnforce2FA(!enforce2FA)} />
                                            </div>
                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                                <Field label="Minimum Password Length">
                                                    <input className={inputClass} type="number" value={passwordMinLength} onChange={(e) => setPasswordMinLength(e.target.value)} />
                                                </Field>
                                                <Field label="Session Timeout (minutes)">
                                                    <input className={inputClass} type="number" value={sessionTimeout} onChange={(e) => setSessionTimeout(e.target.value)} />
                                                </Field>
                                            </div>
                                            <Field label="IP Whitelist" hint="Comma-separated list of allowed IPs (leave empty to allow all)">
                                                <input className={inputClass} placeholder="e.g. 192.168.1.0/24, 10.0.0.1" value={ipWhitelist} onChange={(e) => setIpWhitelist(e.target.value)} />
                                            </Field>
                                        </div>
                                        <div className="flex justify-end mt-5">
                                            <button onClick={() => handleSave("Security")} className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90">
                                                <Save size={14} /> Save Changes
                                            </button>
                                        </div>
                                    </div>

                                    {/* Team Members */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <div className="flex items-center justify-between mb-4">
                                            <h3 className="font-semibold text-[#0F172A]">Team Members</h3>
                                            <button onClick={() => toast({ title: "Invite", description: "Invitation form opened." })}
                                                className="flex items-center gap-2 px-3 py-1.5 bg-[#0891B2] text-white rounded-lg text-xs font-medium hover:bg-[#0891B2]/90">
                                                <Plus size={14} /> Invite User
                                            </button>
                                        </div>
                                        <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                                            {localMembers.map((member) => (
                                                <div key={member.id} className="flex items-center justify-between py-3">
                                                    <div className="flex items-center gap-3">
                                                        <div className="w-9 h-9 rounded-full bg-[#0891B2]/10 flex items-center justify-center text-xs font-bold text-[#0891B2]">
                                                            {member.avatar}
                                                        </div>
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-[#0F172A]">{member.name}</span>
                                                                <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-semibold uppercase",
                                                                    member.status === "active" ? "bg-[#16A34A]/10 text-[#16A34A]" :
                                                                        member.status === "invited" ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#DC2626]/10 text-[#DC2626]"
                                                                )}>{member.status}</span>
                                                            </div>
                                                            <p className="text-xs text-[#94A3B8]">{member.email} · {member.role}</p>
                                                        </div>
                                                    </div>
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[11px] text-[#94A3B8]">{member.twoFA ? "2FA ✓" : "No 2FA"}</span>
                                                        <button onClick={() => handleToggle2FA(member)} className="p-1.5 text-[#475569] hover:bg-[#F8FAFC] rounded-lg" title="Toggle 2FA">
                                                            <Shield size={14} />
                                                        </button>
                                                        {member.role !== "Owner" && (
                                                            <button onClick={() => handleSuspendUser(member)} className="p-1.5 text-[#DC2626]/60 hover:bg-[#DC2626]/10 rounded-lg" title={member.status === "suspended" ? "Reactivate" : "Suspend"}>
                                                                {member.status === "suspended" ? <RefreshCw size={14} /> : <Lock size={14} />}
                                                            </button>
                                                        )}
                                                    </div>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Active Sessions */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Active Sessions</h3>
                                        <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                                            {sessions.map((session) => (
                                                <div key={session.id} className="flex items-center justify-between py-3">
                                                    <div className="flex items-center gap-3">
                                                        {session.device.includes("MacBook") || session.device.includes("Windows") ? <Monitor size={18} className="text-[#475569]" /> : <Smartphone size={18} className="text-[#475569]" />}
                                                        <div>
                                                            <div className="flex items-center gap-2">
                                                                <span className="text-sm font-medium text-[#0F172A]">{session.device} · {session.browser}</span>
                                                                {session.current && <span className="px-1.5 py-0.5 rounded bg-[#16A34A]/10 text-[#16A34A] text-[9px] font-semibold uppercase">Current</span>}
                                                            </div>
                                                            <p className="text-xs text-[#94A3B8]">{session.location} · {session.ip} · {session.lastActive}</p>
                                                        </div>
                                                    </div>
                                                    {!session.current && (
                                                        <button onClick={() => handleRevokeSession(session.id)}
                                                            className="px-3 py-1.5 text-xs font-medium text-[#DC2626] bg-[#DC2626]/10 rounded-lg hover:bg-[#DC2626]/15">
                                                            Revoke
                                                        </button>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    {/* Audit Log */}
                                    <div className="bg-white rounded-lg card-shadow p-6">
                                        <h3 className="font-semibold text-[#0F172A] mb-4">Audit Log</h3>
                                        <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                                            {auditLogs.map((log) => (
                                                <div key={log.id} className="flex items-center justify-between py-3">
                                                    <div>
                                                        <p className="text-sm text-[#0F172A]">
                                                            <span className="font-medium">{log.user}</span>{" "}
                                                            <span className="text-[#475569]">{log.action.toLowerCase()}</span>{" "}
                                                            <span className="font-medium">{log.resource}</span>
                                                        </p>
                                                        <p className="text-xs text-[#94A3B8] mt-0.5">IP: {log.ip}</p>
                                                    </div>
                                                    <span className="text-xs text-[#94A3B8] whitespace-nowrap">{log.time}</span>
                                                </div>
                                            ))}
                                        </div>
                                        <div className="flex justify-end mt-4">
                                            <button onClick={() => toast({ title: "Export", description: "Audit log CSV download started." })}
                                                className="text-xs font-medium text-[#0891B2] hover:text-[#0891B2]/80">Export Full Log →</button>
                                        </div>
                                    </div>
                                </>
                            )}
                        </div>
                    </main>
                </div>
            </div>
        </div>
    );
}
