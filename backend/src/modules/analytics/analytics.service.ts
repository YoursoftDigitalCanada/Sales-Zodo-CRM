import { analyticsRepository } from './analytics.repository';
import {
    AnalyticsQueryDto,
    DashboardStatsDto,
    PipelineHealthDto,
    LeadSourceStatDto,
    MonthlyRevenueDto,
    SMBInsightsDto,
} from './analytics.dto';

// ============================================================================
// ANALYTICS SERVICE — Tenant-Scoped Business Intelligence
//
// Every method requires a tenantId from request context (injected by the
// controller from req.user!.tenantId!). No global aggregation is possible.
// ============================================================================

export class AnalyticsService {

    /**
     * Full dashboard overview — all KPIs in one request.
     * Each sub-query is strictly tenant-scoped.
     */
    async getDashboardStats(tenantId: string): Promise<DashboardStatsDto> {
        const [
            leadStats,
            clientStats,
            taskStats,
            projectStats,
            revenueStats,
            expenseStats,
            bookingStats,
        ] = await Promise.all([
            analyticsRepository.getLeadStats(tenantId, {}),
            analyticsRepository.getClientStats(tenantId),
            analyticsRepository.getTaskStats(tenantId),
            analyticsRepository.getProjectStats(tenantId),
            analyticsRepository.getRevenueStats(tenantId),
            analyticsRepository.getExpenseStats(tenantId),
            analyticsRepository.getBookingStats(tenantId),
        ]);

        const convertedLeads = leadStats.byStatus.find((s) => s.status === 'WON')?._count || 0;
        const newLeads = leadStats.byStatus.find((s) => s.status === 'NEW')?._count || 0;

        return {
            leads: {
                total: leadStats.total,
                new: newLeads,
                converted: convertedLeads,
                conversionRate: leadStats.total > 0
                    ? Math.round((convertedLeads / leadStats.total) * 100)
                    : 0,
            },
            clients: clientStats,
            tasks: taskStats,
            projects: projectStats,
            revenue: revenueStats,
            expenses: expenseStats,
            bookings: bookingStats,
        };
    }

    /**
     * Lead statistics with optional date range filtering.
     */
    async getLeadsReport(tenantId: string, query: AnalyticsQueryDto) {
        return analyticsRepository.getLeadStats(tenantId, query);
    }

    /**
     * Revenue report with month-over-month growth.
     */
    async getRevenueReport(tenantId: string) {
        return analyticsRepository.getRevenueStats(tenantId);
    }

    /**
     * Pipeline health — lead distribution across statuses with value sums.
     */
    async getPipelineHealth(tenantId: string): Promise<PipelineHealthDto> {
        return analyticsRepository.getPipelineHealth(tenantId);
    }

    /**
     * Lead source breakdown — count of leads per source.
     */
    async getLeadSourceStats(tenantId: string, query: AnalyticsQueryDto): Promise<LeadSourceStatDto[]> {
        return analyticsRepository.getLeadSourceStats(tenantId, query);
    }

    /**
     * Monthly revenue trend — last 6 months.
     */
    async getRevenueTrend(tenantId: string): Promise<MonthlyRevenueDto[]> {
        return analyticsRepository.getMonthlyRevenueTrend(tenantId);
    }

    /**
     * Booking statistics — pending, confirmed, cancelled, upcoming.
     */
    async getBookingStats(tenantId: string) {
        return analyticsRepository.getBookingStats(tenantId);
    }

    /**
     * SMB Insights — lifecycle breakdown, repeat customer rate, CLV.
     * Aggregates all retention-focused metrics in a single call.
     */
    async getSMBInsights(tenantId: string): Promise<SMBInsightsDto> {
        const [lifecycle, retention, clv] = await Promise.all([
            analyticsRepository.getClientLifecycleBreakdown(tenantId),
            analyticsRepository.getRepeatCustomerStats(tenantId),
            analyticsRepository.getTopClientsByRevenue(tenantId),
        ]);

        return {
            lifecycle,
            retention,
            clv,
            generatedAt: new Date().toISOString(),
        };
    }

    /**
     * Overview KPIs — Project-based deal metrics (last 12 months).
     */
    async getOverviewKPIs(tenantId: string) {
        return analyticsRepository.getOverviewKPIs(tenantId);
    }

    /**
     * Revenue vs Target — monthly comparison over 12 months.
     */
    async getRevenueVsTarget(tenantId: string) {
        return analyticsRepository.getRevenueVsTarget(tenantId);
    }

    /**
     * Activity Metrics — emails, tasks, proposals, meetings by period.
     */
    async getActivityMetrics(tenantId: string) {
        return analyticsRepository.getActivityMetrics(tenantId);
    }

    /**
     * Team Performance — per-rep breakdown from projects.
     */
    async getTeamPerformance(tenantId: string) {
        return analyticsRepository.getTeamPerformance(tenantId);
    }
}

export const analyticsService = new AnalyticsService();

