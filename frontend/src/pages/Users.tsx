import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowDownRight,
  ArrowUpRight,
  Briefcase,
  Building2,
  Camera,
  Check,
  CheckCircle2,
  ChevronDown,
  ChevronRight,
  Clock,
  Copy,
  Crown,
  Download,
  Eye,
  Key,
  LayoutGrid,
  List,
  LogIn,
  LogOut,
  Mail,
  MailPlus,
  MapPin,
  Monitor,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Phone,
  Plus,
  RefreshCw,
  Search,
  Send,
  Settings,
  Shield,
  ShieldCheck,
  ShieldOff,
  Smartphone,
  Trash2,
  User,
  UserCheck,
  UserCog,
  UserPlus,
  UserX,
  Users,
  X,
  type LucideIcon,
} from "lucide-react";
import { NotificationBell } from "@/components/NotificationBell";
import { AddDepartmentDialog } from "@/components/employees/AddDepartmentDialog";
import type {
  Department as DepartmentDialogEntity,
  Employee as DepartmentDialogEmployee,
} from "@/components/employees/types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
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
  DropdownMenuSub,
  DropdownMenuSubContent,
  DropdownMenuSubTrigger,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
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
import { useIsMobile } from "@/hooks/useIsMobile";
import { cn } from "@/lib/utils";
import {
  createDepartment,
  createUser as createUserApi,
  deleteDepartment as deleteDepartmentApi,
  deleteUser as deleteUserApi,
  getDepartments,
  getEmployees,
  getUsers,
  inviteUser as inviteUserApi,
  requestUserPasswordReset,
  updateDepartment as updateDepartmentApi,
  updateUser as updateUserApi,
  updateUserRole as updateUserRoleApi,
  updateUserStatus as updateUserStatusApi,
  type DepartmentEntity,
  type InviteWorkspaceUserResponse,
  type WorkspaceUserEntity,
  type WorkspaceUserStatus,
} from "@/features/users";
import {
  exportAuditLogs,
  getAuditLogs,
  type AuditLogItem,
} from "@/features/settings/services/settings-service";
import {
  createRole as createRoleApi,
  deleteRole as deleteRoleApi,
  fetchAllPermissions,
  fetchEmployees,
  fetchRoles,
  updateRole as updateRoleApi,
  type ApiEmployee,
  type ApiPermission,
  type ApiRole,
} from "@/pages/roles/roles-api";

type UserStatus = "active" | "inactive" | "pending" | "suspended";
type BulkAction = "delete" | "activate" | "deactivate" | "suspend";
type DeleteTarget =
  | { type: "user"; id: string; name: string }
  | { type: "role"; id: string; name: string }
  | { type: "department"; id: string; name: string }
  | null;

interface UserRecord {
  id: string;
  fullName: string;
  email: string;
  phone: string;
  roleId: string | null;
  roleName: string;
  department: string;
  position: string;
  avatarUrl: string | null;
  status: UserStatus;
  lastLogin: string | null;
  createdAt: string;
  updatedAt: string;
  isOnline: boolean;
}

interface UserMetrics {
  loginCount: number;
  tasksCompleted: number;
  projectsCount: number;
}

interface RoleFormValues {
  name: string;
  description: string;
  permissionIds: string[];
}

interface UserFormValues {
  fullName: string;
  email: string;
  phone: string;
  roleId: string;
  department: string;
  position: string;
  status: UserStatus;
  sendInviteEmail: boolean;
}

const SELECT_NONE_VALUE = "__none__";

const STATUS_OPTIONS: Array<{ value: UserStatus; label: string }> = [
  { value: "active", label: "Active" },
  { value: "inactive", label: "Inactive" },
  { value: "pending", label: "Pending" },
  { value: "suspended", label: "Suspended" },
];

function getInitials(name: string): string {
  return name
    .split(" ")
    .filter(Boolean)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
}

function formatDate(dateString: string): string {
  return new Date(dateString).toLocaleDateString("en-US", {
    year: "numeric",
    month: "short",
    day: "numeric",
  });
}

function getRelativeTime(dateString?: string | null): string {
  if (!dateString) {
    return "Never";
  }

  const date = new Date(dateString);
  const now = new Date();
  const diffInSeconds = Math.floor((now.getTime() - date.getTime()) / 1000);

  if (diffInSeconds < 60) return "Just now";
  if (diffInSeconds < 3600) return `${Math.floor(diffInSeconds / 60)}m ago`;
  if (diffInSeconds < 86400) return `${Math.floor(diffInSeconds / 3600)}h ago`;
  if (diffInSeconds < 604800) return `${Math.floor(diffInSeconds / 86400)}d ago`;
  return date.toLocaleDateString();
}

function getStatusColor(status: UserStatus) {
  switch (status) {
    case "active":
      return { bg: "bg-green-50", text: "text-green-600", dot: "bg-green-500" };
    case "inactive":
      return { bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-400" };
    case "pending":
      return { bg: "bg-amber-50", text: "text-amber-600", dot: "bg-amber-500" };
    case "suspended":
      return { bg: "bg-red-50", text: "text-red-600", dot: "bg-red-500" };
    default:
      return { bg: "bg-slate-50", text: "text-slate-500", dot: "bg-slate-400" };
  }
}

function getRoleVisual(roleName?: string | null): {
  color: string;
  icon: LucideIcon;
} {
  const normalized = (roleName || "").toLowerCase();

  if (
    normalized.includes("admin")
    || normalized.includes("owner")
    || normalized.includes("super admin")
  ) {
    return { color: "#EF4444", icon: Crown };
  }

  if (
    normalized.includes("manager")
    || normalized.includes("lead")
    || normalized.includes("supervisor")
    || normalized.includes("head")
  ) {
    return { color: "#8B5CF6", icon: ShieldCheck };
  }

  if (
    normalized.includes("viewer")
    || normalized.includes("read only")
    || normalized.includes("readonly")
  ) {
    return { color: "#64748B", icon: Eye };
  }

  return { color: "#0891B2", icon: User };
}

function toUiStatus(user: WorkspaceUserEntity): UserStatus {
  if (user.membershipStatus === "invited" || user.status === "PENDING_VERIFICATION") {
    return "pending";
  }

  switch (user.status) {
    case "ACTIVE":
      return "active";
    case "INACTIVE":
      return "inactive";
    case "SUSPENDED":
      return "suspended";
    case "PENDING_VERIFICATION":
      return "pending";
    default:
      return "inactive";
  }
}

function toApiStatus(status: UserStatus): WorkspaceUserStatus {
  switch (status) {
    case "active":
      return "ACTIVE";
    case "inactive":
      return "INACTIVE";
    case "suspended":
      return "SUSPENDED";
    case "pending":
      return "PENDING_VERIFICATION";
    default:
      return "ACTIVE";
  }
}

function mapUserRecord(user: WorkspaceUserEntity): UserRecord {
  const lastLogin = user.lastLoginAt || null;

  return {
    id: user.id,
    fullName: user.fullName || `${user.firstName} ${user.lastName}`.trim(),
    email: user.email,
    phone: user.phone || "",
    roleId: user.role?.id || null,
    roleName: user.role?.name || "Staff",
    department: user.department || "",
    position: user.position || "",
    avatarUrl: user.avatar,
    status: toUiStatus(user),
    lastLogin,
    createdAt: user.createdAt,
    updatedAt: user.updatedAt,
    isOnline: lastLogin ? Date.now() - new Date(lastLogin).getTime() < 15 * 60 * 1000 : false,
  };
}

function splitFullName(fullName: string): { firstName: string; lastName: string } {
  const [firstName = "", ...rest] = fullName.trim().split(/\s+/);
  return {
    firstName: firstName || "Team",
    lastName: rest.join(" ").trim() || "Member",
  };
}

function parseDevice(userAgent?: string): string {
  const agent = (userAgent || "").toLowerCase();
  if (!agent) {
    return "-";
  }
  return /iphone|ipad|android|mobile/.test(agent) ? "Mobile" : "Desktop";
}

function resolveAuditActorName(log: AuditLogItem, user?: UserRecord): string {
  if (user?.fullName) {
    return user.fullName;
  }

  if (log.user) {
    const fullName = `${log.user.firstName || ""} ${log.user.lastName || ""}`.trim();
    return fullName || log.user.email || "Unknown User";
  }

  const publicActorLabel = typeof log.newValues?.publicActorLabel === "string"
    ? log.newValues.publicActorLabel.trim()
    : typeof log.newValues?.signedByName === "string"
      ? log.newValues.signedByName.trim()
      : "";

  if (publicActorLabel) {
    return publicActorLabel;
  }

  if ((log.requestPath || "").includes("/public/") || log.description.toLowerCase().includes("public link")) {
    return "Public Visitor";
  }

  return "System";
}

function mapEmployeeForDepartmentDialog(employee: ApiEmployee): DepartmentDialogEmployee {
  return {
    id: employee.id,
    employeeId: employee.employeeNumber || employee.id.slice(0, 8).toUpperCase(),
    firstName: employee.user?.firstName || "",
    lastName: employee.user?.lastName || "",
    email: employee.user?.email || "",
    phone: "",
    avatar: undefined,
    position: employee.position || "Team Member",
    departmentId: employee.department || "",
    departmentName: employee.department || "",
    status: employee.isActive ? "active" : "inactive",
    employmentType: "full-time",
    joinDate: employee.createdAt ? new Date(employee.createdAt) : new Date(),
    salary: 0,
    skills: [],
    address: {
      street: "",
      city: "",
      state: "",
      zipCode: "",
      country: "",
    },
    emergencyContact: {
      name: "",
      relationship: "",
      phone: "",
    },
    documents: [],
    performance: {
      rating: 0,
      lastReviewDate: new Date(),
      nextReviewDate: new Date(),
    },
  };
}

function toDepartmentDialogEntity(
  department: DepartmentEntity | null,
): DepartmentDialogEntity | undefined {
  if (!department) {
    return undefined;
  }

  return {
    id: department.id,
    name: department.name,
    code: department.code,
    description: department.description,
    headId: department.headId || undefined,
    headName: department.headName,
    headAvatar: department.headAvatar || undefined,
    parentDepartmentId: undefined,
    employeeCount: department.employeeCount,
    budget: department.budget,
    color: department.color,
    createdAt: new Date(department.createdAt),
    isActive: department.isActive,
  };
}

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
  color: "teal" | "gold" | "green" | "blue";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
    blue: { bg: "bg-blue-500", light: "bg-blue-500/10", text: "text-blue-500" },
  } as const;

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-5 transition-all hover:border-[#22D3EE]/30 hover:shadow-lg"
    >
      <div className={cn("absolute -right-4 -top-4 h-20 w-20 rounded-full opacity-10", colors.bg)} />
      <div className="relative flex items-start justify-between">
        <div>
          <p className="mb-1 text-sm text-[#94A3B8]">{title}</p>
          <p className="text-xl font-bold text-[#0F172A] sm:text-2xl">{value}</p>
          {change !== undefined && (
            <div className="mt-2 flex items-center gap-1">
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
        <div className={cn("flex h-12 w-12 items-center justify-center rounded-md", colors.light)}>
          <Icon size={22} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

const UserCard = ({
  user,
  metrics,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSendEmail,
  onResetPassword,
  onStatusChange,
  isMobile = false,
  delay = 0,
}: {
  user: UserRecord;
  metrics: UserMetrics;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendEmail: () => void;
  onResetPassword: () => void;
  onStatusChange: (status: UserStatus) => void;
  isMobile?: boolean;
  delay?: number;
}) => {
  const statusColors = getStatusColor(user.status);
  const roleVisual = getRoleVisual(user.roleName);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "group relative overflow-hidden rounded-md border bg-white transition-all",
        isSelected
          ? "border-[#22D3EE] ring-2 ring-[#22D3EE]/20"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg",
      )}
    >
      <div
        className={cn(
          "absolute left-4 top-4 z-10 transition-opacity",
          isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect()}
          className="border-[#22D3EE] data-[state=checked]:border-[#22D3EE] data-[state=checked]:bg-[#0891B2]"
        />
      </div>

      <div
        className={cn(
          "absolute right-4 top-4 z-10 transition-opacity",
          isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
        )}
        onClick={(event) => event.stopPropagation()}
      >
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md bg-white/80 hover:bg-white">
              <MoreHorizontal size={16} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-48 rounded-md">
            <DropdownMenuItem onClick={onView} className="rounded-md">
              <Eye size={14} className="mr-2" />
              View Profile
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-md">
              <Pencil size={14} className="mr-2" />
              Edit User
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onSendEmail} className="rounded-md">
              <Mail size={14} className="mr-2" />
              Send Email
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onResetPassword} className="rounded-md">
              <Key size={14} className="mr-2" />
              Reset Password
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="rounded-md">
                <UserCog size={14} className="mr-2" />
                Change Status
              </DropdownMenuSubTrigger>
              <DropdownMenuSubContent className="rounded-md">
                {STATUS_OPTIONS.map((option) => (
                  <DropdownMenuItem
                    key={option.value}
                    onClick={() => onStatusChange(option.value)}
                    className="rounded-md"
                  >
                    <div className={cn("mr-2 h-2 w-2 rounded-full", getStatusColor(option.value).dot)} />
                    {option.label}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuSubContent>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
              <Trash2 size={14} className="mr-2" />
              Delete User
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="cursor-pointer p-6 pt-12 text-center" onClick={onView}>
        <div className="relative mb-4 inline-block">
          {user.avatarUrl ? (
            <img
              src={user.avatarUrl}
              alt={user.fullName}
              className="mx-auto h-20 w-20 rounded-md object-cover"
            />
          ) : (
            <div className="mx-auto flex h-20 w-20 items-center justify-center rounded-md bg-[#F1F5F9] text-xl font-bold text-[#0F172A] sm:text-2xl">
              {getInitials(user.fullName)}
            </div>
          )}
          {user.isOnline && (
            <span className="absolute -bottom-1 -right-1 h-5 w-5 rounded-full border-4 border-white bg-green-500" />
          )}
        </div>

        <h3 className="mb-1 font-semibold text-[#0F172A] transition-colors group-hover:text-[#0891B2]">
          {user.fullName}
        </h3>
        <p className="mb-3 text-sm text-[#94A3B8]">{user.position || "Team Member"}</p>

        <div className="mb-4 flex items-center justify-center gap-2">
          <span
            className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium"
            style={{ backgroundColor: `${roleVisual.color}15`, color: roleVisual.color }}
          >
            <roleVisual.icon size={12} />
            {user.roleName}
          </span>
        </div>

        <div className="flex items-center justify-center gap-3 text-xs">
          <span className={cn("inline-flex items-center gap-1 rounded-md px-2 py-0.5", statusColors.bg, statusColors.text)}>
            <span className={cn("h-1.5 w-1.5 rounded-full", statusColors.dot)} />
            {user.status}
          </span>
          {user.department && <span className="text-[#475569]">{user.department}</span>}
        </div>
      </div>

      <div className="border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/50 px-6 py-4">
        <div className="flex items-center justify-between text-xs">
          <div className="text-center">
            <p className="font-semibold text-[#0F172A]">{metrics.tasksCompleted}</p>
            <p className="text-[#475569]">Task Logs</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#0F172A]">{metrics.projectsCount}</p>
            <p className="text-[#475569]">Project Logs</p>
          </div>
          <div className="text-center">
            <p className="font-semibold text-[#0F172A]">{metrics.loginCount}</p>
            <p className="text-[#475569]">Logins</p>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

const UserRow = ({
  user,
  metrics,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onSendEmail,
  onResetPassword,
  onStatusChange,
}: {
  user: UserRecord;
  metrics: UserMetrics;
  isSelected: boolean;
  onSelect: () => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onSendEmail: () => void;
  onResetPassword: () => void;
  onStatusChange: (status: UserStatus) => void;
}) => {
  const statusColors = getStatusColor(user.status);
  const roleVisual = getRoleVisual(user.roleName);

  return (
    <TableRow className="group hover:bg-[#F8FAFC]">
      <TableCell>
        <Checkbox
          checked={isSelected}
          onCheckedChange={() => onSelect()}
          className="border-[#22D3EE] data-[state=checked]:border-[#22D3EE] data-[state=checked]:bg-[#0891B2]"
        />
      </TableCell>
      <TableCell>
        <div className="flex cursor-pointer items-center gap-3" onClick={onView}>
          <div className="relative">
            {user.avatarUrl ? (
              <img
                src={user.avatarUrl}
                alt={user.fullName}
                className="h-10 w-10 rounded-md object-cover"
              />
            ) : (
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F1F5F9] text-sm font-bold text-[#0F172A]">
                {getInitials(user.fullName)}
              </div>
            )}
            {user.isOnline && (
              <span className="absolute -bottom-0.5 -right-0.5 h-3 w-3 rounded-full border-2 border-white bg-green-500" />
            )}
          </div>
          <div>
            <p className="font-medium text-[#0F172A] transition-colors group-hover:text-[#0891B2]">
              {user.fullName}
            </p>
            <p className="text-sm text-[#94A3B8]">{user.email}</p>
          </div>
        </div>
      </TableCell>
      <TableCell>
        <span
          className="inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium"
          style={{ backgroundColor: `${roleVisual.color}15`, color: roleVisual.color }}
        >
          <roleVisual.icon size={12} />
          {user.roleName}
        </span>
      </TableCell>
      <TableCell>
        <span className="text-sm text-[#475569]">{user.department || "-"}</span>
      </TableCell>
      <TableCell>
        <span className={cn("inline-flex items-center gap-1.5 rounded-md px-2.5 py-1 text-xs font-medium", statusColors.bg, statusColors.text)}>
          <span className={cn("h-1.5 w-1.5 rounded-full", statusColors.dot)} />
          {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
        </span>
      </TableCell>
      <TableCell>
        <div className="space-y-1">
          <p className="text-sm text-[#94A3B8]">{getRelativeTime(user.lastLogin)}</p>
          <p className="text-xs text-[#CBD5E1]">{metrics.loginCount} logins logged</p>
        </div>
      </TableCell>
      <TableCell className="text-right">
        <div className="flex items-center justify-end gap-1 opacity-0 transition-opacity group-hover:opacity-100">
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
              <DropdownMenuItem onClick={onSendEmail} className="rounded-md">
                <Mail size={14} className="mr-2" />
                Send Email
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onResetPassword} className="rounded-md">
                <Key size={14} className="mr-2" />
                Reset Password
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuSub>
                <DropdownMenuSubTrigger className="rounded-md">
                  <UserCog size={14} className="mr-2" />
                  Change Status
                </DropdownMenuSubTrigger>
                <DropdownMenuSubContent className="rounded-md">
                  {STATUS_OPTIONS.map((option) => (
                    <DropdownMenuItem
                      key={option.value}
                      onClick={() => onStatusChange(option.value)}
                      className="rounded-md"
                    >
                      <div className={cn("mr-2 h-2 w-2 rounded-full", getStatusColor(option.value).dot)} />
                      {option.label}
                    </DropdownMenuItem>
                  ))}
                </DropdownMenuSubContent>
              </DropdownMenuSub>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600 focus:text-red-600">
                <Trash2 size={14} className="mr-2" />
                Delete User
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </TableCell>
    </TableRow>
  );
};

const UserFormDialog = ({
  isOpen,
  onClose,
  user,
  roles,
  departments,
  onSubmit,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserRecord | null;
  roles: ApiRole[];
  departments: DepartmentEntity[];
  onSubmit: (values: UserFormValues) => Promise<void>;
}) => {
  const { isMobile } = useIsMobile();
  const [formData, setFormData] = useState<UserFormValues>({
    fullName: "",
    email: "",
    phone: "",
    roleId: "",
    department: "",
    position: "",
    status: "active",
    sendInviteEmail: true,
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (user) {
      setFormData({
        fullName: user.fullName,
        email: user.email,
        phone: user.phone || "",
        roleId: user.roleId || "",
        department: user.department || "",
        position: user.position || "",
        status: user.status,
        sendInviteEmail: true,
      });
      return;
    }

    setFormData({
      fullName: "",
      email: "",
      phone: "",
      roleId: roles[0]?.id || "",
      department: "",
      position: "",
      status: "active",
      sendInviteEmail: true,
    });
  }, [user, roles, isOpen]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formData.fullName.trim() || !formData.email.trim() || !formData.roleId) {
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
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isMobile ? "left-0 top-auto bottom-0 max-h-[92vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl p-0" : "max-h-[90vh] overflow-y-auto rounded-md p-0 sm:max-w-[600px]"}>
        <div className="sticky top-0 z-10 border-b border-[rgba(15,23,42,0.06)] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {user ? "Edit User" : "Add New User"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {user ? "Update team member details" : "Create a new team member account"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="flex items-center gap-6">
            <div className="relative">
              <div className="flex h-20 w-20 items-center justify-center rounded-md bg-[#F1F5F9] text-xl font-bold text-[#0F172A]">
                {formData.fullName ? getInitials(formData.fullName) : <User size={28} />}
              </div>
              <div className="absolute -bottom-2 -right-2 flex h-8 w-8 items-center justify-center rounded-md bg-[#E2E8F0] text-[#64748B]">
                <Camera size={14} />
              </div>
            </div>
            <div>
              <p className="font-medium text-[#0F172A]">Profile Avatar</p>
              <p className="text-sm text-[#94A3B8]">
                Avatar initials are generated automatically for user accounts.
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">
                Full Name <span className="text-red-500">*</span>
              </Label>
              <div className="relative">
                <User size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.fullName}
                  onChange={(event) => setFormData((current) => ({ ...current, fullName: event.target.value }))}
                  placeholder="Avery Thompson"
                  className="h-11 rounded-md border-[rgba(15,23,42,0.06)] pl-10 focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  required
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
                  onChange={(event) => setFormData((current) => ({ ...current, email: event.target.value }))}
                  placeholder="avery@zodo.ca"
                  className="h-11 rounded-md border-[rgba(15,23,42,0.06)] pl-10 focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  disabled={Boolean(user)}
                  required
                />
              </div>
              {user && <p className="text-xs text-[#94A3B8]">Email changes are handled from the employee profile record.</p>}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Phone Number</Label>
              <div className="relative">
                <Phone size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.phone}
                  onChange={(event) => setFormData((current) => ({ ...current, phone: event.target.value }))}
                  placeholder="+1 (555) 123-4567"
                  className="h-11 rounded-md border-[rgba(15,23,42,0.06)] pl-10 focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Position / Title</Label>
              <div className="relative">
                <Briefcase size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  value={formData.position}
                  onChange={(event) => setFormData((current) => ({ ...current, position: event.target.value }))}
                  placeholder="Production Manager"
                  className="h-11 rounded-md border-[rgba(15,23,42,0.06)] pl-10 focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                />
              </div>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Role</Label>
              <Select
                value={formData.roleId || SELECT_NONE_VALUE}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    roleId: value === SELECT_NONE_VALUE ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select role" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value={SELECT_NONE_VALUE} className="rounded-md">
                    Select role
                  </SelectItem>
                  {roles.map((role) => {
                    const roleVisual = getRoleVisual(role.name);
                    return (
                      <SelectItem key={role.id} value={role.id} className="rounded-md">
                        <div className="flex items-center gap-2">
                          <roleVisual.icon size={14} style={{ color: roleVisual.color }} />
                          {role.name}
                        </div>
                      </SelectItem>
                    );
                  })}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Department</Label>
              <Select
                value={formData.department || SELECT_NONE_VALUE}
                onValueChange={(value) =>
                  setFormData((current) => ({
                    ...current,
                    department: value === SELECT_NONE_VALUE ? "" : value,
                  }))
                }
              >
                <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                  <SelectValue placeholder="Select department" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value={SELECT_NONE_VALUE} className="rounded-md">
                    No department
                  </SelectItem>
                  {departments.map((department) => (
                    <SelectItem key={department.id} value={department.name} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <span className="h-2 w-2 rounded-full" style={{ backgroundColor: department.color }} />
                        {department.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Status</Label>
            <Select
              value={formData.status}
              onValueChange={(value) => setFormData((current) => ({ ...current, status: value as UserStatus }))}
            >
              <SelectTrigger className="h-11 rounded-md border-[rgba(15,23,42,0.06)]">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="rounded-md">
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value} className="rounded-md">
                    <div className="flex items-center gap-2">
                      <span className={cn("h-2 w-2 rounded-full", getStatusColor(option.value).dot)} />
                      {option.label}
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {!user && (
            <div className="flex items-center justify-between rounded-md bg-[#F8FAFC] p-4">
              <div>
                <p className="font-medium text-[#0F172A]">Send Invitation Email</p>
                <p className="text-sm text-[#94A3B8]">
                  Email the user a secure welcome link instead of manually sharing a password.
                </p>
              </div>
              <Switch
                checked={formData.sendInviteEmail}
                onCheckedChange={(checked) =>
                  setFormData((current) => ({ ...current, sendInviteEmail: checked }))
                }
              />
            </div>
          )}

          <DialogFooter className="gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={saving || !formData.fullName || !formData.email || !formData.roleId}
              className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
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

const RoleFormDialog = ({
  open,
  role,
  permissions,
  onClose,
  onSubmit,
}: {
  open: boolean;
  role: ApiRole | null;
  permissions: ApiPermission[];
  onClose: () => void;
  onSubmit: (values: RoleFormValues) => Promise<void>;
}) => {
  const { isMobile } = useIsMobile();
  const [formValues, setFormValues] = useState<RoleFormValues>({
    name: "",
    description: "",
    permissionIds: [],
  });
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open) {
      return;
    }

    setFormValues({
      name: role?.name || "",
      description: role?.description || "",
      permissionIds: role?.permissions.map((permission) => permission.id) || [],
    });
  }, [role, open]);

  const permissionGroups = useMemo(() => {
    const groups = new Map<string, ApiPermission[]>();
    permissions.forEach((permission) => {
      const bucket = groups.get(permission.module) || [];
      bucket.push(permission);
      groups.set(permission.module, bucket);
    });
    return [...groups.entries()].sort(([left], [right]) => left.localeCompare(right));
  }, [permissions]);

  const togglePermission = (permissionId: string, checked: boolean) => {
    setFormValues((current) => ({
      ...current,
      permissionIds: checked
        ? [...current.permissionIds, permissionId]
        : current.permissionIds.filter((id) => id !== permissionId),
    }));
  };

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!formValues.name.trim()) {
      return;
    }

    setSaving(true);
    try {
      await onSubmit({
        name: formValues.name.trim(),
        description: formValues.description.trim(),
        permissionIds: [...new Set(formValues.permissionIds)],
      });
      onClose();
    } finally {
      setSaving(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={(nextOpen) => !nextOpen && onClose()}>
      <DialogContent className={isMobile ? "left-0 top-auto bottom-0 max-h-[92vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl p-0" : "max-h-[90vh] overflow-y-auto rounded-md p-0 sm:max-w-[760px]"}>
        <div className="sticky top-0 z-10 border-b border-[rgba(15,23,42,0.06)] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {role ? "Edit Role" : "Create Role"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Manage tenant-specific permissions for this role.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6 p-6">
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Role Name</Label>
              <Input
                value={formValues.name}
                onChange={(event) => setFormValues((current) => ({ ...current, name: event.target.value }))}
                placeholder="Production Manager"
                className="h-11 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                required
              />
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Permission Count</Label>
              <div className="flex h-11 items-center rounded-md border border-[rgba(15,23,42,0.06)] px-4 text-sm text-[#475569]">
                {formValues.permissionIds.length} permissions selected
              </div>
            </div>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formValues.description}
              onChange={(event) => setFormValues((current) => ({ ...current, description: event.target.value }))}
              placeholder="Access level for estimating, production planning, and team coordination."
              className="resize-none rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
              rows={3}
            />
          </div>

          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="font-semibold text-[#0F172A]">Permissions</h3>
                <p className="text-sm text-[#94A3B8]">Choose the actions this role can perform.</p>
              </div>
              <Badge variant="outline" className="rounded-md">
                {permissions.length} available
              </Badge>
            </div>

            <div className="space-y-4">
              {permissionGroups.map(([module, modulePermissions]) => (
                <div key={module} className="rounded-md border border-[rgba(15,23,42,0.06)] p-4">
                  <h4 className="mb-3 font-medium text-[#0F172A]">{module}</h4>
                  <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                    {modulePermissions.map((permission) => (
                      <label
                        key={permission.id}
                        className="flex items-start gap-3 rounded-md bg-[#F8FAFC] p-3"
                      >
                        <Checkbox
                          checked={formValues.permissionIds.includes(permission.id)}
                          onCheckedChange={(checked) => togglePermission(permission.id, Boolean(checked))}
                          className="mt-0.5 border-[#22D3EE] data-[state=checked]:border-[#22D3EE] data-[state=checked]:bg-[#0891B2]"
                        />
                        <div>
                          <p className="text-sm font-medium text-[#0F172A]">{permission.name}</p>
                          <p className="text-xs text-[#94A3B8]">{permission.code}</p>
                        </div>
                      </label>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </div>

          <DialogFooter className="gap-3 pt-2">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button type="submit" disabled={saving} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
              {saving ? (
                <>
                  <RefreshCw size={16} className="mr-2 animate-spin" />
                  Saving...
                </>
              ) : (
                <>
                  <Shield size={16} className="mr-2" />
                  {role ? "Update Role" : "Create Role"}
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

const UserProfileDialog = ({
  isOpen,
  onClose,
  user,
  metrics,
  role,
  userActivity,
  onEdit,
  onManagePermissions,
  onChangeRole,
}: {
  isOpen: boolean;
  onClose: () => void;
  user: UserRecord | null;
  metrics: UserMetrics;
  role: ApiRole | null;
  userActivity: AuditLogItem[];
  onEdit: () => void;
  onManagePermissions: () => void;
  onChangeRole: () => void;
}) => {
  const { isMobile } = useIsMobile();
  if (!user) {
    return null;
  }

  const statusColors = getStatusColor(user.status);
  const roleVisual = getRoleVisual(user.roleName);

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className={isMobile ? "left-0 top-auto bottom-0 max-h-[92vh] max-w-none translate-x-0 translate-y-0 overflow-y-auto rounded-t-3xl p-0" : "max-h-[90vh] overflow-y-auto rounded-md p-0 sm:max-w-[760px]"}>
        <div className="relative h-32 bg-[#F1F5F9]">
          <div className="absolute inset-0 opacity-10" />
          <Button
            variant="ghost"
            size="icon"
            onClick={onClose}
            className="absolute right-4 top-4 h-8 w-8 rounded-md bg-white/20 text-[#0F172A] hover:bg-white/30"
          >
            <X size={16} />
          </Button>
        </div>

        <div className="px-6 pb-6">
          <div className="relative -mt-16 mb-6">
            <div className="flex items-end gap-6">
              <div className="relative">
                {user.avatarUrl ? (
                  <img
                    src={user.avatarUrl}
                    alt={user.fullName}
                    className="h-28 w-28 rounded-md border-4 border-white object-cover shadow-lg"
                  />
                ) : (
                  <div className="flex h-28 w-28 items-center justify-center rounded-md border-4 border-white bg-[#F1F5F9] text-3xl font-bold text-[#0F172A] shadow-lg">
                    {getInitials(user.fullName)}
                  </div>
                )}
                {user.isOnline && (
                  <span className="absolute bottom-1 right-1 h-5 w-5 rounded-full border-4 border-white bg-green-500" />
                )}
              </div>
              <div className="flex-1 pb-2">
                <div className="mb-1 flex flex-wrap items-center gap-3">
                  <h2 className="text-2xl font-bold text-[#0F172A]">{user.fullName}</h2>
                  <span
                    className="inline-flex items-center gap-1.5 rounded-md px-3 py-1 text-xs font-medium"
                    style={{ backgroundColor: `${roleVisual.color}15`, color: roleVisual.color }}
                  >
                    <roleVisual.icon size={12} />
                    {user.roleName}
                  </span>
                </div>
                <p className="text-[#94A3B8]">{user.position || "Team Member"}</p>
              </div>
              <Button onClick={onEdit} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                <Pencil size={16} className="mr-2" />
                Edit Profile
              </Button>
            </div>
          </div>

          <div className="mb-6 flex flex-wrap items-center gap-4">
            <span className={cn("inline-flex items-center gap-1.5 rounded-md px-3 py-1.5 text-sm font-medium", statusColors.bg, statusColors.text)}>
              <span className={cn("h-2 w-2 rounded-full", statusColors.dot)} />
              {user.status.charAt(0).toUpperCase() + user.status.slice(1)}
            </span>
            {user.department && (
              <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F8FAFC] px-3 py-1.5 text-sm text-[#475569]">
                <Building2 size={14} />
                {user.department}
              </span>
            )}
            <span className="inline-flex items-center gap-1.5 rounded-md bg-[#F8FAFC] px-3 py-1.5 text-sm text-[#475569]">
              <MapPin size={14} />
              {user.position || "No title assigned"}
            </span>
          </div>

          <Tabs defaultValue="overview" className="w-full">
            <TabsList className="mb-6 w-full justify-start rounded-md bg-[#F8FAFC] p-1">
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

            <TabsContent value="overview" className="space-y-6">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-md bg-[#F8FAFC] p-4 text-center">
                  <p className="text-2xl font-bold text-[#0F172A]">{metrics.tasksCompleted}</p>
                  <p className="text-sm text-[#94A3B8]">Task Logs</p>
                </div>
                <div className="rounded-md bg-[#F8FAFC] p-4 text-center">
                  <p className="text-2xl font-bold text-[#0891B2]">{metrics.projectsCount}</p>
                  <p className="text-sm text-[#94A3B8]">Project Logs</p>
                </div>
                <div className="rounded-md bg-[#F8FAFC] p-4 text-center">
                  <p className="text-2xl font-bold text-[#D97706]">{metrics.loginCount}</p>
                  <p className="text-sm text-[#94A3B8]">Login Events</p>
                </div>
                <div className="rounded-md bg-[#F8FAFC] p-4 text-center">
                  <p className="text-2xl font-bold text-[#8B5CF6]">{role?.permissions.length || 0}</p>
                  <p className="text-sm text-[#94A3B8]">Permissions</p>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-[#0F172A]">Contact Information</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="flex items-center gap-3 rounded-md bg-[#F8FAFC] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#0891B2]/10">
                      <Mail size={18} className="text-[#0891B2]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#475569]">Email</p>
                      <p className="text-sm font-medium text-[#0F172A]">{user.email}</p>
                    </div>
                  </div>
                  <div className="flex items-center gap-3 rounded-md bg-[#F8FAFC] p-4">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#D97706]/10">
                      <Phone size={18} className="text-[#D97706]" />
                    </div>
                    <div>
                      <p className="text-xs text-[#475569]">Phone</p>
                      <p className="text-sm font-medium text-[#0F172A]">{user.phone || "Not provided"}</p>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-4">
                <h3 className="font-semibold text-[#0F172A]">Account Details</h3>
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
                  <div className="rounded-md bg-[#F8FAFC] p-4">
                    <p className="mb-1 text-xs text-[#475569]">Member Since</p>
                    <p className="text-sm font-medium text-[#0F172A]">{formatDate(user.createdAt)}</p>
                  </div>
                  <div className="rounded-md bg-[#F8FAFC] p-4">
                    <p className="mb-1 text-xs text-[#475569]">Last Login</p>
                    <p className="text-sm font-medium text-[#0F172A]">{getRelativeTime(user.lastLogin)}</p>
                  </div>
                </div>
              </div>
            </TabsContent>

            <TabsContent value="activity" className="space-y-4">
              <h3 className="font-semibold text-[#0F172A]">Recent Activity</h3>
              <div className="space-y-3">
                {userActivity.slice(0, 10).map((log) => (
                  <div key={log.id} className="flex items-start gap-4 rounded-md bg-[#F8FAFC] p-4">
                    <div className="flex h-10 w-10 flex-shrink-0 items-center justify-center rounded-md bg-[#0891B2]/10">
                      {log.action === "LOGIN" && <LogIn size={18} className="text-[#0891B2]" />}
                      {log.action === "LOGOUT" && <LogOut size={18} className="text-[#64748B]" />}
                      {log.action === "UPDATE" && <UserCog size={18} className="text-[#D97706]" />}
                      {!["LOGIN", "LOGOUT", "UPDATE"].includes(log.action) && (
                        <Activity size={18} className="text-[#475569]" />
                      )}
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="text-sm font-medium text-[#0F172A]">{log.description}</p>
                      <div className="mt-1 flex flex-wrap items-center gap-3 text-xs text-[#475569]">
                        <span>{getRelativeTime(log.createdAt)}</span>
                        {log.module && <span>Module: {log.module}</span>}
                        {log.ipAddress && <span>IP: {log.ipAddress}</span>}
                      </div>
                    </div>
                  </div>
                ))}
                {userActivity.length === 0 && (
                  <div className="py-8 text-center text-[#94A3B8]">No activity recorded yet</div>
                )}
              </div>
            </TabsContent>

            <TabsContent value="permissions" className="space-y-4">
              <div className="flex items-center justify-between">
                <h3 className="font-semibold text-[#0F172A]">Role & Permissions</h3>
                <Button variant="outline" size="sm" className="rounded-md" onClick={onManagePermissions}>
                  <Settings size={14} className="mr-2" />
                  Manage Permissions
                </Button>
              </div>

              <div className="rounded-md border border-[rgba(15,23,42,0.06)] p-4">
                <div className="flex items-center gap-4">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${roleVisual.color}15` }}
                  >
                    <roleVisual.icon size={24} style={{ color: roleVisual.color }} />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-[#0F172A]">{user.roleName}</p>
                    <p className="text-sm text-[#94A3B8]">{role?.description || "Role details are managed per tenant."}</p>
                  </div>
                  <Button variant="outline" size="sm" className="rounded-md" onClick={onChangeRole}>
                    Change Role
                  </Button>
                </div>
              </div>

              <div className="space-y-3">
                <h4 className="text-sm font-medium text-[#475569]">Granted Permissions</h4>
                <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
                  {role?.permissions.length ? (
                    role.permissions.map((permission) => (
                      <div key={permission.id} className="flex items-center gap-3 rounded-md bg-green-50 p-3">
                        <CheckCircle2 size={16} className="text-green-500" />
                        <div>
                          <p className="text-sm text-green-700">{permission.name}</p>
                          <p className="text-xs text-green-600">{permission.code}</p>
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-md bg-[#F8FAFC] p-4 text-sm text-[#94A3B8]">
                      No permissions are assigned to this role yet.
                    </div>
                  )}
                </div>
              </div>
            </TabsContent>
          </Tabs>
        </div>
      </DialogContent>
    </Dialog>
  );
};

const InviteUsersDialog = ({
  isOpen,
  onClose,
  roles,
  onInvite,
}: {
  isOpen: boolean;
  onClose: () => void;
  roles: ApiRole[];
  onInvite: (emails: string[], roleId: string) => Promise<void>;
}) => {
  const [emails, setEmails] = useState("");
  const [roleId, setRoleId] = useState("");
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (isOpen && !roleId) {
      setRoleId(roles.find((role) => !role.isDefault)?.id || roles[0]?.id || "");
    }
  }, [isOpen, roleId, roles]);

  const handleInvite = async () => {
    const emailList = emails
      .split(/[,\n]/)
      .map((value) => value.trim())
      .filter(Boolean);

    if (!emailList.length || !roleId) {
      return;
    }

    setSending(true);
    try {
      await onInvite(emailList, roleId);
      onClose();
      setEmails("");
    } finally {
      setSending(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="rounded-md p-0 sm:max-w-[520px]">
        <div className="border-b border-[rgba(15,23,42,0.06)] bg-white p-6">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">Invite Team Members</DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              Send secure invitations to join this workspace.
            </DialogDescription>
          </DialogHeader>
        </div>

        <div className="space-y-5 p-6">
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Email Addresses <span className="text-red-500">*</span>
            </Label>
            <Textarea
              value={emails}
              onChange={(event) => setEmails(event.target.value)}
              placeholder={"one@company.com\ntwo@company.com"}
              rows={4}
              className="resize-none rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
            />
            <p className="text-xs text-[#475569]">Separate multiple email addresses with commas or new lines.</p>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Assign Role</Label>
            <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
              {roles.map((role) => {
                const roleVisual = getRoleVisual(role.name);
                return (
                  <motion.button
                    key={role.id}
                    type="button"
                    whileHover={{ scale: 1.02 }}
                    whileTap={{ scale: 0.98 }}
                    onClick={() => setRoleId(role.id)}
                    className={cn(
                      "flex items-center gap-3 rounded-md border-2 p-4 text-left transition-all",
                      roleId === role.id
                        ? "border-[#22D3EE] bg-[#0891B2]/5"
                        : "border-[rgba(15,23,42,0.06)] hover:border-slate-300",
                    )}
                  >
                    <div
                      className="flex h-10 w-10 items-center justify-center rounded-md"
                      style={{ backgroundColor: `${roleVisual.color}15` }}
                    >
                      <roleVisual.icon size={20} style={{ color: roleVisual.color }} />
                    </div>
                    <div className="min-w-0 flex-1">
                      <p className="font-medium text-[#0F172A]">{role.name}</p>
                      <p className="truncate text-xs text-[#94A3B8]">{role.description || "Tenant role"}</p>
                    </div>
                    {roleId === role.id && <CheckCircle2 size={18} className="text-[#0891B2]" />}
                  </motion.button>
                );
              })}
            </div>
          </div>

          {emails.trim() && (
            <div className="rounded-md bg-[#F8FAFC] p-4">
              <p className="mb-2 text-sm font-medium text-[#0F172A]">Invitations will be sent to:</p>
              <div className="flex flex-wrap gap-2">
                {emails
                  .split(/[,\n]/)
                  .map((value) => value.trim())
                  .filter(Boolean)
                  .map((email) => (
                    <span
                      key={email}
                      className="inline-flex items-center gap-1 rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-2 py-1 text-sm"
                    >
                      <Mail size={12} className="text-[#475569]" />
                      {email}
                    </span>
                  ))}
              </div>
            </div>
          )}
        </div>

        <DialogFooter className="gap-3 p-6 pt-0">
          <Button variant="outline" onClick={onClose} className="rounded-md">
            Cancel
          </Button>
          <Button
            onClick={handleInvite}
            disabled={sending || !emails.trim() || !roleId}
            className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90"
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

const RolesSection = ({
  roles,
  onCreate,
  onEdit,
  onDuplicate,
  onDelete,
  isMobile = false,
}: {
  roles: ApiRole[];
  onCreate: () => void;
  onEdit: (role: ApiRole) => void;
  onDuplicate: (role: ApiRole) => void;
  onDelete: (role: ApiRole) => void;
  isMobile?: boolean;
}) => {
  const [expandedRoleIds, setExpandedRoleIds] = useState<string[]>([]);

  const toggleExpandedRole = (roleId: string) => {
    setExpandedRoleIds((current) =>
      current.includes(roleId)
        ? current.filter((id) => id !== roleId)
        : [...current, roleId],
    );
  };

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Roles & Permissions</h2>
          <p className="text-sm text-[#94A3B8]">Manage real tenant roles and permission sets</p>
        </div>
        <Button onClick={onCreate} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90 sm:w-auto">
          <Plus size={16} className="mr-2" />
          Create Role
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {roles.map((role, index) => {
          const roleVisual = getRoleVisual(role.name);
          const isExpanded = expandedRoleIds.includes(role.id);
          const visiblePermissions = isExpanded ? role.permissions : role.permissions.slice(0, 5);
          const hiddenCount = Math.max(role.permissions.length - 5, 0);

          return (
            <motion.div
              key={role.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.08 }}
              whileHover={{ y: -4 }}
              className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-5 transition-all hover:border-[#22D3EE]/30 hover:shadow-lg"
            >
              <div className="mb-4 flex items-start justify-between">
                <div className="flex items-center gap-3">
                  <div
                    className="flex h-12 w-12 items-center justify-center rounded-md"
                    style={{ backgroundColor: `${roleVisual.color}15` }}
                  >
                    <roleVisual.icon size={24} style={{ color: roleVisual.color }} />
                  </div>
                  <div>
                    <div className="mb-1 flex flex-wrap items-center gap-2">
                      <h3 className="font-semibold text-[#0F172A]">{role.name}</h3>
                      {role.isDefault && <Badge className="rounded-md bg-[#0891B2]/10 text-[#0891B2]">Default</Badge>}
                      {role.isSystemRole && <Badge variant="secondary" className="rounded-md">System</Badge>}
                    </div>
                    <p className="text-sm text-[#94A3B8]">{role.description || "Tenant role without a description"}</p>
                  </div>
                </div>
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <Button variant="ghost" size="icon" className={cn("h-8 w-8 rounded-md", isMobile && "opacity-100")}>
                      <MoreVertical size={16} />
                    </Button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-44 rounded-md">
                    <DropdownMenuItem onClick={() => onEdit(role)} className="rounded-md">
                      <Pencil size={14} className="mr-2" />
                      Edit
                    </DropdownMenuItem>
                    <DropdownMenuItem onClick={() => onDuplicate(role)} className="rounded-md">
                      <Copy size={14} className="mr-2" />
                      Duplicate
                    </DropdownMenuItem>
                    <DropdownMenuSeparator />
                    <DropdownMenuItem
                      onClick={() => onDelete(role)}
                      className="rounded-md text-red-600 focus:text-red-600"
                      disabled={role.isSystemRole || role.isDefault || role.employeesCount > 0}
                    >
                      <Trash2 size={14} className="mr-2" />
                      Delete
                    </DropdownMenuItem>
                  </DropdownMenuContent>
                </DropdownMenu>
              </div>

              <div className="space-y-3">
                <div
                  className={cn(
                    "flex flex-wrap gap-2",
                    isExpanded && role.permissions.length > 12 && "max-h-40 overflow-y-auto pr-1",
                  )}
                >
                  {visiblePermissions.map((permission) => (
                    <span
                      key={permission.id}
                      className="rounded-md bg-[#F8FAFC] px-2 py-1 text-xs text-[#475569]"
                    >
                      {permission.name}
                    </span>
                  ))}
                </div>
                {role.permissions.length > 5 && (
                  <button
                    type="button"
                    onClick={() => toggleExpandedRole(role.id)}
                    className="inline-flex items-center gap-2 rounded-md bg-[#F8FAFC] px-2.5 py-1.5 text-xs font-medium text-[#0891B2] transition-colors hover:bg-[#0891B2]/10"
                  >
                    <ChevronDown
                      size={12}
                      className={cn("transition-transform", isExpanded && "rotate-180")}
                    />
                    {isExpanded ? "Show less" : `+${hiddenCount} more`}
                  </button>
                )}
                <div className="flex items-center justify-between border-t border-[rgba(15,23,42,0.06)] pt-4">
                  <div className="flex items-center gap-2">
                    <Users size={14} className="text-[#475569]" />
                    <span className="text-sm text-[#94A3B8]">{role.employeesCount} users</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <Shield size={14} className="text-[#475569]" />
                    <span className="text-sm text-[#94A3B8]">{role.permissions.length} permissions</span>
                  </div>
                </div>
              </div>
            </motion.div>
          );
        })}
      </div>
    </div>
  );
};

const DepartmentsSection = ({
  departments,
  onCreate,
  onEdit,
  onViewMembers,
  onDelete,
  isMobile = false,
}: {
  departments: DepartmentEntity[];
  onCreate: () => void;
  onEdit: (department: DepartmentEntity) => void;
  onViewMembers: (department: DepartmentEntity) => void;
  onDelete: (department: DepartmentEntity) => void;
  isMobile?: boolean;
}) => {
  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Departments</h2>
          <p className="text-sm text-[#94A3B8]">Tenant department data shared with employee management</p>
        </div>
        <Button onClick={onCreate} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
          <Plus size={16} className="mr-2" />
          Add Department
        </Button>
      </div>

      <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-3">
        {departments.map((department, index) => (
          <motion.div
            key={department.id}
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: index * 0.08 }}
            whileHover={{ y: -4 }}
            className="group cursor-pointer rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-5 transition-all hover:border-[#22D3EE]/30 hover:shadow-lg"
            onClick={() => onViewMembers(department)}
          >
            <div className="mb-4 flex items-start justify-between">
              <div
                className="flex h-12 w-12 items-center justify-center rounded-md"
                style={{ backgroundColor: `${department.color}15` }}
              >
                <Building2 size={24} style={{ color: department.color }} />
              </div>
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className={cn(
                      "h-8 w-8 rounded-md transition-opacity",
                      isMobile ? "opacity-100" : "opacity-0 group-hover:opacity-100",
                    )}
                    onClick={(event) => event.stopPropagation()}
                  >
                    <MoreVertical size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-44 rounded-md">
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault();
                      onEdit(department);
                    }}
                    className="rounded-md"
                  >
                    <Pencil size={14} className="mr-2" />
                    Edit
                  </DropdownMenuItem>
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault();
                      onViewMembers(department);
                    }}
                    className="rounded-md"
                  >
                    <Users size={14} className="mr-2" />
                    View Members
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem
                    onClick={(event) => {
                      event.preventDefault();
                      onDelete(department);
                    }}
                    className="rounded-md text-red-600 focus:text-red-600"
                  >
                    <Trash2 size={14} className="mr-2" />
                    Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>

            <h3 className="mb-1 font-semibold text-[#0F172A] transition-colors group-hover:text-[#0891B2]">
              {department.name}
            </h3>
            {department.headName && (
              <p className="mb-3 text-sm text-[#94A3B8]">Head: {department.headName}</p>
            )}

            <div className="space-y-3">
              <p className="line-clamp-2 text-sm text-[#475569]">{department.description}</p>
              <div className="flex items-center justify-between border-t border-[rgba(15,23,42,0.06)] pt-3">
                <div className="flex items-center gap-2">
                  <Users size={14} className="text-[#475569]" />
                  <span className="text-sm text-[#94A3B8]">{department.employeeCount} members</span>
                </div>
                <span className="text-sm text-[#94A3B8]">${department.budget.toLocaleString()}</span>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </div>
  );
};

const ActivityLogSection = ({
  logs,
  usersById,
  filterAction,
  onFilterChange,
  onExport,
  isMobile = false,
}: {
  logs: AuditLogItem[];
  usersById: Map<string, UserRecord>;
  filterAction: string;
  onFilterChange: (value: string) => void;
  onExport: () => void;
  isMobile?: boolean;
}) => {
  const filteredLogs = useMemo(() => {
    if (filterAction === "all") {
      return logs;
    }
    return logs.filter((log) => log.action === filterAction);
  }, [logs, filterAction]);

  const actionOptions = useMemo(() => {
    return ["all", ...new Set(logs.map((log) => log.action))];
  }, [logs]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h2 className="text-lg font-semibold text-[#0F172A]">Activity Log</h2>
          <p className="text-sm text-[#94A3B8]">Tenant-wide employee and user activity for this workspace</p>
        </div>
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center">
          <Select value={filterAction} onValueChange={onFilterChange}>
            <SelectTrigger className="h-9 w-full rounded-md border-[rgba(15,23,42,0.06)] sm:w-44">
              <SelectValue placeholder="Filter by action" />
            </SelectTrigger>
            <SelectContent className="rounded-md">
              {actionOptions.map((action) => (
                <SelectItem key={action} value={action} className="rounded-md">
                  {action === "all" ? "All Actions" : action.replace(/_/g, " ")}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          <Button variant="outline" className="rounded-md" onClick={onExport}>
            <Download size={16} className="mr-2" />
            Export
          </Button>
        </div>
      </div>

      {isMobile ? (
        <div className="space-y-3">
          {filteredLogs.map((log) => {
            const user = log.user?.id ? usersById.get(log.user.id) : undefined;
            const device = parseDevice(log.userAgent);
            const actorName = resolveAuditActorName(log, user);
            return (
              <div key={log.id} className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                <div className="flex items-start gap-3">
                  {user?.avatarUrl ? (
                    <img
                      src={user.avatarUrl}
                      alt={user.fullName}
                      className="h-10 w-10 rounded-xl object-cover"
                    />
                  ) : (
                    <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-[#F1F5F9] text-xs font-bold text-[#0F172A]">
                      {getInitials(actorName)}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center justify-between gap-3">
                      <p className="font-medium text-[#0F172A]">{actorName}</p>
                      <span className="text-xs text-[#94A3B8]">{getRelativeTime(log.createdAt)}</span>
                    </div>
                    <p className="mt-1 text-sm text-[#475569]">{log.description}</p>
                    <div className="mt-3 flex flex-wrap gap-2 text-xs text-[#64748B]">
                      <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 capitalize">
                        {log.action.replace(/_/g, " ").toLowerCase()}
                      </span>
                      <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1">{log.module || "-"}</span>
                      <span className="inline-flex items-center gap-1 rounded-full bg-[#F8FAFC] px-2.5 py-1">
                        {device === "Mobile" ? <Smartphone size={12} /> : <Monitor size={12} />}
                        {device}
                      </span>
                      <span className="rounded-full bg-[#F8FAFC] px-2.5 py-1 font-mono">{log.ipAddress || "-"}</span>
                    </div>
                  </div>
                </div>
              </div>
            );
          })}
          {filteredLogs.length === 0 && (
            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white py-10 text-center text-[#94A3B8]">
              No activity found for the selected filter.
            </div>
          )}
        </div>
      ) : (
        <div className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white">
          <Table>
            <TableHeader>
              <TableRow className="bg-[#F8FAFC]">
                <TableHead>User</TableHead>
                <TableHead>Action</TableHead>
                <TableHead>Module</TableHead>
                <TableHead>Description</TableHead>
                <TableHead>Device</TableHead>
                <TableHead>IP Address</TableHead>
                <TableHead>Time</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {filteredLogs.map((log) => {
                const user = log.user?.id ? usersById.get(log.user.id) : undefined;
                const device = parseDevice(log.userAgent);
                const actorName = resolveAuditActorName(log, user);
                return (
                  <TableRow key={log.id} className="hover:bg-[#F8FAFC]">
                    <TableCell>
                      <div className="flex items-center gap-3">
                        {user?.avatarUrl ? (
                          <img
                            src={user.avatarUrl}
                            alt={user.fullName}
                            className="h-8 w-8 rounded-md object-cover"
                          />
                        ) : (
                          <div className="flex h-8 w-8 items-center justify-center rounded-md bg-[#F1F5F9] text-xs font-bold text-[#0F172A]">
                            {getInitials(actorName)}
                          </div>
                        )}
                        <span className="font-medium text-[#0F172A]">
                          {actorName}
                        </span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-2">
                        {log.action === "LOGIN" && <LogIn size={16} className="text-green-500" />}
                        {log.action === "LOGOUT" && <LogOut size={16} className="text-[#64748B]" />}
                        {!["LOGIN", "LOGOUT"].includes(log.action) && <Activity size={16} className="text-[#475569]" />}
                        <span className="text-sm capitalize text-[#475569]">{log.action.replace(/_/g, " ").toLowerCase()}</span>
                      </div>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#475569]">{log.module || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#94A3B8]">{log.description}</span>
                    </TableCell>
                    <TableCell>
                      <span className="inline-flex items-center gap-1 text-sm text-[#94A3B8]">
                        {device === "Mobile" ? <Smartphone size={14} /> : <Monitor size={14} />}
                        {device}
                      </span>
                    </TableCell>
                    <TableCell>
                      <span className="font-mono text-sm text-[#475569]">{log.ipAddress || "-"}</span>
                    </TableCell>
                    <TableCell>
                      <span className="text-sm text-[#94A3B8]">{getRelativeTime(log.createdAt)}</span>
                    </TableCell>
                  </TableRow>
                );
              })}
              {filteredLogs.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-[#94A3B8]">
                    No activity found for the selected filter.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
};

export default function UsersPage() {
  const { toast } = useToast();
  const { isMobile } = useIsMobile();

  const [users, setUsers] = useState<UserRecord[]>([]);
  const [roles, setRoles] = useState<ApiRole[]>([]);
  const [permissions, setPermissions] = useState<ApiPermission[]>([]);
  const [departments, setDepartments] = useState<DepartmentEntity[]>([]);
  const [employees, setEmployees] = useState<ApiEmployee[]>([]);
  const [activityLogs, setActivityLogs] = useState<AuditLogItem[]>([]);

  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState("users");
  const [viewMode, setViewMode] = useState<"grid" | "list">("grid");
  const [searchTerm, setSearchTerm] = useState("");
  const [selectedUsers, setSelectedUsers] = useState<string[]>([]);
  const [filterRole, setFilterRole] = useState("all");
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterDepartment, setFilterDepartment] = useState("all");
  const [activityFilter, setActivityFilter] = useState("all");

  const [showUserForm, setShowUserForm] = useState(false);
  const [editingUser, setEditingUser] = useState<UserRecord | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [viewingUser, setViewingUser] = useState<UserRecord | null>(null);
  const [showInviteDialog, setShowInviteDialog] = useState(false);
  const [showRoleForm, setShowRoleForm] = useState(false);
  const [editingRole, setEditingRole] = useState<ApiRole | null>(null);
  const [showDepartmentDialog, setShowDepartmentDialog] = useState(false);
  const [editingDepartment, setEditingDepartment] = useState<DepartmentEntity | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<DeleteTarget>(null);

  const loadPageData = async () => {
    setLoading(true);

    const [
      usersResult,
      rolesResult,
      permissionsResult,
      departmentsResult,
      employeesResult,
      activityLogsResult,
    ] = await Promise.allSettled([
      getUsers({ limit: 200, sortBy: "createdAt", sortOrder: "desc" }),
      fetchRoles(),
      fetchAllPermissions(),
      getDepartments(),
      fetchEmployees(),
      getAuditLogs({ limit: 200, sortBy: "createdAt", sortOrder: "desc" }),
    ]);

    if (usersResult.status === "fulfilled") {
      setUsers(usersResult.value.map(mapUserRecord));
    } else {
      toast({
        title: "Users Unavailable",
        description: "The user list could not be loaded right now.",
        variant: "destructive",
      });
      setUsers([]);
    }

    if (rolesResult.status === "fulfilled") {
      setRoles(rolesResult.value);
    } else {
      setRoles([]);
    }

    if (permissionsResult.status === "fulfilled") {
      setPermissions(permissionsResult.value);
    } else {
      setPermissions([]);
    }

    if (departmentsResult.status === "fulfilled") {
      setDepartments(departmentsResult.value);
    } else {
      setDepartments([]);
    }

    if (employeesResult.status === "fulfilled") {
      setEmployees(employeesResult.value);
    } else {
      setEmployees([]);
    }

    if (activityLogsResult.status === "fulfilled") {
      setActivityLogs(activityLogsResult.value);
    } else {
      setActivityLogs([]);
    }

    setLoading(false);
  };

  useEffect(() => {
    void loadPageData();
  }, []);

  const userMetricsById = useMemo(() => {
    const metrics = new Map<string, UserMetrics>();

    activityLogs.forEach((log) => {
      const userId = log.user?.id;
      if (!userId) {
        return;
      }

      const current = metrics.get(userId) || {
        loginCount: 0,
        tasksCompleted: 0,
        projectsCount: 0,
      };

      if (log.action === "LOGIN") {
        current.loginCount += 1;
      }
      if (log.module === "tasks") {
        current.tasksCompleted += 1;
      }
      if (log.module === "projects") {
        current.projectsCount += 1;
      }

      metrics.set(userId, current);
    });

    return metrics;
  }, [activityLogs]);

  const usersWithMetrics = useMemo(() => {
    return users.map((user) => ({
      ...user,
      metrics: userMetricsById.get(user.id) || {
        loginCount: 0,
        tasksCompleted: 0,
        projectsCount: 0,
      },
    }));
  }, [userMetricsById, users]);

  const usersById = useMemo(() => {
    return new Map(users.map((user) => [user.id, user]));
  }, [users]);

  const filteredUsers = useMemo(() => {
    let result = [...usersWithMetrics];

    if (searchTerm) {
      const query = searchTerm.toLowerCase();
      result = result.filter((user) =>
        user.fullName.toLowerCase().includes(query)
        || user.email.toLowerCase().includes(query)
        || user.position.toLowerCase().includes(query)
        || user.department.toLowerCase().includes(query),
      );
    }

    if (filterRole !== "all") {
      result = result.filter((user) => user.roleId === filterRole);
    }

    if (filterStatus !== "all") {
      result = result.filter((user) => user.status === filterStatus);
    }

    if (filterDepartment !== "all") {
      result = result.filter((user) => user.department === filterDepartment);
    }

    return result;
  }, [filterDepartment, filterRole, filterStatus, searchTerm, usersWithMetrics]);

  const allVisibleSelected = filteredUsers.length > 0 && filteredUsers.every((user) => selectedUsers.includes(user.id));

  const stats = useMemo(() => {
    return {
      totalUsers: users.length,
      activeUsers: users.filter((user) => user.status === "active").length,
      pendingUsers: users.filter((user) => user.status === "pending").length,
      onlineUsers: users.filter((user) => user.isOnline).length,
    };
  }, [users]);

  const departmentDialogEmployees = useMemo(
    () => employees.map(mapEmployeeForDepartmentDialog),
    [employees],
  );

  const viewingUserRole = useMemo(() => {
    if (!viewingUser?.roleId) {
      return null;
    }
    return roles.find((role) => role.id === viewingUser.roleId) || null;
  }, [roles, viewingUser]);

  const viewingUserActivity = useMemo(() => {
    if (!viewingUser) {
      return [];
    }
    return activityLogs.filter((log) => log.user?.id === viewingUser.id);
  }, [activityLogs, viewingUser]);

  const handleSelectUser = (userId: string) => {
    setSelectedUsers((current) =>
      current.includes(userId) ? current.filter((id) => id !== userId) : [...current, userId],
    );
  };

  const handleSelectAll = () => {
    setSelectedUsers(allVisibleSelected ? [] : filteredUsers.map((user) => user.id));
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowUserForm(true);
  };

  const handleEditUser = (user: UserRecord) => {
    setEditingUser(user);
    setShowUserForm(true);
  };

  const handleViewUser = (user: UserRecord) => {
    setViewingUser(user);
    setShowUserProfile(true);
  };

  const openDeleteDialog = (target: DeleteTarget) => {
    setDeleteTarget(target);
  };

  const handleSendEmail = (user: UserRecord) => {
    window.location.href = `mailto:${encodeURIComponent(user.email)}`;
  };

  const handleResetPassword = async (user: UserRecord) => {
    try {
      await requestUserPasswordReset(user.email);
      toast({
        title: "Reset Email Sent",
        description: `A password reset email was sent to ${user.email}.`,
      });
    } catch (error) {
      console.error("Failed to send password reset email", error);
      toast({
        title: "Reset Failed",
        description: `Could not send a password reset email to ${user.email}.`,
        variant: "destructive",
      });
    }
  };

  const handleStatusChange = async (userId: string, status: UserStatus) => {
    try {
      await updateUserStatusApi(userId, toApiStatus(status));
      await loadPageData();
      toast({
        title: "Status Updated",
        description: `User status changed to ${status}.`,
      });
    } catch (error) {
      console.error("Failed to update user status", error);
      toast({
        title: "Update Failed",
        description: "The user status could not be updated.",
        variant: "destructive",
      });
    }
  };

  const handleSubmitUser = async (values: UserFormValues) => {
    const { firstName, lastName } = splitFullName(values.fullName);

    try {
      if (editingUser) {
        await updateUserApi(editingUser.id, {
          firstName,
          lastName,
          phone: values.phone || null,
          department: values.department || null,
          position: values.position || null,
          status: toApiStatus(values.status),
        });

        if (values.roleId && values.roleId !== editingUser.roleId) {
          await updateUserRoleApi(editingUser.id, values.roleId);
        }

        toast({
          title: "User Updated",
          description: `${values.fullName} was updated successfully.`,
        });
      } else {
        if (values.sendInviteEmail) {
          const response = await inviteUserApi({
            email: values.email.trim(),
            firstName,
            lastName,
            phone: values.phone || null,
            roleId: values.roleId,
            department: values.department || null,
            position: values.position || null,
          });

          const inviteDetails = response as InviteWorkspaceUserResponse;
          toast({
            title: "Invitation Sent",
            description: inviteDetails.inviteEmailSent
              ? `${values.email} was invited successfully.`
              : inviteDetails.temporaryPassword
                ? `User created. Temporary password: ${inviteDetails.temporaryPassword}`
                : `${values.email} was invited successfully.`,
          });
        } else {
          await createUserApi({
            email: values.email.trim(),
            password: "ChangeMe123!",
            firstName,
            lastName,
            phone: values.phone || null,
            roleId: values.roleId,
            department: values.department || null,
            position: values.position || null,
          });

          toast({
            title: "User Created",
            description: `${values.fullName} was added successfully.`,
          });
        }
      }

      await loadPageData();
    } catch (error) {
      console.error("Failed to save user", error);
      toast({
        title: "Save Failed",
        description: "The user could not be saved.",
        variant: "destructive",
      });
    }
  };

  const handleInviteUsers = async (emails: string[], roleId: string) => {
    const results = await Promise.allSettled(
      emails.map((email) => {
        const { firstName, lastName } = splitFullName(email.split("@")[0].replace(/[._-]/g, " "));
        return inviteUserApi({
          email,
          firstName,
          lastName,
          roleId,
        });
      }),
    );

    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.length - successCount;

    await loadPageData();

    toast({
      title: successCount ? "Invitations Processed" : "Invitations Failed",
      description: failedCount
        ? `${successCount} invitation(s) sent, ${failedCount} failed.`
        : `${successCount} invitation(s) have been sent.`,
      variant: failedCount && !successCount ? "destructive" : undefined,
    });
  };

  const handleBulkAction = async (action: BulkAction) => {
    if (!selectedUsers.length) {
      return;
    }

    const tasks =
      action === "delete"
        ? selectedUsers.map((userId) => deleteUserApi(userId))
        : selectedUsers.map((userId) =>
            updateUserStatusApi(
              userId,
              action === "activate"
                ? "ACTIVE"
                : action === "deactivate"
                  ? "INACTIVE"
                  : "SUSPENDED",
            ),
          );

    const results = await Promise.allSettled(tasks);
    const successCount = results.filter((result) => result.status === "fulfilled").length;
    const failedCount = results.length - successCount;

    setSelectedUsers([]);
    await loadPageData();

    toast({
      title: failedCount ? "Bulk Action Completed with Errors" : "Bulk Action Completed",
      description: failedCount
        ? `${successCount} user(s) updated, ${failedCount} failed.`
        : `${successCount} user(s) updated successfully.`,
      variant: failedCount ? "destructive" : undefined,
    });
  };

  const handleRoleSubmit = async (values: RoleFormValues) => {
    try {
      if (editingRole) {
        await updateRoleApi(editingRole.id, {
          name: values.name,
          description: values.description || undefined,
          permissionIds: values.permissionIds,
        });
        toast({
          title: "Role Updated",
          description: `${values.name} was updated successfully.`,
        });
      } else {
        await createRoleApi({
          name: values.name,
          description: values.description || undefined,
          permissionIds: values.permissionIds,
        });
        toast({
          title: "Role Created",
          description: `${values.name} was created successfully.`,
        });
      }

      await loadPageData();
    } catch (error) {
      console.error("Failed to save role", error);
      toast({
        title: "Role Save Failed",
        description: "The role could not be saved.",
        variant: "destructive",
      });
    }
  };

  const handleDuplicateRole = async (role: ApiRole) => {
    try {
      await createRoleApi({
        name: `${role.name} Copy`,
        description: role.description || undefined,
        permissionIds: role.permissions.map((permission) => permission.id),
      });

      await loadPageData();
      toast({
        title: "Role Duplicated",
        description: `${role.name} was duplicated successfully.`,
      });
    } catch (error) {
      console.error("Failed to duplicate role", error);
      toast({
        title: "Duplicate Failed",
        description: "The role could not be duplicated.",
        variant: "destructive",
      });
    }
  };

  const handleDepartmentSubmit = async (values: {
    name: string;
    code: string;
    description: string;
    headId?: string;
    budget: string;
    color: string;
  }) => {
    try {
      const payload = {
        name: values.name,
        code: values.code,
        description: values.description,
        headId: values.headId || null,
        budget: Number(values.budget),
        color: values.color,
      };

      if (editingDepartment) {
        await updateDepartmentApi(editingDepartment.id, payload);
        toast({
          title: "Department Updated",
          description: `${values.name} was updated successfully.`,
        });
      } else {
        await createDepartment(payload);
        toast({
          title: "Department Created",
          description: `${values.name} was added successfully.`,
        });
      }

      await loadPageData();
    } catch (error) {
      console.error("Failed to save department", error);
      toast({
        title: "Department Save Failed",
        description: "The department could not be saved.",
        variant: "destructive",
      });
    }
  };

  const handleViewMembers = (department: DepartmentEntity) => {
    setActiveTab("users");
    setFilterDepartment(department.name);
    toast({
      title: "Department Filter Applied",
      description: `Showing users in ${department.name}.`,
    });
  };

  const handleManagePermissions = () => {
    if (!viewingUser?.roleId) {
      return;
    }

    const matchingRole = roles.find((role) => role.id === viewingUser.roleId);
    setShowUserProfile(false);
    setActiveTab("roles");

    if (matchingRole) {
      setEditingRole(matchingRole);
      setShowRoleForm(true);
    }
  };

  const handleExportAuditLogs = async () => {
    try {
      const blob = await exportAuditLogs({ limit: 5000, sortBy: "createdAt", sortOrder: "desc" });
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = `audit-logs-${new Date().toISOString().slice(0, 10)}.csv`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Failed to export audit logs", error);
      toast({
        title: "Export Failed",
        description: "Audit logs could not be exported.",
        variant: "destructive",
      });
    }
  };

  const confirmDelete = async () => {
    if (!deleteTarget) {
      return;
    }

    try {
      if (deleteTarget.type === "user") {
        await deleteUserApi(deleteTarget.id);
        toast({
          title: "User Deleted",
          description: `${deleteTarget.name} was removed from the workspace.`,
        });
      }

      if (deleteTarget.type === "role") {
        await deleteRoleApi(deleteTarget.id);
        toast({
          title: "Role Deleted",
          description: `${deleteTarget.name} was deleted successfully.`,
        });
      }

      if (deleteTarget.type === "department") {
        await deleteDepartmentApi(deleteTarget.id);
        toast({
          title: "Department Deleted",
          description: `${deleteTarget.name} was deleted successfully.`,
        });
      }

      await loadPageData();
    } catch (error) {
      console.error("Failed to delete item", error);
      toast({
        title: "Delete Failed",
        description:
          deleteTarget.type === "department"
            ? "Departments with active employees cannot be deleted."
            : deleteTarget.type === "role"
              ? "Roles assigned to active users cannot be deleted."
              : `The selected ${deleteTarget.type} could not be deleted.`,
        variant: "destructive",
      });
    } finally {
      setDeleteTarget(null);
    }
  };

  return (
    <div className="min-h-screen bg-[#F8FAFC]">
      <main className="flex-1 transition-all duration-300">
        <header className="crm-module-header sticky top-0 z-30 border-b border-[rgba(15,23,42,0.06)] bg-white/80 backdrop-blur-md">
          <div className="px-6 py-4">
            <div className="flex items-center justify-between">
              <div>
                <div className="mb-1 hidden items-center gap-2 text-sm text-[#94A3B8] sm:flex">
                  <span>Dashboard</span>
                  <ChevronRight size={14} />
                  <span className="font-medium text-[#0891B2]">Users</span>
                </div>
                <h1 className="text-xl font-bold text-[#0F172A] sm:text-2xl">User Management</h1>
              </div>

              <div className="hidden items-center gap-3 sm:flex">
                <Button
                  variant="outline"
                  onClick={() => setShowInviteDialog(true)}
                  className="rounded-md border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE] hover:text-[#0891B2]"
                >
                  <MailPlus size={16} className="mr-2" />
                  Invite Users
                </Button>
                <Button onClick={handleCreateUser} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                  <UserPlus size={16} className="mr-2" />
                  Add User
                </Button>

                <NotificationBell
                  buttonClassName="border-0 bg-white/5 p-2.5 hover:bg-slate-200"
                  iconClassName="text-[#475569]"
                  iconSize={20}
                />

                <div className="flex items-center gap-3 border-l border-[rgba(15,23,42,0.06)] pl-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-md bg-[#F1F5F9] font-bold text-[#0F172A]">
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

          <div className="px-6">
            <div className="flex items-center gap-1 overflow-x-auto">
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
                    "flex items-center gap-2 border-b-2 px-4 py-3 text-sm font-medium transition-all",
                    activeTab === tab.id
                      ? "border-[#22D3EE] text-[#0891B2]"
                      : "border-transparent text-[#94A3B8] hover:text-[#475569]",
                  )}
                >
                  <tab.icon size={16} />
                  {tab.label}
                </button>
              ))}
            </div>
          </div>
        </header>

        <div className="p-6">
          {activeTab === "users" && (
            <div className="space-y-6">
              <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
                <StatCard title="Total Users" value={stats.totalUsers} change={12} changeLabel="vs last month" icon={Users} color="teal" delay={0} />
                <StatCard title="Active Users" value={stats.activeUsers} change={8} changeLabel="vs last month" icon={UserCheck} color="green" delay={0.08} />
                <StatCard title="Online Now" value={stats.onlineUsers} icon={Activity} color="blue" delay={0.16} />
                <StatCard title="Pending Invites" value={stats.pendingUsers} icon={Clock} color="gold" delay={0.24} />
              </div>

              <div className="flex flex-wrap items-center justify-between gap-4 rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4">
                <div className="flex flex-wrap items-center gap-3">
                  <Checkbox
                    checked={allVisibleSelected}
                    onCheckedChange={handleSelectAll}
                    className="border-[#22D3EE] data-[state=checked]:border-[#22D3EE] data-[state=checked]:bg-[#0891B2]"
                  />

                  <div className="relative w-full sm:w-auto">
                    <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                    <Input
                      value={searchTerm}
                      onChange={(event) => setSearchTerm(event.target.value)}
                      placeholder="Search users..."
                      className="h-10 w-full rounded-md border-[rgba(15,23,42,0.06)] pl-9 focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20 sm:w-64"
                    />
                  </div>

                  <AnimatePresence>
                    {selectedUsers.length > 0 && (
                      <motion.div
                        initial={{ opacity: 0, scale: 0.95 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.95 }}
                        className="flex items-center gap-2 rounded-md bg-[#0891B2]/10 px-3 py-1.5"
                      >
                        <span className="text-sm font-medium text-[#0891B2]">{selectedUsers.length} selected</span>
                        <div className="h-4 w-px bg-[#0891B2]/30" />
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="sm" className="h-7 rounded-md text-[#0891B2]">
                              Actions <ChevronDown size={14} className="ml-1" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="start" className="w-48 rounded-md">
                            <DropdownMenuItem onClick={() => handleBulkAction("activate")} className="rounded-md">
                              <UserCheck size={14} className="mr-2" />
                              Activate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkAction("deactivate")} className="rounded-md">
                              <UserX size={14} className="mr-2" />
                              Deactivate
                            </DropdownMenuItem>
                            <DropdownMenuItem onClick={() => handleBulkAction("suspend")} className="rounded-md">
                              <ShieldOff size={14} className="mr-2" />
                              Suspend
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem onClick={() => handleBulkAction("delete")} className="rounded-md text-red-600 focus:text-red-600">
                              <Trash2 size={14} className="mr-2" />
                              Delete
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                        <button onClick={() => setSelectedUsers([])} className="rounded-md p-1 hover:bg-[#0891B2]/20">
                          <X size={14} className="text-[#0891B2]" />
                        </button>
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>

                <div className="flex flex-wrap items-center gap-2">
                  <Select value={filterRole} onValueChange={setFilterRole}>
                    <SelectTrigger className="h-10 w-full rounded-md border-[rgba(15,23,42,0.06)] sm:w-36">
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
                    <SelectTrigger className="h-10 w-full rounded-md border-[rgba(15,23,42,0.06)] sm:w-36">
                      <SelectValue placeholder="Status" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Status</SelectItem>
                      {STATUS_OPTIONS.map((option) => (
                        <SelectItem key={option.value} value={option.value} className="rounded-md">
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <Select value={filterDepartment} onValueChange={setFilterDepartment}>
                    <SelectTrigger className="h-10 w-full rounded-md border-[rgba(15,23,42,0.06)] sm:w-44">
                      <SelectValue placeholder="Department" />
                    </SelectTrigger>
                    <SelectContent className="rounded-md">
                      <SelectItem value="all" className="rounded-md">All Departments</SelectItem>
                      {departments.map((department) => (
                        <SelectItem key={department.id} value={department.name} className="rounded-md">
                          {department.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <div className="hidden items-center rounded-md bg-[#F8FAFC] p-1 sm:flex">
                    <button
                      onClick={() => setViewMode("grid")}
                      className={cn(
                        "rounded-md p-2 transition-all",
                        viewMode === "grid" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#94A3B8] hover:text-[#475569]",
                      )}
                    >
                      <LayoutGrid size={18} />
                    </button>
                    <button
                      onClick={() => setViewMode("list")}
                      className={cn(
                        "rounded-md p-2 transition-all",
                        viewMode === "list" ? "bg-white text-[#0891B2] shadow-sm" : "text-[#94A3B8] hover:text-[#475569]",
                      )}
                    >
                      <List size={18} />
                    </button>
                  </div>

                  <Button variant="outline" onClick={() => void loadPageData()} className="rounded-md border-[rgba(15,23,42,0.06)]">
                    <RefreshCw size={16} className={loading ? "animate-spin" : ""} />
                  </Button>
                </div>
              </div>

              {loading ? (
                <div className="flex items-center justify-center py-20">
                  <RefreshCw size={32} className="animate-spin text-[#0891B2]" />
                </div>
              ) : isMobile || viewMode === "grid" ? (
                <div className="grid grid-cols-1 gap-6 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
                  <AnimatePresence>
                    {filteredUsers.map((user, index) => (
                      <UserCard
                        key={user.id}
                        user={user}
                        metrics={user.metrics}
                        isSelected={selectedUsers.includes(user.id)}
                        onSelect={() => handleSelectUser(user.id)}
                        onView={() => handleViewUser(user)}
                        onEdit={() => handleEditUser(user)}
                        onDelete={() => openDeleteDialog({ type: "user", id: user.id, name: user.fullName })}
                        onSendEmail={() => handleSendEmail(user)}
                        onResetPassword={() => void handleResetPassword(user)}
                        onStatusChange={(status) => void handleStatusChange(user.id, status)}
                        isMobile={isMobile}
                        delay={index * 0.04}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              ) : (
                <div className="overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)] bg-white">
                  <Table>
                    <TableHeader>
                      <TableRow className="bg-[#F8FAFC]">
                        <TableHead className="w-12">
                          <Checkbox
                            checked={allVisibleSelected}
                            onCheckedChange={handleSelectAll}
                            className="border-[#22D3EE] data-[state=checked]:border-[#22D3EE] data-[state=checked]:bg-[#0891B2]"
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
                          metrics={user.metrics}
                          isSelected={selectedUsers.includes(user.id)}
                          onSelect={() => handleSelectUser(user.id)}
                          onView={() => handleViewUser(user)}
                          onEdit={() => handleEditUser(user)}
                          onDelete={() => openDeleteDialog({ type: "user", id: user.id, name: user.fullName })}
                          onSendEmail={() => handleSendEmail(user)}
                          onResetPassword={() => void handleResetPassword(user)}
                          onStatusChange={(status) => void handleStatusChange(user.id, status)}
                        />
                      ))}
                    </TableBody>
                  </Table>
                </div>
              )}

              {!loading && filteredUsers.length === 0 && (
                <motion.div
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  className="flex flex-col items-center justify-center rounded-md border border-[rgba(15,23,42,0.06)] bg-white py-20"
                >
                  <div className="mb-4 flex h-20 w-20 items-center justify-center rounded-md bg-[#F8FAFC]">
                    <Users size={40} className="text-[#475569]" />
                  </div>
                  <h3 className="mb-2 text-lg font-semibold text-[#0F172A]">No users found</h3>
                  <p className="mb-6 text-center text-[#94A3B8]">
                    {searchTerm ? `No users match "${searchTerm}"` : "Add your first user to get started"}
                  </p>
                  <Button onClick={handleCreateUser} className="rounded-md bg-[#0891B2] text-white hover:bg-[#0891B2]/90">
                    <UserPlus size={16} className="mr-2" />
                    Add User
                  </Button>
                </motion.div>
              )}
            </div>
          )}

          {activeTab === "roles" && (
            <RolesSection
              roles={roles}
              onCreate={() => {
                setEditingRole(null);
                setShowRoleForm(true);
              }}
              onEdit={(role) => {
                setEditingRole(role);
                setShowRoleForm(true);
              }}
              onDuplicate={(role) => void handleDuplicateRole(role)}
              onDelete={(role) => openDeleteDialog({ type: "role", id: role.id, name: role.name })}
              isMobile={isMobile}
            />
          )}

          {activeTab === "departments" && (
            <DepartmentsSection
              departments={departments}
              onCreate={() => {
                setEditingDepartment(null);
                setShowDepartmentDialog(true);
              }}
              onEdit={(department) => {
                setEditingDepartment(department);
                setShowDepartmentDialog(true);
              }}
              onViewMembers={handleViewMembers}
              onDelete={(department) => openDeleteDialog({ type: "department", id: department.id, name: department.name })}
              isMobile={isMobile}
            />
          )}

          {activeTab === "activity" && (
            <ActivityLogSection
              logs={activityLogs}
              usersById={usersById}
              filterAction={activityFilter}
              onFilterChange={setActivityFilter}
              onExport={() => void handleExportAuditLogs()}
              isMobile={isMobile}
            />
          )}
        </div>
      </main>

      {isMobile && (
        <Button
          onClick={() => {
            if (activeTab === "users") {
              handleCreateUser();
              return;
            }
            if (activeTab === "roles") {
              setEditingRole(null);
              setShowRoleForm(true);
              return;
            }
            if (activeTab === "departments") {
              setEditingDepartment(null);
              setShowDepartmentDialog(true);
            }
          }}
          size="icon"
          className="fixed bottom-24 right-4 z-30 h-14 w-14 rounded-full bg-[#0891B2] text-white shadow-lg hover:bg-[#0891B2]/90 sm:hidden"
          aria-label="Create Team Item"
        >
          <Plus size={20} />
        </Button>
      )}

      <UserFormDialog
        isOpen={showUserForm}
        onClose={() => {
          setShowUserForm(false);
          setEditingUser(null);
        }}
        user={editingUser}
        roles={roles}
        departments={departments}
        onSubmit={handleSubmitUser}
      />

      <RoleFormDialog
        open={showRoleForm}
        role={editingRole}
        permissions={permissions}
        onClose={() => {
          setShowRoleForm(false);
          setEditingRole(null);
        }}
        onSubmit={handleRoleSubmit}
      />

      <AddDepartmentDialog
        open={showDepartmentDialog}
        onOpenChange={(open) => {
          setShowDepartmentDialog(open);
          if (!open) {
            setEditingDepartment(null);
          }
        }}
        employees={departmentDialogEmployees}
        editingDepartment={toDepartmentDialogEntity(editingDepartment)}
        onSubmit={handleDepartmentSubmit}
      />

      <UserProfileDialog
        isOpen={showUserProfile}
        onClose={() => {
          setShowUserProfile(false);
          setViewingUser(null);
        }}
        user={viewingUser}
        metrics={viewingUser ? userMetricsById.get(viewingUser.id) || { loginCount: 0, tasksCompleted: 0, projectsCount: 0 } : { loginCount: 0, tasksCompleted: 0, projectsCount: 0 }}
        role={viewingUserRole}
        userActivity={viewingUserActivity}
        onEdit={() => {
          setShowUserProfile(false);
          if (viewingUser) {
            handleEditUser(viewingUser);
          }
        }}
        onManagePermissions={handleManagePermissions}
        onChangeRole={() => {
          setShowUserProfile(false);
          if (viewingUser) {
            handleEditUser(viewingUser);
          }
        }}
      />

      <InviteUsersDialog
        isOpen={showInviteDialog}
        onClose={() => setShowInviteDialog(false)}
        roles={roles}
        onInvite={handleInviteUsers}
      />

      <AlertDialog open={Boolean(deleteTarget)} onOpenChange={(open) => !open && setDeleteTarget(null)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle className="text-[#0F172A]">
              Delete {deleteTarget?.type ? `${deleteTarget.type.charAt(0).toUpperCase()}${deleteTarget.type.slice(1)}` : "Item"}?
            </AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete <strong>{deleteTarget?.name}</strong>? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={() => void confirmDelete()} className="rounded-md bg-red-500 text-white hover:bg-red-600">
              <Trash2 size={16} className="mr-2" />
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
