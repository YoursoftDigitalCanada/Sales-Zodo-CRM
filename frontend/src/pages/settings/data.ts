import {
    Settings, Building2, CreditCard, Mail, Shield, Globe, Clock,
    Bell, Palette, Users, Lock, Eye, Smartphone, FileText,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export type SettingsTab = "general" | "company" | "billing" | "email" | "security";

export interface SettingsTabItem {
    id: SettingsTab;
    label: string;
    icon: LucideIcon;
    description: string;
}

export interface PlanFeature {
    name: string;
    included: boolean;
}

export interface BillingPlan {
    id: string;
    name: string;
    price: string;
    period: string;
    description: string;
    features: PlanFeature[];
    current?: boolean;
    popular?: boolean;
}

export interface TeamMember {
    id: string;
    name: string;
    email: string;
    role: string;
    avatar: string;
    status: "active" | "invited" | "suspended";
    lastLogin: string;
    twoFA: boolean;
}

export interface AuditLogEntry {
    id: string;
    user: string;
    action: string;
    resource: string;
    time: string;
    ip: string;
}

export interface SessionItem {
    id: string;
    device: string;
    browser: string;
    location: string;
    ip: string;
    lastActive: string;
    current?: boolean;
}

// ============================================
// DATA
// ============================================

export const settingsTabs: SettingsTabItem[] = [
    { id: "general", label: "General", icon: Settings, description: "Workspace preferences and defaults" },
    { id: "company", label: "Company Profile", icon: Building2, description: "Organization details and branding" },
    { id: "billing", label: "Billing & Plans", icon: CreditCard, description: "Subscription, invoices, and usage" },
    { id: "email", label: "Email Settings", icon: Mail, description: "Email configuration and templates" },
    { id: "security", label: "Security", icon: Shield, description: "Authentication, permissions, and logs" },
];

export const timezones = [
    "UTC", "America/New_York", "America/Chicago", "America/Denver", "America/Los_Angeles",
    "America/Toronto", "Europe/London", "Europe/Paris", "Europe/Berlin", "Asia/Tokyo",
    "Asia/Shanghai", "Asia/Kolkata", "Asia/Dubai", "Australia/Sydney", "Pacific/Auckland",
];

export const currencies = ["USD", "CAD", "EUR", "GBP", "AUD", "JPY", "INR", "AED", "CHF", "SGD"];
export const dateFormats = ["MM/DD/YYYY", "DD/MM/YYYY", "YYYY-MM-DD", "DD-MMM-YYYY"];
export const languages = ["English", "French", "Spanish", "German", "Portuguese", "Japanese", "Chinese (Simplified)", "Arabic", "Hindi"];

export const billingPlans: BillingPlan[] = [
    {
        id: "starter", name: "Starter", price: "$149", period: "/user/month", description: "For small teams getting started",
        features: [
            { name: "Up to 10 users", included: true }, { name: "1,000 contacts", included: true },
            { name: "Basic pipeline", included: true }, { name: "Email integration", included: true },
            { name: "AI Lead Scoring", included: false }, { name: "Custom reports", included: false },
            { name: "API access", included: false }, { name: "Priority support", included: false },
        ],
    },
    {
        id: "professional", name: "Professional", price: "$249", period: "/user/month", description: "For growing businesses",
        current: true, popular: true,
        features: [
            { name: "Up to 50 users", included: true }, { name: "25,000 contacts", included: true },
            { name: "Advanced pipeline", included: true }, { name: "Email integration", included: true },
            { name: "AI Lead Scoring", included: true }, { name: "Custom reports", included: true },
            { name: "API access", included: true }, { name: "Priority support", included: false },
        ],
    },
    {
        id: "enterprise", name: "Enterprise", price: "$399", period: "/user/month", description: "For large organizations",
        features: [
            { name: "Unlimited users", included: true }, { name: "Unlimited contacts", included: true },
            { name: "Advanced pipeline", included: true }, { name: "Email integration", included: true },
            { name: "AI Lead Scoring", included: true }, { name: "Custom reports", included: true },
            { name: "API access", included: true }, { name: "Priority support", included: true },
        ],
    },
];

export const teamMembers: TeamMember[] = [
    { id: "u1", name: "Alex Johnson", email: "alex@zodo.ca", role: "Owner", avatar: "AJ", status: "active", lastLogin: "Just now", twoFA: true },
    { id: "u2", name: "Sarah Chen", email: "sarah@zodo.ca", role: "Admin", avatar: "SC", status: "active", lastLogin: "2 hours ago", twoFA: true },
    { id: "u3", name: "Mike Rodriguez", email: "mike@zodo.ca", role: "Manager", avatar: "MR", status: "active", lastLogin: "1 day ago", twoFA: true },
    { id: "u4", name: "Emily Davis", email: "emily@zodo.ca", role: "Sales Rep", avatar: "ED", status: "active", lastLogin: "3 hours ago", twoFA: false },
    { id: "u5", name: "James Wilson", email: "james@zodo.ca", role: "Sales Rep", avatar: "JW", status: "invited", lastLogin: "Never", twoFA: false },
    { id: "u6", name: "Lisa Park", email: "lisa@zodo.ca", role: "Marketing", avatar: "LP", status: "active", lastLogin: "5 hours ago", twoFA: true },
];

export const auditLogs: AuditLogEntry[] = [
    { id: "al1", user: "Alex Johnson", action: "Updated", resource: "Company Profile", time: "5 min ago", ip: "192.168.1.10" },
    { id: "al2", user: "Sarah Chen", action: "Created", resource: "API Key (Production)", time: "1 hour ago", ip: "192.168.1.22" },
    { id: "al3", user: "Alex Johnson", action: "Changed", resource: "Security Policy (2FA)", time: "2 hours ago", ip: "192.168.1.10" },
    { id: "al4", user: "Mike Rodriguez", action: "Deleted", resource: "Email Template (Welcome)", time: "4 hours ago", ip: "192.168.1.15" },
    { id: "al5", user: "Emily Davis", action: "Exported", resource: "Contacts (1,234 records)", time: "6 hours ago", ip: "10.0.0.45" },
    { id: "al6", user: "Lisa Park", action: "Updated", resource: "Notification Preferences", time: "1 day ago", ip: "10.0.0.50" },
    { id: "al7", user: "Alex Johnson", action: "Changed", resource: "Billing Plan (Pro → Enterprise)", time: "2 days ago", ip: "192.168.1.10" },
    { id: "al8", user: "Sarah Chen", action: "Revoked", resource: "API Key (Legacy)", time: "3 days ago", ip: "192.168.1.22" },
];

export const sessions: SessionItem[] = [
    { id: "s1", device: "MacBook Pro", browser: "Chrome 122", location: "Toronto, CA", ip: "192.168.1.10", lastActive: "Now", current: true },
    { id: "s2", device: "iPhone 15", browser: "Safari Mobile", location: "Toronto, CA", ip: "10.0.0.45", lastActive: "2 hours ago" },
    { id: "s3", device: "Windows Desktop", browser: "Edge 122", location: "New York, US", ip: "203.0.113.50", lastActive: "1 day ago" },
];
