import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

interface DashboardTask {
  status?: string;
}

export interface DashboardStatsPayload {
  projectsCount: number;
  clientsCount: number;
  pendingTasks: number;
}

export async function fetchDashboardStats(): Promise<DashboardStatsPayload> {
  const [projectsRes, clientsRes, tasksRes] = await Promise.all([
    api.get("/projects"),
    api.get("/clients"),
    api.get("/tasks"),
  ]);

  const projects = extractApiArray<unknown>(projectsRes.data);
  const clients = extractApiArray<unknown>(clientsRes.data);
  const tasks = extractApiArray<DashboardTask>(tasksRes.data);

  const pendingTasks = tasks.filter(
    (task) => task.status === "TODO" || task.status === "IN_PROGRESS"
  ).length;

  return {
    projectsCount: projects.length,
    clientsCount: clients.length,
    pendingTasks,
  };
}
