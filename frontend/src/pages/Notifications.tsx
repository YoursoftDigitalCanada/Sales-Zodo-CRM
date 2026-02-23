// src/pages/Notifications.tsx
import { useState, useMemo, useEffect, useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import {
  Bell, BellOff, BellRing, Search, X, CheckCheck, Trash2,
  Archive, Mail, MailOpen, Users, Calendar,
  DollarSign, Settings, AlertTriangle, CheckCircle2, Info, MessageSquare,
  Star, StarOff, Sparkles, TrendingUp, RefreshCw, Loader2,
  type LucideIcon,
} from "lucide-react";
import {
  getNotifications,
  getNotificationCounts,
  markNotificationAsRead,
  markManyAsRead,
  markAllAsRead,
  deleteNotification as deleteNotificationApi,
} from "@/features/notifications";

// ============================================
// TYPES
// ============================================
interface Notification {
  id: string;
  type: "info" | "success" | "warning" | "error" | "message" | "task" | "deal" | "calendar" | "system" | "mention";
  title: string;
  message: string;
  timestamp: string;
  read: boolean;
  starred: boolean;
  archived: boolean;
  actionUrl?: string;
  actionLabel?: string;
  sender?: { name: string; avatar?: string };
  category: "general" | "crm" | "finance" | "team" | "system";
}

// ============================================
// CONSTANTS
// ============================================
const typeConfig: Record<string, { icon: LucideIcon; color: string; bg: string }> = {
  info: { icon: Info, color: "text-blue-600", bg: "bg-blue-100" },
  success: { icon: CheckCircle2, color: "text-green-600", bg: "bg-green-100" },
  warning: { icon: AlertTriangle, color: "text-amber-600", bg: "bg-amber-100" },
  error: { icon: AlertTriangle, color: "text-red-600", bg: "bg-red-100" },
  message: { icon: MessageSquare, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
  task: { icon: CheckCircle2, color: "text-purple-600", bg: "bg-purple-100" },
  deal: { icon: DollarSign, color: "text-green-600", bg: "bg-green-100" },
  calendar: { icon: Calendar, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
  system: { icon: Settings, color: "text-[#475569]", bg: "bg-[#F1F5F9]" },
  mention: { icon: Users, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10" },
};

const categoryOptions = [
  { value: "all", label: "All Categories" },
  { value: "general", label: "General" },
  { value: "crm", label: "CRM" },
  { value: "finance", label: "Finance" },
  { value: "team", label: "Team" },
  { value: "system", label: "System" },
];

/** Normalise an API record into the local Notification shape */
const normalise = (n: Record<string, any>): Notification => ({
  id: n.id,
  type: n.type ?? "info",
  title: n.title ?? "",
  message: n.message ?? n.description ?? "",
  timestamp: n.createdAt ?? n.timestamp ?? new Date().toISOString(),
  read: n.isRead ?? n.read ?? false,
  starred: n.starred ?? false,
  archived: n.archived ?? false,
  actionUrl: n.link ?? n.actionUrl,
  actionLabel: n.actionLabel,
  sender: n.sender,
  category: n.category ?? "general",
});

const formatTimestamp = (ts: string) => {
  const now = new Date();
  const date = new Date(ts);
  if (isNaN(date.getTime())) return "";
  const diff = (now.getTime() - date.getTime()) / 1000;
  if (diff < 60) return "Just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  if (diff < 172800) return "Yesterday";
  return date.toLocaleDateString("en-CA", { month: "short", day: "numeric" });
};

const getInitials = (name: string) => name.split(" ").map(n => n[0]).join("").toUpperCase().slice(0, 2);

// ============================================
// MAIN COMPONENT
// ============================================
const NotificationsPage = () => {
  const { toast } = useToast();
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "unread" | "read" | "starred">("all");
  const [categoryFilter, setCategoryFilter] = useState("all");
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());

  // ── Fetch ───────────────────────────────────────────
  const fetchNotifications = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getNotifications();
      setNotifications(data.map(normalise));
    } catch (err) {
      console.error("Failed to load notifications", err);
      toast({ title: "Error", description: "Failed to load notifications", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => { fetchNotifications(); }, [fetchNotifications]);

  // Stats
  const stats = useMemo(() => ({
    total: notifications.filter(n => !n.archived).length,
    unread: notifications.filter(n => !n.read && !n.archived).length,
    starred: notifications.filter(n => n.starred && !n.archived).length,
    archived: notifications.filter(n => n.archived).length,
  }), [notifications]);

  // AI Insights
  const aiInsights = useMemo(() => {
    const insights: { icon: LucideIcon; text: string; type: string }[] = [];
    if (stats.unread > 5) insights.push({ icon: BellRing, text: `${stats.unread} unread notifications — you may be falling behind.`, type: "warning" });
    const urgentCount = notifications.filter(n => !n.read && (n.type === "error" || n.type === "warning")).length;
    if (urgentCount > 0) insights.push({ icon: AlertTriangle, text: `${urgentCount} urgent notification${urgentCount > 1 ? 's' : ''} requiring attention.`, type: "danger" });
    const dealsToday = notifications.filter(n => n.type === "deal" && (Date.now() - new Date(n.timestamp).getTime()) < 86400000).length;
    if (dealsToday > 0) insights.push({ icon: TrendingUp, text: `${dealsToday} deal update${dealsToday > 1 ? 's' : ''} today — check your pipeline.`, type: "success" });
    return insights;
  }, [notifications, stats]);

  // Filtered
  const filtered = useMemo(() => {
    let result = notifications.filter(n => !n.archived);
    if (statusFilter === "unread") result = result.filter(n => !n.read);
    else if (statusFilter === "read") result = result.filter(n => n.read);
    else if (statusFilter === "starred") result = result.filter(n => n.starred);
    if (categoryFilter !== "all") result = result.filter(n => n.category === categoryFilter);
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      result = result.filter(n => n.title.toLowerCase().includes(q) || n.message.toLowerCase().includes(q));
    }
    return result;
  }, [notifications, statusFilter, categoryFilter, searchQuery]);

  // Grouped by time
  const grouped = useMemo(() => {
    const now = new Date();
    const today: Notification[] = [], yesterday: Notification[] = [], older: Notification[] = [];
    const todayStart = new Date(now); todayStart.setHours(0, 0, 0, 0);
    const yesterdayStart = new Date(todayStart); yesterdayStart.setDate(yesterdayStart.getDate() - 1);
    filtered.forEach(n => {
      const ts = new Date(n.timestamp);
      if (ts >= todayStart) today.push(n);
      else if (ts >= yesterdayStart) yesterday.push(n);
      else older.push(n);
    });
    return { today, yesterday, older };
  }, [filtered]);

  // Handlers — call backend APIs
  const markAsRead = async (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: true } : n));
    try { await markNotificationAsRead(id); } catch { /* optimistic */ }
  };
  const markAsUnread = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, read: false } : n));
  const toggleStar = (id: string) => setNotifications(prev => prev.map(n => n.id === id ? { ...n, starred: !n.starred } : n));
  const archiveNotification = (id: string) => {
    setNotifications(prev => prev.map(n => n.id === id ? { ...n, archived: true } : n));
    toast({ title: "Archived", description: "Notification moved to archive." });
  };
  const handleDeleteNotification = async (id: string) => {
    setNotifications(prev => prev.filter(n => n.id !== id));
    try { await deleteNotificationApi(id); } catch { /* optimistic */ }
    toast({ title: "Deleted", description: "Notification deleted." });
  };
  const handleMarkAllRead = async () => {
    setNotifications(prev => prev.map(n => ({ ...n, read: true })));
    try { await markAllAsRead(); } catch { /* optimistic */ }
    toast({ title: "All Read", description: "All notifications marked as read." });
  };
  const bulkMarkRead = async () => {
    const ids = Array.from(selectedIds);
    setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, read: true } : n));
    setSelectedIds(new Set());
    try { await markManyAsRead(ids); } catch { /* optimistic */ }
    toast({ title: "Marked as Read", description: `${ids.length} notifications marked as read.` });
  };
  const bulkArchive = () => {
    setNotifications(prev => prev.map(n => selectedIds.has(n.id) ? { ...n, archived: true } : n));
    toast({ title: "Archived", description: `${selectedIds.size} notifications archived.` });
    setSelectedIds(new Set());
  };
  const bulkDelete = async () => {
    const ids = Array.from(selectedIds);
    setNotifications(prev => prev.filter(n => !selectedIds.has(n.id)));
    for (const id of ids) { try { await deleteNotificationApi(id); } catch { /* optimistic */ } }
    toast({ title: "Deleted", description: `${ids.length} notifications deleted.` });
    setSelectedIds(new Set());
  };

  const renderNotification = (n: Notification) => {
    const config = typeConfig[n.type] || typeConfig.info;
    const Icon = config.icon;
    return (
      <motion.div key={n.id} initial={{ opacity: 0, x: -10 }} animate={{ opacity: 1, x: 0 }} exit={{ opacity: 0, x: 10 }}
        className={cn("group flex items-start gap-4 p-4 border-b border-[rgba(15,23,42,0.06)] transition-colors cursor-pointer",
          !n.read ? "bg-[#0891B2]/5 hover:bg-[#0891B2]/8" : "hover:bg-[#F8FAFC]")}>
        {/* Checkbox + Icon */}
        <div className="flex items-center gap-3 pt-0.5">
          <Checkbox checked={selectedIds.has(n.id)}
            onCheckedChange={(c) => { const s = new Set(selectedIds); c ? s.add(n.id) : s.delete(n.id); setSelectedIds(s); }}
            className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]" />
          <div className={cn("w-10 h-10 rounded-md flex items-center justify-center shrink-0", config.bg)}>
            {n.sender ? (
              <span className={cn("text-xs font-bold", config.color)}>{getInitials(n.sender.name)}</span>
            ) : (
              <Icon size={18} className={config.color} />
            )}
          </div>
        </div>
        {/* Content */}
        <div className="flex-1 min-w-0" onClick={() => !n.read && markAsRead(n.id)}>
          <div className="flex items-start justify-between gap-2">
            <div className="min-w-0">
              <div className="flex items-center gap-2">
                {!n.read && <div className="w-2 h-2 rounded-full bg-[#0891B2] shrink-0" />}
                <p className={cn("text-sm truncate", !n.read ? "font-semibold text-[#0F172A]" : "font-medium text-[#475569]")}>{n.title}</p>
              </div>
              <p className="text-xs text-[#94A3B8] mt-0.5 line-clamp-2">{n.message}</p>
              {n.sender && <p className="text-xs text-[#94A3B8] mt-1">from {n.sender.name}</p>}
            </div>
            <div className="flex items-center gap-1 shrink-0">
              <span className="text-xs text-[#94A3B8] whitespace-nowrap">{formatTimestamp(n.timestamp)}</span>
            </div>
          </div>
          {/* Actions */}
          <div className="flex items-center gap-2 mt-2">
            {n.actionLabel && (
              <Button size="sm" variant="outline" className="h-7 text-xs rounded-md border-[rgba(15,23,42,0.06)] text-[#0891B2]"
                onClick={(e) => { e.stopPropagation(); markAsRead(n.id); toast({ title: n.actionLabel, description: "Navigating..." }); }}>
                {n.actionLabel}
              </Button>
            )}
            <div className="flex-1" />
            <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); toggleStar(n.id); }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title={n.starred ? "Unstar" : "Star"}>
                {n.starred ? <Star size={14} className="text-amber-500 fill-amber-500" /> : <StarOff size={14} className="text-[#94A3B8]" />}
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); n.read ? markAsUnread(n.id) : markAsRead(n.id); }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title={n.read ? "Mark unread" : "Mark read"}>
                {n.read ? <Mail size={14} className="text-[#94A3B8]" /> : <MailOpen size={14} className="text-[#0891B2]" />}
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); archiveNotification(n.id); }}
                className="p-1.5 rounded-md hover:bg-white/10 transition-colors" title="Archive">
                <Archive size={14} className="text-[#94A3B8]" />
              </motion.button>
              <motion.button whileHover={{ scale: 1.1 }} whileTap={{ scale: 0.9 }} onClick={(e) => { e.stopPropagation(); handleDeleteNotification(n.id); }}
                className="p-1.5 rounded-md hover:bg-red-50 transition-colors" title="Delete">
                <Trash2 size={14} className="text-[#94A3B8] hover:text-red-500" />
              </motion.button>
            </div>
          </div>
        </div>
      </motion.div>
    );
  };

  const renderGroup = (title: string, items: Notification[]) => {
    if (items.length === 0) return null;
    return (
      <div>
        <div className="px-4 py-2 bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.06)]">
          <p className="text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">{title} ({items.length})</p>
        </div>
        <AnimatePresence>{items.map(renderNotification)}</AnimatePresence>
      </div>
    );
  };

  return (
    <div className="flex h-screen bg-[#F8FAFC]">
      <Sidebar />
      <div className="flex-1 overflow-auto">
        <div className="p-6 max-w-[1200px] mx-auto">
          {/* Header */}
          <motion.div initial={{ opacity: 0, y: -20 }} animate={{ opacity: 1, y: 0 }} className="flex items-center justify-between mb-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                <Bell size={20} className="text-[#0891B2]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Notifications</h1>
                <p className="text-sm text-[#94A3B8]">{stats.unread} unread · {stats.total} total</p>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]"
                onClick={fetchNotifications} disabled={loading}>
                {loading ? <Loader2 size={16} className="mr-2 animate-spin" /> : <RefreshCw size={16} className="mr-2" />}Refresh
              </Button>
              <Button variant="outline" size="sm" className="rounded-md border-[rgba(15,23,42,0.06)]" onClick={handleMarkAllRead}
                disabled={stats.unread === 0}>
                <CheckCheck size={16} className="mr-2" />Mark All Read
              </Button>
            </div>
          </motion.div>

          {/* AI Insights */}
          {aiInsights.length > 0 && (
            <motion.div initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} className="mb-6">
              <div className="flex items-center gap-2 mb-2">
                <div className="flex items-center gap-1.5 px-2 py-1 bg-gradient-to-r from-[#0891B2]/10 to-purple-500/10 rounded-full">
                  <Sparkles size={12} className="text-[#0891B2]" /><span className="text-xs font-semibold text-[#0891B2]">AI Insights</span>
                </div>
              </div>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                {aiInsights.map((insight, i) => {
                  const InsIcon = insight.icon;
                  return (
                    <div key={i} className={cn("p-3 rounded-md border flex items-center gap-3",
                      insight.type === "warning" && "bg-amber-50 border-amber-200",
                      insight.type === "danger" && "bg-red-50 border-red-200",
                      insight.type === "success" && "bg-green-50 border-green-200")}>
                      <InsIcon size={16} className={cn(
                        insight.type === "warning" && "text-amber-600",
                        insight.type === "danger" && "text-red-600",
                        insight.type === "success" && "text-green-600")} />
                      <p className="text-xs text-[#475569]">{insight.text}</p>
                    </div>
                  );
                })}
              </div>
            </motion.div>
          )}

          {/* Stats Cards */}
          <div className="grid grid-cols-4 gap-4 mb-6">
            {[
              { label: "Unread", value: stats.unread, icon: BellRing, color: "text-[#0891B2]", bg: "bg-[#0891B2]/10", onClick: () => setStatusFilter("unread") },
              { label: "Starred", value: stats.starred, icon: Star, color: "text-amber-600", bg: "bg-amber-100", onClick: () => setStatusFilter("starred") },
              { label: "Total", value: stats.total, icon: Bell, color: "text-[#475569]", bg: "bg-[#F1F5F9]", onClick: () => setStatusFilter("all") },
              { label: "Archived", value: stats.archived, icon: Archive, color: "text-purple-600", bg: "bg-purple-100", onClick: () => { } },
            ].map((stat, i) => (
              <motion.div key={i} initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: i * 0.05 }}
                whileHover={{ y: -4 }} onClick={stat.onClick}
                className="bg-white rounded-md p-4 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all cursor-pointer">
                <div className="flex items-center justify-between">
                  <div>
                    <p className="text-xs text-[#94A3B8]">{stat.label}</p>
                    <p className="text-2xl font-bold text-[#0F172A]">{stat.value}</p>
                  </div>
                  <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", stat.bg)}>
                    <stat.icon size={18} className={stat.color} />
                  </div>
                </div>
              </motion.div>
            ))}
          </div>

          {/* Toolbar */}
          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }}
            className="bg-white rounded-t-md border border-[rgba(15,23,42,0.06)] border-b-0 p-4">
            <div className="flex items-center gap-3 flex-wrap">
              <div className="relative flex-1 min-w-[200px]">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <Input value={searchQuery} onChange={e => setSearchQuery(e.target.value)}
                  placeholder="Search notifications..." className="pl-10 rounded-md border-[rgba(15,23,42,0.06)] h-10" />
                {searchQuery && <button onClick={() => setSearchQuery("")} className="absolute right-3 top-1/2 -translate-y-1/2 text-[#94A3B8]"><X size={14} /></button>}
              </div>
              <div className="flex border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden">
                {(["all", "unread", "read", "starred"] as const).map(s => (
                  <button key={s} onClick={() => setStatusFilter(s)}
                    className={cn("px-3 py-2 text-xs font-medium transition-colors capitalize",
                      statusFilter === s ? "bg-[#0891B2] text-white" : "text-[#475569] hover:bg-[#F8FAFC]")}>
                    {s}
                  </button>
                ))}
              </div>
              <Select value={categoryFilter} onValueChange={setCategoryFilter}>
                <SelectTrigger className="w-[150px] rounded-md border-[rgba(15,23,42,0.06)] h-10"><SelectValue /></SelectTrigger>
                <SelectContent>{categoryOptions.map(o => <SelectItem key={o.value} value={o.value}>{o.label}</SelectItem>)}</SelectContent>
              </Select>
            </div>
            {/* Bulk Actions */}
            <AnimatePresence>
              {selectedIds.size > 0 && (
                <motion.div initial={{ opacity: 0, height: 0 }} animate={{ opacity: 1, height: "auto" }} exit={{ opacity: 0, height: 0 }}
                  className="flex items-center gap-3 mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)]">
                  <span className="text-sm text-[#475569]">{selectedIds.size} selected</span>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" onClick={bulkMarkRead}>
                    <CheckCheck size={14} className="mr-1" />Mark Read
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-md" onClick={bulkArchive}>
                    <Archive size={14} className="mr-1" />Archive
                  </Button>
                  <Button size="sm" variant="outline" className="h-7 text-xs rounded-md text-red-600 border-red-200 hover:bg-red-50" onClick={bulkDelete}>
                    <Trash2 size={14} className="mr-1" />Delete
                  </Button>
                  <Button size="sm" variant="ghost" className="h-7 text-xs rounded-md" onClick={() => setSelectedIds(new Set())}>Clear</Button>
                </motion.div>
              )}
            </AnimatePresence>
          </motion.div>

          {/* Notification List */}
          <div className="bg-white rounded-b-md border border-[rgba(15,23,42,0.06)] border-t-0 overflow-hidden">
            {loading ? (
              <div className="p-16 text-center">
                <Loader2 size={32} className="text-[#0891B2] animate-spin mx-auto mb-4" />
                <p className="text-[#94A3B8]">Loading notifications...</p>
              </div>
            ) : filtered.length === 0 ? (
              <div className="p-16 text-center">
                <div className="w-16 h-16 rounded-full bg-[#F1F5F9] flex items-center justify-center mx-auto mb-4">
                  <BellOff size={32} className="text-[#94A3B8]" />
                </div>
                <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No notifications</h3>
                <p className="text-[#94A3B8]">You're all caught up!</p>
              </div>
            ) : (
              <>
                {renderGroup("Today", grouped.today)}
                {renderGroup("Yesterday", grouped.yesterday)}
                {renderGroup("Earlier", grouped.older)}
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default NotificationsPage;
