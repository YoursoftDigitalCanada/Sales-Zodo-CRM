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
