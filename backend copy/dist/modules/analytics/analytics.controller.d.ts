import { Request, Response, NextFunction } from 'express';
export declare class AnalyticsController {
    getDashboard(req: Request, res: Response, next: NextFunction): Promise<void>;
    getLeadsReport(req: Request, res: Response, next: NextFunction): Promise<void>;
    getRevenueReport(req: Request, res: Response, next: NextFunction): Promise<void>;
}
export declare const analyticsController: AnalyticsController;
//# sourceMappingURL=analytics.controller.d.ts.map