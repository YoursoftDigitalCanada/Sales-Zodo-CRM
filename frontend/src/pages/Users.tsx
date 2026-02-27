// src/pages/UsersPage.tsx

import React, { useEffect, useState, useMemo } from "react";
// import { Sidebar } from "@/components/Sidebar"; // Removed: global sidebar in App.tsx
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { useToast } from "@/components/ui/use-toast";
import { cn } from "@/lib/utils";
import { getUsers, createUser as createUserApi, updateUser as updateUserApi, deleteUser as deleteUserApi } from "@/features/users";
import {
  Bell,
  Search,
  Plus,
  Filter,
  Download,
  Upload,
  MoreVertical,
  MoreHorizontal,
  LayoutGrid,
  List,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  Eye,
  Pencil,
  Trash2,
  Copy,
  X,
  Check,
  CheckCircle2,
  AlertCircle,
  Clock,
  Calendar,
  Star,
  StarOff,
  User,
  UserPlus,
  UserMinus,
  UserCheck,
  UserX,
  Users,
  UsersRound,
  Shield,
  ShieldCheck,
  ShieldAlert,
  ShieldOff,
  Key,
  Lock,
  Unlock,
  Mail,
  MailPlus,
  Phone,
  MapPin,
  Building2,
  Briefcase,
  GraduationCap,
  Crown,
  Award,
  Activity,
  BarChart3,
  TrendingUp,
  TrendingDown,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Settings,
  LogIn,
  LogOut,
  History,
  Globe,
  Smartphone,
  Monitor,
  Camera,
  Image as ImageIcon,
  Send,
  UserCog,
  Sparkles,
  Zap,
  type LucideIcon,
} from "lucide-react";

// ============================================
// TYPES
// ============================================

interface User {
  id: number;
  fullName: string;
  email: string;
  phone?: string;
  role: string;
  department?: string;
  position?: string;
  avatarUrl?: string;
  status: "active" | "inactive" | "pending" | "suspended";
  lastLogin?: string;
  createdAt: string;
  updatedAt?: string;
  isOnline?: boolean;
  permissions?: string[];
  teams?: string[];
  manager?: string;
  location?: string;
  bio?: string;
  skills?: string[];
  loginCount?: number;
  tasksCompleted?: number;
  projectsCount?: number;
}

interface Role {
  id: string;
  name: string;
  description: string;
  color: string;
  icon: LucideIcon;
  permissions: string[];
  userCount: number;
}

interface Department {
  id: string;
  name: string;
  head?: string;
  userCount: number;
  color: string;
}

interface ActivityLog {
  id: string;
  userId: number;
  action: string;
  description: string;
  timestamp: string;
  ip?: string;
  device?: string;
}

interface UserStats {
  totalUsers: number;
  activeUsers: number;
  newUsersThisMonth: number;
  pendingInvitations: number;
}

// ============================================
// DUMMY DATA
// ============================================

const roles: Role[] = [
  {
    id: "admin",
    name: "Administrator",
    description: "Full system access",
    color: "#EF4444",
    icon: Crown,
    permissions: ["all"],
    userCount: 2,
  },
  {
    id: "manager",
    name: "Manager",
    description: "Team management access",
    color: "#8B5CF6",
    icon: ShieldCheck,
    permissions: ["read", "write", "manage_team"],
    userCount: 5,
  },
  {
    id: "staff",
    name: "Staff",
    description: "Standard employee access",
    color: "#22D3EE",
    icon: User,
    permissions: ["read", "write"],
    userCount: 18,
  },
  {
    id: "viewer",
    name: "Viewer",
    description: "Read-only access",
    color: "#6B7280",
    icon: Eye,
    permissions: ["read"],
    userCount: 8,
  },
];

const departments: Department[] = [
  { id: "engineering", name: "Engineering", head: "John Smith", userCount: 12, color: "#3B82F6" },
  { id: "design", name: "Design", head: "Sarah Johnson", userCount: 6, color: "#EC4899" },
  { id: "marketing", name: "Marketing", head: "Mike Chen", userCount: 8, color: "#F97316" },
  { id: "sales", name: "Sales", head: "Emily Davis", userCount: 10, color: "#22C55E" },
  { id: "hr", name: "Human Resources", head: "Lisa Brown", userCount: 4, color: "#8B5CF6" },
];

const initialUsers: User[] = [
  {
    id: 1,
    fullName: "John Smith",
    email: "john.smith@yoursoft.ca",
    phone: "+1 (555) 123-4567",
    role: "admin",
    department: "Engineering",
    position: "CTO",
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150",
    status: "active",
    lastLogin: "2024-01-20T10:30:00Z",
    createdAt: "2023-06-15T09:00:00Z",
    isOnline: true,
    location: "Toronto, Canada",
    teams: ["Core Team", "Leadership"],
    loginCount: 245,
    tasksCompleted: 156,
    projectsCount: 12,
  },
  {
    id: 2,
    fullName: "Sarah Johnson",
    email: "sarah.j@yoursoft.ca",
    phone: "+1 (555) 234-5678",
    role: "manager",
    department: "Design",
    position: "Design Lead",
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150",
    status: "active",
    lastLogin: "2024-01-20T09:15:00Z",
    createdAt: "2023-07-20T10:00:00Z",
    isOnline: true,
    location: "Vancouver, Canada",
    teams: ["Design Team", "Product"],
    loginCount: 198,
    tasksCompleted: 234,
    projectsCount: 8,
  },
  {
    id: 3,
    fullName: "Michael Chen",
    email: "m.chen@yoursoft.ca",
    phone: "+1 (555) 345-6789",
    role: "manager",
    department: "Marketing",
    position: "Marketing Manager",
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150",
    status: "active",
    lastLogin: "2024-01-19T16:45:00Z",
    createdAt: "2023-08-10T11:00:00Z",
    isOnline: false,
    location: "Montreal, Canada",
    teams: ["Marketing", "Growth"],
    loginCount: 167,
    tasksCompleted: 189,
    projectsCount: 6,
  },
  {
    id: 4,
    fullName: "Emily Davis",
    email: "emily.d@yoursoft.ca",
    phone: "+1 (555) 456-7890",
    role: "staff",
    department: "Sales",
    position: "Sales Representative",
    avatarUrl: "https://images.unsplash.com/photo-1438761681033-6461ffad8d80?w=150",
    status: "active",
    lastLogin: "2024-01-20T08:00:00Z",
    createdAt: "2023-09-05T09:30:00Z",
    isOnline: true,
    location: "Calgary, Canada",
    teams: ["Sales Team"],
    loginCount: 134,
    tasksCompleted: 267,
    projectsCount: 15,
  },
  {
    id: 5,
    fullName: "David Wilson",
    email: "d.wilson@yoursoft.ca",
    phone: "+1 (555) 567-8901",
    role: "staff",
    department: "Engineering",
    position: "Senior Developer",
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150",
    status: "active",
    lastLogin: "2024-01-20T11:00:00Z",
    createdAt: "2023-10-15T14:00:00Z",
    isOnline: true,
    location: "Ottawa, Canada",
    teams: ["Core Team", "Backend"],
    loginCount: 189,
    tasksCompleted: 312,
    projectsCount: 9,
  },
  {
    id: 6,
    fullName: "Jessica Martinez",
    email: "j.martinez@yoursoft.ca",
    role: "staff",
    department: "Design",
    position: "UI Designer",
    status: "pending",
    createdAt: "2024-01-18T10:00:00Z",
    location: "Edmonton, Canada",
    teams: ["Design Team"],
    loginCount: 0,
    tasksCompleted: 0,
    projectsCount: 0,
  },
  {
    id: 7,
    fullName: "Robert Brown",
    email: "r.brown@yoursoft.ca",
    phone: "+1 (555) 789-0123",
    role: "viewer",
    department: "HR",
    position: "HR Specialist",
    avatarUrl: "https://images.unsplash.com/photo-1507591064344-4c6ce005b128?w=150",
    status: "inactive",
    lastLogin: "2024-01-10T09:00:00Z",
    createdAt: "2023-05-20T08:00:00Z",
    isOnline: false,
    location: "Toronto, Canada",
    teams: ["HR Team"],
    loginCount: 45,
    tasksCompleted: 78,
    projectsCount: 3,
  },
  {
    id: 8,
    fullName: "Amanda Lee",
    email: "a.lee@yoursoft.ca",
    phone: "+1 (555) 890-1234",
    role: "staff",
    department: "Engineering",
    position: "Frontend Developer",
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150",
    status: "active",
    lastLogin: "2024-01-20T10:00:00Z",
    createdAt: "2023-11-01T10:00:00Z",
    isOnline: true,
    location: "Vancouver, Canada",
    teams: ["Core Team", "Frontend"],
    loginCount: 156,
    tasksCompleted: 198,
    projectsCount: 7,
  },
];

const activityLogs: ActivityLog[] = [
  { id: "1", userId: 1, action: "login", description: "Logged in from Chrome on Windows", timestamp: "2024-01-20T10:30:00Z", ip: "192.168.1.1", device: "Desktop" },
  { id: "2", userId: 2, action: "update_profile", description: "Updated profile picture", timestamp: "2024-01-20T09:45:00Z", ip: "192.168.1.2", device: "Mobile" },
  { id: "3", userId: 4, action: "create_task", description: "Created new task: Client Follow-up", timestamp: "2024-01-20T08:30:00Z", ip: "192.168.1.4", device: "Desktop" },
  { id: "4", userId: 5, action: "complete_task", description: "Completed task: API Integration", timestamp: "2024-01-19T17:00:00Z", ip: "192.168.1.5", device: "Desktop" },
  { id: "5", userId: 3, action: "logout", description: "Logged out", timestamp: "2024-01-19T16:45:00Z", ip: "192.168.1.3", device: "Desktop" },
];

const userStats: UserStats = {
  totalUsers: 33,
  activeUsers: 28,
  newUsersThisMonth: 5,
  pendingInvitations: 3,
};

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getStatusColor = (status: string) => {
  switch (status) {
    case "active":
      return { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" };
    case "inactive":
      return { bg: "bg-white/5", text: "text-[#94A3B8]", dot: "bg-slate-400" };
    case "pending":
      return { bg: "bg-yellow-50", text: "text-yellow-600", dot: "bg-yellow-500" };
    case "suspended":
      return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    default:
      return { bg: "bg-[#F8FAFC]", text: "text-[#475569]", dot: "bg-[#F8FAFC]0" };
  }
};

const getRoleInfo = (roleId: string) => {
  return roles.find((r) => r.id === roleId) || roles[2];
};

const getRelativeTime = (dateString: string): string => {
  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
};

const formatDate = (dateString: string) => {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  change,
  changeLabel,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  change?: number;
  changeLabel?: string;
  icon: LucideIcon;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "blue" | "red";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    blue: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-blue-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
          {change !== undefined && (
            <div className="flex items-center gap-1 mt-2">
              {change >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span className={cn("text-xs font-semibold", change >= 0 ? "text-green-600" : "text-red-600")}>
                {Math.abs(change)}%
              </span>
              {changeLabel && <span className="text-xs text-[#475569]">{changeLabel}</span>}
            </div>
          )}
        </div>
        <div className={cn("w-12 h-12 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={22} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// USER CARD COMPONENT (GRID VIEW)
// ============================================

const UserCard = ({
  user,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
  delay = 0,
}: {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: User["status"]) => void;
  delay?: number;
}) => {
  const statusColors = getStatusColor(user.status);
  const roleInfo = getRoleInfo(user.role);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-md border overflow-hidden transition-all group",
        isSelected
          ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
      )}
    >
      {/* Selection Checkbox */}
      <div
        className="absolute top-4 left-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE] bg-white"
        />
      </div>

      {/* Actions Menu */}
      <div
        className="absolute top-4 right-4 z-10 opacity-0 group-hover:opacity-100 transition-opacity"
        onClick={(e) => e.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button
              variant="ghost"
              size="icon"
              className="h-8 w-8 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white"
            >
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onView} className="rounded-md">
              <Eye size={14} className="mr-2" /> View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Pencil size={14} className="mr-2" /> Edit User
            </DropdownMenuItem>
            <DropdownMenuItem className="rounded-md">
              <Mail size={14} className="mr-2" /> Send Email
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-md">
                <UserCog size={14} className="mr-2" /> Change Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="rounded-md">
                <DropdownMenuItem onClick={() => onStatusChange("active")} className="rounded-md">
                  <div className="w-2 h-2 rounded-full bg-green-500 mr-2" /> Active
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange("inactive")} className="rounded-md">
                  <div className="w-2 h-2 rounded-full bg-slate-400 mr-2" /> Inactive
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => onStatusChange("suspended")} className="rounded-md">
                  <div className="w-2 h-2 rounded-full bg-red-500 mr-2" /> Suspended
                </DropdownMenuItem>
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      {/* Card Content */}
      <div className="p-6 pt-12 text-center cursor-pointer" onClick={onView}>
        {/* Avatar */}
        <div className="relative inline-block mb-4">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="w-20 h-20 rounded-md object-cover mx-auto"
            />
          ) : (
            <div className="w-20 h-20 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xl sm:text-2xl font-bold mx-auto">
              {getInitials(user.fullName)}
            </div>
          )}
          {user.isOnline && (
            <span className="absolute -bottom-1 -right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white" />
          )}
        </div>

        {/* Name & Position */}
        <h3 className="font-semibold text-[#0F172A] mb-1 group-hover:text-[#0891B2] transition-colors">
          {user.fullName}
        </h3>
        <p className="text-sm text-[#94A3B8] mb-3">{user.position || "Team Member"}</p>

        {/* Role Badge */}
        <div className="flex items-center justify-center gap-2 mb-4">
          <span
            className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium"
            style={{ backgroundColor: `${roleInfo.color}15`, color: roleInfo.color }}
          >
            <roleInfo.icon size={12} />
            {roleInfo.name}
          </span>
        </div>

        {/* Status & Department */}
        <div className="flex items-center justify-center gap-3 text-xs">
          <span className={cn("inline-flex items-center gap-1 px-2 py-0.5 rounded-md", statusColors.bg, statusColors.text)}>
            <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
            {user.status}
          </span>
          {user.department && (
            <span className="text-[#475569]">{user.department}</span>
          )}
        </div>
      </div>

      {/* Stats Footer */}
      <div className="px-6 py-4 border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/50">
        <div className="flex items-center justify-between text-xs">
          <div className="text-center">
            <p className="font-semibold text-[#0F172A]">{user.tasksCompleted || 0}</p>
            <p className="text-[#475569]">Tasks</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#0F172A]">{user.projectsCount || 0}</p>
            <p className="text-[#475569]">Projects</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#0F172A]">{user.loginCount || 0}</p>
            <p className="text-[#475569]">Logins</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// USER ROW COMPONENT (TABLE VIEW)
// ============================================

const UserRow = ({
  user,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  user: User;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onStatusChange: (status: User["status"]) => void;
}) => {
  const statusColors = getStatusColor(user.status);
  const roleInfo = getRoleInfo(user.role);

  return (
    <TableRow className="group hover:bg-[#F8FAFC]">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-3 cursor-pointer" onClick={onView}>
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="w-10 h-10 rounded-md object-cover"
              />
            ) : (
              <div className="w-10 h-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-sm font-bold">
                {getInitials(user.fullName)}
              </div>
            )}
            {user.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 w-3 h-3 bg-green-500 rounded-full border-2 border-white" />
            )}
          </div>
          <div>
            <p className="font-medium text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {user.fullName}
            </p>
            <p className="text-sm text-[#94A3B8]">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium"
          style={{ backgroundColor: `${roleInfo.color}15`, color: roleInfo.color }}
        >
          <roleInfo.icon size={12} />
          {roleInfo.name}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#475569]">{user.department || "-"}</span>
      </TableCell>
      <TableCell>
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium",
          statusColors.bg, statusColors.text
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", statusColors.dot)} />
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#94A3B8]">
          {user.lastLogin ? getRelativeTime(user.lastLogin) : "Never"}
        </span>
      </TableCell>
      <TableCell>
        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onView}>
                  <Eye size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>View Profile</TooltipContent>
            </Tooltip>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md" onClick={onEdit}>
                  <Pencil size={16} className="text-[#475569]" />
                </Button>
              </TooltipTrigger>
              <TooltipContent>Edit User</TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                <MoreVertical size={16} className="text-[#475569]" />
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem className="rounded-md">
                <Mail size={14} className="mr-2" /> Send Email
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Key size={14} className="mr-2" /> Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-md">
                  <UserCog size={14} className="mr-2" /> Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-md">
                  <DropdownMenuItem onClick={() => onStatusChange("active")} className="rounded-md">
                    <div className="w-2 h-2 rounded-full bg-green-500 mr-2" /> Active
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange("inactive")} className="rounded-md">
                    <div className="w-2 h-2 rounded-full bg-slate-400 mr-2" /> Inactive
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={() => onStatusChange("suspended")} className="rounded-md">
                    <div className="w-2 h-2 rounded-full bg-red-500 mr-2" /> Suspended
                  </DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" /> Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

// ============================================
// USER FORM DIALOG
// ============================================

const UserFormDialog = ({
  isOpen,
  onClose,
  user,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onSubmit: (data: Partial<User>) => Promise<void>;
}) => {
  const [formData, setFormData] = useState({
    fullName: "",
    email: "",
    phone: "",
    role: "staff",
    department: "",
    position: "",
    location: "",
    bio: "",
    status: "active" as User["status"],
  });
  const [saving, setSaving] = useState(false);
  const [avatarPreview, setAvatarPreview] = useState<string | null>(null);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        role: user.role,
        department: user.department || "",
        position: user.position || "",
        location: user.location || "",
        bio: user.bio || "",
        status: user.status,
      });
      setAvatarPreview(user.avatarUrl || null);
    } else {
      setFormData({
        fullName: "",
        email: "",
        phone: "",
        role: "staff",
        department: "",
        position: "",
        location: "",
        bio: "",
        status: "active",
      });
      setAvatarPreview(null);
    }
  }, [user, isOpen]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim()) {
      return;
    }
    setSaving(true);
    try {
      await onSubmit(formData);
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {user ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {user ? "Update user information and settings" : "Create a new user account"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-4 md:p-6 space-y-4 md:space-y-6">
          {/* Avatar Upload */}
          <div className="flex items-center gap-6">
            <div className="relative">
              {avatarPreview ? (
                <img
                  src={avatarPreview}
                  alt="Avatar"
                  className="w-20 h-20 rounded-md object-cover"
                />
              ) : (
                <div className="w-20 h-20 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xl sm:text-2xl font-bold">
                  {formData.fullName ? getInitials(formData.fullName) : <User size={32} />}
                </div>
              )}
              <label className="absolute -bottom-2 -right-2 w-8 h-8 bg-[#0891B2] rounded-md flex items-center justify-center cursor-pointer hover:bg-[#0891B2]/90 transition-colors">
                <Camera size={14} className="text-[#0F172A]" />
                <input type="file" className="hidden" accept="image/*" />
              </label>
            </div>
            <div>
              <p className="font-medium text-[#0F172A]">Profile Photo</p>
              <p className="text-sm text-[#94A3B8]">JPG, PNG or GIF. Max 2MB</p>
            </div>
          </div>

          {/* Basic Info */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.fullName}
                  onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
                  placeholder="John Smith"
                  required
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Email Address <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <Mail size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="email"
                  value={formData.email}
                  onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                  placeholder="john@yoursoft.ca"
                  required
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Phone Number</Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.phone}
                  onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                  placeholder="+1 (555) 123-4567"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Location</Label>
              <div className="relative">
                <MapPin size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.location}
                  onChange={(e) => setFormData({ ...formData, location: e.target.value })}
                  placeholder="Toronto, Canada"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          </div>

          {/* Role & Department */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Role</Label>
              <Select
                value={formData.role}
                onValueChange={(val) => setFormData({ ...formData, role: val })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {roles.map((role) => (
                    <SelectItem key={role.id} value={role.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <role.icon size={14} style={{ color: role.color }} />
                        {role.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Department</Label>
              <Select
                value={formData.department}
                onValueChange={(val) => setFormData({ ...formData, department: val })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {departments.map((dept) => (
                    <SelectItem key={dept.id} value={dept.name} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="w-2 h-2 rounded-full" style={{ backgroundColor: dept.color }} />
                        {dept.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Position / Title</Label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.position}
                  onChange={(e) => setFormData({ ...formData, position: e.target.value })}
                  placeholder="Senior Developer"
                  className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val as User["status"] })}
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="active" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-green-500" />
                      Active
                    </div>
                  </SelectItem>
                  <SelectItem value="inactive" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-slate-400" />
                      Inactive
                    </div>
                  </SelectItem>
                  <SelectItem value="pending" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-yellow-500" />
                      Pending
                    </div>
                  </SelectItem>
                  <SelectItem value="suspended" className="rounded-md">
                    <div className="flex items-center gap-2">
                      <span className="w-2 h-2 rounded-full bg-red-500" />
                      Suspended
                    </div>
                  </SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Bio */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Bio</Label>
            <Textarea
              value={formData.bio}
              onChange={(e) => setFormData({ ...formData, bio: e.target.value })}
              placeholder="A brief description about the user..."
              rows={3}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
          </div>

          {/* Send Invitation */}
          {!user && (
            <div className="flex items-center justify-between p-4 bg-[#F8FAFC] rounded-md">
              <div>
                <p className="font-medium text-[#0F172A]">Send Invitation Email</p>
                <p className="text-sm text-[#94A3B8]">User will receive an email to set their password</p>
              </div>
              <Switch defaultChecked />
            </div>
          )}

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.fullName || !formData.email}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              {saving ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  {user ? <Check size={16} className="mr-2" /> : <UserPlus size={16} className="mr-2" />}
                  {user ? "Update User" : "Create User"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// USER PROFILE DIALOG
// ============================================

const UserProfileDialog = ({
  isOpen,
  onClose,
  user,
  onEdit,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: User | null;
  onEdit: () => void;
}) => {
  if (!user) return null;

  const statusColors = getStatusColor(user.status);
  const roleInfo = getRoleInfo(user.role);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[700px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header with Cover */}
        <div className="relative h-32 bg-[#F1F5F9]">
          <div className="absolute inset-0 bg-[url('/grid-pattern.svg')] opacity-10" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute top-4 right-4 h-8 w-8 rounded-md bg-white/20 hover:bg-white/30 text-[#0F172A]"
          >
            <X size={16} />
          </Button>
        </div>

        {/* Profile Section */}
        <div className="px-6 pb-6">
          <div className="relative -mt-16 mb-6">
            <div className="flex items-end gap-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="w-28 h-28 rounded-md object-cover border-4 border-white card-shadow"
                  />
                ) : (
                  <div className="w-28 h-28 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-3xl font-bold border-4 border-white card-shadow">
                    {getInitials(user.fullName)}
                  </div>
                )}
                {user.isOnline && (
                  <span className="absolute bottom-1 right-1 w-5 h-5 bg-green-500 rounded-full border-3 border-white" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="flex items-center gap-3 mb-1">
                  <h2 className="text-xl sm:text-2xl font-bold text-[#0F172A]">{user.fullName}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 px-3 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: `${roleInfo.color}15`, color: roleInfo.color }}
                  >
                    <roleInfo.icon size={12} />
                    {roleInfo.name}
                  </span>
                </div>
                <p className="text-[#94A3B8]">{user.position || "Team Member"}</p>
              </div>
              <Button onClick={onEdit} className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
                <Pencil size={16} className="mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          {/* Status & Quick Info */}
          <div className="flex items-center gap-4 mb-6">
            <span className={cn(
              "inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm font-medium",
              statusColors.bg, statusColors.text
            )}>
              <span className={cn("w-2 h-2 rounded-full", statusColors.dot)} />
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </span>
            {user.department && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-white/5 text-[#475569]">
                <Building2 size={14} />
                {user.department}
              </span>
            )}
            {user.location && (
              <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-sm bg-white/5 text-[#475569]">
                <MapPin size={14} />
                {user.location}
              </span>
            )}
          </div>

          {/* Tabs */}
          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="w-full justify-start mb-6 p-1 bg-white/5 rounded-md">
              <TabsTrigger value="overview" className="rounded-md data-[state=active]:bg-white">
                Overview
              </TabsTrigger>
              <TabsTrigger value="activity" className="rounded-md data-[state=active]:bg-white">
                Activity
              </TabsTrigger>
              <TabsTrigger value="permissions" className="rounded-md data-[state=active]:bg-white">
                Permissions
              </TabsTrigger>
            </TabsList>

            {/* Overview Tab */}
            <TabsContent value="overview" className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
                <div className="p-4 bg-[#F8FAFC] rounded-md text-center">
                  <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{user.tasksCompleted || 0}</p>
                  <p className="text-sm text-[#94A3B8]">Tasks Completed</p>
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-md text-center">
                  <p className="text-xl sm:text-2xl font-bold text-[#0891B2]">{user.projectsCount || 0}</p>
                  <p className="text-sm text-[#94A3B8]">Projects</p>
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-md text-center">
                  <p className="text-xl sm:text-2xl font-bold text-[#D97706]">{user.loginCount || 0}</p>
                  <p className="text-sm text-[#94A3B8]">Total Logins</p>
                </div>
                <div className="p-4 bg-[#F8FAFC] rounded-md text-center">
                  <p className="text-xl sm:text-2xl font-bold text-purple-500">
                    {user.teams?.length || 0}
                  </p>
                  <p className="text-sm text-[#94A3B8]">Teams</p>
                </div>
              </div>

              {/* Contact Information */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#0F172A]">Contact Information</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-md">
                    <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                      <Mail size={18} className="text-[#0891B2]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#475569]">Email</p>
                      <p className="text-sm font-medium text-[#0F172A]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 p-4 bg-[#F8FAFC] rounded-md">
                    <div className="w-10 h-10 rounded-md bg-[#D97706]/10 flex items-center justify-center">
                      <Phone size={18} className="text-[#D97706]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#475569]">Phone</p>
                      <p className="text-sm font-medium text-[#0F172A]">{user.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Account Details */}
              <div className="space-y-4">
                <h3 className="font-semibold text-[#0F172A]">Account Details</h3>
                <div className="grid grid-cols-2 gap-4">
                  <div className="p-4 bg-[#F8FAFC] rounded-md">
                    <p className="text-xs text-[#475569] mb-1">Member Since</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatDate(user.createdAt)}</p>
                  </div>
                  <div className="p-4 bg-[#F8FAFC] rounded-md">
                    <p className="text-xs text-[#475569] mb-1">Last Login</p>
                    <p className="text-sm font-medium text-[#0F172A]">
                      {user.lastLogin ? getRelativeTime(user.lastLogin) : "Never"}
                    </p>
                  </div>
                </div>
              </div>

              {/* Teams */}
              {user.teams && user.teams.length > 0 && (
                <div className="space-y-4">
                  <h3 className="font-semibold text-[#0F172A]">Teams</h3>
                  <div className="flex flex-wrap gap-2">
                    {user.teams.map((team) => (
                      <span
                        key={team}
                        className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0891B2]/10 text-[#0891B2] rounded-md text-sm font-medium"
                      >
                        <UsersRound size={14} />
                        {team}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </TabsContent>

            {/* Activity Tab */}
            <TabsContent value="activity" className="space-y-4">
              <h3 className="font-semibold text-[#0F172A]">Recent Activity</h3>
              <div className="space-y-3">
                {activityLogs
                  .filter((log) => log.userId === user.id)
                  .slice(0, 5)
                  .map((log) => (
                    <div
                      key={log.id}
                      className="flex items-start gap-4 p-4 bg-[#F8FAFC] rounded-md"
                    >
                      <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center flex-shrink-0">
                        {log.action === "login" && <LogIn size={18} className="text-[#0891B2]" />}
                        {log.action === "logout" && <LogOut size={18} className="text-[#94A3B8]" />}
                        {log.action === "update_profile" && <UserCog size={18} className="text-[#D97706]" />}
                        {log.action === "create_task" && <Plus size={18} className="text-green-500" />}
                        {log.action === "complete_task" && <CheckCircle2 size={18} className="text-green-500" />}
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium text-[#0F172A]">{log.description}</p>
                        <div className="flex items-center gap-3 mt-1 text-xs text-[#475569]">
                          <span>{getRelativeTime(log.timestamp)}</span>
                          {log.ip && <span>IP: {log.ip}</span>}
                          {log.device && <span>{log.device}</span>}
                        </div>
                      </div>
                    </div>
                  ))}
                {activityLogs.filter((log) => log.userId === user.id).length === 0 && (
                  <div className="text-center py-8 text-[#94A3B8]">
                    No activity recorded yet
                  </div>
                )}
              </div>
            </TabsContent>

            {/* Permissions Tab */}
            <TabsContent value="permissions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#0F172A]">Role & Permissions</h3>
                <Button variant="outline" size="sm" className="rounded-md">
                  <Settings size={14} className="mr-2" />
                  Manage Permissions
                </Button>
              </div>

              {/* Current Role */}
              <div className="p-4 rounded-md border border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-4">
                  <div
                    className="w-12 h-12 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${roleInfo.color}15` }}
                  >
                    <roleInfo.icon size={24} style={{ color: roleInfo.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0F172A]">{roleInfo.name}</p>
                    <p className="text-sm text-[#94A3B8]">{roleInfo.description}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-md">
                    Change Role
                  </Button>
                </div>
              </div>

              {/* Permissions List */}
              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#475569]">Granted Permissions</h4>
                <div className="grid grid-cols-2 gap-3">
                  {[
                    { name: "View Dashboard", granted: true },
                    { name: "Manage Projects", granted: roleInfo.id !== "viewer" },
                    { name: "Edit Tasks", granted: roleInfo.id !== "viewer" },
                    { name: "View Reports", granted: true },
                    { name: "Manage Team", granted: roleInfo.id === "admin" || roleInfo.id === "manager" },
                    { name: "Access Settings", granted: roleInfo.id === "admin" },
                    { name: "Manage Users", granted: roleInfo.id === "admin" },
                    { name: "Delete Records", granted: roleInfo.id === "admin" },
                  ].map((perm) => (
                    <div
                      key={perm.name}
                      className={cn(
                        "flex items-center gap-3 p-3 rounded-md",
                        perm.granted ? "bg-green-50" : "bg-[#F8FAFC]"
                      )}
                    >
                      {perm.granted ? (
                        <CheckCircle2 size={16} className="text-green-500" />
                      ) : (
                        <X size={16} className="text-[#475569]" />
                      )}
                      <span className={cn(
                        "text-sm",
                        perm.granted ? "text-green-700" : "text-[#475569]"
                      )}>
                        {perm.name}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// INVITE USERS DIALOG
// ============================================

const InviteUsersDialog = ({
  isOpen,
  onClose,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  onInvite: (emails: string[], role: string) => void;
}) => {
  const [emails, setEmails] = useState("");
  const [role, setRole] = useState("staff");
  const [sending, setSending] = useState(false);

  const handleInvite = async () => {
    const emailList = emails
      .split(/[,\n]/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0);

    if (emailList.length === 0) return;

    setSending(true);
    try {
      await onInvite(emailList, role);
      onClose();
      setEmails("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[500px] p-0 rounded-md overflow-hidden">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              Invite Team Members
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Send invitations to join your workspace
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="p-6 space-y-5">
          {/* Email Input */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Email Addresses <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={emails}
              onChange={(e) => setEmails(e.target.value)}
              placeholder="Enter email addresses (separated by comma or new line)&#10;e.g., john@example.com, jane@example.com"
              rows={4}
              className="rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 resize-none"
            />
            <p className="text-xs text-[#475569]">
              You can invite multiple users at once
            </p>
          </div>

          {/* Role Selection */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Assign Role</Label>
            <div className="grid grid-cols-2 gap-3">
              {roles.filter((r) => r.id !== "admin").map((r) => (
                <motion.button
                  key={r.id}
                  type="button"
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  onClick={() => setRole(r.id)}
                  className={cn(
                    "flex items-center gap-3 p-4 rounded-md border-2 text-left transition-all",
                    role === r.id
                      ? "border-[#22D3EE] bg-[#0891B2]/5"
                      : "border-[rgba(15,23,42,0.06)] hover:border-slate-300"
                  )}
                >
                  <div
                    className="w-10 h-10 rounded-md flex items-center justify-center"
                    style={{ backgroundColor: `${r.color}15` }}
                  >
                    <r.icon size={20} style={{ color: r.color }} />
                  </div>
                  <div>
                    <p className="font-medium text-[#0F172A]">{r.name}</p>
                    <p className="text-xs text-[#94A3B8]">{r.description}</p>
                  </div>
                  {role === r.id && (
                    <CheckCircle2 size={18} className="text-[#0891B2] ml-auto" />
                  )}
                </motion.button>
              ))}
            </div>
          </div>

          {/* Preview */}
          {emails.trim() && (
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-sm font-medium text-[#0F172A] mb-2">
                Invitations will be sent to:
              </p>
              <div className="flex flex-wrap gap-2">
                {emails
                  .split(/[,\n]/)
                  .map((e) => e.trim())
                  .filter((e) => e.length > 0)
                  .map((email, i) => (
                    <span
                      key={i}
                      className="inline-flex items-center gap-1 px-2 py-1 bg-white rounded-md text-sm border border-[rgba(15,23,42,0.06)]"
                    >
                      <Mail size={12} className="text-[#475569]" />
                      {email}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="p-6 pt-0 gap-3">
          <Button variant="outline" onClick={onClose} className="rounded-md">
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={sending || !emails.trim()}
            className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
          >
            {sending ? (
              <>
                <RefreshCw size={16} className="mr-2 animate-spin" />
                Sending...
              </>
            ) : (
              <>
                <Send size={16} className="mr-2" />
                Send Invitations
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// ROLES MANAGEMENT COMPONENT
// ============================================

const RolesSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Roles & Permissions</h2>
          <p className="text-sm text-[#94A3B8]">Manage user roles and access levels</p>
        </div>
        <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
          <Plus size={16} className="mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {roles.map((role, index) => (
          <motion.div
            key={role.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all"
          >
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-center gap-3">
                <div
                  className="w-12 h-12 rounded-md flex items-center justify-center"
                  style={{ backgroundColor: `${role.color}15` }}
                >
                  <role.icon size={24} style={{ color: role.color }} />
                </div>
                <div>
                  <h3 className="font-semibold text-[#0F172A]">{role.name}</h3>
                  <p className="text-sm text-[#94A3B8]">{role.description}</p>
                </div>
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-md">
                  <DropdownMenuItem className="rounded-md">
                    <Pencil size={14} className="mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-md">
                    <Copy size={14} className="mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-md text-red-600" disabled={role.id === "admin"}>
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
              <div className="flex items-center gap-2">
                <Users size={14} className="text-[#475569]" />
                <span className="text-sm text-[#94A3B8]">{role.userCount} users</span>
              </div>
              <div className="flex items-center gap-2">
                <Shield size={14} className="text-[#475569]" />
                <span className="text-sm text-[#94A3B8]">
                  {role.permissions.includes("all") ? "Full Access" : `${role.permissions.length} permissions`}
                </span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// DEPARTMENTS SECTION
// ============================================

const DepartmentsSection = () => {
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Departments</h2>
          <p className="text-sm text-[#94A3B8]">Organize users by department</p>
        </div>
        <Button className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md">
          <Plus size={16} className="mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {departments.map((dept, index) => (
          <motion.div
            key={dept.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.1 }}
            whileHover={{ y: -4 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all cursor-pointer group"
          >
            <div className="flex items-start justify-between mb-4">
              <div
                className="w-12 h-12 rounded-md flex items-center justify-center"
                style={{ backgroundColor: `${dept.color}15` }}
              >
                <Building2 size={24} style={{ color: dept.color }} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="h-8 w-8 rounded-md opacity-0 group-hover:opacity-100 transition-opacity"
                  >
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-40 rounded-md">
                  <DropdownMenuItem className="rounded-md">
                    <Pencil size={14} className="mr-2" /> Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-md">
                    <Users size={14} className="mr-2" /> View Members
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-md text-red-600">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h3 className="font-semibold text-[#0F172A] mb-1 group-hover:text-[#0891B2] transition-colors">
              {dept.name}
            </h3>
            {dept.head && (
              <p className="text-sm text-[#94A3B8] mb-3">Head: {dept.head}</p>
            )}

            <div className="flex items-center gap-2 pt-3 border-t border-[rgba(15,23,42,0.06)]">
              <Users size={14} className="text-[#475569]" />
              <span className="text-sm text-[#94A3B8]">{dept.userCount} members</span>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

// ============================================
// ACTIVITY LOG SECTION
// ============================================

const ActivityLogSection = ({ users }: { users: User[] }) => {
  const getUserById = (id: number) => users.find((u) => u.id === id);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "login":
        return <LogIn size={16} className="text-green-500" />;
      case "logout":
        return <LogOut size={16} className="text-[#94A3B8]" />;
      case "update_profile":
        return <UserCog size={16} className="text-[#D97706]" />;
      case "create_task":
        return <Plus size={16} className="text-[#0891B2]" />;
      case "complete_task":
        return <CheckCircle2 size={16} className="text-green-500" />;
      default:
        return <Activity size={16} className="text-[#475569]" />;
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Activity Log</h2>
          <p className="text-sm text-[#94A3B8]">Recent user activities and actions</p>
        </div>
        <div className="flex items-center gap-2">
          <Select defaultValue="all">
            <SelectTrigger className="w-40 h-9 rounded-md border-[rgba(15,23,42,0.06)]">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent className="rounded-md">
              <SelectItem value="all" className="rounded-md">All Actions</SelectItem>
              <SelectItem value="login" className="rounded-md">Logins</SelectItem>
              <SelectItem value="logout" className="rounded-md">Logouts</SelectItem>
              <SelectItem value="update" className="rounded-md">Updates</SelectItem>
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-md">
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow className="bg-[#F8FAFC]">
              <TableHead>User</TableHead>
              <TableHead>Action</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Device</TableHead>
              <TableHead>IP Address</TableHead>
              <TableHead>Time</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {activityLogs.map((log) => {
              const user = getUserById(log.userId);
              return (
                <TableRow key={log.id} className="hover:bg-[#F8FAFC]">
                  <TableCell>
                    <div className="flex items-center gap-3">
                      {user?.avatarUrl ? (
                        <img
                          src={user.avatarUrl}
                          alt={user.fullName}
                          className="w-8 h-8 rounded-md object-cover"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] text-xs font-bold">
                          {user ? getInitials(user.fullName) : "?"}
                        </div>
                      )}
                      <span className="font-medium text-[#0F172A]">
                        {user?.fullName || "Unknown User"}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <div className="flex items-center gap-2">
                      {getActionIcon(log.action)}
                      <span className="text-sm text-[#475569] capitalize">
                        {log.action.replace("_", " ")}
                      </span>
                    </div>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#94A3B8]">{log.description}</span>
                  </TableCell>
                  <TableCell>
                    <span className="inline-flex items-center gap-1 text-sm text-[#94A3B8]">
                      {log.device === "Desktop" ? (
                        <Monitor size={14} />
                      ) : (
                        <Smartphone size={14} />
                      )}
                      {log.device || "-"}
                    </span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#475569] font-mono">{log.ip || "-"}</span>
                  </TableCell>
                  <TableCell>
                    <span className="text-sm text-[#94A3B8]">{getRelativeTime(log.timestamp)}</span>
                  </TableCell>
                </TableRow>
              );
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  );
};

// ============================================
// MAIN USERS PAGE COMPONENT
// ============================================

export default function UsersPage() {
  const { toast } = useToast();

  // State
  const [users, setUsers] = useState<User[]>(initialUsers);
  const [loading, setLoading] = useState(false);
  const [activeTab, setActiveTab] = useState("users");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<number[]>([]);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");

  // Dialogs
  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [viewingUser, setViewingUser] = useState<User | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deletingUser, setDeletingUser] = useState<User | null>(null);

  // Load users from API
  const loadUsers = async () => {
    setLoading(true);
    try {
      const data = await getUsers() as any[];
      const mapped = (data || []).map((u: any) => ({
        id: u.id,
        fullName: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim(),
        email: u.email || "",
        phone: u.phone || "",
        role: u.role?.name?.toLowerCase() || "staff",
        department: u.department || "General",
        position: u.position || "Team Member",
        avatarUrl: u.avatar || "",
        status: u.isActive ? "active" : "inactive",
        lastLogin: u.lastLogin || "",
        createdAt: u.createdAt || new Date().toISOString(),
        updatedAt: u.updatedAt,
        isOnline: false,
        permissions: u.permissions || [],
        teams: u.teams || [],
        manager: u.manager || "",
        location: u.location || "",
        bio: u.bio || "",
        skills: u.skills || [],
        loginCount: u.loginCount || 0,
        tasksCompleted: u.tasksCompleted || 0,
        projectsCount: u.projectsCount || 0,
      }));
      setUsers(mapped.length > 0 ? mapped : initialUsers);
    } catch (e) {
      console.error("Failed loading users", e);
      // Use initial data on error
      setUsers(initialUsers);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadUsers();
  }, []);

  // Filtered users
  const filteredUsers = useMemo(() => {
    let result = [...users];

    if (searchTerm) {
      result = result.filter(
        (u) =>
          u.fullName.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.email.toLowerCase().includes(searchTerm.toLowerCase()) ||
          u.position?.toLowerCase().includes(searchTerm.toLowerCase())
      );
    }

    if (filterRole !== "all") {
      result = result.filter((u) => u.role === filterRole);
    }

    if (filterStatus !== "all") {
      result = result.filter((u) => u.status === filterStatus);
    }

    if (filterDepartment !== "all") {
      result = result.filter((u) => u.department === filterDepartment);
    }

    return result;
  }, [users, searchTerm, filterRole, filterStatus, filterDepartment]);

  // Stats
  const stats = useMemo(() => ({
    totalUsers: users.length,
    activeUsers: users.filter((u) => u.status === "active").length,
    pendingUsers: users.filter((u) => u.status === "pending").length,
    onlineUsers: users.filter((u) => u.isOnline).length,
  }), [users]);

  // Handlers
  const handleSelectUser = (userId: number) => {
    setSelectedUsers((prev) =>
      prev.includes(userId)
        ? prev.filter((id) => id !== userId)
        : [...prev, userId]
    );
  };

  const handleSelectAll = () => {
    if (selectedUsers.length === filteredUsers.length) {
      setSelectedUsers([]);
    } else {
      setSelectedUsers(filteredUsers.map((u) => u.id));
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleViewUser = (user: User) => {
    setViewingUser(user);
    setShowUserProfile(true);
  };

  const handleDeleteUser = (user: User) => {
    setDeletingUser(user);
    setShowDeleteConfirm(true);
  };

  const confirmDelete = async () => {
    if (!deletingUser) return;

    try {
      await deleteUserApi(deletingUser.id);

      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      toast({
        title: "User Deleted",
        description: `${deletingUser.fullName} has been removed.`,
      });
    } catch (e) {
      // For demo, just remove locally
      setUsers((prev) => prev.filter((u) => u.id !== deletingUser.id));
      toast({
        title: "User Deleted",
        description: `${deletingUser.fullName} has been removed.`,
      });
    }

    setShowDeleteConfirm(false);
    setDeletingUser(null);
  };

  const handleSubmitUser = async (data: Partial<User>) => {
    try {
      const fullName = (data.fullName || "").trim();
      const [firstName = "", ...restNames] = fullName.split(" ");
      const lastName = restNames.join(" ").trim();

      if (editingUser) {
        // Update existing user
        await updateUserApi(editingUser.id, {
          firstName: firstName || undefined,
          lastName: lastName || undefined,
          phone: data.phone || null,
          isActive: data.status ? data.status === "active" : undefined,
        });

        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id ? { ...u, ...data, updatedAt: new Date().toISOString() } : u
          )
        );

        toast({
          title: "User Updated",
          description: `${data.fullName} has been updated successfully.`,
        });
      } else {
        // Create new user
        const resData = await createUserApi({
          email: data.email,
          password: "ChangeMe123!",
          firstName: firstName || "User",
          lastName: lastName || "Account",
          phone: data.phone || null,
          isActive: data.status ? data.status !== "inactive" : true,
        }) as any;

        const newUser: User = {
          id: resData?.id || Date.now(),
          fullName: data.fullName || "",
          email: data.email || "",
          phone: data.phone,
          role: data.role || "staff",
          department: data.department,
          position: data.position,
          status: (data.status as User["status"]) || "pending",
          createdAt: new Date().toISOString(),
          location: data.location,
          bio: data.bio,
          loginCount: 0,
          tasksCompleted: 0,
          projectsCount: 0,
        };

        setUsers((prev) => [newUser, ...prev]);

        toast({
          title: "User Created",
          description: `${data.fullName} has been added successfully.`,
        });
      }
    } catch (e) {
      // Handle error - for demo, proceed with local update
      if (editingUser) {
        setUsers((prev) =>
          prev.map((u) =>
            u.id === editingUser.id ? { ...u, ...data } : u
          )
        );
      } else {
        const newUser: User = {
          id: Date.now(),
          fullName: data.fullName || "",
          email: data.email || "",
          role: data.role || "staff",
          status: "pending",
          createdAt: new Date().toISOString(),
          loginCount: 0,
          tasksCompleted: 0,
          projectsCount: 0,
        };
        setUsers((prev) => [newUser, ...prev]);
      }

      toast({
        title: editingUser ? "User Updated" : "User Created",
        description: `${data.fullName} has been ${editingUser ? "updated" : "added"} successfully.`,
      });
    }
  };

  const handleStatusChange = (userId: number, status: User["status"]) => {
    setUsers((prev) =>
      prev.map((u) => (u.id === userId ? { ...u, status } : u))
    );
    toast({
      title: "Status Updated",
      description: `User status changed to ${status}.`,
    });
  };

  const handleInviteUsers = async (emails: string[], role: string) => {
    // Simulate sending invitations
    const newUsers: User[] = emails.map((email, index) => ({
      id: Date.now() + index,
      fullName: email.split("@")[0].replace(/[._]/g, " "),
      email,
      role,
      status: "pending" as const,
      createdAt: new Date().toISOString(),
      loginCount: 0,
      tasksCompleted: 0,
      projectsCount: 0,
    }));

    setUsers((prev) => [...newUsers, ...prev]);

    toast({
      title: "Invitations Sent",
      description: `${emails.length} invitation(s) have been sent.`,
    });
  };

  const handleBulkAction = (action: "delete" | "activate" | "deactivate" | "suspend") => {
    switch (action) {
      case "delete":
        setUsers((prev) => prev.filter((u) => !selectedUsers.includes(u.id)));
        toast({
          title: "Users Deleted",
          description: `${selectedUsers.length} user(s) have been deleted.`,
        });
        break;
      case "activate":
        setUsers((prev) =>
          prev.map((u) =>
            selectedUsers.includes(u.id) ? { ...u, status: "active" as const } : u
          )
        );
        toast({
          title: "Users Activated",
          description: `${selectedUsers.length} user(s) have been activated.`,
        });
        break;
      case "deactivate":
        setUsers((prev) =>
          prev.map((u) =>
            selectedUsers.includes(u.id) ? { ...u, status: "inactive" as const } : u
          )
        );
        toast({
          title: "Users Deactivated",
          description: `${selectedUsers.length} user(s) have been deactivated.`,
        });
        break;
      case "suspend":
        setUsers((prev) =>
          prev.map((u) =>
            selectedUsers.includes(u.id) ? { ...u, status: "suspended" as const } : u
          )
        );
        toast({
          title: "Users Suspended",
          description: `${selectedUsers.length} user(s) have been suspended.`,
        });
        break;
    }
    setSelectedUsers([]);
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">

      <main
        className={cn(
          "flex-1 transition-all duration-300"
        )}
      >
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/80 backdrop-blur-md border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              {/* Title & Breadcrumb */}
              <div>
                <div className="hidden sm:flex items-center gap-2 text-sm text-[#94A3B8] mb-1">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  <span className="text-[#0891B2] font-medium">Users</span>
                </div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">User Management</h1>
              </div>

              {/* Header Actions */}
              <div className="flex items-center gap-3">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteDialog(true)}
                  className="rounded-md border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE] hover:text-[#0891B2]"
                >
                  <MailPlus size={16} className="mr-2" />
                  Invite Users
                </Button>
                <Button
                  onClick={handleCreateUser}
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                >
                  <UserPlus size={16} className="mr-2" />
                  Add User
                </Button>

                <div className="relative">
                  <button className="p-2.5 rounded-md bg-white/5 hover:bg-slate-200 transition-colors relative">
                    <Bell size={20} className="text-[#475569]" />
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white" />
                  </button>
                </div>

                <div className="flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                  <div className="h-10 w-10 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold ">
                    SA
                  </div>
                  <div className="hidden sm:block">
                    <p className="text-sm font-semibold text-[#0F172A]">SAdmin</p>
                    <p className="text-xs text-[#94A3B8]">Administrator</p>
                  </div>
                  <ChevronDown size={16} className="text-[#475569]" />
                </div>
              </div>
            </div>
          </div>

          {/* Tabs */}
          <div className="px-6">
            <div className="flex items-center gap-1">
              {[
                { id: "users", label: "All Users", icon: Users },
                { id: "roles", label: "Roles", icon: Shield },
                { id: "departments", label: "Departments", icon: Building2 },
                { id: "activity", label: "Activity Log", icon: Activity },
              ].map((tab) => (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={cn(
                    "flex items-center gap-2 px-4 py-3 text-sm font-medium border-b-2 transition-all",
                    activeTab === tab.id
                      ? "text-[#0891B2] border-[#22D3EE]"
                      : "text-[#94A3B8] border-transparent hover:text-slate-200"
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        {/* Content */}
        <div className="p-6">
          {/* Users Tab */}
          {activeTab === "users" && (
            <div className="space-y-6">
              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
                <StatCard
                  title="Total Users"
                  value={stats.totalUsers}
                  change={12}
                  changeLabel="vs last month"
                  icon={Users}
                  color="teal"
                  delay={0}
                />
                <StatCard
                  title="Active Users"
                  value={stats.activeUsers}
                  change={8}
                  changeLabel="vs last month"
                  icon={UserCheck}
                  color="green"
                  delay={0.1}
                />
                <StatCard
                  title="Online Now"
                  value={stats.onlineUsers}
                  icon={Activity}
                  color="blue"
                  delay={0.2}
                />
                <StatCard
                  title="Pending Invites"
                  value={stats.pendingUsers}
                  icon={Clock}
                  color="gold"
                  delay={0.3}
                />
              </div>

              {/* Toolbar */}
              <div className="flex flex-wrap items-center justify-between gap-4 bg-white p-4 rounded-md border border-[rgba(15,23,42,0.06)]">
                <div className="flex items-center gap-3">
                  <Checkbox
                    checked={selectedUsers.length > 0 && selectedUsers.length === filteredUsers.length}
                    onCheckedChange={handleSelectAll}
                    className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                  />

                  {/* Search */}
                  <div className="relative">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={searchTerm}
                      onChange={(e) => setSearchTerm(e.target.value)}
                      placeholder="Search users..."
                      className="h-10 w-64 pl-9 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                    />
                  </div>

                  {/* Bulk Actions */}
                  <AnimatePresence>
                    {selectedUsers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-2 px-3 py-1.5 bg-[#0891B2]/10 rounded-md"
                      >
                        <span className="text-sm font-medium text-[#0891B2]">
                          {selectedUsers.length} selected
                        </span>
                        <div className="h-4 w-px bg-[#0891B2]/30" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 rounded-md text-[#0891B2]">
                              Actions <ChevronDown size={14} className="ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-md">
                            <DropdownMenuItem
                              onClick={() => handleBulkAction("activate")}
                              className="rounded-md"
                            >
                              <UserCheck size={14} className="mr-2" />
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleBulkAction("deactivate")}
                              className="rounded-md"
                            >
                              <UserX size={14} className="mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => handleBulkAction("suspend")}
                              className="rounded-md"
                            >
                              <ShieldOff size={14} className="mr-2" />
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleBulkAction("delete")}
                              className="rounded-md text-red-600 focus:text-red-600"
                            >
                              <Trash2 size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button
                          onClick={() => setSelectedUsers([])}
                          className="p-1 rounded-md hover:bg-[#0891B2]/20"
                        >
                          <X size={14} className="text-[#0891B2]" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex items-center gap-2">
                  {/* Filters */}
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="w-32 h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Role" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Roles</SelectItem>
                      {roles.map((role) => (
                        <SelectItem key={role.id} value={role.id} className="rounded-md">
                          {role.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterStatus} onValueChange={setFilterStatus}>
                    <SelectTrigger className="w-32 h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                      <SelectItem value="active" className="rounded-md">Active</SelectItem>
                      <SelectItem value="inactive" className="rounded-md">Inactive</SelectItem>
                      <SelectItem value="pending" className="rounded-md">Pending</SelectItem>
                      <SelectItem value="suspended" className="rounded-md">Suspended</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="w-40 h-10 rounded-md border-[rgba(15,23,42,0.06)]">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Departments</SelectItem>
                      {departments.map((dept) => (
                        <SelectItem key={dept.id} value={dept.name} className="rounded-md">
                          {dept.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  {/* View Toggle */}
                  <div className="flex items-center p-1 bg-white/5 rounded-md">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === "grid"
                          ? "bg-white text-[#0891B2] shadow-sm"
                          : "text-[#94A3B8] hover:text-slate-200"
                      )}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "p-2 rounded-md transition-all",
                        viewMode === "list"
                          ? "bg-white text-[#0891B2] shadow-sm"
                          : "text-[#94A3B8] hover:text-slate-200"
                      )}
                    >
                      <List size={18} />
                    </button>
                  </div>

                  <Button
                    variant="outline"
                    onClick={loadUsers}
                    className="rounded-md border-[rgba(15,23,42,0.06)]"
                  >
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  </Button>
                </div>
              </div>

              {/* Users Grid/List */}
              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={32} className="animate-spin text-[#0891B2]" />
                </div>
              ) : viewMode === "grid" ? (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
                  <AnimatePresence>
                    {filteredUsers.map((user, index) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        isSelected={selectedUsers.includes(user.id)}
                        onSelect={() => handleSelectUser(user.id)}
                        onView={() => handleViewUser(user)}
                        onEdit={() => handleEditUser(user)}
                        onDelete={() => handleDeleteUser(user)}
                        onStatusChange={(status) => handleStatusChange(user.id, status)}
                        delay={index * 0.05}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC]">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={selectedUsers.length === filteredUsers.length}
                            onCheckedChange={handleSelectAll}
                            className="data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                          />
                        </TableHead>
                        <TableHead>User</TableHead>
                        <TableHead>Role</TableHead>
                        <TableHead>Department</TableHead>
                        <TableHead>Status</TableHead>
                        <TableHead>Last Login</TableHead>
                        <TableHead className="text-right">Actions</TableHead>
                      </TableRow>
                    </TableHeader>
                    <TableBody>
                      {filteredUsers.map((user) => (
                        <UserRow
                          key={user.id}
                          user={user}
                          isSelected={selectedUsers.includes(user.id)}
                          onSelect={() => handleSelectUser(user.id)}
                          onView={() => handleViewUser(user)}
                          onEdit={() => handleEditUser(user)}
                          onDelete={() => handleDeleteUser(user)}
                          onStatusChange={(status) => handleStatusChange(user.id, status)}
                        />
                      ))}
                    </TableBody>
                  </Table>

                  {filteredUsers.length === 0 && (
                    <div className="text-center py-12">
                      <Users size={48} className="mx-auto text-[#475569] mb-4" />
                      <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No users found</h3>
                      <p className="text-[#94A3B8]">
                        {searchTerm
                          ? `No users match "${searchTerm}"`
                          : "Add your first user to get started"}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Empty State for Grid */}
              {viewMode === "grid" && filteredUsers.length === 0 && !loading && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center py-20 bg-white rounded-md border border-[rgba(15,23,42,0.06)]"
                >
                  <div className="w-20 h-20 rounded-md bg-white/5 flex items-center justify-center mb-4">
                    <Users size={40} className="text-[#475569]" />
                  </div>
                  <h3 className="text-lg font-semibold text-[#0F172A] mb-2">No users found</h3>
                  <p className="text-[#94A3B8] text-center mb-6">
                    {searchTerm
                      ? `No users match "${searchTerm}"`
                      : "Add your first user to get started"}
                  </p>
                  <Button
                    onClick={handleCreateUser}
                    className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
                  >
                    <UserPlus size={16} className="mr-2" />
                    Add User
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {/* Roles Tab */}
          {activeTab === "roles" && <RolesSection />}

          {/* Departments Tab */}
          {activeTab === "departments" && <DepartmentsSection />}

          {/* Activity Log Tab */}
          {activeTab === "activity" && <ActivityLogSection users={users} />}
        </div>
      </main>

      {/* User Form Dialog */}
      <UserFormDialog
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
        }}
        user={editingUser}
        onSubmit={handleSubmitUser}
      />

      {/* User Profile Dialog */}
      <UserProfileDialog
        isOpen={showUserProfile}
        onClose={() => {
          setShowUserProfile(false);
          setViewingUser(null);
        }}
        user={viewingUser}
        onEdit={() => {
          setShowUserProfile(false);
          if (viewingUser) {
            handleEditUser(viewingUser);
          }
        }}
      />

      {/* Invite Users Dialog */}
      <InviteUsersDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        onInvite={handleInviteUsers}
      />

      {/* Delete Confirmation */}
      <AlertDialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0F172A]">Delete User?</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deletingUser?.fullName}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-red-500 hover:bg-red-600 text-[#0F172A] rounded-md"
            >
              <Trash2 size={16} className="mr-2" />
              Delete User
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
