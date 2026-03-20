import { type ElementType, useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  AlertCircle,
  CheckCircle2,
  CircleDollarSign,
  ClipboardList,
  HardHat,
  Plus,
  RefreshCw,
  Search,
  TrendingUp,
} from "lucide-react";
import { AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent, AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle } from "@/components/ui/alert-dialog";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { useToast } from "@/components/ui/use-toast";
import { RoofingProjectCard } from "@/features/projects/components/RoofingProjectCard";
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

function useDebouncedValue<T>(value: T, delay = 300): T {
  const [debouncedValue, setDebouncedValue] = useState<T>(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebouncedValue(value), delay);
    return () => window.clearTimeout(timer);
  }, [value, delay]);

  return debouncedValue;
}

function SummaryCard({
  title,
  value,
  description,
  icon: Icon,
  tone,
}: {
  title: string;
  value: string;
  description: string;
  icon: ElementType;
  tone: "teal" | "slate" | "green" | "amber";
}) {
  const tones = {
    teal: "bg-[#E0F2FE] text-[#0E7490]",
    slate: "bg-[#E2E8F0] text-[#0F172A]",
    green: "bg-[#DCFCE7] text-[#166534]",
    amber: "bg-[#FEF3C7] text-[#B45309]",
  } as const;

  return (
    <Card className="rounded-[5px] border-[rgba(15,23,42,0.08)] shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
      <CardContent className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{title}</p>
            <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{value}</p>
            <p className="mt-1 text-xs text-[#64748B]">{description}</p>
          </div>
          <div className={cn("flex h-10 w-10 items-center justify-center rounded-[5px]", tones[tone])}>
            <Icon className="h-4 w-4" />
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EmptyState({ onCreate }: { onCreate: () => void }) {
  return (
    <Card className="rounded-[5px] border-dashed border-[rgba(15,23,42,0.18)] bg-white shadow-sm">
      <CardContent className="py-16 text-center">
        <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-[5px] bg-[#E0F2FE] text-[#0E7490]">
          <HardHat className="h-6 w-6" />
        </div>
        <h3 className="mt-5 text-lg font-semibold text-[#0F172A]">No roofing jobs match this view</h3>
        <p className="mx-auto mt-2 max-w-xl text-sm text-[#64748B]">
          Adjust the stage filters or create a new roofing job to start tracking inspections, permits, production, and profit in one place.
        </p>
        <Button onClick={onCreate} className="mt-5 rounded-[5px] bg-[#0E7490] hover:bg-[#155E75]">
          <Plus className="mr-2 h-4 w-4" />
          Create Roofing Job
        </Button>
      </CardContent>
    </Card>
  );
}

function ProjectsLoadingGrid() {
  return (
    <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
      {Array.from({ length: 6 }).map((_, index) => (
        <Card key={index} className="rounded-[5px] border-[rgba(15,23,42,0.08)]">
          <CardContent className="space-y-4 p-5">
            <Skeleton className="h-4 w-24 rounded-[5px]" />
            <Skeleton className="h-6 w-3/5 rounded-[5px]" />
            <Skeleton className="h-4 w-1/2 rounded-[5px]" />
            <Skeleton className="h-14 w-full rounded-[5px]" />
            <Skeleton className="h-20 w-full rounded-[5px]" />
            <Skeleton className="h-12 w-full rounded-[5px]" />
          </CardContent>
        </Card>
      ))}
    </div>
  );
}

type BoardTab = "board" | "pipeline";

const PRIORITY_OPTIONS = ["ALL", "Low", "Medium", "High"] as const;

export default function ProjectsPage() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const [search, setSearch] = useState("");
  const [stageFilter, setStageFilter] = useState<string>("ALL");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [jobTypeFilter, setJobTypeFilter] = useState<string>("ALL");
  const [activeTab, setActiveTab] = useState<BoardTab>("board");
  const [pendingDelete, setPendingDelete] = useState<ProjectEntity | null>(null);

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
      toast({
        title: "Roofing job archived",
        description: "The job was removed from the active operations board.",
      });
    },
    onError: () => {
      toast({
        title: "Archive failed",
        description: "The job could not be archived right now.",
        variant: "destructive",
      });
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
      toast({
        title: "Update failed",
        description: "The job could not be updated.",
        variant: "destructive",
      });
    },
  });

  const allProjects = useMemo(() => projectsQuery.data ?? [], [projectsQuery.data]);

  const jobTypeOptions = useMemo(() => {
    const values = Array.from(new Set(allProjects.map((project) => getProjectJobType(project)).filter(Boolean)));
    return ["ALL", ...values.sort((a, b) => a.localeCompare(b))];
  }, [allProjects]);

  const filteredProjects = useMemo(() => {
    const needle = debouncedSearch.trim().toLowerCase();

    return allProjects.filter((project) => {
      const stage = getRoofingStage(project);
      const priority = getProjectPriorityLabel(project);
      const jobType = getProjectJobType(project);
      const searchableText = [project.name, getProjectClientName(project), getProjectCode(project)]
        .join(" ")
        .toLowerCase();

      const matchesSearch = !needle || searchableText.includes(needle);
      const matchesStage = stageFilter === "ALL" || stage === stageFilter;
      const matchesPriority = priorityFilter === "ALL" || priority === priorityFilter;
      const matchesJobType = jobTypeFilter === "ALL" || jobType === jobTypeFilter;

      return matchesSearch && matchesStage && matchesPriority && matchesJobType;
    });
  }, [allProjects, debouncedSearch, jobTypeFilter, priorityFilter, stageFilter]);

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
  const stageBreakdown = buildStageBreakdown(metricsProjects);

  const pipelineColumns = useMemo(
    () =>
      ROOFING_STAGE_ORDER.map((stageKey) => {
        const meta = getRoofingStageMeta(stageKey);
        const projects = orderedProjects.filter((project) => getRoofingStage(project) === stageKey);
        return { meta, projects };
      }),
    [orderedProjects],
  );

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <div className="mx-auto max-w-[1600px] px-4 py-5 md:px-6 md:py-6">
        <motion.section
          initial={{ opacity: 0, y: 18 }}
          animate={{ opacity: 1, y: 0 }}
          className="relative overflow-hidden rounded-[5px] border border-[#0F172A1A] bg-[radial-gradient(circle_at_top_right,_rgba(56,189,248,0.18),_transparent_35%),linear-gradient(135deg,#0F172A_0%,#12394B_52%,#0E7490_100%)] p-6 text-white shadow-[0_22px_60px_rgba(14,116,144,0.24)] md:p-8"
        >
          <div className="pointer-events-none absolute -right-12 top-0 h-40 w-40 rounded-full bg-white/10 blur-3xl" />
          <div className="pointer-events-none absolute bottom-0 left-0 h-32 w-32 rounded-full bg-[#67E8F9]/10 blur-2xl" />

          <div className="relative flex flex-col gap-6 lg:flex-row lg:items-end lg:justify-between">
            <div className="max-w-3xl">
              <Badge className="border-0 bg-white/15 text-white">
                <HardHat className="mr-1.5 h-3.5 w-3.5" />
                Roofing Operations Board
              </Badge>
              <h1 className="mt-4 text-3xl font-semibold tracking-tight">
                Run inspection, insurance, permits, and production from one board
              </h1>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-cyan-50/90 md:text-base">
                This view turns generic projects into roofing jobs with stage-aware cards, production readiness, and clear gross profit visibility for every contract.
              </p>
            </div>

            <div className="flex flex-wrap gap-2">
              <Button
                variant="outline"
                className="rounded-[5px] border-white/25 bg-white/10 text-white hover:bg-white/15"
                onClick={() => queryClient.invalidateQueries({ queryKey: ["projects"] })}
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Board
              </Button>
              <Button
                className="rounded-[5px] bg-white text-[#0F172A] hover:bg-cyan-50"
                onClick={() => navigate("/projects/add")}
              >
                <Plus className="mr-2 h-4 w-4" />
                Create Roofing Job
              </Button>
            </div>
          </div>
        </motion.section>

        <section className="mt-5 grid grid-cols-1 gap-3 md:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-6">
          <SummaryCard
            title="Total Jobs"
            value={String(metricsProjects.length)}
            description={hasActiveFilters ? "In the current filtered view" : "Across the roofing portfolio"}
            icon={ClipboardList}
            tone="teal"
          />
          <SummaryCard
            title="In Production"
            value={String(productionCount)}
            description="Actively in field execution"
            icon={HardHat}
            tone="slate"
          />
          <SummaryCard
            title="Completed"
            value={String(completedCount)}
            description="Finished or already invoiced"
            icon={CheckCircle2}
            tone="green"
          />
          <SummaryCard
            title="Contract Value"
            value={formatCurrency(totalContractValue)}
            description="Total booked revenue"
            icon={CircleDollarSign}
            tone="amber"
          />
          <SummaryCard
            title="Actual Cost"
            value={formatCurrency(totalActualCost)}
            description="Materials, labor, and field spend"
            icon={AlertCircle}
            tone="slate"
          />
          <SummaryCard
            title="Gross Profit"
            value={formatCurrency(totalGrossProfit)}
            description="Contract minus actual cost"
            icon={TrendingUp}
            tone="green"
          />
        </section>

        <Card className="mt-5 rounded-[5px] border-[rgba(15,23,42,0.08)] shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
          <CardContent className="p-4">
            <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
              <div>
                <p className="text-sm font-semibold text-[#0F172A]">Jobs by Stage</p>
                <p className="mt-1 text-sm text-[#64748B]">
                  Each stage maps to the real roofing lifecycle, from inspection through invoicing.
                </p>
              </div>
              {hasActiveFilters ? (
                <Button
                  variant="outline"
                  className="rounded-[5px]"
                  onClick={() => {
                    setSearch("");
                    setStageFilter("ALL");
                    setPriorityFilter("ALL");
                    setJobTypeFilter("ALL");
                  }}
                >
                  Reset Filters
                </Button>
              ) : null}
            </div>

            <div className="mt-4 grid grid-cols-2 gap-3 md:grid-cols-4 xl:grid-cols-8">
              {stageBreakdown.map((stage) => (
                <div key={stage.key} className={cn("rounded-[5px] border p-3 shadow-sm", stage.border, stage.softBg)}>
                  <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", stage.accentText)}>{stage.shortLabel}</p>
                  <p className="mt-2 text-xl font-semibold text-[#0F172A]">{stage.count}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{formatCurrency(stage.value)} in contract value</p>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-5 rounded-[5px] border-[rgba(15,23,42,0.08)] shadow-[0_14px_32px_rgba(15,23,42,0.05)]">
          <CardContent className="p-4">
            <div className="grid grid-cols-1 gap-3 lg:grid-cols-[1.2fr,0.7fr,0.7fr,0.7fr,auto]">
              <div className="relative">
                <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-[#64748B]" />
                <Input
                  value={search}
                  onChange={(event) => setSearch(event.target.value)}
                  placeholder="Search by job, client, or project code"
                  className="rounded-[5px] pl-9"
                />
              </div>

              <Select value={stageFilter} onValueChange={setStageFilter}>
                <SelectTrigger className="rounded-[5px]">
                  <SelectValue placeholder="Stage" />
                </SelectTrigger>
                <SelectContent className="rounded-[5px]">
                  <SelectItem value="ALL">All Stages</SelectItem>
                  {ROOFING_STAGE_ORDER.map((stageKey) => (
                    <SelectItem key={stageKey} value={stageKey}>
                      {getRoofingStageMeta(stageKey).label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={jobTypeFilter} onValueChange={setJobTypeFilter}>
                <SelectTrigger className="rounded-[5px]">
                  <SelectValue placeholder="Job Type" />
                </SelectTrigger>
                <SelectContent className="rounded-[5px]">
                  {jobTypeOptions.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL" ? "All Job Types" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Select value={priorityFilter} onValueChange={setPriorityFilter}>
                <SelectTrigger className="rounded-[5px]">
                  <SelectValue placeholder="Priority" />
                </SelectTrigger>
                <SelectContent className="rounded-[5px]">
                  {PRIORITY_OPTIONS.map((option) => (
                    <SelectItem key={option} value={option}>
                      {option === "ALL" ? "All Priorities" : option}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>

              <Button
                variant="outline"
                className="rounded-[5px]"
                disabled={!hasActiveFilters}
                onClick={() => {
                  setSearch("");
                  setStageFilter("ALL");
                  setPriorityFilter("ALL");
                  setJobTypeFilter("ALL");
                }}
              >
                Quick Reset
              </Button>
            </div>
          </CardContent>
        </Card>

        <div className="mt-5 flex flex-wrap gap-2">
          {[
            { value: "board" as const, label: "Operations Board" },
            { value: "pipeline" as const, label: "Stage Pipeline" },
          ].map((tab) => (
            <button
              key={tab.value}
              type="button"
              onClick={() => setActiveTab(tab.value)}
              className={cn(
                "rounded-[5px] border px-4 py-2 text-sm font-medium transition",
                activeTab === tab.value
                  ? "border-[#0E7490] bg-[#E0F2FE] text-[#0E7490]"
                  : "border-[rgba(15,23,42,0.08)] bg-white text-[#334155] hover:bg-[#F8FAFC]",
              )}
            >
              {tab.label}
            </button>
          ))}
        </div>

        <section className="mt-5">
          {projectsQuery.isLoading ? (
            <ProjectsLoadingGrid />
          ) : orderedProjects.length === 0 ? (
            <EmptyState onCreate={() => navigate("/projects/add")} />
          ) : activeTab === "board" ? (
            <div className="grid grid-cols-1 gap-4 xl:grid-cols-2 2xl:grid-cols-3">
              {orderedProjects.map((project) => (
                <RoofingProjectCard
                  key={project.id}
                  project={project}
                  onOpen={(item) => navigate(`/projects/${item.id}`)}
                  onMoveToProduction={(item) => statusMutation.mutate({ id: item.id, status: "IN_PROGRESS" })}
                  onMarkCompleted={(item) => statusMutation.mutate({ id: item.id, status: "COMPLETED" })}
                  onArchive={setPendingDelete}
                />
              ))}
            </div>
          ) : (
            <div className="grid gap-4 lg:grid-cols-2 2xl:grid-cols-4">
              {pipelineColumns.map(({ meta, projects }) => (
                <Card key={meta.key} className={cn("rounded-[5px] border shadow-[0_14px_32px_rgba(15,23,42,0.05)]", meta.border)}>
                  <CardContent className="p-4">
                    <div className={cn("rounded-[5px] border px-3 py-3", meta.border, meta.softBg)}>
                      <div className="flex items-start justify-between gap-3">
                        <div>
                          <p className={cn("text-[11px] font-semibold uppercase tracking-[0.16em]", meta.accentText)}>{meta.shortLabel}</p>
                          <h3 className="mt-1 text-lg font-semibold text-[#0F172A]">{meta.label}</h3>
                          <p className="mt-1 text-sm text-[#64748B]">{meta.description}</p>
                        </div>
                        <Badge className={cn("rounded-[5px] border px-2.5 py-1 text-xs font-medium", meta.border, meta.softBg, meta.accentText)}>
                          {projects.length}
                        </Badge>
                      </div>
                    </div>

                    <div className="mt-4 space-y-3">
                      {projects.length === 0 ? (
                        <div className="rounded-[5px] border border-dashed border-[#D7E3EA] bg-[#F8FAFC] px-3 py-5 text-center text-sm text-[#94A3B8]">
                          No jobs in this stage
                        </div>
                      ) : (
                        projects.map((project) => (
                          <button
                            key={project.id}
                            type="button"
                            onClick={() => navigate(`/projects/${project.id}`)}
                            className="w-full rounded-[5px] border border-[#E2E8F0] bg-white p-3 text-left shadow-sm transition hover:border-[#7DD3FC] hover:bg-[#F8FCFE]"
                          >
                            <div className="flex items-start justify-between gap-3">
                              <div className="min-w-0">
                                <p className="text-[11px] font-semibold uppercase tracking-[0.14em] text-[#64748B]">{getProjectCode(project)}</p>
                                <p className="mt-1 truncate text-sm font-semibold text-[#0F172A]">{project.name}</p>
                                <p className="mt-1 truncate text-sm text-[#64748B]">{getProjectClientName(project)}</p>
                              </div>
                              <Badge className="rounded-[5px] border border-[#E2E8F0] bg-[#F8FAFC] px-2 py-1 text-xs text-[#334155]">
                                {getProjectProgress(project)}%
                              </Badge>
                            </div>

                            <div className="mt-3 grid gap-2 text-xs text-[#475569]">
                              <div className="flex items-center justify-between gap-3">
                                <span>Next Action</span>
                                <span className="truncate font-medium text-[#0F172A]">{getNextAction(project)}</span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Due</span>
                                <span className="font-medium text-[#0F172A]">
                                  {formatTimelineDate(project.estimatedEndDate ?? project.dueDate ?? project.endDate)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Timeline</span>
                                <span className="font-medium text-[#0F172A]">
                                  {formatRelativeTimeline(project.estimatedEndDate ?? project.dueDate ?? project.endDate)}
                                </span>
                              </div>
                              <div className="flex items-center justify-between gap-3">
                                <span>Site</span>
                                <span className="truncate font-medium text-[#0F172A]">{getProjectSite(project)}</span>
                              </div>
                            </div>
                          </button>
                        ))
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>
      </div>

      <AlertDialog open={Boolean(pendingDelete)} onOpenChange={(open) => (!open ? setPendingDelete(null) : undefined)}>
        <AlertDialogContent className="rounded-[5px]">
          <AlertDialogHeader>
            <AlertDialogTitle>Archive roofing job?</AlertDialogTitle>
            <AlertDialogDescription>
              {pendingDelete
                ? `${pendingDelete.name} will be removed from the active operations board. Historical financials and activity will remain in the system.`
                : "This job will be removed from the active operations board."}
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel className="rounded-[5px]">Cancel</AlertDialogCancel>
            <AlertDialogAction
              className="rounded-[5px] bg-rose-600 hover:bg-rose-700"
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
