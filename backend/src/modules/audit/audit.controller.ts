import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { auditService } from './audit.service';

function escapeCsv(value: unknown): string {
  const stringValue = String(value ?? '');
  if (/[",\n]/.test(stringValue)) {
    return `"${stringValue.replace(/"/g, '""')}"`;
  }

  return stringValue;
}

export class AuditController {
  async getMany(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await auditService.getAuditLogs(req.context.tenantId, req.query as any);
      sendSuccess(res, result.data, undefined, 200, result.meta);
    } catch (error) {
      next(error);
    }
  }

  async exportCsv(req: Request, res: Response, next: NextFunction): Promise<void> {
    try {
      const result = await auditService.getAuditLogs(req.context.tenantId, {
        ...(req.query as any),
        page: 1,
        limit: 5000,
      });

      const rows = [
        ['Timestamp', 'Action', 'Module', 'Description', 'User', 'IP'],
        ...result.data.map((log) => [
          log.createdAt.toISOString(),
          log.action,
          log.module,
          log.description,
          log.user ? `${log.user.firstName} ${log.user.lastName}`.trim() : '',
          log.ipAddress || '',
        ]),
      ];

      const csv = rows.map((row) => row.map(escapeCsv).join(',')).join('\n');
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="audit-logs-${new Date().toISOString().slice(0, 10)}.csv"`);
      res.status(200).send(csv);
    } catch (error) {
      next(error);
    }
  }
}

export const auditController = new AuditController();
