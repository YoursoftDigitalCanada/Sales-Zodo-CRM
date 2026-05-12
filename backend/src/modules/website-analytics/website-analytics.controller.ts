import { NextFunction, Request, Response } from 'express';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { websiteAnalyticsService } from './website-analytics.service';

export class WebsiteAnalyticsController {
  listSites(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listSites(req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  createSite(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createSite(req.context.tenantId, sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'Website added')).catch(next);
  }

  getSite(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getSite(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateSite(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateSite(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Website updated')).catch(next);
  }

  deactivateSite(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deactivateSite(req.params.id, req.context.tenantId).then(() => sendNoContent(res)).catch(next);
  }

  getSnippet(req: Request, res: Response, next: NextFunction) {
    const apiHost = `${req.protocol}://${req.get('host')}/api/v1`;
    websiteAnalyticsService.getSnippet(req.params.id, req.context.tenantId, apiHost).then((data) => sendSuccess(res, data)).catch(next);
  }

  listSessions(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listSessions(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  getSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getSession(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  listEvents(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listEvents(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  tracker(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(websiteAnalyticsService.trackerScript());
  }

  startSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.startSession(sanitizeBody(req.body), req.headers, req.socket.remoteAddress).then((data) => sendCreated(res, data, 'Session started')).catch(next);
  }

  endSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.endSession(sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Session ended')).catch(next);
  }

  collect(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.collect(sanitizeBody(req.body), req.headers, req.socket.remoteAddress).then((data) => sendCreated(res, data, 'Events collected')).catch(next);
  }
}

export const websiteAnalyticsController = new WebsiteAnalyticsController();
