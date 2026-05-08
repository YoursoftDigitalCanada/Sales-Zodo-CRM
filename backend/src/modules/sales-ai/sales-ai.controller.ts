import { Request, Response, NextFunction } from 'express';
import { sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { salesAIService } from './sales-ai.service';

export class SalesAIController {
  salesChat(req: Request, res: Response, next: NextFunction) {
    salesAIService.salesChat(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data)).catch(next);
  }
  scoreLead(req: Request, res: Response, next: NextFunction) {
    salesAIService.scoreLead(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data, 'Lead scored')).catch(next);
  }
  generateEmail(req: Request, res: Response, next: NextFunction) {
    salesAIService.generateEmail(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data, 'Email generated')).catch(next);
  }
  dealInsights(req: Request, res: Response, next: NextFunction) {
    salesAIService.dealInsights(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data, 'Deal insight generated')).catch(next);
  }
  summarizeActivity(req: Request, res: Response, next: NextFunction) {
    salesAIService.summarizeActivity(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data, 'Activity summarized')).catch(next);
  }
  followUpSuggestions(req: Request, res: Response, next: NextFunction) {
    salesAIService.followUpSuggestions(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data, 'Follow-up suggestions generated')).catch(next);
  }
  queryCRM(req: Request, res: Response, next: NextFunction) {
    salesAIService.queryCRM(req.context.tenantId, sanitizeBody(req.body), (req as any).employee?.id || req.user?.userId).then((data) => sendSuccess(res, data, 'CRM query complete')).catch(next);
  }
}

export const salesAIController = new SalesAIController();
