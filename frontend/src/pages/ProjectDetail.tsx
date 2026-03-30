import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import {
  AlertCircle,
  ArrowLeft,
  CalendarClock,
  CheckSquare,
  Download,
  FileText,
  HardHat,
  Loader2,
  MapPin,
  Pencil,
  Plus,
  ShieldCheck,
  ShieldEllipsis,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { ActivityTimeline } from "@/components/ActivityTimeline";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Progress } from "@/components/ui/progress";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/components/ui/use-toast";
import { getFiles, type FileResponse } from "@/features/files/services/files-service";
import { RoofingStageRail } from "@/features/projects/components/RoofingStageRail";
import { getProjectById, type ProjectEntity } from "@/features/projects/services/projects-service";
import {
  ROOFING_TASK_SUGGESTIONS,
  buildRoofingFileBuckets,
  formatCurrency,
  formatRelativeTimeline,
  formatTimelineDate,
  getActualCost,
  getCategoryGroupLabel,
  getContractValue,
  getCrewSummary,
  getGrossProfit,
  getIndicatorToneClasses,
  getInsuranceIndicator,
  getNextAction,
  getPermitIndicator,
  getProfitMargin,
  getProjectClientName,
  getProjectCode,
  getProjectJobType,
  getProjectPriorityLabel,
  getProjectProgress,
  getProjectSite,
  getRoofingStage,
  getRoofingStageMeta,
  getWorkStatus,
  groupFilesByCategory,
  normalizeRoofingTaskTitle,
} from "@/features/projects/roofing-operations";
import { createTask, getTasks, type TaskEntity } from "@/features/tasks/services/tasks-service";
import { getEmployees } from "@/features/users/services/users-service";
import { cn } from "@/lib/utils";

function readText(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function toNumber(value: unknown): number {
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string") {
    const parsed = Number(value);
    return Number.isFinite(parsed) ? parsed : 0;
  }
  return 0;
}

function getTaskStatusLabel(status: unknown): string {
  const text = readText(status).toUpperCase();
  if (!text) return "Open";
  if (text === "TODO") return "To Do";
  if (text === "IN_PROGRESS") return "In Progress";
  if (text === "DONE") return "Done";
  return text
    .toLowerCase()
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

function getTaskStatusTone(status: unknown): string {
  const text = readText(status).toUpperCase();
  if (text === "DONE" || text === "COMPLETED") return "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]";
  if (text === "IN_PROGRESS") return "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]";
  return "border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] text-[#475569]";
}

function getTaskPriorityTone(priority: unknown): string {
  const text = readText(priority).toUpperCase();
  if (text === "HIGH" || text === "URGENT" || text === "CRITICAL") return "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]";
  if (text === "MEDIUM" || text === "NORMAL") return "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
  return "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]";
}

function getAssigneeLabel(task: Record<string, unknown>): string {
  const assignee = (task.assignee as Record<string, unknown> | undefined) || (task.assignedTo as Record<string, unknown> | undefined);
  const direct = readText((assignee?.user as Record<string, unknown> | undefined)?.firstName) || readText(assignee?.firstName);
  const last = readText((assignee?.user as Record<string, unknown> | undefined)?.lastName) || readText(assignee?.lastName);
  const fullName = [direct, last].filter(Boolean).join(" ").trim();
  return fullName || readText(assignee?.name) || "Unassigned";
}

function getMemberName(member: Record<string, unknown>): string {
  const employee = (member.employee as Record<string, unknown> | undefined) || {};
  const user = (employee.user as Record<string, unknown> | undefined) || (member.user as Record<string, unknown> | undefined) || {};
  const fullName = [readText(user.firstName), readText(user.lastName)].filter(Boolean).join(" ").trim();
  return fullName || readText(member.name) || readText(employee.department) || "Team Member";
}

function StatCard({
  label,
  value,
  supporting,
  accent,
}: {
  label: string;
  value: string;
  supporting?: string;
  accent?: boolean;
}) {
  return (
    <div
      className={cn(
        "rounded-md border p-4 shadow-sm",
        accent ? "border-[#BBF7D0] bg-[#F0FDF4]" : "border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]",
      )}
    >
      <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{label}</p>
      <p className={cn("mt-2 text-2xl font-semibold", accent ? "text-[#166534]" : "text-[#0F172A]")}>{value}</p>
      {supporting ? <p className="mt-1 text-xs text-[#64748B]">{supporting}</p> : null}
    </div>
  );
}

function DetailRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-[rgba(15,23,42,0.06)] py-3 last:border-b-0 last:pb-0">
      <span className="text-sm text-[#64748B]">{label}</span>
      <span className="text-right text-sm font-medium text-[#0F172A]">{value}</span>
    </div>
  );
}

function getLiveProjectInvoice(project: ProjectEntity | null): Record<string, unknown> | null {
  if (!project || !Array.isArray(project.invoices) || project.invoices.length === 0) return null;
  const invoices = project.invoices as Array<Record<string, unknown>>;
  return invoices.find((invoice) => readText(invoice.status).toUpperCase() === "DRAFT") ?? invoices[0] ?? null;
}

function getInvoiceItems(invoice: Record<string, unknown> | null) {
  if (!invoice || !Array.isArray(invoice.items)) return [] as Array<Record<string, unknown>>;
  return [...(invoice.items as Array<Record<string, unknown>>)].sort(
    (left, right) => toNumber(left.sortOrder) - toNumber(right.sortOrder),
  );
}

function textHasKeyword(value: string, keywords: string[]) {
  const haystack = value.toLowerCase();
  return keywords.some((keyword) => haystack.includes(keyword));
}

function buildProjectBillingSearchText(project: ProjectEntity, invoiceItems: Array<Record<string, unknown>>) {
  const sourceRows = [
    ...(Array.isArray(project.projectMaterials) ? project.projectMaterials : []),
    ...(Array.isArray(project.projectExpenses) ? project.projectExpenses : []),
    ...(Array.isArray(project.projectLaborEntries) ? project.projectLaborEntries : []),
    ...invoiceItems,
  ];

  return sourceRows
    .map((row) =>
      [readText(row.name), readText(row.description), readText(row.vendor), readText(row.workerName)].filter(Boolean).join(" "),
    )
    .join(" ")
    .toLowerCase();
}

export default function ProjectDetailPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { toast } = useToast();

  const [project, setProject] = useState<ProjectEntity | null>(null);
  const [tasks, setTasks] = useState<TaskEntity[]>([]);
  const [files, setFiles] = useState<FileResponse[]>([]);
  const [employees, setEmployees] = useState<Record<string, unknown>[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadingTasks, setLoadingTasks] = useState(false);
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [showAddTask, setShowAddTask] = useState(false);
  const [creatingTask, setCreatingTask] = useState(false);
  const [newTask, setNewTask] = useState({
    title: "",
    description: "",
    priority: "MEDIUM",
    status: "TODO",
    dueDate: "",
    assignedToId: "none",
  });

  const fetchProject = useCallback(async () => {
    if (!id) return;
    try {
      setIsLoading(true);
      const data = await getProjectById(id);
      setProject(data);
    } catch (error) {
      console.error("Error fetching project:", error);
    } finally {
      setIsLoading(false);
    }
  }, [id]);

  const fetchTasks = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingTasks(true);
      const data = await getTasks({ projectId: id, limit: 100 });
      setTasks(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching tasks:", error);
    } finally {
      setLoadingTasks(false);
    }
  }, [id]);

  const fetchFiles = useCallback(async () => {
    if (!id) return;
    try {
      setLoadingFiles(true);
      const data = await getFiles({ projectId: id, limit: 100 });
      setFiles(Array.isArray(data) ? data : []);
    } catch (error) {
      console.error("Error fetching files:", error);
    } finally {
      setLoadingFiles(false);
    }
  }, [id]);

  useEffect(() => {
    fetchProject();
    fetchTasks();
    fetchFiles();
  }, [fetchFiles, fetchProject, fetchTasks]);

  useEffect(() => {
    getEmployees()
      .then((data) => setEmployees(Array.isArray(data) ? (data as Record<string, unknown>[]) : []))
      .catch(() => setEmployees([]));
  }, []);

  const handleCreateTask = async () => {
    if (!newTask.title.trim() || !id) return;

    setCreatingTask(true);
    try {
      await createTask({
        title: newTask.title.trim(),
        description: newTask.description.trim() || null,
        priority: newTask.priority,
        status: newTask.status,
        dueDate: newTask.dueDate ? new Date(newTask.dueDate).toISOString() : null,
        assignedToId: newTask.assignedToId !== "none" ? newTask.assignedToId : null,
        projectId: id,
      });

      toast({
        title: "Roofing task created",
        description: `"${newTask.title}" was added to this job.`,
      });
      setShowAddTask(false);
      setNewTask({
        title: "",
        description: "",
        priority: "MEDIUM",
        status: "TODO",
        dueDate: "",
        assignedToId: "none",
      });
      fetchTasks();
    } catch (error) {
      console.error("Error creating task:", error);
      toast({
        title: "Task creation failed",
        description: "The task could not be created right now.",
        variant: "destructive",
      });
    } finally {
      setCreatingTask(false);
    }
  };

  const projectTasks = useMemo(() => {
    if (!project) return [] as Array<Record<string, unknown>>;
    if (Array.isArray(project.projectTasks) && project.projectTasks.length > 0) {
      return project.projectTasks as Array<Record<string, unknown>>;
    }
    return tasks as Array<Record<string, unknown>>;
  }, [project, tasks]);

  const displayTasks = useMemo(
    () =>
      projectTasks.map((task, index) => ({
        ...task,
        normalizedTitle: normalizeRoofingTaskTitle(task.title, index),
        statusLabel: getTaskStatusLabel(task.status),
      })),
    [projectTasks],
  );

  const doneTasks = displayTasks.filter((task) => {
    const status = readText(task.status).toUpperCase();
    return status === "DONE" || status === "COMPLETED";
  }).length;

  const groupedFiles = useMemo(() => {
    if (!project) return [];
    return groupFilesByCategory(buildRoofingFileBuckets(project, files as Array<Record<string, unknown>>));
  }, [files, project]);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F8FAFC]">
        <div className="mx-auto max-w-[1400px] px-4 py-6 md:px-6">
          <div className="space-y-4">
            <Skeleton className="h-10 w-40 rounded-md" />
            <Skeleton className="h-52 w-full rounded-md" />
            <Skeleton className="h-36 w-full rounded-md" />
            <Skeleton className="h-64 w-full rounded-md" />
          </div>
        </div>
      </div>
    );
  }

  if (!project) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-[#F8FAFC] px-4">
        <Card className="w-full max-w-lg rounded-md border-[rgba(15,23,42,0.08)] shadow-sm">
          <CardContent className="flex flex-col items-center py-14 text-center">
            <div className="flex h-14 w-14 items-center justify-center rounded-md bg-[#FEE2E2] text-[#B91C1C]">
              <AlertCircle className="h-6 w-6" />
            </div>
            <h2 className="mt-5 text-xl font-semibold text-[#0F172A]">Roofing job not found</h2>
            <p className="mt-2 text-sm text-[#64748B]">
              The project may have been deleted or the link is no longer valid.
            </p>
            <Button className="mt-5 rounded-md" variant="outline" onClick={() => navigate("/projects")}>
              <ArrowLeft className="mr-2 h-4 w-4" />
              Back to Operations Board
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  const stageKey = getRoofingStage(project);
  const stageMeta = getRoofingStageMeta(stageKey);
  const progress = getProjectProgress(project);
  const contractValue = getContractValue(project);
  const actualCost = getActualCost(project);
  const grossProfit = getGrossProfit(project);
  const profitMargin = getProfitMargin(project);
  const permit = getPermitIndicator(project);
  const insurance = getInsuranceIndicator(project);
  const workStatus = getWorkStatus(project);
  const dueDate = project.estimatedEndDate ?? project.dueDate ?? project.endDate ?? project.actualEndDate;
  const startDate = project.actualStartDate ?? project.estimatedStartDate ?? project.startDate;
  const members = Array.isArray(project.members)
    ? (project.members as Array<Record<string, unknown>>)
    : Array.isArray(project.teamMembers)
      ? (project.teamMembers as Array<Record<string, unknown>>)
      : [];
  const materialCost = Array.isArray(project.projectMaterials)
    ? project.projectMaterials.reduce((sum, item) => sum + toNumber(item.totalCost ?? item.unitCost), 0)
    : 0;
  const laborCost = Array.isArray(project.projectLaborEntries)
    ? project.projectLaborEntries.reduce((sum, item) => sum + toNumber(item.totalCost ?? item.cost), 0)
    : 0;
  const expenseCost = Array.isArray(project.projectExpenses)
    ? project.projectExpenses.reduce((sum, item) => sum + toNumber(item.amount ?? item.totalCost), 0)
    : 0;
  const currencyCode = project.currency || "USD";
  const liveInvoice = getLiveProjectInvoice(project);
  const liveInvoiceItems = getInvoiceItems(liveInvoice);
  const liveInvoiceStatus = readText(liveInvoice?.status).toUpperCase() || "DRAFT";
  const liveInvoiceSubtotal = toNumber(liveInvoice?.subtotal);
  const liveInvoiceTaxAmount = toNumber(liveInvoice?.taxAmount);
  const liveInvoiceTotal = toNumber(liveInvoice?.total);
  const liveInvoiceAmountPaid = toNumber(liveInvoice?.amountPaid);
  const liveInvoiceAmountDue = toNumber(liveInvoice?.amountDue);
  const liveInvoiceTaxRate = toNumber(liveInvoice?.taxRate ?? project.quote?.taxRate);
  const isCompletedJob = readText(project.status).toUpperCase() === "COMPLETED" || Boolean(project.isCompleted);
  const billingSearchText = buildProjectBillingSearchText(project, liveInvoiceItems);
  const missedBillingAmount = (() => {
    const labor = Array.isArray(project.projectLaborEntries)
      ? project.projectLaborEntries
          .filter((entry) => entry.isBillable === false)
          .reduce((sum, entry) => sum + toNumber(entry.totalCost), 0)
      : 0;
    const addons = Array.isArray(project.projectExpenses)
      ? project.projectExpenses
          .filter((expense) => expense.billableToClient !== true)
          .reduce((sum, expense) => sum + toNumber(expense.amount ?? expense.totalAmount), 0)
      : 0;
    return labor + addons;
  })();
  const missedBillingRows = (() => {
    const rows: Array<{ label: string; value: number }> = [];
    const skippedLabor = Array.isArray(project.projectLaborEntries)
      ? project.projectLaborEntries
          .filter((entry) => entry.isBillable === false)
          .reduce((sum, entry) => sum + toNumber(entry.totalCost), 0)
      : 0;
    const skippedAddons = Array.isArray(project.projectExpenses)
      ? project.projectExpenses
          .filter((expense) => expense.billableToClient !== true)
          .reduce((sum, expense) => sum + toNumber(expense.amount ?? expense.totalAmount), 0)
      : 0;

    if (skippedLabor > 0) rows.push({ label: "Labor not marked billable", value: skippedLabor });
    if (skippedAddons > 0) rows.push({ label: "Add-ons not included yet", value: skippedAddons });
    return rows;
  })();
  const invoiceSuggestions = (() => {
    const suggestions: string[] = [];
    if (!textHasKeyword(billingSearchText, ["disposal", "dump", "haul"])) {
      suggestions.push("Add disposal fee?");
    }
    if (Array.isArray(project.projectInspections) && project.projectInspections.length > 0 && !textHasKeyword(billingSearchText, ["inspection"])) {
      suggestions.push("Include inspection charge?");
    }
    if (permit.label !== "Not Required" && !textHasKeyword(billingSearchText, ["permit"])) {
      suggestions.push("Bill permit fee?");
    }
    return suggestions.slice(0, 3);
  })();

  return (
    <div className="min-h-screen bg-[#F8FAFC] pb-10">
      <div className="mx-auto max-w-[1400px] px-4 py-5 md:px-6 md:py-6">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <Button variant="outline" className="rounded-md" onClick={() => navigate("/projects")}>
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Operations Board
          </Button>

          <Button
            className="rounded-md"
            variant="outline"
            onClick={() => navigate(`/projects/${id}/edit`)}
          >
            <Pencil className="mr-2 h-4 w-4" />
            Edit Job
          </Button>
        </div>

        <Card className="mt-4 overflow-hidden rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardContent className="bg-[radial-gradient(circle_at_top_right,_rgba(14,165,233,0.14),_transparent_28%),linear-gradient(180deg,#FFFFFF_0%,#F8FCFE_100%)] p-6 md:p-7">
            <div className="flex flex-col gap-6 xl:flex-row xl:items-start xl:justify-between">
              <div className="max-w-3xl">
                <div className="flex flex-wrap items-center gap-2">
                  <Badge className={cn("rounded-md border px-2.5 py-1 text-xs font-medium", stageMeta.border, stageMeta.softBg, stageMeta.accentText)}>
                    {stageMeta.label}
                  </Badge>
                  <Badge className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-2.5 py-1 text-xs font-medium text-[#334155]">
                    {getProjectJobType(project)}
                  </Badge>
                  <Badge className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-2.5 py-1 text-xs font-medium text-[#334155]">
                    Priority: {getProjectPriorityLabel(project)}
                  </Badge>
                  {stageKey === "production" ? (
                    <Badge className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-xs font-medium text-[#166534]">
                      <Sparkles className="mr-1.5 h-3.5 w-3.5" />
                      Production Live
                    </Badge>
                  ) : null}
                </div>

                <p className="mt-4 text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">{getProjectCode(project)}</p>
                <h1 className="mt-1 text-3xl font-semibold tracking-tight text-[#0F172A]">{project.name}</h1>
                <p className="mt-2 text-base text-[#475569]">
                  {getProjectClientName(project)}{project.description ? ` • ${project.description}` : ""}
                </p>

                <div className="mt-5">
                  <RoofingStageRail currentStage={stageKey} />
                </div>
              </div>

              <div className="grid gap-3 sm:grid-cols-2 xl:w-[440px]">
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    <TrendingUp className="h-3.5 w-3.5" />
                    Progress
                  </div>
                  <p className="mt-2 text-2xl font-semibold text-[#0F172A]">{progress}%</p>
                  <Progress value={progress} className="mt-3 h-2 rounded-md bg-[#E2E8F0]" />
                </div>

                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    <HardHat className="h-3.5 w-3.5" />
                    Next Action
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#0F172A]">{getNextAction(project)}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{workStatus}</p>
                </div>

                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    <CalendarClock className="h-3.5 w-3.5" />
                    Timeline
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#0F172A]">{formatTimelineDate(dueDate)}</p>
                  <p className="mt-1 text-xs text-[#64748B]">{formatRelativeTimeline(dueDate)}</p>
                </div>

                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                  <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                    <MapPin className="h-3.5 w-3.5" />
                    Job Site
                  </div>
                  <p className="mt-2 text-base font-semibold text-[#0F172A]">{getProjectSite(project)}</p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Financial Visibility</CardTitle>
            <p className="text-sm text-[#64748B]">
              Keep contract value, actual spend, and profitability visible while the job moves through the board.
            </p>
          </CardHeader>
          <CardContent className="grid gap-3 md:grid-cols-2 xl:grid-cols-5">
            <StatCard label="Contract Value" value={formatCurrency(contractValue, currencyCode)} supporting="Booked revenue for this job" />
            <StatCard
              label="Estimated Cost"
              value={formatCurrency(toNumber(project.estimatedCost), currencyCode)}
              supporting="Expected production spend"
            />
            <StatCard label="Actual Cost" value={formatCurrency(actualCost, currencyCode)} supporting="Materials, labor, and expenses" />
            <StatCard label="Gross Profit" value={formatCurrency(grossProfit, currencyCode)} supporting="Revenue minus actual cost" accent={grossProfit >= 0} />
            <StatCard label="Profit Margin" value={`${profitMargin.toFixed(1)}%`} supporting="Margin on contract value" accent={profitMargin >= 20} />

            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 shadow-sm md:col-span-2 xl:col-span-5">
              <div className="grid gap-3 md:grid-cols-3">
                <DetailRow label="Material Cost" value={formatCurrency(materialCost, currencyCode)} />
                <DetailRow label="Labor Cost" value={formatCurrency(laborCost, currencyCode)} />
                <DetailRow label="Other Expenses" value={formatCurrency(expenseCost, currencyCode)} />
              </div>
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Invoice Preview</CardTitle>
            <p className="text-sm text-[#64748B]">
              This job continuously builds the invoice draft in the background so billing is ready when the roof is done.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[0.9fr,1.1fr]">
            <div className="space-y-4">
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 shadow-sm">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <div>
                    <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Draft Status</p>
                    <div className="mt-2 flex flex-wrap items-center gap-2">
                      <Badge className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-2.5 py-1 text-xs font-medium text-[#334155]">
                        {liveInvoice ? liveInvoiceStatus.replace(/_/g, " ") : "Draft pending"}
                      </Badge>
                      <Badge className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] px-2.5 py-1 text-xs font-medium text-[#166534]">
                        {isCompletedJob ? "Ready for review" : "Auto-sync active"}
                      </Badge>
                    </div>
                  </div>

                  {isCompletedJob && liveInvoice ? (
                    <Button
                      className="rounded-md"
                      onClick={() =>
                        navigate(
                          `/invoice/create?projectId=${encodeURIComponent(project.id)}&invoiceId=${encodeURIComponent(readText(liveInvoice.id))}&mode=review`,
                        )
                      }
                    >
                      <FileText className="mr-2 h-4 w-4" />
                      Review & Send Invoice
                    </Button>
                  ) : (
                    <Button
                      variant="outline"
                      className="rounded-md"
                      onClick={() => navigate(`/projects/${id}/edit`)}
                    >
                      <Pencil className="mr-2 h-4 w-4" />
                      Update Job Costs
                    </Button>
                  )}
                </div>

                <div className="mt-4 space-y-1">
                  <DetailRow label="Client" value={getProjectClientName(project)} />
                  <DetailRow label="Job Site" value={getProjectSite(project)} />
                  <DetailRow label="Linked Quote" value={readText(project.quote?.quoteNumber) || "No estimate linked"} />
                  <DetailRow label="Sync Mode" value={isCompletedJob ? "Locked on completion" : "Live with every job update"} />
                </div>
              </div>

              {missedBillingAmount > 0 ? (
                <div className="rounded-md border border-[#FDE68A] bg-[#FFFBEB] p-4 shadow-sm">
                  <div className="flex items-start gap-3">
                    <div className="flex h-10 w-10 items-center justify-center rounded-md bg-white text-[#92400E] shadow-sm">
                      <AlertCircle className="h-4 w-4" />
                    </div>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-[#0F172A]">You forgot to bill {formatCurrency(missedBillingAmount, currencyCode)}</p>
                      <p className="mt-1 text-sm text-[#64748B]">
                        Some labor or add-ons are still outside the live invoice draft.
                      </p>
                      <div className="mt-3 space-y-2">
                        {missedBillingRows.map((row) => (
                          <div
                            key={row.label}
                            className="flex items-center justify-between rounded-md border border-[rgba(15,23,42,0.06)] bg-white px-3 py-2 text-sm"
                          >
                            <span className="text-[#64748B]">{row.label}</span>
                            <span className="font-medium text-[#0F172A]">{formatCurrency(row.value, currencyCode)}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              ) : (
                <div className="rounded-md border border-[#BBF7D0] bg-[#F0FDF4] p-4 shadow-sm">
                  <p className="text-sm font-semibold text-[#0F172A]">Billing coverage looks clean</p>
                  <p className="mt-1 text-sm text-[#64748B]">
                    Materials, billable labor, and selected add-ons are flowing into the invoice draft automatically.
                  </p>
                </div>
              )}

              {invoiceSuggestions.length > 0 ? (
                <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                  <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Smart Suggestions</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {invoiceSuggestions.map((suggestion) => (
                      <Button
                        key={suggestion}
                        type="button"
                        variant="outline"
                        className="rounded-md"
                        onClick={() => navigate(`/projects/${id}/edit`)}
                      >
                        <Sparkles className="mr-2 h-4 w-4" />
                        {suggestion}
                      </Button>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>

            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
              {!liveInvoice ? (
                <div className="rounded-md border border-dashed border-[#D7E3EA] bg-[#F8FAFC] px-6 py-12 text-center">
                  <FileText className="mx-auto h-8 w-8 text-[#94A3B8]" />
                  <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">Invoice draft is being prepared</h3>
                  <p className="mt-2 text-sm text-[#64748B]">
                    Link this job to a client estimate and the invoice preview will appear here automatically.
                  </p>
                </div>
              ) : (
                <>
                  <div className="flex flex-wrap items-start justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-[#0F172A]">{readText(liveInvoice.invoiceNumber) || "Draft invoice"}</p>
                      <p className="mt-1 text-xs text-[#64748B]">
                        {isCompletedJob ? "Final values are locked and ready for client review." : "Updates as materials, labor, and add-ons change."}
                      </p>
                    </div>
                    <Badge className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155]">
                      {formatCurrency(liveInvoiceTotal, currencyCode)}
                    </Badge>
                  </div>

                  <div className="mt-4 overflow-hidden rounded-md border border-[rgba(15,23,42,0.06)]">
                    <table className="w-full">
                      <thead>
                        <tr className="border-b border-[rgba(15,23,42,0.06)] bg-[#F8FAFC]">
                          <th className="px-3 py-2 text-left text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Line Item</th>
                          <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Qty</th>
                          <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Rate</th>
                          <th className="px-3 py-2 text-right text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Amount</th>
                        </tr>
                      </thead>
                      <tbody>
                        {liveInvoiceItems.map((item, index) => (
                          <tr key={`${readText(item.description)}-${index}`} className="border-b border-[rgba(15,23,42,0.06)] last:border-b-0">
                            <td className="px-3 py-3">
                              <p className="text-sm font-medium text-[#0F172A]">{readText(item.description) || "Line item"}</p>
                            </td>
                            <td className="px-3 py-3 text-right text-sm text-[#475569]">{toNumber(item.quantity).toFixed(2)}</td>
                            <td className="px-3 py-3 text-right text-sm text-[#475569]">{formatCurrency(toNumber(item.unitPrice), currencyCode)}</td>
                            <td className="px-3 py-3 text-right text-sm font-medium text-[#0F172A]">{formatCurrency(toNumber(item.amount), currencyCode)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>

                  <div className="mt-4 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 shadow-sm">
                    <DetailRow label="Subtotal" value={formatCurrency(liveInvoiceSubtotal, currencyCode)} />
                    <DetailRow
                      label={liveInvoiceTaxRate > 0 ? `Taxes (${liveInvoiceTaxRate.toFixed(1)}%)` : "Taxes"}
                      value={formatCurrency(liveInvoiceTaxAmount, currencyCode)}
                    />
                    <DetailRow label="Paid" value={formatCurrency(liveInvoiceAmountPaid, currencyCode)} />
                    <DetailRow label="Amount Due" value={formatCurrency(liveInvoiceAmountDue || liveInvoiceTotal, currencyCode)} />
                    <DetailRow label="Profit Margin" value={`${profitMargin.toFixed(1)}%`} />
                  </div>
                </>
              )}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Production</CardTitle>
            <p className="text-sm text-[#64748B]">
              Crew readiness, permit and insurance checkpoints, and field execution details for this roofing job.
            </p>
          </CardHeader>
          <CardContent className="grid gap-4 xl:grid-cols-[1.1fr,0.9fr]">
            <div className="grid gap-3 sm:grid-cols-2">
              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  <Users className="h-3.5 w-3.5" />
                  Crew Assigned
                </div>
                <p className="mt-2 text-lg font-semibold text-[#0F172A]">{getCrewSummary(project)}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {members.length > 0 ? `${members.length} team member${members.length === 1 ? "" : "s"} attached to the job` : "Assign a crew when production is ready"}
                </p>
              </div>

              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  <HardHat className="h-3.5 w-3.5" />
                  Work Status
                </div>
                <p className="mt-2 text-lg font-semibold text-[#0F172A]">{workStatus}</p>
                <p className="mt-1 text-xs text-[#64748B]">
                  {stageKey === "production" ? "This job is currently in field operations." : "Move the job to Production when crews are scheduled."}
                </p>
              </div>

              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  <ShieldEllipsis className="h-3.5 w-3.5" />
                  Permit
                </div>
                <div className={cn("mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-medium", getIndicatorToneClasses(permit.tone))}>
                  {permit.label}
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#475569]">
                  <DetailRow label="Permit Number" value={readText(project.permitNumber) || "Not captured"} />
                  <DetailRow label="Submitted" value={formatTimelineDate(project.permitPulledDate)} />
                  <DetailRow label="Approved" value={formatTimelineDate(project.permitApprovedDate)} />
                </div>
              </div>

              <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">
                  <ShieldCheck className="h-3.5 w-3.5" />
                  Insurance
                </div>
                <div className={cn("mt-3 inline-flex rounded-md border px-2.5 py-1 text-xs font-medium", getIndicatorToneClasses(insurance.tone))}>
                  {insurance.label}
                </div>
                <div className="mt-4 space-y-2 text-sm text-[#475569]">
                  <DetailRow label="Carrier" value={readText(project.insuranceCompany) || "Not needed"} />
                  <DetailRow label="Claim #" value={readText(project.claimNumber) || "Not captured"} />
                  <DetailRow label="Policy #" value={readText(project.policyNumber) || "Not captured"} />
                </div>
              </div>
            </div>

            <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
              <h3 className="text-sm font-semibold text-[#0F172A]">Field Snapshot</h3>
              <div className="mt-4 space-y-1">
                <DetailRow label="Start Date" value={formatTimelineDate(startDate)} />
                <DetailRow label="Target Finish" value={formatTimelineDate(dueDate)} />
                <DetailRow label="Job Site" value={getProjectSite(project)} />
                <DetailRow label="Roof Type" value={readText(project.roofType) || "Not captured"} />
                <DetailRow label="Manufacturer" value={readText(project.shingleManufacturer) || "Not captured"} />
                <DetailRow label="Color" value={readText(project.shingleColor) || "Not captured"} />
              </div>

              <div className="mt-5 rounded-md border border-[#E0F2FE] bg-[#F0F9FF] p-4">
                <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#0E7490]">Overview</p>
                <p className="mt-2 text-sm text-[#0F172A]">
                  {stageMeta.description}. Current next step: <span className="font-semibold">{getNextAction(project)}</span>.
                </p>
              </div>

              {members.length > 0 ? (
                <div className="mt-5">
                  <p className="text-xs font-semibold uppercase tracking-[0.16em] text-[#64748B]">Assigned Team</p>
                  <div className="mt-3 flex flex-wrap gap-2">
                    {members.slice(0, 8).map((member) => (
                      <Badge key={readText(member.id) || getMemberName(member)} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155]">
                        {getMemberName(member)}
                      </Badge>
                    ))}
                  </div>
                </div>
              ) : null}
            </div>
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-[#0F172A]">Tasks</CardTitle>
                <p className="mt-1 text-sm text-[#64748B]">
                  Roofing-specific work items for inspection, permit coordination, installation, and closeout.
                </p>
              </div>
              <Button className="rounded-md bg-[#0E7490] hover:bg-[#155E75]" onClick={() => setShowAddTask(true)}>
                <Plus className="mr-2 h-4 w-4" />
                Add Roofing Task
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="mb-4 flex flex-wrap gap-2">
              {ROOFING_TASK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setNewTask((current) => ({ ...current, title: suggestion }))}
                  className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-1.5 text-sm text-[#334155] transition hover:border-[#BAE6FD] hover:bg-[#F0F9FF]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="mb-5 grid gap-3 md:grid-cols-3">
              <StatCard label="Open Tasks" value={String(displayTasks.length - doneTasks)} supporting="Still in progress" />
              <StatCard label="Completed" value={String(doneTasks)} supporting="Finished work items" accent={doneTasks > 0} />
              <StatCard
                label="Completion"
                value={`${displayTasks.length ? Math.round((doneTasks / displayTasks.length) * 100) : 0}%`}
                supporting="Task completion across this job"
              />
            </div>

            {loadingTasks ? (
              <div className="flex items-center justify-center py-12 text-sm text-[#64748B]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#0E7490]" />
                Loading roofing tasks...
              </div>
            ) : displayTasks.length === 0 ? (
              <div className="rounded-md border border-dashed border-[#D7E3EA] bg-[#F8FAFC] px-6 py-14 text-center">
                <CheckSquare className="mx-auto h-8 w-8 text-[#94A3B8]" />
                <h3 className="mt-4 text-lg font-semibold text-[#0F172A]">No tasks on this job yet</h3>
                <p className="mt-2 text-sm text-[#64748B]">
                  Start with inspection, permit submission, or material ordering so the crew has a clear next step.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {displayTasks.map((task, index) => (
                  <div key={readText(task.id) || `${task.normalizedTitle}-${index}`} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                    <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                      <div className="min-w-0">
                        <div className="flex flex-wrap items-center gap-2">
                          <Badge className={cn("rounded-md border px-2 py-1 text-xs font-medium", getTaskStatusTone(task.status))}>
                            {task.statusLabel}
                          </Badge>
                          <Badge className={cn("rounded-md border px-2 py-1 text-xs font-medium", getTaskPriorityTone(task.priority))}>
                            {readText(task.priority) || "Medium"}
                          </Badge>
                        </div>
                        <h3 className="mt-3 text-base font-semibold text-[#0F172A]">{task.normalizedTitle}</h3>
                        {readText(task.description) ? (
                          <p className="mt-1 text-sm text-[#64748B]">{readText(task.description)}</p>
                        ) : null}
                      </div>

                      <div className="grid gap-2 text-sm text-[#475569] sm:grid-cols-3 lg:min-w-[360px]">
                        <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Due</p>
                          <p className="mt-1 font-medium text-[#0F172A]">{formatTimelineDate(readText(task.dueDate))}</p>
                        </div>
                        <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Assignee</p>
                          <p className="mt-1 font-medium text-[#0F172A]">{getAssigneeLabel(task)}</p>
                        </div>
                        <div className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-2">
                          <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-[#64748B]">Relative</p>
                          <p className="mt-1 font-medium text-[#0F172A]">{formatRelativeTimeline(readText(task.dueDate))}</p>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Files</CardTitle>
            <p className="text-sm text-[#64748B]">
              Documents are grouped the way a roofing team expects: inspection, contract, permit, insurance, and operations.
            </p>
          </CardHeader>
          <CardContent>
            {loadingFiles ? (
              <div className="flex items-center justify-center py-12 text-sm text-[#64748B]">
                <Loader2 className="mr-2 h-4 w-4 animate-spin text-[#0E7490]" />
                Loading job files...
              </div>
            ) : (
              <div className="grid gap-4 xl:grid-cols-2">
                {groupedFiles.map((group) => (
                  <div key={group.key} className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-4 shadow-sm">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <h3 className="text-base font-semibold text-[#0F172A]">{getCategoryGroupLabel(group.key)}</h3>
                        <p className="mt-1 text-sm text-[#64748B]">{group.items.length} file{group.items.length === 1 ? "" : "s"}</p>
                      </div>
                      <Badge className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-2.5 py-1 text-xs font-medium text-[#334155]">
                        {group.label}
                      </Badge>
                    </div>

                    <div className="mt-4 space-y-3">
                      {group.items.length === 0 ? (
                        <div className="rounded-md border border-dashed border-[#D7E3EA] bg-[#F8FAFC] px-3 py-5 text-center text-sm text-[#94A3B8]">
                          No {group.label.toLowerCase()} files yet
                        </div>
                      ) : (
                        group.items.map((item) => (
                          <div key={item.id} className="flex items-start justify-between gap-3 rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] p-3">
                            <div className="min-w-0">
                              <div className="flex items-center gap-2">
                                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-white text-[#0E7490] shadow-sm">
                                  <FileText className="h-4 w-4" />
                                </div>
                                <div className="min-w-0">
                                  <p className="truncate text-sm font-semibold text-[#0F172A]">{item.title}</p>
                                  <p className="text-xs text-[#64748B]">
                                    {item.sourceLabel} • {item.dateLabel}
                                  </p>
                                </div>
                              </div>
                            </div>

                            {item.href ? (
                              <a
                                href={item.href}
                                target="_blank"
                                rel="noreferrer"
                                className="rounded-md border border-[rgba(15,23,42,0.06)] bg-white p-2 text-[#0E7490] transition hover:bg-[#F0F9FF]"
                              >
                                <Download className="h-4 w-4" />
                              </a>
                            ) : null}
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="mt-6 rounded-md border-[rgba(15,23,42,0.08)] shadow-sm hover:shadow-lg transition-all">
          <CardHeader className="pb-2">
            <CardTitle className="text-lg font-semibold text-[#0F172A]">Activity Timeline</CardTitle>
            <p className="text-sm text-[#64748B]">
              A running history of updates, task changes, and activity around this roofing job.
            </p>
          </CardHeader>
          <CardContent>
            <ActivityTimeline entityType="Project" entityId={id!} />
          </CardContent>
        </Card>
      </div>

      <Dialog open={showAddTask} onOpenChange={setShowAddTask}>
        <DialogContent className="rounded-md sm:max-w-[560px]">
          <DialogHeader>
            <DialogTitle>Add Roofing Task</DialogTitle>
            <DialogDescription>
              Use roofing-friendly task names so the field team knows exactly what comes next on this job.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="flex flex-wrap gap-2">
              {ROOFING_TASK_SUGGESTIONS.map((suggestion) => (
                <button
                  key={suggestion}
                  type="button"
                  onClick={() => setNewTask((current) => ({ ...current, title: suggestion }))}
                  className="rounded-md border border-[rgba(15,23,42,0.06)] bg-[#F8FAFC] px-3 py-1.5 text-sm text-[#334155] transition hover:border-[#BAE6FD] hover:bg-[#F0F9FF]"
                >
                  {suggestion}
                </button>
              ))}
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-title">Task Name</Label>
              <Input
                id="task-title"
                placeholder="Inspection"
                value={newTask.title}
                onChange={(event) => setNewTask((current) => ({ ...current, title: event.target.value }))}
                className="rounded-md"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="task-description">Description</Label>
              <Textarea
                id="task-description"
                placeholder="Add notes for the crew, permit runner, or office team..."
                value={newTask.description}
                onChange={(event) => setNewTask((current) => ({ ...current, description: event.target.value }))}
                className="rounded-md"
              />
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label>Priority</Label>
                <Select value={newTask.priority} onValueChange={(value) => setNewTask((current) => ({ ...current, priority: value }))}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="LOW">Low</SelectItem>
                    <SelectItem value="MEDIUM">Medium</SelectItem>
                    <SelectItem value="HIGH">High</SelectItem>
                    <SelectItem value="URGENT">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-1.5">
                <Label>Status</Label>
                <Select value={newTask.status} onValueChange={(value) => setNewTask((current) => ({ ...current, status: value }))}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="TODO">To Do</SelectItem>
                    <SelectItem value="IN_PROGRESS">In Progress</SelectItem>
                    <SelectItem value="DONE">Done</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-1.5">
                <Label htmlFor="task-due-date">Due Date</Label>
                <Input
                  id="task-due-date"
                  type="date"
                  value={newTask.dueDate}
                  onChange={(event) => setNewTask((current) => ({ ...current, dueDate: event.target.value }))}
                  className="rounded-md"
                />
              </div>

              <div className="space-y-1.5">
                <Label>Assign To</Label>
                <Select value={newTask.assignedToId} onValueChange={(value) => setNewTask((current) => ({ ...current, assignedToId: value }))}>
                  <SelectTrigger className="rounded-md">
                    <SelectValue placeholder="Unassigned" />
                  </SelectTrigger>
                  <SelectContent className="rounded-md">
                    <SelectItem value="none">Unassigned</SelectItem>
                    {employees.map((employee) => {
                      const user = (employee.user as Record<string, unknown> | undefined) || {};
                      const employeeId = readText(user.id) || readText(employee.id);
                      const employeeName = [readText(user.firstName), readText(user.lastName)]
                        .filter(Boolean)
                        .join(" ")
                        .trim();

                      if (!employeeId || !employeeName) return null;

                      return (
                        <SelectItem key={employeeId} value={employeeId}>
                          {employeeName}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" className="rounded-md" onClick={() => setShowAddTask(false)}>
              Cancel
            </Button>
            <Button
              className="rounded-md bg-[#0E7490] hover:bg-[#155E75]"
              onClick={handleCreateTask}
              disabled={creatingTask || !newTask.title.trim()}
            >
              {creatingTask ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Creating...
                </>
              ) : (
                <>
                  <Plus className="mr-2 h-4 w-4" />
                  Create Task
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
