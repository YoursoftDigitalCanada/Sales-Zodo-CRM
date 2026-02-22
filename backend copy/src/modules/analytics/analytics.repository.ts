import { prisma } from '../../config/database';
import { AnalyticsQueryDto } from './analytics.dto';
import { Prisma } from '@prisma/client';

// ============================================================================
// ANALYTICS REPOSITORY — Tenant-Scoped Data Aggregation
//
// EVERY query is filtered by tenantId to ensure strict per-tenant isolation.
// No global aggregation is possible — tenantId is mandatory in all methods.
// ============================================================================

export class AnalyticsRepository {

    // ── Lead Stats ────────────────────────────────────────────────────────

    async getLeadStats(tenantId: string, query: AnalyticsQueryDto) {
        const where: Prisma.LeadWhereInput = { tenantId };

        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) where.createdAt.lte = new Date(query.endDate);
        }

        const [total, byStatus] = await Promise.all([
            prisma.lead.count({ where }),
            prisma.lead.groupBy({ by: ['status'], where, _count: true }),
        ]);

        return { total, byStatus };
    }

    // ── Lead Source Breakdown ─────────────────────────────────────────────

    async getLeadSourceStats(tenantId: string, query: AnalyticsQueryDto) {
        const where: Prisma.LeadWhereInput = { tenantId };

        if (query.startDate || query.endDate) {
            where.createdAt = {};
            if (query.startDate) where.createdAt.gte = new Date(query.startDate);
            if (query.endDate) where.createdAt.lte = new Date(query.endDate);
        }

        const bySource = await prisma.lead.groupBy({
            by: ['leadSourceId'],
            where: { ...where, leadSourceId: { not: null } },
            _count: true,
            orderBy: { _count: { leadSourceId: 'desc' } },
        });

        // Resolve source names
        const sourceIds = bySource.map((s) => s.leadSourceId).filter(Boolean) as string[];
        const sources = sourceIds.length
            ? await prisma.leadSource.findMany({
                where: { id: { in: sourceIds }, tenantId },
                select: { id: true, name: true },
            })
            : [];

        const sourceMap = new Map(sources.map((s) => [s.id, s.name]));

        return bySource.map((s) => ({
            sourceId: s.leadSourceId,
            sourceName: sourceMap.get(s.leadSourceId!) || 'Unknown',
            count: s._count,
        }));
    }

    // ── Pipeline Health ───────────────────────────────────────────────────

    async getPipelineHealth(tenantId: string) {
        // All possible stages in order — every pipeline view must show all 7
        const ALL_STAGES = ['NEW', 'CONTACTED', 'QUALIFIED', 'PROPOSAL', 'NEGOTIATION', 'WON', 'LOST'] as const;

        const byStatus = await prisma.lead.groupBy({
            by: ['status'],
            where: { tenantId },
            _count: true,
            _sum: { potentialValue: true },
        });

        const total = byStatus.reduce((sum, s) => sum + s._count, 0);

        // Build a lookup map from the DB results
        const statusMap = new Map(
            byStatus.map((s) => [s.status, { count: s._count, value: Number(s._sum.potentialValue) || 0 }])
        );

        // Return all 7 stages — zero-fill any that have no leads yet
        return {
            total,
            stages: ALL_STAGES.map((status) => {
                const data = statusMap.get(status) || { count: 0, value: 0 };
                return {
                    status,
                    count: data.count,
                    value: data.value,
                    percentage: total > 0 ? Math.round((data.count / total) * 100) : 0,
                };
            }),
        };
    }

    // ── Client Stats ──────────────────────────────────────────────────────

    async getClientStats(tenantId: string) {
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const [total, active, newThisMonth] = await Promise.all([
            prisma.client.count({ where: { tenantId } }),
            prisma.client.count({ where: { tenantId, status: 'ACTIVE' } }),
            prisma.client.count({ where: { tenantId, createdAt: { gte: thisMonthStart } } }),
        ]);

        return { total, active, new: newThisMonth };
    }

    // ── Task Stats ────────────────────────────────────────────────────────

    async getTaskStats(tenantId: string) {
        const [total, completed, inProgress, overdue] = await Promise.all([
            prisma.task.count({ where: { tenantId } }),
            prisma.task.count({ where: { tenantId, status: 'DONE' } }),
            prisma.task.count({ where: { tenantId, status: 'IN_PROGRESS' } }),
            prisma.task.count({
                where: {
                    tenantId,
                    dueDate: { lt: new Date() },
                    status: { not: 'DONE' },
                },
            }),
        ]);

        return {
            total,
            completed,
            inProgress,
            overdue,
            completionRate: total > 0 ? Math.round((completed / total) * 100) : 0,
        };
    }

    // ── Project Stats ─────────────────────────────────────────────────────

    async getProjectStats(tenantId: string) {
        const [total, active, completed] = await Promise.all([
            prisma.project.count({ where: { tenantId } }),
            prisma.project.count({ where: { tenantId, status: 'ACTIVE' } }),
            prisma.project.count({ where: { tenantId, status: 'COMPLETED' } }),
        ]);

        return { total, active, completed };
    }

    // ── Revenue Stats (Invoices) ──────────────────────────────────────────

    async getRevenueStats(tenantId: string) {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);
        const lastMonthStart = new Date(now.getFullYear(), now.getMonth() - 1, 1);

        const [total, thisMonth, lastMonth, outstanding] = await Promise.all([
            prisma.invoice.aggregate({
                where: { tenantId, status: 'PAID' },
                _sum: { total: true },
            }),
            prisma.invoice.aggregate({
                where: { tenantId, status: 'PAID', paidAt: { gte: thisMonthStart } },
                _sum: { total: true },
            }),
            prisma.invoice.aggregate({
                where: { tenantId, status: 'PAID', paidAt: { gte: lastMonthStart, lt: thisMonthStart } },
                _sum: { total: true },
            }),
            prisma.invoice.aggregate({
                where: { tenantId, status: { in: ['SENT', 'OVERDUE'] } },
                _sum: { total: true },
            }),
        ]);

        const thisMonthTotal = Number(thisMonth._sum.total) || 0;
        const lastMonthTotal = Number(lastMonth._sum.total) || 0;
        const growth = lastMonthTotal > 0
            ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
            : 0;

        return {
            total: Number(total._sum.total) || 0,
            thisMonth: thisMonthTotal,
            lastMonth: lastMonthTotal,
            outstanding: Number(outstanding._sum.total) || 0,
            growth,
        };
    }

    // ── Monthly Revenue Trends (last 6 months) ────────────────────────────

    async getMonthlyRevenueTrend(tenantId: string) {
        const now = new Date();
        const months: { label: string; start: Date; end: Date }[] = [];

        for (let i = 5; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const label = start.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            months.push({ label, start, end });
        }

        const results = await Promise.all(
            months.map(async (m) => {
                const agg = await prisma.invoice.aggregate({
                    where: {
                        tenantId,
                        status: 'PAID',
                        paidAt: { gte: m.start, lte: m.end },
                    },
                    _sum: { total: true },
                });
                return { month: m.label, revenue: Number(agg._sum.total) || 0 };
            }),
        );

        return results;
    }

    // ── Expense Stats ─────────────────────────────────────────────────────

    async getExpenseStats(tenantId: string) {
        const thisMonthStart = new Date(new Date().getFullYear(), new Date().getMonth(), 1);

        const [total, thisMonth, pending] = await Promise.all([
            prisma.expense.aggregate({
                where: { tenantId, status: 'APPROVED' },
                _sum: { amount: true },
            }),
            prisma.expense.aggregate({
                where: { tenantId, paymentDate: { gte: thisMonthStart } },
                _sum: { amount: true },
            }),
            prisma.expense.aggregate({
                where: { tenantId, status: 'PENDING_APPROVAL' },
                _sum: { amount: true },
            }),
        ]);

        return {
            total: Number(total._sum?.amount) || 0,
            thisMonth: Number(thisMonth._sum?.amount) || 0,
            pending: Number(pending._sum?.amount) || 0,
        };
    }

    // ── Booking Stats ─────────────────────────────────────────────────────

    async getBookingStats(tenantId: string) {
        const now = new Date();
        const thisMonthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const [total, pending, confirmed, cancelled, upcoming] = await Promise.all([
            prisma.booking.count({ where: { tenantId } }),
            prisma.booking.count({ where: { tenantId, status: 'PENDING' } }),
            prisma.booking.count({ where: { tenantId, status: 'CONFIRMED' } }),
            prisma.booking.count({ where: { tenantId, status: 'CANCELLED' } }),
            prisma.booking.count({
                where: {
                    tenantId,
                    startTime: { gte: now },
                    status: { in: ['PENDING', 'CONFIRMED'] },
                },
            }),
        ]);

        return { total, pending, confirmed, cancelled, upcoming };
    }
}

export const analyticsRepository = new AnalyticsRepository();
