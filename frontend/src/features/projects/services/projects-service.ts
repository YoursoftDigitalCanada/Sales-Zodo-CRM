import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

export interface ProjectEntity {
  id?: number;
  Id?: number;
  name?: string;
  Name?: string;
  projectManager?: string;
  ProjectManager?: string;
  description?: string;
  Description?: string;
  progress?: number;
  Progress?: number;
  status?: string;
  Status?: string;
  dueDate?: string;
  DueDate?: string;
  startDate?: string;
  StartDate?: string;
  budget?: number;
  Budget?: number;
  spent?: number;
  Spent?: number;
  priority?: string;
  Priority?: string;
  category?: string;
  Category?: string;
  clientName?: string;
  ClientName?: string;
}

export async function getProjects(params?: Record<string, unknown>): Promise<ProjectEntity[]> {
  const response = await api.get("/projects", { params });
  return extractApiArray<ProjectEntity>(response.data);
}

export async function getProjectById(id: string | number): Promise<any> {
  const response = await api.get(`/projects/${id}`);
  return response.data?.data || response.data;
}

export async function deleteProjectById(projectId: number): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}

export async function createProject(data: Record<string, unknown>): Promise<ProjectEntity> {
  const response = await api.post("/projects", data);
  return response.data?.data || response.data;
}

export async function updateProject(projectId: number, data: Record<string, unknown>): Promise<ProjectEntity> {
  const response = await api.put(`/projects/${projectId}`, data);
  return response.data?.data || response.data;
}
