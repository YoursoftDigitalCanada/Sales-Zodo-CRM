import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';

// ─── Status mapping ────────────────────────────────────────────────────────────
// WON  → COMPLETED
// LOST → CANCELLED
// OPEN → everything else (ACTIVE, IN_PROGRESS, PLANNING, SCHEDULED, etc.)

const WON_STATUSES  = ['COMPLETED'] as const;
const LOST_STATUSES = ['CANCELLED'] as const;
const OPEN_STATUSES = ['DRAFT', 'PENDING', 'APPROVED', 'SCHEDULED', 'IN_PROGRESS', 'PLANNING', 'ACTIVE', 'ON_HOLD', 'WARRANTY_WORK'] as const;

// ─── Helpers ────────────────────────────────────────────────────────────────────

function toNumber(val: Decimal | number | null | undefined): number {
  if (val == null) return 0;
  return typeof val === 'number' ? val : Number(val);
}

function buildDateFilter(dateFrom?: string, dateTo?: string) {
  const filter: Record<string, Date> = {};
  if (dateFrom) filter.gte = new Date(dateFrom);
  if (dateTo) {
    const d = new Date(dateTo);
    d.setHours(23, 59, 59, 999);
    filter.lte = d;
  }
  return Object.keys(filter).length > 0 ? filter : undefined;
}

interface ReportFilters {
  dateFrom?: string;
  dateTo?: string;
  salesRepId?: string;
}

// ─── Service ────────────────────────────────────────────────────────────────────

class ReportsService {

  // ───────────────────────────────────────────────────────────────────────────
  // 1. Sales Summary
  // ───────────────────────────────────────────────────────────────────────────
  async getSalesSummary(tenantId: string, filters: ReportFilters) {
    const where: any = { tenantId, deletedAt: null };
    const createdAtFilter = buildDateFilter(filters.dateFrom, filters.dateTo);
    if (createdAtFilter) where.createdAt = createdAtFilter;
    if (filters.salesRepId) where.salesRepId = filters.salesRepId;

    const projects = await prisma.project.findMany({
      where,
      select: {
        status: true,
        contractValue: true,
        createdAt: true,
        completedAt: true,
        actualEndDate: true,
      },
    });

    const totalProjects = projects.length;
    let completedProjects = 0;
    let cancelledProjects = 0;
    let openProjects = 0;
    let totalRevenue = 0;
    let totalCycleDays = 0;
    let cycleCount = 0;

    for (const p of projects) {
      if ((WON_STATUSES as readonly string[]).includes(p.status)) {
        completedProjects++;
        totalRevenue += toNumber(p.contractValue);
        // cycle time
        const closedDate = p.completedAt || p.actualEndDate;
        if (closedDate) {
          const diff = (closedDate.getTime() - p.createdAt.getTime()) / (1000 * 60 * 60 * 24);
          totalCycleDays += diff;
          cycleCount++;
        }
      } else if ((LOST_STATUSES as readonly string[]).includes(p.status)) {
        cancelledProjects++;
      } else {
        openProjects++;
      }
    }

    const decidedProjects = completedProjects + cancelledProjects;
    const winRate = decidedProjects > 0 ? Math.round((completedProjects / decidedProjects) * 1000) / 10 : 0;
    const avgDealCycle = cycleCount > 0 ? Math.round((totalCycleDays / cycleCount) * 10) / 10 : 0;
    const avgDealSize = completedProjects > 0 ? Math.round(totalRevenue / completedProjects) : 0;

    return {
      totalProjects,
      completedProjects,
      cancelledProjects,
      openProjects,
      totalRevenue: Math.round(totalRevenue * 100) / 100,
      winRate,
      avgDealCycle,
      avgDealSize,
    };
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 2. Sales Rep Performance
  // ───────────────────────────────────────────────────────────────────────────
  async getSalesRepPerformance(tenantId: string, filters: ReportFilters) {
    const where: any = { tenantId, deletedAt: null, salesRepId: { not: null } };
    const createdAtFilter = buildDateFilter(filters.dateFrom, filters.dateTo);
    if (createdAtFilter) where.createdAt = createdAtFilter;
    if (filters.salesRepId) where.salesRepId = filters.salesRepId;

    const projects = await prisma.project.findMany({
      where,
      select: {
        status: true,
        contractValue: true,
        salesRepId: true,
      },
    });

    // look up employee names
    const repIds = [...new Set(projects.map((p) => p.salesRepId).filter(Boolean))] as string[];
    const employees = await prisma.employee.findMany({
      where: { id: { in: repIds }, tenantId },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });
    const nameMap = new Map(employees.map((e) => [e.id, `${e.user.firstName} ${e.user.lastName}`]));

    // group
    const grouped: Record<string, {
      salesRepId: string;
      name: string;
      totalProjects: number;
      wonProjects: number;
      lostProjects: number;
      openProjects: number;
      revenue: number;
      pipeline: number;
    }> = {};

    for (const p of projects) {
      const repId = p.salesRepId!;
      if (!grouped[repId]) {
        grouped[repId] = {
          salesRepId: repId,
          name: nameMap.get(repId) || 'Unknown',
          totalProjects: 0,
          wonProjects: 0,
          lostProjects: 0,
          openProjects: 0,
          revenue: 0,
          pipeline: 0,
        };
      }
      const g = grouped[repId];
      g.totalProjects++;
      const val = toNumber(p.contractValue);

      if ((WON_STATUSES as readonly string[]).includes(p.status)) {
        g.wonProjects++;
        g.revenue += val;
      } else if ((LOST_STATUSES as readonly string[]).includes(p.status)) {
        g.lostProjects++;
      } else {
        g.openProjects++;
        g.pipeline += val;
      }
    }

    return Object.values(grouped).map((g) => {
      const decided = g.wonProjects + g.lostProjects;
      return {
        ...g,
        revenue: Math.round(g.revenue * 100) / 100,
        pipeline: Math.round(g.pipeline * 100) / 100,
        winRate: decided > 0 ? Math.round((g.wonProjects / decided) * 1000) / 10 : 0,
        avgDealSize: g.wonProjects > 0 ? Math.round(g.revenue / g.wonProjects) : 0,
      };
    }).sort((a, b) => b.revenue - a.revenue);
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 3. Revenue Over Time
  // ───────────────────────────────────────────────────────────────────────────
  async getRevenueOverTime(
    tenantId: string,
    filters: ReportFilters & { granularity?: 'week' | 'month' },
  ) {
    const where: any = {
      tenantId,
      deletedAt: null,
      status: { in: [...WON_STATUSES] },
    };
    const createdAtFilter = buildDateFilter(filters.dateFrom, filters.dateTo);
    if (createdAtFilter) where.createdAt = createdAtFilter;
    if (filters.salesRepId) where.salesRepId = filters.salesRepId;

    const projects = await prisma.project.findMany({
      where,
      select: { contractValue: true, completedAt: true, createdAt: true },
      orderBy: { createdAt: 'asc' },
    });

    const granularity = filters.granularity || 'month';
    const buckets: Record<string, { period: string; revenue: number; count: number }> = {};

    for (const p of projects) {
      const date = p.completedAt || p.createdAt;
      let key: string;
      if (granularity === 'week') {
        const d = new Date(date);
        const dayOfWeek = d.getDay();
        const diff = d.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
        const monday = new Date(d.setDate(diff));
        key = monday.toISOString().split('T')[0];
      } else {
        key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      }
      if (!buckets[key]) buckets[key] = { period: key, revenue: 0, count: 0 };
      buckets[key].revenue += toNumber(p.contractValue);
      buckets[key].count++;
    }

    return Object.values(buckets)
      .sort((a, b) => a.period.localeCompare(b.period))
      .map((b) => ({ ...b, revenue: Math.round(b.revenue * 100) / 100 }));
  }

  // ───────────────────────────────────────────────────────────────────────────
  // 4. Export CSV
  // ───────────────────────────────────────────────────────────────────────────
  async exportCsv(tenantId: string, filters: ReportFilters): Promise<string> {
    const reps = await this.getSalesRepPerformance(tenantId, filters);
    const header = 'Rep Name,Total Projects,Won,Lost,Open,Win Rate (%),Revenue,Avg Deal Size,Pipeline';
    const rows = reps.map((r) =>
      [r.name, r.totalProjects, r.wonProjects, r.lostProjects, r.openProjects, r.winRate, r.revenue, r.avgDealSize, r.pipeline].join(','),
    );
    return [header, ...rows].join('\n');
  }

  // ───────────────────────────────────────────────────────────────────────────
  // Helper: list sales reps for filter dropdown
  // ───────────────────────────────────────────────────────────────────────────
  async getSalesReps(tenantId: string) {
    const reps = await prisma.project.findMany({
      where: { tenantId, deletedAt: null, salesRepId: { not: null } },
      select: { salesRepId: true },
      distinct: ['salesRepId'],
    });
    const repIds = reps.map((r) => r.salesRepId).filter(Boolean) as string[];
    if (repIds.length === 0) return [];

    const employees = await prisma.employee.findMany({
      where: { id: { in: repIds }, tenantId },
      select: { id: true, user: { select: { firstName: true, lastName: true } } },
    });
    return employees.map((e) => ({
      id: e.id,
      name: `${e.user.firstName} ${e.user.lastName}`,
    }));
  }
}

export const reportsService = new ReportsService();
