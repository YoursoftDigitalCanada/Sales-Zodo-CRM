"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsService = exports.AnalyticsService = void 0;
const analytics_repository_1 = require("./analytics.repository");
class AnalyticsService {
    async getDashboardStats(tenantId) {
        const [leadStats, clientStats, taskStats, projectStats, revenueStats, expenseStats] = await Promise.all([
            analytics_repository_1.analyticsRepository.getLeadStats(tenantId, {}),
            analytics_repository_1.analyticsRepository.getClientStats(tenantId),
            analytics_repository_1.analyticsRepository.getTaskStats(tenantId),
            analytics_repository_1.analyticsRepository.getProjectStats(tenantId),
            analytics_repository_1.analyticsRepository.getRevenueStats(tenantId),
            analytics_repository_1.analyticsRepository.getExpenseStats(tenantId),
        ]);
        const convertedLeads = leadStats.byStatus.find((s) => s.status === 'CONVERTED')?._count || 0;
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
    async getLeadsReport(tenantId, query) {
        return analytics_repository_1.analyticsRepository.getLeadStats(tenantId, query);
    }
    async getRevenueReport(tenantId) {
        return analytics_repository_1.analyticsRepository.getRevenueStats(tenantId);
    }
}
exports.AnalyticsService = AnalyticsService;
exports.analyticsService = new AnalyticsService();
//# sourceMappingURL=analytics.service.js.map