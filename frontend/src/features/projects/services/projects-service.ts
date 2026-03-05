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
