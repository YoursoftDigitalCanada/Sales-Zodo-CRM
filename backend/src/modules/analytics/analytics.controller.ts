import { Request, Response, NextFunction } from 'express';
import { analyticsService } from './analytics.service';
import { sendSuccess } from '../../common/utils/responseFormatter';

export class AnalyticsController {
    async getDashboard(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const stats = await analyticsService.getDashboardStats(req.user!.tenantId!);
            sendSuccess(res, stats);
        } catch (e) { next(e); }
    }

    async getLeadsReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const report = await analyticsService.getLeadsReport(req.user!.tenantId!, req.query as any);
            sendSuccess(res, report);
        } catch (e) { next(e); }
    }

    async getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void> {
        try {
            const report = await analyticsService.getRevenueReport(req.user!.tenantId!);
            sendSuccess(res, report);
        } catch (e) { next(e); }
    }
}

export const analyticsController = new AnalyticsController();
