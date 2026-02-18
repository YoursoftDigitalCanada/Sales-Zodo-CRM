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

export async function getProjects(): Promise<ProjectEntity[]> {
  const response = await api.get("/projects");
  return extractApiArray<ProjectEntity>(response.data);
}

export async function deleteProjectById(projectId: number): Promise<void> {
  await api.delete(`/projects/${projectId}`);
}
