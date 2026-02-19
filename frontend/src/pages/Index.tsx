import { useEffect, useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useNavigate } from "react-router-dom";
import { Sidebar } from "@/components/Sidebar";
import { StatCard } from "@/components/dashboard/StatCard";
import { ProjectsChart } from "@/components/dashboard/ProjectsChart";
import { CalendarWidget } from "@/components/dashboard/CalendarWidget";
import { ProjectsTable } from "@/components/dashboard/ProjectsTable";
import { fetchDashboardStats } from "@/features/dashboard";
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
    bg: "bg-[#23D3EE]",
    text: "text-[#23D3EE]",
    light: "bg-[#23D3EE]/10",
    gradient: "from-[#23D3EE] to-[#23D3EE]/70",
  },
  gold: {
    bg: "bg-[#FBBF23]",
    text: "text-[#FBBF23]",
    light: "bg-[#FBBF23]/10",
    gradient: "from-[#FBBF23] to-[#FBBF23]/70",
  },
  navy: {
    bg: "bg-[#0F172A]",
    text: "text-[#0F172A]",
    light: "bg-[#0F172A]/10",
    gradient: "from-[#0F172A] to-[#0F172A]/70",
  },
  green: {
    bg: "bg-emerald-500",
    text: "text-emerald-500",
    light: "bg-emerald-500/10",
    gradient: "from-emerald-500 to-emerald-400",
  },
  blue: {
    bg: "bg-blue-500",
    text: "text-blue-500",
    light: "bg-blue-500/10",
    gradient: "from-blue-500 to-blue-400",
  },
  purple: {
    bg: "bg-purple-500",
    text: "text-purple-500",
    light: "bg-purple-500/10",
    gradient: "from-purple-500 to-purple-400",
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
    path: "/projects/new",
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
    <div className={cn("flex min-h-screen w-full", isDarkMode ? "dark bg-slate-900" : "bg-slate-50")}>
      {/* Sidebar */}
      <Sidebar collapsed={sidebarCollapsed} setCollapsed={setSidebarCollapsed} />

      {/* Main Content */}
      <main

      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 bg-white/80 dark:bg-slate-900/80 backdrop-blur-xl border-b border-slate-200/50 dark:border-slate-700/50">
          <div className="flex h-20 items-center justify-between px-6">
            {/* Left Section - Search */}
            <div className="flex items-center gap-6">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
                <input
                  type="text"
                  placeholder="Search anything..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  onClick={() => setShowSearchModal(true)}
                  className="w-80 h-11 pl-10 pr-16 rounded-xl bg-slate-100 dark:bg-slate-800 border-none text-sm text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none focus:ring-2 focus:ring-[#23D3EE]/20 focus:bg-white dark:focus:bg-slate-700 transition-all"
                />
                <kbd className="absolute right-3 top-1/2 -translate-y-1/2 px-2 py-0.5 rounded bg-white dark:bg-slate-700 text-[10px] text-slate-400 border border-slate-200 dark:border-slate-600 font-mono flex items-center gap-1">
                  <Command size={10} />K
                </kbd>
              </div>
            </div>

            {/* Right Section */}
            <div className="flex items-center gap-3">
              {/* Quick Add Button */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => navigate("/projects/new")}
                className="flex items-center gap-2 px-4 py-2.5 bg-[#23D3EE] text-white text-sm font-medium rounded-xl shadow-lg shadow-[#23D3EE]/25 hover:bg-[#23D3EE]/90 transition-colors"
              >
                <Plus size={16} />
                <span className="hidden sm:inline">Quick Add</span>
              </motion.button>

              {/* Theme Toggle */}
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={toggleDarkMode}
                className="p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              >
                {isDarkMode ? <Sun size={18} /> : <Moon size={18} />}
              </motion.button>

              {/* Notifications */}
              <div ref={notificationRef} className="relative">
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  whileTap={{ scale: 0.95 }}
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 rounded-xl bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
                >
                  <Bell size={18} />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 bg-red-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white dark:border-slate-900">
                      {unreadNotificationsCount}
                    </span>
                  )}
                </motion.button>

                {/* Notifications Dropdown */}
                <AnimatePresence>
                  {showNotifications && (
                    <motion.div
                      initial={{ opacity: 0, y: 10, scale: 0.95 }}
                      animate={{ opacity: 1, y: 0, scale: 1 }}
                      exit={{ opacity: 0, y: 10, scale: 0.95 }}
                      transition={{ duration: 0.15 }}
                      className="absolute right-0 mt-2 w-80 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <div className="flex items-center justify-between">
                          <h4 className="font-semibold text-[#0F172A] dark:text-white">
                            Notifications
                          </h4>
                          <button
                            onClick={handleMarkAllAsRead}
                            className="text-xs text-[#23D3EE] font-medium cursor-pointer hover:underline"
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
                                "p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer border-b border-slate-100 dark:border-slate-700 last:border-0",
                                !notification.read && "bg-[#23D3EE]/5"
                              )}
                            >
                              <div className="flex gap-3">
                                <div
                                  className={cn(
                                    "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                                    colors.light
                                  )}
                                >
                                  <notification.icon size={18} className={colors.text} />
                                </div>
                                <div className="flex-1 min-w-0">
                                  <p className="text-sm font-medium text-[#0F172A] dark:text-white">
                                    {notification.title}
                                  </p>
                                  <p className="text-sm text-slate-500 dark:text-slate-400">
                                    {notification.message}
                                  </p>
                                  <p className="text-xs text-slate-400 mt-1">
                                    {notification.time}
                                  </p>
                                </div>
                                {!notification.read && (
                                  <div className="w-2 h-2 rounded-full bg-[#23D3EE] flex-shrink-0 mt-2" />
                                )}
                              </div>
                            </div>
                          );
                        })}
                      </div>
                      <div className="p-3 bg-slate-50 dark:bg-slate-700/50 text-center">
                        <button
                          onClick={() => navigate("/notifications")}
                          className="text-sm text-[#23D3EE] font-medium hover:underline"
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
                className="relative flex items-center gap-3 pl-3 ml-3 border-l border-slate-200 dark:border-slate-700"
              >
                <div className="text-right hidden sm:block">
                  <p className="text-sm font-semibold text-[#0F172A] dark:text-white">
                    {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                  </p>
                  <p className="text-xs text-slate-400">
                    {user?.role || "Administrator"}
                  </p>
                </div>
                <motion.button
                  whileHover={{ scale: 1.05 }}
                  onClick={() => setShowProfileMenu(!showProfileMenu)}
                  className="relative cursor-pointer flex items-center gap-2"
                >
                  <div className="h-11 w-11 rounded-xl bg-gradient-to-br from-[#23D3EE] via-[#23D3EE]/80 to-[#FBBF23] flex items-center justify-center text-white font-bold shadow-lg">
                    {user
                      ? (user.firstName[0] + user.lastName[0]).toUpperCase()
                      : "GU"}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 bg-green-500 rounded-full border-2 border-white dark:border-slate-900" />
                </motion.button>
                <ChevronDown
                  size={16}
                  className={cn(
                    "text-slate-400 transition-transform",
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
                      className="absolute right-0 top-full mt-2 w-56 bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden z-50"
                    >
                      <div className="p-4 border-b border-slate-100 dark:border-slate-700">
                        <p className="font-semibold text-[#0F172A] dark:text-white">
                          {user ? `${user.firstName} ${user.lastName}` : "Guest User"}
                        </p>
                        <p className="text-xs text-slate-400 truncate">
                          {user?.email || "guest@yoursoft.ca"}
                        </p>
                      </div>
                      <div className="p-2">
                        <button
                          onClick={() => navigate("/settings/profile")}
                          className="w-full px-3 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Profile Settings
                        </button>
                        <button
                          onClick={() => navigate("/settings")}
                          className="w-full px-3 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Account Settings
                        </button>
                        <button
                          onClick={() => navigate("/help")}
                          className="w-full px-3 py-2 text-left text-sm text-slate-600 dark:text-slate-300 hover:bg-slate-50 dark:hover:bg-slate-700 rounded-lg transition-colors"
                        >
                          Help & Support
                        </button>
                      </div>
                      <div className="p-2 border-t border-slate-100 dark:border-slate-700">
                        <button
                          onClick={handleLogout}
                          className="w-full px-3 py-2 text-left text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
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
        <div className="p-6 space-y-6">
          {/* Welcome Banner */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="relative overflow-hidden rounded-3xl bg-gradient-to-r from-[#0F172A] via-[#0F172A] to-[#23D3EE]/30 p-8"
          >
            {/* Background Decorations */}
            <div className="absolute top-0 right-0 w-64 h-64 bg-[#23D3EE]/10 rounded-full blur-3xl" />
            <div className="absolute bottom-0 left-1/2 w-48 h-48 bg-[#FBBF23]/10 rounded-full blur-3xl" />
            <div
              className="absolute inset-0 opacity-5"
              style={{
                backgroundImage: `radial-gradient(#23D3EE 1px, transparent 1px)`,
                backgroundSize: "20px 20px",
              }}
            />

            <div className="relative flex flex-col lg:flex-row lg:items-center lg:justify-between gap-6">
              <div>
                <motion.div
                  initial={{ opacity: 0, x: -20 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: 0.2 }}
                  className="flex items-center gap-2 mb-3"
                >
                  <Sparkles size={20} className="text-[#FBBF23]" />
                  <span className="text-[#FBBF23] text-sm font-medium">
                    {currentTime.toLocaleDateString("en-US", {
                      weekday: "long",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </motion.div>
                <h1 className="text-3xl lg:text-4xl font-bold text-white mb-2">
                  {getGreeting()},{" "}
                  <span className="text-[#23D3EE]">
                    {user?.firstName || "Guest"}
                  </span>
                  ! 👋
                </h1>
                <p className="text-slate-300 text-lg max-w-xl">
                  Here's what's happening with your business today. You have{" "}
                  <span className="text-[#23D3EE] font-semibold">
                    {stats.pendingTasks} tasks
                  </span>{" "}
                  pending.
                </p>
              </div>

              {/* Quick Stats Mini */}
              <div className="flex gap-4">
                {[
                  {
                    label: "Today's Revenue",
                    value: "$1,250",
                    icon: TrendingUp,
                    trend: "+12%",
                  },
                  {
                    label: "New Leads",
                    value: "8",
                    icon: Target,
                    trend: "+3",
                  },
                ].map((item, i) => (
                  <motion.div
                    key={i}
                    initial={{ opacity: 0, y: 20 }}
                    animate={{ opacity: 1, y: 0 }}
                    transition={{ delay: 0.3 + i * 0.1 }}
                    className="bg-white/10 backdrop-blur-sm border border-white/10 rounded-2xl p-4 min-w-[140px]"
                  >
                    <div className="flex items-center gap-2 mb-2">
                      <item.icon size={16} className="text-[#23D3EE]" />
                      <span className="text-xs text-slate-400">{item.label}</span>
                    </div>
                    <div className="flex items-baseline gap-2">
                      <span className="text-2xl font-bold text-white">
                        {item.value}
                      </span>
                      <span className="text-xs text-green-400 font-medium">
                        {item.trend}
                      </span>
                    </div>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>

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
                  whileHover={{ scale: 1.02, y: -4 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => handleQuickAction(action.path)}
                  className="flex items-center gap-4 p-4 bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 hover:border-[#23D3EE]/30 hover:shadow-lg hover:shadow-[#23D3EE]/5 transition-all group"
                >
                  <div
                    className={cn(
                      "w-12 h-12 rounded-xl flex items-center justify-center transition-all bg-gradient-to-br",
                      colors.gradient
                    )}
                  >
                    <action.icon size={22} className="text-white" />
                  </div>
                  <div className="text-left">
                    <p className="font-semibold text-[#0F172A] dark:text-white group-hover:text-[#23D3EE] transition-colors">
                      {action.title}
                    </p>
                    <p className="text-xs text-slate-400">{action.description}</p>
                  </div>
                  <ArrowUpRight
                    size={16}
                    className="ml-auto text-slate-300 group-hover:text-[#23D3EE] transition-colors"
                  />
                </motion.button>
              );
            })}
          </div>

          {/* Stats Grid - Using StatCard Component */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
            <StatCard
              title="Active Projects"
              value={stats.projectsCount}
              subtitle="Total projects"
              trend={10}
              icon={FolderKanban}
              color="teal"
              isLoading={isLoading}
              delay={0}
            />
            <StatCard
              title="Total Earnings"
              value={`$${stats.earnings.toLocaleString()}`}
              subtitle="Paid invoices"
              trend={25}
              icon={DollarSign}
              color="gold"
              isLoading={isLoading}
              delay={0.1}
            />
            <StatCard
              title="Total Clients"
              value={stats.clientsCount}
              subtitle="Active clients"
              trend={5}
              icon={Users}
              color="navy"
              isLoading={isLoading}
              delay={0.2}
            />
            <StatCard
              title="Pending Tasks"
              value={stats.pendingTasks}
              subtitle="Due this week"
              trend={-3}
              icon={Clock}
              color="purple"
              isLoading={isLoading}
              delay={0.3}
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
              className="bg-white dark:bg-slate-800 rounded-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="p-6 border-b border-slate-100 dark:border-slate-700">
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 rounded-xl bg-[#23D3EE]/10 flex items-center justify-center">
                      <Zap size={18} className="text-[#23D3EE]" />
                    </div>
                    <div>
                      <h3 className="font-semibold text-[#0F172A] dark:text-white">
                        Recent Activity
                      </h3>
                      <p className="text-xs text-slate-400">Latest updates</p>
                    </div>
                  </div>
                  <button
                    onClick={() => navigate("/activity")}
                    className="text-sm text-[#23D3EE] font-medium hover:underline"
                  >
                    View All
                  </button>
                </div>
              </div>

              <div className="divide-y divide-slate-100 dark:divide-slate-700">
                {recentActivity.map((activity, index) => {
                  const colors = getColorClasses(activity.color);
                  return (
                    <motion.div
                      key={activity.id}
                      initial={{ opacity: 0, x: -20 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.1 * index }}
                      className="p-4 hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors cursor-pointer group"
                    >
                      <div className="flex items-start gap-3">
                        <div
                          className={cn(
                            "w-10 h-10 rounded-xl flex items-center justify-center flex-shrink-0",
                            colors.light
                          )}
                        >
                          <activity.icon size={18} className={colors.text} />
                        </div>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm text-[#0F172A] dark:text-white group-hover:text-[#23D3EE] transition-colors">
                            {activity.message}
                          </p>
                          <p className="text-xs text-slate-400 mt-1 flex items-center gap-1">
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
        <footer className="px-6 py-4 border-t border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800">
          <div className="flex flex-col sm:flex-row items-center justify-between gap-4 text-sm text-slate-400">
            <div className="flex items-center gap-2">
              <span>© {new Date().getFullYear()}</span>
              <span className="font-semibold text-[#0F172A] dark:text-white">
                Yoursoft
              </span>
              <span className="text-[#23D3EE] font-semibold">Digital</span>
              <span>• All rights reserved</span>
            </div>
            <div className="flex items-center gap-4">
              <a
                href="#"
                className="hover:text-[#23D3EE] transition-colors"
              >
                Privacy
              </a>
              <a
                href="#"
                className="hover:text-[#23D3EE] transition-colors"
              >
                Terms
              </a>
              <a
                href="#"
                className="hover:text-[#23D3EE] transition-colors"
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
            className="fixed inset-0 z-50 flex items-start justify-center pt-20 px-4 bg-black/50 backdrop-blur-sm"
            onClick={() => setShowSearchModal(false)}
          >
            <motion.div
              initial={{ opacity: 0, y: -20, scale: 0.95 }}
              animate={{ opacity: 1, y: 0, scale: 1 }}
              exit={{ opacity: 0, y: -20, scale: 0.95 }}
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-2xl bg-white dark:bg-slate-800 rounded-2xl shadow-2xl border border-slate-200 dark:border-slate-700 overflow-hidden"
            >
              <div className="flex items-center gap-3 p-4 border-b border-slate-200 dark:border-slate-700">
                <Search size={20} className="text-slate-400" />
                <input
                  ref={searchInputRef}
                  type="text"
                  placeholder="Search projects, clients, invoices..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="flex-1 bg-transparent text-lg text-slate-900 dark:text-white placeholder:text-slate-400 focus:outline-none"
                />
                <button
                  onClick={() => setShowSearchModal(false)}
                  className="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-slate-700 text-slate-400 transition-colors"
                >
                  <X size={18} />
                </button>
              </div>

              <div className="p-4">
                <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mb-3">
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
                        className="w-full flex items-center gap-3 p-3 rounded-xl hover:bg-slate-50 dark:hover:bg-slate-700/50 transition-colors group"
                      >
                        <div
                          className={cn(
                            "w-10 h-10 rounded-lg flex items-center justify-center",
                            colors.light
                          )}
                        >
                          <action.icon size={18} className={colors.text} />
                        </div>
                        <div className="text-left">
                          <p className="text-sm font-medium text-[#0F172A] dark:text-white group-hover:text-[#23D3EE] transition-colors">
                            {action.title}
                          </p>
                          <p className="text-xs text-slate-400">
                            {action.description}
                          </p>
                        </div>
                        <ArrowUpRight
                          size={14}
                          className="ml-auto text-slate-300 group-hover:text-[#23D3EE] transition-colors"
                        />
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="px-4 py-3 bg-slate-50 dark:bg-slate-700/50 border-t border-slate-200 dark:border-slate-700">
                <div className="flex items-center justify-between text-xs text-slate-400">
                  <div className="flex items-center gap-4">
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 font-mono">
                        ↵
                      </kbd>
                      to select
                    </span>
                    <span className="flex items-center gap-1">
                      <kbd className="px-1.5 py-0.5 rounded bg-white dark:bg-slate-600 border border-slate-200 dark:border-slate-500 font-mono">
                        esc
                      </kbd>
                      to close
                    </span>
                  </div>
                  <span>Powered by Yoursoft Digital</span>
                </div>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
};

export default Index;
