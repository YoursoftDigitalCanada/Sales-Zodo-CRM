"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.analyticsRepository = exports.AnalyticsRepository = void 0;
const client_1 = require("@prisma/client");
const prisma = new client_1.PrismaClient();
class AnalyticsRepository {
    async getLeadStats(tenantId, query) {
        const where = { tenantId, ...(query.startDate && { createdAt: { gte: new Date(query.startDate) } }) };
        const [total, byStatus] = await Promise.all([
            prisma.lead.count({ where }),
            prisma.lead.groupBy({ by: ['status'], where, _count: true }),
        ]);
        return { total, byStatus };
    }
    async getClientStats(tenantId) {
        const [total, active] = await Promise.all([
            prisma.client.count({ where: { tenantId } }),
            prisma.client.count({ where: { tenantId, status: 'ACTIVE' } }),
        ]);
        return { total, active };
    }
    async getTaskStats(tenantId) {
        const [total, completed, overdue] = await Promise.all([
            prisma.task.count({ where: { tenantId } }),
            prisma.task.count({ where: { tenantId, status: 'COMPLETED' } }),
            prisma.task.count({ where: { tenantId, dueDate: { lt: new Date() }, status: { not: 'COMPLETED' } } }),
        ]);
        return { total, completed, overdue, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }
    async getProjectStats(tenantId) {
        const [total, active, completed] = await Promise.all([
            prisma.project.count({ where: { tenantId } }),
            prisma.project.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
            prisma.project.count({ where: { tenantId, status: 'COMPLETED' } }),
        ]);
        return { total, active, completed };
    }
    async getRevenueStats(tenantId) {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);
        const [total, thisMonth, lastMonth] = await Promise.all([
            prisma.invoice.aggregate({ where: { tenantId, status: 'PAID' }, _sum: { total: true } }),
            prisma.invoice.aggregate({ where: { tenantId, status: 'PAID', paidAt: { gte: thisMonthStart } }, _sum: { total: true } }),
            prisma.invoice.aggregate({ where: { tenantId, status: 'PAID', paidAt: { gte: lastMonthStart, lt: thisMonthStart } }, _sum: { total: true } }),
        ]);
        const thisMonthTotal = Number(thisMonth._sum.total) || 0;
        const lastMonthTotal = Number(lastMonth._sum.total) || 0;
        const growth = lastMonthTotal > 0 ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100) : 0;
        return { total: Number(total._sum.total) || 0, thisMonth: thisMonthTotal, lastMonth: lastMonthTotal, growth };
    }
    async getExpenseStats(tenantId) {
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [total, thisMonth, pending] = await Promise.all([
            prisma.expense.aggregate({ where: { tenantId, status: 'APPROVED' }, _sum: { amount: true } }),
            prisma.expense.aggregate({ where: { tenantId, expenseDate: { gte: thisMonthStart } }, _sum: { amount: true } }),
            prisma.expense.aggregate({ where: { tenantId, status: 'PENDING' }, _sum: { amount: true } }),
        ]);
        return { total: Number(total._sum.amount) || 0, thisMonth: Number(thisMonth._sum.amount) || 0, pending: Number(pending._sum.amount) || 0 };
    }
}
exports.AnalyticsRepository = AnalyticsRepository;
exports.analyticsRepository = new AnalyticsRepository();
//# sourceMappingURL=analytics.repository.js.map