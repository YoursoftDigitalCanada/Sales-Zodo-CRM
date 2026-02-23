// src/pages/Projects.tsx
import { useEffect, useState, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Sidebar } from "@/components/Sidebar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Checkbox } from "@/components/ui/checkbox";
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
  DropdownMenuCheckboxItem,
  DropdownMenuLabel,
} from "@/components/ui/dropdown-menu";
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
import { useToast } from "@/components/ui/use-toast";
import {
  Bell,
  Plus,
  Loader2,
  Eye,
  Pencil,
  Trash2,
  Search,
  User,
  Users,
  Building2,
  Briefcase,
  MoreHorizontal,
  MoreVertical,
  Filter,
  SlidersHorizontal,
  LayoutGrid,
  List,
  ChevronDown,
  ChevronLeft,
  ChevronRight,
  ChevronsLeft,
  ChevronsRight,
  Download,
  Upload,
  RefreshCw,
  X,
  Sparkles,
  ArrowUpDown,
  Copy,
  ExternalLink,
  Calendar,
  Star,
  StarOff,
  Clock,
  FileSpreadsheet,
  FileText,
  Columns,
  FolderOpen,
  FolderPlus,
  Target,
  TrendingUp,
  AlertCircle,
  CheckCircle2,
  PauseCircle,
  XCircle,
  PlayCircle,
  Timer,
  CalendarDays,
  BarChart3,
  PieChart,
  Activity,
  Zap,
  Archive,
  Share2,
  Settings,
  ArrowUp,
  ArrowDown,
  CircleDot,
  Flag,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { getProjects, deleteProjectById, createProject } from "@/features/projects";

// ============================================
// CONFIGURATION
// ============================================

// ============================================
// TYPES
// ============================================

interface Project {
  id: number;
  name: string;
  projectManager: string;
  description: string;
  progress: number;
  status: string;
  dueDate: string;
  startDate?: string;
  budget?: number;
  spent?: number;
  priority?: string;
  category?: string;
  clientName?: string;
  teamMembers?: { id: number; name: string; avatar?: string }[];
  isFavorite?: boolean;
  tasksCompleted?: number;
  totalTasks?: number;
  createdAt?: string;
}

interface ColumnConfig {
  key: string;
  label: string;
  visible: boolean;
  sortable: boolean;
}

interface User {
  firstName: string;
  lastName: string;
}

// ============================================
// CONSTANTS
// ============================================

const defaultColumns: ColumnConfig[] = [
  { key: "name", label: "Project", visible: true, sortable: true },
  { key: "clientName", label: "Client", visible: true, sortable: true },
  { key: "projectManager", label: "Manager", visible: true, sortable: true },
  { key: "status", label: "Status", visible: true, sortable: true },
  { key: "priority", label: "Priority", visible: true, sortable: true },
  { key: "progress", label: "Progress", visible: true, sortable: true },
  { key: "dueDate", label: "Due Date", visible: true, sortable: true },
];

const statusOptions = [
  { value: "all", label: "All Status", icon: CircleDot },
  { value: "not_started", label: "Not Started", icon: CircleDot, color: "slate" },
  { value: "planning", label: "Planning", icon: Target, color: "blue" },
  { value: "in_progress", label: "In Progress", icon: PlayCircle, color: "teal" },
  { value: "on_hold", label: "On Hold", icon: PauseCircle, color: "amber" },
  { value: "completed", label: "Completed", icon: CheckCircle2, color: "green" },
  { value: "cancelled", label: "Cancelled", icon: XCircle, color: "red" },
];

const priorityOptions = [
  { value: "all", label: "All Priority" },
  { value: "low", label: "Low", color: "slate" },
  { value: "medium", label: "Medium", color: "blue" },
  { value: "high", label: "High", color: "amber" },
  { value: "critical", label: "Critical", color: "red" },
];

// ============================================
// UTILITY FUNCTIONS
// ============================================

const getInitials = (name: string) => {
  if (!name) return "??";
  return name
    .split(" ")
    .map((n) => n[0])
    .join("")
    .toUpperCase()
    .slice(0, 2);
};

const getRelativeTime = (dateString?: string) => {
  if (!dateString) return "No date";
  const date = new Date(dateString);
  const now = new Date();
  const diffInDays = Math.floor(
    (date.getTime() - now.getTime()) / (1000 * 60 * 60 * 24)
  );

  if (diffInDays < 0) return `${Math.abs(diffInDays)} days overdue`;
  if (diffInDays === 0) return "Due today";
  if (diffInDays === 1) return "Due tomorrow";
  if (diffInDays < 7) return `${diffInDays} days left`;
  if (diffInDays < 30) return `${Math.floor(diffInDays / 7)} weeks left`;
  return `${Math.floor(diffInDays / 30)} months left`;
};

const isOverdue = (dateString?: string) => {
  if (!dateString) return false;
  return new Date(dateString) < new Date();
};

const getStatusConfig = (status: string) => {
  const configs: Record<string, { bg: string; text: string; dot: string; icon: React.ElementType }> = {
    not_started: { bg: "bg-white/5", text: "text-[#475569]", dot: "bg-slate-400", icon: CircleDot },
    planning: { bg: "bg-blue-100", text: "text-[#0891B2]", dot: "bg-[#0891B2]", icon: Target },
    in_progress: { bg: "bg-[#0891B2]/10", text: "text-[#0891B2]", dot: "bg-[#0891B2]", icon: PlayCircle },
    on_hold: { bg: "bg-amber-100", text: "text-amber-600", dot: "bg-amber-500", icon: PauseCircle },
    completed: { bg: "bg-green-100", text: "text-green-600", dot: "bg-green-500", icon: CheckCircle2 },
    cancelled: { bg: "bg-red-100", text: "text-red-600", dot: "bg-red-500", icon: XCircle },
  };
  return configs[status?.toLowerCase().replace(" ", "_")] || configs.not_started;
};

const getPriorityConfig = (priority: string) => {
  const configs: Record<string, { bg: string; text: string; border: string }> = {
    low: { bg: "bg-white/5", text: "text-[#475569]", border: "border-[rgba(15,23,42,0.06)]" },
    medium: { bg: "bg-blue-100", text: "text-[#0891B2]", border: "border-blue-200" },
    high: { bg: "bg-amber-100", text: "text-amber-600", border: "border-amber-200" },
    critical: { bg: "bg-red-100", text: "text-red-600", border: "border-red-200" },
  };
  return configs[priority?.toLowerCase()] || configs.medium;
};

const getProgressColor = (progress: number) => {
  if (progress < 25) return "bg-slate-400";
  if (progress < 50) return "bg-amber-500";
  if (progress < 75) return "bg-[#0891B2]";
  return "bg-[#0891B2]";
};

const formatCurrency = (amount?: number) => {
  if (!amount) return "$0";
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: 0,
    maximumFractionDigits: 0,
  }).format(amount);
};

// ============================================
// STAT CARD COMPONENT
// ============================================

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color,
  trend,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  icon: React.ElementType;
  color: "teal" | "gold" | "navy" | "purple" | "green" | "red";
  trend?: { value: number; positive: boolean };
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-green-500", light: "bg-green-500/10", text: "text-green-500" },
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
          <div className="flex items-baseline gap-2">
            <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
            {trend && (
              <span className={cn(
                "flex items-center text-xs font-semibold",
                trend.positive ? "text-green-600" : "text-red-600"
              )}>
                {trend.positive ? <ArrowUp size={12} /> : <ArrowDown size={12} />}
                {trend.value}%
              </span>
            )}
          </div>
          <p className="text-xs text-[#475569] mt-1">{subtitle}</p>
        </div>
        <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}>
          <Icon size={18} className={colors.text} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// PROJECT ROW COMPONENT
// ============================================

const ProjectRow = ({
  project,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
  onDuplicate,
  columns,
}: {
  project: Project;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
  onDuplicate: () => void;
  columns: ColumnConfig[];
}) => {
  const statusConfig = getStatusConfig(project.status);
  const priorityConfig = getPriorityConfig(project.priority || "medium");
  const overdue = isOverdue(project.dueDate) && project.status !== "completed";
  const StatusIcon = statusConfig.icon;

  return (
    <motion.tr
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      className={cn(
        "group hover:bg-[#F8FAFC]/80 transition-colors cursor-pointer border-b border-[rgba(15,23,42,0.06)] last:border-0",
        isSelected && "bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      {/* Checkbox */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <Checkbox
          checked={isSelected}
          onCheckedChange={onSelect}
          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
        />
      </td>

      {/* Favorite */}
      <td className="py-4 px-2" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleFavorite}
          className="p-1 rounded-md hover:bg-white/10 transition-colors"
        >
          {project.isFavorite ? (
            <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
          ) : (
            <StarOff size={16} className="text-[#475569] group-hover:text-[#475569]" />
          )}
        </button>
      </td>

      {/* Project Name */}
      {columns.find((c) => c.key === "name")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="relative">
              <div className="w-11 h-11 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                {getInitials(project.name)}
              </div>
              {project.progress === 100 && (
                <div className="absolute -top-1 -right-1 w-5 h-5 bg-green-500 rounded-full flex items-center justify-center">
                  <CheckCircle2 size={12} className="text-[#0F172A]" />
                </div>
              )}
            </div>
            <div>
              <div className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors flex items-center gap-2">
                {project.name}
                {project.category && (
                  <span className="px-1.5 py-0.5 rounded text-[10px] font-medium bg-white/5 text-[#94A3B8]">
                    {project.category}
                  </span>
                )}
              </div>
              {project.description && (
                <div className="text-xs text-[#475569] truncate max-w-[200px]">
                  {project.description}
                </div>
              )}
            </div>
          </div>
        </td>
      )}

      {/* Client */}
      {columns.find((c) => c.key === "clientName")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <Building2 size={14} className="text-[#475569]" />
            <span className="text-sm text-[#475569]">
              {project.clientName || "-"}
            </span>
          </div>
        </td>
      )}

      {/* Project Manager */}
      {columns.find((c) => c.key === "projectManager")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-md bg-[#F8FAFC]/10 flex items-center justify-center text-[#0F172A] text-xs font-semibold">
              {getInitials(project.projectManager)}
            </div>
            <span className="text-sm text-[#475569]">
              {project.projectManager || "-"}
            </span>
          </div>
        </td>
      )}

      {/* Status */}
      {columns.find((c) => c.key === "status")?.visible && (
        <td className="py-4 px-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
            statusConfig.bg,
            statusConfig.text
          )}>
            <StatusIcon size={12} />
            {project.status}
          </span>
        </td>
      )}

      {/* Priority */}
      {columns.find((c) => c.key === "priority")?.visible && (
        <td className="py-4 px-4">
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
            priorityConfig.bg,
            priorityConfig.text,
            priorityConfig.border
          )}>
            <Flag size={10} />
            {project.priority || "Medium"}
          </span>
        </td>
      )}

      {/* Progress */}
      {columns.find((c) => c.key === "progress")?.visible && (
        <td className="py-4 px-4">
          <div className="flex items-center gap-3">
            <div className="flex-1 min-w-[80px]">
              <div className="h-2 bg-white/5 rounded-full overflow-hidden">
                <motion.div
                  initial={{ width: 0 }}
                  animate={{ width: `${project.progress}%` }}
                  transition={{ duration: 0.5, ease: "easeOut" }}
                  className={cn("h-full rounded-full", getProgressColor(project.progress))}
                />
              </div>
            </div>
            <span className={cn(
              "text-xs font-semibold min-w-[36px]",
              project.progress >= 75 ? "text-[#0891B2]" : "text-[#94A3B8]"
            )}>
              {project.progress}%
            </span>
          </div>
        </td>
      )}

      {/* Due Date */}
      {columns.find((c) => c.key === "dueDate")?.visible && (
        <td className="py-4 px-4">
          {project.dueDate && !isNaN(new Date(project.dueDate).getTime()) ? (
            <div className={cn(
              "flex items-center gap-2 text-sm",
              overdue ? "text-red-600" : "text-[#475569]"
            )}>
              <CalendarDays size={14} className={overdue ? "text-red-400" : "text-[#475569]"} />
              <div>
                <div>{new Date(project.dueDate).toLocaleDateString()}</div>
                <div className={cn(
                  "text-xs",
                  overdue ? "text-red-500 font-semibold" : "text-[#475569]"
                )}>
                  {getRelativeTime(project.dueDate)}
                </div>
              </div>
              {overdue && (
                <span className="px-1.5 py-0.5 rounded bg-red-100 text-red-600 text-[10px] font-semibold">
                  OVERDUE
                </span>
              )}
            </div>
          ) : (
            <span className="text-sm text-[#94A3B8]">No date</span>
          )}
        </td>
      )}

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onView}
            className="p-2 rounded-md hover:bg-[#0891B2]/10 text-[#0891B2] transition-colors"
            title="View Project"
          >
            <Eye size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="p-2 rounded-md hover:bg-white/10 text-[#94A3B8] transition-colors"
            title="Edit Project"
          >
            <Pencil size={16} />
          </motion.button>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors">
                <MoreVertical size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem onClick={onView} className="rounded-md">
                <Eye size={14} className="mr-2" />
                View Details
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onEdit} className="rounded-md">
                <Pencil size={14} className="mr-2" />
                Edit Project
              </DropdownMenuItem>
              <DropdownMenuItem onClick={onDuplicate} className="rounded-md">
                <Copy size={14} className="mr-2" />
                Duplicate
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md">
                <Share2 size={14} className="mr-2" />
                Share
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md">
                <Archive size={14} className="mr-2" />
                Archive
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem
                className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50"
                onClick={onDelete}
              >
                <Trash2 size={14} className="mr-2" />
                Delete
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// PROJECT CARD COMPONENT (Grid View)
// ============================================

const ProjectCard = ({
  project,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
  onToggleFavorite,
}: {
  project: Project;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onToggleFavorite: () => void;
}) => {
  const statusConfig = getStatusConfig(project.status);
  const priorityConfig = getPriorityConfig(project.priority || "medium");
  const overdue = isOverdue(project.dueDate) && project.status !== "completed";
  const StatusIcon = statusConfig.icon;

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      {/* Progress Bar Top */}
      <div className="h-1 bg-white/5">
        <motion.div
          initial={{ width: 0 }}
          animate={{ width: `${project.progress}%` }}
          className={cn("h-full", getProgressColor(project.progress))}
        />
      </div>

      <div className="p-5">
        {/* Header */}
        <div className="flex items-start justify-between mb-4">
          <div className="flex items-center gap-3">
            <Checkbox
              checked={isSelected}
              onCheckedChange={onSelect}
              onClick={(e) => e.stopPropagation()}
              className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
            />
            <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-bold text-sm">
              {getInitials(project.name)}
            </div>
          </div>

          <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
            <button
              onClick={onToggleFavorite}
              className="p-1.5 rounded-md hover:bg-white/10 transition-colors"
            >
              {project.isFavorite ? (
                <Star size={16} className="text-[#D97706] fill-[#FBBF24]" />
              ) : (
                <StarOff size={16} className="text-[#475569]" />
              )}
            </button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="p-1.5 rounded-md hover:bg-white/10 text-[#475569]">
                  <MoreHorizontal size={16} />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 rounded-md">
                <DropdownMenuItem onClick={onView} className="rounded-md">
                  <Eye size={14} className="mr-2" />
                  View Details
                </DropdownMenuItem>
                <DropdownMenuItem onClick={onEdit} className="rounded-md">
                  <Pencil size={14} className="mr-2" />
                  Edit
                </DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem
                  className="rounded-md text-red-600"
                  onClick={onDelete}
                >
                  <Trash2 size={14} className="mr-2" />
                  Delete
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </div>

        {/* Project Info */}
        <div className="mb-4">
          <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors mb-1 line-clamp-1">
            {project.name}
          </h3>
          {project.description && (
            <p className="text-sm text-[#94A3B8] line-clamp-2 mb-2">
              {project.description}
            </p>
          )}
          {project.clientName && (
            <div className="flex items-center gap-2 text-xs text-[#475569]">
              <Building2 size={12} />
              {project.clientName}
            </div>
          )}
        </div>

        {/* Status & Priority */}
        <div className="flex items-center gap-2 mb-4">
          <span className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded-full text-xs font-semibold",
            statusConfig.bg,
            statusConfig.text
          )}>
            <StatusIcon size={10} />
            {project.status}
          </span>
          <span className={cn(
            "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium border",
            priorityConfig.bg,
            priorityConfig.text,
            priorityConfig.border
          )}>
            <Flag size={8} />
            {project.priority || "Medium"}
          </span>
        </div>

        {/* Progress */}
        <div className="mb-4">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[#94A3B8]">Progress</span>
            <span className={cn(
              "font-semibold",
              project.progress >= 75 ? "text-[#0891B2]" : "text-[#475569]"
            )}>
              {project.progress}%
            </span>
          </div>
          <div className="h-2 bg-white/5 rounded-full overflow-hidden">
            <motion.div
              initial={{ width: 0 }}
              animate={{ width: `${project.progress}%` }}
              className={cn("h-full rounded-full", getProgressColor(project.progress))}
            />
          </div>
        </div>

        {/* Footer */}
        <div className="flex items-center justify-between pt-4 border-t border-[rgba(15,23,42,0.06)]">
          <div className="flex items-center gap-2">
            <div className="w-6 h-6 rounded-md bg-[#F8FAFC]/10 flex items-center justify-center text-[#0F172A] text-[10px] font-semibold">
              {getInitials(project.projectManager)}
            </div>
            <span className="text-xs text-[#94A3B8]">{project.projectManager}</span>
          </div>
          <div className={cn(
            "flex items-center gap-1 text-xs",
            overdue ? "text-red-600" : "text-[#475569]"
          )}>
            <CalendarDays size={12} />
            <span>{getRelativeTime(project.dueDate)}</span>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// EMPTY STATE COMPONENT
// ============================================

const EmptyState = ({ onAdd }: { onAdd: () => void }) => (
  <motion.div
    initial={{ opacity: 0, y: 20 }}
    animate={{ opacity: 1, y: 0 }}
    className="flex flex-col items-center justify-center py-16 px-4"
  >
    <div className="w-20 h-20 rounded-md bg-[#F1F5F9] flex items-center justify-center mb-6">
      <FolderOpen size={40} className="text-[#0891B2]" />
    </div>
    <h3 className="text-xl font-semibold text-[#0F172A] mb-2">No projects yet</h3>
    <p className="text-[#94A3B8] text-center max-w-sm mb-6">
      Get started by creating your first project. Track progress, manage teams, and deliver on time.
    </p>
    <Button
      onClick={onAdd}
      className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md "
    >
      <Plus size={18} className="mr-2" />
      Create Your First Project
    </Button>
  </motion.div>
);

// ============================================
// MAIN COMPONENT
// ============================================

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();

  // State
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"table" | "grid">("table");
  const [selectedProjects, setSelectedProjects] = useState<number[]>([]);
  const [columns, setColumns] = useState<ColumnConfig[]>(defaultColumns);
  const [sortConfig, setSortConfig] = useState<{ key: string; direction: "asc" | "desc" } | null>(null);
  const [filterStatus, setFilterStatus] = useState("all");
  const [filterPriority, setFilterPriority] = useState("all");
  const [currentPage, setCurrentPage] = useState(1);
  const [pageSize, setPageSize] = useState(10);
  const [user, setUser] = useState<User | null>(null);

  // Dialog State
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // ============================================
  // EFFECTS
  // ============================================

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

  useEffect(() => {
    fetchProjects();
  }, []);

  // ============================================
  // API CALLS
  // ============================================

  const fetchProjects = async () => {
    setIsLoading(true);
    try {
      const data = await getProjects();
      const mapped = (data || []).map((p: any, index: number) => ({
        id: p.id ?? p.Id ?? index,
        name: p.name ?? p.Name ?? "Untitled Project",
        projectManager: p.teamMembers?.[0]
          ? `${p.teamMembers[0].employee?.user?.firstName || ""} ${p.teamMembers[0].employee?.user?.lastName || ""}`.trim()
          : (p.projectManager ?? p.ProjectManager ?? ""),
        description: p.description ?? p.Description ?? "",
        progress: p.progress ?? p.Progress ?? 0,
        status: p.status ?? p.Status ?? "PLANNING",
        dueDate: p.endDate ?? p.dueDate ?? p.DueDate ?? "",
        startDate: p.startDate ?? p.StartDate,
        budget: p.budget ? Number(p.budget) : (p.Budget ? Number(p.Budget) : undefined),
        spent: p.spent ?? p.Spent,
        priority: p.priority ?? p.Priority ?? "Medium",
        category: p.category ?? p.Category,
        clientName: p.client?.clientName ?? p.clientName ?? p.ClientName ?? "",
        isFavorite: false,
        tasksCompleted: p.tasksCompleted ?? 0,
        totalTasks: p.totalTasks ?? p.tasksCount ?? 0,
      }));
      setProjects(mapped);
    } catch (err) {
      console.error("Failed to fetch projects", err);
      toast({
        title: "Error",
        description: "Failed to load projects",
        variant: "destructive",
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleDeleteProject = async () => {
    if (!projectToDelete) return;
    setIsDeleting(true);
    try {
      await deleteProjectById(projectToDelete.id);
      setProjects((prev) => prev.filter((p) => p.id !== projectToDelete.id));
      toast({
        title: "Deleted",
        description: `"${projectToDelete.name}" has been deleted.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete project",
        variant: "destructive",
      });
    } finally {
      setIsDeleting(false);
      setDeleteDialogOpen(false);
      setProjectToDelete(null);
    }
  };

  const handleBulkDelete = async () => {
    if (selectedProjects.length === 0) return;

    try {
      await Promise.all(selectedProjects.map((id) => deleteProjectById(id)));
      setProjects((prev) => prev.filter((p) => !selectedProjects.includes(p.id)));
      toast({
        title: "Deleted",
        description: `${selectedProjects.length} projects have been deleted.`,
      });
      setSelectedProjects([]);
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to delete projects",
        variant: "destructive",
      });
    }
  };

  // ============================================
  // FILTERING & SORTING
  // ============================================

  const filteredProjects = useMemo(() => {
    let result = [...projects];

    // Search
    if (searchTerm) {
      const term = searchTerm.toLowerCase();
      result = result.filter(
        (p) =>
          p.name.toLowerCase().includes(term) ||
          p.projectManager?.toLowerCase().includes(term) ||
          p.clientName?.toLowerCase().includes(term) ||
          p.description?.toLowerCase().includes(term)
      );
    }

    // Status Filter
    if (filterStatus !== "all") {
      result = result.filter(
        (p) => p.status.toLowerCase().replace(" ", "_") === filterStatus
      );
    }

    // Priority Filter
    if (filterPriority !== "all") {
      result = result.filter(
        (p) => p.priority?.toLowerCase() === filterPriority
      );
    }

    // Sorting
    if (sortConfig) {
      result.sort((a, b) => {
        let aVal = a[sortConfig.key as keyof Project];
        let bVal = b[sortConfig.key as keyof Project];

        if (sortConfig.key === "dueDate") {
          aVal = new Date(aVal as string).getTime();
          bVal = new Date(bVal as string).getTime();
        }

        if (typeof aVal === "number" && typeof bVal === "number") {
          return sortConfig.direction === "asc" ? aVal - bVal : bVal - aVal;
        }

        return sortConfig.direction === "asc"
          ? String(aVal || "").localeCompare(String(bVal || ""))
          : String(bVal || "").localeCompare(String(aVal || ""));
      });
    }

    return result;
  }, [projects, searchTerm, filterStatus, filterPriority, sortConfig]);

  // Pagination
  const totalPages = Math.ceil(filteredProjects.length / pageSize);
  const paginatedProjects = filteredProjects.slice(
    (currentPage - 1) * pageSize,
    currentPage * pageSize
  );

  // Stats
  const stats = useMemo(() => {
    const total = projects.length;
    const inProgress = projects.filter((p) =>
      p.status.toLowerCase().includes("progress")
    ).length;
    const completed = projects.filter((p) =>
      p.status.toLowerCase() === "completed"
    ).length;
    const overdue = projects.filter((p) =>
      isOverdue(p.dueDate) && p.status.toLowerCase() !== "completed"
    ).length;
    const avgProgress = total > 0
      ? Math.round(projects.reduce((acc, p) => acc + p.progress, 0) / total)
      : 0;

    return { total, inProgress, completed, overdue, avgProgress };
  }, [projects]);

  // ============================================
  // HANDLERS
  // ============================================

  const handleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(paginatedProjects.map((p) => p.id));
    } else {
      setSelectedProjects([]);
    }
  };

  const handleSelectProject = (id: number, checked: boolean) => {
    if (checked) {
      setSelectedProjects((prev) => [...prev, id]);
    } else {
      setSelectedProjects((prev) => prev.filter((p) => p !== id));
    }
  };

  const handleSort = (key: string) => {
    setSortConfig((prev) => {
      if (prev?.key === key) {
        return { key, direction: prev.direction === "asc" ? "desc" : "asc" };
      }
      return { key, direction: "asc" };
    });
  };

  const handleToggleFavorite = (id: number) => {
    setProjects((prev) =>
      prev.map((p) =>
        p.id === id ? { ...p, isFavorite: !p.isFavorite } : p
      )
    );
  };

  const handleDuplicate = async (project: Project) => {
    try {
      const duplicateData = {
        projectTitle: `${project.name} (Copy)`,
        description: project.description || "",
        status: "NOT_STARTED",
        priority: project.priority?.toUpperCase() || "MEDIUM",
        budget: project.budget || 0,
        startDate: project.startDate ? new Date(project.startDate).toISOString() : null,
        dueDate: project.dueDate ? new Date(project.dueDate).toISOString() : null,
      };
      const result = await createProject(duplicateData);
      const newProject = {
        ...project,
        id: result.id || result.Id || Date.now(),
        name: `${project.name} (Copy)`,
        progress: 0,
        status: "Not Started",
        isFavorite: false,
      };
      setProjects((prev) => [newProject, ...prev]);
      toast({
        title: "Duplicated",
        description: `Project "${project.name}" has been duplicated.`,
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to duplicate project",
        variant: "destructive",
      });
    }
  };

  const handleExport = () => {
    const data = filteredProjects.map((p) => ({
      Name: p.name,
      Manager: p.projectManager,
      Client: p.clientName,
      Status: p.status,
      Priority: p.priority,
      Progress: `${p.progress}%`,
      DueDate: p.dueDate,
    }));

    const csv = [
      Object.keys(data[0]).join(","),
      ...data.map((row) => Object.values(row).join(",")),
    ].join("\n");

    const blob = new Blob([csv], { type: "text/csv" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = "projects.csv";
    a.click();

    toast({
      title: "Exported",
      description: "Projects exported to CSV successfully.",
    });
  };

  const toggleColumn = (key: string) => {
    setColumns((prev) =>
      prev.map((col) =>
        col.key === key ? { ...col, visible: !col.visible } : col
      )
    );
  };

  // ============================================
  // RENDER
  // ============================================

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar collapsed={sidebarCollapsed} onCollapse={setSidebarCollapsed} />

      <main
        className={cn(
          "flex-1 transition-all duration-300",
          sidebarCollapsed ? "ml-0" : "ml-30"
        )}
      >
        {/* ============================================ */}
        {/* HEADER */}
        {/* ============================================ */}
        <header className="sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-2 text-sm">
              <span className="text-[#475569]">Dashboard</span>
              <ChevronRight size={16} className="text-[#475569]" />
              <span className="font-medium text-[#0F172A]">Projects</span>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                className="relative p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"
              >
                <Bell size={20} />
                <span className="absolute top-1.5 right-1.5 w-2 h-2 bg-[#0891B2] rounded-full" />
              </motion.button>

              <div className="flex items-center gap-3 pl-3 border-l border-[rgba(15,23,42,0.06)]">
                <div className="w-9 h-9 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0F172A] font-semibold text-sm">
                  {user ? getInitials(`${user.firstName} ${user.lastName}`) : "?"}
                </div>
              </div>
            </div>
          </div>
        </header>

        {/* ============================================ */}
        {/* CONTENT */}
        {/* ============================================ */}
        <div className="p-6 space-y-6">
          {/* Page Title */}
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="flex items-center justify-between"
          >
            <div className="flex items-center gap-4">
              <div className="w-12 h-12 rounded-md bg-[#F1F5F9] flex items-center justify-center ">
                <Briefcase size={24} className="text-[#0F172A]" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-[#0F172A]">Projects</h1>
                <p className="text-[#94A3B8]">
                  Manage and track all your projects
                </p>
              </div>
            </div>

            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={fetchProjects}
                className="p-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
              >
                <RefreshCw size={18} />
              </motion.button>

              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={handleExport}
                className="flex items-center gap-2 px-4 py-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors"
              >
                <Download size={18} />
                <span className="font-medium">Export</span>
              </motion.button>

              <Button
                onClick={() => navigate("/projects/add")}
                className="bg-[#F1F5F9]/90 hover:from-[#22D3EE]/90 hover:to-[#22D3EE] text-[#0F172A] rounded-md  px-5"
              >
                <Plus size={18} className="mr-2" />
                New Project
              </Button>
            </div>
          </motion.div>

          {/* Stats Cards */}
          <div className="grid grid-cols-5 gap-4">
            <StatCard
              title="Total Projects"
              value={stats.total}
              subtitle="All time"
              icon={Briefcase}
              color="teal"
              delay={0}
            />
            <StatCard
              title="In Progress"
              value={stats.inProgress}
              subtitle={`${Math.round((stats.inProgress / stats.total) * 100) || 0}% of total`}
              icon={PlayCircle}
              color="gold"
              delay={0.1}
            />
            <StatCard
              title="Completed"
              value={stats.completed}
              subtitle={`${Math.round((stats.completed / stats.total) * 100) || 0}% completion rate`}
              icon={CheckCircle2}
              color="green"
              delay={0.2}
            />
            <StatCard
              title="Overdue"
              value={stats.overdue}
              subtitle="Need attention"
              icon={AlertCircle}
              color="red"
              delay={0.3}
            />
            <StatCard
              title="Avg Progress"
              value={`${stats.avgProgress}%`}
              subtitle="Across all projects"
              icon={TrendingUp}
              color="purple"
              delay={0.4}
            />
          </div>

          {/* Filters & Actions Bar */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4"
          >
            <div className="flex items-center justify-between gap-4">
              {/* Left Side - Search & Filters */}
              <div className="flex items-center gap-3 flex-1">
                {/* Search */}
                <div className="relative max-w-md flex-1">
                  <Search
                    size={18}
                    className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]"
                  />
                  <Input
                    value={searchTerm}
                    onChange={(e) => setSearchTerm(e.target.value)}
                    placeholder="Search projects..."
                    className="h-11 pl-10 rounded-md border-[rgba(15,23,42,0.06)] focus:border-[#22D3EE] focus:ring-2 focus:ring-[#22D3EE]/20"
                  />
                  {searchTerm && (
                    <button
                      onClick={() => setSearchTerm("")}
                      className="absolute right-3 top-1/2 -translate-y-1/2 text-[#475569] hover:text-[#475569]"
                    >
                      <X size={16} />
                    </button>
                  )}
                </div>

                {/* Status Filter */}
                <Select value={filterStatus} onValueChange={setFilterStatus}>
                  <SelectTrigger className="h-11 w-[160px] rounded-md border-[rgba(15,23,42,0.06)]">
                    <SelectValue placeholder="Status" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {statusOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="rounded-md"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Priority Filter */}
                <Select value={filterPriority} onValueChange={setFilterPriority}>
                  <SelectTrigger className="h-11 w-[160px] rounded-md border-[rgba(15,23,42,0.06)]">
                    <SelectValue placeholder="Priority" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    {priorityOptions.map((opt) => (
                      <SelectItem
                        key={opt.value}
                        value={opt.value}
                        className="rounded-md"
                      >
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>

                {/* Clear Filters */}
                {(filterStatus !== "all" || filterPriority !== "all" || searchTerm) && (
                  <motion.button
                    initial={{ opacity: 0, scale: 0.8 }}
                    animate={{ opacity: 1, scale: 1 }}
                    onClick={() => {
                      setSearchTerm("");
                      setFilterStatus("all");
                      setFilterPriority("all");
                    }}
                    className="flex items-center gap-1.5 px-3 py-2 rounded-md text-sm text-[#94A3B8] hover:text-[#0891B2] hover:bg-[#0891B2]/5 transition-colors"
                  >
                    <X size={14} />
                    Clear
                  </motion.button>
                )}
              </div>

              {/* Right Side - View & Column Toggles */}
              <div className="flex items-center gap-2">
                {/* Bulk Actions */}
                <AnimatePresence>
                  {selectedProjects.length > 0 && (
                    <motion.div
                      initial={{ opacity: 0, x: 20 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 20 }}
                      className="flex items-center gap-2 pr-3 mr-3 border-r border-[rgba(15,23,42,0.06)]"
                    >
                      <span className="text-sm text-[#94A3B8]">
                        {selectedProjects.length} selected
                      </span>
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={handleBulkDelete}
                        className="h-9 rounded-md border-red-200 text-red-600 hover:bg-red-50"
                      >
                        <Trash2 size={14} className="mr-1" />
                        Delete
                      </Button>
                    </motion.div>
                  )}
                </AnimatePresence>

                {/* Column Toggle */}
                <DropdownMenu>
                  <DropdownMenuTrigger asChild>
                    <button className="p-2.5 rounded-md border border-[rgba(15,23,42,0.06)] hover:bg-[#F8FAFC] text-[#475569] transition-colors">
                      <Columns size={18} />
                    </button>
                  </DropdownMenuTrigger>
                  <DropdownMenuContent align="end" className="w-48 rounded-md">
                    <DropdownMenuLabel className="text-xs text-[#475569] font-medium">
                      Toggle Columns
                    </DropdownMenuLabel>
                    {columns.map((col) => (
                      <DropdownMenuCheckboxItem
                        key={col.key}
                        checked={col.visible}
                        onCheckedChange={() => toggleColumn(col.key)}
                        className="rounded-md"
                      >
                        {col.label}
                      </DropdownMenuCheckboxItem>
                    ))}
                  </DropdownMenuContent>
                </DropdownMenu>

                {/* View Toggle */}
                <div className="flex items-center p-1 bg-white/5 rounded-md">
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "p-2 rounded-md transition-all",
                      viewMode === "table"
                        ? "bg-white text-[#0891B2] shadow-sm"
                        : "text-[#94A3B8] hover:text-slate-200"
                    )}
                  >
                    <List size={18} />
                  </button>
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
                </div>
              </div>
            </div>
          </motion.div>

          {/* Content */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.3 }}
            className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
          >
            {isLoading ? (
              <div className="flex flex-col items-center justify-center py-20">
                <Loader2 size={40} className="animate-spin text-[#0891B2] mb-4" />
                <p className="text-[#94A3B8]">Loading projects...</p>
              </div>
            ) : filteredProjects.length === 0 ? (
              <EmptyState onAdd={() => navigate("/projects/add")} />
            ) : viewMode === "table" ? (
              <>
                {/* Table View */}
                <div className="overflow-x-auto">
                  <table className="w-full">
                    <thead>
                      <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/50">
                        <th className="py-4 px-4 text-left">
                          <Checkbox
                            checked={
                              selectedProjects.length === paginatedProjects.length &&
                              paginatedProjects.length > 0
                            }
                            onCheckedChange={handleSelectAll}
                            className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                          />
                        </th>
                        <th className="py-4 px-2 text-left w-10"></th>
                        {columns.filter((c) => c.visible).map((col) => (
                          <th
                            key={col.key}
                            className="py-4 px-4 text-left text-xs font-semibold text-[#94A3B8] uppercase tracking-wider"
                          >
                            {col.sortable ? (
                              <button
                                onClick={() => handleSort(col.key)}
                                className="flex items-center gap-1.5 hover:text-[#0891B2] transition-colors"
                              >
                                {col.label}
                                <ArrowUpDown
                                  size={14}
                                  className={cn(
                                    sortConfig?.key === col.key
                                      ? "text-[#0891B2]"
                                      : "text-[#475569]"
                                  )}
                                />
                              </button>
                            ) : (
                              col.label
                            )}
                          </th>
                        ))}
                        <th className="py-4 px-4 text-right text-xs font-semibold text-[#94A3B8] uppercase tracking-wider">
                          Actions
                        </th>
                      </tr>
                    </thead>
                    <tbody>
                      <AnimatePresence>
                        {paginatedProjects.map((project) => (
                          <ProjectRow
                            key={project.id}
                            project={project}
                            isSelected={selectedProjects.includes(project.id)}
                            onSelect={(checked) => handleSelectProject(project.id, checked)}
                            onView={() => navigate(`/projects/${project.id}`)}
                            onEdit={() => navigate(`/projects/${project.id}/edit`)}
                            onDelete={() => {
                              setProjectToDelete(project);
                              setDeleteDialogOpen(true);
                            }}
                            onToggleFavorite={() => handleToggleFavorite(project.id)}
                            onDuplicate={() => handleDuplicate(project)}
                            columns={columns}
                          />
                        ))}
                      </AnimatePresence>
                    </tbody>
                  </table>
                </div>

                {/* Pagination */}
                <div className="flex items-center justify-between px-6 py-4 border-t border-[rgba(15,23,42,0.06)]">
                  <div className="flex items-center gap-2 text-sm text-[#94A3B8]">
                    <span>
                      Showing {((currentPage - 1) * pageSize) + 1} to{" "}
                      {Math.min(currentPage * pageSize, filteredProjects.length)} of{" "}
                      {filteredProjects.length}
                    </span>
                    <Select
                      value={String(pageSize)}
                      onValueChange={(v) => {
                        setPageSize(Number(v));
                        setCurrentPage(1);
                      }}
                    >
                      <SelectTrigger className="h-8 w-[70px] rounded-md text-xs">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="rounded-md">
                        {[10, 20, 50, 100].map((size) => (
                          <SelectItem key={size} value={String(size)} className="rounded-md">
                            {size}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                    <span>per page</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(1)}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0 rounded-md"
                    >
                      <ChevronsLeft size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                      disabled={currentPage === 1}
                      className="h-9 w-9 p-0 rounded-md"
                    >
                      <ChevronLeft size={16} />
                    </Button>

                    {/* Page Numbers */}
                    <div className="flex items-center gap-1 mx-2">
                      {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                        let pageNum;
                        if (totalPages <= 5) {
                          pageNum = i + 1;
                        } else if (currentPage <= 3) {
                          pageNum = i + 1;
                        } else if (currentPage >= totalPages - 2) {
                          pageNum = totalPages - 4 + i;
                        } else {
                          pageNum = currentPage - 2 + i;
                        }
                        return (
                          <button
                            key={pageNum}
                            onClick={() => setCurrentPage(pageNum)}
                            className={cn(
                              "h-9 w-9 rounded-md text-sm font-medium transition-all",
                              currentPage === pageNum
                                ? "bg-[#0891B2] text-white "
                                : "text-[#475569] hover:bg-white/10"
                            )}
                          >
                            {pageNum}
                          </button>
                        );
                      })}
                    </div>

                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0 rounded-md"
                    >
                      <ChevronRight size={16} />
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => setCurrentPage(totalPages)}
                      disabled={currentPage === totalPages}
                      className="h-9 w-9 p-0 rounded-md"
                    >
                      <ChevronsRight size={16} />
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              /* Grid View */
              <div className="p-6">
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-5">
                  <AnimatePresence>
                    {paginatedProjects.map((project, index) => (
                      <motion.div
                        key={project.id}
                        initial={{ opacity: 0, y: 20 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: index * 0.05 }}
                      >
                        <ProjectCard
                          project={project}
                          isSelected={selectedProjects.includes(project.id)}
                          onSelect={(checked) => handleSelectProject(project.id, checked)}
                          onView={() => navigate(`/projects/${project.id}`)}
                          onEdit={() => navigate(`/projects/${project.id}/edit`)}
                          onDelete={() => {
                            setProjectToDelete(project);
                            setDeleteDialogOpen(true);
                          }}
                          onToggleFavorite={() => handleToggleFavorite(project.id)}
                        />
                      </motion.div>
                    ))}
                  </AnimatePresence>
                </div>

                {/* Grid Pagination */}
                <div className="flex items-center justify-center gap-2 mt-8">
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                    disabled={currentPage === 1}
                    className="rounded-md"
                  >
                    <ChevronLeft size={16} className="mr-1" />
                    Previous
                  </Button>

                  <div className="flex items-center gap-1 mx-4">
                    {Array.from({ length: Math.min(5, totalPages) }, (_, i) => {
                      let pageNum;
                      if (totalPages <= 5) {
                        pageNum = i + 1;
                      } else if (currentPage <= 3) {
                        pageNum = i + 1;
                      } else if (currentPage >= totalPages - 2) {
                        pageNum = totalPages - 4 + i;
                      } else {
                        pageNum = currentPage - 2 + i;
                      }
                      return (
                        <button
                          key={pageNum}
                          onClick={() => setCurrentPage(pageNum)}
                          className={cn(
                            "h-9 w-9 rounded-md text-sm font-medium transition-all",
                            currentPage === pageNum
                              ? "bg-[#0891B2] text-white "
                              : "text-[#475569] hover:bg-white/10"
                          )}
                        >
                          {pageNum}
                        </button>
                      );
                    })}
                  </div>

                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                    disabled={currentPage === totalPages}
                    className="rounded-md"
                  >
                    Next
                    <ChevronRight size={16} className="ml-1" />
                  </Button>
                </div>
              </div>
            )}
          </motion.div>

          {/* Quick Stats Footer */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.4 }}
            className="grid grid-cols-4 gap-4"
          >
            {/* Status Distribution */}
            <div className="col-span-2 bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">Status Distribution</h3>
                <PieChart size={18} className="text-[#475569]" />
              </div>
              <div className="space-y-3">
                {statusOptions.slice(1).map((status) => {
                  const count = projects.filter(
                    (p) => p.status.toLowerCase().replace(" ", "_") === status.value
                  ).length;
                  const percentage = projects.length > 0 ? (count / projects.length) * 100 : 0;
                  const config = getStatusConfig(status.value);

                  return (
                    <div key={status.value} className="flex items-center gap-3">
                      <div className={cn("w-3 h-3 rounded-full", config.dot)} />
                      <span className="text-sm text-[#475569] flex-1">{status.label}</span>
                      <span className="text-sm font-semibold text-[#0F172A]">{count}</span>
                      <div className="w-24 h-2 bg-white/5 rounded-full overflow-hidden">
                        <motion.div
                          initial={{ width: 0 }}
                          animate={{ width: `${percentage}%` }}
                          className={cn("h-full rounded-full", config.dot)}
                        />
                      </div>
                      <span className="text-xs text-[#475569] w-10 text-right">
                        {percentage.toFixed(0)}%
                      </span>
                    </div>
                  );
                })}
              </div>
            </div>

            {/* Recent Activity */}
            <div className="col-span-2 bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
              <div className="flex items-center justify-between mb-4">
                <h3 className="font-semibold text-[#0F172A]">Recent Activity</h3>
                <Activity size={18} className="text-[#475569]" />
              </div>
              <div className="space-y-3">
                {projects.slice(0, 5).map((project, index) => (
                  <motion.div
                    key={project.id}
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    transition={{ delay: index * 0.1 }}
                    className="flex items-center gap-3 p-2 rounded-md hover:bg-[#F8FAFC] cursor-pointer transition-colors"
                    onClick={() => navigate(`/projects/${project.id}`)}
                  >
                    <div className="w-8 h-8 rounded-md bg-[#F1F5F9] flex items-center justify-center text-[#0891B2] text-xs font-semibold">
                      {getInitials(project.name)}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium text-[#0F172A] truncate">
                        {project.name}
                      </p>
                      <p className="text-xs text-[#475569]">
                        Progress updated to {project.progress}%
                      </p>
                    </div>
                    <span className="text-xs text-[#475569]">Just now</span>
                  </motion.div>
                ))}
              </div>
            </div>
          </motion.div>
        </div>

        {/* ============================================ */}
        {/* DELETE CONFIRMATION DIALOG */}
        {/* ============================================ */}
        <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
          <AlertDialogContent className="rounded-md">
            <AlertDialogHeader>
              <div className="w-12 h-12 rounded-full bg-red-100 flex items-center justify-center mx-auto mb-4">
                <Trash2 size={24} className="text-red-600" />
              </div>
              <AlertDialogTitle className="text-center text-[#0F172A]">
                Delete Project
              </AlertDialogTitle>
              <AlertDialogDescription className="text-center">
                Are you sure you want to delete{" "}
                <span className="font-semibold text-[#0F172A]">
                  "{projectToDelete?.name}"
                </span>
                ? This action cannot be undone and all associated data will be permanently removed.
              </AlertDialogDescription>
            </AlertDialogHeader>
            <AlertDialogFooter className="gap-3 sm:justify-center">
              <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
              <AlertDialogAction
                onClick={handleDeleteProject}
                disabled={isDeleting}
                className="bg-red-600 hover:bg-red-700 rounded-md"
              >
                {isDeleting ? (
                  <>
                    <Loader2 size={16} className="animate-spin mr-2" />
                    Deleting...
                  </>
                ) : (
                  <>
                    <Trash2 size={16} className="mr-2" />
                    Delete Project
                  </>
                )}
              </AlertDialogAction>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialog>
      </main>
    </div>
  );
};

export default ProjectsPage;
