import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { fetchDashboardStats } from "@/features/dashboard";
import { AiCopilotPanel } from "@/components/ai/AiCopilotPanel";
import {
  FolderKanban,
  DollarSign,
  Users,
  Bell,
  Search,
  ChevronDown,
  Sun,
  Moon,
  Plus,
  TrendingUp,
  ArrowUpRight,
  Sparkles,
  Target,
  Clock,
  CheckCircle2,
  Calendar,
  MessageSquare,
  Zap,
  X,
  Command,
  Activity,
  AlertCircle,
} from "lucide-react";
import { cn } from "@/lib/utils";

// ============================================
// CONSTANTS & TYPES
// ============================================

type ThemeColor = "teal" | "gold" | "navy" | "green" | "blue" | "purple";

interface User {
  firstName: string;
  lastName: string;
  email?: string;
  role?: string;
}

interface DashboardStats {
  projectsCount: number;
  clientsCount: number;
  earnings: number;
  pendingTasks: number;
}

interface QuickAction {
  title: string;
  icon: React.ElementType;
  color: ThemeColor;
  path: string;
  description: string;
}

interface Activity {
  id: number;
  type: string;
  message: string;
  time: string;
  icon: React.ElementType;
  color: ThemeColor;
}

interface Notification {
  id: number;
  title: string;
  message: string;
  time: string;
  icon: React.ElementType;
  color: ThemeColor;
  read: boolean;
}

// ============================================
// THEME COLORS
// ============================================

const themeColors: Record<ThemeColor, { bg: string; text: string; light: string; gradient: string }> = {
  teal: {
    bg: "bg-[#0891B2]",
    text: "text-[#0891B2]",
    light: "bg-[#0891B2]/10",
    gradient: "from-[#22D3EE]",
  },
  gold: {
    bg: "bg-[#D97706]",
    text: "text-[#D97706]",
    light: "bg-[#D97706]/10",
    gradient: "from-[#FBBF24]",
  },
  navy: {
    bg: "bg-[#EA580C]",
    text: "text-[#EA580C]",
    light: "bg-[#EA580C]/10",
    gradient: "from-[#F97316]",
  },
  green: {
    bg: "bg-[#16A34A]",
    text: "text-[#16A34A]",
    light: "bg-[#16A34A]/10",
    gradient: "from-[#4ADE80]",
  },
  blue: {
    bg: "bg-[#0891B2]",
    text: "text-[#0891B2]",
    light: "bg-[#0891B2]/10",
    gradient: "from-[#22D3EE]",
  },
  purple: {
    bg: "bg-[#EA580C]",
    text: "text-[#EA580C]",
    light: "bg-[#EA580C]/10",
    gradient: "from-[#F97316]",
  },
};

const getColorClasses = (color: ThemeColor) => themeColors[color] || themeColors.teal;

// ============================================
// STATIC DATA
// ============================================

const quickActions: QuickAction[] = [
  {
    title: "New Project",
    icon: FolderKanban,
    color: "teal",
    path: "/projects/add",
    description: "Create a new project",
  },
  {
    title: "Add Client",
    icon: Users,
    color: "gold",
    path: "/clients/new",
    description: "Add a new client",
  },
  {
    title: "Create Invoice",
    icon: DollarSign,
    color: "navy",
    path: "/invoices/new",
    description: "Generate invoice",
  },
  {
    title: "Schedule Meeting",
    icon: Calendar,
    color: "purple",
    path: "/bookings/new",
    description: "Book a meeting",
  },
];

const recentActivity: Activity[] = [
  {
    id: 1,
    type: "project",
    message: "New project 'E-commerce Website' created",
    time: "2 min ago",
    icon: FolderKanban,
    color: "teal",
  },
  {
    id: 2,
    type: "payment",
    message: "Payment received from TechStart Inc.",
    time: "15 min ago",
    icon: DollarSign,
    color: "green",
  },
  {
    id: 3,
    type: "client",
    message: "New client 'GreenLeaf Co.' added",
    time: "1 hour ago",
    icon: Users,
    color: "gold",
  },
  {
    id: 4,
    type: "task",
    message: "Task 'Design Homepage' completed",
    time: "2 hours ago",
    icon: CheckCircle2,
    color: "blue",
  },
];

const initialNotifications: Notification[] = [
  {
    id: 1,
    title: "New Message",
    message: "New message from client",
    time: "2 min ago",
    icon: MessageSquare,
    color: "teal",
    read: false,
  },
  {
    id: 2,
    title: "Payment Received",
    message: "Payment received - $2,500",
    time: "1 hour ago",
    icon: DollarSign,
    color: "gold",
    read: false,
  },
  {
    id: 3,
    title: "Deadline Reminder",
    message: "Project deadline tomorrow",
    time: "3 hours ago",
    icon: FolderKanban,
    color: "navy",
    read: false,
  },
];

// ============================================
// MAIN COMPONENT
// ============================================

const Index = () => {
  const navigate = useNavigate();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [stats, setStats] = useState<DashboardStats>({
    projectsCount: 0,
    clientsCount: 0,
    earnings: 0,
    pendingTasks: 12,
  });
  const [isLoading, setIsLoading] = useState(true);
  const [user, setUser] = useState<User | null>(null);
  const [showNotifications, setShowNotifications] = useState(false);
  const [notifications, setNotifications] = useState<Notification[]>(initialNotifications);
  const [isDarkMode, setIsDarkMode] = useState(false);
  const [currentTime, setCurrentTime] = useState(new Date());
  const [searchQuery, setSearchQuery] = useState("");
  const [showSearchModal, setShowSearchModal] = useState(false);
  const [showProfileMenu, setShowProfileMenu] = useState(false);
  const [showCopilot, setShowCopilot] = useState(false);

  // Refs
  const notificationRef = useRef<HTMLDivElement>(null);
  const profileRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  // ============================================
  // EFFECTS
  // ============================================

  // Update time every minute
  useEffect(() => {
    const timer = setInterval(() => setCurrentTime(new Date()), 60000);
    return () => clearInterval(timer);
  }, []);

  // Load user data from localStorage
  useEffect(() => {
    const storedUser = localStorage.getItem("user");
    if (storedUser) {
      try {
        setUser(JSON.parse(storedUser));
      } catch (e) {
        console.error("Failed to parse user data");
      }
    }
  }, []);

  // Load dark mode preference
  useEffect(() => {
    const savedTheme = localStorage.getItem("theme");
    const prefersDark = window.matchMedia("(prefers-color-scheme: dark)").matches;
    const shouldBeDark = savedTheme === "dark" || (!savedTheme && prefersDark);

    setIsDarkMode(shouldBeDark);
    if (shouldBeDark) {
      document.documentElement.classList.add("dark");
    }
  }, []);

  // Fetch dashboard stats
  useEffect(() => {
    const fetchStats = async () => {
      setIsLoading(true);
      try {
        const serverStats = await fetchDashboardStats();

        setStats({
          projectsCount: serverStats.projectsCount || 0,
          clientsCount: serverStats.clientsCount || 0,
          earnings: 0, // Will be calculated from invoices when available
          pendingTasks: serverStats.pendingTasks || 0,
        });
      } catch (error) {
        console.error("Error fetching dashboard stats:", error);
        // Set default values on error
        setStats({
          projectsCount: 0,
          clientsCount: 0,
          earnings: 0,
          pendingTasks: 0,
        });
      } finally {
        setIsLoading(false);
      }
    };

    fetchStats();
  }, []);

  // Click outside handlers
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        notificationRef.current &&
        !notificationRef.current.contains(event.target as Node)
      ) {
        setShowNotifications(false);
      }
      if (
        profileRef.current &&
        !profileRef.current.contains(event.target as Node)
      ) {
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Keyboard shortcuts
  useEffect(() => {
    const handleKeyDown = (event: KeyboardEvent) => {
      // Cmd/Ctrl + K for search
      if ((event.metaKey || event.ctrlKey) && event.key === "k") {
        event.preventDefault();
        setShowSearchModal(true);
        setTimeout(() => searchInputRef.current?.focus(), 100);
      }
      // Escape to close modals
      if (event.key === "Escape") {
        setShowSearchModal(false);
        setShowNotifications(false);
        setShowProfileMenu(false);
      }
    };

    document.addEventListener("keydown", handleKeyDown);
    return () => document.removeEventListener("keydown", handleKeyDown);
  }, []);

  // ============================================
  // HANDLERS
  // ============================================

  const getGreeting = () => {
    const hour = currentTime.getHours();
    if (hour < 12) return "Good Morning";
    if (hour < 18) return "Good Afternoon";
    return "Good Evening";
  };

  const toggleDarkMode = () => {
    const newMode = !isDarkMode;
    setIsDarkMode(newMode);
    localStorage.setItem("theme", newMode ? "dark" : "light");

    if (newMode) {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
  };

  const handleMarkAllAsRead = () => {
    setNotifications((prev) =>
      prev.map((n) => ({ ...n, read: true }))
    );
  };

  const handleQuickAction = (path: string) => {
    navigate(path);
  };

  const handleLogout = () => {
    localStorage.removeItem("user");
    localStorage.removeItem("token");
    navigate("/login");
  };

  const unreadNotificationsCount = notifications.filter((n) => !n.read).length;

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className={cn("flex min-h-screen w-full bg-[#F8FAFC]")}>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content */}
      <main

      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-sm border-b border-[rgba(15,23,42,0.06)]">
          <div className="flex h-12 items-center justify-between px-5">
            {/* Left Section - Search */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-[#475569]" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => setShowSearchModal(true)}
                  className="w-64 h-8 pl-9 pr-14 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#22D3EE]/30 transition-colors"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-[#F1F5F9] text-[10px] text-[#475569] border border-[rgba(15,23,42,0.06)] font-mono flex items-center gap-1">
                  <Command size={10} />K
                </kbd>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* AI Copilot Toggle */}
              <button
                onClick={() => setShowCopilot(true)}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2]/8 text-[#0891B2] text-xs font-medium rounded-md hover:bg-[#0891B2]/14 transition-colors border border-[#0891B2]/15"
              >
                <Sparkles size={14} />
                <span className="hidden sm:inline">Ask Experts</span>
              </button>

              {/* Quick Add Button */}
              <button
                onClick={() => navigate("/projects/add")}
                className="flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2] text-white text-xs font-medium rounded-md hover:bg-[#0891B2]/90 transition-colors"
              >
                <Plus size={14} />
                <span className="hidden sm:inline">New</span>
              </button>

              {/* Theme Toggle */}
              <button
                onClick={toggleDarkMode}
                className="p-2 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:text-[#475569] transition-colors"
              >
                {isDarkMode ? <Sun size={15} /> : <Moon size={15} />}
              </button>

              {/* Notifications */}
              <div ref={notificationRef} className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2 rounded-md bg-white border border-[rgba(15,23,42,0.06)] text-[#94A3B8] hover:text-[#475569] transition-colors"
                >
                  <Bell size={15} />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-[#EA580C] text-white text-[9px] font-bold rounded-full flex items-center justify-center border border-[#F8FAFC]">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#0F172A]">
                            Notifications
                          </h4>
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-[#0891B2] font-medium cursor-pointer hover:underline"
                          >
                            Mark all as read
                          </button>
                        </div>
                      </div>
                      <div className="max-h-80 overflow-y-auto">
                        {notifications.map((notification) => {
                          const colors = getColorClasses(notification.color);
                          return (
                            <div
                              key={notification.id}
                              className={cn(
                                "p-4 hover:bg-white transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0",
                                !notification.read && "bg-[#0891B2]/5"
                              )}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0",
                                    colors.light
                                  )}
                                >
                                  <notification.icon size={18} className={colors.text} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#0F172A]">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-[#475569]">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-[#475569] mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full bg-[#0891B2] flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-3 bg-white text-center border-t border-[rgba(15,23,42,0.06)]">
                        <button
                          onClick={() => navigate("/notifications")}
                          className="text-sm text-[#0891B2] font-medium hover:underline"
                        >
                          View All Notifications
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>

              {/* Profile */}
              <div
                ref={profileRef}
                className="relative flex items-center gap-3 pl-3 ml-3 border-l border-[rgba(15,23,42,0.06)]"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#0F172A]">
                    {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                  </p>
                  <p className="text-xs text-[#94A3B8]">
                    {user?.role || "Administrator"}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="relative cursor-pointer flex items-center gap-2"
                >
                  <div className="h-8 w-8 rounded-md bg-[#0891B2] flex items-center justify-center text-white text-xs font-bold">
                    {user
                      ? (user.firstName[0] + user.lastName[0]).toUpperCase()
                      : "GU"}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-[#F8FAFC]" />
                </motion.button>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-[#475569] transition-transform",
                    showProfileMenu && "rotate-180"
                  )}
                />

                {/* Profile Dropdown */}
                <AnimatePresence>
                  {showProfileMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 top-full mt-2 w-56 bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-[rgba(15,23,42,0.06)]">
                        <p className="font-semibold text-[#0F172A]">
                          {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                        </p>
                        <p className="text-xs text-[#475569] truncate">
                          {user?.email || "guest@yoursoft.ca"}
                        </p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => navigate("/settings/profile")}
                          className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors"
                        >
                          Profile Settings
                        </button>
                        <button
                          onClick={() => navigate("/settings")}
                          className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors"
                        >
                          Account Settings
                        </button>
                        <button
                          onClick={() => navigate("/help")}
                          className="w-full px-3 py-2 text-left text-sm text-[#475569] hover:bg-white hover:text-[#0F172A] rounded-md transition-colors"
                        >
                          Help & Support
                        </button>
                      </div>
                      <div className="p-2 border-t border-[rgba(15,23,42,0.06)]">
                        <button
                          onClick={handleLogout}
                          className="w-full px-3 py-2 text-left text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300 rounded-md transition-colors"
                        >
                          Sign Out
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* MAIN CONTENT */}
        {/* ============================================ */}
        <div className="p-6 space-y-6 page-enter">
          {/* ============================================ */}
          {/* AI BUSINESS OVERVIEW — Hero Intelligence Card */}
          {/* ============================================ */}
          <div className="bg-white rounded-lg border-l-[3px] border-l-[#0891B2] p-0 overflow-hidden ai-hero-pulse"
            style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.04), 0 8px 20px rgba(15,23,42,0.05)' }}>
            {/* Hero Header */}
            <div className="flex items-center justify-between px-5 pt-4 pb-3">
              <div className="flex items-center gap-3">
                <div className="w-8 h-8 rounded-md bg-[#0891B2]/8 flex items-center justify-center">
                  <Sparkles size={16} className="text-[#0891B2]" />
                </div>
                <div>
                  <h2 className="text-sm font-semibold text-[#0F172A] tracking-tight">AI Business Overview</h2>
                  <p className="text-[11px] text-[#94A3B8]">
                    {currentTime.toLocaleDateString("en-US", {
                      weekday: "long", month: "long", day: "numeric",
                    })} · Updated just now
                  </p>
                </div>
              </div>
              <span className="ai-tag">LIVE</span>
            </div>

            {/* Intelligence Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 divide-x divide-[rgba(15,23,42,0.06)]">
              {/* Pipeline Health */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Activity size={12} className="text-[#94A3B8]" />
                  <span className="metric-label">Pipeline Health</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-[#0F172A] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>Medium Risk</span>
                </div>
                <p className="text-[11px] text-[#475569] leading-relaxed">
                  <span className="text-[#EA580C] font-medium">3 leads</span> stalled &gt;5 days
                </p>
              </div>

              {/* Revenue Forecast */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <TrendingUp size={12} className="text-[#94A3B8]" />
                  <span className="metric-label">Revenue Forecast</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-[#0F172A] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>+12%</span>
                  <span className="text-[11px] text-[#16A34A] font-medium">↑ trending</span>
                </div>
                <p className="text-[11px] text-[#475569]">vs previous period</p>
              </div>

              {/* Priority Alerts */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <AlertCircle size={12} className="text-[#94A3B8]" />
                  <span className="metric-label">Priority Alerts</span>
                </div>
                <div className="flex items-center gap-2 mb-1">
                  <span className="text-lg font-bold text-[#EA580C] tracking-tight" style={{ fontVariantNumeric: 'tabular-nums' }}>{stats.pendingTasks}</span>
                  <span className="text-[11px] text-[#94A3B8] font-medium">actions needed</span>
                </div>
                <p className="text-[11px] text-[#475569]">Follow-up within 48h</p>
              </div>

              {/* Smart Actions */}
              <div className="px-5 py-4">
                <div className="flex items-center gap-1.5 mb-2">
                  <Zap size={12} className="text-[#94A3B8]" />
                  <span className="metric-label">Suggested Actions</span>
                </div>
                <div className="space-y-1.5">
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#0891B2]" />
                    <span className="text-[11px] text-[#475569]">Follow up with 2 hot leads</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-1 h-1 rounded-full bg-[#0891B2]" />
                    <span className="text-[11px] text-[#475569]">Review {stats.pendingTasks} overdue tasks</span>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* AI Daily Summary */}
          <div className="ai-insight-enter" style={{ animationDelay: '200ms' }}>
            <div className="flex items-center gap-2 px-1 mb-3">
              <Sparkles size={13} className="text-[#0891B2]" />
              <span className="text-xs font-semibold text-[#0F172A]">Daily AI Summary</span>
              <span className="ai-tag">AI</span>
            </div>
            <div className="bg-white rounded-lg border border-[rgba(15,23,42,0.06)] px-5 py-3" style={{ boxShadow: '0 1px 2px rgba(15,23,42,0.03)' }}>
              <p className="text-[12px] text-[#475569] leading-relaxed">
                <span className="text-[#0F172A] font-medium">Today's overview:</span>{' '}
                {stats.pendingTasks > 0 ? `${stats.pendingTasks} tasks need attention` : 'All tasks on track'}.
                {stats.clientsCount > 0 ? ` ${stats.clientsCount} active clients in your portfolio.` : ''}
                {stats.projectsCount > 0 ? ` ${stats.projectsCount} projects running — ` : ''}
                {stats.pendingTasks > 3
                  ? 'consider prioritizing overdue items today.'
                  : 'healthy pipeline activity detected.'}
              </p>
            </div>
          </div>

          {/* Quick Actions */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {quickActions.map((action, index) => {
              const colors = getColorClasses(action.color);
              return (
                <motion.button
                  key={index}
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.1 * index }}
                  whileHover={{ scale: 1.01, y: -2 }}
                  whileTap={{ scale: 0.99 }}
                  onClick={() => handleQuickAction(action.path)}
                  className="flex items-center gap-4 p-4 bg-white rounded-md card-shadow hover:shadow-md transition-all group"
                >
                  <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center">
                    <action.icon size={20} className="text-[#475569]" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                      {action.title}
                    </p>
                    <p className="text-xs text-[#475569]">{action.description}</p>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="ml-auto text-[#94A3B8] group-hover:text-[#0891B2] transition-colors"
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Stats Grid — Analytical KPIs */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 stagger-enter">
            <StatCard
              title="Active Projects"
              value={stats.projectsCount}
              subtitle="Total projects"
              trend={10}
              comparison="+2 vs last week"
              icon={FolderKanban}
              color="cyan"
              isLoading={isLoading}
              lastUpdated="Updated 1h ago"
              aiInsight="Delivery pace on track"
            />
            <StatCard
              title="Total Earnings"
              value={`$${stats.earnings.toLocaleString()}`}
              subtitle="Paid invoices"
              trend={25}
              comparison="+$1.2k vs last month"
              icon={DollarSign}
              color="orange"
              isLoading={isLoading}
              lastUpdated="Updated 2h ago"
              aiInsight="Revenue trending +12%"
            />
            <StatCard
              title="Total Clients"
              value={stats.clientsCount}
              subtitle="Active clients"
              trend={5}
              comparison="+3 vs last month"
              icon={Users}
              color="green"
              isLoading={isLoading}
              lastUpdated="Updated 30m ago"
              aiInsight={stats.clientsCount > 0 ? `${Math.min(stats.clientsCount, 3)} new this week` : undefined}
            />
            <StatCard
              title="Pending Tasks"
              value={stats.pendingTasks}
              subtitle="Due this week"
              trend={-3}
              comparison="−2 vs yesterday"
              icon={Clock}
              color="purple"
              isLoading={isLoading}
              lastUpdated="Updated just now"
              aiInsight={stats.pendingTasks > 5 ? "Prioritize overdue items" : "On track"}
            />
          </div>

          {/* Charts & Calendar Row */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3 }}
              className="lg:col-span-2"
            >
              <ProjectsChart />
            </motion.div>
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4 }}
            >
              <CalendarWidget />
            </motion.div>
          </div>

          {/* Recent Activity & Projects Table */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
            {/* Recent Activity */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.5 }}
              className="bg-white border border-[rgba(15,23,42,0.06)] rounded-md overflow-hidden"
            >
              <div className="p-6 border-b border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                      <Zap size={18} className="text-[#0891B2]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0F172A]">
                        Recent Activity
                      </h3>
                      <p className="text-xs text-[#475569]">Latest updates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/activity")}
                    className="text-sm text-[#0891B2] font-medium hover:underline"
                  >
                    View All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-[rgba(15,23,42,0.06)]">
                {recentActivity.map((activity, index) => {
                  const colors = getColorClasses(activity.color);
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 hover:bg-white transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-md flex items-center justify-center flex-shrink-0",
                            colors.light
                          )}
                        >
                          <activity.icon size={18} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                            {activity.message}
                          </p>
                          <p className="text-xs text-[#475569] mt-1 flex items-center gap-1">
                            <Clock size={10} />
                            {activity.time}
                          </p>
                        </div>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            </motion.div>

            {/* Projects Table */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.6 }}
              className="lg:col-span-2"
            >
              <ProjectsTable />
            </motion.div>
          </div>
        </div>

        {/* Footer */}
        <footer className="px-6 py-4 bg-[#F8FAFC] border-b border-[rgba(15,23,42,0.06)]">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-[#94A3B8]">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0F172A]">
                ZODO
              </span>
              <span className="text-[#0891B2] font-semibold">CRM</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="hover:text-[#0891B2] transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-[#0891B2] transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="hover:text-[#0891B2] transition-colors"
              >
                Support
              </a>
            </div>
          </div>
        </footer>
      </main>

      {/* ============================================ */}
      {/* SEARCH MODAL */}
      {/* ============================================ */}
      <AnimatePresence>
        {showSearchModal && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/60 backdrop-blur-md"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white border border-[rgba(15,23,42,0.06)] card-shadow rounded-md overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 border-b border-[rgba(15,23,42,0.06)]">
                <Search size={20} className="text-[#475569]" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects, clients, invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-lg text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none"
                />
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1.5 rounded-md hover:bg-[#F1F5F9] text-[#475569] transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs font-medium text-[#475569] uppercase tracking-wider mb-3">
                  Quick Actions
                </p>
                <div className="space-y-1">
                  {quickActions.map((action, index) => {
                    const colors = getColorClasses(action.color);
                    return (
                      <button
                        key={index}
                        onClick={() => {
                          handleQuickAction(action.path);
                          setShowSearchModal(false);
                        }}
                        className="w-full flex items-center gap-3 p-3 rounded-md hover:bg-white transition-colors group"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-md flex items-center justify-center",
                            colors.light
                          )}
                        >
                          <action.icon size={18} className={colors.text} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
                            {action.title}
                          </p>
                          <p className="text-xs text-[#475569]">
                            {action.description}
                          </p>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="ml-auto text-[#94A3B8] group-hover:text-[#0891B2] transition-colors"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-3 bg-white border-t border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center justify-between text-xs text-[#475569]">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)] font-mono">
                        ↵
                      </kbd>
                      to select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-[#F1F5F9] border border-[rgba(15,23,42,0.06)] font-mono">
                        esc
                      </kbd>
                      to close
                    </span>
                  </div>
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
