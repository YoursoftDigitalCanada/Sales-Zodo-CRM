import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { tenantAIContextService } from './ai-context.service';
import { sendSuccess } from '../../common/utils/responseFormatter';

// ============================================================================
// ANALYTICS CONTROLLER — Tenant-Scoped Endpoints
//
// Every method extracts tenantId from req.user (injected by auth middleware).
// No endpoint operates without tenant context.
// ============================================================================

export class AnalyticsController {

    /**
     * GET /analytics/dashboard — Full KPI overview
     */
    async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await analyticsService.getDashboardStats(req.context.tenantId);
            sendSuccess(res, stats);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/leads — Lead stats with date filtering
     */
    async getLeadsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const report = await analyticsService.getLeadsReport(req.context.tenantId, req.query as any);
            sendSuccess(res, report);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/revenue — Revenue with MoM growth
     */
    async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const report = await analyticsService.getRevenueReport(req.context.tenantId);
            sendSuccess(res, report);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/pipeline — Lead pipeline health (stages, values, %)
     */
    async getPipelineHealth(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const health = await analyticsService.getPipelineHealth(req.context.tenantId);
            sendSuccess(res, health);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/lead-sources — Leads broken down by source
     */
    async getLeadSources(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const sources = await analyticsService.getLeadSourceStats(req.context.tenantId, req.query as any);
            sendSuccess(res, sources);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/revenue-trend — Monthly revenue (last 6 months)
     */
    async getRevenueTrend(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const trend = await analyticsService.getRevenueTrend(req.context.tenantId);
            sendSuccess(res, trend);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/bookings — Booking stats (pending, confirmed, etc.)
     */
    async getBookingStats(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await analyticsService.getBookingStats(req.context.tenantId);
            sendSuccess(res, stats);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/smb-insights — SMB-focused metrics
     *
     * Returns lifecycle stage distribution, repeat customer rate,
     * and customer lifetime value approximation in one response.
     */
    async getSMBInsights(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const insights = await analyticsService.getSMBInsights(req.context.tenantId);
            sendSuccess(res, insights);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/ai-context — Unified AI intelligence context
     *
     * Returns a single, normalized DTO containing all tenant-scoped
     * business metrics for consumption by AI features (Business Overview,
     * Ask Experts, Smart Alerts, Forecasting).
     *
     * AI/LLM never queries DB directly — this is the bridge.
     */
    async getAIContext(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const context = await tenantAIContextService.buildContext(req.context.tenantId);
            sendSuccess(res, context);
        } catch (e) { next(e); }
    }

    /**
     * GET /analytics/business-overview — Human-readable AI summary
     *
     * Builds the full AI context, then distills it into a structured
     * response for the frontend dashboard widget and copilot.
     *
     * Response shape:
     *   businessHealth, businessType, zeroState,
     *   topInsights (top 5), suggestedActions, riskAlerts, summary
     */
    async getBusinessOverview(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const context = await tenantAIContextService.buildContext(req.context.tenantId);
            const { insights } = context;

            const overview = {
                businessHealth: context.businessHealth,
                businessType: context.businessType,
                zeroState: context.zeroState,
                onboardingCompleted: context.onboardingCompleted,

                // Top 5 severity-ranked insights
                topInsights: insights.slice(0, 5),

                // Actionable items only
                suggestedActions: insights
                    .filter(i => i.action)
                    .map(i => ({
                        insightId: i.id,
                        title: i.title,
                        action: i.action!,
                        severity: i.severity,
                        category: i.category,
                    })),

                // Critical + warning alerts
                riskAlerts: insights.filter(
                    i => i.severity === 'critical' || i.severity === 'warning'
                ),

                // Quick summary stats
                summary: {
                    totalLeads: context.pipeline.totalLeads,
                    conversionRate: context.pipeline.conversionRate,
                    revenueThisMonth: context.revenue.thisMonth,
                    revenueGrowth: context.revenue.growth,
                    overdueTasks: context.tasks.overdue,
                    taskCompletionRate: context.tasks.completionRate,
                    activeProjects: context.projects.active,
                    activeClients: context.clients.total,
                    netPosition: context.growthIndicators.netPosition,
                },

                generatedAt: context.generatedAt,
            };

            sendSuccess(res, overview);
        } catch (e) { next(e); }
    }
}

export const analyticsController = new AnalyticsController();
