import type { ProjectEntity } from "@/features/projects/services/projects-service";

export type RoofingStageKey =
  | "inspection"
  | "estimate"
  | "insurance"
  | "permit"
  | "production"
  | "quality-check"
  | "completed"
  | "invoiced";

export interface RoofingStageMeta {
  key: RoofingStageKey;
  label: string;
  shortLabel: string;
  description: string;
  accent: string;
  accentText: string;
  softBg: string;
  border: string;
  dot: string;
}

export interface MiniStatusIndicator {
  label: string;
  tone: "neutral" | "info" | "success" | "warning" | "danger";
}

export interface RoofingFileItem {
  id: string;
  title: string;
  categoryGroup: "inspection" | "contract" | "permit" | "insurance" | "operations";
  categoryLabel: string;
  dateLabel: string;
  href?: string | null;
  sourceLabel: string;
}

const currencyCache = new Map<string, Intl.NumberFormat>();

const GENERIC_TASK_TITLE = /^(task|new task|todo|untitled)(\s+\d+)?$/i;

const STAGE_META: Record<RoofingStageKey, RoofingStageMeta> = {
  inspection: {
    key: "inspection",
    label: "Inspection",
    shortLabel: "Inspect",
    description: "Initial site review and roof condition capture",
    accent: "bg-[#E0F2FE]",
    accentText: "text-[#0369A1]",
    softBg: "bg-[#F0F9FF]",
    border: "border-[#BAE6FD]",
    dot: "bg-[#0EA5E9]",
  },
  estimate: {
    key: "estimate",
    label: "Estimate",
    shortLabel: "Estimate",
    description: "Scope confirmation, proposal, and contract alignment",
    accent: "bg-[#E0F2FE]",
    accentText: "text-[#075985]",
    softBg: "bg-[#F8FAFC]",
    border: "border-[#BFDBFE]",
    dot: "bg-[#3B82F6]",
  },
  insurance: {
    key: "insurance",
    label: "Insurance",
    shortLabel: "Insurance",
    description: "Claim, adjuster, and approval tracking",
    accent: "bg-[#F3E8FF]",
    accentText: "text-[#7E22CE]",
    softBg: "bg-[#FAF5FF]",
    border: "border-[#E9D5FF]",
    dot: "bg-[#A855F7]",
  },
  permit: {
    key: "permit",
    label: "Permit",
    shortLabel: "Permit",
    description: "Permit submission, approval, and municipality coordination",
    accent: "bg-[#FEF3C7]",
    accentText: "text-[#B45309]",
    softBg: "bg-[#FFFBEB]",
    border: "border-[#FDE68A]",
    dot: "bg-[#F59E0B]",
  },
  production: {
    key: "production",
    label: "Production",
    shortLabel: "Build",
    description: "Crew deployment, materials, and field execution",
    accent: "bg-[#DCFCE7]",
    accentText: "text-[#15803D]",
    softBg: "bg-[#F0FDF4]",
    border: "border-[#BBF7D0]",
    dot: "bg-[#22C55E]",
  },
  "quality-check": {
    key: "quality-check",
    label: "Quality Check",
    shortLabel: "QC",
    description: "Punch list, final inspection, and closeout verification",
    accent: "bg-[#FCE7F3]",
    accentText: "text-[#BE185D]",
    softBg: "bg-[#FDF2F8]",
    border: "border-[#FBCFE8]",
    dot: "bg-[#EC4899]",
  },
  completed: {
    key: "completed",
    label: "Completed",
    shortLabel: "Done",
    description: "Roofing work finished and ready for billing",
    accent: "bg-[#DCFCE7]",
    accentText: "text-[#166534]",
    softBg: "bg-[#F0FDF4]",
    border: "border-[#86EFAC]",
    dot: "bg-[#16A34A]",
  },
  invoiced: {
    key: "invoiced",
    label: "Invoiced",
    shortLabel: "Invoice",
    description: "Final invoice out and payment collection underway",
    accent: "bg-[#DBEAFE]",
    accentText: "text-[#1D4ED8]",
    softBg: "bg-[#EFF6FF]",
    border: "border-[#93C5FD]",
    dot: "bg-[#2563EB]",
  },
};

const STAGE_MATCHERS: Array<{ pattern: RegExp; key: RoofingStageKey }> = [
  { pattern: /invoice|billing|paid|payment/i, key: "invoiced" },
  { pattern: /completed|closeout|closed/i, key: "completed" },
  { pattern: /quality|final inspection|qc|final-check/i, key: "quality-check" },
  { pattern: /production|install|materials delivered|in progress|roof install/i, key: "production" },
  { pattern: /permit/i, key: "permit" },
  { pattern: /insurance|claim|adjuster/i, key: "insurance" },
  { pattern: /estimate|proposal|contract/i, key: "estimate" },
  { pattern: /inspection|measure/i, key: "inspection" },
];

export const ROOFING_STAGE_ORDER: RoofingStageKey[] = [
  "inspection",
  "estimate",
  "insurance",
  "permit",
  "production",
  "quality-check",
  "completed",
  "invoiced",
];

export const ROOFING_TASK_SUGGESTIONS = [
  "Inspection",
  "Material Ordering",
  "Permit Submission",
  "Roof Installation",
  "Cleanup & Final Check",
] as const;

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

function toDate(value: unknown): Date | null {
  if (!value) return null;
  const date = new Date(String(value));
  return Number.isNaN(date.getTime()) ? null : date;
}

function getCurrencyFormatter(currencyCode: string): Intl.NumberFormat {
  if (!currencyCache.has(currencyCode)) {
    currencyCache.set(
      currencyCode,
      new Intl.NumberFormat("en-US", {
        style: "currency",
        currency: currencyCode,
        maximumFractionDigits: 0,
      }),
    );
  }

  return currencyCache.get(currencyCode)!;
}

export function formatCurrency(value: number, currencyCode = "USD"): string {
  return getCurrencyFormatter(currencyCode).format(value || 0);
}

export function formatLabel(value?: string | null): string {
  if (!value) return "Unknown";
  return value
    .toLowerCase()
    .replace(/_/g, " ")
    .split(" ")
    .filter(Boolean)
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export function getRoofingStageMeta(stageKey: RoofingStageKey): RoofingStageMeta {
  return STAGE_META[stageKey];
}

export function getProjectCode(project: ProjectEntity): string {
  return (
    readText(project.projectNumber) ||
    readText(project.code) ||
    readText((project as Record<string, unknown>).referenceNumber) ||
    "JOB"
  );
}

export function getProjectClientName(project: ProjectEntity): string {
  const direct = readText(project.client?.clientName);
  if (direct) return direct;

  return (
    readText((project as Record<string, unknown>).clientName) ||
    readText((project as Record<string, unknown>).customerName) ||
    "Unassigned client"
  );
}

export function getProjectJobType(project: ProjectEntity): string {
  const type = readText(project.projectType);
  if (!type) return "Roofing Job";

  switch (type) {
    case "INSURANCE_CLAIM":
      return "Insurance";
    case "NEW_CONSTRUCTION":
      return "New Construction";
    default:
      return formatLabel(type);
  }
}

export function getProjectPriorityLabel(project: ProjectEntity): "Low" | "Medium" | "High" {
  const priority = readText(project.priority).toUpperCase();
  if (priority === "LOW") return "Low";
  if (priority === "NORMAL" || priority === "MEDIUM" || !priority) return "Medium";
  return "High";
}

export function getProjectProgress(project: ProjectEntity): number {
  const raw = project.completionPercentage ?? project.progress ?? 0;
  return Math.min(100, Math.max(0, toNumber(raw)));
}

export function getContractValue(project: ProjectEntity): number {
  return (
    toNumber(project.contractValue) ||
    toNumber((project as Record<string, unknown>).budget)
  );
}

export function getEstimatedCost(project: ProjectEntity): number {
  return toNumber(project.estimatedCost);
}

export function getActualCost(project: ProjectEntity): number {
  const explicit = toNumber(project.actualCost);
  if (explicit > 0) return explicit;

  const materials = Array.isArray((project as Record<string, unknown>).projectMaterials)
    ? ((project as Record<string, unknown>).projectMaterials as Array<Record<string, unknown>>).reduce(
        (sum, item) => sum + toNumber(item.totalCost ?? item.unitCost),
        0,
      )
    : 0;
  const labor = Array.isArray((project as Record<string, unknown>).projectLaborEntries)
    ? ((project as Record<string, unknown>).projectLaborEntries as Array<Record<string, unknown>>).reduce(
        (sum, item) => sum + toNumber(item.totalCost ?? item.cost),
        0,
      )
    : 0;
  const expenses = Array.isArray((project as Record<string, unknown>).projectExpenses)
    ? ((project as Record<string, unknown>).projectExpenses as Array<Record<string, unknown>>).reduce(
        (sum, item) => sum + toNumber(item.amount ?? item.totalCost),
        0,
      )
    : 0;

  return materials + labor + expenses;
}

export function getGrossProfit(project: ProjectEntity): number {
  const explicit = toNumber(project.grossProfit);
  if (explicit || explicit === 0) {
    const contract = getContractValue(project);
    if (explicit !== 0 || contract === 0) {
      return explicit;
    }
  }
  return getContractValue(project) - getActualCost(project);
}

export function getProfitMargin(project: ProjectEntity): number {
  const explicit = toNumber((project as Record<string, unknown>).profitMargin);
  if (explicit) return explicit;

  const contract = getContractValue(project);
  if (contract <= 0) return 0;
  return (getGrossProfit(project) / contract) * 100;
}

export function getRoofingStage(project: ProjectEntity): RoofingStageKey {
  const projectRecord = project as Record<string, unknown>;
  const explicitStageText = [
    readText(project.stage?.name),
    readText(project.stage?.id),
    readText((project.stage as Record<string, unknown> | undefined)?.slug),
    readText(project.status),
  ]
    .filter(Boolean)
    .join(" ");

  for (const matcher of STAGE_MATCHERS) {
    if (matcher.pattern.test(explicitStageText)) {
      return matcher.key;
    }
  }

  const invoices = Number((project._count?.invoices ?? 0) || 0);
  const payments = Number((project._count?.payments ?? 0) || 0);
  const isCompleted =
    Boolean(projectRecord.isCompleted) ||
    readText(project.status).toUpperCase() === "COMPLETED" ||
    getProjectProgress(project) >= 100 ||
    Boolean(project.actualEndDate);

  if (isCompleted && (invoices > 0 || payments > 0)) {
    return "invoiced";
  }
  if (isCompleted) {
    return "completed";
  }

  const qualitySignals =
    toNumber(projectRecord.qualityScore) > 0 ||
    toNumber(projectRecord.clientRating) > 0 ||
    Array.isArray(projectRecord.projectInspections) &&
      (projectRecord.projectInspections as Array<Record<string, unknown>>).length > 0 &&
      getProjectProgress(project) >= 85;
  if (qualitySignals) {
    return "quality-check";
  }

  const workStatus = getWorkStatus(project);
  if (workStatus === "In Progress" || workStatus === "Delayed") {
    return "production";
  }

  const permit = getPermitIndicator(project);
  if (permit.label !== "Approved" && permit.label !== "Not Required") {
    return "permit";
  }

  const insurance = getInsuranceIndicator(project);
  if (insurance.label !== "Approved" && insurance.label !== "Not Needed") {
    return "insurance";
  }

  const contractSignals =
    getContractValue(project) > 0 ||
    Boolean(projectRecord.quoteId) ||
    Boolean(projectRecord.estimatedCost);
  if (contractSignals) {
    return "estimate";
  }

  return "inspection";
}

export function getStageIndex(stageKey: RoofingStageKey): number {
  return ROOFING_STAGE_ORDER.indexOf(stageKey);
}

export function getWorkStatus(project: ProjectEntity): "Not Started" | "In Progress" | "Delayed" | "Completed" {
  const status = readText(project.status).toUpperCase();
  const crewAssignments = Array.isArray((project as Record<string, unknown>).crewAssignments)
    ? ((project as Record<string, unknown>).crewAssignments as Array<Record<string, unknown>>)
    : [];

  if (
    status === "COMPLETED" ||
    Boolean((project as Record<string, unknown>).isCompleted) ||
    getProjectProgress(project) >= 100 ||
    Boolean(project.actualEndDate)
  ) {
    return "Completed";
  }

  const latestCrewStatus = readText(crewAssignments[0]?.status).toUpperCase();
  if (latestCrewStatus === "POSTPONED") {
    return "Delayed";
  }
  if (latestCrewStatus === "IN_PROGRESS" || status === "IN_PROGRESS" || status === "ACTIVE" || Boolean(project.actualStartDate)) {
    return "In Progress";
  }

  const due = toDate(project.estimatedEndDate ?? project.dueDate ?? project.endDate);
  if (due && due.getTime() < Date.now() && getProjectProgress(project) < 100) {
    return "Delayed";
  }

  return "Not Started";
}

export function getCrewSummary(project: ProjectEntity): string {
  const projectRecord = project as Record<string, unknown>;
  const crewAssignments = Array.isArray(projectRecord.crewAssignments)
    ? (projectRecord.crewAssignments as Array<Record<string, unknown>>)
    : [];
  const totalWorkers = crewAssignments.reduce((sum, assignment) => sum + toNumber(assignment.workerCount), 0);
  if (crewAssignments.length > 0) {
    if (totalWorkers > 0) {
      return `${crewAssignments.length} crew${crewAssignments.length === 1 ? "" : "s"} / ${totalWorkers} workers`;
    }
    return `${crewAssignments.length} crew assignment${crewAssignments.length === 1 ? "" : "s"}`;
  }

  const members = Array.isArray(projectRecord.members)
    ? (projectRecord.members as Array<Record<string, unknown>>)
    : [];
  if (members.length > 0) {
    return `${members.length} team member${members.length === 1 ? "" : "s"}`;
  }

  return "No crew assigned";
}

export function getProjectSite(project: ProjectEntity): string {
  const site = [
    readText((project as Record<string, unknown>).jobSiteAddress),
    readText((project as Record<string, unknown>).jobSiteCity),
    readText((project as Record<string, unknown>).jobSiteState),
  ].filter(Boolean);

  return site.join(", ") || readText((project as Record<string, unknown>).location) || "Site not captured";
}

export function getNextAction(project: ProjectEntity): string {
  const stage = getRoofingStage(project);
  const permit = getPermitIndicator(project);
  const insurance = getInsuranceIndicator(project);
  const workStatus = getWorkStatus(project);

  if (stage === "inspection") return "Schedule Inspection";
  if (stage === "estimate") return getContractValue(project) > 0 ? "Review Signed Contract" : "Send Estimate";
  if (stage === "insurance") {
    return insurance.label === "Pending" ? "Follow Insurance Approval" : "Meet Adjuster";
  }
  if (stage === "permit") {
    return permit.label === "Not Applied" ? "Submit Permit" : "Track Permit Approval";
  }
  if (stage === "production") {
    if (workStatus === "Not Started") return "Dispatch Crew";
    if (workStatus === "Delayed") return "Resolve Field Delay";
    return "Monitor Roof Installation";
  }
  if (stage === "quality-check") return "Run Final Quality Check";
  if (stage === "completed") return "Prepare Final Invoice";
  return "Collect Final Payment";
}

export function getPermitIndicator(project: ProjectEntity): MiniStatusIndicator {
  const required = project.permitRequired ?? true;
  if (!required) {
    return { label: "Not Required", tone: "neutral" };
  }

  const status = readText(project.permitStatus).toUpperCase();
  if (!status) {
    return { label: "Not Applied", tone: "warning" };
  }

  switch (status) {
    case "APPROVED":
      return { label: "Approved", tone: "success" };
    case "REJECTED":
    case "EXPIRED":
      return { label: "Rejected", tone: "danger" };
    case "SUBMITTED":
    case "PENDING":
      return { label: "Applied", tone: "info" };
    case "NOT_REQUIRED":
      return { label: "Not Required", tone: "neutral" };
    default:
      return { label: "Applied", tone: "info" };
  }
}

export function getInsuranceIndicator(project: ProjectEntity): MiniStatusIndicator {
  if (!project.isInsuranceJob) {
    return { label: "Not Needed", tone: "neutral" };
  }

  const approval = (project as Record<string, unknown>).insuranceApproved;
  if (approval === true) {
    return { label: "Approved", tone: "success" };
  }
  if (approval === false) {
    return { label: "Rejected", tone: "danger" };
  }
  return { label: "Pending", tone: "warning" };
}

export function getIndicatorToneClasses(tone: MiniStatusIndicator["tone"]): string {
  switch (tone) {
    case "success":
      return "border-[#BBF7D0] bg-[#F0FDF4] text-[#166534]";
    case "warning":
      return "border-[#FDE68A] bg-[#FFFBEB] text-[#92400E]";
    case "danger":
      return "border-[#FECACA] bg-[#FEF2F2] text-[#B91C1C]";
    case "info":
      return "border-[#BFDBFE] bg-[#EFF6FF] text-[#1D4ED8]";
    default:
      return "border-[#E2E8F0] bg-[#F8FAFC] text-[#475569]";
  }
}

export function formatTimelineDate(value?: string | null): string {
  const date = toDate(value);
  if (!date) return "No date";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

export function formatRelativeTimeline(value?: string | null): string {
  const date = toDate(value);
  if (!date) return "Timeline not set";

  const diffMs = date.getTime() - Date.now();
  const diffDays = Math.ceil(diffMs / (1000 * 60 * 60 * 24));

  if (diffDays < 0) {
    return `${Math.abs(diffDays)} day${Math.abs(diffDays) === 1 ? "" : "s"} overdue`;
  }
  if (diffDays === 0) return "Due today";
  if (diffDays === 1) return "Due tomorrow";
  return `${diffDays} days out`;
}

export function getFileCategoryGroup(category?: string | null, title?: string | null): RoofingFileItem["categoryGroup"] {
  const normalizedCategory = readText(category).toUpperCase();
  const normalizedTitle = readText(title).toUpperCase();

  if (["INSPECTION_REPORT", "MEASUREMENT_REPORT", "INSPECTION"].includes(normalizedCategory) || /inspection|measure|drone|report/.test(normalizedTitle.toLowerCase())) {
    return "inspection";
  }
  if (["CONTRACT", "CHANGE_ORDER", "PROPOSAL", "WARRANTY"].includes(normalizedCategory) || /contract|proposal|change order|warranty/.test(normalizedTitle.toLowerCase())) {
    return "contract";
  }
  if (normalizedCategory === "PERMIT" || /permit/.test(normalizedTitle.toLowerCase())) {
    return "permit";
  }
  if (["INSURANCE_CLAIM", "INSURANCE_APPROVAL", "SUPPLEMENT"].includes(normalizedCategory) || /insurance|claim|adjuster|supplement/.test(normalizedTitle.toLowerCase())) {
    return "insurance";
  }
  return "operations";
}

export function getCategoryGroupLabel(group: RoofingFileItem["categoryGroup"]): string {
  switch (group) {
    case "inspection":
      return "Inspection";
    case "contract":
      return "Contract";
    case "permit":
      return "Permit";
    case "insurance":
      return "Insurance";
    default:
      return "Operations";
  }
}

export function buildRoofingFileBuckets(
  project: ProjectEntity,
  linkedFiles: Array<Record<string, unknown>>,
): RoofingFileItem[] {
  const projectRecord = project as Record<string, unknown>;
  const documentMeta = new Map<string, Record<string, unknown>>();
  const projectDocuments = Array.isArray(projectRecord.projectDocuments)
    ? (projectRecord.projectDocuments as Array<Record<string, unknown>>)
    : [];

  projectDocuments.forEach((item) => {
    const id = readText(item.documentId ?? item.fileId);
    if (id) {
      documentMeta.set(id, item);
    }
  });

  const files = linkedFiles.map((item) => {
    const fileId = readText(item.id);
    const metadata = fileId ? documentMeta.get(fileId) : undefined;
    const title = readText(item.originalName ?? item.name) || "Project File";
    const category = readText(metadata?.category);
    const group = getFileCategoryGroup(category, title);

    return {
      id: fileId || `file-${title}`,
      title,
      categoryGroup: group,
      categoryLabel: category || getCategoryGroupLabel(group),
      dateLabel: formatTimelineDate(readText(metadata?.addedAt) || readText(item.createdAt)),
      href: readText(item.path) || null,
      sourceLabel: "File",
    } satisfies RoofingFileItem;
  });

  const photos = Array.isArray(projectRecord.projectPhotos)
    ? (projectRecord.projectPhotos as Array<Record<string, unknown>>).map((photo) => {
        const title = readText(photo.filename) || "Project Photo";
        const group = getFileCategoryGroup(readText(photo.category), title);

        return {
          id: readText(photo.id) || `photo-${title}`,
          title,
          categoryGroup: group,
          categoryLabel: formatLabel(readText(photo.category) || "Photo"),
          dateLabel: formatTimelineDate(readText(photo.takenAt) || readText(photo.createdAt)),
          href: readText(photo.url) || null,
          sourceLabel: "Photo",
        } satisfies RoofingFileItem;
      })
    : [];

  return [...files, ...photos];
}

export function groupFilesByCategory(
  files: RoofingFileItem[],
): Array<{ key: RoofingFileItem["categoryGroup"]; label: string; items: RoofingFileItem[] }> {
  return ["inspection", "contract", "permit", "insurance", "operations"].map((group) => ({
    key: group as RoofingFileItem["categoryGroup"],
    label: getCategoryGroupLabel(group as RoofingFileItem["categoryGroup"]),
    items: files.filter((item) => item.categoryGroup === group),
  }));
}

export function normalizeRoofingTaskTitle(title: unknown, index: number): string {
  const text = readText(title);
  if (!text || GENERIC_TASK_TITLE.test(text)) {
    return ROOFING_TASK_SUGGESTIONS[index % ROOFING_TASK_SUGGESTIONS.length];
  }
  return text;
}

export function buildStageBreakdown(projects: ProjectEntity[]): Array<RoofingStageMeta & { count: number; value: number }> {
  return ROOFING_STAGE_ORDER.map((stageKey) => {
    const stageProjects = projects.filter((project) => getRoofingStage(project) === stageKey);
    return {
      ...getRoofingStageMeta(stageKey),
      count: stageProjects.length,
      value: stageProjects.reduce((sum, project) => sum + getContractValue(project), 0),
    };
  });
}
