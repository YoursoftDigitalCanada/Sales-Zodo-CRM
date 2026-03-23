import { Request, Response, NextFunction } from 'express';
import { reportsService } from './reports.service';
import { sendSuccess } from '../../common/utils/responseFormatter';

export class ReportsController {
  private getTenantId(req: Request): string {
    return req.context.tenantId;
  }

  private getFilters(req: Request) {
    return {
      dateFrom: req.query.dateFrom as string | undefined,
      dateTo: req.query.dateTo as string | undefined,
      salesRepId: req.query.salesRepId as string | undefined,
    };
  }

  async getSalesSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getSalesSummary(this.getTenantId(req), this.getFilters(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getSalesRepPerformance(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getSalesRepPerformance(this.getTenantId(req), this.getFilters(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async getRevenueOverTime(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const filters = {
        ...this.getFilters(req),
        granularity: (req.query.granularity as 'week' | 'month') || 'month',
      };
      const data = await reportsService.getRevenueOverTime(this.getTenantId(req), filters);
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const csv = await reportsService.exportCsv(this.getTenantId(req), this.getFilters(req));
      res.setHeader('Content-Type', 'text/csv');
      res.setHeader('Content-Disposition', 'attachment; filename=sales-report.csv');
      res.send(csv);
    } catch (error) {
      next(error);
    }
  }

  async getSalesReps(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const data = await reportsService.getSalesReps(this.getTenantId(req));
      sendSuccess(res, data);
    } catch (error) {
      next(error);
    }
  }
}

export const reportsController = new ReportsController();
