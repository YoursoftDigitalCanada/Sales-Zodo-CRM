import { NextFunction, Request, Response } from 'express';
import { sendCreated, sendNoContent, sendSuccess } from '../../common/utils/responseFormatter';
import { sanitizeBody } from '../../common/utils/sanitize-body';
import { websiteAnalyticsService } from './website-analytics.service';
import { websiteAnalyticsLiveBroadcaster } from './live-broadcaster.service';

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

  listAiInsights(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listAiInsights(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  generateAiInsight(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.generateAiInsight(req.context.tenantId, sanitizeBody(req.body), (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'AI insight generated')).catch(next);
  }

  getAiInsight(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getAiInsight(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateAiInsightStatus(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateAiInsightStatus(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'AI insight updated')).catch(next);
  }

  summarizeAiSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.summarizeAiSession(req.params.sessionId, req.context.tenantId, (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'Session summarized')).catch(next);
  }

  summarizeAiRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.summarizeAiRecording(req.params.recordingId, req.context.tenantId, (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'Recording summarized')).catch(next);
  }

  listAiConversations(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listAiConversations(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  createAiConversation(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createAiConversation(req.context.tenantId, sanitizeBody(req.body), (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'AI conversation created')).catch(next);
  }

  listAiMessages(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listAiMessages(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  createAiMessage(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createAiMessage(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendCreated(res, data, 'AI message created')).catch(next);
  }

  listIntegrations(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listIntegrations(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  createIntegration(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.createIntegration(req.context.tenantId, sanitizeBody(req.body), (req.context as any).employeeId || (req.context as any).userId).then((data) => sendCreated(res, data, 'Integration created')).catch(next);
  }

  getIntegration(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getIntegration(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data)).catch(next);
  }

  updateIntegration(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.updateIntegration(req.params.id, req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Integration updated')).catch(next);
  }

  deleteIntegration(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteIntegration(req.params.id, req.context.tenantId).then(() => sendNoContent(res)).catch(next);
  }

  testIntegration(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.testIntegration(req.params.id, req.context.tenantId).then((data) => sendSuccess(res, data, 'Integration tested')).catch(next);
  }

  listIntegrationDeliveries(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listIntegrationDeliveries(req.params.id, req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  exportVisitor(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.exportVisitor(req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data)).catch(next);
  }

  deleteVisitor(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteVisitor(req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Visitor data deleted')).catch(next);
  }

  deleteSessionPrivacy(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.deleteSessionPrivacy(req.params.sessionId, req.context.tenantId).then((data) => sendSuccess(res, data, 'Session data deleted')).catch(next);
  }

  anonymizeSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.anonymizeSession(req.params.sessionId, req.context.tenantId).then((data) => sendSuccess(res, data, 'Session anonymized')).catch(next);
  }

  retentionPreview(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.retentionPreview(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  runRetentionCleanup(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.runRetentionCleanup(req.context.tenantId, sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Retention cleanup complete')).catch(next);
  }

  reportOverview(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reportOverview(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  reportPages(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reportPages(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  reportAcquisition(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reportBreakdown(req.context.tenantId, req.query as any, 'referrer').then((data) => sendSuccess(res, data)).catch(next);
  }

  reportBehavior(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reportBehavior(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  reportTechnical(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reportTechnical(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  reportConversions(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reportConversions(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  storageUsage(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.storageUsage(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  ingestionHealth(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.ingestionHealth(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  reprocessSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.reprocessSession(req.params.sessionId, req.context.tenantId).then((data) => sendSuccess(res, data, 'Session reprocessed')).catch(next);
  }

  rebuildHeatmap(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.rebuildHeatmap(req.params.snapshotId, req.context.tenantId).then((data) => sendSuccess(res, data, 'Heatmap rebuilt')).catch(next);
  }

  recalculateFunnel(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.recalculateFunnel(req.params.runId, req.context.tenantId).then((data) => sendSuccess(res, data, 'Funnel recalculated')).catch(next);
  }

  getLiveOverview(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.getLiveOverview(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  listLiveSessions(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.listLiveSessions(req.context.tenantId, req.query as any).then((data) => sendSuccess(res, data)).catch(next);
  }

  liveStream(req: Request, res: Response) {
    res.setHeader('Content-Type', 'text/event-stream');
    res.setHeader('Cache-Control', 'no-cache, no-transform');
    res.setHeader('Connection', 'keep-alive');
    res.setHeader('X-Accel-Buffering', 'no');
    res.flushHeaders?.();
    res.write(': connected\n\n');
    const eventTypes = typeof req.query.eventTypes === 'string'
      ? new Set(req.query.eventTypes.split(',').map((item) => item.trim()).filter(Boolean))
      : new Set<string>();
    websiteAnalyticsLiveBroadcaster.subscribe({
      tenantId: req.context.tenantId,
      siteId: typeof req.query.siteId === 'string' ? req.query.siteId : null,
      eventTypes,
      path: typeof req.query.path === 'string' ? req.query.path : null,
      response: res,
    });
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
    res.setHeader('Cache-Control', 'public, max-age=30');
    res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
    res.send(websiteAnalyticsService.trackerScript());
  }

  vendorRecorder(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.vendorScript().then((script) => {
      res.setHeader('Content-Type', 'application/javascript; charset=utf-8');
      res.setHeader('Cache-Control', 'public, max-age=86400');
      res.setHeader('Cross-Origin-Resource-Policy', 'cross-origin');
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

  liveHeartbeat(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.liveHeartbeat(sanitizeBody(req.body), req.headers, req.socket.remoteAddress).then((data) => sendSuccess(res, data)).catch(next);
  }

  liveEvent(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.liveEvent(sanitizeBody(req.body), req.headers, req.socket.remoteAddress).then((data) => sendSuccess(res, data)).catch(next);
  }

  endSession(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.endSession(sanitizeBody(req.body)).then((data) => sendSuccess(res, data, 'Session ended')).catch(next);
  }

  collect(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.collect(sanitizeBody(req.body), req.headers, req.socket.remoteAddress).then((data) => sendCreated(res, data, 'Events collected')).catch(next);
  }

  startRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.startRecording(sanitizeBody(req.body), req.headers).then((data) => sendCreated(res, data, 'Recording started')).catch(next);
  }

  uploadRecordingChunk(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.uploadRecordingChunk(sanitizeBody(req.body), req.headers).then((data) => sendCreated(res, data, 'Recording chunk stored')).catch(next);
  }

  endRecording(req: Request, res: Response, next: NextFunction) {
    websiteAnalyticsService.endRecording(sanitizeBody(req.body), req.headers).then((data) => sendSuccess(res, data, 'Recording ended')).catch(next);
  }
}

export const websiteAnalyticsController = new WebsiteAnalyticsController();
