import { Request, Response, NextFunction } from 'express';
import { sendCreated, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { engagementService } from './engagement.service';

export class EngagementController {
  listTemplates(req: Request, res: Response, next: NextFunction) { engagementService.listTemplates(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next); }
  createTemplate(req: Request, res: Response, next: NextFunction) { engagementService.createTemplate(req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendCreated(res, data, 'Email template created')).catch(next); }
  updateTemplate(req: Request, res: Response, next: NextFunction) { engagementService.updateTemplate(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendSuccess(res, data, 'Email template updated')).catch(next); }

  listSequences(req: Request, res: Response, next: NextFunction) { engagementService.listSequences(req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next); }
  createSequence(req: Request, res: Response, next: NextFunction) { engagementService.createSequence(req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendCreated(res, data, 'Sequence created')).catch(next); }
  updateSequence(req: Request, res: Response, next: NextFunction) { engagementService.updateSequence(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendSuccess(res, data, 'Sequence updated')).catch(next); }
  startSequence(req: Request, res: Response, next: NextFunction) { engagementService.startSequence(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendSuccess(res, data, 'Sequence started')).catch(next); }
  stopSequence(req: Request, res: Response, next: NextFunction) { engagementService.stopSequence(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendSuccess(res, data, 'Sequence stopped')).catch(next); }

  listCalls(req: Request, res: Response, next: NextFunction) { engagementService.listCalls(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next); }
  logCall(req: Request, res: Response, next: NextFunction) { engagementService.logCall(req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendCreated(res, data, 'Call logged')).catch(next); }
  updateCall(req: Request, res: Response, next: NextFunction) { engagementService.updateCall(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendSuccess(res, data, 'Call updated')).catch(next); }

  scheduleMeeting(req: Request, res: Response, next: NextFunction) { engagementService.scheduleMeeting(req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendCreated(res, data, 'Meeting scheduled')).catch(next); }
  completeMeeting(req: Request, res: Response, next: NextFunction) { engagementService.completeMeeting(req.params.id, req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendSuccess(res, data, 'Meeting completed')).catch(next); }
  logNote(req: Request, res: Response, next: NextFunction) { engagementService.logNote(req.context.tenantId, sanitizeBody(req.body), req.user?.userId).then((data) => sendCreated(res, data, 'Note logged')).catch(next); }
}

export const engagementController = new EngagementController();
