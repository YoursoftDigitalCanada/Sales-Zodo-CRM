import { type ElementType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  CheckCircle2,
  ChevronLeft,
  ChevronRight,
  CircleDollarSign,
  ClipboardList,
  Eye,
  Filter,
  HardHat,
  LayoutGrid,
  List,
  MoreHorizontal,
  MoreVertical,
  Pencil,
  Plus,
  RefreshCw,
  Search,
  SlidersHorizontal,
  Trash2,
  TrendingUp,
  MapPin,
  Calendar,
  DollarSign,
  Users,
  Building2,
} from "lucide-react";
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
  Drawer,
  DrawerContent,
  DrawerDescription,
  DrawerFooter,
  DrawerHeader,
  DrawerTitle,
} from "@/components/ui/drawer";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useToast } from "@/components/ui/use-toast";
import {
  ProjectEntity,
  deleteProjectById,
  getProjects,
  updateProjectStatus,
} from "@/features/projects";
import {
  ROOFING_STAGE_ORDER,
  buildStageBreakdown,
  formatCurrency,
  formatRelativeTimeline,
  formatTimelineDate,
  getActualCost,
  getContractValue,
  getGrossProfit,
  getNextAction,
  getProjectClientName,
  getProjectCode,
  getProjectJobType,
  getProjectPriorityLabel,
  getProjectProgress,
  getProjectSite,
  getRoofingStage,
  getRoofingStageMeta,
} from "@/features/projects/roofing-operations";
import { cn } from "@/lib/utils";
import { useIsMobile } from "@/hooks/useIsMobile";
import { SwipeActionCard } from "@/features/clients/components/responsive-helpers";

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

// ============================================
// STAT CARD (matches Client List pattern)
// ============================================

const StatCard = ({
  title,
  value,
  subtitle,
  trend,
  icon: Icon,
  color,
  delay = 0,
}: {
  title: string;
  value: string | number;
  subtitle: string;
  trend?: number;
  icon: React.ElementType;
  color: "teal" | "gold" | "navy" | "green" | "red" | "purple";
  delay?: number;
}) => {
  const colorClasses = {
    teal: { bg: "bg-[#0891B2]", light: "bg-[#0891B2]/10", text: "text-[#0891B2]" },
    gold: { bg: "bg-[#D97706]", light: "bg-[#D97706]/10", text: "text-[#D97706]" },
    navy: { bg: "bg-[#F8FAFC]", light: "bg-[#F8FAFC]/10", text: "text-[#0F172A]" },
    purple: { bg: "bg-purple-500", light: "bg-purple-500/10", text: "text-purple-500" },
    green: { bg: "bg-emerald-500", light: "bg-emerald-500/10", text: "text-emerald-500" },
    red: { bg: "bg-red-500", light: "bg-red-500/10", text: "text-red-500" },
  };

  const colors = colorClasses[color];

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay }}
      whileHover={{ y: -4 }}
      className="relative bg-white rounded-md p-5 border border-[rgba(15,23,42,0.06)] hover:border-[#22D3EE]/30 hover:shadow-lg transition-all overflow-hidden group"
    >
      <div className={cn("absolute -right-4 -top-4 w-20 h-20 rounded-full opacity-10 group-hover:opacity-20 transition-all", colors.bg)} />

      <div className="relative flex items-start justify-between">
        <div>
          <p className="text-sm text-[#94A3B8] mb-1">{title}</p>
          <p className="text-xl sm:text-2xl font-bold text-[#0F172A]">{value}</p>
          <p className="text-xs text-[#475569] mt-1">{subtitle}</p>
        </div>
        <div className="flex flex-col items-end gap-2">
          <div className={cn("w-10 h-10 rounded-md flex items-center justify-center", colors.light)}>
            <Icon size={18} className={colors.text} />
          </div>
          {trend !== undefined && (
            <div className={cn(
              "flex items-center gap-1 text-xs font-medium",
              trend >= 0 ? "text-emerald-600" : "text-red-600"
            )}>
              {trend >= 0 ? <ArrowUpRight size={12} /> : <ArrowDownRight size={12} />}
              {Math.abs(trend)}%
            </div>
          )}
        </div>
      </div>
    </motion.div>
  );
};

// ============================================
// PROJECT ROW COMPONENT (Table view — matches Client List row)
// ============================================

const ProjectRow = ({
  project,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: {
  project: ProjectEntity;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const stage = getRoofingStage(project);
  const stageMeta = getRoofingStageMeta(stage);
  const progress = getProjectProgress(project);
  const clientName = getProjectClientName(project);
  const site = getProjectSite(project);
  const contractVal = getContractValue(project);
  const profit = getGrossProfit(project);
  const dueDate = project.estimatedEndDate ?? project.dueDate ?? project.endDate;
  const priorityLabel = getProjectPriorityLabel(project);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

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

      {/* Project Name & Client */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-3">
          <div className="relative">
            <div className="w-10 h-10 rounded-md bg-[#F1F5F9]/70 flex items-center justify-center text-[#0F172A] font-semibold text-sm">
              {getInitials(project.name || "P")}
            </div>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full border-2 border-white",
                stage === "completed" || stage === "invoiced" ? "bg-emerald-500" :
                stage === "production" ? "bg-[#0891B2]" :
                stage === "on_hold" ? "bg-[#D97706]" : "bg-slate-400"
              )}
            />
          </div>
          <div>
            <div className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors">
              {project.name}
            </div>
            <div className="flex items-center gap-2 text-xs text-[#475569]">
              {clientName && (
                <>
                  <Building2 size={12} className="text-[#0891B2]" />
                  <span className="font-medium text-[#0F172A]">{clientName}</span>
                  <span>•</span>
                </>
              )}
              <span>{getProjectCode(project)}</span>
            </div>
          </div>
        </div>
      </td>

      {/* Stage */}
      <td className="py-4 px-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          stageMeta.softBg, stageMeta.accentText
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", stageMeta.accentText.replace("text-", "bg-"))} />
          {stageMeta.label}
        </span>
      </td>

      {/* Priority */}
      <td className="py-4 px-4">
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-medium",
          priorityLabel === "High" || priorityLabel === "Urgent" || priorityLabel === "Emergency"
            ? "bg-red-100 text-red-700"
            : priorityLabel === "Medium"
            ? "bg-[#D97706]/10 text-[#D97706]"
            : "bg-[#F1F5F9] text-[#475569]"
        )}>
          {priorityLabel}
        </span>
      </td>

      {/* Contract Value */}
      <td className="py-4 px-4">
        <span className="font-medium text-[#0F172A]">{formatCurrency(contractVal)}</span>
      </td>

      {/* Profit */}
      <td className="py-4 px-4">
        <span className={cn("font-semibold", profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-[#475569]")}>
          {formatCurrency(profit)}
        </span>
      </td>

      {/* Site */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 text-sm text-[#475569]">
          <MapPin size={14} className="text-[#475569] shrink-0" />
          <span className="truncate max-w-[140px]">{site || "-"}</span>
        </div>
      </td>

      {/* Due Date */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2 text-sm text-[#475569]">
          <Calendar size={14} className="text-[#475569]" />
          <span>{formatTimelineDate(dueDate)}</span>
        </div>
      </td>

      {/* Progress */}
      <td className="py-4 px-4">
        <div className="flex items-center gap-2">
          <div className="w-16 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full", progress >= 100 ? "bg-emerald-500" : "bg-[#0891B2]")}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-[#475569] font-medium">{progress}%</span>
        </div>
      </td>

      {/* Actions */}
      <td className="py-4 px-4" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-end gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onView}
            className="p-2 rounded-md hover:bg-[#0891B2]/10 text-[#0891B2] transition-colors"
            title="View"
          >
            <Eye size={16} />
          </motion.button>
          <motion.button
            whileHover={{ scale: 1.1 }}
            whileTap={{ scale: 0.9 }}
            onClick={onEdit}
            className="p-2 rounded-md hover:bg-[#D97706]/10 text-[#D97706] transition-colors"
            title="Edit"
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
              <DropdownMenuItem className="rounded-md" onClick={onView}>
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md" onClick={onEdit}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md text-red-600 focus:text-red-600 focus:bg-red-50" onClick={onDelete}>
                <Trash2 size={14} className="mr-2" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </td>
    </motion.tr>
  );
};

// ============================================
// PROJECT CARD (Grid view — matches Client List card)
// ============================================

const ProjectCard = ({
  project,
  isSelected,
  onSelect,
  onView,
  onEdit,
  onDelete,
}: {
  project: ProjectEntity;
  isSelected: boolean;
  onSelect: (checked: boolean) => void;
  onView: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) => {
  const stage = getRoofingStage(project);
  const stageMeta = getRoofingStageMeta(stage);
  const progress = getProjectProgress(project);
  const clientName = getProjectClientName(project);
  const site = getProjectSite(project);
  const contractVal = getContractValue(project);
  const profit = getGrossProfit(project);
  const dueDate = project.estimatedEndDate ?? project.dueDate ?? project.endDate;
  const priorityLabel = getProjectPriorityLabel(project);

  const getInitials = (name: string) =>
    name.split(" ").map((n) => n[0]).join("").toUpperCase().slice(0, 2);

  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, scale: 0.9 }}
      whileHover={{ y: -4 }}
      className={cn(
        "bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5 cursor-pointer group",
        "hover:border-[#22D3EE]/30 hover:shadow-lg transition-all",
        isSelected && "border-[#22D3EE] bg-[#0891B2]/5"
      )}
      onClick={onView}
    >
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <Checkbox
            checked={isSelected}
            onCheckedChange={onSelect}
            onClick={(e) => e.stopPropagation()}
            className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
          />
          <div className="relative">
            <div className="w-12 h-12 rounded-md bg-[#F1F5F9]/70 flex items-center justify-center text-[#0F172A] font-semibold">
              {getInitials(project.name || "P")}
            </div>
            <div
              className={cn(
                "absolute -bottom-0.5 -right-0.5 w-3.5 h-3.5 rounded-full border-2 border-white",
                stage === "completed" || stage === "invoiced" ? "bg-emerald-500" :
                stage === "production" ? "bg-[#0891B2]" :
                stage === "on_hold" ? "bg-[#D97706]" : "bg-slate-400"
              )}
            />
          </div>
        </div>

        <div className="flex items-center gap-1" onClick={(e) => e.stopPropagation()}>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="p-1.5 rounded-md hover:bg-white/10 text-[#475569]">
                <MoreHorizontal size={16} />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 rounded-md">
              <DropdownMenuItem className="rounded-md" onClick={onView}>
                <Eye size={14} className="mr-2" /> View Details
              </DropdownMenuItem>
              <DropdownMenuItem className="rounded-md" onClick={onEdit}>
                <Pencil size={14} className="mr-2" /> Edit
              </DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem className="rounded-md text-red-600 focus:text-red-600" onClick={onDelete}>
                <Trash2 size={14} className="mr-2" /> Archive
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
      </div>

      {/* Project Info */}
      <div className="mb-4">
        <h3 className="font-semibold text-[#0F172A] group-hover:text-[#0891B2] transition-colors mb-1">
          {project.name}
        </h3>
        <div className="flex items-center gap-2 text-xs text-[#475569]">
          {clientName && (
            <>
              <Building2 size={12} className="text-[#0891B2]" />
              <span className="font-medium text-[#0F172A]">{clientName}</span>
              <span>•</span>
            </>
          )}
          <span>{getProjectCode(project)}</span>
        </div>
      </div>

      {/* Stage & Priority */}
      <div className="flex items-center gap-2 mb-4">
        <span className={cn(
          "inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-xs font-semibold",
          stageMeta.softBg, stageMeta.accentText
        )}>
          <span className={cn("w-1.5 h-1.5 rounded-full", stageMeta.accentText.replace("text-", "bg-"))} />
          {stageMeta.label}
        </span>
        <span className={cn(
          "px-2 py-0.5 rounded-full text-[10px] font-medium",
          priorityLabel === "High" || priorityLabel === "Urgent" || priorityLabel === "Emergency"
            ? "bg-red-100 text-red-700"
            : priorityLabel === "Medium"
            ? "bg-[#D97706]/10 text-[#D97706]"
            : "bg-[#F1F5F9] text-[#475569]"
        )}>
          {priorityLabel}
        </span>
      </div>

      {/* Details Grid */}
      <div className="space-y-2 mb-4">
        <div className="flex items-center gap-2 text-sm text-[#475569]">
          <MapPin size={14} className="text-[#475569] shrink-0" />
          <span className="truncate">{site || "-"}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-[#475569]">
          <Calendar size={14} className="text-[#475569]" />
          <span>{formatTimelineDate(dueDate)} ({formatRelativeTimeline(dueDate)})</span>
        </div>
      </div>

      {/* Bottom Section: Financial & Progress */}
      <div className="pt-3 border-t border-[rgba(15,23,42,0.06)]">
        <div className="grid grid-cols-2 gap-3 mb-3">
          <div>
            <p className="text-xs text-[#94A3B8]">Contract</p>
            <p className="text-sm font-semibold text-[#0F172A]">{formatCurrency(contractVal)}</p>
          </div>
          <div>
            <p className="text-xs text-[#94A3B8]">Gross Profit</p>
            <p className={cn("text-sm font-semibold", profit > 0 ? "text-emerald-600" : profit < 0 ? "text-red-600" : "text-[#475569]")}>
              {formatCurrency(profit)}
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <div className="flex-1 h-1.5 bg-[#F1F5F9] rounded-full overflow-hidden">
            <div
              className={cn("h-full rounded-full transition-all", progress >= 100 ? "bg-emerald-500" : "bg-[#0891B2]")}
              style={{ width: `${Math.min(progress, 100)}%` }}
            />
          </div>
          <span className="text-xs text-[#475569] font-medium">{progress}%</span>
        </div>
      </div>
    </motion.div>
  );
};

const MobileJobCard = ({
  project,
  onView,
  onArchive,
}: {
  project: ProjectEntity;
  onView: () => void;
  onArchive: () => void;
}) => {
  const stage = getRoofingStage(project);
  const stageMeta = getRoofingStageMeta(stage);
  const clientName = getProjectClientName(project);
  const dueDate = project.estimatedEndDate ?? project.dueDate ?? project.endDate;

  return (
    <SwipeActionCard
      onView={onView}
      onDelete={onArchive}
      primaryLabel="View"
      secondaryLabel="Archive"
    >
      <div
        className="rounded-2xl border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm"
        onClick={onView}
      >
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate text-base font-semibold text-[#0F172A]">{project.name}</p>
            <p className="mt-1 truncate text-sm text-[#475569]">{clientName || "No client assigned"}</p>
          </div>
          <Badge className={cn("rounded-full border px-2.5 py-1 text-[11px] font-semibold", stageMeta.border, stageMeta.softBg, stageMeta.accentText)}>
            {stageMeta.label}
          </Badge>
        </div>

        <div className="mt-4 grid grid-cols-2 gap-3">
          <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Status</p>
            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{getProjectPriorityLabel(project)}</p>
          </div>
          <div className="rounded-xl bg-[#F8FAFC] px-3 py-2">
            <p className="text-[10px] uppercase tracking-wider text-[#94A3B8]">Due Date</p>
            <p className="mt-1 text-sm font-semibold text-[#0F172A]">{formatTimelineDate(dueDate)}</p>
          </div>
        </div>
      </div>
    </SwipeActionCard>
  );
};

// ============================================
// LOADING SKELETONS
// ============================================

function ProjectsLoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <div key={index} className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-5">
          <Skeleton className="h-12 w-12 rounded-md" />
          <Skeleton className="h-5 w-3/5 rounded-md mt-3" />
          <Skeleton className="h-4 w-1/2 rounded-md mt-2" />
          <Skeleton className="h-8 w-full rounded-md mt-4" />
          <Skeleton className="h-8 w-full rounded-md mt-2" />
          <Skeleton className="h-2 w-full rounded-full mt-3" />
        </div>
      ))}
    </div>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <div className="bg-white rounded-md border border-dashed border-[rgba(15,23,42,0.18)] p-16 text-center">
      <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-md bg-[#0891B2]/10 text-[#0891B2]">
        <HardHat className="h-6 w-6" />
      </div>
      <h3 className="mt-5 text-lg font-semibold text-[#0F172A]">No roofing jobs match this view</h3>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
        Adjust the stage filters or create a new roofing job to start tracking inspections, permits, production, and profit.
      </p>
      <Button onClick={onCreate} className="mt-5 rounded-md bg-[#0891B2] hover:bg-[#0E7490]">
        <Plus className="mr-2 h-4 w-4" />
        Create Roofing Job
      </Button>
    </div>
  );
}

// ============================================
// MAIN PAGE COMPONENT
// ============================================

type ViewMode = "grid" | "table";
const PRIORITY_OPTIONS = ["ALL", "Low", "Medium", "High"] as const;
type JobsTab = "active" | "archived" | "templates";

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();
  const { isMobile } = useIsMobile();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("ALL");
  const [viewMode, setViewMode] = useState<ViewMode>("grid");
  const [jobsTab, setJobsTab] = useState<JobsTab>("active");
  const [selectedProjects, setSelectedProjects] = useState<Set<string | number>>(new Set());
  const [pendingDelete, setPendingDelete] = useState<ProjectEntity | null>(null);
  const [filtersOpen, setFiltersOpen] = useState(false);

  const debouncedSearch = useDebouncedValue(search, 250);

  const projectsQuery = useQuery({
    queryKey: ["projects", "roofing-operations-board"],
    queryFn: () =>
      getProjects({
        page: 1,
        limit: 200,
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  const archiveMutation = useMutation({
    mutationFn: (id: string | number) => deleteProjectById(id),
    onSuccess: () => {
      setPendingDelete(null);
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({ title: "Roofing job archived", description: "The job was removed from the active operations board." });
    },
    onError: () => {
      toast({ title: "Archive failed", description: "The job could not be archived right now.", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) => updateProjectStatus(id, status as never),
    onSuccess: (_, variables) => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      toast({
        title: "Job updated",
        description: variables.status === "COMPLETED" ? "The job is now marked complete." : "The job moved into active production.",
      });
    },
    onError: () => {
      toast({ title: "Update failed", description: "The job could not be updated.", variant: "destructive" });
    },
  });

  const allProjects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const jobTypeOptions = useMemo(() => {
    const values = Array.from(new Set(allProjects.map((project) => getProjectJobType(project)).filter(Boolean)));
    return ["ALL", ...values.sort((a, b) => a.localeCompare(b))];
  }, [allProjects]);

  const tabCounts = useMemo(() => {
    return allProjects.reduce(
      (acc, project) => {
        const rawStatus = String(project.status || "").toUpperCase();
        if (rawStatus === "ARCHIVED") {
          acc.archived += 1;
        } else if (rawStatus === "DRAFT") {
          acc.templates += 1;
        } else {
          acc.active += 1;
        }
        return acc;
      },
      { active: 0, archived: 0, templates: 0 }
    );
  }, [allProjects]);

  const filteredProjects = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();

    return allProjects.filter((project) => {
      const rawStatus = String(project.status || "").toUpperCase();
      const isArchivedJob = rawStatus === "ARCHIVED";
      const isTemplateJob = rawStatus === "DRAFT";
      const matchesTab =
        jobsTab === "active"
          ? !isArchivedJob && !isTemplateJob
          : jobsTab === "archived"
          ? isArchivedJob
          : isTemplateJob;

      const stage = getRoofingStage(project);
      const priority = getProjectPriorityLabel(project);
      const jobType = getProjectJobType(project);
      const searchableText = [project.name, getProjectClientName(project), getProjectCode(project)]
        .join(" ").toLowerCase();

      const matchesSearch = !needle || searchableText.includes(needle);
      const matchesStage = stageFilter === "ALL" || stage === stageFilter;
      const matchesPriority = priorityFilter === "ALL" || priority === priorityFilter;
      const matchesJobType = jobTypeFilter === "ALL" || jobType === jobTypeFilter;

      return matchesTab && matchesSearch && matchesStage && matchesPriority && matchesJobType;
    });
  }, [allProjects, debouncedSearch, jobTypeFilter, jobsTab, priorityFilter, stageFilter]);

  const orderedProjects = useMemo(() => {
    return [...filteredProjects].sort((first, second) => {
      const firstDue = new Date(first.estimatedEndDate ?? first.dueDate ?? first.endDate ?? first.createdAt ?? 0).getTime();
      const secondDue = new Date(second.estimatedEndDate ?? second.dueDate ?? second.endDate ?? second.createdAt ?? 0).getTime();
      const firstOverdue = firstDue > 0 && firstDue < Date.now();
      const secondOverdue = secondDue > 0 && secondDue < Date.now();

      if (firstOverdue !== secondOverdue) return firstOverdue ? -1 : 1;

      const firstStage = ROOFING_STAGE_ORDER.indexOf(getRoofingStage(first));
      const secondStage = ROOFING_STAGE_ORDER.indexOf(getRoofingStage(second));
      if (firstStage !== secondStage) return firstStage - secondStage;

      return firstDue - secondDue;
    });
  }, [filteredProjects]);

  const hasActiveFilters =
    debouncedSearch.trim().length > 0 ||
    stageFilter !== "ALL" ||
    priorityFilter !== "ALL" ||
    jobTypeFilter !== "ALL";

  const metricsProjects = hasActiveFilters ? filteredProjects : allProjects;
  const totalContractValue = metricsProjects.reduce((sum, project) => sum + getContractValue(project), 0);
  const totalActualCost = metricsProjects.reduce((sum, project) => sum + getActualCost(project), 0);
  const totalGrossProfit = metricsProjects.reduce((sum, project) => sum + getGrossProfit(project), 0);
  const productionCount = metricsProjects.filter((project) => getRoofingStage(project) === "production").length;
  const completedCount = metricsProjects.filter((project) => {
    const stage = getRoofingStage(project);
    return stage === "completed" || stage === "invoiced";
  }).length;

  const toggleSelect = (id: string | number) => {
    setSelectedProjects((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id); else next.add(id);
      return next;
    });
  };

  const toggleSelectAll = (checked: boolean) => {
    if (checked) {
      setSelectedProjects(new Set(orderedProjects.map((p) => p.id)));
    } else {
      setSelectedProjects(new Set());
    }
  };

  const allSelected = orderedProjects.length > 0 && selectedProjects.size === orderedProjects.length;

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-24 md:pb-0">
      <main className="flex-1 transition-all duration-300">
        {/* ============================================ */}
        {/* HEADER — matches Client List header */}
        {/* ============================================ */}
        <header className="crm-module-header sticky top-0 z-30 backdrop-blur-xl bg-white/80 border-b border-[rgba(15,23,42,0.06)]/50">
          <div className="flex h-16 items-center justify-between px-6">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2 text-sm">
                <span className="text-[#475569]">CRM</span>
                <ChevronRight size={16} className="text-[#475569]" />
                <span className="font-medium text-[#0F172A]">Roofing Projects</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <motion.button
                whileHover={{ scale: 1.05 }}
                whileTap={{ scale: 0.95 }}
                onClick={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
                className="p-2 rounded-md hover:bg-white/10 text-[#475569] transition-colors"
                title="Refresh"
              >
                <RefreshCw size={18} />
              </motion.button>
              <Button
                onClick={() => navigate("/projects/add")}
                className={cn("bg-[#0891B2] hover:bg-[#0E7490] text-white rounded-md shadow-sm", isMobile && "hidden")}
              >
                <Plus size={18} className="mr-2" />
                Create Roofing Job
              </Button>
            </div>
          </div>
        </header>

        <div className="px-6 py-6 max-w-[1600px] mx-auto">
          {/* ============================================ */}
          {/*  TITLE SECTION */}
          {/* ============================================ */}
          <div className="mb-6">
            <div className="flex items-center gap-3 mb-2">
              <div className="w-10 h-10 rounded-md bg-[#0891B2]/10 flex items-center justify-center">
                <HardHat size={20} className="text-[#0891B2]" />
              </div>
              <div>
                <h1 className="text-xl sm:text-2xl font-bold text-[#0F172A]">Roofing Projects</h1>
                <p className="text-sm text-[#94A3B8]">
                  {allProjects.length} total projects • Manage inspections, insurance, permits, and production
                </p>
              </div>
            </div>
          </div>

          {isMobile && (
            <div className="mb-4 overflow-x-auto">
              <Tabs value={jobsTab} onValueChange={(value) => setJobsTab(value as JobsTab)}>
                <TabsList className="inline-flex w-max rounded-2xl bg-white p-1">
                  <TabsTrigger value="active" className="rounded-xl px-4">
                    Active ({tabCounts.active})
                  </TabsTrigger>
                  <TabsTrigger value="archived" className="rounded-xl px-4">
                    Archived ({tabCounts.archived})
                  </TabsTrigger>
                  <TabsTrigger value="templates" className="rounded-xl px-4">
                    Templates ({tabCounts.templates})
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          )}

          {/* ============================================ */}
          {/* STAT CARDS — matches Client List */}
          {/* ============================================ */}
          <div className={cn(
            "mb-6",
            isMobile ? "flex gap-3 overflow-x-auto pb-2" : "grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6"
          )}>
            {[
              { title: "Total Jobs", value: metricsProjects.length, subtitle: "Across portfolio", icon: ClipboardList, color: "teal" as const, delay: 0 },
              { title: "In Production", value: productionCount, subtitle: "In field execution", icon: HardHat, color: "gold" as const, delay: 0.05 },
              { title: "Completed", value: completedCount, subtitle: "Finished / invoiced", icon: CheckCircle2, color: "green" as const, delay: 0.1 },
              { title: "Contract Value", value: formatCurrency(totalContractValue), subtitle: "Total booked revenue", icon: CircleDollarSign, color: "navy" as const, delay: 0.15 },
              { title: "Actual Cost", value: formatCurrency(totalActualCost), subtitle: "Materials & labor", icon: AlertCircle, color: "red" as const, delay: 0.2 },
              { title: "Gross Profit", value: formatCurrency(totalGrossProfit), subtitle: "Contract minus cost", icon: TrendingUp, color: "green" as const, delay: 0.25 },
            ].map((card) => (
              <div key={card.title} className={cn(isMobile && "min-w-[220px] flex-shrink-0")}>
                <StatCard {...card} />
              </div>
            ))}
          </div>

          {/* ============================================ */}
          {/* TOOLBAR — matches Client List toolbar */}
          {/* ============================================ */}
          <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] p-4 mb-6">
            <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">

              {/* Left side: Search + Filters */}
              <div className="flex flex-1 flex-col gap-3 md:flex-row md:items-center">
                <div className="relative flex-1 max-w-md">
                  <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                  <Input
                    value={search}
                    onChange={(e) => setSearch(e.target.value)}
                    placeholder="Search jobs, clients, codes..."
                    className="pl-9 rounded-md border-[rgba(15,23,42,0.1)]"
                  />
                </div>

                <div className="flex items-center gap-2 flex-wrap">
                  {isMobile ? (
                    <Button variant="outline" className="rounded-md" onClick={() => setFiltersOpen(true)}>
                      <Filter size={16} className="mr-2" />
                      Filters
                    </Button>
                  ) : (
                    <>
                      <Select value={stageFilter} onValueChange={setStageFilter}>
                        <SelectTrigger className="w-[140px] rounded-md border-[rgba(15,23,42,0.1)]">
                          <SelectValue placeholder="Stage" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          <SelectItem value="ALL">All Stages</SelectItem>
                          {ROOFING_STAGE_ORDER.map((stageKey) => (
                            <SelectItem key={stageKey} value={stageKey}>
                              {getRoofingStageMeta(stageKey).label}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                        <SelectTrigger className="w-[140px] rounded-md border-[rgba(15,23,42,0.1)]">
                          <SelectValue placeholder="Job Type" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          {jobTypeOptions.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option === "ALL" ? "All Job Types" : option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>

                      <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                        <SelectTrigger className="w-[140px] rounded-md border-[rgba(15,23,42,0.1)]">
                          <SelectValue placeholder="Priority" />
                        </SelectTrigger>
                        <SelectContent className="rounded-md">
                          {PRIORITY_OPTIONS.map((option) => (
                            <SelectItem key={option} value={option}>
                              {option === "ALL" ? "All Priorities" : option}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </>
                  )}

                  {hasActiveFilters && (
                    <Button
                      variant="outline"
                      size="sm"
                      className="rounded-md text-[#0891B2] border-[#0891B2]/30 hover:bg-[#0891B2]/5"
                      onClick={() => {
                        setSearch("");
                        setStageFilter("ALL");
                        setPriorityFilter("ALL");
                        setJobTypeFilter("ALL");
                      }}
                    >
                      Clear Filters
                    </Button>
                  )}
                </div>
              </div>

              {/* Right side: View toggle */}
              <div className={cn("flex items-center gap-2", isMobile && "hidden")}>
                <div className="flex items-center border border-[rgba(15,23,42,0.1)] rounded-md overflow-hidden">
                  <button
                    onClick={() => setViewMode("grid")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "grid"
                        ? "bg-[#0891B2] text-white"
                        : "bg-white text-[#475569] hover:bg-[#F1F5F9]"
                    )}
                  >
                    <LayoutGrid size={16} />
                  </button>
                  <button
                    onClick={() => setViewMode("table")}
                    className={cn(
                      "p-2 transition-colors",
                      viewMode === "table"
                        ? "bg-[#0891B2] text-white"
                        : "bg-white text-[#475569] hover:bg-[#F1F5F9]"
                    )}
                  >
                    <List size={16} />
                  </button>
                </div>
              </div>
            </div>

            {/* Bulk Actions (when selected) */}
            <AnimatePresence>
              {selectedProjects.size > 0 && (
                <motion.div
                  initial={{ opacity: 0, height: 0 }}
                  animate={{ opacity: 1, height: "auto" }}
                  exit={{ opacity: 0, height: 0 }}
                  className="mt-3 pt-3 border-t border-[rgba(15,23,42,0.06)] flex items-center gap-3"
                >
                  <span className="text-sm font-medium text-[#0891B2]">
                    {selectedProjects.size} selected
                  </span>
                  <Button
                    size="sm"
                    variant="outline"
                    className="rounded-md text-red-600 border-red-200 hover:bg-red-50"
                    onClick={() => {
                      // Could add bulk delete
                      setSelectedProjects(new Set());
                    }}
                  >
                    <Trash2 size={14} className="mr-1" /> Clear Selection
                  </Button>
                </motion.div>
              )}
            </AnimatePresence>
          </div>

          {/* ============================================ */}
          {/* PROJECT LIST / GRID */}
          {/* ============================================ */}
          <div className="bg-white rounded-md border border-[rgba(15,23,42,0.06)] overflow-hidden">
            {projectsQuery.isLoading ? (
              <div className="p-6">
                <ProjectsLoadingGrid />
              </div>
            ) : orderedProjects.length === 0 ? (
              <div className="p-6">
                <EmptyState onCreate={() => navigate("/projects/add")} />
              </div>
            ) : isMobile ? (
              <div className="p-4 space-y-3">
                {orderedProjects.map((project) => (
                  <MobileJobCard
                    key={project.id}
                    project={project}
                    onView={() => navigate(`/projects/${project.id}`)}
                    onArchive={() => setPendingDelete(project)}
                  />
                ))}
              </div>
            ) : viewMode === "table" ? (
              /* TABLE VIEW */
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/60">
                      <th className="py-3 px-4 text-left">
                        <Checkbox
                          checked={allSelected}
                          onCheckedChange={toggleSelectAll}
                          className="border-slate-300 data-[state=checked]:bg-[#0891B2] data-[state=checked]:border-[#22D3EE]"
                        />
                      </th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Project</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Stage</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Priority</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Contract</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Profit</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Site</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Due</th>
                      <th className="py-3 px-4 text-left text-xs font-semibold uppercase tracking-wider text-[#64748B]">Progress</th>
                      <th className="py-3 px-4"></th>
                    </tr>
                  </thead>
                  <tbody>
                    <AnimatePresence>
                      {orderedProjects.map((project) => (
                        <ProjectRow
                          key={project.id}
                          project={project}
                          isSelected={selectedProjects.has(project.id)}
                          onSelect={() => toggleSelect(project.id)}
                          onView={() => navigate(`/projects/${project.id}`)}
                          onEdit={() => navigate(`/projects/${project.id}/edit`)}
                          onDelete={() => setPendingDelete(project)}
                        />
                      ))}
                    </AnimatePresence>
                  </tbody>
                </table>
              </div>
            ) : (
              /* GRID VIEW */
              <div className="p-6">
                <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
                  <AnimatePresence>
                    {orderedProjects.map((project) => (
                      <ProjectCard
                        key={project.id}
                        project={project}
                        isSelected={selectedProjects.has(project.id)}
                        onSelect={() => toggleSelect(project.id)}
                        onView={() => navigate(`/projects/${project.id}`)}
                        onEdit={() => navigate(`/projects/${project.id}/edit`)}
                        onDelete={() => setPendingDelete(project)}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </div>
            )}

            {/* Footer / Results count */}
            <div className="px-4 py-3 border-t border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]/60 flex items-center justify-between text-sm text-[#64748B]">
              <span>Showing {orderedProjects.length} of {allProjects.length} projects</span>
              <span>{selectedProjects.size > 0 ? `${selectedProjects.size} selected` : ""}</span>
            </div>
          </div>
        </div>
      </main>

      {isMobile && (
        <Button
          size="icon"
          className="fixed bottom-6 right-5 z-40 h-14 w-14 rounded-full bg-[#0891B2] shadow-[0_16px_36px_rgba(8,145,178,0.35)] hover:bg-[#0E7490]"
          onClick={() => navigate("/projects/add")}
        >
          <Plus size={22} />
        </Button>
      )}

      <Drawer open={isMobile && filtersOpen} onOpenChange={setFiltersOpen}>
        <DrawerContent className="max-h-[85dvh]">
          <DrawerHeader>
            <DrawerTitle>Filter Jobs</DrawerTitle>
            <DrawerDescription>Refine active, archived, or template jobs on mobile.</DrawerDescription>
          </DrawerHeader>
          <div className="space-y-4 px-4 pb-4">
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#475569]">Stage</label>
              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  <SelectItem value="ALL">All Stages</SelectItem>
                  {ROOFING_STAGE_ORDER.map((stageKey) => (
                    <SelectItem key={stageKey} value={stageKey}>
                      {getRoofingStageMeta(stageKey).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#475569]">Job Type</label>
              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {jobTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL" ? "All Job Types" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <label className="text-xs font-medium text-[#475569]">Priority</label>
              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="rounded-md">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-md">
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL" ? "All Priorities" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          <DrawerFooter className="border-t bg-white">
            <Button
              variant="outline"
              className="rounded-md"
              onClick={() => {
                setSearch("");
                setStageFilter("ALL");
                setPriorityFilter("ALL");
                setJobTypeFilter("ALL");
              }}
            >
              Clear Filters
            </Button>
            <Button className="rounded-md bg-[#0891B2] hover:bg-[#0E7490]" onClick={() => setFiltersOpen(false)}>
              Apply Filters
            </Button>
          </DrawerFooter>
        </DrawerContent>
      </Drawer>

      {/* Archive Dialog */}
      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}>
        <AlertDialogContent className="rounded-md">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive roofing job?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} will be removed from the active operations board. Historical financials and activity will remain in the system.`
                : "This job will be removed from the active operations board."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-md">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-md bg-rose-600 hover:bg-rose-700"
              onClick={() => pendingDelete && archiveMutation.mutate(pendingDelete.id)}
            >
              {archiveMutation.isPending ? "Archiving..." : "Archive Job"}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
