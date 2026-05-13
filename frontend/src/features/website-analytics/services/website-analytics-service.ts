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
  visitorId?: string | null;
  sessionId: string;
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
  tags?: WebsiteSessionTag[];
  recordings?: Array<{ id: string; status?: string }>;
  visitor?: { id: string; anonymousId: string; identity?: WebsiteVisitorIdentity | null };
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

export interface WebsiteAnalyticsSegment {
  id: string;
  siteId?: string | null;
  name: string;
  description?: string | null;
  filters: Record<string, unknown>;
  isDefault: boolean;
  isShared: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface WebsiteSessionTag {
  id: string;
  sessionId: string;
  visitorId?: string | null;
  name: string;
  color?: string | null;
  createdAt: string;
}

export interface WebsiteVisitorIdentity {
  id: string;
  visitorId: string;
  externalUserId?: string | null;
  emailHash?: string | null;
  traits?: Record<string, unknown>;
  firstIdentifiedAt: string;
  lastIdentifiedAt: string;
}

export interface WebsiteFilterOptions {
  countries: string[];
  browsers: string[];
  operatingSystems: string[];
  devices: string[];
  pages: string[];
  referrers: string[];
  tags: string[];
  labels: string[];
  customEvents: string[];
  behaviorTypes: string[];
}

export interface WebsiteFunnelStep {
  name: string;
  type: "page" | "custom_event" | "click" | "behavior_signal" | "tag" | "js_error" | string;
  operator: "contains" | "equals" | "exact" | "selector" | string;
  value?: string;
  withinMinutes?: number | null;
  required?: boolean;
}

export interface WebsiteFunnel {
  id: string;
  siteId: string;
  name: string;
  description?: string | null;
  steps: WebsiteFunnelStep[];
  segmentId?: string | null;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
  runs?: WebsiteFunnelRun[];
}

export interface WebsiteFunnelRun {
  id: string;
  funnelId: string;
  siteId: string;
  dateFrom: string;
  dateTo: string;
  totalEntrants: number;
  totalConversions: number;
  conversionRate: number;
  status: string;
  results?: {
    steps?: Array<{ index: number; name: string; entrants: number; dropOffs: number; conversions: number; avgTimeFromPreviousMs: number; medianTimeFromPreviousMs: number }>;
    convertedSessions?: string[];
    dropOffSessionsByStep?: Record<string, string[]>;
    topDropOffPages?: Array<{ page: string; count: number }>;
    [key: string]: unknown;
  };
  createdAt: string;
}

export interface WebsiteJourneyPath {
  id: string;
  siteId: string;
  sessionId?: string | null;
  visitorId?: string | null;
  pathHash: string;
  steps: Array<{ type: string; label: string; url?: string; path?: string; at?: string }>;
  stepCount: number;
  durationMs?: number | null;
  converted: boolean;
  conversionEvent?: string | null;
  createdAt: string;
  session?: WebsiteSession;
}

export interface WebsitePathAggregate {
  id: string;
  siteId: string;
  pathHash: string;
  steps: WebsiteJourneyPath["steps"];
  occurrenceCount: number;
  conversionCount: number;
  avgDurationMs?: number | null;
}

export interface WebsiteAiInsight {
  id: string;
  siteId?: string | null;
  type: string;
  title: string;
  summary: string;
  severity?: string | null;
  confidence?: number | null;
  sourceType?: string | null;
  sourceId?: string | null;
  evidence?: any;
  recommendations?: string[];
  status: string;
  createdAt: string;
}

export interface WebsiteAiConversation {
  id: string;
  siteId?: string | null;
  title?: string | null;
  filters?: Record<string, unknown>;
  createdAt: string;
  updatedAt: string;
  messages?: WebsiteAiMessage[];
}

export interface WebsiteAiMessage {
  id: string;
  conversationId: string;
  role: "USER" | "ASSISTANT" | "SYSTEM" | string;
  content: string;
  citations?: Array<{ type: string; id: string }>;
  metadata?: Record<string, unknown>;
  createdAt: string;
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

export async function getWebsiteSessions(params?: Record<string, unknown>): Promise<WebsiteSession[]> {
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

export async function getWebsiteAnalyticsSegments(params?: Record<string, unknown>): Promise<WebsiteAnalyticsSegment[]> {
  return data(await api.get("/website-analytics/segments", { params })) || [];
}

export async function createWebsiteAnalyticsSegment(payload: Partial<WebsiteAnalyticsSegment>): Promise<WebsiteAnalyticsSegment> {
  return data(await api.post("/website-analytics/segments", payload));
}

export async function updateWebsiteAnalyticsSegment(id: string, payload: Partial<WebsiteAnalyticsSegment>): Promise<WebsiteAnalyticsSegment> {
  return data(await api.put(`/website-analytics/segments/${id}`, payload));
}

export async function deleteWebsiteAnalyticsSegment(id: string): Promise<void> {
  await api.delete(`/website-analytics/segments/${id}`);
}

export async function getWebsiteFilterOptions(params?: Record<string, unknown>): Promise<WebsiteFilterOptions> {
  return data(await api.get("/website-analytics/filter-options", { params }));
}

export async function getWebsiteSessionTags(sessionId: string): Promise<WebsiteSessionTag[]> {
  return data(await api.get(`/website-analytics/sessions/${sessionId}/tags`)) || [];
}

export async function createWebsiteSessionTag(sessionId: string, payload: { name: string; color?: string }): Promise<WebsiteSessionTag> {
  return data(await api.post(`/website-analytics/sessions/${sessionId}/tags`, payload));
}

export async function deleteWebsiteSessionTag(sessionId: string, tagId: string): Promise<void> {
  await api.delete(`/website-analytics/sessions/${sessionId}/tags/${tagId}`);
}

export async function getWebsiteVisitorIdentity(visitorId: string): Promise<WebsiteVisitorIdentity | null> {
  return data(await api.get(`/website-analytics/visitors/${visitorId}/identity`));
}

export async function updateWebsiteVisitorIdentity(visitorId: string, payload: { externalUserId?: string; traits?: Record<string, unknown> }): Promise<WebsiteVisitorIdentity> {
  return data(await api.put(`/website-analytics/visitors/${visitorId}/identity`, payload));
}

export async function getWebsiteFunnels(params?: Record<string, unknown>): Promise<WebsiteFunnel[]> {
  return data(await api.get("/website-analytics/funnels", { params })) || [];
}

export async function createWebsiteFunnel(payload: Partial<WebsiteFunnel>): Promise<WebsiteFunnel> {
  return data(await api.post("/website-analytics/funnels", payload));
}

export async function updateWebsiteFunnel(id: string, payload: Partial<WebsiteFunnel>): Promise<WebsiteFunnel> {
  return data(await api.put(`/website-analytics/funnels/${id}`, payload));
}

export async function deleteWebsiteFunnel(id: string): Promise<void> {
  await api.delete(`/website-analytics/funnels/${id}`);
}

export async function runWebsiteFunnel(id: string, payload: Record<string, unknown>): Promise<WebsiteFunnelRun> {
  return data(await api.post(`/website-analytics/funnels/${id}/run`, payload));
}

export async function getWebsiteFunnelRuns(id: string): Promise<WebsiteFunnelRun[]> {
  return data(await api.get(`/website-analytics/funnels/${id}/runs`)) || [];
}

export async function getWebsiteFunnelRun(id: string): Promise<WebsiteFunnelRun> {
  return data(await api.get(`/website-analytics/funnel-runs/${id}`));
}

export async function getWebsiteFunnelRunSessions(id: string, params?: Record<string, unknown>): Promise<WebsiteSession[]> {
  return data(await api.get(`/website-analytics/funnel-runs/${id}/sessions`, { params })) || [];
}

export async function analyzeWebsiteJourneys(payload: Record<string, unknown>): Promise<{ siteId: string; analyzedSessions: number; pathCount: number }> {
  return data(await api.post("/website-analytics/journeys/analyze", payload));
}

export async function getWebsiteJourneyPaths(params?: Record<string, unknown>): Promise<WebsiteJourneyPath[]> {
  return data(await api.get("/website-analytics/journeys/paths", { params })) || [];
}

export async function getWebsiteJourneyPath(id: string): Promise<WebsiteJourneyPath> {
  return data(await api.get(`/website-analytics/journeys/paths/${id}`));
}

export async function getWebsiteJourneyAggregates(params?: Record<string, unknown>): Promise<WebsitePathAggregate[]> {
  return data(await api.get("/website-analytics/journeys/aggregates", { params })) || [];
}

export async function getWebsiteSessionJourney(sessionId: string): Promise<WebsiteJourneyPath> {
  return data(await api.get(`/website-analytics/journeys/sessions/${sessionId}`));
}

export async function getWebsiteAiInsights(params?: Record<string, unknown>): Promise<WebsiteAiInsight[]> {
  return data(await api.get("/website-analytics/ai/insights", { params })) || [];
}

export async function generateWebsiteAiInsight(payload: Record<string, unknown>): Promise<WebsiteAiInsight> {
  return data(await api.post("/website-analytics/ai/insights/generate", payload));
}

export async function updateWebsiteAiInsightStatus(id: string, status: "GENERATED" | "DISMISSED" | "ARCHIVED"): Promise<WebsiteAiInsight> {
  return data(await api.patch(`/website-analytics/ai/insights/${id}/status`, { status }));
}

export async function summarizeWebsiteAiSession(sessionId: string): Promise<WebsiteAiInsight> {
  return data(await api.post(`/website-analytics/ai/sessions/${sessionId}/summary`));
}

export async function summarizeWebsiteAiRecording(recordingId: string): Promise<WebsiteAiInsight> {
  return data(await api.post(`/website-analytics/ai/recordings/${recordingId}/summary`));
}

export async function getWebsiteAiConversations(params?: Record<string, unknown>): Promise<WebsiteAiConversation[]> {
  return data(await api.get("/website-analytics/ai/conversations", { params })) || [];
}

export async function createWebsiteAiConversation(payload: Record<string, unknown>): Promise<WebsiteAiConversation> {
  return data(await api.post("/website-analytics/ai/conversations", payload));
}

export async function getWebsiteAiMessages(conversationId: string): Promise<WebsiteAiMessage[]> {
  return data(await api.get(`/website-analytics/ai/conversations/${conversationId}/messages`)) || [];
}

export async function createWebsiteAiMessage(conversationId: string, payload: { content: string }): Promise<{ userMessage: WebsiteAiMessage; assistant: WebsiteAiMessage }> {
  return data(await api.post(`/website-analytics/ai/conversations/${conversationId}/messages`, payload));
}
