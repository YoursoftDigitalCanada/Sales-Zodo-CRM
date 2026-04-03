import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { dashboardService, type DashboardSummaryIncludes } from './dashboard.service';

function parseBooleanFlag(value: unknown): boolean | undefined {
  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value !== 'string') {
    return undefined;
  }

  const normalized = value.trim().toLowerCase();
  if (['true', '1', 'yes', 'on'].includes(normalized)) {
    return true;
  }

  if (['false', '0', 'no', 'off'].includes(normalized)) {
    return false;
  }

  return undefined;
}

export class DashboardController {
  async getSummary(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const includes: DashboardSummaryIncludes = {
        includeLeads: parseBooleanFlag(req.query.includeLeads),
        includeInvoices: parseBooleanFlag(req.query.includeInvoices),
        includeProjects: parseBooleanFlag(req.query.includeProjects),
        includeClients: parseBooleanFlag(req.query.includeClients),
        includeTasks: parseBooleanFlag(req.query.includeTasks),
        includeQuotes: parseBooleanFlag(req.query.includeQuotes),
        includeInspections: parseBooleanFlag(req.query.includeInspections),
      };

      const summary = await dashboardService.getSummary({
        tenantId: req.context.tenantId,
        permissions: req.permissions || [],
        dataAccess: req.dataAccess,
        includes,
      });

      sendSuccess(res, summary);
    } catch (error) {
      next(error);
    }
  }
}

export const dashboardController = new DashboardController();
