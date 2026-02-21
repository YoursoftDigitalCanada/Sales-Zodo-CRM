// src/modules/analytics/ai-context.service.ts
// ============================================================================
// TENANT AI CONTEXT SERVICE — Central Intelligence Aggregator
//
// The SINGLE entry point for ALL AI features to obtain tenant-scoped
// business intelligence. No AI module should query the database directly.
//
// Architecture:
//   Controller → TenantAIContextService → AnalyticsRepository → Prisma (tenant-scoped)
//                                       → Tenant Model (settings, status)
//                                       ↓
//                              TenantAIContext DTO
//                                       ↓
//                            AI Layer (LLM interpretation)
//
// Consumers:
//   - AI Business Overview (dashboard widget)
//   - Ask Experts (contextual Q&A)
//   - Smart Alerts / Forecasting (future)
//   - Multi-industry AI insights (roofing, clinic, salon, agency)
//
// Security: ALL data is strictly scoped by tenantId from req.context.
// ============================================================================

import { prisma } from '../../config/database';
import { analyticsRepository } from './analytics.repository';
import { logger } from '../../common/utils/logger';
import {
    TenantAIContext,
    BusinessHealthLevel,
    AIGrowthIndicators,
} from './ai-context.dto';
import { businessTypeInsightEngine } from './business-type-insights';

// ── Zero-state threshold: tenants with fewer total records are "zero-state" ──
const ZERO_STATE_THRESHOLD = 3;

class TenantAIContextService {

    /**
     * Build a complete, normalized AI context object for a tenant.
     *
     * This is the ONLY method AI features should call.
     * It aggregates all analytics data, computes derived metrics,
     * and returns a single DTO ready for LLM consumption.
     *
     * @param tenantId - From req.context.tenantId (JWT-verified)
     */
    async buildContext(tenantId: string): Promise<TenantAIContext> {
        const startTime = Date.now();

        // ── 1. Load tenant metadata ─────────────────────────────────────────
        const tenant = await prisma.tenant.findUnique({
            where: { id: tenantId },
            select: {
                id: true,
                name: true,
                settings: true,
                onboardingCompleted: true,
                status: true,
            },
        });

        if (!tenant) {
            throw new Error(`Tenant ${tenantId} not found`);
        }

        const settings = (tenant.settings as Record<string, any>) || {};
        const enabledModules: string[] = settings.enabledModules || [];
        const businessType: string = settings.businessType || 'general';

        // ── 2. Aggregate all analytics in parallel ──────────────────────────
        const [
            dashboardStats,
            pipelineHealth,
            revenueTrend,
        ] = await Promise.all([
            this.getDashboardStats(tenantId),
            analyticsRepository.getPipelineHealth(tenantId),
            analyticsRepository.getMonthlyRevenueTrend(tenantId),
        ]);

        // ── 3. Compute pipeline summary ─────────────────────────────────────
        const pipelineStagesMap = new Map(
            pipelineHealth.stages.map((s) => [s.status, s])
        );

        const newLeads = pipelineStagesMap.get('NEW')?.count || 0;
        const contacted = pipelineStagesMap.get('CONTACTED')?.count || 0;
        const qualified = pipelineStagesMap.get('QUALIFIED')?.count || 0;
        const proposalsSent = pipelineStagesMap.get('PROPOSAL')?.count || 0;
        const negotiation = pipelineStagesMap.get('NEGOTIATION')?.count || 0;
        const won = pipelineStagesMap.get('WON')?.count || 0;
        const lost = pipelineStagesMap.get('LOST')?.count || 0;

        // Stalled = leads in mid-pipeline (CONTACTED, QUALIFIED, PROPOSAL, NEGOTIATION)
        // that exist but haven't moved — approximation based on counts
        const stalledCount = contacted + qualified + proposalsSent + negotiation;

        const pipeline = {
            totalLeads: pipelineHealth.total,
            newLeads,
            qualified,
            proposalsSent,
            won,
            lost,
            conversionRate: pipelineHealth.total > 0
                ? Math.round((won / pipelineHealth.total) * 100)
                : 0,
            stalled: stalledCount,
            stages: pipelineHealth.stages,
        };

        // ── 4. Compute growth indicators ────────────────────────────────────
        const growthIndicators = this.computeGrowthIndicators(
            dashboardStats,
            pipeline.conversionRate
        );

        // ── 5. Determine zero-state + business health ───────────────────────
        const totalDataPoints =
            dashboardStats.leads.total +
            dashboardStats.clients.total +
            dashboardStats.tasks.total +
            dashboardStats.projects.total;

        const zeroState = !tenant.onboardingCompleted || totalDataPoints < ZERO_STATE_THRESHOLD;
        const businessHealth = this.assessBusinessHealth(dashboardStats, growthIndicators, zeroState);

        // ── 6. Assemble the context ─────────────────────────────────────────
        const context: TenantAIContext = {
            tenantId: tenant.id,
            tenantName: tenant.name,
            businessType,
            onboardingCompleted: tenant.onboardingCompleted,
            zeroState,
            businessHealth,

            pipeline,

            revenue: {
                total: dashboardStats.revenue.total,
                thisMonth: dashboardStats.revenue.thisMonth,
                lastMonth: dashboardStats.revenue.lastMonth,
                outstanding: dashboardStats.revenue.outstanding,
                growth: dashboardStats.revenue.growth,
                trend: revenueTrend,
            },

            expenses: dashboardStats.expenses,

            tasks: dashboardStats.tasks,

            clients: {
                total: dashboardStats.clients.total,
                active: dashboardStats.clients.active,
                newThisMonth: dashboardStats.clients.new,
            },

            projects: dashboardStats.projects,

            bookings: dashboardStats.bookings,

            growthIndicators,
            insights: [], // placeholder — filled below
            enabledModules,
            generatedAt: new Date().toISOString(),
        };

        // ── 7. Generate industry-aware insights ─────────────────────────
        context.insights = businessTypeInsightEngine.generateInsights(context);

        logger.info('[AI Context] Built tenant context', {
            tenantId,
            zeroState,
            businessHealth,
            businessType,
            insightCount: context.insights.length,
            totalDataPoints,
            durationMs: Date.now() - startTime,
        });

        return context;
    }

    // ═════════════════════════════════════════════════════════════════════════
    // PRIVATE HELPERS
    // ═════════════════════════════════════════════════════════════════════════

    /**
     * Fetch full dashboard stats using the analytics repository.
     * Mirrors AnalyticsService.getDashboardStats but returns raw objects.
     */
    private async getDashboardStats(tenantId: string) {
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
     * Compute growth indicators from dashboard stats.
     */
    private computeGrowthIndicators(
        stats: Awaited<ReturnType<typeof this.getDashboardStats>>,
        leadConversion: number
    ): AIGrowthIndicators {
        const clientAcquisitionRate = stats.clients.total > 0
            ? Math.round((stats.clients.new / stats.clients.total) * 100)
            : 0;

        const netPosition = stats.revenue.total - stats.expenses.total;

        return {
            revenueGrowth: stats.revenue.growth,
            leadConversion,
            taskCompletion: stats.tasks.completionRate,
            clientAcquisitionRate,
            netPosition,
        };
    }

    /**
     * Assess overall business health based on key metrics.
     *
     * Scoring:
     *   - New tenant (zero-state)           → 'New'
     *   - Revenue declining + overdue tasks  → 'Critical' / 'At Risk'
     *   - Moderate growth                    → 'Moderate' / 'Healthy'
     *   - Strong growth + high completion    → 'Thriving'
     */
    private assessBusinessHealth(
        stats: Awaited<ReturnType<typeof this.getDashboardStats>>,
        growth: AIGrowthIndicators,
        zeroState: boolean
    ): BusinessHealthLevel {
        if (zeroState) return 'New';

        let score = 50; // baseline

        // Revenue health (+/- 20)
        if (growth.revenueGrowth > 10) score += 20;
        else if (growth.revenueGrowth > 0) score += 10;
        else if (growth.revenueGrowth < -10) score -= 20;
        else if (growth.revenueGrowth < 0) score -= 10;

        // Task health (+/- 15)
        if (growth.taskCompletion > 80) score += 15;
        else if (growth.taskCompletion > 50) score += 5;
        else if (stats.tasks.overdue > 5) score -= 15;
        else if (stats.tasks.overdue > 0) score -= 5;

        // Pipeline health (+/- 10)
        if (growth.leadConversion > 20) score += 10;
        else if (growth.leadConversion > 10) score += 5;
        else if (growth.leadConversion === 0 && stats.leads.total > 0) score -= 10;

        // Client health (+/- 5)
        if (growth.clientAcquisitionRate > 10) score += 5;
        else if (stats.clients.total === 0) score -= 5;

        // Map score to health level
        if (score >= 80) return 'Thriving';
        if (score >= 65) return 'Healthy';
        if (score >= 45) return 'Moderate';
        if (score >= 30) return 'At Risk';
        return 'Critical';
    }
}

export const tenantAIContextService = new TenantAIContextService();
