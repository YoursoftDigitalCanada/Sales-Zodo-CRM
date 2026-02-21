// src/pages/HelpCenter.tsx

import { useState, useMemo, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { cn } from "@/lib/utils";
import { useToast } from "@/hooks/use-toast";
import {
    Search,
    BookOpen,
    Users,
    Sparkles,
    Plug,
    CreditCard,
    Shield,
    ChevronDown,
    ChevronRight,
    Play,
    MessageSquare,
    Mail,
    Phone,
    CheckCircle2,
    Clock,
    AlertTriangle,
    XCircle,
    Keyboard,
    Megaphone,
    ThumbsUp,
    ThumbsDown,
    Send,
    ExternalLink,
    HelpCircle,
    Zap,
    BarChart3,
    FileText,
    UserCog,
    Receipt,
    Target,
    Calendar,
    FolderKanban,
    Settings,
    ArrowUpRight,
    X,
    Star,
    Gift,
    Bug,
    Lightbulb,
    type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface QuickStartCard {
    id: string;
    title: string;
    description: string;
    icon: LucideIcon;
    color: string;
    bgColor: string;
    articles: number;
}

interface KBArticle {
    id: string;
    title: string;
    content: string;
    category: string;
}

interface FAQItem {
    id: string;
    question: string;
    answer: string;
}

interface VideoTutorial {
    id: string;
    title: string;
    duration: string;
    description: string;
    icon: LucideIcon;
    category: string;
}

interface SystemService {
    name: string;
    status: "operational" | "degraded" | "outage";
    uptime: string;
}

interface ShortcutItem {
    keys: string[];
    action: string;
}

interface ChangelogEntry {
    version: string;
    date: string;
    title: string;
    type: "feature" | "improvement" | "fix";
    description: string;
}

// ============================================
// DATA
// ============================================

const quickStartCards: QuickStartCard[] = [
    { id: "getting-started", title: "Getting Started", description: "Quick setup guide for new users", icon: Zap, color: "text-[#0891B2]", bgColor: "bg-[#0891B2]/8", articles: 12 },
    { id: "crm-basics", title: "CRM Basics", description: "Leads, contacts, and pipeline management", icon: Target, color: "text-[#16A34A]", bgColor: "bg-[#16A34A]/8", articles: 18 },
    { id: "ai-features", title: "AI Features", description: "Ask Experts, AI insights, and smart automation", icon: Sparkles, color: "text-[#7C3AED]", bgColor: "bg-[#7C3AED]/8", articles: 8 },
    { id: "integrations", title: "Integrations", description: "Connect with third-party tools and APIs", icon: Plug, color: "text-[#EA580C]", bgColor: "bg-[#EA580C]/8", articles: 15 },
    { id: "billing", title: "Billing & Plans", description: "Subscription management and invoicing", icon: CreditCard, color: "text-[#D97706]", bgColor: "bg-[#D97706]/8", articles: 9 },
    { id: "security", title: "Security & Privacy", description: "Data protection, 2FA, and compliance", icon: Shield, color: "text-[#DC2626]", bgColor: "bg-[#DC2626]/8", articles: 11 },
];

const kbCategories = ["General", "CRM", "AI", "Invoicing", "Integrations", "Security"] as const;

const kbArticles: KBArticle[] = [
    // General
    { id: "kb1", title: "How to set up your workspace", content: "Navigate to Settings → General to configure your organization name, timezone, default currency, and branding. Upload your company logo and set your preferred date format. All users in your tenant will inherit these defaults.", category: "General" },
    { id: "kb2", title: "Managing user roles and permissions", content: "Go to Settings → Roles & Permissions to create custom roles. Assign granular permissions for each module (Leads, Contacts, Invoices, etc.). Use the RBAC matrix to control view, create, edit, and delete access levels per role.", category: "General" },
    { id: "kb3", title: "Customizing the dashboard", content: "Your dashboard intelligently adapts based on your role and activity patterns. Pin frequently used widgets, rearrange stat cards, and configure the AI Daily Summary to show metrics that matter most to your workflow.", category: "General" },
    { id: "kb4", title: "Importing and exporting data", content: "Use the Import/Export buttons on any list page. Supported formats include CSV, XLSX, and JSON. Map imported columns to CRM fields, preview before confirming, and handle duplicates via merge rules.", category: "General" },
    // CRM
    { id: "kb5", title: "Creating and managing leads", content: "Add leads manually or via import. Track lead source, assign to team members, set priority, and move through pipeline stages. Use AI Lead Scoring to automatically rank leads by conversion probability.", category: "CRM" },
    { id: "kb6", title: "Pipeline management and stages", content: "Configure custom pipeline stages under Settings → Pipeline. Drag-and-drop leads across stages in the Kanban view. Set automated actions when leads move between stages, such as sending emails or assigning tasks.", category: "CRM" },
    { id: "kb7", title: "Client 360° view explained", content: "The Client 360° view consolidates all interactions, invoices, projects, notes, attachments, and timeline history for a single client. Access it by clicking any client name in the Client List.", category: "CRM" },
    { id: "kb8", title: "Managing contacts and companies", content: "Contacts are individuals; Companies are organizations. Link contacts to companies, track interaction history, and set up contact groups for segmented communication campaigns.", category: "CRM" },
    // AI
    { id: "kb9", title: "Using the Ask Experts AI assistant", content: "Click the Sparkles icon in the header or use the floating AI button. Ask contextual questions about candidates, jobs, pipelines, or any CRM data. Responses include confidence scores and suggested actions.", category: "AI" },
    { id: "kb10", title: "AI-powered lead scoring", content: "Our ML model analyzes lead behavior, engagement patterns, and historical conversion data to assign a score from 0-100. View scores on the Leads page and sort by highest probability of conversion.", category: "AI" },
    { id: "kb11", title: "Smart AI suggestions and insights", content: "The AI engine continuously monitors your pipeline and surfaces actionable insights: stalled leads, revenue forecasts, follow-up reminders, and optimal contact timing recommendations.", category: "AI" },
    // Invoicing
    { id: "kb12", title: "Creating professional invoices", content: "Navigate to Finance → Invoices → Create Invoice. Fill in client details, add line items with quantities and rates, apply taxes and discounts, then send directly via email or download as PDF.", category: "Invoicing" },
    { id: "kb13", title: "Setting up recurring invoices", content: "Enable recurring billing on any invoice. Set the frequency (weekly, monthly, quarterly, annually), start date, and optional end date. The system auto-generates and sends invoices on schedule.", category: "Invoicing" },
    { id: "kb14", title: "Tracking expenses and payments", content: "Log expenses under Finance → Expenses. Categorize by type, attach receipts, and link to projects or clients. Track payment statuses across all invoices from the Payments dashboard.", category: "Invoicing" },
    // Integrations
    { id: "kb15", title: "Connecting email services", content: "Integrate your Gmail, Outlook, or SMTP email under Settings → Email Settings. Once connected, send and receive emails directly from the CRM Letterbox. All correspondence is automatically logged in contact timelines.", category: "Integrations" },
    { id: "kb16", title: "API and webhook configuration", content: "Access the API documentation at /api/docs. Generate API keys under Settings → Security. Configure webhooks to receive real-time notifications when CRM events occur (lead created, invoice paid, etc.).", category: "Integrations" },
    { id: "kb17", title: "Calendar sync (Google, Outlook)", content: "Connect your Google Calendar or Outlook under Settings → Integrations. Bidirectional sync ensures all meetings and events appear in both your external calendar and the CRM Calendar module.", category: "Integrations" },
    // Security
    { id: "kb18", title: "Enabling two-factor authentication", content: "Go to Settings → Security → Two-Factor Authentication. Choose between authenticator app (TOTP) or SMS verification. All admin accounts are required to enable 2FA for compliance.", category: "Security" },
    { id: "kb19", title: "Data encryption and compliance", content: "All data is encrypted at rest (AES-256) and in transit (TLS 1.3). We are SOC 2 Type II compliant and GDPR-ready. Data residency options are available for enterprise plans.", category: "Security" },
    { id: "kb20", title: "Audit logs and activity tracking", content: "Every action in the CRM is logged with timestamp, user, IP address, and affected resource. Access audit logs under Settings → Security → Audit Logs. Export logs for compliance reporting.", category: "Security" },
];

const faqItems: FAQItem[] = [
    { id: "faq1", question: "How do I reset my password?", answer: "Click 'Forgot Password' on the login page and enter your registered email. You'll receive a reset link valid for 24 hours. If you're logged in, go to Settings → Security → Change Password." },
    { id: "faq2", question: "Can I customize the dashboard widgets?", answer: "Yes! The dashboard uses an intelligent layout that adapts to your role. You can pin/unpin widgets, rearrange cards, and configure which AI insights to display from the dashboard settings gear icon." },
    { id: "faq3", question: "How do I import leads from a CSV file?", answer: "Navigate to Leads → All Leads, click the 'Import' button in the header. Upload your CSV file, map columns to CRM fields (name, email, phone, source, etc.), preview the data, and confirm the import." },
    { id: "faq4", question: "What AI features are included in my plan?", answer: "All plans include AI Lead Scoring, AI Daily Summaries, and the Ask Experts assistant. Pro plans unlock Advanced Analytics, Custom AI Reports, and AI-powered email suggestions. Enterprise adds custom model training." },
    { id: "faq5", question: "How does the pipeline automation work?", answer: "Set up automation rules under Settings → Pipeline → Automation. Trigger actions when leads move between stages: auto-send emails, assign tasks, update fields, create calendar events, or notify team members via Slack/Teams." },
    { id: "faq6", question: "Can I integrate with my existing email provider?", answer: "Yes, we support Gmail, Outlook 365, and any SMTP/IMAP provider. Go to Settings → Email Settings to connect. All sent and received emails are automatically logged in the relevant contact's timeline." },
    { id: "faq7", question: "How do I generate reports?", answer: "Navigate to Analytics → Reports. Choose from pre-built templates (Sales, Revenue, Expense) or create custom reports. Export as PDF, CSV, or Excel. Schedule recurring reports to be emailed to stakeholders." },
    { id: "faq8", question: "Is my data backed up automatically?", answer: "Yes, we perform automated backups every 6 hours with 30-day retention. Enterprise plans include continuous replication with point-in-time recovery. You can also request a manual data export at any time." },
    { id: "faq9", question: "How do I add team members?", answer: "Go to Team → Users → Add User. Enter their email, assign a role, and select department. They'll receive an invitation email to set up their account. You can also bulk-invite via CSV upload." },
    { id: "faq10", question: "What payment gateways do you support?", answer: "We integrate with Stripe, PayPal, and Square for online payments. Configure your preferred gateway under Settings → Billing → Payment Gateway. Clients can pay invoices directly through a secure payment link." },
    { id: "faq11", question: "How do I track time on projects?", answer: "Use the Time Tracking module (Projects → Time Tracking). Start/stop the live timer, or add manual entries. Link time to specific projects and tasks, set billable rates, and generate timesheet reports for invoicing." },
    { id: "faq12", question: "Can I white-label the CRM for my clients?", answer: "Enterprise plans include white-labeling: custom domain, company logo, brand colors, and custom email templates. Contact our sales team for white-label setup assistance." },
];

const videoTutorials: VideoTutorial[] = [
    { id: "vid1", title: "Getting Started with ZODO CRM", duration: "8:30", description: "Complete onboarding walkthrough", icon: Zap, category: "Basics" },
    { id: "vid2", title: "Mastering Pipeline Management", duration: "12:15", description: "Drag-and-drop pipeline and automation", icon: Target, category: "CRM" },
    { id: "vid3", title: "Using the AI Assistant", duration: "6:45", description: "Ask Experts and AI-powered insights", icon: Sparkles, category: "AI" },
    { id: "vid4", title: "Professional Invoicing", duration: "10:20", description: "Create, send, and track invoices", icon: Receipt, category: "Finance" },
    { id: "vid5", title: "Employee Management", duration: "9:10", description: "Departments, attendance, and leave", icon: UserCog, category: "Team" },
    { id: "vid6", title: "Reports & Analytics", duration: "11:40", description: "Build custom dashboards and reports", icon: BarChart3, category: "Analytics" },
];

const systemServices: SystemService[] = [
    { name: "Core Platform", status: "operational", uptime: "99.99%" },
    { name: "API Services", status: "operational", uptime: "99.98%" },
    { name: "AI Engine", status: "operational", uptime: "99.95%" },
    { name: "Email Service", status: "operational", uptime: "99.97%" },
    { name: "File Storage", status: "operational", uptime: "99.99%" },
    { name: "Background Jobs", status: "operational", uptime: "99.96%" },
];

const keyboardShortcuts: ShortcutItem[] = [
    { keys: ["⌘", "K"], action: "Global search" },
    { keys: ["⌘", "N"], action: "Create new item" },
    { keys: ["⌘", "⇧", "P"], action: "Open command palette" },
    { keys: ["⌘", "B"], action: "Toggle sidebar" },
    { keys: ["⌘", "/"], action: "Open help" },
    { keys: ["⌘", "⇧", "A"], action: "Open AI assistant" },
    { keys: ["Esc"], action: "Close modal / cancel" },
    { keys: ["⌘", "S"], action: "Save current form" },
    { keys: ["⌘", "⇧", "E"], action: "Export data" },
    { keys: ["⌘", "⇧", "I"], action: "Import data" },
];

const changelogEntries: ChangelogEntry[] = [
    { version: "3.8.0", date: "Feb 18, 2026", title: "AI-Powered Recruiter Assistant", type: "feature", description: "Introducing Ask Experts — an enterprise-grade, RBAC-aware AI assistant for contextual CRM intelligence." },
    { version: "3.7.2", date: "Feb 12, 2026", title: "Calendar Attendees Fix", type: "fix", description: "Fixed the attendees picker to correctly fetch team members from the employees API." },
    { version: "3.7.0", date: "Feb 10, 2026", title: "Candidate 360° View", type: "feature", description: "Full candidate profile with timeline, notes, applications, and resume management in a unified view." },
    { version: "3.6.0", date: "Feb 5, 2026", title: "Resume Import & Parsing", type: "improvement", description: "Upload resumes and auto-parse candidate data using AI for instant profile creation." },
    { version: "3.5.0", date: "Jan 30, 2026", title: "Website Integration", type: "feature", description: "Public API endpoints for external website integration — job listings, department pages, and application submissions." },
];

// ============================================
// HELPER COMPONENTS
// ============================================

const StatusDot = ({ status }: { status: SystemService["status"] }) => {
    const colors = {
        operational: "bg-[#16A34A]",
        degraded: "bg-[#D97706]",
        outage: "bg-[#DC2626]",
    };
    return (
        <span className="relative flex h-2.5 w-2.5">
            <span className={cn("absolute inline-flex h-full w-full rounded-full opacity-75 animate-ping", colors[status])} />
            <span className={cn("relative inline-flex h-2.5 w-2.5 rounded-full", colors[status])} />
        </span>
    );
};

const StatusIcon = ({ status }: { status: SystemService["status"] }) => {
    if (status === "operational") return <CheckCircle2 size={16} className="text-[#16A34A]" />;
    if (status === "degraded") return <AlertTriangle size={16} className="text-[#D97706]" />;
    return <XCircle size={16} className="text-[#DC2626]" />;
};

const ChangelogBadge = ({ type }: { type: ChangelogEntry["type"] }) => {
    const config = {
        feature: { label: "New Feature", bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", icon: Gift },
        improvement: { label: "Improvement", bg: "bg-[#16A34A]/10", text: "text-[#16A34A]", icon: Lightbulb },
        fix: { label: "Bug Fix", bg: "bg-[#EA580C]/10", text: "text-[#EA580C]", icon: Bug },
    };
    const c = config[type];
    return (
        <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold uppercase tracking-wider", c.bg, c.text)}>
            <c.icon size={10} />
            {c.label}
        </span>
    );
};

// ============================================
// MAIN COMPONENT
// ============================================

export default function HelpCenterPage() {
    const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
    const [searchQuery, setSearchQuery] = useState("");
    const [activeKBCategory, setActiveKBCategory] = useState<typeof kbCategories[number]>("General");
    const [expandedFAQ, setExpandedFAQ] = useState<string | null>(null);
    const [expandedKB, setExpandedKB] = useState<string | null>(null);
    const [showVideoModal, setShowVideoModal] = useState<string | null>(null);
    const [feedbackRating, setFeedbackRating] = useState<"up" | "down" | null>(null);
    const [feedbackText, setFeedbackText] = useState("");
    const [feedbackSubmitted, setFeedbackSubmitted] = useState(false);
    const { toast } = useToast();

    // Refs for scrolling
    const kbRef = useRef<HTMLDivElement>(null);
    const faqRef = useRef<HTMLDivElement>(null);
    const videosRef = useRef<HTMLDivElement>(null);
    const contactRef = useRef<HTMLDivElement>(null);
    const statusRef = useRef<HTMLDivElement>(null);
    const shortcutsRef = useRef<HTMLDivElement>(null);
    const changelogRef = useRef<HTMLDivElement>(null);

    // ============================================
    // SEARCH FILTERING
    // ============================================

    const searchResults = useMemo(() => {
        if (!searchQuery.trim()) return null;
        const q = searchQuery.toLowerCase();

        const matchedKB = kbArticles.filter(
            (a) => a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q) || a.category.toLowerCase().includes(q)
        );
        const matchedFAQ = faqItems.filter(
            (f) => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q)
        );
        const matchedVideos = videoTutorials.filter(
            (v) => v.title.toLowerCase().includes(q) || v.description.toLowerCase().includes(q) || v.category.toLowerCase().includes(q)
        );

        return { kb: matchedKB, faq: matchedFAQ, videos: matchedVideos, total: matchedKB.length + matchedFAQ.length + matchedVideos.length };
    }, [searchQuery]);

    // ============================================
    // HANDLERS
    // ============================================

    const scrollToSection = (
        ref: React.RefObject<HTMLDivElement | null>,
        kbCategory?: typeof kbCategories[number]
    ) => {
        if (kbCategory) setActiveKBCategory(kbCategory);
        ref.current?.scrollIntoView({ behavior: "smooth", block: "start" });
    };

    const handleContactAction = (method: string) => {
        if (method === "chat") {
            toast({ title: "Live Chat", description: "Connecting you to a support agent... Our average response time is under 2 minutes." });
        } else if (method === "email") {
            toast({ title: "Email Sent", description: "A support ticket has been created. You'll receive a confirmation at your registered email." });
        } else if (method === "phone") {
            toast({ title: "Phone Support", description: "Call us at +1 (888) 555-ZODO. Business hours: Mon–Fri, 9 AM – 6 PM EST." });
        }
    };

    const handleFeedbackSubmit = () => {
        if (!feedbackRating) {
            toast({ title: "Please rate first", description: "Click thumbs up or thumbs down before submitting." });
            return;
        }
        setFeedbackSubmitted(true);
        toast({ title: "Thank you!", description: "Your feedback has been submitted. We appreciate your input!" });
    };

    const handleVideoPlay = (videoId: string) => {
        setShowVideoModal(videoId);
    };

    const quickStartSectionMap: Record<string, { ref: React.RefObject<HTMLDivElement | null>; category?: typeof kbCategories[number] }> = {
        "getting-started": { ref: kbRef, category: "General" },
        "crm-basics": { ref: kbRef, category: "CRM" },
        "ai-features": { ref: kbRef, category: "AI" },
        "integrations": { ref: kbRef, category: "Integrations" },
        "billing": { ref: kbRef, category: "Invoicing" },
        "security": { ref: kbRef, category: "Security" },
    };

    // Filtered KB articles
    const filteredKBArticles = kbArticles.filter((a) => a.category === activeKBCategory);

    return (
        <div className="flex h-screen bg-[#F8FAFC]">
            <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

            <div className="flex-1 flex flex-col min-h-screen overflow-hidden">
                {/* Header */}
                <header className="bg-white border-b border-[rgba(15,23,42,0.06)] px-6 py-4 flex-shrink-0">
                    <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-lg bg-[#0891B2]/10 flex items-center justify-center">
                                <HelpCircle size={20} className="text-[#0891B2]" />
                            </div>
                            <div>
                                <h1 className="text-2xl font-bold text-[#0F172A]">Help Center</h1>
                                <p className="text-sm text-[#475569] mt-0.5">Everything you need to master ZODO CRM</p>
                            </div>
                        </div>
                        <div className="flex items-center gap-2">
                            <button
                                onClick={() => scrollToSection(contactRef)}
                                className="flex items-center gap-2 px-4 py-2 bg-[#0891B2] text-white rounded-lg font-medium text-sm hover:bg-[#0891B2]/90 transition-all"
                            >
                                <MessageSquare size={16} />
                                Contact Support
                            </button>
                        </div>
                    </div>
                </header>

                {/* Main Content */}
                <main className="flex-1 p-6 overflow-auto">
                    <div className="max-w-6xl mx-auto space-y-8 page-enter">
                        {/* ============================================ */}
                        {/* HERO SEARCH */}
                        {/* ============================================ */}
                        <motion.div
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            className="relative bg-gradient-to-br from-[#0891B2] via-[#0891B2] to-[#0E7490] rounded-xl p-8 overflow-hidden"
                        >
                            {/* Background decoration */}
                            <div className="absolute inset-0 opacity-10">
                                <div className="absolute top-0 right-0 w-64 h-64 rounded-full bg-white/20 -translate-y-1/2 translate-x-1/2" />
                                <div className="absolute bottom-0 left-0 w-48 h-48 rounded-full bg-white/10 translate-y-1/2 -translate-x-1/2" />
                            </div>

                            <div className="relative">
                                <h2 className="text-2xl font-bold text-white mb-2">How can we help you?</h2>
                                <p className="text-white/70 text-sm mb-6">Search our knowledge base, FAQs, and tutorials</p>

                                <div className="relative max-w-2xl">
                                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-5 w-5 text-[#475569]" />
                                    <input
                                        type="text"
                                        placeholder="Search for articles, FAQs, tutorials..."
                                        value={searchQuery}
                                        onChange={(e) => setSearchQuery(e.target.value)}
                                        className="w-full h-12 pl-12 pr-4 rounded-lg bg-white text-[#0F172A] text-sm placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-white/30 shadow-lg"
                                    />
                                    {searchQuery && (
                                        <button
                                            onClick={() => setSearchQuery("")}
                                            className="absolute right-4 top-1/2 -translate-y-1/2 text-[#94A3B8] hover:text-[#475569]"
                                        >
                                            <X size={16} />
                                        </button>
                                    )}
                                </div>

                                {/* Live Search Results */}
                                <AnimatePresence>
                                    {searchResults && (
                                        <motion.div
                                            initial={{ opacity: 0, y: -10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            className="absolute left-0 right-0 mt-2 max-w-2xl bg-white rounded-lg shadow-xl border border-[rgba(15,23,42,0.06)] max-h-80 overflow-auto z-20"
                                        >
                                            {searchResults.total === 0 ? (
                                                <div className="p-6 text-center">
                                                    <HelpCircle size={32} className="text-[#94A3B8] mx-auto mb-2" />
                                                    <p className="text-sm text-[#475569]">No results found for "{searchQuery}"</p>
                                                    <p className="text-xs text-[#94A3B8] mt-1">Try different keywords or browse categories below</p>
                                                </div>
                                            ) : (
                                                <div className="p-2">
                                                    <p className="px-3 py-2 text-[10px] font-semibold text-[#94A3B8] uppercase tracking-wider">
                                                        {searchResults.total} result{searchResults.total !== 1 ? "s" : ""} found
                                                    </p>

                                                    {searchResults.kb.length > 0 && (
                                                        <>
                                                            <p className="px-3 py-1.5 text-[10px] font-semibold text-[#0891B2] uppercase tracking-wider">Knowledge Base</p>
                                                            {searchResults.kb.slice(0, 3).map((article) => (
                                                                <button
                                                                    key={article.id}
                                                                    onClick={() => {
                                                                        setSearchQuery("");
                                                                        setActiveKBCategory(article.category as typeof kbCategories[number]);
                                                                        setExpandedKB(article.id);
                                                                        scrollToSection(kbRef);
                                                                    }}
                                                                    className="w-full px-3 py-2.5 text-left hover:bg-[#F8FAFC] rounded-md transition-colors"
                                                                >
                                                                    <p className="text-sm font-medium text-[#0F172A]">{article.title}</p>
                                                                    <p className="text-xs text-[#94A3B8] truncate">{article.content.slice(0, 80)}...</p>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {searchResults.faq.length > 0 && (
                                                        <>
                                                            <p className="px-3 py-1.5 text-[10px] font-semibold text-[#0891B2] uppercase tracking-wider mt-1">FAQ</p>
                                                            {searchResults.faq.slice(0, 3).map((faq) => (
                                                                <button
                                                                    key={faq.id}
                                                                    onClick={() => {
                                                                        setSearchQuery("");
                                                                        setExpandedFAQ(faq.id);
                                                                        scrollToSection(faqRef);
                                                                    }}
                                                                    className="w-full px-3 py-2.5 text-left hover:bg-[#F8FAFC] rounded-md transition-colors"
                                                                >
                                                                    <p className="text-sm font-medium text-[#0F172A]">{faq.question}</p>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}

                                                    {searchResults.videos.length > 0 && (
                                                        <>
                                                            <p className="px-3 py-1.5 text-[10px] font-semibold text-[#0891B2] uppercase tracking-wider mt-1">Video Tutorials</p>
                                                            {searchResults.videos.slice(0, 2).map((video) => (
                                                                <button
                                                                    key={video.id}
                                                                    onClick={() => {
                                                                        setSearchQuery("");
                                                                        handleVideoPlay(video.id);
                                                                    }}
                                                                    className="w-full px-3 py-2.5 text-left hover:bg-[#F8FAFC] rounded-md transition-colors flex items-center gap-3"
                                                                >
                                                                    <Play size={14} className="text-[#0891B2]" />
                                                                    <div>
                                                                        <p className="text-sm font-medium text-[#0F172A]">{video.title}</p>
                                                                        <p className="text-xs text-[#94A3B8]">{video.duration}</p>
                                                                    </div>
                                                                </button>
                                                            ))}
                                                        </>
                                                    )}
                                                </div>
                                            )}
                                        </motion.div>
                                    )}
                                </AnimatePresence>
                            </div>

                            {/* Quick links */}
                            <div className="relative flex flex-wrap gap-2 mt-5">
                                {["Getting Started", "Pipeline", "AI Assistant", "Invoicing", "Team Management"].map((tag) => (
                                    <button
                                        key={tag}
                                        onClick={() => setSearchQuery(tag)}
                                        className="px-3 py-1.5 rounded-full bg-white/15 text-white/90 text-xs font-medium hover:bg-white/25 transition-colors"
                                    >
                                        {tag}
                                    </button>
                                ))}
                            </div>
                        </motion.div>

                        {/* ============================================ */}
                        {/* QUICK START CARDS */}
                        {/* ============================================ */}
                        <div>
                            <div className="flex items-center gap-2 mb-4">
                                <BookOpen size={18} className="text-[#0891B2]" />
                                <h3 className="text-lg font-semibold text-[#0F172A]">Browse by Category</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {quickStartCards.map((card, index) => (
                                    <motion.button
                                        key={card.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        whileHover={{ scale: 1.01, y: -2 }}
                                        whileTap={{ scale: 0.99 }}
                                        onClick={() => {
                                            const mapping = quickStartSectionMap[card.id];
                                            if (mapping) scrollToSection(mapping.ref, mapping.category);
                                        }}
                                        className="flex items-start gap-4 p-5 bg-white rounded-lg card-shadow hover:shadow-md transition-all text-left group"
                                    >
                                        <div className={cn("w-11 h-11 rounded-lg flex items-center justify-center flex-shrink-0", card.bgColor)}>
                                            <card.icon size={20} className={card.color} />
                                        </div>
                                        <div className="flex-1 min-w-0">
                                            <div className="flex items-center gap-2">
                                                <h4 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{card.title}</h4>
                                                <ArrowUpRight size={14} className="text-[#94A3B8] group-hover:text-[#0891B2] transition-colors" />
                                            </div>
                                            <p className="text-xs text-[#475569] mt-1">{card.description}</p>
                                            <p className="text-[10px] text-[#94A3B8] mt-2 font-medium">{card.articles} articles</p>
                                        </div>
                                    </motion.button>
                                ))}
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* KNOWLEDGE BASE */}
                        {/* ============================================ */}
                        <div ref={kbRef} className="scroll-mt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <FileText size={18} className="text-[#0891B2]" />
                                <h3 className="text-lg font-semibold text-[#0F172A]">Knowledge Base</h3>
                            </div>

                            <div className="bg-white rounded-lg card-shadow overflow-hidden">
                                {/* Category Tabs */}
                                <div className="flex items-center gap-1 px-4 pt-4 pb-0 overflow-x-auto scrollbar-thin">
                                    {kbCategories.map((cat) => (
                                        <button
                                            key={cat}
                                            onClick={() => { setActiveKBCategory(cat); setExpandedKB(null); }}
                                            className={cn(
                                                "px-4 py-2 text-sm font-medium rounded-t-lg transition-all whitespace-nowrap",
                                                activeKBCategory === cat
                                                    ? "bg-[#0891B2]/10 text-[#0891B2] border-b-2 border-[#0891B2]"
                                                    : "text-[#475569] hover:text-[#0F172A] hover:bg-[#F8FAFC]"
                                            )}
                                        >
                                            {cat}
                                        </button>
                                    ))}
                                </div>

                                {/* Articles */}
                                <div className="p-4 divide-y divide-[rgba(15,23,42,0.06)]">
                                    {filteredKBArticles.map((article) => (
                                        <div key={article.id} className="py-1">
                                            <button
                                                onClick={() => setExpandedKB(expandedKB === article.id ? null : article.id)}
                                                className="flex items-center justify-between w-full py-3 text-left group"
                                            >
                                                <div className="flex items-center gap-3">
                                                    <FileText size={16} className="text-[#94A3B8] group-hover:text-[#0891B2] transition-colors flex-shrink-0" />
                                                    <span className="font-medium text-sm text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{article.title}</span>
                                                </div>
                                                <motion.div
                                                    animate={{ rotate: expandedKB === article.id ? 180 : 0 }}
                                                    transition={{ duration: 0.2 }}
                                                >
                                                    <ChevronDown size={16} className="text-[#94A3B8]" />
                                                </motion.div>
                                            </button>

                                            <AnimatePresence>
                                                {expandedKB === article.id && (
                                                    <motion.div
                                                        initial={{ opacity: 0, height: 0 }}
                                                        animate={{ opacity: 1, height: "auto" }}
                                                        exit={{ opacity: 0, height: 0 }}
                                                        transition={{ duration: 0.2 }}
                                                        className="overflow-hidden"
                                                    >
                                                        <div className="pl-9 pb-4 pr-4">
                                                            <p className="text-sm text-[#475569] leading-relaxed">{article.content}</p>
                                                        </div>
                                                    </motion.div>
                                                )}
                                            </AnimatePresence>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* FAQ */}
                        {/* ============================================ */}
                        <div ref={faqRef} className="scroll-mt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <HelpCircle size={18} className="text-[#0891B2]" />
                                <h3 className="text-lg font-semibold text-[#0F172A]">Frequently Asked Questions</h3>
                            </div>

                            <div className="bg-white rounded-lg card-shadow divide-y divide-[rgba(15,23,42,0.06)] overflow-hidden">
                                {faqItems.map((faq) => (
                                    <div key={faq.id}>
                                        <button
                                            onClick={() => setExpandedFAQ(expandedFAQ === faq.id ? null : faq.id)}
                                            className="flex items-center justify-between w-full px-5 py-4 text-left group"
                                        >
                                            <span className="font-medium text-sm text-[#0F172A] group-hover:text-[#0891B2] transition-colors pr-4">
                                                {faq.question}
                                            </span>
                                            <motion.div
                                                animate={{ rotate: expandedFAQ === faq.id ? 180 : 0 }}
                                                transition={{ duration: 0.2 }}
                                                className="flex-shrink-0"
                                            >
                                                <ChevronDown size={16} className="text-[#94A3B8]" />
                                            </motion.div>
                                        </button>

                                        <AnimatePresence>
                                            {expandedFAQ === faq.id && (
                                                <motion.div
                                                    initial={{ opacity: 0, height: 0 }}
                                                    animate={{ opacity: 1, height: "auto" }}
                                                    exit={{ opacity: 0, height: 0 }}
                                                    transition={{ duration: 0.2 }}
                                                    className="overflow-hidden"
                                                >
                                                    <div className="px-5 pb-4">
                                                        <p className="text-sm text-[#475569] leading-relaxed">{faq.answer}</p>
                                                    </div>
                                                </motion.div>
                                            )}
                                        </AnimatePresence>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* VIDEO TUTORIALS */}
                        {/* ============================================ */}
                        <div ref={videosRef} className="scroll-mt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Play size={18} className="text-[#0891B2]" />
                                <h3 className="text-lg font-semibold text-[#0F172A]">Video Tutorials</h3>
                            </div>

                            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                                {videoTutorials.map((video, index) => (
                                    <motion.div
                                        key={video.id}
                                        initial={{ opacity: 0, y: 20 }}
                                        animate={{ opacity: 1, y: 0 }}
                                        transition={{ delay: 0.05 * index }}
                                        className="bg-white rounded-lg card-shadow overflow-hidden group"
                                    >
                                        {/* Video Thumbnail */}
                                        <div
                                            className="relative h-36 bg-gradient-to-br from-[#0F172A] to-[#1E293B] flex items-center justify-center cursor-pointer"
                                            onClick={() => handleVideoPlay(video.id)}
                                        >
                                            <div className="absolute inset-0 bg-[#0891B2]/5" />
                                            <video.icon size={32} className="text-[#0891B2]/40 absolute top-4 right-4" />
                                            <motion.div
                                                whileHover={{ scale: 1.1 }}
                                                className="w-14 h-14 rounded-full bg-[#0891B2]/90 flex items-center justify-center cursor-pointer shadow-lg"
                                            >
                                                <Play size={24} className="text-white ml-1" />
                                            </motion.div>
                                            <span className="absolute bottom-3 right-3 px-2 py-1 rounded-md bg-black/60 text-white text-xs font-mono">
                                                {video.duration}
                                            </span>
                                        </div>

                                        {/* Video Info */}
                                        <div className="p-4">
                                            <span className="text-[10px] font-semibold text-[#0891B2] uppercase tracking-wider">{video.category}</span>
                                            <h4 className="font-semibold text-sm text-[#0F172A] mt-1 group-hover:text-[#0891B2] transition-colors">{video.title}</h4>
                                            <p className="text-xs text-[#475569] mt-1">{video.description}</p>
                                        </div>
                                    </motion.div>
                                ))}
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* CONTACT SUPPORT */}
                        {/* ============================================ */}
                        <div ref={contactRef} className="scroll-mt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <MessageSquare size={18} className="text-[#0891B2]" />
                                <h3 className="text-lg font-semibold text-[#0F172A]">Contact Support</h3>
                            </div>

                            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                                {/* Live Chat */}
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-white rounded-lg card-shadow p-6 text-center"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-[#0891B2]/10 flex items-center justify-center mx-auto mb-4">
                                        <MessageSquare size={24} className="text-[#0891B2]" />
                                    </div>
                                    <h4 className="font-semibold text-[#0F172A] mb-1">Live Chat</h4>
                                    <p className="text-xs text-[#475569] mb-4">Average response time: ~2 min</p>
                                    <button
                                        onClick={() => handleContactAction("chat")}
                                        className="w-full px-4 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors"
                                    >
                                        Start Chat
                                    </button>
                                </motion.div>

                                {/* Email Support */}
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-white rounded-lg card-shadow p-6 text-center"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-4">
                                        <Mail size={24} className="text-[#16A34A]" />
                                    </div>
                                    <h4 className="font-semibold text-[#0F172A] mb-1">Email Support</h4>
                                    <p className="text-xs text-[#475569] mb-4">We reply within 4 business hours</p>
                                    <button
                                        onClick={() => handleContactAction("email")}
                                        className="w-full px-4 py-2.5 bg-white border border-[rgba(15,23,42,0.12)] text-[#0F172A] rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                                    >
                                        Send Email
                                    </button>
                                </motion.div>

                                {/* Phone Support */}
                                <motion.div
                                    whileHover={{ y: -2 }}
                                    className="bg-white rounded-lg card-shadow p-6 text-center"
                                >
                                    <div className="w-14 h-14 rounded-xl bg-[#7C3AED]/10 flex items-center justify-center mx-auto mb-4">
                                        <Phone size={24} className="text-[#7C3AED]" />
                                    </div>
                                    <h4 className="font-semibold text-[#0F172A] mb-1">Phone Support</h4>
                                    <p className="text-xs text-[#475569] mb-4">Mon–Fri, 9 AM – 6 PM EST</p>
                                    <button
                                        onClick={() => handleContactAction("phone")}
                                        className="w-full px-4 py-2.5 bg-white border border-[rgba(15,23,42,0.12)] text-[#0F172A] rounded-lg text-sm font-medium hover:bg-[#F8FAFC] transition-colors"
                                    >
                                        Call Us
                                    </button>
                                </motion.div>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* TWO-COLUMN: SYSTEM STATUS + SHORTCUTS */}
                        {/* ============================================ */}
                        <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                            {/* System Status */}
                            <div ref={statusRef} className="scroll-mt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <CheckCircle2 size={18} className="text-[#16A34A]" />
                                    <h3 className="text-lg font-semibold text-[#0F172A]">System Status</h3>
                                    <span className="ml-auto text-[10px] font-semibold text-[#16A34A] bg-[#16A34A]/10 px-2 py-0.5 rounded-full uppercase tracking-wider">
                                        All Systems Operational
                                    </span>
                                </div>

                                <div className="bg-white rounded-lg card-shadow divide-y divide-[rgba(15,23,42,0.06)]">
                                    {systemServices.map((service) => (
                                        <div key={service.name} className="flex items-center justify-between px-5 py-3.5">
                                            <div className="flex items-center gap-3">
                                                <StatusDot status={service.status} />
                                                <span className="text-sm font-medium text-[#0F172A]">{service.name}</span>
                                            </div>
                                            <div className="flex items-center gap-3">
                                                <span className="text-xs text-[#94A3B8] font-mono">{service.uptime}</span>
                                                <StatusIcon status={service.status} />
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>

                            {/* Keyboard Shortcuts */}
                            <div ref={shortcutsRef} className="scroll-mt-6">
                                <div className="flex items-center gap-2 mb-4">
                                    <Keyboard size={18} className="text-[#0891B2]" />
                                    <h3 className="text-lg font-semibold text-[#0F172A]">Keyboard Shortcuts</h3>
                                </div>

                                <div className="bg-white rounded-lg card-shadow divide-y divide-[rgba(15,23,42,0.06)]">
                                    {keyboardShortcuts.map((shortcut, index) => (
                                        <div key={index} className="flex items-center justify-between px-5 py-3">
                                            <span className="text-sm text-[#475569]">{shortcut.action}</span>
                                            <div className="flex items-center gap-1">
                                                {shortcut.keys.map((key, ki) => (
                                                    <kbd
                                                        key={ki}
                                                        className="px-2 py-1 rounded-md bg-[#F1F5F9] text-[11px] text-[#0F172A] border border-[rgba(15,23,42,0.08)] font-mono min-w-[28px] text-center shadow-sm"
                                                    >
                                                        {key}
                                                    </kbd>
                                                ))}
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* WHAT'S NEW / CHANGELOG */}
                        {/* ============================================ */}
                        <div ref={changelogRef} className="scroll-mt-6">
                            <div className="flex items-center gap-2 mb-4">
                                <Megaphone size={18} className="text-[#0891B2]" />
                                <h3 className="text-lg font-semibold text-[#0F172A]">What's New</h3>
                            </div>

                            <div className="bg-white rounded-lg card-shadow overflow-hidden">
                                <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                                    {changelogEntries.map((entry) => (
                                        <div key={entry.version} className="px-5 py-4">
                                            <div className="flex items-center gap-3 mb-2">
                                                <span className="text-xs font-mono text-[#94A3B8] bg-[#F1F5F9] px-2 py-0.5 rounded-md">v{entry.version}</span>
                                                <ChangelogBadge type={entry.type} />
                                                <span className="text-xs text-[#94A3B8] ml-auto">{entry.date}</span>
                                            </div>
                                            <h4 className="font-semibold text-sm text-[#0F172A] mb-1">{entry.title}</h4>
                                            <p className="text-sm text-[#475569] leading-relaxed">{entry.description}</p>
                                        </div>
                                    ))}
                                </div>
                            </div>
                        </div>

                        {/* ============================================ */}
                        {/* FEEDBACK WIDGET */}
                        {/* ============================================ */}
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            transition={{ delay: 0.3 }}
                            className="bg-white rounded-lg card-shadow p-6"
                        >
                            {feedbackSubmitted ? (
                                <div className="text-center py-4">
                                    <div className="w-14 h-14 rounded-full bg-[#16A34A]/10 flex items-center justify-center mx-auto mb-3">
                                        <CheckCircle2 size={28} className="text-[#16A34A]" />
                                    </div>
                                    <h4 className="font-semibold text-[#0F172A] mb-1">Thank you for your feedback!</h4>
                                    <p className="text-sm text-[#475569]">Your input helps us improve ZODO CRM for everyone.</p>
                                </div>
                            ) : (
                                <>
                                    <div className="flex items-center gap-2 mb-4">
                                        <Star size={18} className="text-[#D97706]" />
                                        <h3 className="text-lg font-semibold text-[#0F172A]">Was this helpful?</h3>
                                    </div>

                                    <div className="flex items-center gap-3 mb-4">
                                        <button
                                            onClick={() => setFeedbackRating("up")}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                                                feedbackRating === "up"
                                                    ? "border-[#16A34A] bg-[#16A34A]/10 text-[#16A34A]"
                                                    : "border-[rgba(15,23,42,0.12)] text-[#475569] hover:bg-[#F8FAFC]"
                                            )}
                                        >
                                            <ThumbsUp size={16} />
                                            Yes, helpful
                                        </button>
                                        <button
                                            onClick={() => setFeedbackRating("down")}
                                            className={cn(
                                                "flex items-center gap-2 px-4 py-2.5 rounded-lg border text-sm font-medium transition-all",
                                                feedbackRating === "down"
                                                    ? "border-[#EA580C] bg-[#EA580C]/10 text-[#EA580C]"
                                                    : "border-[rgba(15,23,42,0.12)] text-[#475569] hover:bg-[#F8FAFC]"
                                            )}
                                        >
                                            <ThumbsDown size={16} />
                                            Not really
                                        </button>
                                    </div>

                                    <textarea
                                        value={feedbackText}
                                        onChange={(e) => setFeedbackText(e.target.value)}
                                        placeholder="Tell us how we can improve (optional)..."
                                        rows={3}
                                        className="w-full px-4 py-3 rounded-lg border border-[rgba(15,23,42,0.12)] bg-[#F8FAFC] text-sm text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-2 focus:ring-[#0891B2]/20 focus:border-[#0891B2]/30 resize-none transition-all"
                                    />

                                    <div className="flex justify-end mt-3">
                                        <button
                                            onClick={handleFeedbackSubmit}
                                            className="flex items-center gap-2 px-5 py-2.5 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors"
                                        >
                                            <Send size={14} />
                                            Submit Feedback
                                        </button>
                                    </div>
                                </>
                            )}
                        </motion.div>

                        {/* Bottom spacer */}
                        <div className="h-4" />
                    </div>
                </main>
            </div>

            {/* ============================================ */}
            {/* VIDEO MODAL */}
            {/* ============================================ */}
            <AnimatePresence>
                {showVideoModal && (
                    <>
                        <motion.div
                            initial={{ opacity: 0 }}
                            animate={{ opacity: 1 }}
                            exit={{ opacity: 0 }}
                            className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50"
                            onClick={() => setShowVideoModal(null)}
                        />
                        <motion.div
                            initial={{ opacity: 0, scale: 0.9 }}
                            animate={{ opacity: 1, scale: 1 }}
                            exit={{ opacity: 0, scale: 0.9 }}
                            className="fixed top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-full max-w-2xl bg-white rounded-xl shadow-2xl z-50 overflow-hidden"
                        >
                            {(() => {
                                const video = videoTutorials.find((v) => v.id === showVideoModal);
                                if (!video) return null;
                                return (
                                    <>
                                        <div className="flex items-center justify-between px-5 py-4 border-b border-[rgba(15,23,42,0.06)]">
                                            <div>
                                                <h3 className="font-semibold text-[#0F172A]">{video.title}</h3>
                                                <p className="text-xs text-[#475569] mt-0.5">{video.description} · {video.duration}</p>
                                            </div>
                                            <button
                                                onClick={() => setShowVideoModal(null)}
                                                className="p-2 rounded-lg hover:bg-[#F8FAFC] text-[#475569] transition-colors"
                                            >
                                                <X size={18} />
                                            </button>
                                        </div>

                                        {/* Placeholder video area */}
                                        <div className="relative bg-gradient-to-br from-[#0F172A] to-[#1E293B] aspect-video flex flex-col items-center justify-center">
                                            <div className="absolute inset-0 bg-[#0891B2]/5" />
                                            <video.icon size={48} className="text-[#0891B2]/30 mb-4" />
                                            <div className="w-20 h-20 rounded-full bg-[#0891B2]/90 flex items-center justify-center shadow-xl cursor-pointer hover:bg-[#0891B2] transition-colors">
                                                <Play size={32} className="text-white ml-1" />
                                            </div>
                                            <p className="text-white/60 text-sm mt-4 font-medium">{video.title}</p>
                                            <p className="text-white/40 text-xs mt-1">Video tutorial coming soon</p>
                                        </div>

                                        <div className="px-5 py-4 flex items-center justify-between bg-[#F8FAFC]">
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] font-semibold text-[#0891B2] uppercase tracking-wider bg-[#0891B2]/10 px-2 py-0.5 rounded-full">{video.category}</span>
                                                <span className="text-xs text-[#94A3B8] font-mono">{video.duration}</span>
                                            </div>
                                            <button
                                                onClick={() => setShowVideoModal(null)}
                                                className="px-4 py-2 bg-[#0891B2] text-white rounded-lg text-sm font-medium hover:bg-[#0891B2]/90 transition-colors"
                                            >
                                                Close
                                            </button>
                                        </div>
                                    </>
                                );
                            })()}
                        </motion.div>
                    </>
                )}
            </AnimatePresence>
        </div>
    );
}
