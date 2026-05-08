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

export async function getOverviewKPIs(): Promise<unknown> {
    const response = await api.get("/analytics/overview-kpis");
    return response.data?.data || response.data;
}

export async function getRevenueVsTarget(): Promise<unknown> {
    const response = await api.get("/analytics/revenue-vs-target");
    return response.data?.data || response.data;
}

export async function getActivityMetricsApi(): Promise<unknown> {
    const response = await api.get("/analytics/activity-metrics");
    return response.data?.data || response.data;
}

export async function getTeamPerformanceApi(): Promise<unknown> {
    const response = await api.get("/analytics/team-performance");
    return response.data?.data || response.data;
}

export interface SalesAnalyticsFilters {
    startDate?: string;
    endDate?: string;
    salesRepId?: string;
    leadSourceId?: string;
    dealStage?: string;
    plan?: string;
    accountStatus?: string;
}

const data = (response: any) => response.data?.data || response.data;

export async function getSalesAnalyticsSummary(params?: SalesAnalyticsFilters): Promise<any> {
    return data(await api.get("/analytics/summary", { params }));
}

export async function getSalesLeadAnalytics(params?: SalesAnalyticsFilters): Promise<any> {
    return data(await api.get("/analytics/leads", { params }));
}

export async function getSalesDealAnalytics(params?: SalesAnalyticsFilters): Promise<any> {
    return data(await api.get("/analytics/deals", { params }));
}

export async function getSalesRevenueAnalytics(params?: SalesAnalyticsFilters): Promise<any> {
    return data(await api.get("/analytics/revenue", { params }));
}

export async function getSalesSubscriptionAnalytics(params?: SalesAnalyticsFilters): Promise<any> {
    return data(await api.get("/analytics/subscriptions", { params }));
}

export async function getSalesRepPerformance(params?: SalesAnalyticsFilters): Promise<any[]> {
    return data(await api.get("/analytics/reps", { params })) || [];
}

export async function getSalesSourcePerformance(params?: SalesAnalyticsFilters): Promise<any[]> {
    return data(await api.get("/analytics/sources", { params })) || [];
}

export async function getSalesForecast(params?: SalesAnalyticsFilters): Promise<any> {
    return data(await api.get("/analytics/forecast", { params }));
}
