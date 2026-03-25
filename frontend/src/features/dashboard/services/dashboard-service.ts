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

export interface DashboardAccessOptions {
  canViewLeads?: boolean;
  canViewInvoices?: boolean;
  canViewProjects?: boolean;
  canViewClients?: boolean;
  canViewTasks?: boolean;
}

// ── Helper: safe request that returns [] on failure ─────────────────────
async function safeGet<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
  try {
    const res = await api.get(url, params ? { params } : undefined);
    return extractApiArray<T>(res.data);
  } catch (err) {
    console.warn(`Dashboard: failed to fetch ${url}`, err);
    return [];
  }
}

// ── Fetch everything in parallel (resilient — one failure won't crash all) ──

export async function fetchDashboardData(
  access: DashboardAccessOptions = {},
): Promise<DashboardPayload> {
  const [leads, invoices, projects, clients, tasks] = await Promise.all([
    access.canViewLeads === false
      ? Promise.resolve([])
      : safeGet<DashboardLead>("/leads", { limit: 20, sortBy: "createdAt", sortOrder: "desc" }),
    access.canViewInvoices === false
      ? Promise.resolve([])
      : safeGet<DashboardInvoice>("/invoices", { limit: 20, sortBy: "issueDate", sortOrder: "desc" }),
    access.canViewProjects === false
      ? Promise.resolve([])
      : safeGet<DashboardProject>("/projects", { limit: 20 }),
    access.canViewClients === false
      ? Promise.resolve([])
      : safeGet<unknown>("/clients"),
    access.canViewTasks === false
      ? Promise.resolve([])
      : safeGet<DashboardTask>("/tasks"),
  ]);

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
