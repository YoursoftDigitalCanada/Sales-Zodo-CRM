import api from "@/lib/axios";
import type { CreateProjectDto, UpdateProjectDto } from "@contracts/project";
import type { ProjectStatus } from "@contracts/enums";

export async function getProjects(params?: Record<string, unknown>) {
  return api.get("/projects", { params });
}

export async function createProject(payload: CreateProjectDto) {
  return api.post("/projects", payload);
}

export async function updateProject(id: string, payload: UpdateProjectDto) {
  return api.put(`/projects/${id}`, payload);
}

export async function updateProjectStatus(id: string, status: ProjectStatus) {
  return api.patch(`/projects/${id}/status`, { status });
}

export async function updateProjectStage(id: string, stageId: string, notes?: string) {
  return api.patch(`/projects/${id}/stage`, { stageId, notes });
}

