import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
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
}

export const analyticsController = new AnalyticsController();
