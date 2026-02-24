// src/pages/Tasks.tsx

import React, { useState, useEffect, useMemo } from "react";
import { getTasks as fetchTasksApi, createTask as createTaskApi, updateTask as updateTaskApi, deleteTask as deleteTaskApi, updateTaskStatus } from "@/features/tasks";
import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";
import { getUsers } from "@/features/users";
import { Sidebar } from "@/components/Sidebar";
import { AiInsightBadge, getTaskInsights } from "@/components/ai/AiInsightBadge";
import { motion, AnimatePresence, Reorder } from "framer-motion";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Textarea } from "@/components/ui/textarea";
import { Progress } from "@/components/ui/progress";
import { Switch } from "@/components/ui/switch";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Calendar } from "@/components/ui/calendar";
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
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
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
import {
  CheckSquare,
  Square,
  CheckCircle2,
  Circle,
  Clock,
  Calendar as CalendarIcon,
  CalendarDays,
  CalendarClock,
  Plus,
  Search,
  Filter,
  SortAsc,
  SortDesc,
  MoreHorizontal,
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  Copy,
  Check,
  X,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  LayoutGrid,
  List,
  Columns,
  Flag,
  Tag,
  Paperclip,
  MessageSquare,
  Users,
  User,
  UserPlus,
  Star,
  StarOff,
  Bell,
  BellOff,
  Repeat,
  ArrowRight,
  ArrowUpRight,
  ArrowDownRight,
  RefreshCw,
  Play,
  Pause,
  RotateCcw,
  Target,
  Zap,
  Sparkles,
  Flame,
  AlertCircle,
  AlertTriangle,
  Info,
  CheckCheck,
  ListTodo,
  ListChecks,
  KanbanSquare,
  GripVertical,
  Briefcase,
  FolderOpen,
  Hash,
  AtSign,
  Link as LinkIcon,
  ExternalLink,
  Download,
  Upload,
  Settings,
  Inbox,
  Send,
  Archive,
  type LucideIcon,
} from "lucide-react";
import { format } from "date-fns";

// ============================================
// TYPES
// ============================================

interface SubTask {
  id: string;
  title: string;
  completed: boolean;
}

interface Task {
  id: string;
  title: string;
  description?: string;
  status: "todo" | "in_progress" | "in_review" | "completed" | "cancelled";
  priority: "low" | "medium" | "high" | "urgent";
  dueDate?: Date;
  startDate?: Date;
  completedDate?: Date;
  project?: string;
  projectColor?: string;
  category: string;
  tags?: string[];
  assignees?: Assignee[];
  subtasks?: SubTask[];
  attachments?: number;
  comments?: number;
  isStarred: boolean;
  isRecurring: boolean;
  recurrence?: RecurrenceRule;
  estimatedTime?: number; // in minutes
  actualTime?: number; // in minutes
  createdBy: string;
  createdAt: Date;
  updatedAt?: Date;
}

interface Assignee {
  id: string;
  name: string;
  email: string;
  avatar?: string;
}

interface RecurrenceRule {
  frequency: "daily" | "weekly" | "monthly";
  interval: number;
  endDate?: Date;
}

interface Project {
  id: string;
  name: string;
  color: string;
  taskCount: number;
}

interface TaskCategory {
  id: string;
  name: string;
  icon: LucideIcon;
  color: string;
}

// ============================================
// CONSTANTS & DATA
// ============================================

const taskStatuses = [
  { id: "todo", name: "To Do", color: "#64748B", bgColor: "#F1F5F9", icon: Circle },
  { id: "in_progress", name: "In Progress", color: "#3B82F6", bgColor: "#EFF6FF", icon: Play },
  { id: "in_review", name: "In Review", color: "#F59E0B", bgColor: "#FFFBEB", icon: Eye },
  { id: "completed", name: "Completed", color: "#10B981", bgColor: "#ECFDF5", icon: CheckCircle2 },
  { id: "cancelled", name: "Cancelled", color: "#EF4444", bgColor: "#FEF2F2", icon: X },
];

const taskPriorities = [
  { id: "low", name: "Low", color: "#64748B", bgColor: "#F1F5F9", icon: Flag },
  { id: "medium", name: "Medium", color: "#3B82F6", bgColor: "#EFF6FF", icon: Flag },
  { id: "high", name: "High", color: "#F59E0B", bgColor: "#FFFBEB", icon: Flag },
  { id: "urgent", name: "Urgent", color: "#EF4444", bgColor: "#FEF2F2", icon: Flame },
];

const taskCategories: TaskCategory[] = [
  { id: "development", name: "Development", icon: Zap, color: "#3B82F6" },
  { id: "design", name: "Design", icon: Sparkles, color: "#EC4899" },
  { id: "marketing", name: "Marketing", icon: Target, color: "#F59E0B" },
  { id: "sales", name: "Sales", icon: Briefcase, color: "#10B981" },
  { id: "support", name: "Support", icon: MessageSquare, color: "#8B5CF6" },
  { id: "admin", name: "Admin", icon: Settings, color: "#64748B" },
  { id: "other", name: "Other", icon: FolderOpen, color: "#06B6D4" },
];

const PROJECT_COLORS = ["#3B82F6", "#10B981", "#8B5CF6", "#F59E0B", "#EC4899", "#EF4444", "#06B6D4", "#F97316"];










// ============================================

// UTILITY FUNCTIONS
// ============================================

const formatDate = (date: Date): string => {
  return format(date, "MMM d, yyyy");
};

const formatShortDate = (date: Date): string => {
  return format(date, "MMM d");
};

const formatTime = (minutes: number): string => {
  const hours = Math.floor(minutes / 60);
  const mins = minutes % 60;
  if (hours === 0) return `${mins}m`;
  if (mins === 0) return `${hours}h`;
  return `${hours}h ${mins}m`;
};

const getStatusInfo = (statusId: string) => {
  return taskStatuses.find((s) => s.id === statusId) || taskStatuses[0];
};

const getPriorityInfo = (priorityId: string) => {
  return taskPriorities.find((p) => p.id === priorityId) || taskPriorities[0];
};

const getCategoryInfo = (categoryId: string) => {
  return taskCategories.find((c) => c.id === categoryId) || taskCategories[6];
};

const getInitials = (name: string): string => {
  return name.split(" ").map((n) => n[0]).join("").toUpperCase();
};

const isOverdue = (task: Task): boolean => {
  if (!task.dueDate || task.status === "completed" || task.status === "cancelled") return false;
  return new Date(task.dueDate) < new Date();
};

const isDueToday = (task: Task): boolean => {
  if (!task.dueDate) return false;
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  return (
    dueDate.getDate() === today.getDate() &&
    dueDate.getMonth() === today.getMonth() &&
    dueDate.getFullYear() === today.getFullYear()
  );
};

const isDueSoon = (task: Task): boolean => {
  if (!task.dueDate || isDueToday(task)) return false;
  const today = new Date();
  const dueDate = new Date(task.dueDate);
  const diffDays = Math.ceil((dueDate.getTime() - today.getTime()) / (1000 * 60 * 60 * 24));
  return diffDays > 0 && diffDays <= 3;
};

const getSubtaskProgress = (subtasks?: SubTask[]): number => {
  if (!subtasks || subtasks.length === 0) return 0;
  const completed = subtasks.filter((st) => st.completed).length;
  return Math.round((completed / subtasks.length) * 100);
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
  value: number | string;
  subtitle?: string;
  icon: LucideIcon;
  color: string;
  trend?: { value: number; label: string };
  delay?: number;
}) => {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg  transition-all overflow-hidden group"
    >
      <div
        className="absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all"
        style={{ backgroundColor: color }}
      />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-2xl font-bold text-[#0F172A]">{value}</p>
          {subtitle && <p className="text-xs text-[#475569] mt-1">{subtitle}</p>}
          {trend && (
            <div className="flex items-center gap-1 mt-2">
              {trend.value >= 0 ? (
                <ArrowUpRight size={14} className="text-green-500" />
              ) : (
                <ArrowDownRight size={14} className="text-red-500" />
              )}
              <span
                className={cn(
                  "text-xs font-semibold",
                  trend.value >= 0 ? "text-green-600" : "text-red-600"
                )}
              >
                {Math.abs(trend.value)}%
              </span>
              <span className="text-xs text-[#475569]">{trend.label}</span>
            </div>
          )}
        </div>
        <div
          className="w-12 h-12 rounded-md flex items-center justify-center"
          style={{ backgroundColor: `${color}15` }}
        >
          <Icon size={22} style={{ color }} />
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// TASK LIST ITEM COMPONENT
// ============================================

const TaskListItem = ({
  task,
  onToggleComplete,
  onToggleStar,
  onClick,
  onEdit,
  onDelete,
}: {
  task: Task;
  onToggleComplete: () => void;
  onToggleStar: () => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const statusInfo = getStatusInfo(task.status);
  const priorityInfo = getPriorityInfo(task.priority);
  const categoryInfo = getCategoryInfo(task.category);
  const CategoryIcon = categoryInfo.icon;
  const subtaskProgress = getSubtaskProgress(task.subtasks);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <motion.div
      initial={{ opacity: 0, y: 10 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, x: -20 }}
      whileHover={{ backgroundColor: "#F8FAFC" }}
      className={cn(
        "group flex items-start gap-4 p-4 border-b border-[rgba(15,23,42,0.06)] cursor-pointer transition-all",
        task.status === "completed" && "opacity-60"
      )}
      onClick={onClick}
    >
      {/* Checkbox */}
      <div className="pt-0.5" onClick={(e) => e.stopPropagation()}>
        <button
          onClick={onToggleComplete}
          className={cn(
            "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
            task.status === "completed"
              ? "bg-green-500 border-green-500 text-[#0F172A]"
              : "border-slate-300 hover:border-[#22D3EE]"
          )}
        >
          {task.status === "completed" && <Check size={12} />}
        </button>
      </div>

      {/* Main Content */}
      <div className="flex-1 min-w-0">
        <div className="flex items-start justify-between gap-4">
          <div className="flex-1 min-w-0">
            {/* Title & Star */}
            <div className="flex items-center gap-2">
              <h3
                className={cn(
                  "font-medium text-[#0F172A] truncate",
                  task.status === "completed" && "line-through text-[#475569]"
                )}
              >
                {task.title}
              </h3>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  onToggleStar();
                }}
                className="opacity-0 group-hover:opacity-100 transition-opacity"
              >
                {task.isStarred ? (
                  <Star size={16} className="text-yellow-500 fill-yellow-500" />
                ) : (
                  <Star size={16} className="text-[#475569] hover:text-yellow-500" />
                )}
              </button>
              {task.isRecurring && (
                <Repeat size={14} className="text-[#475569]" />
              )}
            </div>

            {/* Meta Info */}
            <div className="flex items-center flex-wrap gap-3 mt-2">
              {/* Project */}
              {task.project && (
                <span
                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                  style={{
                    backgroundColor: `${task.projectColor}15`,
                    color: task.projectColor,
                  }}
                >
                  <Hash size={10} />
                  {task.project}
                </span>
              )}

              {/* Priority */}
              <span
                className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium"
                style={{
                  backgroundColor: priorityInfo.bgColor,
                  color: priorityInfo.color,
                }}
              >
                <Flag size={10} />
                {priorityInfo.name}
              </span>

              {/* Due Date */}
              {task.dueDate && (
                <span
                  className={cn(
                    "inline-flex items-center gap-1 px-2 py-0.5 rounded-md text-xs font-medium",
                    overdue && "bg-red-100 text-red-600",
                    dueToday && !overdue && "bg-yellow-100 text-yellow-600",
                    !overdue && !dueToday && "bg-white/5 text-[#475569]"
                  )}
                >
                  <CalendarIcon size={10} />
                  {overdue ? "Overdue" : dueToday ? "Today" : formatShortDate(task.dueDate)}
                </span>
              )}

              {/* Subtasks */}
              {task.subtasks && task.subtasks.length > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8]">
                  <ListChecks size={12} />
                  {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}
                </span>
              )}

              {/* Attachments */}
              {task.attachments && task.attachments > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8]">
                  <Paperclip size={12} />
                  {task.attachments}
                </span>
              )}

              {/* Comments */}
              {task.comments && task.comments > 0 && (
                <span className="inline-flex items-center gap-1 text-xs text-[#94A3B8]">
                  <MessageSquare size={12} />
                  {task.comments}
                </span>
              )}
            </div>

            {/* AI Insight Badges */}
            {(() => {
              const insights = getTaskInsights(task);
              return insights.length > 0 ? (
                <div className="flex flex-wrap gap-1 mt-2">
                  {insights.map((type) => (
                    <AiInsightBadge key={type} type={type} size="sm" />
                  ))}
                </div>
              ) : null;
            })()}

            {/* Subtask Progress */}
            {task.subtasks && task.subtasks.length > 0 && (
              <div className="mt-2 max-w-[200px]">
                <Progress value={subtaskProgress} className="h-1.5" />
              </div>
            )}
          </div>

          {/* Right Side */}
          <div className="flex items-center gap-3">
            {/* Assignees */}
            {task.assignees && task.assignees.length > 0 && (
              <div className="flex -space-x-2">
                {task.assignees.slice(0, 3).map((assignee) => (
                  <Avatar key={assignee.id} className="h-7 w-7 border-2 border-white">
                    <AvatarImage src={assignee.avatar} />
                    <AvatarFallback className="text-xs bg-slate-200">
                      {getInitials(assignee.name)}
                    </AvatarFallback>
                  </Avatar>
                ))}
                {task.assignees.length > 3 && (
                  <div className="h-7 w-7 rounded-full bg-white/5 border-2 border-white flex items-center justify-center text-xs font-medium text-[#475569]">
                    +{task.assignees.length - 3}
                  </div>
                )}
              </div>
            )}

            {/* Actions */}
            <div
              className="opacity-0 group-hover:opacity-100 transition-opacity"
              onClick={(e) => e.stopPropagation()}
            >
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button variant="ghost" size="icon" className="h-8 w-8 rounded-md">
                    <MoreHorizontal size={16} />
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-48 rounded-md">
                  <DropdownMenuItem onClick={onClick} className="rounded-md">
                    <Eye size={14} className="mr-2" /> View Details
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onEdit} className="rounded-md">
                    <Pencil size={14} className="mr-2" /> Edit Task
                  </DropdownMenuItem>
                  <DropdownMenuItem onClick={onToggleStar} className="rounded-md">
                    <Star size={14} className="mr-2" />
                    {task.isStarred ? "Remove Star" : "Add Star"}
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem className="rounded-md">
                    <Copy size={14} className="mr-2" /> Duplicate
                  </DropdownMenuItem>
                  <DropdownMenuItem className="rounded-md">
                    <Archive size={14} className="mr-2" /> Archive
                  </DropdownMenuItem>
                  <DropdownMenuSeparator />
                  <DropdownMenuItem onClick={onDelete} className="rounded-md text-red-600">
                    <Trash2 size={14} className="mr-2" /> Delete
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// TASK CARD COMPONENT (GRID VIEW)
// ============================================

const TaskCard = ({
  task,
  onToggleComplete,
  onToggleStar,
  onClick,
  onEdit,
  onDelete,
  delay = 0,
}: {
  task: Task;
  onToggleComplete: () => void;
  onToggleStar: () => void;
  onClick: () => void;
  onEdit: () => void;
  onDelete: () => void;
  delay?: number;
}) => {
  const statusInfo = getStatusInfo(task.status);
  const priorityInfo = getPriorityInfo(task.priority);
  const categoryInfo = getCategoryInfo(task.category);
  const CategoryIcon = categoryInfo.icon;
  const subtaskProgress = getSubtaskProgress(task.subtasks);
  const overdue = isOverdue(task);
  const dueToday = isDueToday(task);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className={cn(
        "relative bg-white rounded-md border overflow-hidden transition-all group cursor-pointer",
        task.status === "completed"
          ? "border-[rgba(15,23,42,0.06)] opacity-70"
          : "border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg "
      )}
      onClick={onClick}
    >
      {/* Priority Indicator */}
      <div
        className="absolute top-0 left-0 right-0 h-1"
        style={{ backgroundColor: priorityInfo.color }}
      />

      {/* Actions */}
      <div
        className="absolute top-3 right-3 z-10 opacity-0 group-hover:opacity-100 transition-opacity flex items-center gap-1"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onToggleStar}
          className="p-1.5 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white"
        >
          {task.isStarred ? (
            <Star size={14} className="text-yellow-500 fill-yellow-500" />
          ) : (
            <Star size={14} className="text-[#475569]" />
          )}
        </button>
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md bg-white/80 backdrop-blur-sm hover:bg-white">
              <MoreHorizontal size={14} />
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-44 rounded-md">
            <DropdownMenuItem onClick={onClick} className="rounded-md text-sm">
              <Eye size={14} className="mr-2" /> View
            </DropdownMenuItem>
            <DropdownMenuItem onClick={onEdit} className="rounded-md text-sm">
              <Pencil size={14} className="mr-2" /> Edit
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={onDelete} className="rounded-md text-sm text-red-600">
              <Trash2 size={14} className="mr-2" /> Delete
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>

      <div className="p-4 pt-5">
        {/* Project & Category */}
        <div className="flex items-center gap-2 mb-3">
          {task.project && (
            <span
              className="text-xs font-medium px-2 py-0.5 rounded-md"
              style={{
                backgroundColor: `${task.projectColor}15`,
                color: task.projectColor,
              }}
            >
              {task.project}
            </span>
          )}
          <span
            className="text-xs font-medium px-2 py-0.5 rounded-md"
            style={{
              backgroundColor: `${categoryInfo.color}15`,
              color: categoryInfo.color,
            }}
          >
            <CategoryIcon size={10} className="inline mr-1" />
            {categoryInfo.name}
          </span>
        </div>

        {/* Title */}
        <div className="flex items-start gap-3 mb-3">
          <button
            onClick={(e) => {
              e.stopPropagation();
              onToggleComplete();
            }}
            className={cn(
              "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
              task.status === "completed"
                ? "bg-green-500 border-green-500 text-[#0F172A]"
                : "border-slate-300 hover:border-[#22D3EE]"
            )}
          >
            {task.status === "completed" && <Check size={12} />}
          </button>
          <h3
            className={cn(
              "font-semibold text-[#0F172A] line-clamp-2",
              task.status === "completed" && "line-through text-[#475569]"
            )}
          >
            {task.title}
          </h3>
        </div>

        {/* Description */}
        {task.description && (
          <p className="text-sm text-[#94A3B8] line-clamp-2 mb-3">
            {task.description}
          </p>
        )}

        {/* Subtasks Progress */}
        {task.subtasks && task.subtasks.length > 0 && (
          <div className="mb-3">
            <div className="flex items-center justify-between text-xs mb-1">
              <span className="text-[#94A3B8]">Subtasks</span>
              <span className="font-medium text-[#0F172A]">
                {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}
              </span>
            </div>
            <Progress value={subtaskProgress} className="h-1.5" />
          </div>
        )}

        {/* Due Date & Priority */}
        <div className="flex items-center gap-2 mb-3">
          {task.dueDate && (
            <span
              className={cn(
                "inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium",
                overdue && "bg-red-100 text-red-600",
                dueToday && !overdue && "bg-yellow-100 text-yellow-600",
                !overdue && !dueToday && "bg-white/5 text-[#475569]"
              )}
            >
              <CalendarIcon size={12} />
              {overdue ? "Overdue" : dueToday ? "Today" : formatShortDate(task.dueDate)}
            </span>
          )}
          <span
            className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
            style={{
              backgroundColor: priorityInfo.bgColor,
              color: priorityInfo.color,
            }}
          >
            <Flag size={12} />
            {priorityInfo.name}
          </span>
        </div>

        {/* AI Insight Badges */}
        {(() => {
          const insights = getTaskInsights(task);
          return insights.length > 0 ? (
            <div className="flex flex-wrap gap-1 mb-3">
              {insights.map((type) => (
                <AiInsightBadge key={type} type={type} />
              ))}
            </div>
          ) : null;
        })()}

        {/* Footer */}
        <div className="flex items-center justify-between pt-3 border-t border-[rgba(15,23,42,0.06)]">
          {/* Assignees */}
          <div className="flex -space-x-2">
            {task.assignees?.slice(0, 4).map((assignee) => (
              <Avatar key={assignee.id} className="h-6 w-6 border-2 border-white">
                <AvatarImage src={assignee.avatar} />
                <AvatarFallback className="text-[10px] bg-slate-200">
                  {getInitials(assignee.name)}
                </AvatarFallback>
              </Avatar>
            ))}
            {task.assignees && task.assignees.length > 4 && (
              <div className="h-6 w-6 rounded-full bg-white/5 border-2 border-white flex items-center justify-center text-[10px] font-medium text-[#475569]">
                +{task.assignees.length - 4}
              </div>
            )}
          </div>

          {/* Meta */}
          <div className="flex items-center gap-3 text-[#475569]">
            {task.attachments && task.attachments > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <Paperclip size={12} />
                {task.attachments}
              </span>
            )}
            {task.comments && task.comments > 0 && (
              <span className="flex items-center gap-1 text-xs">
                <MessageSquare size={12} />
                {task.comments}
              </span>
            )}
          </div>
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// KANBAN COLUMN COMPONENT
// ============================================

const KanbanColumn = ({
  status,
  tasks,
  onTaskClick,
  onToggleComplete,
  onToggleStar,
  onEdit,
  onDelete,
  onStatusChange,
}: {
  status: typeof taskStatuses[0];
  tasks: Task[];
  onTaskClick: (task: Task) => void;
  onToggleComplete: (task: Task) => void;
  onToggleStar: (task: Task) => void;
  onEdit: (task: Task) => void;
  onDelete: (task: Task) => void;
  onStatusChange: (taskId: string, newStatus: string) => void;
}) => {
  const StatusIcon = status.icon;
  const [isDragOver, setIsDragOver] = useState(false);

  return (
    <div className="flex-shrink-0 w-[320px]">
      {/* Column Header */}
      <div
        className="rounded-t-xl p-4 border border-b-0"
        style={{ backgroundColor: status.bgColor, borderColor: `${status.color}30` }}
      >
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div
              className="w-8 h-8 rounded-md flex items-center justify-center"
              style={{ backgroundColor: `${status.color}20` }}
            >
              <StatusIcon size={16} style={{ color: status.color }} />
            </div>
            <div>
              <h3 className="font-semibold text-[#0F172A] text-sm">{status.name}</h3>
              <p className="text-xs text-[#94A3B8]">{tasks.length} tasks</p>
            </div>
          </div>
          <span
            className="px-2 py-1 rounded-md text-xs font-bold"
            style={{ backgroundColor: `${status.color}20`, color: status.color }}
          >
            {tasks.length}
          </span>
        </div>
      </div>

      {/* Column Body */}
      <div
        className={cn(
          "min-h-[400px] max-h-[calc(100vh-350px)] overflow-y-auto p-3 space-y-3 rounded-b-xl border border-t-0 transition-all duration-200",
          isDragOver ? "bg-[#0891B2]/5 ring-2 ring-[#22D3EE] ring-inset" : "bg-[#F8FAFC]/50"
        )}
        style={{ borderColor: `${status.color}20` }}
        onDragOver={(e) => { e.preventDefault(); e.dataTransfer.dropEffect = "move"; setIsDragOver(true); }}
        onDragLeave={(e) => { if (!e.currentTarget.contains(e.relatedTarget as Node)) setIsDragOver(false); }}
        onDrop={(e) => {
          e.preventDefault();
          setIsDragOver(false);
          const taskId = e.dataTransfer.getData("text/plain");
          if (taskId) onStatusChange(taskId, status.id);
        }}
      >
        <AnimatePresence>
          {tasks.map((task, index) => {
            const priorityInfo = getPriorityInfo(task.priority);
            const overdue = isOverdue(task);
            const dueToday = isDueToday(task);

            return (
              <div
                key={task.id}
                draggable
                onDragStart={(e) => {
                  e.dataTransfer.setData("text/plain", task.id);
                  e.dataTransfer.effectAllowed = "move";
                }}
                className="cursor-grab active:cursor-grabbing"
              >
                <motion.div
                  layout
                  initial={{ opacity: 0, y: 20 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={{ opacity: 0, scale: 0.9 }}
                  transition={{ delay: index * 0.05 }}
                  whileHover={{ y: -2 }}
                  onClick={() => onTaskClick(task)}
                  className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-3 hover:shadow-md hover:border-slate-300 transition-all group"
                >
                  {/* Priority Bar */}
                  <div
                    className="w-full h-1 rounded-full mb-3"
                    style={{ backgroundColor: priorityInfo.color }}
                  />

                  {/* Title */}
                  <div className="flex items-start gap-2 mb-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        onToggleComplete(task);
                      }}
                      className={cn(
                        "w-4 h-4 rounded-full border-2 flex items-center justify-center transition-all flex-shrink-0 mt-0.5",
                        task.status === "completed"
                          ? "bg-green-500 border-green-500 text-[#0F172A]"
                          : "border-slate-300 hover:border-[#22D3EE]"
                      )}
                    >
                      {task.status === "completed" && <Check size={10} />}
                    </button>
                    <h4
                      className={cn(
                        "font-medium text-[#0F172A] text-sm line-clamp-2",
                        task.status === "completed" && "line-through text-[#475569]"
                      )}
                    >
                      {task.title}
                    </h4>
                  </div>

                  {/* Project */}
                  {task.project && (
                    <span
                      className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium mb-2"
                      style={{
                        backgroundColor: `${task.projectColor}15`,
                        color: task.projectColor,
                      }}
                    >
                      <Hash size={10} />
                      {task.project}
                    </span>
                  )}

                  {/* Due Date */}
                  {task.dueDate && (
                    <div className="mb-2">
                      <span
                        className={cn(
                          "inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium",
                          overdue && "bg-red-100 text-red-600",
                          dueToday && !overdue && "bg-yellow-100 text-yellow-600",
                          !overdue && !dueToday && "bg-white/5 text-[#94A3B8]"
                        )}
                      >
                        <CalendarIcon size={10} />
                        {overdue ? "Overdue" : dueToday ? "Today" : formatShortDate(task.dueDate)}
                      </span>
                    </div>
                  )}

                  {/* Subtasks */}
                  {task.subtasks && task.subtasks.length > 0 && (
                    <div className="mb-2">
                      <div className="flex items-center gap-2 text-xs text-[#94A3B8]">
                        <ListChecks size={12} />
                        <span>
                          {task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length}
                        </span>
                        <Progress
                          value={getSubtaskProgress(task.subtasks)}
                          className="h-1 flex-1"
                        />
                      </div>
                    </div>
                  )}

                  {/* Footer */}
                  <div className="flex items-center justify-between pt-2 border-t border-[rgba(15,23,42,0.06)]">
                    {/* Assignees */}
                    <div className="flex -space-x-1">
                      {task.assignees?.slice(0, 3).map((assignee) => (
                        <Avatar key={assignee.id} className="h-5 w-5 border border-white">
                          <AvatarImage src={assignee.avatar} />
                          <AvatarFallback className="text-[8px] bg-slate-200">
                            {getInitials(assignee.name)}
                          </AvatarFallback>
                        </Avatar>
                      ))}
                    </div>

                    {/* Actions */}
                    <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          onToggleStar(task);
                        }}
                        className="p-1 rounded hover:bg-white/10"
                      >
                        {task.isStarred ? (
                          <Star size={12} className="text-yellow-500 fill-yellow-500" />
                        ) : (
                          <Star size={12} className="text-[#475569]" />
                        )}
                      </button>
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild onClick={(e) => e.stopPropagation()}>
                          <button className="p-1 rounded hover:bg-white/10">
                            <MoreHorizontal size={12} className="text-[#475569]" />
                          </button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-40 rounded-md">
                          <DropdownMenuItem onClick={() => onEdit(task)} className="rounded-md text-sm">
                            <Pencil size={12} className="mr-2" /> Edit
                          </DropdownMenuItem>
                          <DropdownMenuItem onClick={() => onDelete(task)} className="rounded-md text-sm text-red-600">
                            <Trash2 size={12} className="mr-2" /> Delete
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </div>
                </motion.div>
              </div>
            );
          })}
        </AnimatePresence>

        {tasks.length === 0 && (
          <div className="flex flex-col items-center justify-center py-8 text-center">
            <StatusIcon size={24} className="text-[#475569] mb-2" />
            <p className="text-sm text-[#94A3B8]">No tasks</p>
            <p className="text-xs text-[#CBD5E1] mt-0.5">Drag tasks here</p>
          </div>
        )}

        {/* Drop indicator */}
        {isDragOver && (
          <div className="border-2 border-dashed border-[#22D3EE] rounded-lg p-3 flex items-center justify-center">
            <p className="text-xs text-[#0891B2] font-medium">Drop to move to {status.name}</p>
          </div>
        )}
      </div>
    </div>
  );
};

// ============================================
// TASK FORM DIALOG
// ============================================

const TaskFormDialog = ({
  isOpen,
  onClose,
  task,
  onSubmit,
  projects = [],
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onSubmit: (data: Partial<Task>) => void;
  projects?: Project[];
}) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
    status: "todo" as Task["status"],
    priority: "medium" as Task["priority"],
    category: "development",
    project: "none",
    dueDate: undefined as Date | undefined,
    estimatedTime: "",
    tags: "",
    isRecurring: false,
  });
  const [selectedAssignees, setSelectedAssignees] = useState<Assignee[]>([]);
  const [subtasks, setSubtasks] = useState<SubTask[]>([]);
  const [newSubtask, setNewSubtask] = useState("");
  const [availableUsers, setAvailableUsers] = useState<Assignee[]>([]);
  const [assigneeSearch, setAssigneeSearch] = useState("");
  const [loadingUsers, setLoadingUsers] = useState(false);

  // Fetch team members from API
  useEffect(() => {
    if (!isOpen) return;
    let cancelled = false;
    const fetchUsers = async () => {
      setLoadingUsers(true);
      try {
        const data = await getUsers();
        if (!cancelled) {
          setAvailableUsers(
            data.map((u: any) => ({
              id: String(u.id),
              name: u.fullName || `${u.firstName || ""} ${u.lastName || ""}`.trim() || "Unknown",
              email: u.email || "",
              avatar: u.avatar || "",
            }))
          );
        }
      } catch {
        // silently fail — just no users to pick from
      } finally {
        if (!cancelled) setLoadingUsers(false);
      }
    };
    fetchUsers();
    return () => { cancelled = true; };
  }, [isOpen]);

  useEffect(() => {
    if (task) {
      setFormData({
        title: task.title,
        description: task.description || "",
        status: task.status,
        priority: task.priority,
        category: task.category,
        project: task.project || "none",
        dueDate: task.dueDate,
        estimatedTime: task.estimatedTime?.toString() || "",
        tags: task.tags?.join(", ") || "",
        isRecurring: task.isRecurring,
      });
      setSelectedAssignees(task.assignees || []);
      setSubtasks(task.subtasks || []);
    } else {
      setFormData({
        title: "",
        description: "",
        status: "todo",
        priority: "medium",
        category: "development",
        project: "none",
        dueDate: undefined,
        estimatedTime: "",
        tags: "",
        isRecurring: false,
      });
      setSelectedAssignees([]);
      setSubtasks([]);
    }
  }, [task, isOpen]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!formData.title.trim()) return;

    const selectedProject = formData.project !== "none" ? projects.find((p) => p.id === formData.project) : undefined;

    onSubmit({
      title: formData.title,
      description: formData.description,
      status: formData.status,
      priority: formData.priority,
      category: formData.category,
      project: selectedProject?.name,
      projectColor: selectedProject?.color,
      dueDate: formData.dueDate,
      estimatedTime: formData.estimatedTime ? parseInt(formData.estimatedTime) : undefined,
      tags: formData.tags.split(",").map((t) => t.trim()).filter((t) => t),
      assignees: selectedAssignees,
      subtasks,
      isRecurring: formData.isRecurring,
    });

    onClose();
  };

  const addSubtask = () => {
    if (!newSubtask.trim()) return;
    setSubtasks([...subtasks, { id: `st_${Date.now()}`, title: newSubtask, completed: false }]);
    setNewSubtask("");
  };

  const removeSubtask = (id: string) => {
    setSubtasks(subtasks.filter((st) => st.id !== id));
  };

  const toggleSubtask = (id: string) => {
    setSubtasks(subtasks.map((st) => st.id === id ? { ...st, completed: !st.completed } : st));
  };

  const toggleAssignee = (assignee: Assignee) => {
    setSelectedAssignees((prev) =>
      prev.find((a) => a.id === assignee.id)
        ? prev.filter((a) => a.id !== assignee.id)
        : [...prev, assignee]
    );
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA] sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-xl font-bold text-[#0F172A]">
              {task ? "Edit Task" : "Create Task"}
            </DialogTitle>
            <DialogDescription className="text-[#94A3B8]">
              {task ? "Update task details" : "Add a new task to your list"}
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Title */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">
              Task Title <span className="text-red-500">*</span>
            </Label>
            <Input
              value={formData.title}
              onChange={(e) => setFormData({ ...formData, title: e.target.value })}
              placeholder="Enter task title"
              required
              className="h-11 rounded-md"
            />
          </div>

          {/* Description */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Description</Label>
            <Textarea
              value={formData.description}
              onChange={(e) => setFormData({ ...formData, description: e.target.value })}
              placeholder="Add task description..."
              rows={3}
              className="rounded-md resize-none"
            />
          </div>

          {/* Status & Priority */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Status</Label>
              <Select
                value={formData.status}
                onValueChange={(val) => setFormData({ ...formData, status: val as Task["status"] })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {taskStatuses.map((status) => (
                    <SelectItem key={status.id} value={status.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <status.icon size={14} style={{ color: status.color }} />
                        {status.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Priority</Label>
              <Select
                value={formData.priority}
                onValueChange={(val) => setFormData({ ...formData, priority: val as Task["priority"] })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {taskPriorities.map((priority) => (
                    <SelectItem key={priority.id} value={priority.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <Flag size={14} style={{ color: priority.color }} />
                        {priority.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Project & Category */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Project</Label>
              <Select
                value={formData.project}
                onValueChange={(val) => setFormData({ ...formData, project: val })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue placeholder="Select project" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="none" className="rounded-md">No Project</SelectItem>
                  {projects.map((project) => (
                    <SelectItem key={project.id} value={project.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <div
                          className="w-3 h-3 rounded-full"
                          style={{ backgroundColor: project.color }}
                        />
                        {project.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Category</Label>
              <Select
                value={formData.category}
                onValueChange={(val) => setFormData({ ...formData, category: val })}
              >
                <SelectTrigger className="h-11 rounded-md">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {taskCategories.map((category) => (
                    <SelectItem key={category.id} value={category.id} className="rounded-md">
                      <div className="flex items-center gap-2">
                        <category.icon size={14} style={{ color: category.color }} />
                        {category.name}
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Due Date & Estimated Time */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Due Date</Label>
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="outline"
                    className={cn(
                      "h-11 w-full justify-start text-left font-normal rounded-md",
                      !formData.dueDate && "text-muted-foreground"
                    )}
                  >
                    <CalendarIcon size={16} className="mr-2" />
                    {formData.dueDate ? format(formData.dueDate, "PPP") : "Select date"}
                  </Button>
                </PopoverTrigger>
                <PopoverContent className="w-auto p-0 rounded-md" align="start">
                  <Calendar
                    mode="single"
                    selected={formData.dueDate}
                    onSelect={(date) => setFormData({ ...formData, dueDate: date })}
                    initialFocus
                  />
                </PopoverContent>
              </Popover>
            </div>
            <div className="space-y-2">
              <Label className="text-sm font-medium text-[#475569]">Estimated Time (minutes)</Label>
              <div className="relative">
                <Clock size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                <Input
                  type="number"
                  value={formData.estimatedTime}
                  onChange={(e) => setFormData({ ...formData, estimatedTime: e.target.value })}
                  placeholder="e.g., 120"
                  className="h-11 pl-10 rounded-md"
                />
              </div>
            </div>
          </div>

          {/* Assignees */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Assignees</Label>
            <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-3">
              {/* Selected Assignees */}
              {selectedAssignees.length > 0 && (
                <div className="flex flex-wrap gap-2 mb-3">
                  {selectedAssignees.map((assignee) => (
                    <div
                      key={assignee.id}
                      className="flex items-center gap-2 px-2 py-1 bg-[#0891B2]/10 rounded-md"
                    >
                      <Avatar className="h-5 w-5">
                        <AvatarImage src={assignee.avatar} />
                        <AvatarFallback className="text-xs">
                          {getInitials(assignee.name)}
                        </AvatarFallback>
                      </Avatar>
                      <span className="text-sm text-[#0F172A]">{assignee.name}</span>
                      <button
                        type="button"
                        onClick={() => toggleAssignee(assignee)}
                        className="text-[#475569] hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Search input */}
              <div className="relative mb-2">
                <Search size={14} className="absolute left-2.5 top-1/2 -translate-y-1/2 text-[#94A3B8]" />
                <input
                  type="text"
                  value={assigneeSearch}
                  onChange={(e) => setAssigneeSearch(e.target.value)}
                  placeholder="Search team members..."
                  className="w-full h-8 pl-8 pr-3 rounded-md bg-[#F8FAFC] border border-[rgba(15,23,42,0.06)] text-xs text-[#0F172A] placeholder:text-[#94A3B8] focus:outline-none focus:ring-1 focus:ring-[#0891B2]/30 transition-colors"
                />
              </div>

              {/* Available Members List */}
              <div className="max-h-[160px] overflow-y-auto space-y-0.5">
                {loadingUsers ? (
                  <div className="flex items-center justify-center py-4">
                    <RefreshCw size={14} className="animate-spin text-[#94A3B8] mr-2" />
                    <span className="text-xs text-[#94A3B8]">Loading team members...</span>
                  </div>
                ) : (() => {
                  const filtered = availableUsers.filter(
                    (u) =>
                      u.name.toLowerCase().includes(assigneeSearch.toLowerCase()) ||
                      u.email.toLowerCase().includes(assigneeSearch.toLowerCase())
                  );
                  if (filtered.length === 0) {
                    return (
                      <div className="text-xs text-[#94A3B8] py-3 text-center">
                        {availableUsers.length === 0 ? "No team members found" : "No matching members"}
                      </div>
                    );
                  }
                  return filtered.map((user) => {
                    const isSelected = selectedAssignees.some((a) => a.id === user.id);
                    return (
                      <button
                        key={user.id}
                        type="button"
                        onClick={() => toggleAssignee(user)}
                        className={cn(
                          "flex items-center gap-3 w-full px-2.5 py-2 rounded-md text-left transition-colors",
                          isSelected
                            ? "bg-[#0891B2]/8 border border-[#22D3EE]/20"
                            : "hover:bg-[#F8FAFC] border border-transparent"
                        )}
                      >
                        <Avatar className="h-7 w-7">
                          <AvatarImage src={user.avatar} />
                          <AvatarFallback className="text-[10px] bg-slate-100">
                            {getInitials(user.name)}
                          </AvatarFallback>
                        </Avatar>
                        <div className="flex-1 min-w-0">
                          <p className="text-sm font-medium text-[#0F172A] truncate">{user.name}</p>
                          <p className="text-[10px] text-[#94A3B8] truncate">{user.email}</p>
                        </div>
                        {isSelected && (
                          <CheckCircle2 size={16} className="text-[#0891B2] flex-shrink-0" />
                        )}
                      </button>
                    );
                  });
                })()}
              </div>
            </div>
          </div>

          {/* Subtasks */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Subtasks</Label>
            <div className="border border-[rgba(15,23,42,0.06)] rounded-md p-3">
              {/* Existing Subtasks */}
              {subtasks.length > 0 && (
                <div className="space-y-2 mb-3">
                  {subtasks.map((subtask) => (
                    <div
                      key={subtask.id}
                      className="flex items-center gap-3 p-2 bg-[#F8FAFC] rounded-md"
                    >
                      <button
                        type="button"
                        onClick={() => toggleSubtask(subtask.id)}
                        className={cn(
                          "w-4 h-4 rounded border flex items-center justify-center transition-all",
                          subtask.completed
                            ? "bg-green-500 border-green-500 text-[#0F172A]"
                            : "border-slate-300"
                        )}
                      >
                        {subtask.completed && <Check size={10} />}
                      </button>
                      <span
                        className={cn(
                          "flex-1 text-sm",
                          subtask.completed && "line-through text-[#475569]"
                        )}
                      >
                        {subtask.title}
                      </span>
                      <button
                        type="button"
                        onClick={() => removeSubtask(subtask.id)}
                        className="text-[#475569] hover:text-red-500"
                      >
                        <X size={14} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Add New Subtask */}
              <div className="flex items-center gap-2">
                <Input
                  value={newSubtask}
                  onChange={(e) => setNewSubtask(e.target.value)}
                  placeholder="Add a subtask..."
                  className="h-9 rounded-md"
                  onKeyPress={(e) => {
                    if (e.key === "Enter") {
                      e.preventDefault();
                      addSubtask();
                    }
                  }}
                />
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={addSubtask}
                  className="rounded-md"
                >
                  <Plus size={14} />
                </Button>
              </div>
            </div>
          </div>

          {/* Tags */}
          <div className="space-y-2">
            <Label className="text-sm font-medium text-[#475569]">Tags</Label>
            <div className="relative">
              <Tag size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
              <Input
                value={formData.tags}
                onChange={(e) => setFormData({ ...formData, tags: e.target.value })}
                placeholder="Enter tags separated by commas"
                className="h-11 pl-10 rounded-md"
              />
            </div>
          </div>

          {/* Recurring Toggle */}
          <div className="flex items-center justify-between p-3 bg-[#F8FAFC] rounded-md">
            <div className="flex items-center gap-3">
              <Repeat size={18} className="text-[#94A3B8]" />
              <div>
                <span className="font-medium text-[#0F172A]">Recurring Task</span>
                <p className="text-xs text-[#94A3B8]">This task repeats on a schedule</p>
              </div>
            </div>
            <Switch
              checked={formData.isRecurring}
              onCheckedChange={(checked) => setFormData({ ...formData, isRecurring: checked })}
              className="data-[state=checked]:bg-[#0891B2]"
            />
          </div>

          <DialogFooter className="pt-4 gap-3">
            <Button type="button" variant="outline" onClick={onClose} className="rounded-md">
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={!formData.title.trim()}
              className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
            >
              {task ? (
                <>
                  <Check size={16} className="mr-2" /> Update Task
                </>
              ) : (
                <>
                  <Plus size={16} className="mr-2" /> Create Task
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
// TASK DETAILS DIALOG
// ============================================

const TaskDetailsDialog = ({
  isOpen,
  onClose,
  task,
  onEdit,
  onDelete,
  onToggleComplete,
  onToggleStar,
  onToggleSubtask,
}: {
  isOpen: boolean;
  onClose: () => void;
  task: Task | null;
  onEdit: () => void;
  onDelete: () => void;
  onToggleComplete: () => void;
  onToggleStar: () => void;
  onToggleSubtask: (subtaskId: string) => void;
}) => {
  if (!task) return null;

  const statusInfo = getStatusInfo(task.status);
  const priorityInfo = getPriorityInfo(task.priority);
  const categoryInfo = getCategoryInfo(task.category);
  const CategoryIcon = categoryInfo.icon;
  const StatusIcon = statusInfo.icon;
  const subtaskProgress = getSubtaskProgress(task.subtasks);
  const overdue = isOverdue(task);

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-[600px] p-0 rounded-md overflow-hidden max-h-[90vh] overflow-y-auto">
        {/* Header */}
        <div className="p-6 border-b border-[rgba(15,23,42,0.06)] bg-[#F0FDFA]">
          <div className="flex items-start justify-between">
            <div className="flex items-start gap-4">
              <button
                onClick={onToggleComplete}
                className={cn(
                  "w-6 h-6 rounded-full border-2 flex items-center justify-center transition-all mt-1",
                  task.status === "completed"
                    ? "bg-green-500 border-green-500 text-[#0F172A]"
                    : "border-slate-300 hover:border-[#22D3EE]"
                )}
              >
                {task.status === "completed" && <Check size={14} />}
              </button>
              <div>
                <h2
                  className={cn(
                    "text-xl font-bold text-[#0F172A]",
                    task.status === "completed" && "line-through text-[#475569]"
                  )}
                >
                  {task.title}
                </h2>
                <div className="flex items-center gap-2 mt-2">
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: statusInfo.bgColor, color: statusInfo.color }}
                  >
                    <StatusIcon size={12} />
                    {statusInfo.name}
                  </span>
                  <span
                    className="inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium"
                    style={{ backgroundColor: priorityInfo.bgColor, color: priorityInfo.color }}
                  >
                    <Flag size={12} />
                    {priorityInfo.name}
                  </span>
                </div>
              </div>
            </div>
            <button
              onClick={onToggleStar}
              className="p-2 rounded-md hover:bg-white/10 transition-colors"
            >
              {task.isStarred ? (
                <Star size={20} className="text-yellow-500 fill-yellow-500" />
              ) : (
                <Star size={20} className="text-[#475569]" />
              )}
            </button>
          </div>
        </div>

        <div className="p-6 space-y-6">
          {/* Description */}
          {task.description && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-2">Description</h3>
              <p className="text-sm text-[#475569] whitespace-pre-wrap">{task.description}</p>
            </div>
          )}

          {/* Details Grid */}
          <div className="grid grid-cols-2 gap-4">
            {/* Project */}
            {task.project && (
              <div className="p-4 bg-[#F8FAFC] rounded-md">
                <p className="text-xs text-[#475569] mb-1">Project</p>
                <div className="flex items-center gap-2">
                  <div
                    className="w-3 h-3 rounded-full"
                    style={{ backgroundColor: task.projectColor }}
                  />
                  <span className="font-medium text-[#0F172A]">{task.project}</span>
                </div>
              </div>
            )}

            {/* Category */}
            <div className="p-4 bg-[#F8FAFC] rounded-md">
              <p className="text-xs text-[#475569] mb-1">Category</p>
              <div className="flex items-center gap-2">
                <CategoryIcon size={16} style={{ color: categoryInfo.color }} />
                <span className="font-medium text-[#0F172A]">{categoryInfo.name}</span>
              </div>
            </div>

            {/* Due Date */}
            {task.dueDate && (
              <div
                className={cn(
                  "p-4 rounded-md",
                  overdue ? "bg-red-50 border border-red-100" : "bg-[#F8FAFC]"
                )}
              >
                <p className={cn("text-xs mb-1", overdue ? "text-red-500" : "text-[#475569]")}>
                  Due Date
                </p>
                <div className="flex items-center gap-2">
                  <CalendarIcon size={16} className={overdue ? "text-red-500" : "text-[#94A3B8]"} />
                  <span className={cn("font-medium", overdue ? "text-red-600" : "text-[#0F172A]")}>
                    {formatDate(task.dueDate)}
                    {overdue && " (Overdue)"}
                  </span>
                </div>
              </div>
            )}

            {/* Estimated Time */}
            {task.estimatedTime && (
              <div className="p-4 bg-[#F8FAFC] rounded-md">
                <p className="text-xs text-[#475569] mb-1">Estimated Time</p>
                <div className="flex items-center gap-2">
                  <Clock size={16} className="text-[#94A3B8]" />
                  <span className="font-medium text-[#0F172A]">
                    {formatTime(task.estimatedTime)}
                  </span>
                  {task.actualTime && (
                    <span className="text-sm text-[#475569]">
                      ({formatTime(task.actualTime)} spent)
                    </span>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Assignees */}
          {task.assignees && task.assignees.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">
                Assignees ({task.assignees.length})
              </h3>
              <div className="flex flex-wrap gap-2">
                {task.assignees.map((assignee) => (
                  <div
                    key={assignee.id}
                    className="flex items-center gap-2 px-3 py-2 bg-[#F8FAFC] rounded-md"
                  >
                    <Avatar className="h-7 w-7">
                      <AvatarImage src={assignee.avatar} />
                      <AvatarFallback className="text-xs bg-slate-200">
                        {getInitials(assignee.name)}
                      </AvatarFallback>
                    </Avatar>
                    <div>
                      <p className="text-sm font-medium text-[#0F172A]">{assignee.name}</p>
                      <p className="text-xs text-[#94A3B8]">{assignee.email}</p>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Subtasks */}
          {task.subtasks && task.subtasks.length > 0 && (
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-sm font-semibold text-[#0F172A]">
                  Subtasks ({task.subtasks.filter((st) => st.completed).length}/{task.subtasks.length})
                </h3>
                <span className="text-sm text-[#0891B2] font-medium">{subtaskProgress}%</span>
              </div>
              <Progress value={subtaskProgress} className="h-2 mb-3" />
              <div className="space-y-2">
                {task.subtasks.map((subtask) => (
                  <div
                    key={subtask.id}
                    onClick={() => onToggleSubtask(subtask.id)}
                    className="flex items-center gap-3 p-3 bg-[#F8FAFC] rounded-md cursor-pointer hover:bg-white/10 transition-colors"
                  >
                    <div
                      className={cn(
                        "w-5 h-5 rounded-full border-2 flex items-center justify-center transition-all",
                        subtask.completed
                          ? "bg-green-500 border-green-500 text-[#0F172A]"
                          : "border-slate-300"
                      )}
                    >
                      {subtask.completed && <Check size={12} />}
                    </div>
                    <span
                      className={cn(
                        "flex-1 text-sm",
                        subtask.completed && "line-through text-[#475569]"
                      )}
                    >
                      {subtask.title}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Tags */}
          {task.tags && task.tags.length > 0 && (
            <div>
              <h3 className="text-sm font-semibold text-[#0F172A] mb-3">Tags</h3>
              <div className="flex flex-wrap gap-2">
                {task.tags.map((tag) => (
                  <span
                    key={tag}
                    className="px-3 py-1 bg-[#0891B2]/10 text-[#0891B2] rounded-md text-sm font-medium"
                  >
                    #{tag}
                  </span>
                ))}
              </div>
            </div>
          )}

          {/* Activity Info */}
          <div className="pt-4 border-t border-[rgba(15,23,42,0.06)]">
            <div className="flex items-center justify-between text-sm text-[#94A3B8]">
              <span>Created by {task.createdBy}</span>
              <span>{formatDate(task.createdAt)}</span>
            </div>
            {task.completedDate && (
              <p className="text-sm text-green-600 mt-1">
                Completed on {formatDate(task.completedDate)}
              </p>
            )}
          </div>
        </div>

        <DialogFooter className="p-6 pt-0 gap-3 border-t border-[rgba(15,23,42,0.06)]">
          <Button
            variant="outline"
            onClick={onDelete}
            className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
          >
            <Trash2 size={16} className="mr-2" />
            Delete
          </Button>
          <Button
            onClick={onEdit}
            className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md"
          >
            <Pencil size={16} className="mr-2" />
            Edit Task
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

// ============================================
// SIDEBAR FILTERS COMPONENT
// ============================================

const TaskSidebar = ({
  selectedProject,
  onSelectProject,
  selectedCategory,
  onSelectCategory,
  showCompleted,
  onToggleShowCompleted,
  showStarredOnly,
  onToggleStarredOnly,
  taskCounts,
  quickFilter,
  onSelectQuickFilter,
  projects,
}: {
  selectedProject: string;
  onSelectProject: (projectId: string) => void;
  selectedCategory: string;
  onSelectCategory: (categoryId: string) => void;
  showCompleted: boolean;
  onToggleShowCompleted: () => void;
  showStarredOnly: boolean;
  onToggleStarredOnly: () => void;
  taskCounts: {
    all: number;
    today: number;
    upcoming: number;
    overdue: number;
    starred: number;
    completed: number;
  };
  quickFilter: "" | "today" | "upcoming" | "overdue";
  onSelectQuickFilter: (filter: "" | "today" | "upcoming" | "overdue") => void;
  projects: Project[];
}) => {
  return (
    <div className="space-y-6">
      {/* Quick Filters */}
      <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4">
        <h3 className="font-semibold text-[#0F172A] mb-3">Quick Filters</h3>
        <div className="space-y-1">
          <button
            onClick={() => {
              onSelectProject("");
              onSelectCategory("");
              onSelectQuickFilter("");
            }}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
              !selectedProject && !selectedCategory && !quickFilter && !showStarredOnly
                ? "bg-[#0891B2]/10 text-[#0891B2]"
                : "hover:bg-[#F8FAFC] text-[#475569]"
            )}
          >
            <div className="flex items-center gap-2">
              <Inbox size={16} />
              <span className="font-medium">All Tasks</span>
            </div>
            <span className="text-sm">{taskCounts.all}</span>
          </button>
          <button
            onClick={onToggleStarredOnly}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
              showStarredOnly
                ? "bg-yellow-50 text-yellow-600"
                : "hover:bg-[#F8FAFC] text-[#475569]"
            )}
          >
            <div className="flex items-center gap-2">
              <Star size={16} />
              <span className="font-medium">Starred</span>
            </div>
            <span className="text-sm">{taskCounts.starred}</span>
          </button>
          <button
            onClick={() => onSelectQuickFilter("today")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
              quickFilter === "today"
                ? "bg-[#0891B2]/10 text-[#0891B2]"
                : "hover:bg-[#F8FAFC] text-[#475569]"
            )}
          >
            <div className="flex items-center gap-2">
              <CalendarIcon size={16} />
              <span className="font-medium">Today</span>
            </div>
            <span className="text-sm">{taskCounts.today}</span>
          </button>
          <button
            onClick={() => onSelectQuickFilter("upcoming")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
              quickFilter === "upcoming"
                ? "bg-[#0891B2]/10 text-[#0891B2]"
                : "hover:bg-[#F8FAFC] text-[#475569]"
            )}
          >
            <div className="flex items-center gap-2">
              <CalendarDays size={16} />
              <span className="font-medium">Upcoming</span>
            </div>
            <span className="text-sm">{taskCounts.upcoming}</span>
          </button>
          <button
            onClick={() => onSelectQuickFilter("overdue")}
            className={cn(
              "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
              quickFilter === "overdue"
                ? "bg-red-50 text-red-600"
                : "hover:bg-red-50 text-red-600"
            )}
          >
            <div className="flex items-center gap-2">
              <AlertCircle size={16} />
              <span className="font-medium">Overdue</span>
            </div>
            <span className="text-sm">{taskCounts.overdue}</span>
          </button>
        </div>
      </div>

      {/* Projects */}
      <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4">
        <div className="flex items-center justify-between mb-3">
          <h3 className="font-semibold text-[#0F172A]">Projects</h3>
          <Button variant="ghost" size="icon" className="h-7 w-7 rounded-md">
            <Plus size={14} />
          </Button>
        </div>
        <div className="space-y-1">
          {projects.map((project) => (
            <button
              key={project.id}
              onClick={() => onSelectProject(project.id === selectedProject ? "" : project.id)}
              className={cn(
                "w-full flex items-center justify-between px-3 py-2 rounded-md transition-colors",
                selectedProject === project.id
                  ? "bg-[#0891B2]/10 text-[#0891B2]"
                  : "hover:bg-[#F8FAFC] text-[#475569]"
              )}
            >
              <div className="flex items-center gap-2">
                <div
                  className="w-3 h-3 rounded-full"
                  style={{ backgroundColor: project.color }}
                />
                <span className="font-medium text-sm truncate">{project.name}</span>
              </div>
              <span className="text-xs text-[#475569]">{project.taskCount}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Categories */}
      <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4">
        <h3 className="font-semibold text-[#0F172A] mb-3">Categories</h3>
        <div className="space-y-1">
          {taskCategories.map((category) => (
            <button
              key={category.id}
              onClick={() => onSelectCategory(category.id === selectedCategory ? "" : category.id)}
              className={cn(
                "w-full flex items-center gap-2 px-3 py-2 rounded-md transition-colors",
                selectedCategory === category.id
                  ? "bg-[#0891B2]/10 text-[#0891B2]"
                  : "hover:bg-[#F8FAFC] text-[#475569]"
              )}
            >
              <category.icon size={16} style={{ color: category.color }} />
              <span className="font-medium text-sm">{category.name}</span>
            </button>
          ))}
        </div>
      </div>

      {/* Options */}
      <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4">
        <h3 className="font-semibold text-[#0F172A] mb-3">Options</h3>
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <span className="text-sm text-[#475569]">Show Completed</span>
            <Switch
              checked={showCompleted}
              onCheckedChange={onToggleShowCompleted}
              className="data-[state=checked]:bg-[#0891B2]"
            />
          </div>
        </div>
      </div>
    </div>
  );
};

// ============================================
// MAIN TASKS PAGE COMPONENT
// ============================================

const TasksPage = () => {
  const { toast } = useToast();

  // State
  const [tasks, setTasks] = useState<Task[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Fetch tasks from API on mount
  useEffect(() => {
    const fetchTasks = async () => {
      try {
        const response = await fetchTasksApi() as any[];
        const apiTasks = (Array.isArray(response) ? response : []).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status === 'DONE' ? 'completed' : t.status === 'REVIEW' ? 'in_review' : t.status === 'IN_PROGRESS' ? 'in_progress' : 'todo',
          priority: t.priority?.toLowerCase() || 'medium',
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          startDate: t.startDate ? new Date(t.startDate) : undefined,
          completedDate: t.completedAt ? new Date(t.completedAt) : undefined,
          project: t.project?.name || undefined,
          projectColor: '#8B5CF6',
          category: t.category || 'development',
          tags: t.tags || [],
          assignees: t.assignedTo ? [{ id: t.assignedTo.id, name: `${t.assignedTo.user?.firstName || ''} ${t.assignedTo.user?.lastName || ''}`.trim(), email: t.assignedTo.user?.email || '', avatar: undefined }] : [],
          subtasks: [],
          attachments: t.attachmentCount || 0,
          comments: t.commentCount || 0,
          isStarred: false,
          isRecurring: false,
          estimatedTime: t.estimatedTime || undefined,
          actualTime: undefined,
          createdBy: t.createdBy?.user?.firstName || 'System',
          createdAt: new Date(t.createdAt),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
        }));
        setTasks(apiTasks as Task[]);
      } catch (error) {
        console.error('Failed to fetch tasks:', error);
        setTasks([]);
        toast({ title: 'Error', description: 'Failed to load tasks. Please login.', variant: 'destructive' });
      } finally {
        setIsLoading(false);
      }
    };
    fetchTasks();
  }, [toast]);

  // Fetch projects from API for sidebar
  const [apiProjects, setApiProjects] = useState<Project[]>([]);
  useEffect(() => {
    const fetchProjects = async () => {
      try {
        const res = await api.get("/projects");
        const raw = extractApiArray<any>(res.data);
        setApiProjects(raw.map((p: any, i: number) => ({
          id: p.id,
          name: p.name,
          color: PROJECT_COLORS[i % PROJECT_COLORS.length],
          taskCount: p._count?.tasks ?? 0,
        })));
      } catch { setApiProjects([]); }
    };
    fetchProjects();
  }, []);
  const projects = apiProjects;
  const [viewMode, setViewMode] = useState<"list" | "grid" | "kanban">("list");
  const [activeTab, setActiveTab] = useState("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedProject, setSelectedProject] = useState("");
  const [selectedCategory, setSelectedCategory] = useState("");
  const [showCompleted, setShowCompleted] = useState(true);
  const [showStarredOnly, setShowStarredOnly] = useState(false);
  const [quickFilter, setQuickFilter] = useState<"" | "today" | "upcoming" | "overdue">("");
  const [sortBy, setSortBy] = useState<"dueDate" | "priority" | "created" | "title">("dueDate");
  const [sortOrder, setSortOrder] = useState<"asc" | "desc">("asc");
  const [showMobileSidebar, setShowMobileSidebar] = useState(false);

  // Dialog states
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [isDetailsOpen, setIsDetailsOpen] = useState(false);
  const [isDeleteAlertOpen, setIsDeleteAlertOpen] = useState(false);
  const [currentTask, setCurrentTask] = useState<Task | null>(null);

  // Calculate task counts
  const taskCounts = useMemo(() => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const tomorrow = new Date(today);
    tomorrow.setDate(tomorrow.getDate() + 1);
    const nextWeek = new Date(today);
    nextWeek.setDate(nextWeek.getDate() + 7);

    return {
      all: tasks.filter((t) => t.status !== "cancelled").length,
      today: tasks.filter((t) => t.dueDate && isDueToday(t) && t.status !== "completed").length,
      upcoming: tasks.filter((t) => t.dueDate && isDueSoon(t) && t.status !== "completed").length,
      overdue: tasks.filter((t) => isOverdue(t)).length,
      starred: tasks.filter((t) => t.isStarred && t.status !== "completed").length,
      completed: tasks.filter((t) => t.status === "completed").length,
    };
  }, [tasks]);

  // Filter and sort tasks
  const filteredTasks = useMemo(() => {
    let result = [...tasks];

    // Filter by tab
    if (activeTab === "todo") {
      result = result.filter((t) => t.status === "todo");
    } else if (activeTab === "in_progress") {
      result = result.filter((t) => t.status === "in_progress");
    } else if (activeTab === "in_review") {
      result = result.filter((t) => t.status === "in_review");
    } else if (activeTab === "completed") {
      result = result.filter((t) => t.status === "completed");
    }

    // Quick filter (sidebar)
    if (quickFilter === "today") {
      result = result.filter((t) => isDueToday(t) && t.status !== "completed");
    } else if (quickFilter === "upcoming") {
      result = result.filter((t) => isDueSoon(t) && t.status !== "completed");
    } else if (quickFilter === "overdue") {
      result = result.filter((t) => isOverdue(t));
    }

    // Filter by search
    if (searchQuery) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (t) =>
          t.title.toLowerCase().includes(query) ||
          t.description?.toLowerCase().includes(query) ||
          t.project?.toLowerCase().includes(query) ||
          t.tags?.some((tag) => tag.toLowerCase().includes(query))
      );
    }

    // Filter by project
    if (selectedProject) {
      const project = projects.find((p) => p.id === selectedProject);
      if (project) {
        result = result.filter((t) => t.project === project.name);
      }
    }

    // Filter by category
    if (selectedCategory) {
      result = result.filter((t) => t.category === selectedCategory);
    }

    // Filter completed
    if (!showCompleted) {
      result = result.filter((t) => t.status !== "completed");
    }

    // Filter starred
    if (showStarredOnly) {
      result = result.filter((t) => t.isStarred);
    }

    // Sort
    result.sort((a, b) => {
      let comparison = 0;
      switch (sortBy) {
        case "dueDate":
          if (!a.dueDate && !b.dueDate) comparison = 0;
          else if (!a.dueDate) comparison = 1;
          else if (!b.dueDate) comparison = -1;
          else comparison = a.dueDate.getTime() - b.dueDate.getTime();
          break;
        case "priority":
          const priorityOrder = { urgent: 0, high: 1, medium: 2, low: 3 };
          comparison = priorityOrder[a.priority] - priorityOrder[b.priority];
          break;
        case "created":
          comparison = a.createdAt.getTime() - b.createdAt.getTime();
          break;
        case "title":
          comparison = a.title.localeCompare(b.title);
          break;
      }
      return sortOrder === "asc" ? comparison : -comparison;
    });

    return result;
  }, [tasks, activeTab, searchQuery, selectedProject, selectedCategory, showCompleted, showStarredOnly, quickFilter, sortBy, sortOrder]);

  // Group tasks by status for Kanban view
  const tasksByStatus = useMemo(() => {
    return taskStatuses.reduce((acc, status) => {
      acc[status.id] = filteredTasks.filter((t) => t.status === status.id);
      return acc;
    }, {} as Record<string, Task[]>);
  }, [filteredTasks]);

  // Kanban drag-and-drop status change
  const handleKanbanStatusChange = async (taskId: string, newStatusId: string) => {
    const task = tasks.find((t) => t.id === taskId);
    if (!task || task.status === newStatusId) return;

    // Optimistic update
    setTasks((prev) =>
      prev.map((t) => (t.id === taskId ? { ...t, status: newStatusId as Task["status"] } : t))
    );

    try {
      // Map frontend status IDs to backend enum values
      const statusMap: Record<string, string> = {
        todo: "TODO",
        in_progress: "IN_PROGRESS",
        in_review: "REVIEW",
        completed: "DONE",
        cancelled: "DONE",
      };
      await updateTaskStatus(taskId, statusMap[newStatusId] || newStatusId.toUpperCase());
      toast({ title: "Status Updated", description: `Task moved to ${taskStatuses.find(s => s.id === newStatusId)?.name || newStatusId}.` });
    } catch (error) {
      console.error("Failed to update task status", error);
      // Revert by re-fetching
      try {
        const response = await fetchTasksApi() as any[];
        const apiTasks = (Array.isArray(response) ? response : []).map((t: any) => ({
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: (t.status === 'DONE' ? 'completed' : t.status === 'REVIEW' ? 'in_review' : t.status === 'IN_PROGRESS' ? 'in_progress' : 'todo') as Task["status"],
          priority: (t.priority?.toLowerCase() || 'medium') as Task["priority"],
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          startDate: t.startDate ? new Date(t.startDate) : undefined,
          completedDate: t.completedAt ? new Date(t.completedAt) : undefined,
          project: t.project?.name || undefined,
          projectColor: '#8B5CF6',
          category: t.category || 'development',
          tags: t.tags || [],
          assignees: t.assignedTo ? [{ id: t.assignedTo.id, name: `${t.assignedTo.user?.firstName || ''} ${t.assignedTo.user?.lastName || ''}`.trim(), email: t.assignedTo.user?.email || '', avatar: undefined }] : [],
          subtasks: [],
          attachments: t.attachmentCount || 0,
          comments: t.commentCount || 0,
          isStarred: false,
          isRecurring: false,
          estimatedTime: t.estimatedTime || undefined,
          actualTime: undefined,
          createdBy: t.createdBy?.user?.firstName || 'System',
          createdAt: new Date(t.createdAt),
          updatedAt: t.updatedAt ? new Date(t.updatedAt) : undefined,
        }));
        setTasks(apiTasks as Task[]);
      } catch { /* ignore */ }
      toast({ title: "Error", description: "Failed to update task status.", variant: "destructive" });
    }
  };

  // Handlers
  const handleAddTask = async (data: Partial<Task>) => {
    try {
      // Prepare data for API
      const apiData = {
        title: data.title,
        description: data.description || '',
        status: (data.status || 'todo').toUpperCase().replace('_', '_'),
        priority: (data.priority || 'medium').toUpperCase(),
        dueDate: data.dueDate?.toISOString(),
        category: data.category || 'OTHER',
        estimatedHours: data.estimatedTime ? data.estimatedTime / 60 : undefined,
      };

      const responseData = await createTaskApi(apiData);

      if (responseData) {
        const t = responseData as any;
        const newTask: Task = {
          id: t.id,
          title: t.title,
          description: t.description || '',
          status: t.status?.toLowerCase() || 'todo',
          priority: t.priority?.toLowerCase() || 'medium',
          dueDate: t.dueDate ? new Date(t.dueDate) : undefined,
          project: data.project,
          projectColor: data.projectColor || '#8B5CF6',
          category: t.category || 'development',
          tags: data.tags || [],
          assignees: data.assignees || [],
          subtasks: data.subtasks || [],
          isStarred: false,
          isRecurring: data.isRecurring || false,
          estimatedTime: data.estimatedTime,
          createdBy: 'Current User',
          createdAt: new Date(t.createdAt),
        };

        setTasks((prev) => [newTask, ...prev]);
        toast({
          title: 'Task Created',
          description: `"${newTask.title}" has been added to your tasks.`,
        });
      }
    } catch (error: any) {
      console.error('Failed to create task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to create task',
        variant: 'destructive',
      });
    }
  };

  const handleEditTask = async (data: Partial<Task>) => {
    if (!currentTask) return;

    try {
      const apiData = {
        title: data.title,
        description: data.description || '',
        status: (data.status || 'todo').toUpperCase().replace('_', '_'),
        priority: (data.priority || 'medium').toUpperCase(),
        dueDate: data.dueDate?.toISOString(),
        category: data.category || 'OTHER',
      };

      await updateTaskApi(currentTask.id, apiData);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === currentTask.id ? { ...t, ...data, updatedAt: new Date() } : t
        )
      );
      toast({
        title: 'Task Updated',
        description: 'The task has been updated successfully.',
      });
    } catch (error: any) {
      console.error('Failed to update task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleDeleteTask = async () => {
    if (!currentTask) return;

    try {
      await deleteTaskApi(currentTask.id);

      setTasks((prev) => prev.filter((t) => t.id !== currentTask.id));
      setIsDeleteAlertOpen(false);
      setIsDetailsOpen(false);
      setCurrentTask(null);
      toast({
        title: 'Task Deleted',
        description: 'The task has been removed.',
        variant: 'destructive',
      });
    } catch (error: any) {
      console.error('Failed to delete task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to delete task',
        variant: 'destructive',
      });
    }
  };

  const handleToggleComplete = async (task: Task) => {
    const newStatus = task.status === "completed" ? "TODO" : "DONE";
    try {
      await updateTaskStatus(task.id, newStatus);

      setTasks((prev) =>
        prev.map((t) =>
          t.id === task.id
            ? {
              ...t,
              status: newStatus.toLowerCase() as Task["status"],
              completedDate: newStatus === "DONE" ? new Date() : undefined,
            }
            : t
        )
      );
      toast({
        title: newStatus === "DONE" ? "Task Completed" : "Task Reopened",
        description: `"${task.title}" has been ${newStatus === "DONE" ? "marked as complete" : "reopened"}.`,
      });
    } catch (error: any) {
      console.error('Failed to toggle task:', error);
      toast({
        title: 'Error',
        description: error.response?.data?.message || 'Failed to update task',
        variant: 'destructive',
      });
    }
  };

  const handleToggleStar = (task: Task) => {
    setTasks((prev) =>
      prev.map((t) => (t.id === task.id ? { ...t, isStarred: !t.isStarred } : t))
    );
  };

  const handleToggleSubtask = (subtaskId: string) => {
    if (!currentTask) return;

    setTasks((prev) =>
      prev.map((t) =>
        t.id === currentTask.id
          ? {
            ...t,
            subtasks: t.subtasks?.map((st) =>
              st.id === subtaskId ? { ...st, completed: !st.completed } : st
            ),
          }
          : t
      )
    );

    // Update current task for dialog
    setCurrentTask((prev) =>
      prev
        ? {
          ...prev,
          subtasks: prev.subtasks?.map((st) =>
            st.id === subtaskId ? { ...st, completed: !st.completed } : st
          ),
        }
        : null
    );
  };

  // Stats
  const todoCount = tasks.filter((t) => t.status === "todo").length;
  const inProgressCount = tasks.filter((t) => t.status === "in_progress").length;
  const inReviewCount = tasks.filter((t) => t.status === "in_review").length;
  const completedCount = tasks.filter((t) => t.status === "completed").length;

  return (
    <div className="flex min-h-screen bg-[#F8FAFC]">
      <Sidebar />

      <main className="flex-1 ml-0">
        {/* Header */}
        <header className="sticky top-0 z-30 bg-white/95 backdrop-blur-xl border-b border-[rgba(15,23,42,0.06)]">
          <div className="px-4 py-3 sm:px-6 sm:py-4 lg:px-8">
            <div className="flex items-center justify-between flex-wrap gap-3">
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Tasks</h1>
                <p className="text-[#94A3B8] text-sm sm:text-base">Manage and track your tasks</p>
              </div>

              <div className="flex items-center gap-2 sm:gap-3">
                {/* Mobile sidebar toggle */}
                <Button
                  variant="outline"
                  size="sm"
                  className="lg:hidden rounded-md"
                  onClick={() => setShowMobileSidebar(!showMobileSidebar)}
                >
                  <Filter size={16} className="mr-1" />
                  Filters
                </Button>

                {/* View Mode Toggle */}
                <div className="hidden sm:flex items-center bg-white/5 rounded-md p-1">
                  <Button
                    variant={viewMode === "list" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => setViewMode("list")}
                  >
                    <List size={16} className="mr-1" />
                    <span className="hidden md:inline">List</span>
                  </Button>
                  <Button
                    variant={viewMode === "grid" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => setViewMode("grid")}
                  >
                    <LayoutGrid size={16} className="mr-1" />
                    <span className="hidden md:inline">Grid</span>
                  </Button>
                  <Button
                    variant={viewMode === "kanban" ? "secondary" : "ghost"}
                    size="sm"
                    className="rounded-md"
                    onClick={() => setViewMode("kanban")}
                  >
                    <KanbanSquare size={16} className="mr-1" />
                    <span className="hidden md:inline">Kanban</span>
                  </Button>
                </div>

                <Button
                  onClick={() => {
                    setCurrentTask(null);
                    setIsFormOpen(true);
                  }}
                  className="bg-[#0891B2] hover:bg-[#0891B2]/90 text-white rounded-md gap-1 sm:gap-2"
                  size="sm"
                >
                  <Plus size={18} />
                  <span className="hidden sm:inline">Add Task</span>
                </Button>
              </div>
            </div>
          </div>
        </header>

        <div className="p-4 sm:p-6 lg:p-8">
          {/* Stats Cards */}
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-5 gap-3 sm:gap-4 lg:gap-6 mb-6 lg:mb-8">
            <StatCard
              title="Total Tasks"
              value={tasks.length}
              subtitle={`${taskCounts.completed} completed`}
              icon={ListTodo}
              color="#22D3EE"
            />
            <StatCard
              title="To Do"
              value={todoCount}
              icon={Circle}
              color="#64748B"
              delay={0.1}
            />
            <StatCard
              title="In Progress"
              value={inProgressCount}
              icon={Play}
              color="#3B82F6"
              delay={0.2}
            />
            <StatCard
              title="Overdue"
              value={taskCounts.overdue}
              icon={AlertCircle}
              color="#EF4444"
              delay={0.3}
            />
            <StatCard
              title="Completed"
              value={completedCount}
              trend={{ value: 12, label: "this week" }}
              icon={CheckCircle2}
              color="#10B981"
              delay={0.4}
            />
          </div>

          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 lg:gap-8">
            {/* Sidebar — hidden on mobile unless toggled */}
            <div className={cn(
              "lg:col-span-1",
              showMobileSidebar ? "block" : "hidden lg:block"
            )}>
              <TaskSidebar
                selectedProject={selectedProject}
                onSelectProject={setSelectedProject}
                selectedCategory={selectedCategory}
                onSelectCategory={setSelectedCategory}
                showCompleted={showCompleted}
                onToggleShowCompleted={() => setShowCompleted(!showCompleted)}
                showStarredOnly={showStarredOnly}
                onToggleStarredOnly={() => setShowStarredOnly(!showStarredOnly)}
                taskCounts={taskCounts}
                quickFilter={quickFilter}
                onSelectQuickFilter={(f) => setQuickFilter(f === quickFilter ? "" : f)}
                projects={projects}
              />
            </div>

            {/* Main Content */}
            <div className="lg:col-span-3">
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden"
              >
                {/* Tabs & Filters */}
                <div className="p-3 sm:p-4 border-b border-[rgba(15,23,42,0.06)]">
                  <Tabs value={activeTab} onValueChange={setActiveTab}>
                    <div className="flex items-center justify-between mb-3 sm:mb-4 overflow-x-auto">
                      <TabsList className="bg-white/5 rounded-md p-1 flex-shrink-0">
                        <TabsTrigger value="all" className="rounded-md data-[state=active]:bg-white">
                          All ({filteredTasks.length})
                        </TabsTrigger>
                        <TabsTrigger value="todo" className="rounded-md data-[state=active]:bg-white">
                          To Do ({todoCount})
                        </TabsTrigger>
                        <TabsTrigger value="in_progress" className="rounded-md data-[state=active]:bg-white">
                          In Progress ({inProgressCount})
                        </TabsTrigger>
                        <TabsTrigger value="in_review" className="rounded-md data-[state=active]:bg-white">
                          In Review ({inReviewCount})
                        </TabsTrigger>
                        <TabsTrigger value="completed" className="rounded-md data-[state=active]:bg-white">
                          Completed ({completedCount})
                        </TabsTrigger>
                      </TabsList>
                    </div>

                    {/* Search & Sort */}
                    <div className="flex items-center gap-3">
                      <div className="relative flex-1">
                        <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-[#475569]" />
                        <Input
                          value={searchQuery}
                          onChange={(e) => setSearchQuery(e.target.value)}
                          placeholder="Search tasks..."
                          className="pl-9 h-10 rounded-md border-[rgba(15,23,42,0.06)]"
                        />
                      </div>

                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="outline" className="rounded-md gap-2">
                            {sortOrder === "asc" ? <SortAsc size={16} /> : <SortDesc size={16} />}
                            Sort
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 rounded-md">
                          <DropdownMenuLabel>Sort by</DropdownMenuLabel>
                          <DropdownMenuSeparator />
                          <DropdownMenuCheckboxItem
                            checked={sortBy === "dueDate"}
                            onCheckedChange={() => setSortBy("dueDate")}
                            className="rounded-md"
                          >
                            Due Date
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={sortBy === "priority"}
                            onCheckedChange={() => setSortBy("priority")}
                            className="rounded-md"
                          >
                            Priority
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={sortBy === "created"}
                            onCheckedChange={() => setSortBy("created")}
                            className="rounded-md"
                          >
                            Created Date
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuCheckboxItem
                            checked={sortBy === "title"}
                            onCheckedChange={() => setSortBy("title")}
                            className="rounded-md"
                          >
                            Title
                          </DropdownMenuCheckboxItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
                            className="rounded-md"
                          >
                            {sortOrder === "asc" ? "Descending" : "Ascending"}
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    </div>
                  </Tabs>
                </div>

                {/* Content */}
                <AnimatePresence mode="wait">
                  {viewMode === "list" && (
                    <motion.div
                      key="list"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                    >
                      {filteredTasks.length === 0 ? (
                        <div className="p-12 text-center">
                          <ListTodo size={48} className="text-[#475569] mx-auto mb-3" />
                          <p className="text-[#94A3B8] font-medium">No tasks found</p>
                          <p className="text-[#475569] text-sm">Try adjusting your filters or create a new task</p>
                        </div>
                      ) : (
                        <div>
                          {filteredTasks.map((task) => (
                            <TaskListItem
                              key={task.id}
                              task={task}
                              onToggleComplete={() => handleToggleComplete(task)}
                              onToggleStar={() => handleToggleStar(task)}
                              onClick={() => {
                                setCurrentTask(task);
                                setIsDetailsOpen(true);
                              }}
                              onEdit={() => {
                                setCurrentTask(task);
                                setIsFormOpen(true);
                              }}
                              onDelete={() => {
                                setCurrentTask(task);
                                setIsDeleteAlertOpen(true);
                              }}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {viewMode === "grid" && (
                    <motion.div
                      key="grid"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-6"
                    >
                      {filteredTasks.length === 0 ? (
                        <div className="text-center py-12">
                          <ListTodo size={48} className="text-[#475569] mx-auto mb-3" />
                          <p className="text-[#94A3B8] font-medium">No tasks found</p>
                          <p className="text-[#475569] text-sm">Try adjusting your filters</p>
                        </div>
                      ) : (
                        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
                          {filteredTasks.map((task, index) => (
                            <TaskCard
                              key={task.id}
                              task={task}
                              onToggleComplete={() => handleToggleComplete(task)}
                              onToggleStar={() => handleToggleStar(task)}
                              onClick={() => {
                                setCurrentTask(task);
                                setIsDetailsOpen(true);
                              }}
                              onEdit={() => {
                                setCurrentTask(task);
                                setIsFormOpen(true);
                              }}
                              onDelete={() => {
                                setCurrentTask(task);
                                setIsDeleteAlertOpen(true);
                              }}
                              delay={index * 0.05}
                            />
                          ))}
                        </div>
                      )}
                    </motion.div>
                  )}

                  {viewMode === "kanban" && (
                    <motion.div
                      key="kanban"
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className="p-6 overflow-x-auto"
                    >
                      <div className="flex gap-6 min-w-max">
                        {taskStatuses.slice(0, -1).map((status) => (
                          <KanbanColumn
                            key={status.id}
                            status={status}
                            tasks={tasksByStatus[status.id] || []}
                            onTaskClick={(task) => {
                              setCurrentTask(task);
                              setIsDetailsOpen(true);
                            }}
                            onToggleComplete={handleToggleComplete}
                            onToggleStar={handleToggleStar}
                            onEdit={(task) => {
                              setCurrentTask(task);
                              setIsFormOpen(true);
                            }}
                            onDelete={(task) => {
                              setCurrentTask(task);
                              setIsDeleteAlertOpen(true);
                            }}
                            onStatusChange={handleKanbanStatusChange}
                          />
                        ))}
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            </div>
          </div>
        </div>
      </main>

      {/* Dialogs */}
      <TaskFormDialog
        isOpen={isFormOpen}
        onClose={() => {
          setIsFormOpen(false);
          setCurrentTask(null);
        }}
        task={currentTask}
        onSubmit={currentTask ? handleEditTask : handleAddTask}
        projects={projects}
      />

      <TaskDetailsDialog
        isOpen={isDetailsOpen}
        onClose={() => {
          setIsDetailsOpen(false);
          setCurrentTask(null);
        }}
        task={currentTask}
        onEdit={() => {
          setIsDetailsOpen(false);
          setIsFormOpen(true);
        }}
        onDelete={() => {
          setIsDeleteAlertOpen(true);
        }}
        onToggleComplete={() => {
          if (currentTask) {
            handleToggleComplete(currentTask);
          }
        }}
        onToggleStar={() => {
          if (currentTask) {
            handleToggleStar(currentTask);
            setCurrentTask((prev) => (prev ? { ...prev, isStarred: !prev.isStarred } : null));
          }
        }}
        onToggleSubtask={handleToggleSubtask}
      />

      <AlertDialog open={isDeleteAlertOpen} onOpenChange={setIsDeleteAlertOpen}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Delete Task</AlertDialogTitle>
            <AlertDialogDescription>
              Are you sure you want to delete "{currentTask?.title}"? This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={handleDeleteTask}
              className="bg-red-500 hover:bg-red-600 rounded-md"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
};

export default TasksPage;