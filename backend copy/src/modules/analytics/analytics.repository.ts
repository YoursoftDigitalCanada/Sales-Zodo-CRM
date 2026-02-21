import { PrismaClient } from '@prisma/client';
import { AnalyticsQueryDto } from './analytics.dto';

const prisma = new PrismaClient();

export class AnalyticsRepository {
    async getLeadStats(tenantId: string, query: AnalyticsQueryDto) {
        const where = { tenantId, ...(query.startDate && { createdAt: { gte: new Date(query.startDate) } }) };
        const [total, byStatus] = await Promise.all([
            prisma.lead.count({ where }),
            prisma.lead.groupBy({ by: ['status'], where, _count: true }),
        ]);
        return { total, byStatus };
    }

    async getClientStats(tenantId: string) {
        const [total, active] = await Promise.all([
            prisma.client.count({ where: { tenantId } }),
            prisma.client.count({ where: { tenantId, status: 'ACTIVE' } }),
        ]);
        return { total, active };
    }

    async getTaskStats(tenantId: string) {
        const [total, completed, overdue] = await Promise.all([
            prisma.task.count({ where: { tenantId } }),
            prisma.task.count({ where: { tenantId, status: 'DONE' } }),
            prisma.task.count({ where: { tenantId, dueDate: { lt: new Date() }, status: { not: 'DONE' } } }),
        ]);
        return { total, completed, overdue, completionRate: total > 0 ? Math.round((completed / total) * 100) : 0 };
    }

    async getProjectStats(tenantId: string) {
        const [total, active, completed] = await Promise.all([
            prisma.project.count({ where: { tenantId } }),
            prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
            prisma.project.count({ where: { tenantId, status: 'COMPLETED' } }),
        ]);
        return { total, active, completed };
    }

    async getRevenueStats(tenantId: string) {
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

    async getExpenseStats(tenantId: string) {
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);
        const [total, thisMonth, pending] = await Promise.all([
            prisma.expense.aggregate({ where: { tenantId, status: 'APPROVED' }, _sum: { amount: true } }),
            prisma.expense.aggregate({ where: { tenantId, paymentDate: { gte: thisMonthStart } }, _sum: { amount: true } }),
            prisma.expense.aggregate({ where: { tenantId, status: 'PENDING_APPROVAL' }, _sum: { amount: true } }),
        ]);
        return { total: Number(total._sum?.amount) || 0, thisMonth: Number(thisMonth._sum?.amount) || 0, pending: Number(pending._sum?.amount) || 0 };
    }
}

export const analyticsRepository = new AnalyticsRepository();
