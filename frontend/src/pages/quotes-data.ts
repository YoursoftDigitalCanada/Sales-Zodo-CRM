// src/pages/quotes-data.ts
import {
    FileText, Send, Eye, CheckCircle2, Clock3, XCircle, AlertTriangle,
    CircleDot, type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

export interface QuoteItem {
    id: string;
    description: string;
    quantity: number;
    rate: number;
    amount: number;
    tax?: number;
}

export interface Quote {
    id: string;
    quoteNumber: string;
    clientId?: string;
    clientName: string;
    clientEmail?: string;
    clientPhone?: string;
    clientCompany?: string;
    projectName?: string;
    title: string;
    description?: string;
    items: QuoteItem[];
    subtotal: number;
    tax: number;
    discount: number;
    total: number;
    status: "draft" | "sent" | "viewed" | "accepted" | "declined" | "expired" | "converted";
    priority: "low" | "medium" | "high";
    validUntil: string;
    createdAt: string;
    updatedAt?: string;
    sentAt?: string;
    acceptedAt?: string;
    notes?: string;
    terms?: string;
    currency: string;
    createdBy: string;
    tags?: string[];
    linkedInvoiceId?: string;
}

// ============================================
// CONSTANTS
// ============================================

export const quoteStatusOptions: { value: string; label: string; icon: LucideIcon; color: string }[] = [
    { value: "all", label: "All Status", icon: CircleDot, color: "slate" },
    { value: "draft", label: "Draft", icon: FileText, color: "slate" },
    { value: "sent", label: "Sent", icon: Send, color: "blue" },
    { value: "viewed", label: "Viewed", icon: Eye, color: "purple" },
    { value: "accepted", label: "Accepted", icon: CheckCircle2, color: "green" },
    { value: "declined", label: "Declined", icon: XCircle, color: "red" },
    { value: "expired", label: "Expired", icon: Clock3, color: "amber" },
    { value: "converted", label: "Converted", icon: CheckCircle2, color: "teal" },
];

export const dateFilterOptions = [
    { value: "all", label: "All Time" },
    { value: "today", label: "Today" },
    { value: "week", label: "This Week" },
    { value: "month", label: "This Month" },
    { value: "quarter", label: "This Quarter" },
    { value: "year", label: "This Year" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

export const getInitials = (name: string) => {
    if (!name) return "??";
    return name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);
};

export const formatCurrency = (amount?: number, currency = "CAD") => {
    if (amount === undefined || amount === null) return "$0";
    return new Intl.NumberFormat("en-CA", {
        style: "currency", currency, minimumFractionDigits: 0, maximumFractionDigits: 2,
    }).format(amount);
};

export const formatDate = (dateString: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    return date.toLocaleDateString("en-CA", { day: "2-digit", month: "short", year: "numeric" });
};

export const getRelativeTime = (dateString?: string) => {
    if (!dateString) return "-";
    const date = new Date(dateString);
    const now = new Date();
    const diffInDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
    if (diffInDays === 0) return "Today";
    if (diffInDays === 1) return "Yesterday";
    if (diffInDays < 7) return `${diffInDays} days ago`;
    if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks ago`;
    return formatDate(dateString);
};

export const getDaysUntilExpiry = (validUntil?: string) => {
    if (!validUntil) return null;
    const expiry = new Date(validUntil);
    const now = new Date();
    return Math.floor((expiry.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
};

export const isExpired = (validUntil?: string, status?: string) => {
    if (!validUntil || status === "accepted" || status === "converted" || status === "declined") return false;
    return new Date(validUntil) < new Date();
};

export const getStatusConfig = (status: string) => {
    const configs: Record<string, { bg: string; text: string; dot: string; icon: LucideIcon }> = {
        draft: { bg: "bg-white/5", text: "text-[#475569]", dot: "bg-slate-400", icon: FileText },
        sent: { bg: "bg-blue-100", text: "text-[#0891B2]", dot: "bg-[#0891B2]", icon: Send },
        viewed: { bg: "bg-purple-100", text: "text-purple-600", dot: "bg-purple-500", icon: Eye },
        accepted: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500", icon: CheckCircle2 },
        declined: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500", icon: XCircle },
        expired: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500", icon: AlertTriangle },
        converted: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", dot: "bg-[#0891B2]", icon: CheckCircle2 },
    };
    return configs[status?.toLowerCase()] || configs.draft;
};

// ============================================
// MOCK DATA
// ============================================

const now = new Date();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();
const daysFromNow = (d: number) => new Date(now.getTime() + d * 86400000).toISOString();

export const mockQuotes: Quote[] = [
    {
        id: "q1", quoteNumber: "QT-2026-001", clientName: "Maple Leaf Digital", clientEmail: "info@mapleleaf.ca",
        clientCompany: "Maple Leaf Digital Inc.", title: "Website Redesign & SEO Package", projectName: "Web Revamp 2026",
        items: [
            { id: "i1", description: "UI/UX Design", quantity: 1, rate: 5000, amount: 5000 },
            { id: "i2", description: "Frontend Development", quantity: 80, rate: 125, amount: 10000 },
            { id: "i3", description: "SEO Optimization", quantity: 1, rate: 3000, amount: 3000 },
        ],
        subtotal: 18000, tax: 2340, discount: 500, total: 19840, status: "sent", priority: "high",
        validUntil: daysFromNow(14), createdAt: daysAgo(3), sentAt: daysAgo(2), currency: "CAD",
        createdBy: "Admin User", tags: ["web", "seo"], notes: "Priority client, expedite review.",
        terms: "50% upfront, 50% on delivery. Net 30 terms.",
    },
    {
        id: "q2", quoteNumber: "QT-2026-002", clientName: "Northern Lights Studios", clientEmail: "hello@nlstudios.ca",
        clientCompany: "NL Studios", title: "Mobile App Development", projectName: "iOS App v2",
        items: [
            { id: "i4", description: "App Architecture & Design", quantity: 1, rate: 8000, amount: 8000 },
            { id: "i5", description: "iOS Development", quantity: 120, rate: 150, amount: 18000 },
            { id: "i6", description: "QA & Testing", quantity: 40, rate: 100, amount: 4000 },
        ],
        subtotal: 30000, tax: 3900, discount: 0, total: 33900, status: "accepted", priority: "high",
        validUntil: daysFromNow(7), createdAt: daysAgo(10), sentAt: daysAgo(9), acceptedAt: daysAgo(5),
        currency: "CAD", createdBy: "Admin User", tags: ["mobile", "ios"],
    },
    {
        id: "q3", quoteNumber: "QT-2026-003", clientName: "Pacific Coast Ventures", clientEmail: "deals@pcv.ca",
        clientCompany: "PCV Holdings", title: "CRM Integration & Automation", projectName: "CRM Setup",
        items: [
            { id: "i7", description: "CRM Configuration", quantity: 1, rate: 4000, amount: 4000 },
            { id: "i8", description: "API Integration", quantity: 60, rate: 130, amount: 7800 },
            { id: "i9", description: "Training & Support", quantity: 10, rate: 200, amount: 2000 },
        ],
        subtotal: 13800, tax: 1794, discount: 300, total: 15294, status: "draft", priority: "medium",
        validUntil: daysFromNow(21), createdAt: daysAgo(1), currency: "CAD", createdBy: "Admin User",
        tags: ["crm", "automation"],
    },
    {
        id: "q4", quoteNumber: "QT-2026-004", clientName: "Rocky Mountain Tech", clientEmail: "ops@rmtech.ca",
        clientCompany: "RM Technology", title: "Cloud Migration Services",
        items: [
            { id: "i10", description: "Cloud Assessment", quantity: 1, rate: 3000, amount: 3000 },
            { id: "i11", description: "Migration Execution", quantity: 1, rate: 12000, amount: 12000 },
        ],
        subtotal: 15000, tax: 1950, discount: 0, total: 16950, status: "viewed", priority: "medium",
        validUntil: daysFromNow(10), createdAt: daysAgo(5), sentAt: daysAgo(4), currency: "CAD",
        createdBy: "Admin User", tags: ["cloud"],
    },
    {
        id: "q5", quoteNumber: "QT-2026-005", clientName: "Great Lakes Logistics", clientEmail: "info@gll.ca",
        clientCompany: "GL Logistics", title: "Warehouse Management System",
        items: [
            { id: "i12", description: "System Design", quantity: 1, rate: 6000, amount: 6000 },
            { id: "i13", description: "Development", quantity: 200, rate: 120, amount: 24000 },
        ],
        subtotal: 30000, tax: 3900, discount: 1000, total: 32900, status: "expired", priority: "low",
        validUntil: daysAgo(3), createdAt: daysAgo(35), sentAt: daysAgo(34), currency: "CAD",
        createdBy: "Admin User",
    },
    {
        id: "q6", quoteNumber: "QT-2026-006", clientName: "Prairie Innovations", clientEmail: "team@prairie.ca",
        clientCompany: "Prairie Innovations Ltd.", title: "E-Commerce Platform Build",
        items: [
            { id: "i14", description: "Platform Setup", quantity: 1, rate: 5000, amount: 5000 },
            { id: "i15", description: "Custom Theme Development", quantity: 1, rate: 7000, amount: 7000 },
            { id: "i16", description: "Payment Integration", quantity: 1, rate: 3000, amount: 3000 },
        ],
        subtotal: 15000, tax: 1950, discount: 0, total: 16950, status: "declined", priority: "medium",
        validUntil: daysAgo(1), createdAt: daysAgo(20), sentAt: daysAgo(18), currency: "CAD",
        createdBy: "Admin User", tags: ["ecommerce"],
    },
    {
        id: "q7", quoteNumber: "QT-2026-007", clientName: "Maritime Solutions", clientEmail: "hello@maritime.ca",
        clientCompany: "Maritime Solutions Inc.", title: "Data Analytics Dashboard",
        items: [
            { id: "i17", description: "Dashboard Design", quantity: 1, rate: 4500, amount: 4500 },
            { id: "i18", description: "Backend API Development", quantity: 80, rate: 140, amount: 11200 },
        ],
        subtotal: 15700, tax: 2041, discount: 200, total: 17541, status: "converted", priority: "high",
        validUntil: daysFromNow(5), createdAt: daysAgo(15), sentAt: daysAgo(14), acceptedAt: daysAgo(8),
        currency: "CAD", createdBy: "Admin User", tags: ["analytics"], linkedInvoiceId: "inv-123",
    },
    {
        id: "q8", quoteNumber: "QT-2026-008", clientName: "Tundra Consulting", clientEmail: "biz@tundra.ca",
        clientCompany: "Tundra Consulting Group", title: "Security Audit & Compliance",
        items: [
            { id: "i19", description: "Security Assessment", quantity: 1, rate: 8000, amount: 8000 },
            { id: "i20", description: "Compliance Documentation", quantity: 1, rate: 4000, amount: 4000 },
        ],
        subtotal: 12000, tax: 1560, discount: 0, total: 13560, status: "sent", priority: "high",
        validUntil: daysFromNow(20), createdAt: daysAgo(2), sentAt: daysAgo(1), currency: "CAD",
        createdBy: "Admin User", tags: ["security"],
    },
];

// ============================================
// AI INSIGHTS
// ============================================

export interface AiInsight {
    id: string;
    type: "warning" | "success" | "info" | "danger";
    title: string;
    message: string;
}

export const getAiInsights = (quotes: Quote[]): AiInsight[] => {
    const insights: AiInsight[] = [];
    const expiringSoon = quotes.filter(q => {
        const days = getDaysUntilExpiry(q.validUntil);
        return days !== null && days >= 0 && days <= 7 && !["accepted", "declined", "converted", "expired"].includes(q.status);
    });
    if (expiringSoon.length > 0) {
        insights.push({ id: "expiring", type: "warning", title: "Expiring Soon", message: `${expiringSoon.length} quote${expiringSoon.length > 1 ? 's' : ''} expiring within 7 days` });
    }
    const highValueDrafts = quotes.filter(q => q.status === "draft" && q.total > 15000);
    if (highValueDrafts.length > 0) {
        insights.push({ id: "highvalue", type: "info", title: "High-Value Drafts", message: `${highValueDrafts.length} draft${highValueDrafts.length > 1 ? 's' : ''} worth ${formatCurrency(highValueDrafts.reduce((s, q) => s + q.total, 0))} pending send` });
    }
    const acceptedNotConverted = quotes.filter(q => q.status === "accepted" && !q.linkedInvoiceId);
    if (acceptedNotConverted.length > 0) {
        insights.push({ id: "convert", type: "success", title: "Ready to Convert", message: `${acceptedNotConverted.length} accepted quote${acceptedNotConverted.length > 1 ? 's' : ''} ready to convert to invoice` });
    }
    const declinedRecent = quotes.filter(q => q.status === "declined" && getDaysUntilExpiry(q.createdAt) !== null);
    if (declinedRecent.length > 0) {
        insights.push({ id: "declined", type: "danger", title: "Recent Declines", message: `${declinedRecent.length} declined — consider follow-up or revised offer` });
    }
    return insights;
};
