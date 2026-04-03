import api from "@/lib/axios";

// ─── Types ──────────────────────────────────────────────────────────────────────

export interface SalesSummary {
  totalProjects: number;
  completedProjects: number;
  cancelledProjects: number;
  openProjects: number;
  totalRevenue: number;
  winRate: number;
  avgDealCycle: number;
  avgDealSize: number;
}

export interface SalesRepPerformance {
  salesRepId: string;
  name: string;
  totalProjects: number;
  wonProjects: number;
  lostProjects: number;
  openProjects: number;
  revenue: number;
  pipeline: number;
  winRate: number;
  avgDealSize: number;
}

export interface RevenueDataPoint {
  period: string;
  revenue: number;
  count: number;
}

export interface SalesRep {
  id: string;
  name: string;
}

export interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  salesRepId?: string;
  granularity?: "week" | "month";
}

export type ReportType = "sales" | "revenue";

// ─── Helpers ────────────────────────────────────────────────────────────────────

function extractData<T>(responseData: unknown): T {
  const raw = responseData as { data?: T };
  return (raw?.data ?? responseData) as T;
}

// ─── API calls ──────────────────────────────────────────────────────────────────

export async function getSalesSummary(filters: ReportFilters = {}): Promise<SalesSummary> {
  const response = await api.get("/reports/sales-summary", { params: filters });
  return extractData<SalesSummary>(response.data);
}

export async function getSalesRepPerformance(filters: ReportFilters = {}): Promise<SalesRepPerformance[]> {
  const response = await api.get("/reports/sales-rep-performance", { params: filters });
  const data = extractData<SalesRepPerformance[] | { items: SalesRepPerformance[] }>(response.data);
  return Array.isArray(data) ? data : (data as any).items || [];
}

export async function getRevenueOverTime(filters: ReportFilters = {}): Promise<RevenueDataPoint[]> {
  const response = await api.get("/reports/revenue-over-time", { params: filters });
  const data = extractData<RevenueDataPoint[] | { items: RevenueDataPoint[] }>(response.data);
  return Array.isArray(data) ? data : (data as any).items || [];
}

export async function getSalesReps(): Promise<SalesRep[]> {
  const response = await api.get("/reports/sales-reps");
  const data = extractData<SalesRep[] | { items: SalesRep[] }>(response.data);
  return Array.isArray(data) ? data : (data as any).items || [];
}

export async function exportReportCsv(
  filters: ReportFilters = {},
  reportType: ReportType = "sales",
): Promise<void> {
  const response = await api.get("/reports/export-csv", {
    params: { ...filters, reportType },
    responseType: "blob",
  });
  const blob = new Blob([response.data as BlobPart], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${reportType}-report-${new Date().toISOString().split("T")[0]}.csv`;
  a.click();
  window.URL.revokeObjectURL(url);
}
