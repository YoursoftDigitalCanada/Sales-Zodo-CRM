import { createContext, useContext, useEffect, useMemo, useState, useCallback } from "react";
import { Link, useLocation } from "react-router-dom";
import useIsMobile from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import { motion, AnimatePresence } from "framer-motion";
import { getTasks, type TaskEntity } from "@/features/tasks/services/tasks-service";
import { getNotificationCounts } from "@/features/notifications";
import { getEmails } from "@/features/emails/services/emails-service";
import { getTicketStats } from "@/services/supportTicketsService";
import { getLeaveRequests, getMyLeaveRequests } from "@/features/users/services/users-service";
import { getLeads, type LeadEntity } from "@/features/leads/services/leads-service";
import { getConversations } from "@/features/chat";
import { hasPermissionWithAliases } from "@/lib/permission-aliases";
import {
  getEnabledFeatures,
  subscribeEnabledFeatures,
  type FeatureId,
} from "@/lib/enabled-features";
import { useWorkspaceBranding } from "@/features/settings/context/workspace-branding";
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
  Phone,
  UserPlus,
  GitBranch,
  Layers,
  Award,
  Star,
  CalendarOff,
  UserCheck,
  BadgeDollarSign,
  FileSignature,
  type LucideIcon,
} from "lucide-react";
import { AUTH_ACCESS_UPDATED_EVENT, AUTH_STORAGE_KEYS, getStoredTenant } from "@/features/auth/lib/auth-storage";

// ============================================
// TYPES
// ============================================

interface SubMenuItem {
  title: string;
  path: string;
  featureId?: FeatureId | FeatureId[];
  permissionModule?: string | string[];
  adminOnly?: boolean;
  badge?: string | number;
  badgeColor?: "teal" | "gold" | "red" | "blue";
  isNew?: boolean;
}

interface NavigationItem {
  title: string;
  icon?: LucideIcon;
  path?: string;
  featureId?: FeatureId | FeatureId[];
  permissionModule?: string | string[];
  adminOnly?: boolean;
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

type BadgeColor = NonNullable<NavigationItem["badgeColor"]>;

interface SidebarRuntimeMetaEntry {
  badge?: string | number;
  badgeColor?: BadgeColor;
  isNew?: boolean;
}

type SidebarRuntimeMeta = Record<string, SidebarRuntimeMetaEntry>;

export const SidebarSuppressionContext = createContext<boolean>(false);

const SIDEBAR_META_KEYS = {
  tasks: "/tasks",
  pipeline: "/pipeline",
  letterbox: "/mail",
  chats: "/chats",
  tickets: "/support/tickets",
  notifications: "/notifications",
  leaveRequests: "/employees/leave-requests",
} as const;

const RECENT_LEAD_WINDOW_MS = 1000 * 60 * 60 * 24 * 3;

function applyRuntimeMeta(items: NavigationItem[], runtimeMeta: SidebarRuntimeMeta): NavigationItem[] {
  return items.map((item) => {
    const itemKey = item.path;
    const itemMeta = itemKey ? runtimeMeta[itemKey] : undefined;

    return {
      ...item,
      ...(itemMeta ? itemMeta : {}),
      submenu: item.submenu?.map((subItem) => {
        const subMeta = runtimeMeta[subItem.path];
        return subMeta ? { ...subItem, ...subMeta } : subItem;
      }),
    };
  });
}

function isPendingTask(task: TaskEntity): boolean {
  const status = String(task.status || "").toUpperCase();
  return status !== "DONE" && status !== "COMPLETED" && status !== "CANCELLED";
}

function isRecentLead(lead: LeadEntity): boolean {
  const createdAt = new Date(String(lead.createdAt || ""));
  if (Number.isNaN(createdAt.getTime())) {
    return false;
  }

  return Date.now() - createdAt.getTime() <= RECENT_LEAD_WINDOW_MS;
}

function readStoredPermissions(): string[] | null {
  try {
    const storedPerms = localStorage.getItem(AUTH_STORAGE_KEYS.permissions);
    if (!storedPerms) {
      return null;
    }

    const perms = JSON.parse(storedPerms);
    return Array.isArray(perms) ? perms : null;
  } catch {
    return null;
  }
}

function readStoredOwnerOrAdmin(): boolean {
  try {
    const storedEmployee = localStorage.getItem("employee");
    if (!storedEmployee) {
      return false;
    }

    const employee = JSON.parse(storedEmployee);
    const roleName = employee?.role?.name || employee?.roleName || "";
    return ["Owner", "Admin", "Super Admin"].includes(roleName);
  } catch {
    return false;
  }
}

// ============================================
// NAVIGATION CONFIGURATION
// ============================================

const navigationItems: NavigationItem[] = [
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
  },
  {
    title: "Tasks",
    icon: CheckSquare,
    path: "/tasks",
    featureId: "tasks",
    permissionModule: "tasks",
  },

  { title: "CRM", isHeader: true },
  {
    title: "Leads",
    icon: Target,
    path: "/leads",
    featureId: "leads",
    permissionModule: "leads",
  },
  {
    title: "Organizations",
    icon: Building2,
    path: "/organizations",
    featureId: "clients",
    permissionModule: "clients",
  },
  {
    title: "Contacts",
    icon: Contact,
    path: "/contacts",
    featureId: "clients",
    permissionModule: "contacts",
  },
  {
    title: "Deals",
    icon: Briefcase,
    path: "/deals",
    featureId: "projects",
    permissionModule: "projects",
  },

  { title: "Sales", isHeader: true },
  {
    title: "Task Pipeline",
    icon: FolderKanban,
    path: "/pipeline",
    featureId: "kanban",
    permissionModule: "task_pipeline",
  },
  {
    title: "Meetings",
    icon: CalendarCheck,
    path: "/meetings",
    featureId: "calendar",
    permissionModule: "meetings",
  },
  {
    title: "Calls",
    icon: Phone,
    path: "/calls",
    featureId: "tasks",
    permissionModule: "calls",
  },
  {
    title: "Sequences",
    icon: GitBranch,
    path: "/sequences",
    featureId: "letterbox",
    permissionModule: "sequences",
  },
  {
    title: "Email Templates",
    icon: Mail,
    path: "/email-templates",
    featureId: "letterbox",
    permissionModule: "email_templates",
  },

  { title: "Finance", isHeader: true },
  {
    title: "Proposals",
    icon: FileText,
    path: "/proposals",
    featureId: "finance",
    permissionModule: "quotes",
  },
  {
    title: "Contracts",
    icon: FileSignature,
    path: "/contracts",
    featureId: "finance",
    permissionModule: "contracts",
  },
  {
    title: "Invoices",
    icon: Receipt,
    path: "/invoice",
    featureId: "finance",
    permissionModule: "invoices",
  },
  {
    title: "Payments",
    icon: Wallet,
    path: "/payments",
    featureId: "finance",
    permissionModule: "payments",
  },
  {
    title: "Bookkeeping",
    icon: Landmark,
    path: "/bookkeeping",
    featureId: "finance",
    permissionModule: "bookkeeping",
  },
  {
    title: "Subscriptions",
    icon: CreditCard,
    path: "/subscriptions",
    featureId: "finance",
    permissionModule: "subscriptions",
  },
  {
    title: "Pricing Plans",
    icon: BadgeDollarSign,
    path: "/pricing-plans",
    featureId: "finance",
    permissionModule: "pricing_plans",
  },

  { title: "Communication", isHeader: true },
  {
    title: "Mail",
    icon: Mail,
    path: "/mail",
    featureId: "letterbox",
    permissionModule: "emails",
  },
  {
    title: "Chats",
    icon: MessageSquare,
    path: "/chats",
    featureId: "chat",
    permissionModule: "chat",
  },
  {
    title: "Notifications",
    icon: Bell,
    path: "/notifications",
    featureId: "letterbox",
    permissionModule: "notifications",
  },
  {
    title: "Documents",
    icon: FileStack,
    path: "/documents",
    featureId: "files",
    permissionModule: "files",
  },

  { title: "AI", isHeader: true },
  {
    title: "Sales Assistant",
    icon: Sparkles,
    path: "/ai/sales-assistant",
    featureId: "aiAssistant",
    permissionModule: "sales_assistant",
  },
  {
    title: "Email Generator",
    icon: Zap,
    path: "/ai/email-generator",
    featureId: "letterbox",
    permissionModule: "email_generator",
  },
  {
    title: "Lead Scoring",
    icon: Award,
    path: "/ai/lead-scoring",
    featureId: "aiAssistant",
    permissionModule: "lead_scoring",
  },
  {
    title: "Deal Insights",
    icon: PieChart,
    path: "/ai/deal-insights",
    featureId: "aiAssistant",
    permissionModule: "deal_insights",
  },

  { title: "Team", isHeader: true },
  {
    title: "Users",
    icon: Users,
    path: "/users",
    featureId: "team",
    permissionModule: "users",
  },
  {
    title: "Roles",
    icon: Shield,
    path: "/roles",
    featureId: "team",
    permissionModule: "roles",
  },

  { title: "Analytics", isHeader: true },
  {
    title: "Reports",
    icon: BarChart3,
    path: "/reports",
    featureId: "reports",
    permissionModule: "reports",
  },
  {
    title: "Forecast",
    icon: TrendingUp,
    path: "/forecast",
    featureId: "analytics",
    permissionModule: "forecast",
  },
  {
    title: "Website Analytics",
    icon: Globe,
    path: "/website-analytics",
    featureId: "analytics",
    permissionModule: "website_analytics",
    isNew: true,
  },

  { title: "Settings", isHeader: true },
  {
    title: "Settings",
    icon: Settings,
    path: "/settings/general",
    permissionModule: "settings",
  },
  {
    title: "Integrations",
    icon: Plug,
    path: "/integrations",
    permissionModule: "settings",
  },
  {
    title: "Automation",
    icon: Zap,
    path: "/automation",
    permissionModule: "automation",
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

/** Check if user has the module's view permission */
const hasModulePermission = (
  permissionModule: string | string[] | undefined,
  userPermissions: string[] | null
): boolean => {
  if (!permissionModule) return true;
  if (Array.isArray(permissionModule)) {
    return permissionModule.some((module) => hasModulePermission(module, userPermissions));
  }
  if (!userPermissions) return false;
  return hasPermissionWithAliases(userPermissions, `${permissionModule}.view`);
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

        if (!isOwnerOrAdmin && item.adminOnly) return null;

        // Permission check (Owner/Admin bypass)
        if (!isOwnerOrAdmin && !hasModulePermission(item.permissionModule, userPermissions)) return null;

        // Regular link item
        if (!item.submenu) return item;

        // Submenu group: filter children
        const submenu = item.submenu
          .filter((sub) => {
            if (!hasFeatureAccess(sub.featureId ?? item.featureId, enabled)) return false;
            if (!isOwnerOrAdmin && sub.adminOnly) return false;
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

function getBrandInitials(name: string): string {
  const parts = name.trim().split(/\s+/).filter(Boolean);
  if (parts.length === 0) return "WS";
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return `${parts[0][0] || ""}${parts[1][0] || ""}`.toUpperCase();
}

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

  const { branding } = useWorkspaceBranding();
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
  const [userPermissions, setUserPermissions] = useState<string[] | null>(() => readStoredPermissions());
  const [isOwnerOrAdmin, setIsOwnerOrAdmin] = useState(() => readStoredOwnerOrAdmin());
  const [runtimeNavigationMeta, setRuntimeNavigationMeta] = useState<SidebarRuntimeMeta>({});
  const storedTenantName = getStoredTenant()?.name?.trim();
  const brandName = branding?.companyName?.trim() || storedTenantName || "Sales CRM";
  const brandLogoUrl = branding?.logoUrl || null;
  const brandInitials = getBrandInitials(brandName);

  useEffect(() => {
    return subscribeEnabledFeatures(() =>
      setEnabledFeaturesState(getEnabledFeatures())
    );
  }, []);

  // Load user permissions from localStorage
  useEffect(() => {
    const loadPermissions = () => {
      try {
        setUserPermissions(readStoredPermissions());
        setIsOwnerOrAdmin(readStoredOwnerOrAdmin());
      } catch (e) {
        console.error("Failed to parse permissions");
      }
    };
    loadPermissions();
    window.addEventListener("storage", loadPermissions);
    window.addEventListener(AUTH_ACCESS_UPDATED_EVENT, loadPermissions);
    return () => {
      window.removeEventListener("storage", loadPermissions);
      window.removeEventListener(AUTH_ACCESS_UPDATED_EVENT, loadPermissions);
    };
  }, []);

  const enabledFeatureSet = useMemo(
    () => new Set<FeatureId>(enabledFeatures),
    [enabledFeatures]
  );

  const runtimeNavigationItems = useMemo(
    () => applyRuntimeMeta(navigationItems, runtimeNavigationMeta),
    [runtimeNavigationMeta]
  );

  const visibleNavigationItems = useMemo(
    () => filterNavigationItems(runtimeNavigationItems, enabledFeatureSet, userPermissions, isOwnerOrAdmin),
    [enabledFeatureSet, runtimeNavigationItems, userPermissions, isOwnerOrAdmin]
  );

  useEffect(() => {
    const canAccessItem = (featureId?: FeatureId, permissionModule?: string) =>
      hasFeatureAccess(featureId, enabledFeatureSet) &&
      (isOwnerOrAdmin || hasModulePermission(permissionModule, userPermissions));

    const loadSidebarMeta = async () => {
      const requests: Array<Promise<SidebarRuntimeMeta>> = [];

      if (canAccessItem("tasks", "tasks")) {
        requests.push(
          getTasks({ limit: 200 })
            .then((tasks) => {
              const pendingCount = tasks.filter(isPendingTask).length;
              return pendingCount > 0
                ? {
                    [SIDEBAR_META_KEYS.tasks]: {
                      badge: pendingCount,
                      badgeColor: "red",
                    },
                  }
                : {};
            })
            .catch(() => ({}))
        );
      }

      if (canAccessItem("leads", "leads")) {
        requests.push(
          getLeads({ limit: 20, sortBy: "createdAt", sortOrder: "desc" })
            .then((leads) => ({
              [SIDEBAR_META_KEYS.pipeline]: {
                isNew: leads.some(isRecentLead),
              },
            }))
            .catch(() => ({}))
        );
      }

      if (canAccessItem("letterbox", "emails")) {
        requests.push(
          getEmails({ folder: "INBOX", limit: 200 })
            .then((emails) => {
              const unreadCount = emails.filter((email) => !email.isRead).length;
              return unreadCount > 0
                ? {
                    [SIDEBAR_META_KEYS.letterbox]: {
                      badge: unreadCount,
                      badgeColor: "teal",
                    },
                  }
                : {};
            })
            .catch(() => ({}))
        );
      }

      if (canAccessItem("chat", "chat")) {
        requests.push(
          getConversations()
            .then((conversations) => {
              const unreadCount = conversations.reduce((total, conversation) => total + Number(conversation.unreadCount || 0), 0);
              return unreadCount > 0
                ? {
                    [SIDEBAR_META_KEYS.chats]: {
                      badge: unreadCount,
                      badgeColor: "teal",
                    },
                  }
                : {};
            })
            .catch(() => ({}))
        );
      }

      if (hasFeatureAccess("support", enabledFeatureSet)) {
        requests.push(
          getTicketStats()
            .then((stats) => {
              const activeTickets = Number(stats.open || 0) + Number(stats.inProgress || 0) + Number(stats.waiting || 0);
              return activeTickets > 0
                ? {
                    [SIDEBAR_META_KEYS.tickets]: {
                      badge: activeTickets,
                      badgeColor: "red",
                    },
                  }
                : {};
            })
            .catch(() => ({}))
        );
      }

      if (canAccessItem("letterbox", "notifications")) {
        requests.push(
          getNotificationCounts()
            .then((counts) => {
              const unreadCount = Number(counts.unread || 0);
              return unreadCount > 0
                ? {
                    [SIDEBAR_META_KEYS.notifications]: {
                      badge: unreadCount,
                      badgeColor: "red",
                    },
                  }
                : {};
            })
            .catch(() => ({}))
        );
      }

      if (hasFeatureAccess("team", enabledFeatureSet)) {
        requests.push(
          (isOwnerOrAdmin ? getLeaveRequests() : getMyLeaveRequests())
            .then((requestsList) => {
              const pendingCount = requestsList.filter((request) => request.status === "pending").length;
              return pendingCount > 0
                ? {
                    [SIDEBAR_META_KEYS.leaveRequests]: {
                      badge: pendingCount,
                      badgeColor: "gold",
                    },
                  }
                : {};
            })
            .catch(() => ({}))
        );
      }

      const results = await Promise.all(requests);
      setRuntimeNavigationMeta(Object.assign({}, ...results));
    };

    void loadSidebarMeta();

    const intervalId = window.setInterval(() => {
      void loadSidebarMeta();
    }, 60000);

    return () => {
      window.clearInterval(intervalId);
    };
  }, [enabledFeatureSet, isOwnerOrAdmin, location.pathname, userPermissions]);

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
  }, [location.pathname, visibleNavigationItems]);

  useEffect(() => {
    closeMobileDrawer();
  }, [location.pathname, closeMobileDrawer]);

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
    window.addEventListener(AUTH_ACCESS_UPDATED_EVENT, loadUser);
    return () => {
      window.removeEventListener("storage", loadUser);
      window.removeEventListener(AUTH_ACCESS_UPDATED_EVENT, loadUser);
    };
  }, []);

  const toggleSubmenu = (title: string) => {
    setOpenSubmenus((prev) => ({ ...prev, [title]: !prev[title] }));
  };

  const getInitials = () => (user ? (user.firstName[0] + user.lastName[0]).toUpperCase() : "GU");
  const getFullName = () => (user ? `${user.firstName} ${user.lastName}` : "Guest User");
  const getEmail = () => user?.email || "guest@yoursoft.ca";
  const getAvatar = () => (user?.avatar && typeof user.avatar === "string" ? user.avatar : "");

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
          collapsed ? "w-16" : "w-56",
          isMobile && !mobileOpen && "-translate-x-full",
          isMobile && mobileOpen && "translate-x-0 shadow-2xl",
        )}
      >

        {/* Header */}
        <div className="relative flex h-14 items-center justify-between px-3 border-b border-[rgba(15,23,42,0.06)] flex-shrink-0">
          <AnimatePresence mode="wait">
            {!collapsed ? (
              <motion.div
                initial={{ opacity: 0, x: -20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                className="flex flex-1 items-center"
              >
                <div className="flex min-w-0 items-center">
                  <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
                    {brandLogoUrl ? (
                      <img
                        src={brandLogoUrl}
                        alt={brandName}
                        className="h-full w-full object-contain p-1.5"
                      />
                    ) : (
                      <span className="text-sm font-bold uppercase tracking-[0.14em] text-[#0891B2]">{brandInitials}</span>
                    )}
                  </div>
                </div>
              </motion.div>
            ) : (
              <motion.div
                initial={{ opacity: 0, scale: 0.8 }}
                animate={{ opacity: 1, scale: 1 }}
                className="mx-auto"
              >
                <div className="flex h-9 w-9 items-center justify-center overflow-hidden rounded-lg border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
                  {brandLogoUrl ? (
                    <img
                      src={brandLogoUrl}
                      alt={brandName}
                      className="h-full w-full object-contain p-1.5"
                    />
                  ) : (
                    <span className="text-xs font-bold uppercase tracking-[0.14em] text-[#0891B2]">{brandInitials}</span>
                  )}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <motion.button
            whileHover={{ scale: 1.05 }}
            whileTap={{ scale: 0.95 }}
            onClick={() => {
              if (isMobile) {
                closeMobileDrawer();
                return;
              }
              setCollapsed(!collapsed);
            }}
            className={cn(
              "p-1.5 rounded-md hover:bg-[#F1F5F9]/20 text-[#475569] hover:text-[#159A62] transition-all",
              collapsed && "mx-auto"
            )}
          >
            {collapsed ? <Menu size={17} /> : <X size={17} />}
          </motion.button>
        </div>

        {/* Navigation */}
        <nav className="relative flex-1 overflow-y-auto p-3 space-y-0.5 custom-scrollbar">
          {visibleNavigationItems.map((item, index) => {
            // Header
            if (item.isHeader) {
              return !collapsed ? (
                <motion.div
                  key={index}
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  className="pt-4 pb-1 first:pt-0"
                >
                  <p className="px-2 text-[10px] font-medium text-[#64748B]">
                    {item.title}
                  </p>
                </motion.div>
              ) : (
                <div key={index} className="my-2 mx-2 border-t border-[rgba(15,23,42,0.06)]" />
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
                      "flex items-center justify-between w-full gap-2 px-2.5 py-1.5 rounded-md transition-all group relative",
                      hasActiveChild
                        ? "bg-[#EAF7EF] text-[#159A62]"
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
                        hasActiveChild ? "text-[#159A62]" : "text-[#64748B] group-hover:text-[#475569]"
                      )}>
                        {Icon && <Icon size={14} strokeWidth={1.9} />}
                      </div>
                      {!collapsed && (
                        <span className="font-medium text-[13px]">{item.title}</span>
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
                                    "flex items-center justify-between gap-2 px-3 py-1.5 rounded-md text-[12px] transition-all group/sub",
                                    isActive(subItem.path)
                                      ? "bg-[#EAF7EF] text-[#159A62] font-medium"
                                      : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]"
                                  )}
                                >
                                  <div className="flex items-center gap-2">
                                    <Circle
                                      className={cn(
                                        "h-1.5 w-1.5 transition-all",
                                        isActive(subItem.path)
                                          ? "fill-[#159A62] scale-125"
                                          : "fill-[#64748B] group-hover/sub:fill-[#159A62]"
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
                      "flex items-center justify-between gap-2 px-2.5 py-1.5 rounded-md transition-all group relative",
                      isActive(item.path!)
                        ? "bg-[#EAF7EF] text-[#159A62]"
                        : "text-[#475569] hover:bg-[#F1F5F9] hover:text-[#0F172A]",
                      collapsed && "justify-center px-3"
                    )}
                  >
                    {/* Active Indicator */}
                    {isActive(item.path!) && (
                      <motion.div
                        layoutId="activeIndicator"
                        className="absolute left-0 top-1/2 -translate-y-1/2 w-[3px] h-5 bg-[#159A62] rounded-r-full"
                      />
                    )}

                    <div className="flex items-center gap-2.5">
                      <div className={cn(
                        "transition-colors",
                        isActive(item.path!) ? "text-[#159A62]" : "text-[#64748B] group-hover:text-[#475569]"
                      )}>
                        {Icon && <Icon size={14} strokeWidth={1.9} />}
                        {collapsed && item.badge && (
                          <span className="absolute -top-1 -right-1 w-2 h-2 bg-red-500 rounded-full" />
                        )}
                      </div>
                      {!collapsed && (
                        <span className="font-medium text-[13px]">{item.title}</span>
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
              className="mx-3 mb-3"
            >
              <div className="rounded-lg bg-white border border-[rgba(15,23,42,0.06)] p-3 relative">
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
        <div className="relative p-3 border-t border-[rgba(15,23,42,0.06)] flex-shrink-0">
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
                  className="w-full flex items-center gap-2.5 p-2 rounded-lg bg-white hover:bg-[#F1F5F9] transition-colors group"
                >
                  <div className="relative">
                    {getAvatar() ? (
                      <img
                        src={getAvatar()}
                        alt={getFullName()}
                        className="h-8 w-8 rounded-lg object-cover"
                      />
                    ) : (
                      <div className="h-8 w-8 rounded-lg bg-[#EAF7EF] flex items-center justify-center text-[#159A62] font-bold text-[11px]">
                        {getInitials()}
                      </div>
                    )}
                    <motion.div
                      animate={{ scale: [1, 1.2, 1] }}
                      transition={{ repeat: Infinity, duration: 2, delay: 1 }}
                      className="absolute -bottom-0.5 -right-0.5 w-2.5 h-2.5 bg-[#01C44A] rounded-full border-2 border-[#F7F7FB]"
                    />
                  </div>
                  <div className="flex-1 min-w-0 text-left">
                    <p className="text-[12px] font-medium text-[#0F172A] truncate">
                      {getFullName()}
                    </p>
                    <p className="text-[10px] text-[#64748B] truncate">{getEmail()}</p>
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
                  {getAvatar() ? (
                    <img
                      src={getAvatar()}
                      alt={getFullName()}
                      className="h-9 w-9 rounded-md object-cover"
                    />
                  ) : (
                    <div className="h-9 w-9 rounded-md bg-[#6637F4] flex items-center justify-center text-white font-bold text-sm">
                      {getInitials()}
                    </div>
                  )}
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
          <div className="px-3 pb-3">
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
            collapsed ? "w-16" : "w-56"
          )}
        />
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
