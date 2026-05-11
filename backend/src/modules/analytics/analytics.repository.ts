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

        const paidPaymentWhere = { tenantId, status: { in: ['SUCCESSFUL', 'PAID'] } };
        const [total, thisMonth, lastMonth, outstanding] = await Promise.all([
            prisma.invoicePayment.aggregate({
                where: paidPaymentWhere,
                _sum: { amount: true },
            }),
            prisma.invoicePayment.aggregate({
                where: { ...paidPaymentWhere, paymentDate: { gte: thisMonthStart } },
                _sum: { amount: true },
            }),
            prisma.invoicePayment.aggregate({
                where: { ...paidPaymentWhere, paymentDate: { gte: lastMonthStart, lt: thisMonthStart } },
                _sum: { amount: true },
            }),
            prisma.invoice.aggregate({
                where: { tenantId, status: { in: ['SENT', 'OVERDUE'] } },
                _sum: { amountDue: true },
            }),
        ]);

        const thisMonthTotal = Number(thisMonth._sum.amount) || 0;
        const lastMonthTotal = Number(lastMonth._sum.amount) || 0;
        const growth = lastMonthTotal > 0
            ? Math.round(((thisMonthTotal - lastMonthTotal) / lastMonthTotal) * 100)
            : 0;

        return {
            total: Number(total._sum.amount) || 0,
            thisMonth: thisMonthTotal,
            lastMonth: lastMonthTotal,
            outstanding: Number(outstanding._sum.amountDue) || 0,
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
                const agg = await prisma.invoicePayment.aggregate({
                    where: {
                        tenantId,
                        status: { in: ['SUCCESSFUL', 'PAID'] },
                        paymentDate: { gte: m.start, lte: m.end },
                    },
                    _sum: { amount: true },
                });
                return { month: m.label, revenue: Number(agg._sum.amount) || 0 };
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

        // Revenue from actual payments
        const revenueResults = await Promise.all(
            months.map(async (m) => {
                const agg = await prisma.invoicePayment.aggregate({
                    where: { tenantId, status: { in: ['SUCCESSFUL', 'PAID'] }, paymentDate: { gte: m.start, lte: m.end } },
                    _sum: { amount: true },
                });
                return Number(agg._sum.amount) || 0;
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

    // ── Sales CRM Analytics (Leads, Deals, Revenue, Subscriptions, Forecast) ──

    private scopedDate(query: AnalyticsQueryDto & Record<string, any>, field = 'createdAt') {
        if (!query.startDate && !query.endDate) return {};
        const range: Record<string, Date> = {};
        if (query.startDate) range.gte = new Date(query.startDate);
        if (query.endDate) range.lte = new Date(query.endDate);
        return { [field]: range };
    }

    private repId(query: Record<string, any>) {
        return query.salesRepId || query.repId || undefined;
    }

    private sourceId(query: Record<string, any>) {
        return query.leadSourceId || query.sourceId || undefined;
    }

    private stage(query: Record<string, any>) {
        return query.dealStage || query.stage || undefined;
    }

    private dealValue(deal: Record<string, any>) {
        return Number(deal.dealValue ?? deal.expectedDealValue ?? deal.contractValue ?? deal.budget ?? deal.total ?? 0) || 0;
    }

    private dealProbability(deal: Record<string, any>) {
        const explicit = Number(deal.probability);
        if (!Number.isNaN(explicit) && explicit > 0) return explicit;
        const stage = String(deal.dealStatus || deal.status || '').toLowerCase();
        if (stage.includes('won') || deal.status === 'COMPLETED') return 100;
        if (stage.includes('lost') || deal.status === 'CANCELLED') return 0;
        if (stage.includes('negotiation')) return 60;
        if (stage.includes('proposal')) return 50;
        if (stage.includes('demo')) return 40;
        return 25;
    }

    private dealWhere(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const where: Prisma.ProjectWhereInput = { tenantId, deletedAt: null, archivedAt: null, ...this.scopedDate(query) };
        const repId = this.repId(query);
        const sourceId = this.sourceId(query);
        const stage = this.stage(query);
        if (repId) where.OR = [{ salesRepId: repId }, { dealOwnerId: repId }];
        if (sourceId) where.sourceId = sourceId;
        if (stage) where.dealStatus = { equals: stage, mode: 'insensitive' };
        return where;
    }

    private leadWhere(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const where: Prisma.LeadWhereInput = { tenantId, ...this.scopedDate(query) };
        const repId = this.repId(query);
        const sourceId = this.sourceId(query);
        if (repId) where.assignedToId = repId;
        if (sourceId) where.leadSourceId = sourceId;
        return where;
    }

    async getSalesSummary(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const leadWhere = this.leadWhere(tenantId, query);
        const dealWhere = this.dealWhere(tenantId, query);
        const openDealWhere: Prisma.ProjectWhereInput = {
            ...dealWhere,
            NOT: [{ dealStatus: { equals: 'Won', mode: 'insensitive' } }, { dealStatus: { equals: 'Lost', mode: 'insensitive' } }, { status: { in: ['COMPLETED', 'CANCELLED', 'ARCHIVED'] } }],
        };
        const wonDealWhere: Prisma.ProjectWhereInput = {
            ...dealWhere,
            OR: [{ dealStatus: { equals: 'Won', mode: 'insensitive' } }, { status: 'COMPLETED' }],
        };
        const lostDealWhere: Prisma.ProjectWhereInput = {
            ...dealWhere,
            OR: [{ dealStatus: { equals: 'Lost', mode: 'insensitive' } }, { status: 'CANCELLED' }],
        };

        const subscriptionWhere: any = {
            tenantId,
            ...(query.plan ? { planName: query.plan } : {}),
            ...(query.startDate || query.endDate ? this.scopedDate(query) : {}),
        };
        const renewalWindowEnd = new Date();
        renewalWindowEnd.setDate(renewalWindowEnd.getDate() + 30);

        const [totalLeads, newLeads, qualifiedLeads, totalDeals, openDeals, wonDeals, lostDeals, subscriptions, churnedSubscriptions, renewalRisk] = await Promise.all([
            prisma.lead.count({ where: leadWhere }),
            prisma.lead.count({ where: { ...leadWhere, status: 'NEW' } }),
            prisma.lead.count({ where: { ...leadWhere, status: 'QUALIFIED' } }),
            prisma.project.count({ where: dealWhere }),
            prisma.project.findMany({ where: openDealWhere, select: { dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true } }),
            prisma.project.findMany({ where: wonDealWhere, select: { dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true } }),
            prisma.project.count({ where: lostDealWhere }),
            prisma.customerSubscription.findMany({ where: subscriptionWhere, select: { status: true, mrr: true, arr: true, renewalDate: true } }),
            prisma.customerSubscription.count({ where: { ...subscriptionWhere, status: { in: ['CANCELLED', 'EXPIRED'] } } }),
            prisma.customerSubscription.aggregate({ where: { ...subscriptionWhere, status: { in: ['ACTIVE', 'PAST_DUE'] }, renewalDate: { gte: new Date(), lte: renewalWindowEnd } }, _sum: { arr: true } }),
        ]);

        const openPipelineValue = openDeals.reduce((sum, deal) => sum + this.dealValue(deal), 0);
        const closedWonRevenue = wonDeals.reduce((sum, deal) => sum + this.dealValue(deal), 0);
        const mrr = subscriptions.filter((s) => ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(String(s.status).toUpperCase())).reduce((sum, sub) => sum + Number(sub.mrr || 0), 0);
        const arr = subscriptions.filter((s) => ['ACTIVE', 'TRIAL', 'PAST_DUE'].includes(String(s.status).toUpperCase())).reduce((sum, sub) => sum + Number(sub.arr || 0), 0);
        const decidedDeals = wonDeals.length + lostDeals;

        return {
            totalLeads,
            newLeads,
            qualifiedLeads,
            totalDeals,
            openPipelineValue,
            closedWonRevenue,
            conversionRate: totalLeads ? Math.round((qualifiedLeads / totalLeads) * 1000) / 10 : 0,
            winRate: decidedDeals ? Math.round((wonDeals.length / decidedDeals) * 1000) / 10 : 0,
            averageDealSize: wonDeals.length ? Math.round(closedWonRevenue / wonDeals.length) : 0,
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(arr * 100) / 100,
            churnedSubscriptions,
            renewalRevenueAtRisk: Number(renewalRisk._sum.arr || 0),
        };
    }

    async getSalesLeadAnalytics(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const where = this.leadWhere(tenantId, query);
        const [total, byStatus, bySource, responseLogs] = await Promise.all([
            prisma.lead.count({ where }),
            prisma.lead.groupBy({ by: ['status'], where, _count: true }),
            prisma.lead.groupBy({ by: ['leadSourceId'], where, _count: true }),
            prisma.auditLog.findMany({
                where: { tenantId, entityType: 'Lead', module: { in: ['sales-engagement', 'emails', 'calendar', 'tasks'] } },
                select: { entityId: true, createdAt: true },
                orderBy: { createdAt: 'asc' },
            }),
        ]);
        const sourceIds = bySource.map((item) => item.leadSourceId).filter(Boolean) as string[];
        const sources = sourceIds.length ? await prisma.leadSource.findMany({ where: { tenantId, id: { in: sourceIds } }, select: { id: true, name: true } }) : [];
        const sourceMap = new Map(sources.map((source) => [source.id, source.name]));
        const leads = await prisma.lead.findMany({ where, select: { id: true, createdAt: true, status: true } });
        const firstActivity = new Map<string, Date>();
        for (const log of responseLogs) {
            if (log.entityId && !firstActivity.has(log.entityId)) firstActivity.set(log.entityId, log.createdAt);
        }
        const responseHours = leads
            .map((lead) => {
                const first = firstActivity.get(lead.id);
                return first ? (first.getTime() - lead.createdAt.getTime()) / 36e5 : null;
            })
            .filter((value): value is number => value !== null && value >= 0);
        const qualified = byStatus.find((item) => item.status === 'QUALIFIED')?._count || 0;
        const newlyCreated = byStatus.find((item) => item.status === 'NEW')?._count || 0;
        return {
            total,
            byStatus: byStatus.map((item) => ({ status: item.status, count: item._count })),
            bySource: bySource.map((item) => ({ sourceId: item.leadSourceId, sourceName: item.leadSourceId ? sourceMap.get(item.leadSourceId) || 'Unknown' : 'Unknown', count: item._count })),
            newVsQualified: { new: newlyCreated, qualified },
            leadToQualifiedConversionRate: total ? Math.round((qualified / total) * 1000) / 10 : 0,
            averageResponseTimeHours: responseHours.length ? Math.round((responseHours.reduce((sum, item) => sum + item, 0) / responseHours.length) * 10) / 10 : null,
        };
    }

    async getSalesDealAnalytics(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const where = this.dealWhere(tenantId, query);
        const deals = await prisma.project.findMany({
            where,
            select: {
                id: true, name: true, organizationName: true, clientId: true, dealStatus: true, status: true, probability: true,
                dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true, expectedClosureDate: true,
                nextStep: true, lostReason: true, updatedAt: true, salesRepId: true, dealOwnerId: true,
                client: { select: { clientName: true } },
            },
        });
        const now = new Date();
        const weekEnd = new Date();
        weekEnd.setDate(now.getDate() + 7);
        const monthEnd = new Date(now.getFullYear(), now.getMonth() + 1, 0, 23, 59, 59);
        const activity = await prisma.auditLog.groupBy({ by: ['entityId'], where: { tenantId, entityType: 'Project', entityId: { in: deals.map((d) => d.id) } }, _max: { createdAt: true } });
        const activityMap = new Map(activity.map((row) => [row.entityId, row._max.createdAt]));
        const staleCutoff = new Date();
        staleCutoff.setDate(staleCutoff.getDate() - 7);
        const grouped = new Map<string, { stage: string; count: number; value: number; probabilityTotal: number }>();
        const lostReasons = new Map<string, number>();
        for (const deal of deals) {
            const stage = deal.dealStatus || (deal.status === 'COMPLETED' ? 'Won' : deal.status === 'CANCELLED' ? 'Lost' : 'Qualification');
            const row = grouped.get(stage) || { stage, count: 0, value: 0, probabilityTotal: 0 };
            row.count += 1;
            row.value += this.dealValue(deal);
            row.probabilityTotal += this.dealProbability(deal);
            grouped.set(stage, row);
            if (stage.toLowerCase().includes('lost') || deal.status === 'CANCELLED') {
                lostReasons.set(deal.lostReason || 'No reason captured', (lostReasons.get(deal.lostReason || 'No reason captured') || 0) + 1);
            }
        }
        const openDeals = deals.filter((deal) => !['completed', 'cancelled', 'archived', 'won', 'lost'].includes(String(deal.status).toLowerCase()) && !['won', 'lost'].includes(String(deal.dealStatus || '').toLowerCase()));
        return {
            total: deals.length,
            byStage: [...grouped.values()].map((row) => ({ stage: row.stage, count: row.count, value: Math.round(row.value * 100) / 100, averageProbability: row.count ? Math.round((row.probabilityTotal / row.count) * 10) / 10 : 0 })),
            pipelineValueByStage: [...grouped.values()].map((row) => ({ stage: row.stage, value: Math.round(row.value * 100) / 100 })),
            averageProbability: openDeals.length ? Math.round((openDeals.reduce((sum, deal) => sum + this.dealProbability(deal), 0) / openDeals.length) * 10) / 10 : 0,
            closingThisWeek: openDeals.filter((deal) => deal.expectedClosureDate && deal.expectedClosureDate >= now && deal.expectedClosureDate <= weekEnd),
            closingThisMonth: openDeals.filter((deal) => deal.expectedClosureDate && deal.expectedClosureDate >= now && deal.expectedClosureDate <= monthEnd).length,
            staleDeals: openDeals.filter((deal) => (activityMap.get(deal.id) || deal.updatedAt) < staleCutoff).map((deal) => ({ id: deal.id, name: deal.name, account: deal.client?.clientName || deal.organizationName, value: this.dealValue(deal), lastActivityAt: activityMap.get(deal.id) || deal.updatedAt })),
            highValueWithoutNextTask: openDeals.filter((deal) => this.dealValue(deal) >= 10000 && !deal.nextStep).map((deal) => ({ id: deal.id, name: deal.name, account: deal.client?.clientName || deal.organizationName, value: this.dealValue(deal) })),
            wonCount: deals.filter((deal) => String(deal.dealStatus).toLowerCase() === 'won' || deal.status === 'COMPLETED').length,
            lostCount: deals.filter((deal) => String(deal.dealStatus).toLowerCase() === 'lost' || deal.status === 'CANCELLED').length,
            lostReasons: [...lostReasons.entries()].map(([reason, count]) => ({ reason, count })),
        };
    }

    async getSalesRevenueAnalytics(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const date = this.scopedDate(query, 'createdAt');
        const paidDate = this.scopedDate(query, 'paymentDate');
        const [wonDeals, invoices, payments] = await Promise.all([
            prisma.project.findMany({ where: { ...this.dealWhere(tenantId, query), OR: [{ dealStatus: { equals: 'Won', mode: 'insensitive' } }, { status: 'COMPLETED' }] }, select: { dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true, salesRepId: true, dealOwnerId: true, sourceId: true } }),
            prisma.invoice.findMany({ where: { tenantId, ...date, ...(query.accountStatus ? { client: { status: query.accountStatus } } : {}) }, select: { total: true, amountDue: true, status: true, project: { select: { salesRepId: true, dealOwnerId: true, sourceId: true } } } }),
            prisma.invoicePayment.findMany({ where: { tenantId, ...paidDate, status: { in: ['SUCCESSFUL', 'PAID'] } }, select: { amount: true, paymentDate: true, project: { select: { salesRepId: true, dealOwnerId: true, sourceId: true } } } }),
        ]);
        const revenueByRep = new Map<string, number>();
        const revenueBySource = new Map<string, number>();
        for (const deal of wonDeals) {
            const value = this.dealValue(deal);
            const rep = deal.salesRepId || deal.dealOwnerId || 'Unassigned';
            const source = deal.sourceId || 'Unknown';
            revenueByRep.set(rep, (revenueByRep.get(rep) || 0) + value);
            revenueBySource.set(source, (revenueBySource.get(source) || 0) + value);
        }
        return {
            closedWonRevenue: Math.round(wonDeals.reduce((sum, deal) => sum + this.dealValue(deal), 0) * 100) / 100,
            invoicedRevenue: Math.round(invoices.reduce((sum, invoice) => sum + Number(invoice.total || 0), 0) * 100) / 100,
            paidRevenue: Math.round(payments.reduce((sum, payment) => sum + Number(payment.amount || 0), 0) * 100) / 100,
            outstandingBalance: Math.round(invoices.filter((invoice) => !['PAID', 'CANCELLED', 'REFUNDED'].includes(String(invoice.status))).reduce((sum, invoice) => sum + Number(invoice.amountDue || 0), 0) * 100) / 100,
            revenueByRep: await this.labelEmployeeRevenue(tenantId, revenueByRep),
            revenueBySource: await this.labelSourceRevenue(tenantId, revenueBySource),
        };
    }

    async getSalesSubscriptionAnalytics(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const renewalWindowEnd = new Date();
        renewalWindowEnd.setDate(renewalWindowEnd.getDate() + 30);
        const where: any = { tenantId, ...(query.plan ? { planName: query.plan } : {}), ...(query.accountStatus ? { client: { status: query.accountStatus } } : {}), ...this.scopedDate(query) };
        const subscriptions = await prisma.customerSubscription.findMany({ where, select: { id: true, subscriptionNumber: true, planName: true, billingCycle: true, status: true, mrr: true, arr: true, renewalDate: true, client: { select: { clientName: true } }, ownerId: true } });
        const active = subscriptions.filter((sub) => String(sub.status).toUpperCase() === 'ACTIVE');
        return {
            activeSubscriptions: active.length,
            mrr: Math.round(active.reduce((sum, sub) => sum + Number(sub.mrr || 0), 0) * 100) / 100,
            arr: Math.round(active.reduce((sum, sub) => sum + Number(sub.arr || 0), 0) * 100) / 100,
            renewalsDue: subscriptions.filter((sub) => sub.renewalDate >= new Date() && sub.renewalDate <= renewalWindowEnd).map((sub) => ({ id: sub.id, subscriptionNumber: sub.subscriptionNumber, account: sub.client.clientName, planName: sub.planName, arr: Number(sub.arr || 0), renewalDate: sub.renewalDate })),
            pastDueSubscriptions: subscriptions.filter((sub) => String(sub.status).toUpperCase() === 'PAST_DUE').length,
            cancelledSubscriptions: subscriptions.filter((sub) => ['CANCELLED', 'EXPIRED'].includes(String(sub.status).toUpperCase())).length,
            byPlan: Object.values(subscriptions.reduce((acc: Record<string, any>, sub) => {
                const key = sub.planName || 'Roofer CRM';
                acc[key] ||= { planName: key, count: 0, mrr: 0, arr: 0 };
                acc[key].count += 1;
                acc[key].mrr += Number(sub.mrr || 0);
                acc[key].arr += Number(sub.arr || 0);
                return acc;
            }, {})),
        };
    }

    async getSalesRepPerformance(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const repId = this.repId(query);
        const dealWhere = this.dealWhere(tenantId, query);
        const leadWhere = this.leadWhere(tenantId, query);
        const reps = await prisma.employee.findMany({ where: { tenantId, isActive: true, ...(repId ? { id: repId } : {}) }, select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } } });
        const rows = await Promise.all(reps.map(async (rep) => {
            const repDealWhere: Prisma.ProjectWhereInput = { ...dealWhere, OR: [{ salesRepId: rep.id }, { dealOwnerId: rep.id }] };
            const [leadsAssigned, calls, emails, meetings, tasksCompleted, overdueTasks, qualifiedLeads, deals] = await Promise.all([
                prisma.lead.count({ where: { ...leadWhere, assignedToId: rep.id } }),
                prisma.salesCall.count({ where: { tenantId, callerId: rep.id, ...this.scopedDate(query) } }),
                prisma.email.count({ where: { tenantId, sentById: rep.id, ...this.scopedDate(query) } }),
                prisma.calendarEvent.count({ where: { tenantId, createdById: rep.id, ...this.scopedDate(query) } }),
                prisma.task.count({ where: { tenantId, assignedToId: rep.id, status: { in: ['DONE', 'COMPLETED'] }, ...this.scopedDate(query) } }),
                prisma.task.count({ where: { tenantId, assignedToId: rep.id, dueDate: { lt: new Date() }, status: { notIn: ['DONE', 'COMPLETED', 'CANCELLED'] } } }),
                prisma.lead.count({ where: { ...leadWhere, assignedToId: rep.id, status: 'QUALIFIED' } }),
                prisma.project.findMany({ where: repDealWhere, select: { dealStatus: true, status: true, dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true } }),
            ]);
            const won = deals.filter((deal) => String(deal.dealStatus).toLowerCase() === 'won' || deal.status === 'COMPLETED');
            const lost = deals.filter((deal) => String(deal.dealStatus).toLowerCase() === 'lost' || deal.status === 'CANCELLED');
            const decided = won.length + lost.length;
            return {
                id: rep.id,
                name: `${rep.user.firstName} ${rep.user.lastName}`.trim() || rep.user.email,
                leadsAssigned,
                calls,
                emails,
                meetings,
                tasksCompleted,
                overdueTasks,
                qualifiedLeads,
                dealsWon: won.length,
                dealsLost: lost.length,
                revenueClosed: Math.round(won.reduce((sum, deal) => sum + this.dealValue(deal), 0) * 100) / 100,
                winRate: decided ? Math.round((won.length / decided) * 1000) / 10 : 0,
            };
        }));
        return rows.sort((a, b) => b.revenueClosed - a.revenueClosed);
    }

    async getSalesSourcePerformance(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const sources = await prisma.leadSource.findMany({ where: { tenantId, ...(this.sourceId(query) ? { id: this.sourceId(query) } : {}) }, select: { id: true, name: true } });
        const rows = await Promise.all(sources.map(async (source) => {
            const leadWhere = { ...this.leadWhere(tenantId, query), leadSourceId: source.id };
            const [leads, qualified, wonDeals] = await Promise.all([
                prisma.lead.count({ where: leadWhere }),
                prisma.lead.count({ where: { ...leadWhere, status: 'QUALIFIED' } }),
                prisma.project.findMany({ where: { ...this.dealWhere(tenantId, query), sourceId: source.id, OR: [{ dealStatus: { equals: 'Won', mode: 'insensitive' } }, { status: 'COMPLETED' }] }, select: { dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true } }),
            ]);
            const conversionRate = leads ? Math.round((qualified / leads) * 1000) / 10 : 0;
            return { sourceId: source.id, sourceName: source.name, leads, qualified, conversionRate, revenue: Math.round(wonDeals.reduce((sum, deal) => sum + this.dealValue(deal), 0) * 100) / 100, lowConversion: leads >= 5 && conversionRate < 20 };
        }));
        const unknownLeads = await prisma.lead.count({ where: { ...this.leadWhere(tenantId, query), leadSourceId: null } });
        if (unknownLeads) rows.push({ sourceId: '', sourceName: 'Unknown', leads: unknownLeads, qualified: 0, conversionRate: 0, revenue: 0, lowConversion: unknownLeads >= 5 });
        return rows.sort((a, b) => b.leads - a.leads);
    }

    async getSalesForecast(tenantId: string, query: AnalyticsQueryDto & Record<string, any> = {}) {
        const where: Prisma.ProjectWhereInput = {
            ...this.dealWhere(tenantId, query),
            NOT: [{ dealStatus: { equals: 'Lost', mode: 'insensitive' } }, { status: { in: ['CANCELLED', 'ARCHIVED'] } }],
        };
        const deals = await prisma.project.findMany({ where, select: { id: true, name: true, dealStatus: true, expectedClosureDate: true, salesRepId: true, dealOwnerId: true, probability: true, dealValue: true, expectedDealValue: true, contractValue: true, budget: true, total: true } });
        const byMonth = new Map<string, number>();
        const byRep = new Map<string, number>();
        const byStage = new Map<string, number>();
        for (const deal of deals) {
            const weighted = this.dealValue(deal) * (this.dealProbability(deal) / 100);
            const close = deal.expectedClosureDate || new Date();
            const month = close.toLocaleDateString('en-US', { month: 'short', year: 'numeric' });
            const rep = deal.salesRepId || deal.dealOwnerId || 'Unassigned';
            const stage = deal.dealStatus || 'Qualification';
            byMonth.set(month, (byMonth.get(month) || 0) + weighted);
            byRep.set(rep, (byRep.get(rep) || 0) + weighted);
            byStage.set(stage, (byStage.get(stage) || 0) + weighted);
        }
        return {
            weightedForecast: Math.round(deals.reduce((sum, deal) => sum + this.dealValue(deal) * (this.dealProbability(deal) / 100), 0) * 100) / 100,
            byMonth: [...byMonth.entries()].map(([month, value]) => ({ month, value: Math.round(value * 100) / 100 })),
            byRep: await this.labelEmployeeRevenue(tenantId, byRep, 'forecast'),
            byStage: [...byStage.entries()].map(([stage, value]) => ({ stage, value: Math.round(value * 100) / 100 })),
            dealsClosingNext7Days: deals.filter((deal) => {
                if (!deal.expectedClosureDate) return false;
                const end = new Date();
                end.setDate(end.getDate() + 7);
                return deal.expectedClosureDate >= new Date() && deal.expectedClosureDate <= end;
            }).map((deal) => ({ id: deal.id, name: deal.name, stage: deal.dealStatus, value: this.dealValue(deal), probability: this.dealProbability(deal), expectedCloseDate: deal.expectedClosureDate })),
        };
    }

    private async labelEmployeeRevenue(tenantId: string, values: Map<string, number>, valueKey = 'revenue') {
        const ids = [...values.keys()].filter((id) => id !== 'Unassigned');
        const employees = ids.length ? await prisma.employee.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, user: { select: { firstName: true, lastName: true, email: true } } } }) : [];
        const names = new Map(employees.map((employee) => [employee.id, `${employee.user.firstName} ${employee.user.lastName}`.trim() || employee.user.email]));
        return [...values.entries()].map(([id, value]) => ({ repId: id === 'Unassigned' ? null : id, repName: id === 'Unassigned' ? 'Unassigned' : names.get(id) || 'Unknown', [valueKey]: Math.round(value * 100) / 100 }));
    }

    private async labelSourceRevenue(tenantId: string, values: Map<string, number>) {
        const ids = [...values.keys()].filter((id) => id !== 'Unknown');
        const sources = ids.length ? await prisma.leadSource.findMany({ where: { tenantId, id: { in: ids } }, select: { id: true, name: true } }) : [];
        const names = new Map(sources.map((source) => [source.id, source.name]));
        return [...values.entries()].map(([id, revenue]) => ({ sourceId: id === 'Unknown' ? null : id, sourceName: id === 'Unknown' ? 'Unknown' : names.get(id) || 'Unknown', revenue: Math.round(revenue * 100) / 100 }));
    }
}

export const analyticsRepository = new AnalyticsRepository();
