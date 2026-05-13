import api from "@/lib/axios";

const data = (response: any) => response.data?.data || response.data;

export interface WebsiteAnalyticsMetrics {
  totalSessions: number;
  pageViews: number;
  uniqueVisitors: number;
  jsErrors: number;
  averageDurationMs: number;
}

export interface WebsiteAnalyticsSite {
  id: string;
  name: string;
  domain: string;
  trackingKey: string;
  isActive: boolean;
  privacySettings?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  metrics: WebsiteAnalyticsMetrics;
}

export interface WebsiteRecording {
  id: string;
  siteId: string;
  sessionId: string;
  visitorId?: string | null;
  status: string;
  eventCount: number;
  durationMs?: number | null;
  startedAt: string;
  endedAt?: string | null;
  sizeBytes: number;
  isFavorite: boolean;
  labels: string[];
  summary?: string | null;
  shareToken?: string | null;
  shareEnabled: boolean;
  site?: Pick<WebsiteAnalyticsSite, "id" | "name" | "domain">;
  session?: WebsiteSession;
  visitor?: { id: string; anonymousId: string };
  chunks?: Array<{ id: string; sequence: number; eventCount: number; sizeBytes: number; createdAt: string }>;
}

export interface RecordingChunksResponse {
  recordingId: string;
  chunks: Array<{ sequence: number; events: any[] }>;
}

export interface WebsiteHeatmapSnapshot {
  id: string;
  siteId: string;
  url: string;
  path: string;
  deviceType?: string | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  dateFrom: string;
  dateTo: string;
  clickCount: number;
  scrollSampleCount: number;
  engagementSampleCount: number;
  maxScrollDepth?: number | null;
  avgScrollDepth?: number | null;
  status: string;
  metadata?: {
    topClickedAreas?: Array<{ selector: string; count: number }>;
    scrollBands?: Array<{ depth: number; count: number; percentage: number }>;
    [key: string]: unknown;
  };
  site?: Pick<WebsiteAnalyticsSite, "id" | "name" | "domain">;
  createdAt: string;
}

export interface WebsiteHeatmapPoint {
  id: string;
  snapshotId: string;
  siteId: string;
  type: "CLICK" | "ENGAGEMENT" | "SCROLL" | string;
  x?: number | null;
  y?: number | null;
  normalizedX?: number | null;
  normalizedY?: number | null;
  value: number;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  selector?: string | null;
  createdAt: string;
}

export interface WebsiteSession {
  id: string;
  siteId: string;
  sessionKey: string;
  startedAt: string;
  endedAt?: string | null;
  durationMs?: number | null;
  entryUrl: string;
  exitUrl?: string | null;
  referrer?: string | null;
  country?: string | null;
  browser?: string | null;
  os?: string | null;
  device?: string | null;
  pageCount: number;
  eventCount: number;
  hasJsError: boolean;
  events?: WebsiteEvent[];
  behaviorSignals?: WebsiteBehaviorSignal[];
}

export interface WebsiteEvent {
  id: string;
  type: string;
  url: string;
  path?: string | null;
  title?: string | null;
  x?: number | null;
  y?: number | null;
  scrollY?: number | null;
  viewportWidth?: number | null;
  viewportHeight?: number | null;
  payload?: Record<string, unknown>;
  createdAt: string;
}

export interface WebsiteBehaviorSignal {
  id: string;
  siteId: string;
  sessionId: string;
  visitorId?: string | null;
  recordingId?: string | null;
  type: string;
  severity: string;
  url: string;
  path?: string | null;
  title?: string | null;
  selector?: string | null;
  message?: string | null;
  eventIds?: string[];
  firstSeenAt: string;
  lastSeenAt: string;
  metadata?: Record<string, unknown>;
  site?: Pick<WebsiteAnalyticsSite, "id" | "name" | "domain">;
  session?: Partial<WebsiteSession>;
}

export interface WebsiteIssueGroup {
  id: string;
  siteId: string;
  type: string;
  fingerprint: string;
  url?: string | null;
  path?: string | null;
  selector?: string | null;
  message?: string | null;
  severity: string;
  occurrenceCount: number;
  affectedSessionCount: number;
  affectedVisitorCount: number;
  firstSeenAt: string;
  lastSeenAt: string;
  status: string;
  metadata?: Record<string, unknown>;
  site?: Pick<WebsiteAnalyticsSite, "id" | "name" | "domain">;
  signals?: WebsiteBehaviorSignal[];
}

export async function getWebsiteAnalyticsSites(): Promise<WebsiteAnalyticsSite[]> {
  return data(await api.get("/website-analytics/sites")) || [];
}

export async function createWebsiteAnalyticsSite(payload: { name: string; domain: string }): Promise<WebsiteAnalyticsSite> {
  return data(await api.post("/website-analytics/sites", payload));
}

export async function updateWebsiteAnalyticsSite(id: string, payload: Partial<{ name: string; domain: string; isActive: boolean }>): Promise<WebsiteAnalyticsSite> {
  return data(await api.put(`/website-analytics/sites/${id}`, payload));
}

export async function getWebsiteAnalyticsSnippet(id: string): Promise<{ trackingKey: string; snippet: string }> {
  return data(await api.get(`/website-analytics/sites/${id}/snippet`));
}

export async function getWebsiteSessions(params?: { siteId?: string; limit?: number }): Promise<WebsiteSession[]> {
  return data(await api.get("/website-analytics/sessions", { params })) || [];
}

export async function getWebsiteSession(id: string): Promise<WebsiteSession> {
  return data(await api.get(`/website-analytics/sessions/${id}`));
}

export async function getWebsiteEvents(params?: { siteId?: string; sessionId?: string; type?: string; limit?: number }): Promise<WebsiteEvent[]> {
  return data(await api.get("/website-analytics/events", { params })) || [];
}

export async function getWebsiteRecordings(params?: Record<string, unknown>): Promise<WebsiteRecording[]> {
  return data(await api.get("/website-analytics/recordings", { params })) || [];
}

export async function getWebsiteRecording(id: string): Promise<WebsiteRecording> {
  return data(await api.get(`/website-analytics/recordings/${id}`));
}

export async function getWebsiteRecordingChunks(id: string): Promise<RecordingChunksResponse> {
  return data(await api.get(`/website-analytics/recordings/${id}/chunks`));
}

export async function setWebsiteRecordingFavorite(id: string, isFavorite: boolean): Promise<WebsiteRecording> {
  return data(await api.patch(`/website-analytics/recordings/${id}/favorite`, { isFavorite }));
}

export async function setWebsiteRecordingLabels(id: string, labels: string[]): Promise<WebsiteRecording> {
  return data(await api.patch(`/website-analytics/recordings/${id}/labels`, { labels }));
}

export async function shareWebsiteRecording(id: string): Promise<{ shareToken: string; shareEnabled: boolean }> {
  return data(await api.post(`/website-analytics/recordings/${id}/share`));
}

export async function disableWebsiteRecordingShare(id: string): Promise<WebsiteRecording> {
  return data(await api.delete(`/website-analytics/recordings/${id}/share`));
}

export async function getSharedWebsiteRecording(token: string): Promise<WebsiteRecording> {
  return data(await api.get(`/public/website-analytics/shared-recordings/${token}`));
}

export async function getSharedWebsiteRecordingChunks(token: string): Promise<RecordingChunksResponse> {
  return data(await api.get(`/public/website-analytics/shared-recordings/${token}/chunks`));
}

export async function getWebsiteHeatmaps(params?: Record<string, unknown>): Promise<WebsiteHeatmapSnapshot[]> {
  return data(await api.get("/website-analytics/heatmaps", { params })) || [];
}

export async function createWebsiteHeatmapSnapshot(payload: {
  siteId: string;
  url?: string;
  path?: string;
  deviceType?: string;
  dateFrom: string;
  dateTo: string;
}): Promise<WebsiteHeatmapSnapshot> {
  return data(await api.post("/website-analytics/heatmaps/snapshots", payload));
}

export async function getWebsiteHeatmapSnapshot(id: string): Promise<WebsiteHeatmapSnapshot> {
  return data(await api.get(`/website-analytics/heatmaps/snapshots/${id}`));
}

export async function getWebsiteHeatmapPoints(id: string, params?: { type?: string; limit?: number }): Promise<WebsiteHeatmapPoint[]> {
  return data(await api.get(`/website-analytics/heatmaps/snapshots/${id}/points`, { params })) || [];
}

export async function deleteWebsiteHeatmapSnapshot(id: string): Promise<void> {
  await api.delete(`/website-analytics/heatmaps/snapshots/${id}`);
}

export async function getWebsiteBehaviorSignals(params?: Record<string, unknown>): Promise<WebsiteBehaviorSignal[]> {
  return data(await api.get("/website-analytics/behavior/signals", { params })) || [];
}

export async function getWebsiteBehaviorSignal(id: string): Promise<WebsiteBehaviorSignal> {
  return data(await api.get(`/website-analytics/behavior/signals/${id}`));
}

export async function getWebsiteBehaviorIssues(params?: Record<string, unknown>): Promise<WebsiteIssueGroup[]> {
  return data(await api.get("/website-analytics/behavior/issues", { params })) || [];
}

export async function getWebsiteBehaviorIssue(id: string): Promise<WebsiteIssueGroup> {
  return data(await api.get(`/website-analytics/behavior/issues/${id}`));
}

export async function updateWebsiteBehaviorIssueStatus(id: string, status: "OPEN" | "IGNORED" | "RESOLVED"): Promise<WebsiteIssueGroup> {
  return data(await api.patch(`/website-analytics/behavior/issues/${id}/status`, { status }));
}

export async function analyzeWebsiteBehaviorSession(sessionId: string): Promise<{ sessionId: string; signalCount: number; signals: WebsiteBehaviorSignal[] }> {
  return data(await api.post(`/website-analytics/behavior/sessions/${sessionId}/analyze`));
}
