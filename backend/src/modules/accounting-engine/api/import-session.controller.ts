import { Request, Response, NextFunction } from 'express';
import { importSessionService } from './import-session.service';
import { transferMatchingService } from '../transfer-intelligence/transfer-matching.service';
import { bookkeepingAuditService } from '../event-store/audit.service';
import { statementExportService, type StatementExportQuery } from './statement-export.service';

function tenant(req: Request): string { return req.context.tenantId; }
function actor(req: Request): string | undefined { return req.user?.userId || req.user?.employeeId; }

function sendSuccess(res: Response, data: any, message?: string) {
  res.json({ success: true, data, message });
}

class ImportSessionController {

  createSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await importSessionService.createSession(tenant(req), req.body.name, actor(req));
      sendSuccess(res, session, 'Import session created');
    } catch (error) { next(error); }
  };

  listSessions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.listSessions(tenant(req), req.query as any);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  };

  getSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const session = await importSessionService.getSession(req.params.sessionId, tenant(req));
      sendSuccess(res, session);
    } catch (error) { next(error); }
  };

  cancelSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await importSessionService.cancelSession(req.params.sessionId, tenant(req), actor(req));
      sendSuccess(res, null, 'Session cancelled');
    } catch (error) { next(error); }
  };

  uploadFile = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.uploadAndCreateRawTransactions(
        req.params.sessionId,
        tenant(req),
        req.body.fileContent,
        req.body.fileName,
        req.body.accountId,
        actor(req),
      );
      sendSuccess(res, result, 'File uploaded and parsed');
    } catch (error) { next(error); }
  };

  processSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.processSession(req.params.sessionId, tenant(req), actor(req));
      sendSuccess(res, result, 'Session processed');
    } catch (error) { next(error); }
  };

  finalizeSession = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.finalizeSession(req.params.sessionId, tenant(req), actor(req));
      sendSuccess(res, result, 'Session finalized');
    } catch (error) { next(error); }
  };

  listRawTransactions = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.listRawTransactions(req.params.sessionId, tenant(req), req.query as any);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  };

  exportStatement = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const query = req.query as unknown as StatementExportQuery;
      const reportName = query.mode === 'BANK' ? 'bank-statement' : 'credit-card-statement';
      const date = new Date().toISOString().slice(0, 10);
      if (query.format === 'pdf') {
        const pdf = await statementExportService.pdf(req.params.sessionId, tenant(req), query, actor(req));
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename="${reportName}-${date}.pdf"`);
        res.send(pdf);
        return;
      }
      const csv = await statementExportService.csv(req.params.sessionId, tenant(req), query, actor(req));
      res.setHeader('Content-Type', 'text/csv; charset=utf-8');
      res.setHeader('Content-Disposition', `attachment; filename="${reportName}-${date}.csv"`);
      res.send(csv);
    } catch (error) { next(error); }
  };

  updateRawTransaction = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.updateRawTransaction(req.params.rawTxId, tenant(req), req.body);
      sendSuccess(res, result, 'Raw transaction updated');
    } catch (error) { next(error); }
  };

  getMatches = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.getMatches(req.params.sessionId, tenant(req));
      sendSuccess(res, result);
    } catch (error) { next(error); }
  };

  confirmMatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await transferMatchingService.confirmMatch(req.params.rawTxId, req.body.matchedRawTxId, tenant(req));
      sendSuccess(res, null, 'Match confirmed');
    } catch (error) { next(error); }
  };

  rejectMatch = async (req: Request, res: Response, next: NextFunction) => {
    try {
      await transferMatchingService.rejectMatch(req.params.rawTxId, tenant(req));
      sendSuccess(res, null, 'Match rejected');
    } catch (error) { next(error); }
  };

  aiCategorize = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.processSession(req.params.sessionId, tenant(req), actor(req));
      sendSuccess(res, result, 'AI categorization complete');
    } catch (error) { next(error); }
  };

  getReviewQueue = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.getReviewQueue(req.params.sessionId, tenant(req), req.query as any);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  };

  getDuplicates = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await importSessionService.getDuplicates(req.params.sessionId, tenant(req), req.query as any);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  };

  getAuditLog = async (req: Request, res: Response, next: NextFunction) => {
    try {
      const result = await bookkeepingAuditService.getAuditLog(tenant(req), req.query as any);
      sendSuccess(res, result);
    } catch (error) { next(error); }
  };
}

export const importSessionController = new ImportSessionController();
