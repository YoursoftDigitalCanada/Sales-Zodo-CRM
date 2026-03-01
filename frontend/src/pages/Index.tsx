import { useEffect, useState, useRef, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import {
  fetchDashboardData,
  type DashboardLead,
  type DashboardInvoice,
  type DashboardProject,
} from "@/features/dashboard";
import { AiCopilotPanel } from "@/components/ai/AiCopilotPanel";
import { useToast } from "@/hooks/use-toast";
import {
  getNotifications,
  markAllAsRead as markAllNotificationsRead,
  type NotificationEntity,
} from "@/features/notifications";
import {
  FolderKanban, DollarSign, Users, Bell, Search, ChevronDown,
  Sun, Moon, Plus, TrendingUp, ArrowUpRight, Sparkles, Target,
  Clock, CheckCircle2, Calendar, MessageSquare, Zap, X, Command,
  Activity, AlertCircle, FileText, AlertTriangle, Briefcase,
  Eye, Send, ExternalLink, MoreHorizontal, RefreshCw,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// TYPES
// ============================================
type ThemeColor = "teal" | "gold" | "navy" | "green" | "blue" | "purple";

interface User { firstName: string; lastName: string; email?: string; role?: string; }
interface DashboardStats { projectsCount: number; clientsCount: number; earnings: number; pendingTasks: number; }
interface QuickAction { title: string; icon: React.ElementType; color: ThemeColor; path: string; description: string; }
interface ActivityItem { id: string; type: string; message: string; time: string; icon: React.ElementType; color: ThemeColor; }
interface BellNotification { id: string; title: string; message: string; time: string; icon: React.ElementType; color: ThemeColor; read: boolean; }

// Mapped UI types derived from API data
interface LeadItem {
  id: string; name: string; company: string; value: number;
  status: "hot" | "warm" | "cold" | "stalled";
  daysInStage: number; source: string; assignee: string;
}
interface InvoiceItem {
  id: string; client: string; amount: number; dueDate: string;
  status: "overdue" | "pending" | "paid" | "draft";
  daysOverdue?: number; invoiceNo: string;
}
interface ProjectItem {
  id: string; name: string; client: string; progress: number;
  status: "on-track" | "at-risk" | "delayed" | "completed";
  deadline: string; team: string[]; budget: number; spent: number;
}
interface SmartAlert {
  id: string; type: "warning" | "danger" | "info" | "success";
  title: string; message: string; action: string; actionPath: string;
}

// ============================================
// THEME COLORS
// ============================================
const themeColors: Record<ThemeColor, { bg: string; text: string; light: string; gradient: string }> = {
  teal: { bg: "bg-[#0891B2]", text: "text-[#0891B2]", light: "bg-[#0891B2]/10", gradient: "from-[#22D3EE]" },
  gold: { bg: "bg-[#D97706]", text: "text-[#D97706]", light: "bg-[#D97706]/10", gradient: "from-[#FBBF24]" },
  navy: { bg: "bg-[#EA580C]", text: "text-[#EA580C]", light: "bg-[#EA580C]/10", gradient: "from-[#F97316]" },
  green: { bg: "bg-[#16A34A]", text: "text-[#16A34A]", light: "bg-[#16A34A]/10", gradient: "from-[#4ADE80]" },
  blue: { bg: "bg-[#0891B2]", text: "text-[#0891B2]", light: "bg-[#0891B2]/10", gradient: "from-[#22D3EE]" },
  purple: { bg: "bg-[#EA580C]", text: "text-[#EA580C]", light: "bg-[#EA580C]/10", gradient: "from-[#F97316]" },
};
const getColorClasses = (color: ThemeColor) => themeColors[color] || themeColors.teal;

// ============================================
// STATIC DATA
// ============================================
const quickActions: QuickAction[] = [
  { title: "New Project", icon: FolderKanban, color: "teal", path: "/projects/add", description: "Create a new project" },
  { title: "Add Client", icon: Users, color: "gold", path: "/clients/new", description: "Add a new client" },
  { title: "Create Invoice", icon: DollarSign, color: "navy", path: "/invoices/new", description: "Generate invoice" },
  { title: "Schedule Meeting", icon: Calendar, color: "purple", path: "/bookings/new", description: "Book a meeting" },
];

// Map API notification type → icon & color for the bell dropdown
const bellTypeConfig: Record<string, { icon: React.ElementType; color: ThemeColor }> = {
  info: { icon: Activity, color: "blue" },
  success: { icon: CheckCircle2, color: "green" },
  warning: { icon: AlertTriangle, color: "gold" },
  error: { icon: AlertCircle, color: "navy" },
  message: { icon: MessageSquare, color: "teal" },
  task: { icon: CheckCircle2, color: "purple" },
  deal: { icon: DollarSign, color: "green" },
  calendar: { icon: Calendar, color: "teal" },
  system: { icon: Zap, color: "navy" },
  mention: { icon: Users, color: "teal" },
};

function formatRelativeTime(ts: string): string {
  const now = Date.now();
  const date = new Date(ts).getTime();
  if (isNaN(date)) return "";
  const diff = (now - date) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return new Date(ts).toLocaleDateString("en-CA", { month: "short", day: "numeric" });
}

function mapApiNotification(n: NotificationEntity): BellNotification {
  const config = bellTypeConfig[n.type] || bellTypeConfig.info;
  return {
    id: n.id,
    title: n.title || "Notification",
    message: n.message || "",
    time: formatRelativeTime(n.createdAt),
    icon: config.icon,
    color: config.color,
    read: n.isRead,
  };
}

// ── Data mappers ───────────────────────────────────────────────────────
function mapLead(l: DashboardLead): LeadItem {
  const daysSinceUpdate = Math.floor((Date.now() - new Date(l.updatedAt).getTime()) / 86400000);
  const temp = (l.temperature || "WARM").toLowerCase() as "hot" | "warm" | "cold";
  const isStalled = daysSinceUpdate > 7 && temp !== "hot";
  return {
    id: l.id,
    name: `${l.firstName} ${l.lastName}`,
    company: l.companyName || "—",
    value: Number(l.potentialValue || 0),
    status: isStalled ? "stalled" : temp,
    daysInStage: daysSinceUpdate,
    source: l.leadSource?.name || "Direct",
    assignee: l.assignedTo ? `${(l.assignedTo.firstName || "?")[0]}${(l.assignedTo.lastName || "?")[0]}` : "—",
  };
}

function mapInvoice(inv: DashboardInvoice): InvoiceItem {
  const due = new Date(inv.dueDate);
  const now = new Date();
  const daysOverdue = inv.status === "OVERDUE" ? Math.max(0, Math.floor((now.getTime() - due.getTime()) / 86400000)) : undefined;
  const clientName = inv.client?.companyName || [inv.client?.firstName, inv.client?.lastName].filter(Boolean).join(" ") || "—";
  const statusMap: Record<string, InvoiceItem["status"]> = { OVERDUE: "overdue", SENT: "pending", VIEWED: "pending", PARTIALLY_PAID: "pending", PAID: "paid", DRAFT: "draft", CANCELLED: "draft", REFUNDED: "draft" };
  return {
    id: inv.id,
    client: clientName,
    amount: Number(inv.total || 0),
    dueDate: due.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }),
    status: statusMap[inv.status] || "draft",
    daysOverdue,
    invoiceNo: inv.invoiceNumber,
  };
}

function mapProject(p: DashboardProject): ProjectItem {
  const clientName = p.client?.companyName || [p.client?.firstName, p.client?.lastName].filter(Boolean).join(" ") || "—";
  const statusMap: Record<string, ProjectItem["status"]> = { ACTIVE: "on-track", PLANNING: "on-track", ON_HOLD: "delayed", COMPLETED: "completed", CANCELLED: "delayed", ARCHIVED: "completed" };
  const members = (p.members || []).map((m) => m.employee ? `${m.employee.firstName[0]}${m.employee.lastName[0]}` : "??");
  return {
    id: p.id,
    name: p.name,
    client: clientName,
    progress: p.progress || 0,
    status: statusMap[p.status] || "on-track",
    deadline: p.endDate ? new Date(p.endDate).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" }) : "—",
    team: members.length ? members : ["—"],
    budget: Number(p.budget || 0),
    spent: 0,
  };
}

function buildAlerts(leads: LeadItem[], invoices: InvoiceItem[], projects: ProjectItem[]): SmartAlert[] {
  const alerts: SmartAlert[] = [];
  const overdue = invoices.filter((i) => i.status === "overdue");
  if (overdue.length > 0) {
    const total = overdue.reduce((s, i) => s + i.amount, 0);
    alerts.push({ id: "a-overdue", type: "danger", title: `${overdue.length} Invoice${overdue.length > 1 ? "s" : ""} Overdue`, message: `$${total.toLocaleString()} in overdue payments need immediate attention`, action: "View Invoices", actionPath: "/invoices" });
  }
  const stalled = leads.filter((l) => l.status === "stalled");
  if (stalled.length > 0) {
    alerts.push({ id: "a-stalled", type: "warning", title: `${stalled.length} Lead${stalled.length > 1 ? "s" : ""} Stalled`, message: `${stalled.map((l) => l.name).slice(0, 2).join(" and ")} haven't progressed in 7+ days`, action: "Follow Up", actionPath: "/leads" });
  }
  const atRisk = projects.filter((p) => p.status === "at-risk" || p.status === "delayed");
  if (atRisk.length > 0) {
    alerts.push({ id: "a-risk", type: "warning", title: `${atRisk.length} Project${atRisk.length > 1 ? "s" : ""} At Risk`, message: `${atRisk.map((p) => p.name).slice(0, 2).join(", ")} need attention`, action: "View Projects", actionPath: "/projects" });
  }
  const hot = leads.filter((l) => l.status === "hot");
  if (hot.length > 0) {
    const val = hot.reduce((s, l) => s + l.value, 0);
    alerts.push({ id: "a-hot", type: "info", title: `${hot.length} Hot Lead${hot.length > 1 ? "s" : ""}`, message: `${hot.map((l) => `${l.name} ($${(l.value / 1000).toFixed(0)}K)`).slice(0, 2).join(" and ")} ready to close`, action: "View Pipeline", actionPath: "/leads" });
  }
  return alerts;
}

// ============================================
// MAIN COMPONENT
// ============================================
const Index = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // Existing state
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({ projectsCount: 0, clientsCount: 0, earnings: 0, pendingTasks: 0 });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<BellNotification[]>([]);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);

  // API-backed dashboard state
  const [dismissedAlerts, setDismissedAlerts] = useState<string[]>([]);
  const [leads, setLeads] = useState<LeadItem[]>([]);
  const [invoices, setInvoices] = useState<InvoiceItem[]>([]);
  const [projects, setProjects] = useState<ProjectItem[]>([]);
  const [recentActivity, setRecentActivity] = useState<ActivityItem[]>([]);

  // Refs
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // EFFECTS (all preserved from original)
  // ============================================
  useEffect(() => { const timer = setInterval(() => setCurrentTime(new Date()), 60000); return () => clearInterval(timer); }, []);

  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) { try { setUser(JSON.parse(storedUser)); } catch (e) { console.error("Failed to parse user data"); } }
  }, []);

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);
    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) document.documentElement.classList.add("dark");
  }, []);

  useEffect(() => {
    const loadDashboard = async () => {
      setIsLoading(true);
      try {
        const data = await fetchDashboardData();
        setStats({
          projectsCount: data.projectsCount || 0,
          clientsCount: data.clientsCount || 0,
          earnings: data.totalEarnings || 0,
          pendingTasks: data.pendingTasks || 0,
        });
        setLeads(data.leads.map(mapLead));
        setInvoices(data.invoices.map(mapInvoice));
        setProjects(data.projects.map(mapProject));

        // Build recent activity from latest data
        const acts: ActivityItem[] = [];
        data.projects.slice(0, 2).forEach((p, i) => acts.push({ id: `p-${p.id}`, type: "project", message: `Project '${p.name}' — ${p.status.toLowerCase().replace("_", " ")}`, time: new Date(p.startDate || p.endDate || Date.now()).toLocaleDateString(), icon: FolderKanban, color: "teal" }));
        data.invoices.filter((inv) => inv.status === "PAID").slice(0, 1).forEach((inv) => acts.push({ id: `inv-${inv.id}`, type: "payment", message: `Payment received — $${Number(inv.total).toLocaleString()}`, time: inv.paidAt ? new Date(inv.paidAt).toLocaleDateString() : "Recently", icon: DollarSign, color: "green" }));
        data.leads.slice(0, 1).forEach((l) => acts.push({ id: `l-${l.id}`, type: "lead", message: `Lead '${l.firstName} ${l.lastName}' added`, time: new Date(l.createdAt).toLocaleDateString(), icon: Users, color: "gold" }));
        setRecentActivity(acts.length ? acts : [{ id: "empty", type: "info", message: "No recent activity", time: "Now", icon: CheckCircle2, color: "blue" }]);
      } catch (error) {
        console.error("Error fetching dashboard data:", error);
        setStats({ projectsCount: 0, clientsCount: 0, earnings: 0, pendingTasks: 0 });
      } finally { setIsLoading(false); }
    };
    loadDashboard();

    // Fetch real notifications for the bell dropdown
    const loadNotifications = async () => {
      try {
        const data = await getNotifications({ limit: 10 });
        setNotifications(data.map(mapApiNotification));
      } catch (err) {
        console.error("Failed to fetch notifications for bell:", err);
      }
    };
    loadNotifications();
  }, []);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (notificationRef.current && !notificationRef.current.contains(event.target as Node)) setShowNotifications(false);
      if (profileRef.current && !profileRef.current.contains(event.target as Node)) setShowProfileMenu(false);
    };
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      if ((event.metaKey || event.ctrlKey) && event.key === "k") { event.preventDefault(); setShowSearchModal(true); setTimeout(() => searchInputRef.current?.focus(), 100); }
      if (event.key === "Escape") { setShowSearchModal(false); setShowNotifications(false); setShowProfileMenu(false); }
    };
    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ============================================
  // HANDLERS
  // ============================================
  const getGreeting = () => { const h = currentTime.getHours(); return h < 12 ? "Good Morning" : h < 18 ? "Good Afternoon" : "Good Evening"; };
  const toggleDarkMode = () => { const n = !isDarkMode; setIsDarkMode(n); localStorage.setItem("theme", n ? "dark" : "light"); n ? document.documentElement.classList.add("dark") : document.documentElement.classList.remove("dark"); };
  const handleMarkAllAsRead = async () => {
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    try { await markAllNotificationsRead(); } catch { /* optimistic */ }
  };
  const handleQuickAction = (path: string) => navigate(path);
  const handleLogout = () => { localStorage.removeItem("user"); localStorage.removeItem("token"); navigate("/login"); };
  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  const handleDismissAlert = (id: string) => { setDismissedAlerts((p) => [...p, id]); toast({ title: "Alert Dismissed", description: "You can view dismissed alerts in notifications." }); };
  const handleFollowUpLead = (lead: LeadItem) => { toast({ title: "Follow-up Initiated", description: `Email queued for ${lead.name} at ${lead.company}.` }); };
  const handleSendReminder = (inv: InvoiceItem) => { toast({ title: "Reminder Sent", description: `Payment reminder sent for ${inv.invoiceNo} to ${inv.client}.` }); };

  const smartAlerts = buildAlerts(leads, invoices, projects);
  const visibleAlerts = smartAlerts.filter((a) => !dismissedAlerts.includes(a.id));
  const stalledLeads = leads.filter((l) => l.status === "stalled");
  const hotLeads = leads.filter((l) => l.status === "hot");
  const overdueInvoices = invoices.filter((i) => i.status === "overdue");
  const pendingInvoices = invoices.filter((i) => i.status === "pending");
  const totalOverdue = overdueInvoices.reduce((s, i) => s + i.amount, 0);
  const atRiskProjects = projects.filter((p) => p.status === "at-risk" || p.status === "delayed");

  // ============================================
  // RENDER
  // ============================================
  return (
    <div className={cn("min-h-screen w-full bg-[#F8FAFC]")}>
      <main>
        {/* ============= HEADER ============= */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[rgba(15,23,42,0.06)]">
          <div className="flex h-12 items-center justify-between px-3 md:px-5">
            <div className="flex items-center gap-2 md:gap-6 flex-1 min-w-0">
              <div className="relative flex-1 max-w-[140px] sm:max-w-xs md:max-w-none md:flex-none md:w-64">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                <input type="text" placeholder="Search anything..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} onClick={() => setShowSearchModal(true)} className="w-full h-8 pl-9 pr-4 md:pr-14 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#22D3EE]/30 transition-colors" />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#F1F5F9] text-[10px] text-[#475569] border border-[rgba(15,23,42,0.06)] font-mono hidden md:flex items-center gap-1"><Command size={10} />K</kbd>
              </div>
            </div>
            <div className="flex items-center gap-1.5 sm:gap-2 md:gap-3 flex-shrink-0">
              <button onClick={() => setShowCopilot(true)} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2]/8 text-[#0891B2] text-xs font-medium rounded-md hover:bg-[#0891B2]/14 transition-colors border border-[#0891B2]/15">
                <Sparkles size={14} /><span className="hidden sm:inline">Ask Experts</span>
              </button>
              <button onClick={() => navigate("/projects/add")} className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2] text-white text-xs font-medium rounded-md hover:bg-[#0891B2]/90 transition-colors">
                <Plus size={14} /><span className="hidden sm:inline">New</span>
              </button>
              <button onClick={toggleDarkMode} className="p-2 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:text-[#475569] transition-colors">
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>
              <div ref={notificationRef} className="relative">
                <button onClick={() => setShowNotifications(!showNotifications)} className="relative p-2 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:text-[#475569] transition-colors">
                  <Bell size={15} />
                  {unreadNotificationsCount > 0 && <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EA580C] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-[#F8FAFC]">{unreadNotificationsCount}</span>}
                </button>
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 mt-2 w-[calc(100vw-2rem)] sm:w-80 max-w-80 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50">
                      <div className="p-4 border-b border-[rgba(15,23,42,0.06)]"><div className="flex items-center justify-between"><h4 className="font-semibold text-[#0F172A]">Notifications</h4><button onClick={handleMarkAllAsRead} className="text-xs text-[#0891B2] font-medium cursor-pointer hover:underline">Mark all as read</button></div></div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => {
                          const colors = getColorClasses(notification.color); return (
                            <div key={notification.id} className={cn("p-4 hover:bg-white transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0", !notification.read && "bg-[#0891B2]/5")}>
                              <div className="flex gap-3">
                                <div className={cn("w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0", colors.light)}><notification.icon size={18} className={colors.text} /></div>
                                <div className="flex-1 min-w-0"><p className="text-sm font-medium text-[#0F172A]">{notification.title}</p><p className="text-sm text-[#475569]">{notification.message}</p><p className="text-xs text-[#475569] mt-1">{notification.time}</p></div>
                                {!notification.read && <div className="w-2 h-2 rounded-full bg-[#0891B2] flex-shrink-0 mt-2" />}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-3 bg-white text-center border-t border-[rgba(15,23,42,0.06)]"><button onClick={() => navigate("/notifications")} className="text-sm text-[#0891B2] font-medium hover:underline">View All Notifications</button></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
              <div ref={profileRef} className="relative flex items-center gap-3 pl-3 ml-3 border-l border-[rgba(15,23,42,0.06)] hidden md:flex">
                <div className="text-right hidden sm:block"><p className="text-sm font-semibold text-[#0F172A]">{user ? `${user.firstName} ${user.lastName}` : "Guest User"}</p><p className="text-xs text-[#94A3B8]">{user?.role || "Administrator"}</p></div>
                <motion.button whileHover={{ scale: 1.05 }} onClick={() => setShowProfileMenu(!showProfileMenu)} className="relative cursor-pointer flex items-center gap-2">
                  <div className="h-8 w-8 rounded-md bg-[#0891B2] flex items-center justify-center text-white text-xs font-bold">{user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "GU"}</div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#F8FAFC]" />
                </motion.button>
                <ChevronDown size={16} className={cn("text-[#475569] transition-transform", showProfileMenu && "rotate-180")} />
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div initial={{ opacity: 0, y: 10, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: 10, scale: 0.95 }} transition={{ duration: 0.15 }} className="absolute right-0 top-full mt-2 w-56 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50">
                      <div className="p-4 border-b border-[rgba(15,23,42,0.06)]"><p className="font-semibold text-[#0F172A]">{user ? `${user.firstName} ${user.lastName}` : "Guest User"}</p><p className="text-xs text-[#475569] truncate">{user?.email || "guest@yoursoft.ca"}</p></div>
                      <div className="p-2">
                        <button onClick={() => navigate("/settings/profile")} className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors">Profile Settings</button>
                        <button onClick={() => navigate("/settings")} className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors">Account Settings</button>
                        <button onClick={() => navigate("/help")} className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors">Help & Support</button>
                      </div>
                      <div className="p-2 border-t border-[rgba(15,23,42,0.06)]"><button onClick={handleLogout} className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors">Sign Out</button></div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* ============= MAIN CONTENT ============= */}
        <div className="p-4 md:p-6 space-y-4 md:space-y-6 page-enter">

          {/* ===== GREETING + AI OVERVIEW ===== */}
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div>
              <h1 className="text-xl font-bold text-[#0F172A]">{getGreeting()}, {user ? user.firstName : "there"} 👋</h1>
              <p className="text-xs text-[#94A3B8] mt-0.5">{currentTime.toLocaleDateString("en-US", { weekday: "long", month: "long", day: "numeric", year: "numeric" })}</p>
            </div>
            <div className="flex items-center gap-2">
              <span className="ai-tag">LIVE</span>
              <span className="text-[10px] text-[#94A3B8]">Updated just now</span>
            </div>
          </div>

          {/* ===== SMART ALERTS ===== */}
          {visibleAlerts.length > 0 && (
            <div className="space-y-2">
              {visibleAlerts.map((alert) => (
                <motion.div key={alert.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, height: 0 }} className={cn("flex items-center gap-3 px-4 py-2.5 rounded-lg border", alert.type === "danger" ? "bg-[#DC2626]/5 border-[#DC2626]/15" : alert.type === "warning" ? "bg-[#D97706]/5 border-[#D97706]/15" : "bg-[#0891B2]/5 border-[#0891B2]/15")}>
                  <AlertTriangle size={14} className={alert.type === "danger" ? "text-[#DC2626]" : alert.type === "warning" ? "text-[#D97706]" : "text-[#0891B2]"} />
                  <div className="flex-1 min-w-0">
                    <span className="text-xs font-semibold text-[#0F172A]">{alert.title}</span>
                    <span className="text-xs text-[#475569] ml-2">{alert.message}</span>
                  </div>
                  <button onClick={() => navigate(alert.actionPath)} className="text-[11px] font-medium text-[#0891B2] hover:underline whitespace-nowrap">{alert.action}</button>
                  <button onClick={() => handleDismissAlert(alert.id)} className="text-[#94A3B8] hover:text-[#475569]"><X size={14} /></button>
                </motion.div>
              ))}
            </div>
          )}

          {/* ===== AI BUSINESS OVERVIEW ===== */}
          <div className="bg-white rounded-lg border-l-[3px] border-l-[#0891B2] p-0 overflow-hidden ai-hero-pulse" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.05)' }}>
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#0891B2]/8 flex items-center justify-center"><Sparkles size={16} className="text-[#0891B2]" /></div>
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A] tracking-tight">AI Business Intelligence</h2>
                  <p className="text-[11px] text-[#94A3B8]">Real-time insights across your CRM</p>
                </div>
              </div>
              <div className="flex items-center gap-2">
                <span className="ai-tag">AI</span>
              </div>
            </div>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-5 divide-x divide-y md:divide-y-0 divide-[rgba(15,23,42,0.06)]">
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2"><Activity size={12} className="text-[#94A3B8]" /><span className="metric-label">Pipeline Health</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-[#0F172A] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{stalledLeads.length > 0 ? "Medium Risk" : "Healthy"}</span></div>
                <p className="text-[11px] text-[#475569] leading-relaxed"><span className="text-[#EA580C] font-medium">{stalledLeads.length} leads</span> stalled &gt;5 days</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2"><TrendingUp size={12} className="text-[#94A3B8]" /><span className="metric-label">Revenue Forecast</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-[#0F172A] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>+12%</span><span className="text-[11px] text-[#16A34A] font-medium">↑ trending</span></div>
                <p className="text-[11px] text-[#475569]">vs previous period</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2"><DollarSign size={12} className="text-[#94A3B8]" /><span className="metric-label">Overdue Amount</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-[#DC2626] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>${totalOverdue.toLocaleString()}</span></div>
                <p className="text-[11px] text-[#475569]">{overdueInvoices.length} invoices past due</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2"><AlertCircle size={12} className="text-[#94A3B8]" /><span className="metric-label">Priority Actions</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-[#EA580C] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.pendingTasks + overdueInvoices.length + stalledLeads.length}</span><span className="text-[11px] text-[#94A3B8] font-medium">items</span></div>
                <p className="text-[11px] text-[#475569]">Require immediate attention</p>
              </div>
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2"><Target size={12} className="text-[#94A3B8]" /><span className="metric-label">Hot Pipeline</span></div>
                <div className="flex items-center gap-2 mb-1"><span className="text-lg font-bold text-[#16A34A] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>${hotLeads.reduce((s, l) => s + l.value, 0).toLocaleString()}</span></div>
                <p className="text-[11px] text-[#475569]">{hotLeads.length} leads ready to close</p>
              </div>
            </div>
          </div>

          {/* ===== AI DAILY SUMMARY ===== */}
          <div className="ai-insight-enter" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 px-1 mb-3"><Sparkles size={13} className="text-[#0891B2]" /><span className="text-xs font-semibold text-[#0F172A]">Daily AI Summary</span><span className="ai-tag">AI</span></div>
            <div className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] px-5 py-3" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
              <p className="text-[12px] text-[#475569] leading-relaxed">
                <span className="text-[#0F172A] font-medium">Today's overview:</span>{' '}
                {overdueInvoices.length > 0 && <><span className="text-[#DC2626] font-medium">${totalOverdue.toLocaleString()}</span> in overdue invoices. </>}
                {stalledLeads.length > 0 && <><span className="text-[#D97706] font-medium">{stalledLeads.length} stalled leads</span> need follow-up. </>}
                {hotLeads.length > 0 && <><span className="text-[#16A34A] font-medium">{hotLeads.length} hot leads</span> worth ${hotLeads.reduce((s, l) => s + l.value, 0).toLocaleString()} are ready to close. </>}
                {atRiskProjects.length > 0 && <><span className="text-[#EA580C] font-medium">{atRiskProjects.length} project{atRiskProjects.length > 1 ? 's' : ''}</span> need attention. </>}
                {stats.pendingTasks > 0 ? `${stats.pendingTasks} tasks pending.` : 'All tasks on track.'}
                {stats.projectsCount > 0 ? ` ${stats.projectsCount} active projects.` : ''}
              </p>
            </div>
          </div>

          {/* ===== QUICK ACTIONS ===== */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-3 md:gap-4">
            {quickActions.map((action, index) => {
              const colors = getColorClasses(action.color); return (
                <motion.button key={index} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.1 * index }} whileHover={{ scale: 1.01, y: -2 }} whileTap={{ scale: 0.99 }} onClick={() => handleQuickAction(action.path)} className="flex items-center gap-4 p-4 bg-white rounded-md card-shadow hover:shadow-md transition-all group">
                  <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center"><action.icon size={20} className="text-[#475569]" /></div>
                  <div className="text-left"><p className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{action.title}</p><p className="text-xs text-[#475569]">{action.description}</p></div>
                  <ArrowUpRight size={16} className="ml-auto text-[#94A3B8] group-hover:text-[#0891B2] transition-colors" />
                </motion.button>
              );
            })}
          </div>

          {/* ===== STAT CARDS ===== */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4 stagger-enter">
            <StatCard title="Active Projects" value={stats.projectsCount} subtitle="Total projects" trend={0} comparison="Current" icon={FolderKanban} color="cyan" isLoading={isLoading} lastUpdated="Updated just now" aiInsight={stats.projectsCount > 0 ? "Delivery pace on track" : undefined} />
            <StatCard title="Total Earnings" value={`$${stats.earnings.toLocaleString()}`} subtitle="Paid invoices" trend={0} comparison="Current" icon={DollarSign} color="orange" isLoading={isLoading} lastUpdated="Updated just now" aiInsight={stats.earnings > 0 ? "From paid invoices" : undefined} />
            <StatCard title="Total Clients" value={stats.clientsCount} subtitle="Active clients" trend={0} comparison="Current" icon={Users} color="green" isLoading={isLoading} lastUpdated="Updated just now" aiInsight={stats.clientsCount > 0 ? `${stats.clientsCount} active` : undefined} />
            <StatCard title="Pending Tasks" value={stats.pendingTasks} subtitle="Needs action" trend={0} comparison="Current" icon={Clock} color="purple" isLoading={isLoading} lastUpdated="Updated just now" aiInsight={stats.pendingTasks > 5 ? "Prioritize overdue items" : "On track"} />
          </div>

          {/* ===== LEADS & INVOICES ROW ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 md:gap-6">

            {/* Leads Tracker */}
            <div className="bg-white rounded-lg card-shadow overflow-hidden">
              <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#0891B2]/10 flex items-center justify-center"><Target size={16} className="text-[#0891B2]" /></div>
                    <div><h3 className="font-semibold text-sm text-[#0F172A]">Lead Pipeline</h3><p className="text-[11px] text-[#94A3B8]">{hotLeads.length} hot · {stalledLeads.length} stalled</p></div>
                  </div>
                  <button onClick={() => navigate("/leads")} className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1">View All <ArrowUpRight size={12} /></button>
                </div>
              </div>
              <div className="divide-y divide-[rgba(15,23,42,0.04)] max-h-[320px] overflow-y-auto">
                {leads.map((lead) => (
                  <div key={lead.id} className="px-5 py-3 hover:bg-[#F8FAFC] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className={cn("w-2 h-2 rounded-full", lead.status === "hot" ? "bg-[#DC2626]" : lead.status === "warm" ? "bg-[#D97706]" : lead.status === "stalled" ? "bg-[#EA580C]" : "bg-[#94A3B8]")} />
                        <span className="text-xs font-medium text-[#0F172A]">{lead.name}</span>
                        <span className="text-[10px] text-[#94A3B8]">· {lead.company}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#0F172A]">${lead.value.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", lead.status === "hot" ? "bg-[#DC2626]/10 text-[#DC2626]" : lead.status === "stalled" ? "bg-[#EA580C]/10 text-[#EA580C]" : lead.status === "warm" ? "bg-[#D97706]/10 text-[#D97706]" : "bg-[#94A3B8]/10 text-[#94A3B8]")}>{lead.status}</span>
                        <span className="text-[10px] text-[#94A3B8]">{lead.daysInStage}d in stage</span>
                      </div>
                      {(lead.status === "stalled" || lead.status === "hot") && (
                        <button onClick={() => handleFollowUpLead(lead)} className="text-[10px] font-medium text-[#0891B2] hover:underline flex items-center gap-1"><Send size={10} /> Follow Up</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Invoices Tracker */}
            <div className="bg-white rounded-lg card-shadow overflow-hidden">
              <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-9 h-9 rounded-md bg-[#EA580C]/10 flex items-center justify-center"><FileText size={16} className="text-[#EA580C]" /></div>
                    <div><h3 className="font-semibold text-sm text-[#0F172A]">Invoice Tracker</h3><p className="text-[11px] text-[#94A3B8]">{overdueInvoices.length} overdue · {pendingInvoices.length} pending</p></div>
                  </div>
                  <button onClick={() => navigate("/invoices")} className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1">View All <ArrowUpRight size={12} /></button>
                </div>
              </div>
              <div className="divide-y divide-[rgba(15,23,42,0.04)] max-h-[320px] overflow-y-auto">
                {invoices.map((inv) => (
                  <div key={inv.id} className="px-5 py-3 hover:bg-[#F8FAFC] transition-colors">
                    <div className="flex items-center justify-between mb-1">
                      <div className="flex items-center gap-2">
                        <span className="text-[10px] text-[#94A3B8] font-mono">{inv.invoiceNo}</span>
                        <span className="text-xs font-medium text-[#0F172A]">{inv.client}</span>
                      </div>
                      <span className="text-xs font-semibold text-[#0F172A]">${inv.amount.toLocaleString()}</span>
                    </div>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <span className={cn("px-1.5 py-0.5 rounded text-[9px] font-bold uppercase", inv.status === "overdue" ? "bg-[#DC2626]/10 text-[#DC2626]" : inv.status === "pending" ? "bg-[#D97706]/10 text-[#D97706]" : inv.status === "paid" ? "bg-[#16A34A]/10 text-[#16A34A]" : "bg-[#94A3B8]/10 text-[#94A3B8]")}>{inv.status}</span>
                        <span className="text-[10px] text-[#94A3B8]">Due {inv.dueDate}</span>
                        {inv.daysOverdue && <span className="text-[10px] text-[#DC2626] font-medium">({inv.daysOverdue}d late)</span>}
                      </div>
                      {inv.status === "overdue" && (
                        <button onClick={() => handleSendReminder(inv)} className="text-[10px] font-medium text-[#DC2626] hover:underline flex items-center gap-1"><Send size={10} /> Remind</button>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* ===== PROJECTS OVERVIEW ===== */}
          <div className="bg-white rounded-lg card-shadow overflow-hidden">
            <div className="p-5 border-b border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-9 h-9 rounded-md bg-[#7C3AED]/10 flex items-center justify-center"><Briefcase size={16} className="text-[#7C3AED]" /></div>
                  <div><h3 className="font-semibold text-sm text-[#0F172A]">Projects Overview</h3><p className="text-[11px] text-[#94A3B8]">{projects.filter(p => p.status !== "completed").length} active · {atRiskProjects.length} need attention</p></div>
                </div>
                <button onClick={() => navigate("/projects")} className="text-xs text-[#0891B2] font-medium hover:underline flex items-center gap-1">View All <ArrowUpRight size={12} /></button>
              </div>
            </div>
            <div className="responsive-table">
              <table className="w-full text-xs min-w-[700px]">
                <thead className="sticky-thead"><tr className="bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.08)]">
                  <th className="text-left py-3 px-5 text-[#94A3B8] font-medium">Project</th>
                  <th className="text-left py-3 px-5 text-[#94A3B8] font-medium">Client</th>
                  <th className="text-center py-3 px-5 text-[#94A3B8] font-medium">Progress</th>
                  <th className="text-center py-3 px-5 text-[#94A3B8] font-medium">Status</th>
                  <th className="text-center py-3 px-5 text-[#94A3B8] font-medium">Budget</th>
                  <th className="text-left py-3 px-5 text-[#94A3B8] font-medium">Deadline</th>
                  <th className="text-center py-3 px-5 text-[#94A3B8] font-medium">Team</th>
                </tr></thead>
                <tbody>{projects.map((proj) => (
                  <tr key={proj.id} className="border-b border-[rgba(15,23,42,0.04)] hover:bg-[#F8FAFC] cursor-pointer" onClick={() => navigate("/projects")}>
                    <td className="py-3 px-5 font-medium text-[#0F172A]">{proj.name}</td>
                    <td className="py-3 px-5 text-[#475569]">{proj.client}</td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-center gap-2">
                        <div className="w-20 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden"><div className="h-full rounded-full" style={{ width: `${proj.progress}%`, backgroundColor: proj.progress === 100 ? "#16A34A" : proj.progress > 60 ? "#0891B2" : proj.progress > 30 ? "#D97706" : "#DC2626" }} /></div>
                        <span className="text-[10px] font-medium text-[#475569] w-8">{proj.progress}%</span>
                      </div>
                    </td>
                    <td className="py-3 px-5 text-center"><span className={cn("px-2 py-0.5 rounded-full text-[10px] font-semibold", proj.status === "on-track" ? "bg-[#16A34A]/10 text-[#16A34A]" : proj.status === "at-risk" ? "bg-[#D97706]/10 text-[#D97706]" : proj.status === "delayed" ? "bg-[#DC2626]/10 text-[#DC2626]" : "bg-[#94A3B8]/10 text-[#94A3B8]")}>{proj.status.replace("-", " ")}</span></td>
                    <td className="py-3 px-5 text-center">
                      <div><span className="text-[#0F172A] font-medium">${(proj.spent / 1000).toFixed(0)}k</span><span className="text-[#94A3B8]"> / ${(proj.budget / 1000).toFixed(0)}k</span></div>
                    </td>
                    <td className="py-3 px-5 text-[#475569]">{proj.deadline}</td>
                    <td className="py-3 px-5">
                      <div className="flex items-center justify-center -space-x-1.5">{proj.team.slice(0, 3).map((t, i) => <div key={i} className="w-6 h-6 rounded-full bg-[#0891B2]/10 border-2 border-white flex items-center justify-center text-[8px] font-bold text-[#0891B2]">{t}</div>)}{proj.team.length > 3 && <div className="w-6 h-6 rounded-full bg-[#F1F5F9] border-2 border-white flex items-center justify-center text-[8px] font-bold text-[#475569]">+{proj.team.length - 3}</div>}</div>
                    </td>
                  </tr>
                ))}</tbody>
              </table>
            </div>
          </div>

          {/* ===== CHARTS & CALENDAR ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.3 }} className="lg:col-span-2"><ProjectsChart /></motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.4 }}><CalendarWidget /></motion.div>
          </div>

          {/* ===== ACTIVITY & PROJECTS TABLE ===== */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 md:gap-6">
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.5 }} className="bg-white border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
              <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3"><div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center"><Zap size={18} className="text-[#0891B2]" /></div><div><h3 className="font-semibold text-[#0F172A]">Recent Activity</h3><p className="text-xs text-[#475569]">Latest updates</p></div></div>
                  <button onClick={() => navigate("/activity")} className="text-sm text-[#0891B2] font-medium hover:underline">View All</button>
                </div>
              </div>
              <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                {recentActivity.map((activity, index) => {
                  const colors = getColorClasses(activity.color); return (
                    <motion.div key={activity.id} initial={{ opacity: 0, x: -20 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: 0.1 * index }} className="p-4 hover:bg-white transition-colors cursor-pointer group">
                      <div className="flex items-start gap-3">
                        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0", colors.light)}><activity.icon size={18} className={colors.text} /></div>
                        <div className="flex-1 min-w-0"><p className="text-sm text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{activity.message}</p><p className="text-xs text-[#475569] mt-1 flex items-center gap-1"><Clock size={10} />{activity.time}</p></div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>
            <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: 0.6 }} className="lg:col-span-2"><ProjectsTable /></motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.06)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-2 md:gap-4 text-xs md:text-sm text-[#94A3B8]">
            <div className="flex items-center gap-2"><span>© {new Date().getFullYear()}</span><span className="font-semibold text-[#0F172A]">ZODO</span><span className="text-[#0891B2] font-semibold">CRM</span><span>• All rights reserved</span></div>
            <div className="flex items-center gap-4"><a href="#" className="hover:text-[#0891B2] transition-colors">Privacy</a><a href="#" className="hover:text-[#0891B2] transition-colors">Terms</a><a href="#" className="hover:text-[#0891B2] transition-colors">Support</a></div>
          </div>
        </footer>
      </main>

      {/* Search Modal */}
      <AnimatePresence>
        {showSearchModal && (
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }} className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md" onClick={() => setShowSearchModal(false)}>
            <motion.div initial={{ opacity: 0, y: -20, scale: 0.95 }} animate={{ opacity: 1, y: 0, scale: 1 }} exit={{ opacity: 0, y: -20, scale: 0.95 }} onClick={(e) => e.stopPropagation()} className="w-full max-w-2xl bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden">
              <div className="flex items-center gap-3 p-4 border-b border-[rgba(15,23,42,0.06)]">
                <Search size={20} className="text-[#475569]" />
                <input ref={searchInputRef} type="text" placeholder="Search projects, clients, invoices..." value={searchQuery} onChange={(e) => setSearchQuery(e.target.value)} className="flex-1 bg-transparent text-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none" />
                <button onClick={() => setShowSearchModal(false)} className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#475569] transition-colors"><X size={18} /></button>
              </div>
              <div className="p-4">
                <p className="text-xs font-medium text-[#475569] uppercase tracking-wider mb-3">Quick Actions</p>
                <div className="space-y-1">{quickActions.map((action, index) => {
                  const colors = getColorClasses(action.color); return (
                    <button key={index} onClick={() => { handleQuickAction(action.path); setShowSearchModal(false); }} className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white transition-colors group">
                      <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}><action.icon size={18} className={colors.text} /></div>
                      <div className="text-left"><p className="text-sm font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">{action.title}</p><p className="text-xs text-[#475569]">{action.description}</p></div>
                      <ArrowUpRight size={14} className="ml-auto text-[#94A3B8] group-hover:text-[#0891B2] transition-colors" />
                    </button>
                  );
                })}</div>
              </div>
              <div className="px-4 py-3 bg-white border-t border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <div className="flex items-center gap-4"><span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)] font-mono">↵</kbd>to select</span><span className="flex items-center gap-1"><kbd className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)] font-mono">esc</kbd>to close</span></div>
                  <span>Powered by ZODO CRM</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* AI Copilot Panel */}
      <AiCopilotPanel isOpen={showCopilot} onClose={() => setShowCopilot(false)} />
    </div>

  );
};

export default Index;
