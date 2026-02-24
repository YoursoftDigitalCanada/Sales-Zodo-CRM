import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

// ── Shared types for the dashboard ─────────────────────────────────────

export interface DashboardLead {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  potentialValue?: number | string;
  temperature: "HOT" | "WARM" | "COLD";
  status: string;
  leadSource?: { name: string } | null;
  assignedTo?: { firstName: string; lastName: string } | null;
  updatedAt: string;
  createdAt: string;
}

export interface DashboardInvoice {
  id: string;
  invoiceNumber: string;
  status: string;
  total: number | string;
  amountDue: number | string;
  dueDate: string;
  paidAt?: string | null;
  client?: { companyName?: string; firstName?: string; lastName?: string } | null;
}

export interface DashboardProject {
  id: string;
  name: string;
  status: string;
  progress: number;
  budget?: number | string | null;
  startDate?: string | null;
  endDate?: string | null;
  client?: { companyName?: string; firstName?: string; lastName?: string } | null;
  members?: Array<{ employee?: { firstName: string; lastName: string } }>;
}

interface DashboardTask {
  status?: string;
}

export interface DashboardPayload {
  leads: DashboardLead[];
  invoices: DashboardInvoice[];
  projects: DashboardProject[];
  projectsCount: number;
  clientsCount: number;
  pendingTasks: number;
  totalEarnings: number;
}

// ── Fetch everything in parallel ────────────────────────────────────────

export async function fetchDashboardData(): Promise<DashboardPayload> {
  const [leadsRes, invoicesRes, projectsRes, clientsRes, tasksRes] =
    await Promise.all([
      api.get("/leads", { params: { limit: 20, sortBy: "createdAt", sortOrder: "desc" } }),
      api.get("/invoices", { params: { limit: 20 } }),
      api.get("/projects", { params: { limit: 20 } }),
      api.get("/clients"),
      api.get("/tasks"),
    ]);

  const leads = extractApiArray<DashboardLead>(leadsRes.data);
  const invoices = extractApiArray<DashboardInvoice>(invoicesRes.data);
  const projects = extractApiArray<DashboardProject>(projectsRes.data);
  const clients = extractApiArray<unknown>(clientsRes.data);
  const tasks = extractApiArray<DashboardTask>(tasksRes.data);

  const pendingTasks = tasks.filter(
    (t) => t.status === "TODO" || t.status === "IN_PROGRESS"
  ).length;

  // Sum paid invoices for earnings
  const totalEarnings = invoices
    .filter((inv) => inv.status === "PAID")
    .reduce((sum, inv) => sum + Number(inv.total || 0), 0);

  return {
    leads,
    invoices,
    projects,
    projectsCount: projects.length,
    clientsCount: clients.length,
    pendingTasks,
    totalEarnings,
  };
}

// Keep backward-compatible export name
export async function fetchDashboardStats() {
  const data = await fetchDashboardData();
  return data;
}
