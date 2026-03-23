import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import {
  getEnabledFeatures,
  subscribeEnabledFeatures,
  type FeatureId,
} from "@/lib/enabled-features";
import {
  LayoutDashboard,
  Users,
  FolderKanban,
  FileText,
  CalendarCheck,
  Receipt,
  UserCog,
  ShoppingCart,
  Mail,
  MessageSquare,
  ChevronRight,
  Menu,
  X,
  Circle,
  Briefcase,
  Landmark,
  CalendarDays,
  LogOut,
  Settings,
  ChevronDown,
  Sparkles,
  Target,
  Contact,
  Clock,
  FileStack,
  BarChart3,
  TrendingUp,
  Bell,
  Plug,
  Shield,
  HelpCircle,
  CreditCard,
  Wallet,
  PieChart,
  Calendar,
  CheckSquare,
  Headphones,
  BookOpen,
  Globe,
  Zap,
  Package,
  Truck,
  Tags,
  Megaphone,
  Building2,
  UserPlus,
  GitBranch,
  Layers,
  Award,
  Star,
  CalendarOff,
  UserCheck,
  type LucideIcon,
} from "lucide-react";
import logo from "../Images/Logo/logo.png";

// ============================================
// TYPES
// ============================================

interface SubMenuItem {
  title: string;
  path: string;
  featureId?: FeatureId | FeatureId[];
  permissionModule?: string;
  badge?: string | number;
  badgeColor?: "teal" | "gold" | "red" | "blue";
  isNew?: boolean;
}

interface NavigationItem {
  title: string;
  icon?: LucideIcon;
  path?: string;
  featureId?: FeatureId | FeatureId[];
  permissionModule?: string;
  isHeader?: boolean;
  submenu?: SubMenuItem[];
  badge?: string | number;
  badgeColor?: "teal" | "gold" | "red" | "blue";
  isNew?: boolean;
  isPro?: boolean;
}

interface SidebarProps {
  collapsed?: boolean;
  setCollapsed?: (value: boolean) => void;
  forceRender?: boolean;
  mobileOpen?: boolean;
  setMobileOpen?: (value: boolean) => void;
}

export const SidebarSuppressionContext = createContext<boolean>(false);

// ============================================
// NAVIGATION CONFIGURATION
// ============================================

const navigationItems: NavigationItem[] = [
  // ===== MAIN =====
  { title: "Main", isHeader: true },
  {
    title: "Dashboard",
    icon: LayoutDashboard,
    path: "/dashboard",
    permissionModule: "dashboard",
  },
  {
    title: "Calendar",
    icon: Calendar,
    path: "/calendar",
    featureId: "calendar",
    permissionModule: "calendar",
    isNew: true,
  },
  {
    title: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
    featureId: "tasks",
    permissionModule: "tasks",
    badge: 5,
    badgeColor: "red",
  },

  // ===== CRM =====
  { title: "CRM", isHeader: true },
  {
    title: "Leads",
    icon: Target,
    featureId: "leads",
    permissionModule: "leads",
    submenu: [
      { title: "All Leads", path: "/leads", featureId: "leads" },
      { title: "Pipeline", path: "/leads/pipeline", featureId: "leads", isNew: true },
      { title: "Lead Sources", path: "/leads/sources", featureId: "leads", permissionModule: "lead-sources" },
    ]
  },
  {
    title: "Clients",
    icon: Users,
    featureId: "clients",
    permissionModule: "clients",
    submenu: [
      { title: "Client List", path: "/client-list", featureId: "clients" },
      { title: "Client Contacts", path: "/contacts", featureId: "clients", permissionModule: "contacts" },
      { title: "Client Groups", path: "/clients/groups", featureId: "clients" },
    ]
  },

  // ===== PROJECT MANAGEMENT =====
  { title: "Projects", isHeader: true },
  {
    title: "All Projects",
    icon: Briefcase,
    featureId: "projects",
    permissionModule: "projects",
    submenu: [
      { title: "Active Projects", path: "/projects", featureId: "projects" },
      { title: "Archived", path: "javascript:void(0)", featureId: "projects" },
      { title: "Templates", path: "javascript:void(0)", featureId: "projects" },
    ]
  },
  {
    title: "Kanban Board",
    icon: FolderKanban,
    path: "/kanban",
    featureId: "kanban",
    permissionModule: "projects",
  },
  {
    title: "File Manager",
    icon: FileText,
    path: "/filemanager",
    featureId: "files",
    permissionModule: "files",
  },

  // ===== FINANCE =====
  { title: "Finance", isHeader: true },
  {
    title: "Invoices",
    icon: Receipt,
    featureId: "finance",
    permissionModule: "invoices",
    submenu: [
      { title: "All Invoices", path: "/invoice", featureId: "finance" },
      { title: "Create Invoice", path: "/invoice/create", featureId: "finance" },
      { title: "Recurring", path: "javascript:void(0)", featureId: "finance" },
    ]
  },
  {
    title: "Quotes",
    icon: FileStack,
    path: "/quotes",
    featureId: "finance",
    permissionModule: "quotes",
    isNew: true,
  },
  {
    title: "Payments",
    icon: CreditCard,
    featureId: "finance",
    permissionModule: "invoices",
    submenu: [
      { title: "All Payments", path: "javascript:void(0)", featureId: "finance" },
      { title: "Payment Methods", path: "javascript:void(0)", featureId: "finance" },
      { title: "Transactions", path: "javascript:void(0)", featureId: "finance" },
    ]
  },

  // ===== BUSINESS =====
  { title: "Business", isHeader: true },
  {
    title: "AI Roof Estimator",
    icon: Zap,
    path: "/roof-estimator",
    featureId: "roofEstimator",
    permissionModule: "roof-estimator",
    badge: "AI",
    badgeColor: "teal",
  },
  {
    title: "Inspections",
    icon: CheckSquare,
    path: "/inspections",
    featureId: "leads",
    permissionModule: "leads",
    isNew: true,
  },
  {
    title: "Insurance Claims",
    icon: Shield,
    path: "javascript:void(0)",
    featureId: "leads",
    permissionModule: "leads",
    isNew: true,
  },

  // ===== COMMUNICATION =====
  { title: "Communication", isHeader: true },
  {
    title: "Letter Box",
    icon: Mail,
    path: "/letterbox",
    featureId: "letterbox",
    permissionModule: "emails",
    badge: 12,
    badgeColor: "teal",
  },
  {
    title: "Chats",
    icon: MessageSquare,
    path: "/chats",
    featureId: "chat",
    permissionModule: "chat",
    badge: "●",
    badgeColor: "teal",
  },
  {
    title: "Support",
    icon: Headphones,
    featureId: "support",
    submenu: [
      { title: "Tickets", path: "/support/tickets", featureId: "support", badge: 4, badgeColor: "red" },
      { title: "Knowledge Base", path: "/support/knowledge-base", featureId: "support" },
      { title: "FAQ", path: "/support/faq", featureId: "support" },
    ]
  },
  {
    title: "Notifications",
    icon: Bell,
    path: "/notifications",
    featureId: "letterbox",
    permissionModule: "notifications",
    badge: 7,
    badgeColor: "red",
  },
  // ===== TEAM =====
  { title: "Team", isHeader: true },
  {
    title: "Employees",
    icon: UserCog,
    featureId: "team",
    permissionModule: "employees",
    submenu: [
      { title: "All Employees", path: "/employees", featureId: "team" },
      { title: "Departments", path: "/employees/departments", featureId: "team", isNew: true },
      { title: "Attendance", path: "/employees/attendance", featureId: "team" },
      { title: "Leave Requests", path: "/employees/leave-requests", featureId: "team", badge: 2, badgeColor: "gold" },
    ]
  },
  {
    title: "Users",
    icon: Users,
    path: "/users",
    featureId: "team",
    permissionModule: "employees",
  },
  {
    title: "Roles & Permissions",
    icon: Shield,
    path: "/roles",
    featureId: "team",
    permissionModule: "roles",
  },

  // ===== ANALYTICS =====
  { title: "Analytics", isHeader: true },
  {
    title: "Reports",
    icon: BarChart3,
    featureId: "reports",
    permissionModule: "analytics",
    submenu: [
      { title: "Sales Report", path: "/reports/sales", featureId: "reports" },
      { title: "Revenue Report", path: "/reports/revenue", featureId: "reports" },
      { title: "Expense Report", path: "/reports/expenses", featureId: "reports" },
      { title: "Custom Reports", path: "/reports/custom", featureId: "reports", isPro: true },
    ]
  },
  {
    title: "Analytics",
    icon: TrendingUp,
    path: "/analytics",
    featureId: "analytics",
    permissionModule: "analytics",
    isPro: true,
  },

  // ===== SETTINGS =====
  { title: "Settings", isHeader: true },
  {
    title: "Settings",
    icon: Settings,
    permissionModule: "settings",
    submenu: [
      { title: "General", path: "/settings/general" },
      { title: "Company Profile", path: "/settings/company" },
      { title: "Billing", path: "/settings/billing" },
      { title: "Email Settings", path: "/settings/email" },
      { title: "Security", path: "/settings/security" },
      { title: "Integrations", path: "/settings/integrations/whatsapp" },
    ]
  },
  {
    title: "Integrations",
    icon: Plug,
    path: "/integrations",
    permissionModule: "settings",
    isNew: true,
  },
  {
    title: "Help Center",
    icon: HelpCircle,
    path: "/help",
  },
];

// ============================================
// FEATURE FILTERING
// ============================================

const hasFeatureAccess = (
  required: FeatureId | FeatureId[] | undefined,
  enabled: Set<FeatureId>
): boolean => {
  if (!required) return true;
  const list = Array.isArray(required) ? required : [required];
  return list.some((f) => enabled.has(f));
};

// ============================================
// PERMISSION-BASED FILTERING
// ============================================

/** Check if user has ANY permission for a given module */
const hasModulePermission = (
  permissionModule: string | undefined,
  userPermissions: string[] | null
): boolean => {
  // No permissionModule defined = always visible (e.g. Help Center)
  if (!permissionModule) return true;
  // No permissions loaded = show everything (Owner/Admin or legacy user)
  if (!userPermissions) return true;
  // Permission codes use dot notation: "module.action" (e.g. "leads.view", "invoices.create")
  return userPermissions.some((code) => {
    const dotIndex = code.lastIndexOf('.');
    if (dotIndex === -1) return false;
    const codeModule = code.substring(0, dotIndex);
    return codeModule === permissionModule;
  });
};

const filterNavigationItems = (
  items: NavigationItem[],
  enabled: Set<FeatureId>,
  userPermissions: string[] | null,
  isOwnerOrAdmin: boolean
): NavigationItem[] => {
  const sections: Array<{ header: NavigationItem | null; items: NavigationItem[] }> = [];
  let current: { header: NavigationItem | null; items: NavigationItem[] } = {
    header: null,
    items: [],
  };

  for (const item of items) {
    if (item.isHeader) {
      if (current.header || current.items.length > 0) sections.push(current);
      current = { header: item, items: [] };
      continue;
    }
    current.items.push(item);
  }
  sections.push(current);

  const filtered: NavigationItem[] = [];

  for (const section of sections) {
    const visibleItems = section.items
      .map((item) => {
        // Feature gate check
        if (!hasFeatureAccess(item.featureId, enabled)) return null;

        // Permission check (Owner/Admin bypass)
        if (!isOwnerOrAdmin && !hasModulePermission(item.permissionModule, userPermissions)) return null;

        // Regular link item
        if (!item.submenu) return item;

        // Submenu group: filter children
        const submenu = item.submenu
          .filter((sub) => {
            if (!hasFeatureAccess(sub.featureId ?? item.featureId, enabled)) return false;
            // Check sub-item permission if it has its own permissionModule
            if (!isOwnerOrAdmin && sub.permissionModule && !hasModulePermission(sub.permissionModule, userPermissions)) return false;
            return true;
          })
          .map((sub) => ({ ...sub }));

        if (submenu.length === 0) return null;

        return { ...item, submenu };
      })
      .filter(Boolean) as NavigationItem[];

    if (visibleItems.length === 0) continue;
    if (section.header) filtered.push(section.header);
    filtered.push(...visibleItems);
  }

  return filtered;
};

// ============================================
// BADGE COMPONENT
// ============================================

const Badge = ({
  children,
  color = "teal",
  size = "sm"
}: {
  children: React.ReactNode;
  color?: "teal" | "gold" | "red" | "blue";
  size?: "xs" | "sm";
}) => {
  const colorClasses = {
    teal: "bg-[#6637F4] text-white",
    gold: "bg-[#FBBF23] text-[#0F172A]",
    red: "bg-red-500 text-white",
    blue: "bg-blue-500 text-white",
  };

  const sizeClasses = {
    xs: "text-[9px] px-1 py-0.5 min-w-[14px]",
    sm: "text-[10px] px-1.5 py-0.5 min-w-[18px]",
  };

  return (
    <span className={cn(
      "rounded-full font-bold inline-flex items-center justify-center",
      colorClasses[color],
      sizeClasses[size]
    )}>
      {children}
    </span>
  );
};

// ============================================
// NEW/PRO TAG COMPONENT
// ============================================

const Tag = ({ type }: { type: "new" | "pro" }) => {
  if (type === "new") {
    return (
      <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#F1F5F9]/80 text-[#0F172A] rounded-md uppercase tracking-wider">
        New
      </span>
    );
  }
  return (
    <span className="px-1.5 py-0.5 text-[9px] font-bold bg-[#F1F5F9]/80 text-[#0F172A] rounded-md uppercase tracking-wider flex items-center gap-0.5">
      <Star size={8} className="fill-current" />
      Pro
    </span>
  );
};

// ============================================
// MAIN SIDEBAR COMPONENT
// ============================================

export function Sidebar({
  collapsed: controlledCollapsed,
  setCollapsed: controlledSetCollapsed,
  forceRender = false,
  mobileOpen = false,
  setMobileOpen,
}: SidebarProps) {
  const suppressSidebar = useContext(SidebarSuppressionContext);
  if (suppressSidebar && !forceRender) return null;

  const { isMobile, isTablet } = useIsMobile();
  const [internalCollapsed, setInternalCollapsed] = useState(false);
  const collapsed = isMobile ? false : (isTablet ? true : (controlledCollapsed ?? internalCollapsed));
  const setCollapsed = controlledSetCollapsed ?? setInternalCollapsed;

  const closeMobileDrawer = useCallback(() => {
    setMobileOpen?.(false);
  }, [setMobileOpen]);

  const location = useLocation();
  const [enabledFeatures, setEnabledFeaturesState] = useState<FeatureId[]>(() =>
    getEnabledFeatures()
  );
  const [openSubmenus, setOpenSubmenus] = useState<{ [key: string]: boolean }>({});
  const [user, setUser] = useState<{ firstName: string; lastName: string; email?: string } | null>(null);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [upgradeDismissed, setUpgradeDismissed] = useState(false);
  const [userPermissions, setUserPermissions] = useState<string[] | null>(null);
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(true);

  useEffect(() => {
    return subscribeEnabledFeatures(() =>
      setEnabledFeaturesState(getEnabledFeatures())
    );
  }, []);

  // Load user permissions from localStorage
  useEffect(() => {
    const loadPermissions = () => {
      try {
        const storedPerms = localStorage.getItem("permissions");
        const storedEmployee = localStorage.getItem("employee");
        if (storedPerms) {
          const perms = JSON.parse(storedPerms);
          setUserPermissions(Array.isArray(perms) ? perms : null);
        }
        // Check if user is Owner or Admin (bypass permission filtering)
        if (storedEmployee) {
          const emp = JSON.parse(storedEmployee);
          const roleName = emp?.role?.name || emp?.roleName || "";
          setIsOwnerOrAdmin(["Owner", "Admin", "Super Admin"].includes(roleName));
        } else {
          // If no employee record, user is likely the tenant owner
          setIsOwnerOrAdmin(true);
        }
      } catch (e) {
        console.error("Failed to parse permissions");
      }
    };
    loadPermissions();
    window.addEventListener("storage", loadPermissions);
    return () => window.removeEventListener("storage", loadPermissions);
  }, []);

  const enabledFeatureSet = useMemo(
    () => new Set<FeatureId>(enabledFeatures),
    [enabledFeatures]
  );

  const visibleNavigationItems = useMemo(
    () => filterNavigationItems(navigationItems, enabledFeatureSet, userPermissions, isOwnerOrAdmin),
    [enabledFeatureSet, userPermissions, isOwnerOrAdmin]
  );

  // Auto-open submenu if current path is inside it
  useEffect(() => {
    visibleNavigationItems.forEach((item) => {
      if (item.submenu) {
        const isActive = item.submenu.some((sub) =>
          location.pathname === sub.path || location.pathname.startsWith(sub.path + '/')
        );
        if (isActive) {
          setOpenSubmenus((prev) => ({ ...prev, [item.title]: true }));
        }
      }
    });
    // Auto-close mobile drawer on route change
    closeMobileDrawer();
  }, [location.pathname, visibleNavigationItems, closeMobileDrawer]);

  useEffect(() => {
    const loadUser = () => {
      const storedUser = localStorage.getItem("user");
      if (storedUser) {
        try {
          setUser(JSON.parse(storedUser));
        } catch (e) {
          console.error("Failed to parse user data");
        }
      }
    };
    loadUser();
    window.addEventListener("storage", loadUser);
    return () => window.removeEventListener("storage", loadUser);
  }, []);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getInitials = () => (user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "GU");
  const getFullName = () => (user ? `${user.firstName} ${user.lastName}` : "Guest User");
  const getEmail = () => user?.email || "guest@yoursoft.ca";

  // Check if path is active (exact match or starts with for nested routes)
  const isActive = (path: string) => {
    if (path === "/employees") {
      return location.pathname === "/employees" || location.pathname === "/employees/all";
    }
    return location.pathname === path;
  };

  // Check if any submenu item is active
  const isSubmenuActive = (submenu: SubMenuItem[]) => {
    return submenu.some((item) => {
      if (item.path === "/employees") {
        return location.pathname === "/employees" || location.pathname === "/employees/all";
      }
      return location.pathname === item.path || location.pathname.startsWith(item.path + '/');
    });
  };

  // Calculate total notifications/badges for collapsed tooltip
  const getTotalBadge = (item: NavigationItem): number | null => {
    if (item.badge && typeof item.badge === "number") return item.badge;
    if (item.submenu) {
      const total = item.submenu.reduce((acc, sub) => {
        if (sub.badge && typeof sub.badge === "number") return acc + sub.badge;
        return acc;
      }, 0);
      return total > 0 ? total : null;
    }
    return null;
  };

  // On mobile, sidebar is hidden unless mobileOpen is true
  const sidebarVisible = isMobile ? mobileOpen : true;

  return (
    <>
      {/* Mobile overlay backdrop */}
      {isMobile && mobileOpen && (
        <div
          className="sidebar-overlay"
          onClick={closeMobileDrawer}
          aria-hidden
        />
      )}

      {/* Sidebar */}
      <aside
        className={cn(
          "fixed top-0 left-0 h-screen z-[46] transition-all duration-300 flex flex-col bg-white border-r border-[rgba(15,23,42,0.06)]",
          collapsed ? "w-20" : "w-72",
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen && "translate-x-0 shadow-2xl",
        )}
      >

        {/* Header */}
        <div className="relative flex h-16 items-center justify-between px-4 border-b border-[rgba(15,23,42,0.06)] flex-shrink-0">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-col items-center flex-1"
              >
                <img
                  src={logo}
                  alt="ZODO"
                  className="h-12 w-auto object-contain"
                />
                <span className="text-[7px] text-[#94A3B8] tracking-[0.2em] uppercase mt-0.5">One Stop Solution</span>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto"
              >
                <img
                  src={logo}
                  alt="ZODO"
                  className="h-10 w-10 object-contain rounded-xl"
                />
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => setCollapsed(!collapsed)}
            className={cn(
              "p-2 rounded-md hover:bg-[#F1F5F9]/20 text-[#475569] hover:text-[#6637F4] transition-all",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <Menu size={20} /> : <X size={20} />}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto p-4 space-y-1 custom-scrollbar">
          {visibleNavigationItems.map((item, index) => {
            // Header
            if (item.isHeader) {
              return !collapsed ? (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-6 pb-2 first:pt-0"
                >
                  <p className="px-3 text-[10px] font-semibold text-[#475569] uppercase tracking-[0.15em]">
                    {item.title}
                  </p>
                </motion.div>
              ) : (
                <div key={index} className="my-3 mx-2 border-t border-[rgba(15,23,42,0.06)]" />
              );
            }

            const Icon = item.icon;
            const totalBadge = getTotalBadge(item);

            // Submenu
            if (item.submenu) {
              const isOpen = openSubmenus[item.title];
              const hasActiveChild = isSubmenuActive(item.submenu);

              return (
                <div key={index}>
                  <motion.button
                    whileHover={{ x: collapsed ? 0 : 4 }}
                    onClick={() => !collapsed && toggleSubmenu(item.title)}
                    className={cn(
                      "flex items-center justify-between w-full gap-3 px-3 py-2 rounded-lg transition-all group relative",
                      hasActiveChild
                        ? "bg-[#F0EEFF] text-[#6637F4]"
                        : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                      collapsed && "justify-center px-3"
                    )}
                  >
                    {/* Left accent bar for active parent */}
                    {hasActiveChild && !collapsed && (
                      <div className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#6637F4] rounded-r-full" />
                    )}
                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "transition-colors",
                        hasActiveChild ? "text-[#6637F4]" : "text-[#94A3B8] group-hover:text-[#475569]"
                      )}>
                        {Icon && <Icon size={18} strokeWidth={1.75} />}
                      </div>
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </div>
                    {!collapsed && (
                      <div className="flex items-center gap-2">
                        {item.isNew && <Tag type="new" />}
                        {item.isPro && <Tag type="pro" />}
                        {item.badge && (
                          <Badge color={item.badgeColor}>{item.badge}</Badge>
                        )}
                        <motion.div
                          animate={{ rotate: isOpen ? 90 : 0 }}
                          transition={{ duration: 0.2 }}
                        >
                          <ChevronRight className="h-4 w-4" />
                        </motion.div>
                      </div>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-md text-[#0F172A] text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 card-shadow">
                        <div className="flex items-center gap-2">
                          {item.title}
                          {totalBadge && <Badge color="red" size="xs">{totalBadge}</Badge>}
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-[rgba(15,23,42,0.06)] rotate-45" />
                      </div>
                    )}
                  </motion.button>

                  <AnimatePresence>
                    {!collapsed && isOpen && (
                      <motion.div
                        initial={{ opacity: 0, height: 0 }}
                        animate={{ opacity: 1, height: "auto" }}
                        exit={{ opacity: 0, height: 0 }}
                        transition={{ duration: 0.2 }}
                        className="overflow-hidden"
                      >
                        <div className="pl-4 mt-1 space-y-0.5 border-l-2 border-[rgba(15,23,42,0.06)] ml-6">
                          {item.submenu.map((subItem, subIndex) => (
                            <motion.div
                              key={subIndex}
                              initial={{ opacity: 0, x: -10 }}
                              animate={{ opacity: 1, x: 0 }}
                              transition={{ delay: subIndex * 0.05 }}
                            >
                              {subItem.path.startsWith("javascript:") ? (
                                <a
                                  href="javascript:void(0)"
                                  className={cn(
                                    "flex items-center justify-between gap-2 px-3 py-2 rounded-md text-sm transition-all group/sub cursor-not-allowed opacity-60",
                                    "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                                  )}
                                  title="Coming Soon"
                                >
                                  <div className="flex items-center gap-2">
                                    <Circle className="h-1.5 w-1.5 fill-[#64748B]" />
                                    <span>{subItem.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#F1F5F9] text-[#94A3B8] rounded uppercase tracking-wider">Soon</span>
                                    {subItem.isNew && <Tag type="new" />}
                                  </div>
                                </a>
                              ) : (
                                <Link
                                  to={subItem.path}
                                  className={cn(
                                    "flex items-center justify-between gap-2 px-3 py-2 rounded-lg text-sm transition-all group/sub",
                                    isActive(subItem.path)
                                      ? "bg-[#6637F4]/10 text-[#6637F4] font-medium"
                                      : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Circle
                                      className={cn(
                                        "h-1.5 w-1.5 transition-all",
                                        isActive(subItem.path)
                                          ? "fill-[#6637F4] scale-125"
                                          : "fill-[#64748B] group-hover/sub:fill-[#6637F4]"
                                      )}
                                    />
                                    <span>{subItem.title}</span>
                                  </div>
                                  <div className="flex items-center gap-1.5">
                                    {subItem.isNew && <Tag type="new" />}
                                    {subItem.badge && (
                                      <Badge color={subItem.badgeColor} size="xs">
                                        {subItem.badge}
                                      </Badge>
                                    )}
                                  </div>
                                </Link>
                              )}
                            </motion.div>
                          ))}
                        </div>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              );
            }

            // Regular Link
            return (
              <motion.div key={index} whileHover={{ x: collapsed ? 0 : 4 }}>
                {(item.path || "").startsWith("javascript:") ? (
                  <a
                    href="javascript:void(0)"
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 rounded-md transition-all group relative cursor-not-allowed opacity-60",
                      "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                      collapsed && "justify-center px-3"
                    )}
                    title="Coming Soon"
                  >
                    <div className="flex items-center gap-3">
                      <div className="text-[#94A3B8] group-hover:text-[#475569] transition-colors">
                        {Icon && <Icon size={18} strokeWidth={1.75} />}
                      </div>
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </div>
                    {!collapsed && (
                      <div className="flex items-center gap-1.5">
                        <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#F1F5F9] text-[#94A3B8] rounded uppercase tracking-wider">Soon</span>
                        {item.isNew && <Tag type="new" />}
                      </div>
                    )}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-md text-[#0F172A] text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 card-shadow">
                        <div className="flex items-center gap-2">
                          {item.title}
                          <span className="px-1.5 py-0.5 text-[8px] font-bold bg-[#F1F5F9] text-[#94A3B8] rounded uppercase">Soon</span>
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-[rgba(15,23,42,0.06)] rotate-45" />
                      </div>
                    )}
                  </a>
                ) : (
                  <Link
                    to={item.path || "#"}
                    className={cn(
                      "flex items-center justify-between gap-3 px-3 py-2 rounded-lg transition-all group relative",
                      isActive(item.path!)
                        ? "bg-[#F0EEFF] text-[#6637F4]"
                        : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                      collapsed && "justify-center px-3"
                    )}
                  >
                    {/* Active Indicator */}
                    {isActive(item.path!) && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-6 bg-[#6637F4] rounded-r-full"
                      />
                    )}

                    <div className="flex items-center gap-3">
                      <div className={cn(
                        "transition-colors",
                        isActive(item.path!) ? "text-[#6637F4]" : "text-[#94A3B8] group-hover:text-[#475569]"
                      )}>
                        {Icon && <Icon size={18} strokeWidth={1.75} />}
                        {collapsed && item.badge && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="font-medium text-sm">{item.title}</span>
                      )}
                    </div>

                    {!collapsed && (
                      <div className="flex items-center gap-1.5">
                        {item.isNew && <Tag type="new" />}
                        {item.isPro && <Tag type="pro" />}
                        {item.badge && (
                          <Badge color={item.badgeColor}>{item.badge}</Badge>
                        )}
                      </div>
                    )}

                    {/* Tooltip for collapsed state */}
                    {collapsed && (
                      <div className="absolute left-full ml-2 px-3 py-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-md text-[#0F172A] text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 card-shadow">
                        <div className="flex items-center gap-2">
                          {item.title}
                          {item.badge && typeof item.badge === "number" && (
                            <Badge color={item.badgeColor} size="xs">{item.badge}</Badge>
                          )}
                          {item.isNew && <Tag type="new" />}
                        </div>
                        <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-[rgba(15,23,42,0.06)] rotate-45" />
                      </div>
                    )}
                  </Link>
                )}
              </motion.div>
            );
          })}
        </nav>

        {/* Upgrade Banner - Only when expanded + plan-aware + dismissible */}
        {!collapsed && !upgradeDismissed && (() => {
          // Read plan from localStorage
          let plan = 'free';
          try {
            const storedUser = localStorage.getItem('user');
            if (storedUser) {
              const parsed = JSON.parse(storedUser);
              plan = (parsed.subscriptionTier || parsed.planType || 'free').toLowerCase();
            }
          } catch {}
          // Don't show for premium/pro users
          if (plan === 'premium' || plan === 'pro') return null;
          const upgradeTarget = plan === 'standard' ? 'Premium' : plan === 'basic' ? 'Standard or Premium' : 'Pro';
          return (
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              className="mx-4 mb-4"
            >
              <div className="rounded-md bg-white border border-[rgba(15,23,42,0.06)] p-4 relative">
                <button
                  onClick={() => setUpgradeDismissed(true)}
                  className="absolute top-2 right-2 p-1 rounded-md text-[#94A3B8] hover:text-[#0F172A] hover:bg-[#F1F5F9] transition-colors"
                >
                  <X size={14} />
                </button>
                <div className="flex items-center gap-2 mb-2">
                  <Award size={16} className="text-[#FF7B36]" />
                  <span className="text-sm font-semibold text-[#0F172A]">Upgrade to {upgradeTarget}</span>
                </div>
                <p className="text-xs text-[#475569] mb-3">
                  Unlock advanced analytics, custom reports, and more.
                </p>
                <button
                  className="w-full py-2 bg-[#FF7B36] hover:bg-[#FF7B36]/90 text-white text-xs font-semibold rounded-lg transition-colors"
                >
                  Upgrade Now
                </button>
              </div>
            </motion.div>
          );
        })()}

        {/* User Footer */}
        <div className="relative p-4 border-t border-[rgba(15,23,42,0.06)] flex-shrink-0">
          <AnimatePresence>
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                exit={{ opacity: 0 }}
              >
                {/* User Menu Toggle */}
                <motion.button
                  whileHover={{ scale: 1.02 }}
                  onClick={() => setShowUserMenu(!showUserMenu)}
                  className="w-full flex items-center gap-3 p-3 rounded-md bg-white hover:bg-[#F1F5F9] transition-colors group"
                >
                  <div className="relative">
                    <div className="h-9 w-9 rounded-md bg-[#6637F4] flex items-center justify-center text-white font-bold text-sm">
                      {getInitials()}
                    </div>
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#01C44A] rounded-full border-2 border-[#F7F7FB]"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-sm font-medium text-[#0F172A] truncate">
                      {getFullName()}
                    </p>
                    <p className="text-xs text-[#475569] truncate">{getEmail()}</p>
                  </div>
                  <motion.div
                    animate={{ rotate: showUserMenu ? 180 : 0 }}
                    transition={{ duration: 0.2 }}
                  >
                    <ChevronDown size={16} className="text-[#475569]" />
                  </motion.div>
                </motion.button>

                {/* User Dropdown Menu */}
                <AnimatePresence>
                  {showUserMenu && (
                    <motion.div
                      initial={{ opacity: 0, y: 10 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0, y: 10 }}
                      className="absolute bottom-full left-4 right-4 mb-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-md card-shadow overflow-hidden"
                    >
                      <div className="p-3 border-b border-[rgba(15,23,42,0.06)]">
                        <p className="text-xs text-[#475569]">Signed in as</p>
                        <p className="text-sm font-medium text-[#0F172A] truncate">
                          {getEmail()}
                        </p>
                      </div>
                      <Link
                        to="/profile"
                        className="flex items-center gap-3 px-4 py-2.5 text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                      >
                        <UserCog size={18} />
                        <span className="text-sm font-medium">My Profile</span>
                      </Link>
                      <Link
                        to="/settings"
                        className="flex items-center gap-3 px-4 py-2.5 text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                      >
                        <Settings size={18} />
                        <span className="text-sm font-medium">Settings</span>
                      </Link>
                      <Link
                        to="/help"
                        className="flex items-center gap-3 px-4 py-2.5 text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A] transition-colors"
                      >
                        <HelpCircle size={18} />
                        <span className="text-sm font-medium">Help & Support</span>
                      </Link>
                      <div className="border-t border-[rgba(15,23,42,0.06)]">
                        <button
                          onClick={() => {
                            localStorage.removeItem("user");
                            localStorage.removeItem("token");
                            window.location.href = "/login";
                          }}
                          className="flex items-center gap-3 px-4 py-3 text-red-400 hover:bg-red-500/10 hover:text-red-300 transition-all w-full"
                        >
                          <LogOut size={18} />
                          <span className="text-sm font-medium">Logout</span>
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0 }}
                animate={{ opacity: 1 }}
                className="flex justify-center"
              >
                <motion.div
                  whileHover={{ scale: 1.1 }}
                  className="relative cursor-pointer group"
                  onClick={() => setCollapsed(false)}
                >
                  <div className="h-9 w-9 rounded-md bg-[#6637F4] flex items-center justify-center text-white font-bold text-sm">
                    {getInitials()}
                  </div>
                  <div className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#01C44A] rounded-full border-2 border-[#F7F7FB]" />

                  {/* Tooltip */}
                  <div className="absolute left-full ml-2 px-3 py-2 bg-white border border-[rgba(15,23,42,0.06)] rounded-md text-[#0F172A] text-sm font-medium opacity-0 invisible group-hover:opacity-100 group-hover:visible transition-all whitespace-nowrap z-50 card-shadow">
                    {getFullName()}
                    <div className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 w-2 h-2 bg-white border-l border-b border-[rgba(15,23,42,0.06)] rotate-45" />
                  </div>
                </motion.div>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Version Badge */}
        {!collapsed && (
          <div className="px-4 pb-4">
            <div className="px-3 py-1.5 rounded-md bg-white border border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center justify-between">
                <span className="text-[10px] text-[#94A3B8]">Version</span>
                <div className="flex items-center gap-1.5">
                  <span className="text-[10px] font-medium text-[#475569]">v2.1.0</span>
                  <span className="w-1.5 h-1.5 bg-[#01C44A] rounded-full" />
                </div>
              </div>
            </div>
          </div>
        )}
      </aside>

      {/* Spacer — hidden on mobile, matches sidebar width on desktop */}
      {!isMobile && (
        <div
          className={cn(
            "flex-shrink-0 transition-all duration-300 hide-mobile",
            collapsed ? "w-20" : "w-72"
          )}
        />
      )}

      {/* ─── Mobile Bottom Tab Bar ─── */}
      {isMobile && (
        <nav className="fixed bottom-0 left-0 right-0 z-[60] bg-white/98 backdrop-blur-lg border-t border-[rgba(15,23,42,0.08)]" style={{ paddingBottom: 'env(safe-area-inset-bottom, 0px)' }}>
          <div className="flex items-center justify-around h-14">
            {[
              { icon: LayoutDashboard, label: "Dashboard", path: "/dashboard" },
              { icon: Target, label: "Pipeline", path: "/leads/pipeline" },
              { icon: Briefcase, label: "Projects", path: "/projects" },
              { icon: Receipt, label: "Finance", path: "/invoice" },
              { icon: MessageSquare, label: "Chats", path: "/chats" },
            ].map((tab) => {
              const active = location.pathname === tab.path || location.pathname.startsWith(tab.path + "/");
              return (
                <Link
                  key={tab.path}
                  to={tab.path}
                  className={cn(
                    "flex flex-col items-center gap-0.5 min-w-0 px-2 py-1 transition-colors",
                    active ? "text-[#6637F4]" : "text-[#94A3B8]"
                  )}
                >
                  <tab.icon size={20} strokeWidth={active ? 2.2 : 1.5} />
                  <span className={cn("text-[10px] leading-tight", active ? "font-semibold" : "font-medium")}>{tab.label}</span>
                </Link>
              );
            })}
          </div>
        </nav>
      )}

      {/* Custom Scrollbar Styles */}
      <style>{`
        .custom-scrollbar::-webkit-scrollbar {
          width: 3px;
        }
        .custom-scrollbar::-webkit-scrollbar-track {
          background: transparent;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb {
          background: rgba(148, 163, 184, 0.15);
          border-radius: 10px;
        }
        .custom-scrollbar::-webkit-scrollbar-thumb:hover {
          background: rgba(148, 163, 184, 0.3);
        }
      `}</style>
    </>
  );
}
