import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  BarChart3,
  CalendarDays,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  Clock3,
  FileStack,
  HardHat,
  MapPin,
  MoreHorizontal,
  Plus,
  RefreshCw,
  Search,
  Shield,
  Sparkles,
  TrendingUp,
  Wrench,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
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
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import {
  ProjectEntity,
  getProjectCalendar,
  getProjectKanban,
  getProjectMap,
  getProjectSummaryStats,
  getProjects,
  deleteProjectById,
  updateProjectStatus,
} from "@/features/projects";
import { cn } from "@/lib/utils";

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timeout = setTimeout(() => setDebouncedValue(value), delay);
    return () => clearTimeout(timeout);
  }, [value, delay]);

  return debouncedValue;
}

const STATUS_OPTIONS = [
  { value: "ALL", label: "All Status" },
  { value: "DRAFT", label: "Draft" },
  { value: "PENDING", label: "Pending" },
  { value: "APPROVED", label: "Approved" },
  { value: "SCHEDULED", label: "Scheduled" },
  { value: "IN_PROGRESS", label: "In Progress" },
  { value: "ON_HOLD", label: "On Hold" },
  { value: "COMPLETED", label: "Completed" },
  { value: "CANCELLED", label: "Cancelled" },
  { value: "WARRANTY_WORK", label: "Warranty Work" },
] as const;

const PRIORITY_OPTIONS = [
  { value: "ALL", label: "All Priority" },
  { value: "LOW", label: "Low" },
  { value: "NORMAL", label: "Normal" },
  { value: "HIGH", label: "High" },
  { value: "URGENT", label: "Urgent" },
  { value: "EMERGENCY", label: "Emergency" },
] as const;

const TYPE_OPTIONS = [
  { value: "ALL", label: "All Types" },
  { value: "REPLACEMENT", label: "Replacement" },
  { value: "REPAIR", label: "Repair" },
  { value: "INSPECTION", label: "Inspection" },
  { value: "MAINTENANCE", label: "Maintenance" },
  { value: "INSURANCE_CLAIM", label: "Insurance Claim" },
  { value: "GUTTER", label: "Gutter" },
  { value: "SIDING", label: "Siding" },
] as const;

const statusStyles: Record<string, string> = {
  DRAFT: "bg-slate-100 text-slate-700",
  PENDING: "bg-amber-100 text-amber-700",
  APPROVED: "bg-blue-100 text-blue-700",
  SCHEDULED: "bg-indigo-100 text-indigo-700",
  IN_PROGRESS: "bg-[#0891B2]/10 text-[#0891B2]",
  ACTIVE: "bg-[#0891B2]/10 text-[#0891B2]",
  ON_HOLD: "bg-orange-100 text-orange-700",
  COMPLETED: "bg-emerald-100 text-emerald-700",
  CANCELLED: "bg-rose-100 text-rose-700",
  ARCHIVED: "bg-slate-100 text-slate-500",
  WARRANTY_WORK: "bg-violet-100 text-violet-700",
};

const priorityStyles: Record<string, string> = {
  LOW: "bg-slate-100 text-slate-700",
  NORMAL: "bg-[#0891B2]/10 text-[#0891B2]",
  MEDIUM: "bg-[#0891B2]/10 text-[#0891B2]",
  HIGH: "bg-amber-100 text-amber-700",
  URGENT: "bg-orange-100 text-orange-700",
  EMERGENCY: "bg-rose-100 text-rose-700",
};

const currency = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 0,
});

function toNumber(value: unknown): number {
  if (typeof value === "number") return value;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getProgressValue(project: ProjectEntity): number {
  const value = project.completionPercentage ?? project.progress ?? 0;
  const normalized = toNumber(value);
  return Math.max(0, Math.min(100, normalized));
}

function formatStatusLabel(status?: string | null): string {
  if (!status) return "Unknown";
  return status
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function formatDate(value?: string | null): string {
  if (!value) return "-";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "-";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function formatRelativeDate(value?: string | null): string {
  if (!value) return "No date";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "No date";

  const msPerDay = 1000 * 60 * 60 * 24;
  const now = new Date();
  const diff = Math.ceil((date.getTime() - now.getTime()) / msPerDay);

  if (diff < 0) return `${Math.abs(diff)} day${Math.abs(diff) > 1 ? "s" : ""} overdue`;
  if (diff === 0) return "Due today";
  if (diff === 1) return "Due tomorrow";
  return `${diff} days out`;
}

function isOverdue(project: ProjectEntity): boolean {
  const dueDate = project.estimatedEndDate ?? project.dueDate;
  if (!dueDate) return false;
  const due = new Date(dueDate);
  if (Number.isNaN(due.getTime())) return false;
  return due.getTime() < Date.now() && project.status !== "COMPLETED";
}

function getClientName(project: ProjectEntity): string {
  const direct = project.client?.clientName;
  if (direct && direct.trim()) return direct;
  const fallback = project.clientName as string | undefined;
  return fallback?.trim() || "Unassigned client";
}

function getProjectValue(project: ProjectEntity): number {
  const contractValue = toNumber(project.contractValue);
  const budget = toNumber(project.budget as number | string | undefined);
  return contractValue || budget;
}

function getProjectCost(project: ProjectEntity): number {
  return toNumber(project.actualCost ?? project.spent);
}

function MetricCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: React.ElementType;
  tone: "teal" | "navy" | "green" | "amber";
}) {
  const tones = {
    teal: "bg-[#0891B2]/10 text-[#0891B2]",
    navy: "bg-slate-100 text-[#0F172A]",
    green: "bg-emerald-100 text-emerald-700",
    amber: "bg-amber-100 text-amber-700",
  } as const;

  return (
    <Card className="border-[rgba(15,23,42,0.08)] shadow-sm">
      <CardContent className="p-4 md:p-5">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">{title}</p>
            <p className="mt-2 text-2xl font-bold text-[#0F172A]">{value}</p>
            <p className="mt-1 text-xs text-[#64748B]">{description}</p>
          </div>
          <div className={cn("h-10 w-10 rounded-md flex items-center justify-center", tones[tone])}>
            <Icon size={18} />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="border-dashed border-[rgba(15,23,42,0.18)] bg-white">
      <CardContent className="py-14 text-center">
        <div className="mx-auto mb-4 flex h-14 w-14 items-center justify-center rounded-full bg-[#0891B2]/10">
          <HardHat className="text-[#0891B2]" />
        </div>
        <h3 className="text-lg font-semibold text-[#0F172A]">No projects match this filter</h3>
        <p className="mx-auto mt-2 max-w-md text-sm text-[#64748B]">
          Create your first roofing project to track production, materials, crews, and profitability from contract to completion.
        </p>
        <Button className="mt-5 bg-[#0891B2] hover:bg-[#0E7490]" onClick={onCreate}>
          <Plus className="mr-2 h-4 w-4" />
          Create Project
        </Button>
      </CardContent>
    </Card>
  );
}

const ProjectsPage = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const queryClient = useQueryClient();

  const [search, setSearch] = useState("");
  const [statusFilter, setStatusFilter] = useState("ALL");
  const [priorityFilter, setPriorityFilter] = useState("ALL");
  const [typeFilter, setTypeFilter] = useState("ALL");
  const [activeTab, setActiveTab] = useState<"portfolio" | "pipeline" | "schedule">("portfolio");
  const [pendingDelete, setPendingDelete] = useState<ProjectEntity | null>(null);

  const debouncedSearch = useDebouncedValue(search, 350);

  const projectsQuery = useQuery({
    queryKey: ["projects", debouncedSearch, statusFilter, priorityFilter, typeFilter],
    queryFn: () =>
      getProjects({
        page: 1,
        limit: 200,
        ...(debouncedSearch ? { search: debouncedSearch } : {}),
        ...(statusFilter !== "ALL" ? { status: statusFilter } : {}),
        ...(priorityFilter !== "ALL" ? { priority: priorityFilter } : {}),
        ...(typeFilter !== "ALL" ? { projectType: typeFilter } : {}),
        sortBy: "createdAt",
        sortOrder: "desc",
      }),
  });

  const summaryQuery = useQuery({
    queryKey: ["projects-summary"],
    queryFn: getProjectSummaryStats,
  });

  const kanbanQuery = useQuery({
    queryKey: ["projects-kanban"],
    queryFn: getProjectKanban,
  });

  const calendarQuery = useQuery({
    queryKey: ["projects-calendar"],
    queryFn: getProjectCalendar,
  });

  const mapQuery = useQuery({
    queryKey: ["projects-map"],
    queryFn: getProjectMap,
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteProjectById(id),
    onSuccess: () => {
      setPendingDelete(null);
      toast({ title: "Project archived", description: "Project was removed from active portfolio." });
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
      queryClient.invalidateQueries({ queryKey: ["projects-kanban"] });
    },
    onError: () => {
      toast({ title: "Delete failed", description: "Could not archive project right now.", variant: "destructive" });
    },
  });

  const statusMutation = useMutation({
    mutationFn: ({ id, status }: { id: string | number; status: string }) => updateProjectStatus(id, status),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
      queryClient.invalidateQueries({ queryKey: ["projects-kanban"] });
      toast({ title: "Project updated", description: "Status change saved." });
    },
    onError: () => {
      toast({ title: "Update failed", description: "Status was not updated.", variant: "destructive" });
    },
  });

  const projects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const orderedProjects = useMemo(() => {
    return [...projects].sort((a, b) => {
      const aOverdue = isOverdue(a);
      const bOverdue = isOverdue(b);
      if (aOverdue && !bOverdue) return -1;
      if (bOverdue && !aOverdue) return 1;

      const aDate = new Date(a.estimatedEndDate ?? a.dueDate ?? a.createdAt ?? 0).getTime();
      const bDate = new Date(b.estimatedEndDate ?? b.dueDate ?? b.createdAt ?? 0).getTime();
      return aDate - bDate;
    });
  }, [projects]);

  const topSchedule = useMemo(() => {
    const list = calendarQuery.data ?? [];
    return [...list]
      .filter((item) => item.estimatedStartDate || item.actualStartDate)
      .sort((a, b) => {
        const aTime = new Date(a.estimatedStartDate ?? a.actualStartDate ?? 0).getTime();
        const bTime = new Date(b.estimatedStartDate ?? b.actualStartDate ?? 0).getTime();
        return aTime - bTime;
      })
      .slice(0, 8);
  }, [calendarQuery.data]);

  const mappedProjects = useMemo(() => {
    const list = mapQuery.data ?? [];
    return list.filter((item) => item.latitude || item.longitude || item.jobSiteCity || item.jobSiteAddress);
  }, [mapQuery.data]);

  const fallbackPipeline = useMemo(() => {
    const grouped = new Map<string, ProjectEntity[]>();
    for (const item of projects) {
      const key = item.status || "UNSPECIFIED";
      if (!grouped.has(key)) grouped.set(key, []);
      grouped.get(key)?.push(item);
    }

    return Array.from(grouped.entries()).map(([status, entries], index) => ({
      id: `fallback-${status}-${index}`,
      name: formatStatusLabel(status),
      slug: status,
      order: index,
      count: entries.length,
      projects: entries,
    }));
  }, [projects]);

  const pipelineColumns = (kanbanQuery.data && kanbanQuery.data.length > 0 ? kanbanQuery.data : fallbackPipeline).filter(
    (column) => column && Array.isArray(column.projects),
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-8">
      <div className="mx-auto w-full max-w-[1600px] px-4 py-4 md:px-6 md:py-6">
        <motion.div
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-2xl border border-[#0f172a1f] bg-gradient-to-br from-[#0F172A] via-[#0C3140] to-[#0891B2] p-6 text-white shadow-[0_10px_40px_rgba(8,145,178,0.25)] md:p-8"
        >
          <div className="pointer-events-none absolute -top-12 right-8 h-40 w-40 rounded-full bg-[#22D3EE]/20 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-12 left-8 h-32 w-32 rounded-full bg-white/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 md:flex-row md:items-end md:justify-between">
            <div className="max-w-3xl">
              <Badge className="mb-4 border-0 bg-white/15 text-white">
                <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                Roofing CRM Project Command Center
              </Badge>
              <h1 className="text-2xl font-semibold leading-tight md:text-3xl">
                Run every roofing job like an enterprise operations board
              </h1>
              <p className="mt-2 text-sm text-cyan-100/90 md:text-base">
                Track production, crews, permits, insurance claims, and gross profit from contract approval to final completion.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:bg-white/20"
                onClick={() => {
                  queryClient.invalidateQueries({ queryKey: ["projects"] });
                  queryClient.invalidateQueries({ queryKey: ["projects-summary"] });
                  queryClient.invalidateQueries({ queryKey: ["projects-kanban"] });
                  queryClient.invalidateQueries({ queryKey: ["projects-calendar"] });
                  queryClient.invalidateQueries({ queryKey: ["projects-map"] });
                }}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh
              </Button>
              <Button className="bg-white text-[#0F172A] hover:bg-cyan-50" onClick={() => navigate("/projects/add")}>
                <Plus className="mr-2 h-4 w-4" />
                New Project
              </Button>
            </div>
          </div>
        </motion.div>

        <div className="mt-5 grid grid-cols-1 gap-3 sm:grid-cols-2 xl:grid-cols-4">
          <MetricCard
            title="Total Jobs"
            value={String(summaryQuery.data?.total ?? projects.length)}
            description="Open + completed projects"
            icon={ClipboardList}
            tone="teal"
          />
          <MetricCard
            title="Active Production"
            value={String(summaryQuery.data?.active ?? 0)}
            description="Currently moving in field"
            icon={HardHat}
            tone="navy"
          />
          <MetricCard
            title="Completed"
            value={String(summaryQuery.data?.completed ?? 0)}
            description="Delivered to clients"
            icon={CheckCircle2}
            tone="green"
          />
          <MetricCard
            title="Gross Profit"
            value={currency.format(summaryQuery.data?.grossProfit ?? 0)}
            description="Contract value minus actual costs"
            icon={TrendingUp}
            tone="amber"
          />
        </div>

        <Card className="mt-5 border-[rgba(15,23,42,0.08)]">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 md:grid-cols-[1.2fr,repeat(3,minmax(0,0.55fr)),auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search project, client, or project number"
                  className="pl-9"
                />
              </div>

              <Select value={statusFilter} onValueChange={setStatusFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  {STATUS_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent>
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={typeFilter} onValueChange={setTypeFilter}>
                <SelectTrigger>
                  <SelectValue placeholder="Project Type" />
                </SelectTrigger>
                <SelectContent>
                  {TYPE_OPTIONS.map((option) => (
                    <SelectItem key={option.value} value={option.value}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                onClick={() => {
                  setSearch("");
                  setStatusFilter("ALL");
                  setPriorityFilter("ALL");
                  setTypeFilter("ALL");
                }}
              >
                Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex flex-wrap gap-2">
          {["portfolio", "pipeline", "schedule"].map((tab) => (
            <button
              key={tab}
              type="button"
              onClick={() => setActiveTab(tab as typeof activeTab)}
              className={cn(
                "rounded-md border px-4 py-2 text-sm font-medium transition",
                activeTab === tab
                  ? "border-[#0891B2] bg-[#0891B2]/10 text-[#0891B2]"
                  : "border-[rgba(15,23,42,0.08)] bg-white text-[#334155] hover:bg-slate-50",
              )}
            >
              {tab === "portfolio" && "Portfolio"}
              {tab === "pipeline" && "Pipeline"}
              {tab === "schedule" && "Schedule & Map"}
            </button>
          ))}
        </div>

        {activeTab === "portfolio" && (
          <div className="mt-5">
            {projectsQuery.isLoading ? (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <Card key={index} className="border-[rgba(15,23,42,0.08)]">
                    <CardContent className="space-y-3 p-5">
                      <Skeleton className="h-5 w-1/2" />
                      <Skeleton className="h-4 w-3/4" />
                      <Skeleton className="h-2 w-full" />
                      <div className="grid grid-cols-2 gap-2">
                        <Skeleton className="h-10" />
                        <Skeleton className="h-10" />
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : orderedProjects.length === 0 ? (
              <EmptyState onCreate={() => navigate("/projects/add")} />
            ) : (
              <div className="grid grid-cols-1 gap-4 lg:grid-cols-2 2xl:grid-cols-3">
                {orderedProjects.map((project) => {
                  const progress = getProgressValue(project);
                  const status = project.status ?? "UNKNOWN";
                  const priority = project.priority ?? "NORMAL";
                  const value = getProjectValue(project);
                  const cost = getProjectCost(project);
                  const grossProfit = toNumber(project.grossProfit) || value - cost;
                  const overdue = isOverdue(project);

                  return (
                    <motion.div
                      key={project.id}
                      initial={{ opacity: 0, y: 12 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="rounded-2xl border border-[rgba(15,23,42,0.08)] bg-white p-5 shadow-sm transition hover:border-[#22D3EE]/50 hover:shadow-md"
                    >
                      <div className="mb-4 flex items-start justify-between gap-3">
                        <div>
                          <p className="text-[11px] font-semibold uppercase tracking-[0.12em] text-[#64748B]">
                            {project.projectNumber || project.code || "PROJECT"}
                          </p>
                          <h3
                            className="mt-1 cursor-pointer text-base font-semibold text-[#0F172A] hover:text-[#0891B2]"
                            onClick={() => navigate(`/projects/${project.id}`)}
                          >
                            {project.name}
                          </h3>
                          <p className="mt-1 text-sm text-[#64748B]">{getClientName(project)}</p>
                        </div>

                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <button className="rounded-md p-1.5 text-[#64748B] hover:bg-slate-100 hover:text-[#0F172A]">
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48">
                            <DropdownMenuItem onClick={() => navigate(`/projects/${project.id}`)}>Open Project</DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => statusMutation.mutate({ id: project.id, status: "IN_PROGRESS" })}
                            >
                              Move to In Progress
                            </DropdownMenuItem>
                            <DropdownMenuItem
                              onClick={() => statusMutation.mutate({ id: project.id, status: "COMPLETED" })}
                            >
                              Mark Completed
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem className="text-rose-600" onClick={() => setPendingDelete(project)}>
                              Archive Project
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </div>

                      <div className="mb-3 flex flex-wrap gap-2">
                        <Badge className={cn("border-0", statusStyles[status] || "bg-slate-100 text-slate-700")}>
                          {formatStatusLabel(status)}
                        </Badge>
                        <Badge className={cn("border-0", priorityStyles[priority] || "bg-slate-100 text-slate-700")}>
                          {formatStatusLabel(priority)}
                        </Badge>
                        {project.roofType ? (
                          <Badge variant="outline" className="border-[#22D3EE]/40 bg-[#22D3EE]/10 text-[#0E7490]">
                            <Wrench className="mr-1 h-3 w-3" />
                            {project.roofType}
                          </Badge>
                        ) : null}
                        {project.isInsuranceJob ? (
                          <Badge variant="outline" className="border-violet-300 bg-violet-50 text-violet-700">
                            <Shield className="mr-1 h-3 w-3" />
                            Insurance
                          </Badge>
                        ) : null}
                        {project.permitRequired ? (
                          <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-700">
                            <FileStack className="mr-1 h-3 w-3" />
                            Permit
                          </Badge>
                        ) : null}
                      </div>

                      <div className="space-y-2">
                        <div className="flex items-center justify-between text-xs text-[#64748B]">
                          <span>Completion</span>
                          <span className="font-semibold text-[#0F172A]">{progress}%</span>
                        </div>
                        <Progress value={progress} className="h-2" />
                        <div className="flex items-center justify-between text-xs">
                          <span className={cn("font-medium", overdue ? "text-rose-600" : "text-[#64748B]")}>
                            <Clock3 className="mr-1 inline h-3.5 w-3.5" />
                            {formatRelativeDate(project.estimatedEndDate ?? project.dueDate)}
                          </span>
                          <span className="text-[#64748B]">{formatDate(project.estimatedEndDate ?? project.dueDate)}</span>
                        </div>
                      </div>

                      <div className="mt-4 grid grid-cols-3 gap-2 rounded-md border border-[rgba(15,23,42,0.07)] bg-slate-50/70 p-3">
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Contract</p>
                          <p className="mt-1 text-sm font-semibold text-[#0F172A]">{currency.format(value)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Actual Cost</p>
                          <p className="mt-1 text-sm font-semibold text-[#0F172A]">{currency.format(cost)}</p>
                        </div>
                        <div>
                          <p className="text-[10px] uppercase tracking-wide text-[#64748B]">Gross Profit</p>
                          <p className={cn("mt-1 text-sm font-semibold", grossProfit >= 0 ? "text-emerald-700" : "text-rose-700")}>
                            {currency.format(grossProfit)}
                          </p>
                        </div>
                      </div>

                      <div className="mt-4 flex items-center justify-between">
                        <Button
                          variant="outline"
                          size="sm"
                          className="border-[rgba(15,23,42,0.12)]"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          View Details
                        </Button>
                        <Button
                          size="sm"
                          className="bg-[#0891B2] hover:bg-[#0E7490]"
                          onClick={() => navigate(`/projects/${project.id}`)}
                        >
                          Manage Job
                        </Button>
                      </div>
                    </motion.div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "pipeline" && (
          <div className="mt-5 overflow-x-auto pb-2">
            <div className="flex min-w-[920px] gap-4">
              {kanbanQuery.isLoading
                ? Array.from({ length: 4 }).map((_, index) => (
                    <Card key={index} className="w-[300px] shrink-0 border-[rgba(15,23,42,0.08)]">
                      <CardContent className="space-y-3 p-4">
                        <Skeleton className="h-5 w-2/3" />
                        <Skeleton className="h-20 w-full" />
                        <Skeleton className="h-20 w-full" />
                      </CardContent>
                    </Card>
                  ))
                : pipelineColumns.map((column, columnIndex) => (
                    <Card key={column.id || `${column.name}-${columnIndex}`} className="w-[320px] shrink-0 border-[rgba(15,23,42,0.08)] bg-white">
                      <CardContent className="p-4">
                        <div className="mb-3 flex items-center justify-between">
                          <div>
                            <h3 className="text-sm font-semibold text-[#0F172A]">{column.name}</h3>
                            <p className="text-xs text-[#64748B]">{column.count} project{column.count === 1 ? "" : "s"}</p>
                          </div>
                          <div className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: column.color || "#0891B2" }} />
                        </div>

                        <div className="max-h-[62vh] space-y-3 overflow-y-auto pr-1 scrollbar-thin">
                          {column.projects.length === 0 ? (
                            <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.14)] p-4 text-center text-xs text-[#64748B]">
                              No projects in this stage
                            </div>
                          ) : (
                            column.projects.map((project) => (
                              <div
                                key={project.id}
                                className="rounded-md border border-[rgba(15,23,42,0.08)] bg-slate-50/70 p-3 transition hover:border-[#22D3EE]/50 hover:bg-white"
                              >
                                <button
                                  className="line-clamp-2 text-left text-sm font-semibold text-[#0F172A] hover:text-[#0891B2]"
                                  onClick={() => navigate(`/projects/${project.id}`)}
                                >
                                  {project.name}
                                </button>
                                <p className="mt-1 text-xs text-[#64748B]">{getClientName(project)}</p>

                                <div className="mt-3 flex items-center justify-between text-xs text-[#64748B]">
                                  <span>{currency.format(getProjectValue(project))}</span>
                                  <span>{formatDate(project.estimatedEndDate ?? project.dueDate)}</span>
                                </div>
                              </div>
                            ))
                          )}
                        </div>
                      </CardContent>
                    </Card>
                  ))}
            </div>
          </div>
        )}

        {activeTab === "schedule" && (
          <div className="mt-5 grid grid-cols-1 gap-4 xl:grid-cols-3">
            <Card className="xl:col-span-2 border-[rgba(15,23,42,0.08)]">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <CalendarDays className="h-4 w-4 text-[#0891B2]" />
                  <h3 className="text-sm font-semibold text-[#0F172A]">Upcoming Job Schedule</h3>
                </div>

                {calendarQuery.isLoading ? (
                  <div className="space-y-3">
                    {Array.from({ length: 5 }).map((_, index) => (
                      <Skeleton key={index} className="h-14 w-full" />
                    ))}
                  </div>
                ) : topSchedule.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.14)] p-6 text-center text-sm text-[#64748B]">
                    No scheduled start dates yet.
                  </div>
                ) : (
                  <div className="space-y-2">
                    {topSchedule.map((project) => (
                      <button
                        key={project.id}
                        className="flex w-full items-center justify-between rounded-md border border-[rgba(15,23,42,0.08)] bg-white p-3 text-left transition hover:border-[#22D3EE]/40 hover:bg-slate-50"
                        onClick={() => navigate(`/projects/${project.id}`)}
                      >
                        <div>
                          <p className="font-medium text-[#0F172A]">{project.name}</p>
                          <p className="text-xs text-[#64748B]">{getClientName(project)}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs font-semibold uppercase tracking-wide text-[#64748B]">Start</p>
                          <p className="text-sm font-medium text-[#0F172A]">{formatDate(project.estimatedStartDate ?? project.actualStartDate)}</p>
                        </div>
                      </button>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            <Card className="border-[rgba(15,23,42,0.08)]">
              <CardContent className="p-4">
                <div className="mb-4 flex items-center gap-2">
                  <MapPin className="h-4 w-4 text-[#0891B2]" />
                  <h3 className="text-sm font-semibold text-[#0F172A]">Map Coverage</h3>
                </div>

                {mapQuery.isLoading ? (
                  <div className="space-y-2">
                    {Array.from({ length: 6 }).map((_, index) => (
                      <Skeleton key={index} className="h-10 w-full" />
                    ))}
                  </div>
                ) : mappedProjects.length === 0 ? (
                  <div className="rounded-md border border-dashed border-[rgba(15,23,42,0.14)] p-4 text-center text-sm text-[#64748B]">
                    No mappable job sites found.
                  </div>
                ) : (
                  <>
                    <div className="mb-3 grid grid-cols-2 gap-2">
                      <div className="rounded-md bg-[#0891B2]/10 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-[#0E7490]">Mappable Jobs</p>
                        <p className="mt-1 text-xl font-semibold text-[#0F172A]">{mappedProjects.length}</p>
                      </div>
                      <div className="rounded-md bg-amber-100 p-3">
                        <p className="text-[11px] uppercase tracking-wide text-amber-700">In Progress</p>
                        <p className="mt-1 text-xl font-semibold text-[#0F172A]">
                          {mappedProjects.filter((item) => item.status === "IN_PROGRESS").length}
                        </p>
                      </div>
                    </div>

                    <div className="max-h-[300px] space-y-2 overflow-y-auto pr-1 scrollbar-thin">
                      {mappedProjects.slice(0, 14).map((project) => (
                        <button
                          key={project.id}
                          onClick={() => navigate(`/projects/${project.id}`)}
                          className="w-full rounded-md border border-[rgba(15,23,42,0.08)] p-2.5 text-left transition hover:border-[#22D3EE]/40 hover:bg-slate-50"
                        >
                          <p className="text-sm font-medium text-[#0F172A]">{project.name}</p>
                          <p className="text-xs text-[#64748B]">
                            {project.jobSiteCity || project.jobSiteAddress || "Job site"}
                            {project.jobSiteState ? `, ${project.jobSiteState}` : ""}
                          </p>
                        </button>
                      ))}
                    </div>
                  </>
                )}
              </CardContent>
            </Card>
          </div>
        )}
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => !open && setPendingDelete(null)}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Archive this project?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete?.name
                ? `This will archive "${pendingDelete.name}" and remove it from active lists.`
                : "This will archive the selected project."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={deleteMutation.isPending}>Cancel</AlertDialogCancel>
            <AlertDialogAction
              disabled={deleteMutation.isPending || !pendingDelete?.id}
              className="bg-rose-600 hover:bg-rose-700"
              onClick={(event) => {
                event.preventDefault();
                if (pendingDelete?.id) {
                  deleteMutation.mutate(pendingDelete.id);
                }
              }}
            >
              {deleteMutation.isPending ? (
                <>
                  <RefreshCw className="mr-2 h-4 w-4 animate-spin" />
                  Archiving...
                </>
              ) : (
                "Archive"
              )}
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>

      {(projectsQuery.isError || summaryQuery.isError || kanbanQuery.isError) && (
        <div className="fixed bottom-4 right-4 z-50 max-w-sm rounded-md border border-rose-200 bg-rose-50 px-4 py-3 text-sm text-rose-700 shadow-lg">
          <div className="flex items-start gap-2">
            <AlertCircle className="mt-0.5 h-4 w-4 shrink-0" />
            <div>
              <p className="font-semibold">Some project data could not be loaded.</p>
              <p className="text-xs text-rose-600">Try refreshing or check your API connectivity.</p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ProjectsPage;
