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

  listSegments(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listSegments(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  createSegment(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createSegment(req.context.tenantId, sanitizeBody(req.body), (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'Segment created')).catch(next);
  }

  getSegment(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getSegment(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateSegment(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateSegment(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Segment updated')).catch(next);
  }

  deleteSegment(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteSegment(req.params.id, req.context.tenantId).then(() => sendNoContent(res)).catch(next);
  }

  getFilterOptions(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getFilterOptions(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  listFunnels(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listFunnels(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  createFunnel(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createFunnel(req.context.tenantId, sanitizeBody(req.body), (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'Funnel created')).catch(next);
  }

  getFunnel(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getFunnel(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateFunnel(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateFunnel(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Funnel updated')).catch(next);
  }

  deleteFunnel(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteFunnel(req.params.id, req.context.tenantId).then(() => sendNoContent(res)).catch(next);
  }

  runFunnel(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.runFunnel(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'Funnel analyzed')).catch(next);
  }

  listFunnelRuns(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listFunnelRuns(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  getFunnelRun(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getFunnelRun(req.params.runId, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  listFunnelRunSessions(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listFunnelRunSessions(req.params.runId, req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  analyzeJourneys(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.analyzeJourneys(req.context.tenantId, sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'Journeys analyzed')).catch(next);
  }

  listJourneyPaths(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listJourneyPaths(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  getJourneyPath(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getJourneyPath(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  listJourneyAggregates(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listJourneyAggregates(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  getSessionJourney(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getSessionJourney(req.params.sessionId, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
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

  listHeatmaps(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listHeatmaps(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  createHeatmapSnapshot(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createHeatmapSnapshot(req.context.tenantId, sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'Heatmap snapshot created')).catch(next);
  }

  getHeatmapSnapshot(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getHeatmapSnapshot(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  getHeatmapPoints(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getHeatmapPoints(req.params.id, req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  deleteHeatmapSnapshot(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteHeatmapSnapshot(req.params.id, req.context.tenantId).then(() => sendSuccess(res, null, 'Heatmap snapshot deleted')).catch(next);
  }

  listBehaviorSignals(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listBehaviorSignals(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  getBehaviorSignal(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getBehaviorSignal(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  listBehaviorIssues(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listBehaviorIssues(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  getBehaviorIssue(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getBehaviorIssue(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateBehaviorIssueStatus(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateBehaviorIssueStatus(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data)).catch(next);
  }

  analyzeSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.analyzeSession(req.params.sessionId, req.context.tenantId).then((data) => sendSuccess(res, data, 'Session analyzed')).catch(next);
  }

  listSessionTags(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listSessionTags(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  createSessionTag(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createSessionTag(req.params.id, req.context.tenantId, sanitizeBody(req.body), (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'Session tagged')).catch(next);
  }

  deleteSessionTag(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteSessionTag(req.params.id, req.params.tagId, req.context.tenantId).then(() => sendNoContent(res)).catch(next);
  }

  getVisitorIdentity(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getVisitorIdentity(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateVisitorIdentity(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateVisitorIdentity(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Visitor identity updated')).catch(next);
  }

  listRecordings(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listRecordings(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  getRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getRecording(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  getRecordingChunks(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getRecordingChunks(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  setRecordingFavorite(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.setRecordingFavorite(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data)).catch(next);
  }

  setRecordingLabels(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.setRecordingLabels(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data)).catch(next);
  }

  enableRecordingShare(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.enableRecordingShare(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  disableRecordingShare(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.disableRecordingShare(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  tracker(req: Request, res: Response) {
    res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
    res.setHeader('Cache-Control', 'public, max-age=300');
    res.send(websiteAnalyticsService.trackerScript());
  }

  vendorRecorder(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.vendorScript().then((script) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.send(script);
    }).catch(next);
  }

  getSharedRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getSharedRecording(req.params.shareToken).then((data) => sendSuccess(res, data)).catch(next);
  }

  getSharedRecordingChunks(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getSharedRecordingChunks(req.params.shareToken).then((data) => sendSuccess(res, data)).catch(next);
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

  startRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.startRecording(sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'Recording started')).catch(next);
  }

  uploadRecordingChunk(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.uploadRecordingChunk(sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'Recording chunk stored')).catch(next);
  }

  endRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.endRecording(sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Recording ended')).catch(next);
  }
}

export const websiteAnalyticsController = new WebsiteAnalyticsController();
