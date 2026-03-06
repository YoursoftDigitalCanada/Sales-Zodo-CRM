import api from "@/lib/axios";
import { extractApiArray, extractApiData } from "@/types/api";

export type ProjectStatus =
  | "DRAFT"
  | "PENDING"
  | "APPROVED"
  | "SCHEDULED"
  | "IN_PROGRESS"
  | "PLANNING"
  | "ACTIVE"
  | "ON_HOLD"
  | "COMPLETED"
  | "CANCELLED"
  | "ARCHIVED"
  | "WARRANTY_WORK";

export type ProjectPriority = "LOW" | "NORMAL" | "MEDIUM" | "HIGH" | "URGENT" | "EMERGENCY";

export interface ProjectEntity {
  id: string;
  projectNumber?: string | null;
  code?: string | null;
  name: string;
  description?: string | null;
  status?: ProjectStatus | string;
  priority?: ProjectPriority | string;
  projectType?: string | null;
  propertyType?: string | null;
  completionPercentage?: number | null;
  progress?: number | null;
  contractValue?: number | string | null;
  estimatedCost?: number | string | null;
  actualCost?: number | string | null;
  grossProfit?: number | string | null;
  estimatedStartDate?: string | null;
  estimatedEndDate?: string | null;
  actualStartDate?: string | null;
  actualEndDate?: string | null;
  dueDate?: string | null;
  roofType?: string | null;
  shingleManufacturer?: string | null;
  shingleColor?: string | null;
  permitRequired?: boolean | null;
  permitStatus?: string | null;
  isInsuranceJob?: boolean | null;
  insuranceCompany?: string | null;
  client?: {
    id: string;
    clientName?: string | null;
  } | null;
  stage?: {
    id: string;
    name?: string;
    color?: string;
  } | null;
  _count?: Record<string, number>;
  [key: string]: unknown;
}

export interface ProjectSummaryStats {
  total: number;
  active: number;
  completed: number;
  onHold: number;
  contractValue: number;
  actualCost: number;
  grossProfit: number;
  byStatus: Array<{ status: string; count: number }>;
}

export interface ProjectKanbanColumn {
  id: string;
  name: string;
  slug: string;
  order: number;
  count: number;
  projects: ProjectEntity[];
  color?: string;
}

export interface ProjectStageOption {
  id: string;
  name: string;
  slug?: string;
  color?: string;
  isDefault?: boolean;
  isUuid: boolean;
  statusFallback?: string;
}

export interface ProjectClientOption {
  id: string;
  name: string;
  email?: string | null;
  phone?: string | null;
  address?: string | null;
  city?: string | null;
  state?: string | null;
  zip?: string | null;
}

export interface ProjectUserOption {
  id: string;
  name: string;
  email?: string | null;
  role?: string | null;
}

export interface CrewOption {
  id: string;
  name: string;
  isAvailable?: boolean;
  availabilityNote?: string;
  memberCount?: number;
}

const DEFAULT_STAGE_FALLBACKS: Array<{ id: string; name: string; color: string }> = [
  { id: "PENDING", name: "Pending", color: "#F59E0B" },
  { id: "APPROVED", name: "Approved", color: "#3B82F6" },
  { id: "SCHEDULED", name: "Scheduled", color: "#6366F1" },
  { id: "IN_PROGRESS", name: "In Progress", color: "#0891B2" },
  { id: "ON_HOLD", name: "On Hold", color: "#FB923C" },
  { id: "COMPLETED", name: "Completed", color: "#10B981" },
  { id: "CANCELLED", name: "Cancelled", color: "#EF4444" },
];

export async function getProjects(params?: Record<string, unknown>): Promise<ProjectEntity[]> {
  const response = await api.get("/projects", { params: { limit: 100, ...params } });
  return extractApiArray<ProjectEntity>(response.data);
}

export async function getProjectById(id: string | number): Promise<ProjectEntity> {
  const response = await api.get(`/projects/${id}`);
  return extractApiData<ProjectEntity>(response.data);
}

export async function deleteProjectById(projectId: string | number): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}

export async function createProject(data: Record<string, unknown>): Promise<ProjectEntity> {
  const response = await api.post("/projects", data);
  return extractApiData<ProjectEntity>(response.data);
}

export async function updateProject(projectId: string | number, data: Record<string, unknown>): Promise<ProjectEntity> {
  const response = await api.put(`/projects/${projectId}`, data);
  return extractApiData<ProjectEntity>(response.data);
}

export async function updateProjectStatus(projectId: string | number, status: string): Promise<ProjectEntity> {
  const response = await api.patch(`/projects/${projectId}/status`, { status });
  return extractApiData<ProjectEntity>(response.data);
}

export async function updateProjectStage(projectId: string | number, stageId: string, notes?: string): Promise<ProjectEntity> {
  const response = await api.patch(`/projects/${projectId}/stage`, { stageId, notes });
  return extractApiData<ProjectEntity>(response.data);
}

export async function getProjectSummaryStats(): Promise<ProjectSummaryStats> {
  const response = await api.get("/projects/stats/summary");
  return extractApiData<ProjectSummaryStats>(response.data);
}

export async function getProjectKanban(): Promise<ProjectKanbanColumn[]> {
  const response = await api.get("/projects/kanban");
  return extractApiArray<ProjectKanbanColumn>(response.data);
}

export async function getProjectCalendar(): Promise<ProjectEntity[]> {
  const response = await api.get("/projects/calendar");
  return extractApiArray<ProjectEntity>(response.data);
}

export async function getProjectMap(): Promise<ProjectEntity[]> {
  const response = await api.get("/projects/map");
  return extractApiArray<ProjectEntity>(response.data);
}

function safeString(value: unknown): string {
  if (typeof value === "string") return value.trim();
  if (typeof value === "number") return String(value);
  return "";
}

function mapClientRows(rows: Array<Record<string, unknown>>): ProjectClientOption[] {
  return rows
    .map((row) => ({
      id: safeString(row.id ?? row.Id),
      name:
        safeString(row.clientName ?? row.name ?? row.companyName) ||
        [safeString(row.firstName), safeString(row.lastName)].filter(Boolean).join(" ").trim() ||
        "Client",
      email: safeString(row.primaryEmail ?? row.email) || null,
      phone: safeString(row.primaryPhone ?? row.phone ?? row.mobile) || null,
      address: safeString(row.streetAddress ?? row.address) || null,
      city: safeString(row.city) || null,
      state: safeString(row.province ?? row.state) || null,
      zip: safeString(row.postalCode ?? row.zip) || null,
    }))
    .filter((row) => row.id.length > 0);
}

function mapEmployeesToCrewOptions(
  employees: Array<Record<string, unknown>>,
  params?: { startDate?: string; endDate?: string },
): CrewOption[] {
  return employees
    .map((emp) => {
      const dept = safeString(emp.department);
      const user = (emp.user as Record<string, unknown> | undefined) || {};
      return {
        id: safeString(emp.id ?? emp.userId ?? user.id),
        name: dept || [safeString(user.firstName), safeString(user.lastName)].filter(Boolean).join(" ").trim() || "Crew",
        isAvailable: true,
        availabilityNote: params?.startDate
          ? `Available for ${params.startDate}${params.endDate ? ` - ${params.endDate}` : ""}`
          : "Availability not provided",
        memberCount: 1,
      } satisfies CrewOption;
    })
    .filter((row) => row.id.length > 0);
}

export async function getProjectStages(): Promise<ProjectStageOption[]> {
  // Use local defaults because some deployments do not expose /project-stages yet.
  return DEFAULT_STAGE_FALLBACKS.map((stage) => ({
    id: stage.id,
    name: stage.name,
    slug: stage.id.toLowerCase(),
    color: stage.color,
    isDefault: stage.id === "PENDING",
    isUuid: false,
    statusFallback: stage.id,
  }));
}

export async function searchProjectClients(search: string): Promise<ProjectClientOption[]> {
  const normalizedSearch = search.trim();
  const params: Record<string, string | number> = {
    page: 1,
    limit: 50,
  };
  if (normalizedSearch.length > 0) {
    params.search = normalizedSearch;
  }

  const response = await api.get("/clients", { params });
  return mapClientRows(extractApiArray<Record<string, unknown>>(response.data));
}

export async function getProjectManagers(): Promise<ProjectUserOption[]> {
  try {
    const response = await api.get("/users", { params: { role: "PROJECT_MANAGER", page: 1, limit: 100 } });
    const rows = extractApiArray<Record<string, unknown>>(response.data);
    if (rows.length > 0) {
      return rows
        .map((row) => {
          const roleRecord = row.role as Record<string, unknown> | undefined;
          return {
            id: safeString(row.id),
            name: [safeString(row.firstName), safeString(row.lastName)].filter(Boolean).join(" ").trim() || safeString(row.email) || "User",
            email: safeString(row.email) || null,
            role: safeString(roleRecord?.name ?? row.role),
          };
        })
        .filter((row) => row.id.length > 0);
    }
  } catch {
    // fallback below
  }

  const response = await api.get("/employees", { params: { page: 1, limit: 200 } });
  return extractApiArray<Record<string, unknown>>(response.data)
    .map((row) => {
      const user = (row.user as Record<string, unknown> | undefined) || {};
      const position = safeString(row.position);
      const roleName = safeString((row.role as Record<string, unknown> | undefined)?.name);
      return {
        id: safeString(user.id ?? row.userId ?? row.id),
        name: [safeString(user.firstName), safeString(user.lastName)].filter(Boolean).join(" ").trim() || safeString(user.email) || "Employee",
        email: safeString(user.email) || null,
        role: position || roleName || null,
      };
    })
    .filter((row) => row.id.length > 0)
    .filter((row) => /project|manager|pm/i.test(row.role || ""));
}

export async function getSalesReps(): Promise<ProjectUserOption[]> {
  try {
    const response = await api.get("/users", { params: { role: "SALES_REP", page: 1, limit: 100 } });
    return extractApiArray<Record<string, unknown>>(response.data)
      .map((row) => {
        const roleRecord = row.role as Record<string, unknown> | undefined;
        return {
          id: safeString(row.id),
          name: [safeString(row.firstName), safeString(row.lastName)].filter(Boolean).join(" ").trim() || safeString(row.email) || "User",
          email: safeString(row.email) || null,
          role: safeString(roleRecord?.name ?? row.role),
        };
      })
      .filter((row) => row.id.length > 0);
  } catch {
    const response = await api.get("/employees", { params: { page: 1, limit: 200 } });
    return extractApiArray<Record<string, unknown>>(response.data)
      .map((row) => {
        const user = (row.user as Record<string, unknown> | undefined) || {};
        const position = safeString(row.position);
        const roleName = safeString((row.role as Record<string, unknown> | undefined)?.name);
        return {
          id: safeString(user.id ?? row.userId ?? row.id),
          name: [safeString(user.firstName), safeString(user.lastName)].filter(Boolean).join(" ").trim() || safeString(user.email) || "Employee",
          email: safeString(user.email) || null,
          role: position || roleName || null,
        };
      })
      .filter((row) => row.id.length > 0)
      .filter((row) => /sales|rep|account/i.test(row.role || ""));
  }
}

export async function getCrews(params?: { startDate?: string; endDate?: string }): Promise<CrewOption[]> {
  try {
    // Most environments expose /employees but not /crews yet.
    const response = await api.get("/employees", { params: { page: 1, limit: 200 } });
    return mapEmployeesToCrewOptions(extractApiArray<Record<string, unknown>>(response.data), params);
  } catch {
    return [];
  }
}

export async function saveProjectDraft(data: Record<string, unknown>): Promise<ProjectEntity | null> {
  const response = await api.post("/projects/draft", data);
  return extractApiData<ProjectEntity | null>(response.data);
}
