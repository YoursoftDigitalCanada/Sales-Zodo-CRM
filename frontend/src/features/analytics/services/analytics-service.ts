import api from "@/lib/axios";

export interface DashboardKPIs {
    totalLeads: number;
    totalClients: number;
    totalRevenue: number;
    totalProjects: number;
    conversionRate: number;
    [key: string]: unknown;
}

export interface LeadsReport {
    byStatus: Array<{ status: string; count: number; value: number }>;
    bySource: Array<{ source: string; count: number }>;
    trend: Array<{ date: string; count: number }>;
    [key: string]: unknown;
}

export interface RevenueReport {
    totalRevenue: number;
    totalPaid: number;
    totalPending: number;
    [key: string]: unknown;
}

export interface PipelineHealth {
    stages: Array<{ status: string; count: number; value: number }>;
    [key: string]: unknown;
}

export async function getDashboardKPIs(): Promise<DashboardKPIs> {
    const response = await api.get("/analytics/dashboard");
    return response.data?.data || response.data;
}

export async function getLeadsReport(params?: Record<string, unknown>): Promise<LeadsReport> {
    const response = await api.get("/analytics/leads", { params });
    return response.data?.data || response.data;
}

export async function getLeadSourcesReport(): Promise<unknown> {
    const response = await api.get("/analytics/lead-sources");
    return response.data?.data || response.data;
}

export async function getPipelineHealth(): Promise<PipelineHealth> {
    const response = await api.get("/analytics/pipeline");
    return response.data?.data || response.data;
}

export async function getRevenueReport(): Promise<RevenueReport> {
    const response = await api.get("/analytics/revenue");
    return response.data?.data || response.data;
}

export async function getRevenueTrend(): Promise<Array<{ month: string; revenue: number;[key: string]: unknown }>> {
    const response = await api.get("/analytics/revenue-trend");
    return response.data?.data || response.data || [];
}

export async function getBookingStats(): Promise<unknown> {
    const response = await api.get("/analytics/bookings");
    return response.data?.data || response.data;
}

export async function getAIContext(): Promise<unknown> {
    const response = await api.get("/analytics/ai-context");
    return response.data?.data || response.data;
}

export async function getSMBInsights(): Promise<unknown> {
    const response = await api.get("/analytics/smb-insights");
    return response.data?.data || response.data;
}

export async function getBusinessOverview(): Promise<unknown> {
    const response = await api.get("/analytics/business-overview");
    return response.data?.data || response.data;
}
