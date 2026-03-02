import { prisma } from '../../config/database';
import { Decimal } from '@prisma/client/runtime/library';

export class AdminDashboardService {
    /**
     * Get all dashboard KPI metrics in a single batched call
     */
    async getDashboardMetrics() {
        const now = new Date();
        const thirtyDaysAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000);

        const [
            totalTenants,
            activeTenants,
            trialTenants,
            suspendedTenants,
            cancelledTenants,
            totalUsers,
            newSignupsLast30,
            subscriptions,
            recentLogins,
        ] = await Promise.all([
            prisma.tenant.count(),
            prisma.tenant.count({ where: { status: 'ACTIVE' } }),
            prisma.tenant.count({ where: { status: 'TRIAL' } }),
            prisma.tenant.count({ where: { status: 'SUSPENDED' } }),
            prisma.tenant.count({ where: { status: 'CANCELLED' } }),
            prisma.user.count(),
            prisma.tenant.count({ where: { createdAt: { gte: thirtyDaysAgo } } }),
            prisma.subscription.findMany(),
            prisma.user.count({ where: { lastLoginAt: { gte: thirtyDaysAgo } } }),
        ]);

        // Calculate revenue metrics from subscriptions
        let mrr = 0;
        let arr = 0;
        let totalRevenue = 0;
        let activeMonthly = 0;
        let activeYearly = 0;
        let expiredCount = 0;

        for (const sub of subscriptions) {
            const monthlyRate = Number(sub.monthlyRate || 0);
            const paid = Number(sub.totalPaid || 0);
            totalRevenue += paid;

            if (sub.status === 'ACTIVE') {
                if (sub.billingCycle === 'MONTHLY') {
                    mrr += monthlyRate;
                    activeMonthly++;
                } else if (sub.billingCycle === 'YEARLY') {
                    mrr += monthlyRate;
                    activeYearly++;
                }
            }

            if (sub.status === 'EXPIRED') {
                expiredCount++;
            }
        }

        arr = mrr * 12;

        return {
            tenants: {
                total: totalTenants,
                active: activeTenants,
                trial: trialTenants,
                suspended: suspendedTenants,
                cancelled: cancelledTenants,
            },
            subscriptions: {
                activeMonthly,
                activeYearly,
                expired: expiredCount,
                total: subscriptions.length,
            },
            users: {
                total: totalUsers,
                activeInLast30Days: recentLogins,
            },
            newSignupsLast30Days: newSignupsLast30,
            revenue: {
                mrr: Math.round(mrr * 100) / 100,
                arr: Math.round(arr * 100) / 100,
                totalRevenue: Math.round(totalRevenue * 100) / 100,
            },
        };
    }

    /**
     * Get revenue analytics with breakdown
     */
    async getRevenueAnalytics() {
        const now = new Date();
        const startOfMonth = new Date(now.getFullYear(), now.getMonth(), 1);
        const startOfYear = new Date(now.getFullYear(), 0, 1);

        const subscriptions = await prisma.subscription.findMany({
            include: { tenant: { select: { id: true, name: true } } },
        });

        let totalRevenue = 0;
        let revenueThisMonth = 0;
        let revenueThisYear = 0;
        let mrr = 0;
        const revenueByPlan: Record<string, number> = {};
        const revenueByBillingCycle: Record<string, number> = { MONTHLY: 0, YEARLY: 0 };
        const topTenants: { name: string; revenue: number }[] = [];

        for (const sub of subscriptions) {
            const paid = Number(sub.totalPaid || 0);
            const monthlyRate = Number(sub.monthlyRate || 0);
            totalRevenue += paid;

            // Revenue by plan
            revenueByPlan[sub.planType] = (revenueByPlan[sub.planType] || 0) + paid;

            // Revenue by billing cycle
            revenueByBillingCycle[sub.billingCycle] = (revenueByBillingCycle[sub.billingCycle] || 0) + paid;

            // MRR from active
            if (sub.status === 'ACTIVE') {
                mrr += monthlyRate;
            }

            // Top tenants
            topTenants.push({ name: sub.tenant.name, revenue: paid });

            // Approximate monthly/yearly revenue
            if (sub.updatedAt >= startOfMonth) {
                revenueThisMonth += monthlyRate;
            }
            if (sub.updatedAt >= startOfYear) {
                revenueThisYear += paid;
            }
        }

        // Sort top tenants
        topTenants.sort((a, b) => b.revenue - a.revenue);

        return {
            totalRevenue: Math.round(totalRevenue * 100) / 100,
            revenueThisMonth: Math.round(revenueThisMonth * 100) / 100,
            revenueThisYear: Math.round(revenueThisYear * 100) / 100,
            mrr: Math.round(mrr * 100) / 100,
            arr: Math.round(mrr * 12 * 100) / 100,
            revenueByPlan,
            revenueByBillingCycle,
            topPayingTenants: topTenants.slice(0, 10),
        };
    }

    /**
     * Get subscription analytics
     */
    async getSubscriptionAnalytics() {
        const now = new Date();
        const sevenDaysFromNow = new Date(now.getTime() + 7 * 24 * 60 * 60 * 1000);
        const thirtyDaysFromNow = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000);

        const [
            totalSubs,
            activeSubs,
            trialSubs,
            cancelledSubs,
            expiredSubs,
            renewalsIn7,
            renewalsIn30,
            failedPayments,
            planDistribution,
        ] = await Promise.all([
            prisma.subscription.count(),
            prisma.subscription.count({ where: { status: 'ACTIVE' } }),
            prisma.subscription.count({ where: { status: 'TRIAL' } }),
            prisma.subscription.count({ where: { status: 'CANCELLED' } }),
            prisma.subscription.count({ where: { status: 'EXPIRED' } }),
            prisma.subscription.count({
                where: { nextBillingDate: { gte: now, lte: sevenDaysFromNow } },
            }),
            prisma.subscription.count({
                where: { nextBillingDate: { gte: now, lte: thirtyDaysFromNow } },
            }),
            prisma.subscription.count({ where: { failedPayments: { gt: 0 } } }),
            prisma.subscription.groupBy({
                by: ['planType'],
                _count: { id: true },
            }),
        ]);

        // Conversion & churn rates
        const trialToPaidRate = totalSubs > 0
            ? Math.round((activeSubs / Math.max(1, trialSubs + activeSubs)) * 100)
            : 0;

        const churnRate = totalSubs > 0
            ? Math.round(((cancelledSubs + expiredSubs) / totalSubs) * 100)
            : 0;

        return {
            total: totalSubs,
            active: activeSubs,
            trial: trialSubs,
            cancelled: cancelledSubs,
            expired: expiredSubs,
            upcomingRenewals7Days: renewalsIn7,
            upcomingRenewals30Days: renewalsIn30,
            failedPayments,
            trialToPaidConversionRate: trialToPaidRate,
            churnRate,
            planDistribution: planDistribution.map((p) => ({
                plan: p.planType,
                count: p._count.id,
            })),
        };
    }
}

export const adminDashboardService = new AdminDashboardService();
