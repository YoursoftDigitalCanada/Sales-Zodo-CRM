// src/pages/Support.tsx
import { useState, useMemo } from "react";
import { useLocation } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter, DialogDescription,
} from "@/components/ui/dialog";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Headphones, Search, Plus, X, Eye, Pencil, Trash2, MoreVertical, RefreshCw,
  Sparkles, CheckCircle2, Clock, AlertTriangle, XCircle, MessageSquare,
  User, Users, Calendar, Mail, Send, ChevronRight, ChevronDown,
  BookOpen, HelpCircle, FileText, FolderOpen, Star, Zap,
  TrendingUp, ArrowUp, ArrowDown, Filter, LayoutGrid, List, Tag,
  ThumbsUp, ThumbsDown, ExternalLink, Copy, Lightbulb,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================
interface Ticket {
  id: string; ticketNumber: string; subject: string; description: string;
  status: "open" | "in-progress" | "waiting" | "resolved" | "closed";
  priority: "low" | "medium" | "high" | "urgent";
  category: string; requester: string; requesterEmail: string; assignee?: string;
  createdAt: string; updatedAt: string; resolvedAt?: string;
  messages: { id: string; sender: string; message: string; timestamp: string; isStaff: boolean }[];
  tags: string[];
}

interface KBArticle {
  id: string; title: string; content: string; category: string;
  views: number; helpful: number; notHelpful: number;
  status: "published" | "draft"; createdAt: string; updatedAt: string; author: string;
  tags: string[];
}

interface FAQ {
  id: string; question: string; answer: string; category: string;
  order: number; views: number; helpful: number;
}

// ============================================
// MOCK DATA
// ============================================
const now = new Date();
const hoursAgo = (h: number) => new Date(now.getTime() - h * 3600000).toISOString();
const daysAgo = (d: number) => new Date(now.getTime() - d * 86400000).toISOString();

const mockTickets: Ticket[] = [
  { id: "t1", ticketNumber: "TK-001", subject: "Cannot access CRM dashboard", description: "Getting 403 error when trying to access the main dashboard after login.",
    status: "open", priority: "high", category: "Technical", requester: "John Davis", requesterEmail: "john@company.ca",
    assignee: "Sarah Chen", createdAt: hoursAgo(2), updatedAt: hoursAgo(1),
    messages: [{ id: "m1", sender: "John Davis", message: "I keep getting a 403 error on the dashboard.", timestamp: hoursAgo(2), isStaff: false },
      { id: "m2", sender: "Sarah Chen", message: "I'll look into the permission settings.", timestamp: hoursAgo(1), isStaff: true }],
    tags: ["access", "dashboard"] },
  { id: "t2", ticketNumber: "TK-002", subject: "How to export invoice data?", description: "Need help exporting invoices as CSV for our accounting team.",
    status: "in-progress", priority: "medium", category: "Billing", requester: "Emily Park", requesterEmail: "emily@startup.ca",
    assignee: "Admin", createdAt: hoursAgo(5), updatedAt: hoursAgo(3),
    messages: [{ id: "m3", sender: "Emily Park", message: "How can I export all invoices?", timestamp: hoursAgo(5), isStaff: false }],
    tags: ["export", "invoices"] },
  { id: "t3", ticketNumber: "TK-003", subject: "Calendar sync not working", description: "Google Calendar sync stopped working after the latest update.",
    status: "waiting", priority: "medium", category: "Integration", requester: "Marcus Rivera", requesterEmail: "marcus@tech.ca",
    createdAt: daysAgo(1), updatedAt: hoursAgo(8),
    messages: [{ id: "m4", sender: "Marcus Rivera", message: "Calendar sync broke after the update.", timestamp: daysAgo(1), isStaff: false }],
    tags: ["calendar", "sync", "google"] },
  { id: "t4", ticketNumber: "TK-004", subject: "Feature request: Dark mode", description: "Would love to have a dark mode option in the CRM.",
    status: "open", priority: "low", category: "Feature Request", requester: "Alex Kim", requesterEmail: "alex@design.ca",
    createdAt: daysAgo(2), updatedAt: daysAgo(2), messages: [], tags: ["feature", "ui"] },
  { id: "t5", ticketNumber: "TK-005", subject: "Data import failed", description: "CSV import keeps failing with 'invalid format' error.",
    status: "resolved", priority: "high", category: "Technical", requester: "Lisa Wang", requesterEmail: "lisa@corp.ca",
    assignee: "Admin", createdAt: daysAgo(3), updatedAt: daysAgo(1), resolvedAt: daysAgo(1),
    messages: [], tags: ["import", "csv"] },
  { id: "t6", ticketNumber: "TK-006", subject: "Billing discrepancy", description: "Invoice total doesn't match the line items sum.",
    status: "closed", priority: "urgent", category: "Billing", requester: "Tom Brown", requesterEmail: "tom@finance.ca",
    assignee: "Sarah Chen", createdAt: daysAgo(5), updatedAt: daysAgo(3), resolvedAt: daysAgo(3),
    messages: [], tags: ["billing", "bug"] },
];

const mockArticles: KBArticle[] = [
  { id: "a1", title: "Getting Started with ZODO CRM", content: "Welcome to ZODO CRM! This guide covers the basics of setting up your account, adding contacts, managing leads, and navigating the dashboard.", category: "Getting Started", views: 1245, helpful: 89, notHelpful: 3, status: "published", createdAt: daysAgo(30), updatedAt: daysAgo(5), author: "Admin", tags: ["setup", "basics"] },
  { id: "a2", title: "Managing Invoices & Quotes", content: "Learn how to create, send, and track invoices and quotes. Includes templates, recurring invoices, and payment tracking features.", category: "Finance", views: 856, helpful: 67, notHelpful: 2, status: "published", createdAt: daysAgo(25), updatedAt: daysAgo(10), author: "Admin", tags: ["invoices", "quotes", "billing"] },
  { id: "a3", title: "Calendar & Scheduling Guide", content: "Master the calendar module: create events, set reminders, manage attendees, and use AI scheduling suggestions.", category: "Productivity", views: 634, helpful: 45, notHelpful: 1, status: "published", createdAt: daysAgo(20), updatedAt: daysAgo(8), author: "Sarah Chen", tags: ["calendar", "scheduling"] },
  { id: "a4", title: "API Integration Guide", content: "Connect ZODO CRM with your existing tools using our REST API. Includes authentication, endpoints, and code examples.", category: "Developer", views: 423, helpful: 38, notHelpful: 5, status: "published", createdAt: daysAgo(15), updatedAt: daysAgo(3), author: "Admin", tags: ["api", "integration", "developer"] },
  { id: "a5", title: "AI Features Overview", content: "Explore ZODO's AI-powered features: smart scheduling, lead scoring, deal predictions, and automated insights.", category: "AI & Automation", views: 987, helpful: 72, notHelpful: 4, status: "published", createdAt: daysAgo(10), updatedAt: daysAgo(2), author: "Admin", tags: ["ai", "automation", "intelligence"] },
  { id: "a6", title: "User Roles & Permissions", content: "Configure team roles, set granular permissions, and manage access control for your CRM workspace.", category: "Admin", views: 312, helpful: 28, notHelpful: 1, status: "draft", createdAt: daysAgo(5), updatedAt: daysAgo(1), author: "Admin", tags: ["roles", "permissions", "security"] },
];

const mockFAQs: FAQ[] = [
  { id: "f1", question: "How do I reset my password?", answer: "Go to Settings > Security > Change Password. Enter your current password and then your new password. If you've forgotten your password, use the 'Forgot Password' link on the login page.", category: "Account", order: 1, views: 2340, helpful: 156 },
  { id: "f2", question: "Can I import contacts from a CSV file?", answer: "Yes! Navigate to Contacts > Import > Upload CSV. Map your CSV columns to CRM fields and click Import. Supported formats: CSV, XLSX. Maximum 10,000 records per import.", category: "Data", order: 2, views: 1876, helpful: 134 },
  { id: "f3", question: "How do I create a recurring invoice?", answer: "Open any invoice and click 'Make Recurring'. Set the frequency (weekly, monthly, quarterly, yearly), start date, and optional end date. The system will automatically generate and optionally send invoices on schedule.", category: "Billing", order: 3, views: 1234, helpful: 98 },
  { id: "f4", question: "What integrations are available?", answer: "ZODO CRM integrates with: Google Workspace, Slack, QuickBooks, Stripe, Mailchimp, Zapier, and more. Visit Integrations page to connect your tools.", category: "Integrations", order: 4, views: 987, helpful: 76 },
  { id: "f5", question: "How does AI lead scoring work?", answer: "Our AI analyzes engagement patterns, demographics, and historical data to score leads 1-100. High scores indicate leads more likely to convert. Scores update in real-time as new interactions are recorded.", category: "AI Features", order: 5, views: 876, helpful: 65 },
  { id: "f6", question: "Can I customize the dashboard?", answer: "Yes! Click 'Customize' on the dashboard to add, remove, or rearrange widgets. You can choose from 20+ widget types including charts, KPIs, task lists, and AI insights.", category: "Customization", order: 6, views: 654, helpful: 54 },
  { id: "f7", question: "How do I set up email templates?", answer: "Go to Settings > Email > Templates. Create templates with dynamic variables like {name}, {company}, {deal_value}. Templates can be used in sequences, campaigns, and manual emails.", category: "Email", order: 7, views: 543, helpful: 43 },
  { id: "f8", question: "Is there a mobile app?", answer: "Yes! ZODO CRM is available on iOS and Android. Download from App Store or Google Play. The mobile app supports all core features including contacts, deals, tasks, and notifications.", category: "General", order: 8, views: 432, helpful: 32 },
];

const statusConfig: Record<string, { icon: LucideIcon; color: string; bg: string; label: string }> = {
  open: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100", label: "Open" },
  "in-progress": { icon: Clock, color: "text-blue-600", bg: "bg-blue-100", label: "In Progress" },
  waiting: { icon: Clock, color: "text-purple-600", bg: "bg-purple-100", label: "Waiting" },
  resolved: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100", label: "Resolved" },
  closed: { icon: XCircle, color: "text-[#475569]", bg: "bg-[#F1F5F9]", label: "Closed" },
};

const priorityConfig: Record<string, { color: string; bg: string }> = {
  low: { color: "text-[#475569]", bg: "bg-[#F1F5F9]" },
  medium: { color: "text-blue-600", bg: "bg-blue-100" },
  high: { color: "text-orange-600", bg: "bg-orange-100" },
  urgent: { color: "text-red-600", bg: "bg-red-100" },
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);
const formatDate = (d: string) => new Date(d).toLocaleDateString("en-CA", { month: "short", day: "numeric", year: "numeric" });
const timeAgo = (d: string) => {
  const diff = (now.getTime() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ============================================
// MAIN COMPONENT
// ============================================
const SupportPage = () => {
  const location = useLocation();
  const { toast } = useToast();
  const initialTab = location.pathname.includes("knowledge-base") ? "kb" : location.pathname.includes("faq") ? "faq" : "tickets";
  const [activeTab, setActiveTab] = useState<"tickets" | "kb" | "faq">(initialTab);
  const [tickets, setTickets] = useState(mockTickets);
  const [articles] = useState(mockArticles);
  const [faqs] = useState(mockFAQs);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState("all");
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailOpen, setIsDetailOpen] = useState(false);
  const [currentTicket, setCurrentTicket] = useState<Ticket | null>(null);
  const [deleteId, setDeleteId] = useState<string | null>(null);
  const [replyText, setReplyText] = useState("");
  const [expandedFaq, setExpandedFaq] = useState<string | null>(null);
  // Form state
  const [formData, setFormData] = useState({ subject: "", description: "", priority: "medium" as Ticket["priority"], category: "Technical", requester: "", requesterEmail: "" });

  // Stats
  const stats = useMemo(() => ({
    open: tickets.filter(t => t.status === "open").length,
    inProgress: tickets.filter(t => t.status === "in-progress").length,
    resolved: tickets.filter(t => t.status === "resolved" || t.status === "closed").length,
    avgResponseTime: "2.4h",
    totalArticles: articles.filter(a => a.status === "published").length,
    totalFaqs: faqs.length,
  }), [tickets, articles, faqs]);

  // AI insights
  const aiInsights = useMemo(() => {
    const insights: { icon: LucideIcon; text: string; type: string }[] = [];
    const urgentOpen = tickets.filter(t => t.status === "open" && (t.priority === "urgent" || t.priority === "high")).length;
    if (urgentOpen > 0) insights.push({ icon: AlertTriangle, text: `${urgentOpen} high/urgent ticket${urgentOpen > 1 ? "s" : ""} need immediate attention.`, type: "danger" });
    const waitingLong = tickets.filter(t => t.status === "waiting" && (now.getTime() - new Date(t.updatedAt).getTime()) > 86400000).length;
    if (waitingLong > 0) insights.push({ icon: Clock, text: `${waitingLong} ticket${waitingLong > 1 ? "s" : ""} waiting for response > 24h.`, type: "warning" });
    if (stats.resolved > stats.open) insights.push({ icon: TrendingUp, text: "Resolution rate is above target — great work!", type: "success" });
    return insights;
  }, [tickets, stats]);

  // Filtered tickets
  const filteredTickets = useMemo(() => {
    let result = [...tickets];
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(t => t.subject.toLowerCase().includes(q) || t.requester.toLowerCase().includes(q) || t.ticketNumber.toLowerCase().includes(q));
    }
    if (statusFilter !== "all") result = result.filter(t => t.status === statusFilter);
    return result;
  }, [tickets, searchQuery, statusFilter]);

  const filteredArticles = useMemo(() => {
    if (!searchQuery) return articles.filter(a => a.status === "published");
    const q = searchQuery.toLowerCase();
    return articles.filter(a => a.status === "published" && (a.title.toLowerCase().includes(q) || a.content.toLowerCase().includes(q)));
  }, [articles, searchQuery]);

  const filteredFaqs = useMemo(() => {
    if (!searchQuery) return faqs;
    const q = searchQuery.toLowerCase();
    return faqs.filter(f => f.question.toLowerCase().includes(q) || f.answer.toLowerCase().includes(q));
  }, [faqs, searchQuery]);

  // Handlers
  const handleCreateTicket = () => {
    const newTicket: Ticket = {
      id: `t-${Date.now()}`, ticketNumber: `TK-${String(tickets.length + 1).padStart(3, "0")}`,
      subject: formData.subject, description: formData.description, status: "open",
      priority: formData.priority, category: formData.category,
      requester: formData.requester || "Current User", requesterEmail: formData.requesterEmail || "user@company.ca",
      createdAt: now.toISOString(), updatedAt: now.toISOString(), messages: [], tags: [],
    };
    setTickets(prev => [newTicket, ...prev]);
    setIsFormOpen(false);
    setFormData({ subject: "", description: "", priority: "medium", category: "Technical", requester: "", requesterEmail: "" });
    toast({ title: "Ticket Created", description: `${newTicket.ticketNumber} has been created.` });
  };

  const handleReply = () => {
    if (!currentTicket || !replyText.trim()) return;
    const newMsg = { id: `m-${Date.now()}`, sender: "Admin", message: replyText, timestamp: now.toISOString(), isStaff: true };
    setTickets(prev => prev.map(t => t.id === currentTicket.id ? { ...t, messages: [...t.messages, newMsg], updatedAt: now.toISOString(), status: "in-progress" as const } : t));
    setCurrentTicket(prev => prev ? { ...prev, messages: [...prev.messages, newMsg] } : null);
    setReplyText("");
    toast({ title: "Reply Sent" });
  };

  const updateTicketStatus = (id: string, status: Ticket["status"]) => {
    setTickets(prev => prev.map(t => t.id === id ? { ...t, status, updatedAt: now.toISOString(), ...(status === "resolved" ? { resolvedAt: now.toISOString() } : {}) } : t));
    toast({ title: "Status Updated", description: `Ticket status changed to ${status}.` });
  };

  const handleDelete = () => {
    if (!deleteId) return;
    setTickets(prev => prev.filter(t => t.id !== deleteId));
    setDeleteId(null);
    setIsDetailOpen(false);
    toast({ title: "Ticket Deleted" });
  };

  const tabs = [
    { id: "tickets" as const, label: "Tickets", icon: Headphones, count: tickets.filter(t => t.status === "open" || t.status === "in-progress").length },
    { id: "kb" as const, label: "Knowledge Base", icon: BookOpen, count: stats.totalArticles },
    { id: "faq" as const, label: "FAQ", icon: HelpCircle, count: stats.totalFaqs },
  ];

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1400px] mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center"><Headphones size={20} className="text-[#0891B2]" /></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Support Center</h1>
                <p className="text-sm text-[#94A3B8]">{stats.open} open tickets · {stats.totalArticles} articles · {stats.totalFaqs} FAQs</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => toast({ title: "Refreshed" })}>
                <RefreshCw size={16} className="mr-2" />Refresh
              </Button>
              {activeTab === "tickets" && (
                <Button size="sm" className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md" onClick={() => setIsFormOpen(true)}>
                  <Plus size={16} className="mr-2" />New Ticket
                </Button>
              )}
            </div>
          </motion.div>

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-[#0891B2]/10 to-purple-500/10 rounded-full">
                  <Sparkles size={12} className="text-[#0891B2]" /><span className="text-xs font-semibold text-[#0891B2]">AI Insights</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiInsights.map((ins, i) => {
                  const InsIcon = ins.icon;
                  return (
                    <div key={i} className={cn("p-3 rounded-md border flex items-center gap-3",
                      ins.type === "danger" && "bg-red-50 border-red-200",
                      ins.type === "warning" && "bg-amber-50 border-amber-200",
                      ins.type === "success" && "bg-green-50 border-green-200")}>
                      <InsIcon size={16} className={cn(ins.type === "danger" && "text-red-600", ins.type === "warning" && "text-amber-600", ins.type === "success" && "text-green-600")} />
                      <p className="text-xs text-[#475569]">{ins.text}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            {[
              { label: "Open Tickets", value: stats.open, icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
              { label: "In Progress", value: stats.inProgress, icon: Clock, color: "text-blue-600", bg: "bg-blue-100" },
              { label: "Resolved", value: stats.resolved, icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
              { label: "Avg Response", value: stats.avgResponseTime, icon: Zap, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
            ].map((s, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }}
                className="bg-white rounded-md p-4 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all">
                <div className="flex items-center justify-between">
                  <div><p className="text-xs text-[#94A3B8]">{s.label}</p><p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{s.value}</p></div>
                  <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", s.bg)}><s.icon size={18} className={s.color} /></div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Tabs */}
          <div className="flex items-center gap-1 mb-6 bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-1">
            {tabs.map(tab => (
              <button key={tab.id} onClick={() => { setActiveTab(tab.id); setSearchQuery(""); setStatusFilter("all"); }}
                className={cn("flex items-center gap-2 px-4 py-2.5 rounded-md text-sm font-medium transition-all flex-1 justify-center",
                  activeTab === tab.id ? "bg-[#0891B2] text-white shadow-sm" : "text-[#475569] hover:bg-[#F8FAFC]")}>
                <tab.icon size={16} />{tab.label}
                <span className={cn("px-1.5 py-0.5 rounded-full text-[10px] font-bold",
                  activeTab === tab.id ? "bg-white/20 text-white" : "bg-[#F1F5F9] text-[#475569]")}>{tab.count}</span>
              </button>
            ))}
          </div>

          {/* Search */}
          <div className="mb-6">
            <div className="relative">
              <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
              <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                placeholder={activeTab === "tickets" ? "Search tickets..." : activeTab === "kb" ? "Search articles..." : "Search FAQs..."}
                className="pl-10 rounded-md border-[rgba(15,23,42,0.06)] h-11 bg-white" />
              {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><X size={14} /></button>}
            </div>
          </div>

          {/* TICKETS TAB */}
          {activeTab === "tickets" && (
            <div className="space-y-3">
              {/* Status filter pills */}
              <div className="flex items-center gap-2 mb-4">
                {["all", "open", "in-progress", "waiting", "resolved", "closed"].map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize",
                      statusFilter === s ? "bg-[#0891B2] text-white" : "bg-white border border-[rgba(15,23,42,0.06)] text-[#475569] hover:bg-[#F8FAFC]")}>
                    {s === "all" ? "All" : s.replace("-", " ")}
                  </button>
                ))}
              </div>
              {filteredTickets.length === 0 ? (
                <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-16 text-center">
                  <Headphones size={48} className="text-[#94A3B8] mx-auto mb-4" />
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No tickets found</h3>
                  <p className="text-[#94A3B8] mb-4">All clear or adjust your filters</p>
                  <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md" onClick={() => setIsFormOpen(true)}><Plus size={16} className="mr-2" />New Ticket</Button>
                </div>
              ) : (
                <AnimatePresence>
                  {filteredTickets.map(ticket => {
                    const sc = statusConfig[ticket.status];
                    const StatusIcon = sc.icon;
                    const pc = priorityConfig[ticket.priority];
                    return (
                      <motion.div key={ticket.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}
                        whileHover={{ y: -2 }}
                        className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 hover:border-[#22D3EE]/30 hover:shadow-lg transition-all cursor-pointer group"
                        onClick={() => { setCurrentTicket(ticket); setIsDetailOpen(true); }}>
                        <div className="flex items-start gap-4">
                          <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0", sc.bg)}>
                            <StatusIcon size={18} className={sc.color} />
                          </div>
                          <div className="flex-1 min-w-0">
                            <div className="flex items-center gap-2 mb-1">
                              <span className="text-xs font-mono text-[#94A3B8]">{ticket.ticketNumber}</span>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", sc.bg, sc.color)}>{sc.label}</span>
                              <span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold capitalize", pc.bg, pc.color)}>{ticket.priority}</span>
                            </div>
                            <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{ticket.subject}</h3>
                            <p className="text-xs text-[#94A3B8] mt-1 line-clamp-1">{ticket.description}</p>
                            <div className="flex items-center gap-4 mt-2">
                              <span className="text-xs text-[#475569] flex items-center gap-1"><User size={12} />{ticket.requester}</span>
                              <span className="text-xs text-[#475569] flex items-center gap-1"><Clock size={12} />{timeAgo(ticket.updatedAt)}</span>
                              {ticket.messages.length > 0 && <span className="text-xs text-[#475569] flex items-center gap-1"><MessageSquare size={12} />{ticket.messages.length}</span>}
                              {ticket.assignee && <span className="text-xs text-[#0891B2] flex items-center gap-1"><Users size={12} />{ticket.assignee}</span>}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] opacity-0 group-hover:opacity-100 transition-all"><MoreVertical size={16} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-md">
                              <DropdownMenuItem onClick={() => { setCurrentTicket(ticket); setIsDetailOpen(true); }} className="rounded-md"><Eye size={14} className="mr-2" />View</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "in-progress")} className="rounded-md"><Clock size={14} className="mr-2" />Mark In Progress</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "resolved")} className="rounded-md"><CheckCircle2 size={14} className="mr-2" />Mark Resolved</DropdownMenuItem>
                              <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "closed")} className="rounded-md"><XCircle size={14} className="mr-2" />Close</DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem onClick={() => setDeleteId(ticket.id)} className="rounded-md text-red-600"><Trash2 size={14} className="mr-2" />Delete</DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </div>
                      </motion.div>
                    );
                  })}
                </AnimatePresence>
              )}
            </div>
          )}

          {/* KNOWLEDGE BASE TAB */}
          {activeTab === "kb" && (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {filteredArticles.map(article => (
                <motion.div key={article.id} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }}
                  whileHover={{ y: -4 }}
                  className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 hover:border-[#22D3EE]/30 hover:shadow-lg transition-all cursor-pointer group">
                  <div className="flex items-start justify-between mb-3">
                    <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center"><BookOpen size={18} className="text-[#0891B2]" /></div>
                    <Badge variant="secondary" className="text-[10px] rounded-md">{article.category}</Badge>
                  </div>
                  <h3 className="font-semibold text-[#0F172A] mb-2 group-hover:text-[#0891B2] transition-colors">{article.title}</h3>
                  <p className="text-xs text-[#94A3B8] line-clamp-2 mb-3">{article.content}</p>
                  <div className="flex items-center gap-3 text-xs text-[#475569]">
                    <span className="flex items-center gap-1"><Eye size={12} />{article.views}</span>
                    <span className="flex items-center gap-1"><ThumbsUp size={12} />{article.helpful}</span>
                    <span className="flex items-center gap-1"><User size={12} />{article.author}</span>
                  </div>
                  {article.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-3">
                      {article.tags.map(tag => <span key={tag} className="px-2 py-0.5 bg-[#F1F5F9] text-[#475569] rounded-full text-[10px]">#{tag}</span>)}
                    </div>
                  )}
                </motion.div>
              ))}
            </div>
          )}

          {/* FAQ TAB */}
          {activeTab === "faq" && (
            <div className="space-y-3">
              {filteredFaqs.map(faq => (
                <motion.div key={faq.id} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}
                  className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden hover:border-[#22D3EE]/30 transition-all">
                  <button onClick={() => setExpandedFaq(expandedFaq === faq.id ? null : faq.id)}
                    className="w-full flex items-center gap-3 p-4 text-left">
                    <div className="w-8 h-8 rounded-md bg-[#0891B2]/10 flex items-center justify-center shrink-0">
                      <HelpCircle size={16} className="text-[#0891B2]" />
                    </div>
                    <div className="flex-1">
                      <p className="font-medium text-[#0F172A]">{faq.question}</p>
                      <div className="flex items-center gap-3 mt-1">
                        <span className="text-[10px] px-2 py-0.5 bg-[#F1F5F9] rounded-full text-[#475569]">{faq.category}</span>
                        <span className="text-xs text-[#94A3B8] flex items-center gap-1"><Eye size={10} />{faq.views} views</span>
                      </div>
                    </div>
                    <ChevronDown size={16} className={cn("text-[#94A3B8] transition-transform", expandedFaq === faq.id && "rotate-180")} />
                  </button>
                  <AnimatePresence>
                    {expandedFaq === faq.id && (
                      <motion.div initial={{ height: 0, opacity: 0 }} animate={{ height: "auto", opacity: 1 }} exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden">
                        <div className="px-4 pb-4 pl-[60px]">
                          <p className="text-sm text-[#475569] leading-relaxed">{faq.answer}</p>
                          <div className="flex items-center gap-3 mt-3">
                            <span className="text-xs text-[#94A3B8]">Was this helpful?</span>
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" onClick={() => toast({ title: "Thanks for the feedback!" })}>
                              <ThumbsUp size={12} className="mr-1" />Yes ({faq.helpful})
                            </Button>
                            <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" onClick={() => toast({ title: "Thanks, we'll improve this!" })}>
                              <ThumbsDown size={12} className="mr-1" />No
                            </Button>
                          </div>
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Create Ticket Dialog */}
      <Dialog open={isFormOpen} onOpenChange={setIsFormOpen}>
        <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
          <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
            <DialogHeader><DialogTitle className="text-xl font-bold text-[#0F172A]">Create Support Ticket</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">Describe your issue and we'll get back to you.</DialogDescription></DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div><Label className="text-xs text-[#475569]">Subject *</Label>
              <Input value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Brief description of the issue" className="mt-1 rounded-md" required /></div>
            <div><Label className="text-xs text-[#475569]">Description *</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Provide details about the issue..." className="mt-1 rounded-md h-24" required /></div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#475569]">Priority</Label>
                <Select value={formData.priority} onValueChange={v => setFormData(p => ({ ...p, priority: v as Ticket["priority"] }))}>
                  <SelectTrigger className="mt-1 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="low">Low</SelectItem><SelectItem value="medium">Medium</SelectItem><SelectItem value="high">High</SelectItem><SelectItem value="urgent">Urgent</SelectItem></SelectContent>
                </Select></div>
              <div><Label className="text-xs text-[#475569]">Category</Label>
                <Select value={formData.category} onValueChange={v => setFormData(p => ({ ...p, category: v }))}>
                  <SelectTrigger className="mt-1 rounded-md"><SelectValue /></SelectTrigger>
                  <SelectContent><SelectItem value="Technical">Technical</SelectItem><SelectItem value="Billing">Billing</SelectItem><SelectItem value="Feature Request">Feature Request</SelectItem><SelectItem value="Integration">Integration</SelectItem><SelectItem value="Other">Other</SelectItem></SelectContent>
                </Select></div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div><Label className="text-xs text-[#475569]">Your Name</Label>
                <Input value={formData.requester} onChange={e => setFormData(p => ({ ...p, requester: e.target.value }))} placeholder="Your name" className="mt-1 rounded-md" /></div>
              <div><Label className="text-xs text-[#475569]">Email</Label>
                <Input value={formData.requesterEmail} onChange={e => setFormData(p => ({ ...p, requesterEmail: e.target.value }))} placeholder="your@email.com" type="email" className="mt-1 rounded-md" /></div>
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 gap-3">
            <Button variant="outline" onClick={() => setIsFormOpen(false)} className="rounded-md">Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={!formData.subject || !formData.description} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
              <Plus size={16} className="mr-2" />Create Ticket
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
          {currentTicket && (() => {
            const sc = statusConfig[currentTicket.status]; const StatusIcon = sc.icon;
            return (<>
              <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-gradient-to-r from-[#0891B2]/5 to-transparent">
                <div className="flex items-center gap-2 mb-2">
                  <span className="text-xs font-mono text-[#94A3B8]">{currentTicket.ticketNumber}</span>
                  <span className={cn("px-2 py-0.5 rounded-full text-xs font-semibold", sc.bg, sc.color)}><StatusIcon size={12} className="inline mr-1" />{sc.label}</span>
                </div>
                <h2 className="text-xl font-bold text-[#0F172A]">{currentTicket.subject}</h2>
                <p className="text-sm text-[#475569] mt-1">{currentTicket.description}</p>
                <div className="flex items-center gap-4 mt-3">
                  <span className="text-xs text-[#475569] flex items-center gap-1"><User size={12} />{currentTicket.requester}</span>
                  <span className="text-xs text-[#475569] flex items-center gap-1"><Calendar size={12} />{formatDate(currentTicket.createdAt)}</span>
                </div>
              </div>
              <div className="p-6 space-y-4">
                {/* Status actions */}
                <div className="flex items-center gap-2">
                  <span className="text-xs text-[#94A3B8]">Update status:</span>
                  {(["open", "in-progress", "waiting", "resolved", "closed"] as Ticket["status"][]).map(s => (
                    <Button key={s} size="sm" variant={currentTicket.status === s ? "default" : "outline"}
                      className={cn("h-7 text-xs rounded-md capitalize", currentTicket.status === s && "bg-[#0891B2] hover:bg-[#0891B2]/90 text-white")}
                      onClick={() => { updateTicketStatus(currentTicket.id, s); setCurrentTicket(prev => prev ? { ...prev, status: s } : null); }}>
                      {s.replace("-", " ")}
                    </Button>
                  ))}
                </div>
                {/* Messages */}
                <div className="space-y-3">
                  <p className="text-sm font-semibold text-[#0F172A]">Conversation ({currentTicket.messages.length})</p>
                  {currentTicket.messages.length === 0 ? (
                    <p className="text-xs text-[#94A3B8] text-center py-4">No messages yet</p>
                  ) : currentTicket.messages.map(msg => (
                    <div key={msg.id} className={cn("p-3 rounded-md", msg.isStaff ? "bg-[#0891B2]/5 border border-[#0891B2]/10" : "bg-[#F8FAFC]")}>
                      <div className="flex items-center justify-between mb-1">
                        <span className="text-xs font-semibold text-[#0F172A]">{msg.sender}{msg.isStaff && <Badge variant="secondary" className="ml-2 text-[9px]">Staff</Badge>}</span>
                        <span className="text-xs text-[#94A3B8]">{timeAgo(msg.timestamp)}</span>
                      </div>
                      <p className="text-sm text-[#475569]">{msg.message}</p>
                    </div>
                  ))}
                </div>
                {/* Reply */}
                <div className="space-y-2">
                  <Textarea value={replyText} onChange={e => setReplyText(e.target.value)} placeholder="Type your reply..." className="rounded-md h-20" />
                  <div className="flex justify-between">
                    <Button variant="outline" onClick={() => { setDeleteId(currentTicket.id); setIsDetailOpen(false); }} className="rounded-md text-red-600 border-red-200 hover:bg-red-50" size="sm">
                      <Trash2 size={14} className="mr-1" />Delete
                    </Button>
                    <Button onClick={handleReply} disabled={!replyText.trim()} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md" size="sm">
                      <Send size={14} className="mr-1" />Send Reply
                    </Button>
                  </div>
                </div>
              </div>
            </>); })()}
        </DialogContent>
      </Dialog>

      {/* Delete Dialog */}
      <AlertDialog open={!!deleteId} onOpenChange={() => setDeleteId(null)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader><AlertDialogTitle>Delete Ticket</AlertDialogTitle>
            <AlertDialogDescription>This action cannot be undone.</AlertDialogDescription></AlertDialogHeader>
          <AlertDialogFooter><AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleDelete} className="bg-red-600 hover:bg-red-700 rounded-md">Delete</AlertDialogAction></AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default SupportPage;
