// src/pages/Support.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
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
import useIsMobile from "@/hooks/useIsMobile";
import {
  Headphones, Search, Plus, X, Eye, Pencil, Trash2, MoreVertical, RefreshCw,
  Sparkles, CheckCircle2, Clock, AlertTriangle, XCircle, MessageSquare,
  User, Users, Calendar, Mail, Send, ChevronRight, ChevronDown,
  BookOpen, HelpCircle, FileText, FolderOpen, Star, Zap,
  TrendingUp, ArrowUp, ArrowDown, Filter, Tag,
  ThumbsUp, ThumbsDown, ExternalLink, Copy, Lightbulb,
  Paperclip, Image, FileText as FileIcon, Film,
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
  messagesCount: number; internalNotesCount: number;
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

import {
  getTickets as apiGetTickets,
  createTicket as apiCreateTicket,
  createTicketWithAttachments as apiCreateTicketWithAttachments,
  updateTicketStatus as apiUpdateStatus,
  addTicketMessage as apiAddMessage,
  deleteTicket as apiDeleteTicket,
  type SupportTicket as ApiTicket,
} from "@/services/supportTicketsService";
import { createSupportTicketsRealtimeStream } from "@/services/supportTicketsRealtime";
import { getStoredEmployee } from "@/features/auth/lib/auth-storage";

// Map API ticket to frontend format
const mapTicket = (t: ApiTicket): Ticket => ({
  id: t.id,
  ticketNumber: t.ticketNumber,
  subject: t.subject,
  description: t.description,
  status: t.status.toLowerCase().replace('_', '-') as Ticket["status"],
  priority: t.priority.toLowerCase() as Ticket["priority"],
  category: t.category,
  requester: t.requesterName,
  requesterEmail: t.requesterEmail,
  assignee: t.assignedToName || t.assignedTo || undefined,
  messagesCount: t.messagesCount,
  internalNotesCount: t.internalNotesCount,
  createdAt: t.createdAt,
  updatedAt: t.updatedAt,
  resolvedAt: t.resolvedAt || undefined,
  messages: (t.messages || []).map(m => ({
    id: m.id,
    sender: m.sender,
    message: m.message,
    timestamp: m.createdAt,
    isStaff: m.isStaff,
  })),
  tags: t.tags || [],
});

const upsertTicket = (items: Ticket[], nextTicket: Ticket): Ticket[] => {
  const nextItems = [...items];
  const existingIndex = nextItems.findIndex(ticket => ticket.id === nextTicket.id);

  if (existingIndex === -1) {
    nextItems.unshift(nextTicket);
  } else {
    nextItems[existingIndex] = nextTicket;
  }

  return nextItems.sort((a, b) => new Date(b.updatedAt).getTime() - new Date(a.updatedAt).getTime());
};

const getCurrentRequester = () => {
  try {
    const raw = JSON.parse(localStorage.getItem("user") || "{}");
    const name = [raw.firstName, raw.lastName].filter(Boolean).join(" ").trim() || raw.name || "Workspace User";
    const email = typeof raw.email === "string" ? raw.email : "";
    return { name, email };
  } catch {
    return { name: "Workspace User", email: "" };
  }
};

const getApiErrorMessage = (error: unknown, fallback: string) => {
  const payload = (error as {
    response?: {
      data?: {
        message?: string;
        details?: {
          errors?: Record<string, string[]>;
        };
      };
    };
  })?.response?.data;

  const fieldErrors = payload?.details?.errors
    ? Object.values(payload.details.errors).flat().filter(Boolean)
    : [];

  if (fieldErrors.length > 0) {
    return fieldErrors[0];
  }

  return payload?.message || fallback;
};

// Map frontend status to API status
const toApiStatus = (s: string) => s.toUpperCase().replace('-', '_') as ApiTicket["status"];

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
  const diff = (Date.now() - new Date(d).getTime()) / 1000;
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
};

// ============================================
// MAIN COMPONENT
// ============================================
const SupportPage = () => {
  const { isMobile } = useIsMobile();
  const location = useLocation();
  const { toast } = useToast();
  const initialTab = location.pathname.includes("knowledge-base") ? "kb" : location.pathname.includes("faq") ? "faq" : "tickets";
  const [activeTab, setActiveTab] = useState<"tickets" | "kb" | "faq">(initialTab);
  const [tickets, setTickets] = useState<Ticket[]>([]);
  const [isLoading, setIsLoading] = useState(true);
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
  const [streamState, setStreamState] = useState<"connecting" | "live" | "reconnecting">("connecting");
  // Form state
  const currentRequester = useMemo(() => getCurrentRequester(), []);
  const currentEmployee = useMemo(() => getStoredEmployee(), []);
  const canManageTicketStatus = useMemo(() => {
    const employeeRecord = currentEmployee as Record<string, unknown> | null;
    const roleValue = employeeRecord?.role;
    const roleName = typeof roleValue === "string"
      ? roleValue
      : typeof roleValue === "object" && roleValue !== null && typeof (roleValue as { name?: unknown }).name === "string"
        ? String((roleValue as { name: string }).name)
        : typeof employeeRecord?.roleName === "string"
          ? String(employeeRecord.roleName)
          : "";

    return /^(super admin|super_admin)$/i.test(roleName.trim());
  }, [currentEmployee]);
  const [formData, setFormData] = useState({ subject: "", description: "", priority: "medium" as Ticket["priority"], category: "Technical" });
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const trimmedSubject = formData.subject.trim();
  const trimmedDescription = formData.description.trim();
  const canSubmitTicket = trimmedSubject.length >= 3 && trimmedDescription.length >= 10;

  // Load tickets from API
  const loadTickets = useCallback(async () => {
    try {
      setIsLoading(true);
      const result = await apiGetTickets();
      setTickets(result.data.map(mapTicket));
    } catch (err) {
      console.error('Failed to load tickets:', err);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    loadTickets();
  }, [loadTickets]);

  useEffect(() => {
    const stopRealtime = createSupportTicketsRealtimeStream({
      onConnected: () => setStreamState("live"),
      onDisconnected: () => setStreamState("reconnecting"),
      onEvent: (event, payload) => {
        const data = payload as { ticket?: ApiTicket; id?: string };

        if ((event === "ticket_created" || event === "ticket_updated") && data.ticket) {
          const nextTicket = mapTicket(data.ticket);
          setTickets(prev => upsertTicket(prev, nextTicket));
          setCurrentTicket(prev => (prev?.id === nextTicket.id ? nextTicket : prev));
        }

        if (event === "ticket_deleted" && data.id) {
          setTickets(prev => prev.filter(ticket => ticket.id !== data.id));
          setCurrentTicket(prev => (prev?.id === data.id ? null : prev));
        }
      },
    });

    const pollInterval = window.setInterval(() => {
      loadTickets();
    }, 30000);

    return () => {
      stopRealtime();
      window.clearInterval(pollInterval);
    };
  }, [loadTickets]);

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
    const waitingLong = tickets.filter(t => t.status === "waiting" && (Date.now() - new Date(t.updatedAt).getTime()) > 86400000).length;
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
  const handleCreateTicket = async () => {
    if (!canSubmitTicket) {
      toast({
        title: "Validation Error",
        description: trimmedSubject.length < 3 ? "Subject must be at least 3 characters." : "Description must be at least 10 characters.",
        variant: "destructive",
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const payload = {
        subject: trimmedSubject,
        description: trimmedDescription,
        priority: formData.priority.toUpperCase(),
        category: formData.category,
      };

      let result;
      if (selectedFiles.length > 0) {
        result = await apiCreateTicketWithAttachments(payload, selectedFiles);
      } else {
        result = await apiCreateTicket(payload);
      }
      setTickets(prev => upsertTicket(prev, mapTicket(result)));
      setIsFormOpen(false);
      setFormData({ subject: "", description: "", priority: "medium", category: "Technical" });
      setSelectedFiles([]);
      toast({ title: "Ticket Created", description: `${result.ticketNumber} has been created. A notification email has been sent.` });
    } catch (err) {
      toast({
        title: "Error",
        description: getApiErrorMessage(err, "Failed to create ticket."),
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleReply = async () => {
    if (!currentTicket || !replyText.trim()) return;
    try {
      const updated = await apiAddMessage(currentTicket.id, { message: replyText });
      const nextTicket = mapTicket(updated);
      setTickets(prev => upsertTicket(prev, nextTicket));
      setCurrentTicket(nextTicket);
      setReplyText("");
      toast({ title: "Reply Sent" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to send reply.", variant: "destructive" });
    }
  };

  const updateTicketStatus = async (id: string, status: Ticket["status"]) => {
    try {
      const updated = await apiUpdateStatus(id, toApiStatus(status));
      const nextTicket = mapTicket(updated);
      setTickets(prev => upsertTicket(prev, nextTicket));
      setCurrentTicket(prev => (prev?.id === id ? nextTicket : prev));
      toast({ title: "Status Updated", description: `Ticket status changed to ${status}.` });
    } catch (err) {
      toast({ title: "Error", description: "Failed to update status.", variant: "destructive" });
    }
  };

  const handleDelete = async () => {
    if (!deleteId) return;
    try {
      await apiDeleteTicket(deleteId);
      setTickets(prev => prev.filter(t => t.id !== deleteId));
      setDeleteId(null);
      setIsDetailOpen(false);
      toast({ title: "Ticket Deleted" });
    } catch (err) {
      toast({ title: "Error", description: "Failed to delete ticket.", variant: "destructive" });
    }
  };

  const tabs = [
    { id: "tickets" as const, label: "Tickets", icon: Headphones, count: tickets.filter(t => t.status === "open" || t.status === "in-progress").length },
    { id: "kb" as const, label: "Knowledge Base", icon: BookOpen, count: stats.totalArticles },
    { id: "faq" as const, label: "FAQ", icon: HelpCircle, count: stats.totalFaqs },
  ];

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <div className="flex-1 overflow-auto">
        <div className={cn("max-w-[1400px] mx-auto", isMobile ? "p-3" : "p-6")}>
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className={cn("mb-6 flex", isMobile ? "flex-col gap-4" : "items-center justify-between")}>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center"><Headphones size={20} className="text-[#0891B2]" /></div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Support Center</h1>
                <p className="text-sm text-[#94A3B8]">{stats.open} open tickets · {stats.totalArticles} articles · {stats.totalFaqs} FAQs</p>
              </div>
            </div>
            <div className={cn("flex items-center gap-3", isMobile && "flex-wrap")}>
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]" onClick={() => { loadTickets(); toast({ title: "Refreshed" }); }}>
                <RefreshCw size={16} className={cn("mr-2", isLoading && "animate-spin")} />Refresh
              </Button>
              {activeTab === "tickets" && (
                <div className={cn(
                  "px-2.5 py-1 rounded-full text-xs font-semibold border",
                  streamState === "live"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}>
                  {streamState === "live" ? "Live Sync" : "Reconnecting..."}
                </div>
              )}
              {activeTab === "tickets" && (
                <Button size="sm" className={cn("bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md", isMobile && "flex-1")} onClick={() => setIsFormOpen(true)}>
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
              <div className={cn(isMobile ? "-mx-1 overflow-x-auto pb-1" : "")}>
                <div className={cn("grid gap-3", isMobile ? "grid-flow-col auto-cols-[280px] px-1" : "grid-cols-1 md:grid-cols-3")}>
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
              </div>
            </motion.div>
          )}

          {/* Stats */}
          <div className={cn("mb-6", isMobile ? "-mx-1 overflow-x-auto pb-1" : "")}>
            <div className={cn("grid gap-4", isMobile ? "grid-flow-col auto-cols-[180px] px-1" : "grid-cols-2 md:grid-cols-4")}>
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
          </div>

          {/* Tabs */}
          <div className={cn("mb-6 bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-1", isMobile ? "overflow-x-auto" : "flex items-center gap-1")}>
            <div className={cn("flex items-center gap-1", isMobile && "min-w-max")}>
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
              {/* Toolbar: Status filter pills */}
              <div className={cn("mb-4", isMobile ? "space-y-3" : "flex items-center justify-between")}>
                <div className={cn("flex items-center gap-2", isMobile && "overflow-x-auto pb-1")}>
                  {["all", "open", "in-progress", "waiting", "resolved", "closed"].map(s => (
                    <button key={s} onClick={() => setStatusFilter(s)}
                      className={cn("px-3 py-1.5 rounded-full text-xs font-medium transition-colors capitalize",
                        statusFilter === s ? "bg-[#0891B2] text-white" : "bg-white border border-[rgba(15,23,42,0.06)] text-[#475569] hover:bg-[#F8FAFC]")}>
                      {s === "all" ? "All" : s.replace("-", " ")}
                    </button>
                  ))}
                </div>
                <span className="text-sm text-[#94A3B8]">List view</span>
              </div>

              {/* LIST VIEW */}
              <>
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
                        <div className={cn("flex items-start gap-4", isMobile && "flex-col gap-3")}>
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
                              {ticket.messagesCount > 0 && <span className="text-xs text-[#475569] flex items-center gap-1"><MessageSquare size={12} />{ticket.messagesCount}</span>}
                              {ticket.assignee && <span className="text-xs text-[#0891B2] flex items-center gap-1"><Users size={12} />{ticket.assignee}</span>}
                            </div>
                          </div>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild onClick={e => e.stopPropagation()}>
                              <button className={cn("p-2 rounded-md hover:bg-white/10 text-[#475569] transition-all", isMobile ? "self-end opacity-100" : "opacity-0 group-hover:opacity-100")}><MoreVertical size={16} /></button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 rounded-md">
                              <DropdownMenuItem onClick={() => { setCurrentTicket(ticket); setIsDetailOpen(true); }} className="rounded-md"><Eye size={14} className="mr-2" />View</DropdownMenuItem>
                              {canManageTicketStatus && (
                                <>
                                  <DropdownMenuSeparator />
                                  <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "in-progress")} className="rounded-md"><Clock size={14} className="mr-2" />Mark In Progress</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "resolved")} className="rounded-md"><CheckCircle2 size={14} className="mr-2" />Mark Resolved</DropdownMenuItem>
                                  <DropdownMenuItem onClick={() => updateTicketStatus(ticket.id, "closed")} className="rounded-md"><XCircle size={14} className="mr-2" />Close</DropdownMenuItem>
                                </>
                              )}
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
              </>
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
        <DialogContent className={cn(
          "p-0 overflow-hidden",
          isMobile ? "h-[100dvh] w-screen max-w-none rounded-none border-0" : "sm:max-w-[500px] rounded-md",
        )}>
          <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
            <DialogHeader><DialogTitle className="text-xl font-bold text-[#0F172A]">Create Support Ticket</DialogTitle>
              <DialogDescription className="text-[#94A3B8]">Describe your issue and we'll get back to you.</DialogDescription></DialogHeader>
          </div>
          <div className="p-6 space-y-4">
            <div><Label className="text-xs text-[#475569]">Subject *</Label>
              <Input value={formData.subject} onChange={e => setFormData(p => ({ ...p, subject: e.target.value }))} placeholder="Brief description of the issue" className="mt-1 rounded-md" required /></div>
            {formData.subject.length > 0 && trimmedSubject.length < 3 && (
              <p className="text-xs text-red-600">Subject must be at least 3 characters.</p>
            )}
            <div><Label className="text-xs text-[#475569]">Description *</Label>
              <Textarea value={formData.description} onChange={e => setFormData(p => ({ ...p, description: e.target.value }))} placeholder="Provide details about the issue..." className="mt-1 rounded-md h-24" required /></div>
            {formData.description.length > 0 && trimmedDescription.length < 10 && (
              <p className="text-xs text-red-600">Description must be at least 10 characters.</p>
            )}
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
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-3">
              <p className="text-xs font-medium text-[#475569]">Submitting as</p>
              <p className="text-sm font-semibold text-[#0F172A] mt-1">{currentRequester.name}</p>
              <p className="text-xs text-[#94A3B8]">{currentRequester.email || "Authenticated workspace user"}</p>
            </div>
            {/* Attachments Section */}
            <div>
              <Label className="text-xs text-[#475569]">Attachments</Label>
              <div
                className="mt-1 border-2 border-dashed border-[rgba(15,23,42,0.1)] rounded-md p-4 text-center cursor-pointer hover:border-[#0891B2]/40 hover:bg-[#0891B2]/5 transition-all"
                onClick={() => document.getElementById('ticket-file-input')?.click()}
                onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('border-[#0891B2]', 'bg-[#0891B2]/5'); }}
                onDragLeave={(e) => { e.preventDefault(); e.currentTarget.classList.remove('border-[#0891B2]', 'bg-[#0891B2]/5'); }}
                onDrop={(e) => {
                  e.preventDefault();
                  e.currentTarget.classList.remove('border-[#0891B2]', 'bg-[#0891B2]/5');
                  const files = Array.from(e.dataTransfer.files);
                  setSelectedFiles(prev => [...prev, ...files]);
                }}
              >
                <Paperclip size={20} className="text-[#94A3B8] mx-auto mb-2" />
                <p className="text-xs text-[#94A3B8]">Drag & drop files here or <span className="text-[#0891B2] font-medium">click to browse</span></p>
                <p className="text-[10px] text-[#CBD5E1] mt-1">Screenshots, videos, PDFs — up to 50MB each, max 10 files</p>
              </div>
              <input
                id="ticket-file-input"
                type="file"
                multiple
                accept="image/*,video/*,.pdf,.doc,.docx,.xls,.xlsx,.txt,.csv,.zip"
                className="hidden"
                onChange={(e) => {
                  const files = Array.from(e.target.files || []);
                  setSelectedFiles(prev => [...prev, ...files]);
                  e.target.value = '';
                }}
              />
              {selectedFiles.length > 0 && (
                <div className="mt-2 space-y-1.5">
                  {selectedFiles.map((file, idx) => {
                    const isImage = file.type.startsWith('image/');
                    const isVideo = file.type.startsWith('video/');
                    const FileTypeIcon = isImage ? Image : isVideo ? Film : FileIcon;
                    const sizeStr = file.size < 1024 * 1024 ? `${(file.size / 1024).toFixed(0)} KB` : `${(file.size / (1024 * 1024)).toFixed(1)} MB`;
                    return (
                      <div key={`${file.name}-${idx}`} className="flex items-center gap-2 p-2 bg-[#F8FAFC] rounded-md border border-[rgba(15,23,42,0.06)]">
                        <div className="w-7 h-7 rounded bg-[#0891B2]/10 flex items-center justify-center shrink-0"><FileTypeIcon size={14} className="text-[#0891B2]" /></div>
                        <div className="flex-1 min-w-0">
                          <p className="text-xs font-medium text-[#0F172A] truncate">{file.name}</p>
                          <p className="text-[10px] text-[#94A3B8]">{sizeStr}</p>
                        </div>
                        <button onClick={() => setSelectedFiles(prev => prev.filter((_, i) => i !== idx))} className="p-1 rounded hover:bg-red-50 text-[#94A3B8] hover:text-red-500 transition-colors"><X size={14} /></button>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>
          </div>
          <DialogFooter className="p-6 pt-0 gap-3">
            <Button variant="outline" onClick={() => { setIsFormOpen(false); setSelectedFiles([]); }} className="rounded-md">Cancel</Button>
            <Button onClick={handleCreateTicket} disabled={!canSubmitTicket || isSubmitting} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
              {isSubmitting ? <><RefreshCw size={16} className="mr-2 animate-spin" />Creating...</> : <><Plus size={16} className="mr-2" />Create Ticket</>}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Ticket Detail Dialog */}
      <Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
        <DialogContent className={cn(
          "p-0 overflow-hidden overflow-y-auto",
          isMobile ? "h-[100dvh] w-screen max-w-none rounded-none border-0" : "sm:max-w-[600px] rounded-md max-h-[90vh]",
        )}>
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
                {canManageTicketStatus ? (
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-[#94A3B8]">Update status:</span>
                    {(["open", "in-progress", "waiting", "resolved", "closed"] as Ticket["status"][]).map(s => (
                      <Button key={s} size="sm" variant={currentTicket.status === s ? "default" : "outline"}
                        className={cn("h-7 text-xs rounded-md capitalize", currentTicket.status === s && "bg-[#0891B2] hover:bg-[#0891B2]/90 text-white")}
                        onClick={() => { updateTicketStatus(currentTicket.id, s); }}>
                        {s.replace("-", " ")}
                      </Button>
                    ))}
                  </div>
                ) : (
                  <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-2 text-xs text-[#64748B]">
                    Only Super Admin can change ticket status.
                  </div>
                )}
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
