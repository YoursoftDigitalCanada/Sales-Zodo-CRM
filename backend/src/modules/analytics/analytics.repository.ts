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

    // ── SMB Lifecycle & Retention ──────────────────────────────────────

    /**
     * Group clients by lifecycle stage for the given tenant.
     * Uses raw SQL grouping to avoid stale Prisma type cache issues.
     */
    async getClientLifecycleBreakdown(tenantId: string) {
        const results = await prisma.$queryRaw<
            Array<{ lifecycleStage: string; count: bigint }>
        >`
            SELECT "lifecycleStage", COUNT(*)::bigint as count
            FROM "Client"
            WHERE "tenantId" = ${tenantId} AND "status" = 'ACTIVE'
            GROUP BY "lifecycleStage"
            ORDER BY count DESC
        `;

        const stages = results.map(r => ({
            stage: r.lifecycleStage,
            count: Number(r.count),
        }));
        const total = stages.reduce((sum, s) => sum + s.count, 0);

        return {
            total,
            stages: stages.map(s => ({
                ...s,
                percentage: total > 0 ? Math.round((s.count / total) * 100) : 0,
            })),
        };
    }

    /**
     * Repeat customer metrics — clients with 2+ PAID invoices.
     */
    async getRepeatCustomerStats(tenantId: string) {
        // Count invoices per client (only PAID)
        const invoicesByClient = await prisma.invoice.groupBy({
            by: ['clientId'],
            where: { tenantId, status: 'PAID' },
            _count: { _all: true },
        });

        const totalClients = invoicesByClient.length;
        const repeatClients = invoicesByClient.filter(c => c._count._all >= 2).length;
        const totalInvoices = invoicesByClient.reduce((sum, c) => sum + c._count._all, 0);

        return {
            totalClients,
            repeatClients,
            repeatRate: totalClients > 0 ? Math.round((repeatClients / totalClients) * 100) : 0,
            averageInvoicesPerClient: totalClients > 0
                ? Math.round((totalInvoices / totalClients) * 10) / 10
                : 0,
        };
    }

    /**
     * Top clients by total paid invoice amount (CLV approximation).
     */
    async getTopClientsByRevenue(tenantId: string, limit = 10) {
        const topClients = await prisma.invoice.groupBy({
            by: ['clientId'],
            where: { tenantId, status: 'PAID' },
            _sum: { total: true },
            _count: { _all: true },
            orderBy: { _sum: { total: 'desc' } },
            take: limit,
        });

        // Enrich with client names
        const clientIds = topClients.map(c => c.clientId);
        const clients = await prisma.client.findMany({
            where: { id: { in: clientIds }, tenantId },
            select: { id: true, clientName: true },
        });
        const nameMap = new Map(clients.map(c => [c.id, c.clientName]));

        const totalRevenue = topClients.reduce(
            (sum, c) => sum + Number(c._sum.total || 0), 0
        );
        const totalClients = topClients.length;

        return {
            averageCLV: totalClients > 0 ? Math.round(totalRevenue / totalClients) : 0,
            totalRevenue,
            totalClients,
            topClients: topClients.map(c => ({
                clientId: c.clientId,
                clientName: nameMap.get(c.clientId) || 'Unknown',
                totalRevenue: Number(c._sum.total || 0),
                invoiceCount: c._count._all,
            })),
        };
    }
    // ── Overview KPIs (Project-based, Deal-equivalent) ──────────────────

    async getOverviewKPIs(tenantId: string) {
        const now = new Date();
        const twelveMonthsAgo = new Date(now.getFullYear(), now.getMonth() - 12, 1);

        const projects = await prisma.project.findMany({
            where: { tenantId, deletedAt: null, createdAt: { gte: twelveMonthsAgo } },
            select: { status: true, contractValue: true, createdAt: true, completedAt: true },
        });

        let totalRevenue = 0;
        let dealsWon = 0;
        let dealsLost = 0;
        let totalCycleDays = 0;
        let cycleCount = 0;

        for (const p of projects) {
            const val = Number(p.contractValue) || 0;
            if (p.status === 'COMPLETED') {
                dealsWon++;
                totalRevenue += val;
                if (p.completedAt) {
                    totalCycleDays += (p.completedAt.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
                    cycleCount++;
                }
            } else if (p.status === 'CANCELLED') {
                dealsLost++;
            }
        }

        const decided = dealsWon + dealsLost;
        return {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            dealsWon,
            dealsLost,
            totalProjects: projects.length,
            conversionRate: decided > 0 ? Math.round((dealsWon / decided) * 1000) / 10 : 0,
            avgDealSize: dealsWon > 0 ? Math.round(totalRevenue / dealsWon) : 0,
            avgDealCycle: cycleCount > 0 ? Math.round((totalCycleDays / cycleCount) * 10) / 10 : 0,
        };
    }

    // ── Revenue vs Target (monthly, last 12 months) ──────────────────────

    async getRevenueVsTarget(tenantId: string) {
        const now = new Date();
        const months: { label: string; start: Date; end: Date }[] = [];

        for (let i = 11; i >= 0; i--) {
            const start = new Date(now.getFullYear(), now.getMonth() - i, 1);
            const end = new Date(now.getFullYear(), now.getMonth() - i + 1, 0, 23, 59, 59);
            const label = start.toLocaleDateString('en-US', { month: 'short' });
            months.push({ label, start, end });
        }

        // Revenue from paid invoices
        const revenueResults = await Promise.all(
            months.map(async (m) => {
                const agg = await prisma.invoice.aggregate({
                    where: { tenantId, status: 'PAID', paidAt: { gte: m.start, lte: m.end } },
                    _sum: { total: true },
                });
                return Number(agg._sum.total) || 0;
            }),
        );

        // Target: average contractValue of completed projects / month as estimate
        const completedProjects = await prisma.project.findMany({
            where: { tenantId, deletedAt: null, status: 'COMPLETED' },
            select: { contractValue: true },
        });
        const avgMonthlyTarget = completedProjects.length > 0
            ? completedProjects.reduce((s, p) => s + (Number(p.contractValue) || 0), 0) / 12
            : 0;

        return months.map((m, i) => ({
            month: m.label,
            revenue: Math.round(revenueResults[i] * 100) / 100,
            target: Math.round(avgMonthlyTarget * 100) / 100,
            deals: 0, // placeholder
        }));
    }

    // ── Activity Metrics (today / this week / this month) ─────────────────

    async getActivityMetrics(tenantId: string) {
        const now = new Date();
        const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate());
        const weekStart = new Date(todayStart);
        weekStart.setDate(weekStart.getDate() - weekStart.getDay());
        const monthStart = new Date(now.getFullYear(), now.getMonth(), 1);

        const countByPeriod = async (model: 'email' | 'task' | 'quote' | 'calendarEvent', extra?: Record<string, unknown>) => {
            const base: any = { tenantId, ...extra };
            const [today, week, month] = await Promise.all([
                (prisma[model] as any).count({ where: { ...base, createdAt: { gte: todayStart } } }),
                (prisma[model] as any).count({ where: { ...base, createdAt: { gte: weekStart } } }),
                (prisma[model] as any).count({ where: { ...base, createdAt: { gte: monthStart } } }),
            ]);
            return { today, thisWeek: week, thisMonth: month };
        };

        const [emails, tasks, proposals, meetings] = await Promise.all([
            countByPeriod('email'),
            countByPeriod('task'),
            countByPeriod('quote'),
            countByPeriod('calendarEvent'),
        ]);

        return [
            { label: 'Emails', icon: 'Mail', ...emails },
            { label: 'Tasks', icon: 'CheckSquare', ...tasks },
            { label: 'Proposals', icon: 'FileText', ...proposals },
            { label: 'Meetings', icon: 'Calendar', ...meetings },
            { label: 'Follow-ups', icon: 'PhoneCall', today: 0, thisWeek: 0, thisMonth: 0 },
        ];
    }

    // ── Team Performance (from Projects by salesRepId) ────────────────────

    async getTeamPerformance(tenantId: string) {
        const projects = await prisma.project.findMany({
            where: { tenantId, deletedAt: null, salesRepId: { not: null } },
            select: { status: true, contractValue: true, salesRepId: true },
        });

        const repIds = [...new Set(projects.map(p => p.salesRepId).filter(Boolean))] as string[];
        if (repIds.length === 0) return [];

        const employees = await prisma.employee.findMany({
            where: { id: { in: repIds }, tenantId },
            select: { id: true, user: { select: { firstName: true, lastName: true } } },
        });
        const nameMap = new Map(employees.map(e => [e.id, { name: `${e.user.firstName} ${e.user.lastName}`, initials: `${e.user.firstName[0]}${e.user.lastName[0]}` }]));

        const grouped: Record<string, { wonDeals: number; totalDeals: number; revenue: number; activities: number }> = {};
        for (const p of projects) {
            const repId = p.salesRepId!;
            if (!grouped[repId]) grouped[repId] = { wonDeals: 0, totalDeals: 0, revenue: 0, activities: 0 };
            grouped[repId].totalDeals++;
            if (p.status === 'COMPLETED') {
                grouped[repId].wonDeals++;
                grouped[repId].revenue += Number(p.contractValue) || 0;
            }
        }

        // Get activity counts per rep
        const taskCounts = await prisma.task.groupBy({
            by: ['assignedToId'],
            where: { tenantId, assignedToId: { in: repIds } },
            _count: true,
        });
        const taskMap = new Map(taskCounts.map(t => [t.assignedToId, t._count]));

        return Object.entries(grouped)
            .map(([repId, data]) => {
                const info = nameMap.get(repId) || { name: 'Unknown', initials: '??' };
                return {
                    id: repId,
                    name: info.name,
                    avatar: info.initials.toUpperCase(),
                    revenue: `$${(data.revenue / 1000).toFixed(0)}K`,
                    revenueRaw: data.revenue,
                    dealsWon: data.wonDeals,
                    dealsClosed: data.totalDeals,
                    winRate: data.totalDeals > 0 ? Math.round((data.wonDeals / data.totalDeals) * 100) : 0,
                    quota: 0, // placeholder
                    activities: taskMap.get(repId) || 0,
                };
            })
            .sort((a, b) => b.revenueRaw - a.revenueRaw);
    }
}

export const analyticsRepository = new AnalyticsRepository();
