import { analyticsRepository } from './analytics.repository';
import { AnalyticsQueryDto, DashboardStatsDto } from './analytics.dto';

export class AnalyticsService {
    async getDashboardStats(tenantId: string): Promise<DashboardStatsDto> {
        const [leadStats, clientStats, taskStats, projectStats, revenueStats, expenseStats] = await Promise.all([
            analyticsRepository.getLeadStats(tenantId, {}),
            analyticsRepository.getClientStats(tenantId),
            analyticsRepository.getTaskStats(tenantId),
            analyticsRepository.getProjectStats(tenantId),
            analyticsRepository.getRevenueStats(tenantId),
            analyticsRepository.getExpenseStats(tenantId),
        ]);

        const convertedLeads = leadStats.byStatus.find((s) => s.status === 'WON')?._count || 0;
        const newLeads = leadStats.byStatus.find((s) => s.status === 'NEW')?._count || 0;

        return {
            leads: { total: leadStats.total, new: newLeads, converted: convertedLeads, conversionRate: leadStats.total > 0 ? Math.round((convertedLeads / leadStats.total) * 100) : 0 },
            clients: { total: clientStats.total, active: clientStats.active, new: 0 },
            tasks: taskStats,
            projects: projectStats,
            revenue: revenueStats,
            expenses: expenseStats,
        };
    }

    async getLeadsReport(tenantId: string, query: AnalyticsQueryDto) {
        return analyticsRepository.getLeadStats(tenantId, query);
    }

    async getRevenueReport(tenantId: string) {
        return analyticsRepository.getRevenueStats(tenantId);
    }
}

export const analyticsService = new AnalyticsService();
