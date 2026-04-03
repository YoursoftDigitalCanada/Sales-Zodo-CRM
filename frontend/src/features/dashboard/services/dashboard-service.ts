import api from "@/lib/axios";
import { extractApiArray } from "@/types/api";

// ── Shared types for the dashboard ─────────────────────────────────────

export interface DashboardLead {
  id: string;
  firstName: string;
  lastName: string;
  companyName?: string;
  email?: string;
  phone?: string;
  propertyAddress?: string | null;
  city?: string | null;
  state?: string | null;
  zipCode?: string | null;
  serviceType?: string | null;
  potentialValue?: number | string;
  temperature: "HOT" | "WARM" | "COLD";
  status: string;
  leadSource?: { name: string } | null;
  assignedTo?: {
    firstName?: string;
    lastName?: string;
    user?: { firstName?: string; lastName?: string } | null;
  } | null;
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

export interface DashboardQuote {
  id: string;
  quoteNumber: string;
  status: string;
  total: number | string;
  validUntil: string;
  createdAt: string;
  sentAt?: string | null;
  leadId?: string | null;
  client?: { id: string; clientName?: string | null } | null;
  lead?: { id: string; firstName?: string; lastName?: string; companyName?: string | null } | null;
}

export interface DashboardInspection {
  id: string;
  inspectionDate: string | null;
  inspectionType?: string | null;
  totalEstimate?: number | null;
  leadId: string;
  lead?: {
    id: string;
    firstName?: string;
    lastName?: string;
    companyName?: string | null;
    propertyAddress?: string | null;
    city?: string | null;
    state?: string | null;
    zipCode?: string | null;
  } | null;
}

export interface DashboardClient {
  id?: string | number;
  Id?: string | number;
  clientName?: string;
  ClientName?: string;
  name?: string;
  Name?: string;
  primaryEmail?: string;
  email?: string;
  contactEmail?: string;
  primaryContactPhone?: string;
  phone?: string;
  mobile?: string;
  contactNo?: string;
  primaryContactName?: string;
  createdAt?: string;
  updatedAt?: string;
  lastInteractionDate?: string;
  lastContacted?: string;
}

interface DashboardTask {
  status?: string;
}

export interface DashboardPayload {
  leads: DashboardLead[];
  invoices: DashboardInvoice[];
  projects: DashboardProject[];
  quotes: DashboardQuote[];
  inspections: DashboardInspection[];
  clients: DashboardClient[];
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
  canViewQuotes?: boolean;
  canViewInspections?: boolean;
}

function extractDashboardArray<T>(payload: unknown): T[] {
  if (payload && typeof payload === "object" && Array.isArray((payload as { data?: unknown }).data)) {
    return (payload as { data: T[] }).data;
  }

  return extractApiArray<T>(payload);
}

function toBooleanQueryValue(value: boolean | undefined): string {
  return value === false ? "false" : "true";
}

function toNumberValue(value: unknown): number {
  const numberValue = typeof value === "number" ? value : Number(value);
  return Number.isFinite(numberValue) ? numberValue : 0;
}

function emptyDashboardPayload(): DashboardPayload {
  return {
    leads: [],
    invoices: [],
    projects: [],
    quotes: [],
    inspections: [],
    clients: [],
    projectsCount: 0,
    clientsCount: 0,
    pendingTasks: 0,
    totalEarnings: 0,
  };
}

function normalizeDashboardPayload(payload: unknown): DashboardPayload {
  if (!payload || typeof payload !== "object") {
    return emptyDashboardPayload();
  }

  const data = payload as Partial<DashboardPayload>;

  return {
    leads: Array.isArray(data.leads) ? data.leads : [],
    invoices: Array.isArray(data.invoices) ? data.invoices : [],
    projects: Array.isArray(data.projects) ? data.projects : [],
    quotes: Array.isArray(data.quotes) ? data.quotes : [],
    inspections: Array.isArray(data.inspections) ? data.inspections : [],
    clients: Array.isArray(data.clients) ? data.clients : [],
    projectsCount: toNumberValue(data.projectsCount),
    clientsCount: toNumberValue(data.clientsCount),
    pendingTasks: toNumberValue(data.pendingTasks),
    totalEarnings: toNumberValue(data.totalEarnings),
  };
}

// ── Helper: safe request that returns [] on failure ─────────────────────
async function safeGet<T>(url: string, params?: Record<string, unknown>): Promise<T[]> {
  try {
    const res = await api.get(url, params ? { params } : undefined);
    return extractDashboardArray<T>(res.data);
  } catch (err) {
    console.warn(`Dashboard: failed to fetch ${url}`, err);
    return [];
  }
}

async function fetchDashboardDataLegacy(
  access: DashboardAccessOptions = {},
): Promise<DashboardPayload> {
  const [leads, invoices, projects, clients, tasks, quotes, inspections] = await Promise.all([
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
    access.canViewQuotes === false
      ? Promise.resolve([])
      : safeGet<DashboardQuote>("/quotes", { limit: 20, sortBy: "createdAt", sortOrder: "desc" }),
    access.canViewInspections === false
      ? Promise.resolve([])
      : safeGet<DashboardInspection>("/leads/inspections/all"),
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
    quotes,
    inspections,
    clients: clients as DashboardClient[],
    projectsCount: projects.length,
    clientsCount: clients.length,
    pendingTasks,
    totalEarnings,
  };
}

async function fetchDashboardSummary(
  access: DashboardAccessOptions = {},
): Promise<DashboardPayload> {
  const params = {
    includeLeads: toBooleanQueryValue(access.canViewLeads),
    includeInvoices: toBooleanQueryValue(access.canViewInvoices),
    includeProjects: toBooleanQueryValue(access.canViewProjects),
    includeClients: toBooleanQueryValue(access.canViewClients),
    includeTasks: toBooleanQueryValue(access.canViewTasks),
    includeQuotes: toBooleanQueryValue(access.canViewQuotes),
    includeInspections: toBooleanQueryValue(access.canViewInspections),
  };

  const response = await api.get("/dashboard/summary", { params });
  const payload = response.data && typeof response.data === "object" && "data" in response.data
    ? (response.data as { data?: unknown }).data
    : response.data;

  return normalizeDashboardPayload(payload);
}

// ── Prefer the aggregated backend summary, then fall back to legacy calls ──

export async function fetchDashboardData(
  access: DashboardAccessOptions = {},
): Promise<DashboardPayload> {
  try {
    return await fetchDashboardSummary(access);
  } catch (error) {
    console.warn("Dashboard summary API unavailable, falling back to legacy fetches", error);
    return fetchDashboardDataLegacy(access);
  }
}

// Keep backward-compatible export name
export async function fetchDashboardStats() {
  const data = await fetchDashboardData();
  return data;
}
