import crypto from 'crypto';
import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { recordingStorageService } from './recording-storage.service';

const db = prisma as any;
const MAX_EVENTS_PER_BATCH = 50;
const MAX_BODY_BYTES = 120_000;
const MAX_PAYLOAD_BYTES = 20_000;
const MAX_RRWEB_EVENTS_PER_CHUNK = 500;

function cleanString(value: unknown, max = 500): string | null {
  if (typeof value !== 'string') return null;
  const trimmed = value.trim();
  if (!trimmed) return null;
  return trimmed.slice(0, max);
}

function cleanDomain(value: unknown): string {
  const raw = cleanString(value, 253);
  if (!raw) throw new BadRequestError('Domain is required', ErrorCodes.VALIDATION_FAILED);
  const withoutProtocol = raw.replace(/^https?:\/\//i, '').replace(/^www\./i, '').split('/')[0].toLowerCase();
  if (!/^[a-z0-9.-]+\.[a-z]{2,}$/i.test(withoutProtocol)) {
    throw new BadRequestError('Enter a valid website domain', ErrorCodes.VALIDATION_FAILED);
  }
  return withoutProtocol;
}

function jsonSize(value: unknown) {
  try { return Buffer.byteLength(JSON.stringify(value || {}), 'utf8'); } catch { return MAX_PAYLOAD_BYTES + 1; }
}

function safePayload(value: unknown, fallback: Record<string, unknown> = {}) {
  if (!value || typeof value !== 'object') return fallback;
  if (jsonSize(value) > MAX_PAYLOAD_BYTES) return { truncated: true };
  return value as Record<string, unknown>;
}

function toInt(value: unknown): number | null {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.round(parsed) : null;
}

function trackingKey() {
  return `ys_${crypto.randomBytes(18).toString('base64url')}`;
}

function shareToken() {
  return crypto.randomBytes(24).toString('base64url');
}

function defaultPrivacySettings(input?: Record<string, unknown>) {
  return {
    maskInputs: true,
    recordingsEnabled: true,
    maskAllInputs: true,
    respectDoNotTrack: true,
    maskSelectors: [],
    blockSelectors: [],
    retentionDays: 30,
    ...(input || {}),
  };
}

function hashIp(ip: string | undefined) {
  if (!ip) return null;
  const salt = process.env.WEBSITE_ANALYTICS_IP_SALT || 'ys-website-analytics';
  return crypto.createHash('sha256').update(`${salt}:${ip}`).digest('hex');
}

function getClientIp(headers: Record<string, any>, remoteAddress?: string) {
  const forwarded = headers['x-forwarded-for'];
  if (typeof forwarded === 'string' && forwarded.trim()) return forwarded.split(',')[0].trim();
  return remoteAddress || null;
}

function parseUserAgent(userAgent: string | null) {
  const ua = userAgent || '';
  const browser = /Edg\//.test(ua) ? 'Edge'
    : /Chrome\//.test(ua) ? 'Chrome'
      : /Safari\//.test(ua) && /Version\//.test(ua) ? 'Safari'
        : /Firefox\//.test(ua) ? 'Firefox'
          : /MSIE|Trident/.test(ua) ? 'Internet Explorer'
            : null;
  const os = /Windows NT/.test(ua) ? 'Windows'
    : /Mac OS X/.test(ua) ? 'macOS'
      : /Android/.test(ua) ? 'Android'
        : /iPhone|iPad|iPod/.test(ua) ? 'iOS'
          : /Linux/.test(ua) ? 'Linux'
            : null;
  const device = /Mobi|Android|iPhone|iPod/i.test(ua) ? 'Mobile' : /iPad|Tablet/i.test(ua) ? 'Tablet' : 'Desktop';
  return { browser, os, device };
}

function duration(startedAt: Date, endedAt: Date) {
  return Math.max(0, endedAt.getTime() - startedAt.getTime());
}

function parseDate(value: unknown, field: string) {
  const date = value ? new Date(String(value)) : null;
  if (!date || Number.isNaN(date.getTime())) {
    throw new BadRequestError(`${field} is required`, ErrorCodes.VALIDATION_FAILED);
  }
  return date;
}

function normalizeRatio(value: number | null, total: number | null) {
  if (!value || !total || total <= 0) return null;
  return Math.max(0, Math.min(1, value / total));
}

function eventSelector(event: any) {
  const element = event?.payload?.element || {};
  const id = cleanString(element.id, 80);
  const className = cleanString(element.className, 120);
  const tag = cleanString(element.tagName, 40);
  if (id) return `#${id}`;
  if (className) return `.${className.split(/\s+/).filter(Boolean).slice(0, 2).join('.')}`;
  return tag;
}

function scrollDepth(event: any) {
  const payloadDepth = toInt(event?.payload?.depth);
  if (payloadDepth !== null) return Math.max(0, Math.min(100, payloadDepth));
  const scrollY = toInt(event?.scrollY);
  const docHeight = toInt(event?.payload?.documentHeight);
  const viewport = toInt(event?.viewportHeight);
  if (scrollY !== null && docHeight && viewport) {
    return Math.max(0, Math.min(100, Math.round(((scrollY + viewport) / docHeight) * 100)));
  }
  return null;
}

function eventTime(event: any) {
  return new Date(event.createdAt || event.payload?.clientTime || Date.now()).getTime();
}

function distance(a: any, b: any) {
  const ax = toInt(a.x) || 0;
  const ay = toInt(a.y) || 0;
  const bx = toInt(b.x) || 0;
  const by = toInt(b.y) || 0;
  return Math.sqrt((ax - bx) ** 2 + (ay - by) ** 2);
}

function fingerprint(parts: Array<unknown>) {
  return crypto.createHash('sha1').update(parts.map((part) => String(part || '')).join('|')).digest('hex');
}

function signalSeverity(type: string, countOrMs: number, hasError = false) {
  if (hasError) return 'HIGH';
  if (type === 'RAGE_CLICK') return countOrMs >= 6 ? 'HIGH' : countOrMs >= 4 ? 'MEDIUM' : 'LOW';
  if (type === 'QUICK_BACK') return countOrMs <= 1500 ? 'HIGH' : countOrMs <= 3000 ? 'MEDIUM' : 'LOW';
  if (type === 'EXCESSIVE_SCROLL') return countOrMs >= 8 ? 'HIGH' : countOrMs >= 5 ? 'MEDIUM' : 'LOW';
  if (type === 'JS_ERROR') return 'HIGH';
  if (type === 'BROKEN_INTERACTION') return 'HIGH';
  return 'MEDIUM';
}

export class WebsiteAnalyticsService {
  async listSites(tenantId: string) {
    const sites = await db.websiteAnalyticsSite.findMany({
      where: { tenantId },
      orderBy: { createdAt: 'desc' },
      include: {
        _count: { select: { sessions: true, visitors: true, events: true } },
      },
    });
    return Promise.all(sites.map((site: any) => this.withMetrics(site)));
  }

  async createSite(tenantId: string, data: Record<string, unknown>) {
    const name = cleanString(data.name, 120);
    if (!name) throw new BadRequestError('Website name is required', ErrorCodes.VALIDATION_FAILED);
    const domain = cleanDomain(data.domain);
    const site = await db.websiteAnalyticsSite.create({
      data: {
        tenantId,
        name,
        domain,
        trackingKey: trackingKey(),
        privacySettings: defaultPrivacySettings(safePayload(data.privacySettings)),
      },
    });
    return this.withMetrics(site);
  }

  async getSite(id: string, tenantId: string) {
    const site = await db.websiteAnalyticsSite.findFirst({ where: { id, tenantId } });
    if (!site) throw new NotFoundError('Website analytics site not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return this.withMetrics(site);
  }

  async updateSite(id: string, tenantId: string, data: Record<string, unknown>) {
    await this.getSite(id, tenantId);
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) {
      const name = cleanString(data.name, 120);
      if (!name) throw new BadRequestError('Website name is required', ErrorCodes.VALIDATION_FAILED);
      update.name = name;
    }
    if (data.domain !== undefined) update.domain = cleanDomain(data.domain);
    if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
    if (data.privacySettings !== undefined) {
      const current = await db.websiteAnalyticsSite.findFirst({ where: { id, tenantId }, select: { privacySettings: true } });
      update.privacySettings = defaultPrivacySettings({ ...(current?.privacySettings || {}), ...safePayload(data.privacySettings) });
    }
    const site = await db.websiteAnalyticsSite.update({ where: { id }, data: update });
    return this.withMetrics(site);
  }

  async deactivateSite(id: string, tenantId: string) {
    await this.getSite(id, tenantId);
    return db.websiteAnalyticsSite.update({ where: { id }, data: { isActive: false } });
  }

  async getSnippet(id: string, tenantId: string, apiHost?: string) {
    const site = await this.getSite(id, tenantId);
    const host = cleanString(apiHost, 300) || '';
    const base = host.replace(/\/$/, '') || 'https://salesapi.zodo.ca/api/v1';
    return {
      trackingKey: site.trackingKey,
      snippet: `<script async src="${base}/public/website-analytics/tracker.js" data-tracking-key="${site.trackingKey}"></script>`,
    };
  }

  async listSessions(tenantId: string, query: Record<string, unknown>) {
    const where: Record<string, unknown> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    const sessions = await db.websiteSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: { site: { select: { id: true, name: true, domain: true } }, visitor: true },
    });
    return sessions;
  }

  async getSession(id: string, tenantId: string) {
    const session = await db.websiteSession.findFirst({
      where: { id, tenantId },
      include: {
        site: { select: { id: true, name: true, domain: true } },
        visitor: true,
        events: { orderBy: { createdAt: 'asc' }, take: 500 },
      },
    });
    if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return session;
  }

  async listEvents(tenantId: string, query: Record<string, unknown>) {
    const where: Record<string, unknown> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.sessionId) where.sessionId = String(query.sessionId);
    if (query.type) where.type = String(query.type);
    return db.websiteEvent.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 200), 1000),
      include: { site: { select: { id: true, name: true, domain: true } } },
    });
  }

  async listHeatmaps(tenantId: string, query: Record<string, unknown>): Promise<any> {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.path) where.path = String(query.path);
    if (query.url) where.url = String(query.url);
    if (query.deviceType && query.deviceType !== 'all') where.deviceType = String(query.deviceType).toLowerCase();
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(String(query.dateFrom));
      if (query.dateTo) where.createdAt.lte = new Date(String(query.dateTo));
    }
    if (query.type) {
      where.points = { some: { type: String(query.type).toUpperCase() } };
    }
    return db.websiteHeatmapSnapshot.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: {
        site: { select: { id: true, name: true, domain: true } },
        _count: { select: { points: true } },
      },
    });
  }

  async createHeatmapSnapshot(tenantId: string, data: Record<string, unknown>): Promise<any> {
    const siteId = cleanString(data.siteId, 120);
    if (!siteId) throw new BadRequestError('siteId is required', ErrorCodes.VALIDATION_FAILED);
    const site = await db.websiteAnalyticsSite.findFirst({ where: { id: siteId, tenantId } });
    if (!site) throw new NotFoundError('Website analytics site not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const dateFrom = parseDate(data.dateFrom, 'dateFrom');
    const dateTo = parseDate(data.dateTo, 'dateTo');
    if (dateTo < dateFrom) throw new BadRequestError('dateTo must be after dateFrom', ErrorCodes.VALIDATION_FAILED);
    const path = cleanString(data.path, 1000) || this.pathFromUrl(cleanString(data.url, 2000)) || '/';
    const url = cleanString(data.url, 2000) || `${site.domain}${path}`;
    const deviceType = data.deviceType && String(data.deviceType) !== 'all' ? String(data.deviceType).toLowerCase() : null;

    const snapshot = await db.websiteHeatmapSnapshot.create({
      data: {
        tenantId,
        siteId: site.id,
        url,
        path,
        deviceType,
        dateFrom,
        dateTo,
        status: 'PROCESSING',
        metadata: safePayload(data.metadata),
      },
    });

    try {
      const aggregate = await this.aggregateHeatmapEvents(tenantId, site.id, snapshot.id, path, dateFrom, dateTo, deviceType);
      const ready = await db.websiteHeatmapSnapshot.update({
        where: { id: snapshot.id },
        data: {
          status: 'READY',
          clickCount: aggregate.clickCount,
          scrollSampleCount: aggregate.scrollSampleCount,
          engagementSampleCount: aggregate.engagementSampleCount,
          maxScrollDepth: aggregate.maxScrollDepth,
          avgScrollDepth: aggregate.avgScrollDepth,
          viewportWidth: aggregate.viewportWidth,
          viewportHeight: aggregate.viewportHeight,
          metadata: {
            topClickedAreas: aggregate.topClickedAreas,
            scrollBands: aggregate.scrollBands,
          },
        },
        include: { site: { select: { id: true, name: true, domain: true } }, _count: { select: { points: true } } },
      });
      return ready;
    } catch (error) {
      await db.websiteHeatmapSnapshot.update({ where: { id: snapshot.id }, data: { status: 'FAILED' } }).catch(() => null);
      throw error;
    }
  }

  async getHeatmapSnapshot(id: string, tenantId: string): Promise<any> {
    const snapshot = await db.websiteHeatmapSnapshot.findFirst({
      where: { id, tenantId },
      include: { site: { select: { id: true, name: true, domain: true } }, _count: { select: { points: true } } },
    });
    if (!snapshot) throw new NotFoundError('Heatmap snapshot not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return snapshot;
  }

  async getHeatmapPoints(id: string, tenantId: string, query: Record<string, unknown> = {}): Promise<any> {
    await this.getHeatmapSnapshot(id, tenantId);
    const where: Record<string, any> = { snapshotId: id, tenantId };
    if (query.type) where.type = String(query.type).toUpperCase();
    return db.websiteHeatmapPoint.findMany({
      where,
      orderBy: { createdAt: 'asc' },
      take: Math.min(Number(query.limit || 5000), 10000),
    });
  }

  async deleteHeatmapSnapshot(id: string, tenantId: string): Promise<any> {
    await this.getHeatmapSnapshot(id, tenantId);
    return db.websiteHeatmapSnapshot.delete({ where: { id } });
  }

  async listRecordings(tenantId: string, query: Record<string, unknown>) {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.isFavorite !== undefined) where.isFavorite = String(query.isFavorite) === 'true';
    if (query.label) where.labels = { array_contains: [String(query.label)] };
    if (query.minDuration || query.maxDuration) {
      where.durationMs = {};
      if (query.minDuration) where.durationMs.gte = Number(query.minDuration);
      if (query.maxDuration) where.durationMs.lte = Number(query.maxDuration);
    }
    if (query.startDate || query.endDate) {
      where.createdAt = {};
      if (query.startDate) where.createdAt.gte = new Date(String(query.startDate));
      if (query.endDate) where.createdAt.lte = new Date(String(query.endDate));
    }
    const sessionWhere: Record<string, unknown> = {};
    if (query.hasJsError !== undefined) sessionWhere.hasJsError = String(query.hasJsError) === 'true';
    if (query.browser) sessionWhere.browser = String(query.browser);
    if (query.device) sessionWhere.device = String(query.device);
    if (query.country) sessionWhere.country = String(query.country);
    if (Object.keys(sessionWhere).length) where.session = sessionWhere;

    return db.websiteRecording.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: {
        site: { select: { id: true, name: true, domain: true } },
        session: { select: { id: true, entryUrl: true, exitUrl: true, referrer: true, browser: true, os: true, device: true, country: true, hasJsError: true, pageCount: true, eventCount: true } },
        visitor: { select: { id: true, anonymousId: true } },
        _count: { select: { chunks: true } },
      },
    });
  }

  async getRecording(id: string, tenantId: string) {
    const recording = await db.websiteRecording.findFirst({
      where: { id, tenantId },
      include: {
        site: { select: { id: true, name: true, domain: true } },
        session: {
          include: {
            events: { orderBy: { createdAt: 'asc' }, take: 500 },
            behaviorSignals: { orderBy: { firstSeenAt: 'asc' }, take: 200 },
          },
        },
        visitor: true,
        chunks: { orderBy: { sequence: 'asc' }, select: { id: true, sequence: true, eventCount: true, sizeBytes: true, createdAt: true } },
      },
    });
    if (!recording) throw new NotFoundError('Recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return recording;
  }

  async getRecordingChunks(id: string, tenantId: string) {
    const recording = await db.websiteRecording.findFirst({
      where: { id, tenantId },
      include: { chunks: { orderBy: { sequence: 'asc' } } },
    });
    if (!recording) throw new NotFoundError('Recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const chunks = [];
    for (const chunk of recording.chunks) {
      chunks.push({ sequence: chunk.sequence, events: await recordingStorageService.readChunk(chunk.storagePath) });
    }
    return { recordingId: recording.id, chunks };
  }

  async setRecordingFavorite(id: string, tenantId: string, data: Record<string, unknown>) {
    await this.getRecording(id, tenantId);
    return db.websiteRecording.update({ where: { id }, data: { isFavorite: Boolean(data.isFavorite) } });
  }

  async setRecordingLabels(id: string, tenantId: string, data: Record<string, unknown>) {
    await this.getRecording(id, tenantId);
    const labels = Array.isArray(data.labels)
      ? data.labels.map((item) => cleanString(item, 40)).filter(Boolean).slice(0, 12)
      : [];
    return db.websiteRecording.update({ where: { id }, data: { labels } });
  }

  async enableRecordingShare(id: string, tenantId: string) {
    await this.getRecording(id, tenantId);
    const recording = await db.websiteRecording.update({
      where: { id },
      data: { shareEnabled: true, shareToken: shareToken() },
    });
    return { shareToken: recording.shareToken, shareEnabled: recording.shareEnabled };
  }

  async disableRecordingShare(id: string, tenantId: string) {
    await this.getRecording(id, tenantId);
    return db.websiteRecording.update({ where: { id }, data: { shareEnabled: false, shareToken: null } });
  }

  async getSharedRecording(token: string) {
    const recording = await db.websiteRecording.findFirst({
      where: { shareToken: token, shareEnabled: true },
      include: {
        site: { select: { id: true, name: true, domain: true } },
        session: { select: { entryUrl: true, exitUrl: true, browser: true, os: true, device: true, country: true, startedAt: true, endedAt: true, durationMs: true } },
      },
    });
    if (!recording) throw new NotFoundError('Shared recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return recording;
  }

  async getSharedRecordingChunks(token: string) {
    const recording = await db.websiteRecording.findFirst({
      where: { shareToken: token, shareEnabled: true },
      include: { chunks: { orderBy: { sequence: 'asc' } } },
    });
    if (!recording) throw new NotFoundError('Shared recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const chunks = [];
    for (const chunk of recording.chunks) {
      chunks.push({ sequence: chunk.sequence, events: await recordingStorageService.readChunk(chunk.storagePath) });
    }
    return { recordingId: recording.id, chunks };
  }

  async startRecording(data: Record<string, unknown>) {
    const site = await this.getActiveSite(data.trackingKey);
    const privacy = defaultPrivacySettings(site.privacySettings || {});
    if (privacy.recordingsEnabled === false) {
      throw new ForbiddenError('Recordings are disabled for this site', ErrorCodes.AUTH_TOKEN_INVALID);
    }
    const session = await this.getPublicSession(site, data.sessionKey);
    const existing = await db.websiteRecording.findFirst({
      where: { tenantId: site.tenantId, siteId: site.id, sessionId: session.id },
    });
    if (existing) return existing;
    return db.websiteRecording.create({
      data: {
        tenantId: site.tenantId,
        siteId: site.id,
        sessionId: session.id,
        visitorId: session.visitorId || null,
        status: 'RECORDING',
        startedAt: new Date(),
        metadata: safePayload(data.metadata),
      },
    });
  }

  async uploadRecordingChunk(data: Record<string, unknown>) {
    const site = await this.getActiveSite(data.trackingKey);
    const session = await this.getPublicSession(site, data.sessionKey);
    const recording = await db.websiteRecording.findFirst({
      where: { tenantId: site.tenantId, siteId: site.id, sessionId: session.id },
    });
    if (!recording) throw new NotFoundError('Recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (jsonSize(data) > recordingStorageService.maxChunkBytes) {
      throw new BadRequestError('Recording chunk payload is too large', ErrorCodes.VALIDATION_FAILED);
    }
    const sequence = Math.max(1, Number(data.sequence || 1));
    const events = Array.isArray(data.events) ? data.events.slice(0, MAX_RRWEB_EVENTS_PER_CHUNK) : [];
    if (!events.length) throw new BadRequestError('Recording chunk must include events', ErrorCodes.VALIDATION_FAILED);
    const stored = await recordingStorageService.writeChunk({
      tenantId: site.tenantId,
      siteId: site.id,
      sessionId: session.id,
      sequence,
      events,
    });
    const chunk = await db.websiteRecordingChunk.upsert({
      where: { recordingId_sequence: { recordingId: recording.id, sequence } },
      create: {
        tenantId: site.tenantId,
        recordingId: recording.id,
        sessionId: session.id,
        sequence,
        storagePath: stored.storagePath,
        checksum: stored.checksum,
        eventCount: events.length,
        sizeBytes: stored.sizeBytes,
      },
      update: {
        storagePath: stored.storagePath,
        checksum: stored.checksum,
        eventCount: events.length,
        sizeBytes: stored.sizeBytes,
      },
    });
    const totals = await db.websiteRecordingChunk.aggregate({
      where: { recordingId: recording.id },
      _sum: { eventCount: true, sizeBytes: true },
    });
    await db.websiteRecording.update({
      where: { id: recording.id },
      data: {
        eventCount: totals._sum.eventCount || events.length,
        sizeBytes: totals._sum.sizeBytes || stored.sizeBytes,
        status: 'RECORDING',
      },
    });
    return { recordingId: recording.id, chunkId: chunk.id, sequence, accepted: events.length };
  }

  async endRecording(data: Record<string, unknown>) {
    const site = await this.getActiveSite(data.trackingKey);
    const session = await this.getPublicSession(site, data.sessionKey);
    const recording = await db.websiteRecording.findFirst({
      where: { tenantId: site.tenantId, siteId: site.id, sessionId: session.id },
    });
    if (!recording) throw new NotFoundError('Recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const endedAt = new Date();
    const updated = await db.websiteRecording.update({
      where: { id: recording.id },
      data: {
        status: recording.eventCount > 0 ? 'READY' : 'FAILED',
        endedAt,
        durationMs: duration(recording.startedAt, endedAt),
      },
    });
    await this.analyzeSession(session.id, site.tenantId).catch(() => null);
    return updated;
  }

  async startSession(data: Record<string, unknown>, headers: Record<string, any> = {}, remoteAddress?: string) {
    const site = await this.getActiveSite(data.trackingKey);
    const anonymousId = this.requirePublicId(data.anonymousId, 'anonymousId');
    const sessionKey = this.requirePublicId(data.sessionKey || crypto.randomUUID(), 'sessionKey');
    const visitor = await this.upsertVisitor(site, anonymousId, data.metadata);
    const userAgent = cleanString(data.userAgent || headers['user-agent'], 1000);
    const parsed = parseUserAgent(userAgent);
    const entryUrl = cleanString(data.url || data.entryUrl, 2000) || 'unknown';
    const existingSession = await db.websiteSession.findUnique({ where: { sessionKey } });
    if (existingSession && existingSession.siteId !== site.id) {
      throw new ForbiddenError('Session key does not belong to this tracking site', ErrorCodes.AUTH_TOKEN_INVALID);
    }
    if (existingSession && existingSession.visitorId !== visitor.id) {
      throw new ForbiddenError('Session key does not belong to this visitor', ErrorCodes.AUTH_TOKEN_INVALID);
    }
    const sessionData = {
        tenantId: site.tenantId,
        siteId: site.id,
        visitorId: visitor.id,
        sessionKey,
        entryUrl,
        referrer: cleanString(data.referrer, 2000),
        userAgent,
        ipHash: hashIp(getClientIp(headers, remoteAddress) || undefined),
        browser: cleanString(data.browser, 80) || parsed.browser,
        os: cleanString(data.os, 80) || parsed.os,
        device: cleanString(data.device, 80) || parsed.device,
        country: cleanString(data.country, 80),
        metadata: safePayload(data.metadata),
    };
    const session = existingSession
      ? await db.websiteSession.update({
        where: { id: existingSession.id },
        data: {
        endedAt: null,
        userAgent,
        browser: cleanString(data.browser, 80) || parsed.browser,
        os: cleanString(data.os, 80) || parsed.os,
        device: cleanString(data.device, 80) || parsed.device,
      },
      })
      : await db.websiteSession.create({ data: sessionData });
    return {
      siteId: site.id,
      tenantId: site.tenantId,
      visitorId: visitor.id,
      sessionId: session.id,
      sessionKey,
      site: {
        id: site.id,
        privacySettings: defaultPrivacySettings(site.privacySettings || {}),
      },
    };
  }

  async endSession(data: Record<string, unknown>) {
    const site = await this.getActiveSite(data.trackingKey);
    const sessionKey = this.requirePublicId(data.sessionKey, 'sessionKey');
    const session = await db.websiteSession.findFirst({ where: { sessionKey, siteId: site.id } });
    if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const endedAt = new Date();
    const updated = await db.websiteSession.update({
      where: { id: session.id },
      data: {
        endedAt,
        durationMs: duration(session.startedAt, endedAt),
        exitUrl: cleanString(data.url || data.exitUrl, 2000) || session.exitUrl,
      },
    });
    await this.analyzeSession(session.id, site.tenantId).catch(() => null);
    return updated;
  }

  async collect(data: Record<string, unknown>, headers: Record<string, any> = {}, remoteAddress?: string) {
    if (jsonSize(data) > MAX_BODY_BYTES) throw new BadRequestError('Analytics payload is too large', ErrorCodes.VALIDATION_FAILED);
    const site = await this.getActiveSite(data.trackingKey);
    const anonymousId = this.requirePublicId(data.anonymousId, 'anonymousId');
    const sessionKey = this.requirePublicId(data.sessionKey, 'sessionKey');
    const visitor = await this.upsertVisitor(site, anonymousId, data.metadata);
    const sessionStart = await this.startSession({ ...data, anonymousId, sessionKey }, headers, remoteAddress);
    const session = await db.websiteSession.findUnique({ where: { id: sessionStart.sessionId } });
    const incoming = Array.isArray(data.events) ? data.events : [data];
    const events = incoming.slice(0, MAX_EVENTS_PER_BATCH).map((event: any) => this.normalizeEvent(event, site, sessionStart.sessionId, visitor.id));
    if (!events.length) return { accepted: 0 };
    await db.websiteEvent.createMany({ data: events });
    const pageViews = events.filter((event: any) => event.type === 'page_view').length;
    const hasJsError = events.some((event: any) => event.type === 'js_error' || event.type === 'unhandled_rejection');
    const lastUrl = events[events.length - 1]?.url;
    await db.websiteSession.update({
      where: { id: sessionStart.sessionId },
      data: {
        pageCount: { increment: pageViews },
        eventCount: { increment: events.length },
        hasJsError: hasJsError ? true : session?.hasJsError,
        exitUrl: lastUrl || session?.exitUrl,
      },
    });
    await db.websiteVisitor.update({ where: { id: visitor.id }, data: { lastSeenAt: new Date() } });
    if (events.some((event: any) => event.type === 'js_error' || event.type === 'unhandled_rejection')) {
      await this.analyzeSession(sessionStart.sessionId, site.tenantId).catch(() => null);
    }
    return { accepted: events.length, siteId: site.id, sessionId: sessionStart.sessionId };
  }

  async listBehaviorSignals(tenantId: string, query: Record<string, unknown>): Promise<any> {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.type) where.type = String(query.type).toUpperCase();
    if (query.severity) where.severity = String(query.severity).toUpperCase();
    if (query.path) where.path = String(query.path);
    if (query.url) where.url = String(query.url);
    if (query.startDate || query.endDate) {
      where.firstSeenAt = {};
      if (query.startDate) where.firstSeenAt.gte = new Date(String(query.startDate));
      if (query.endDate) where.firstSeenAt.lte = new Date(String(query.endDate));
    }
    const sessionWhere: Record<string, any> = {};
    if (query.browser) sessionWhere.browser = String(query.browser);
    if (query.device) sessionWhere.device = String(query.device);
    if (query.country) sessionWhere.country = String(query.country);
    if (Object.keys(sessionWhere).length) where.session = sessionWhere;
    if (query.hasRecording !== undefined) where.recordingId = String(query.hasRecording) === 'true' ? { not: null } : null;
    return db.websiteBehaviorSignal.findMany({
      where,
      orderBy: { firstSeenAt: 'desc' },
      take: Math.min(Number(query.limit || 200), 1000),
      include: { site: { select: { id: true, name: true, domain: true } }, session: { select: { browser: true, device: true, country: true, entryUrl: true } } },
    });
  }

  async getBehaviorSignal(id: string, tenantId: string): Promise<any> {
    const signal = await db.websiteBehaviorSignal.findFirst({
      where: { id, tenantId },
      include: { site: true, session: true, visitor: true },
    });
    if (!signal) throw new NotFoundError('Behavior signal not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return signal;
  }

  async listBehaviorIssues(tenantId: string, query: Record<string, unknown>): Promise<any> {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.type) where.type = String(query.type).toUpperCase();
    if (query.severity) where.severity = String(query.severity).toUpperCase();
    if (query.status) where.status = String(query.status).toUpperCase();
    if (query.path) where.path = String(query.path);
    if (query.url) where.url = String(query.url);
    if (query.startDate || query.endDate) {
      where.lastSeenAt = {};
      if (query.startDate) where.lastSeenAt.gte = new Date(String(query.startDate));
      if (query.endDate) where.lastSeenAt.lte = new Date(String(query.endDate));
    }
    return db.websiteIssueGroup.findMany({
      where,
      orderBy: { lastSeenAt: 'desc' },
      take: Math.min(Number(query.limit || 200), 1000),
      include: { site: { select: { id: true, name: true, domain: true } } },
    });
  }

  async getBehaviorIssue(id: string, tenantId: string): Promise<any> {
    const issue = await db.websiteIssueGroup.findFirst({ where: { id, tenantId }, include: { site: true } });
    if (!issue) throw new NotFoundError('Behavior issue not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const signals = await db.websiteBehaviorSignal.findMany({
      where: { tenantId, siteId: issue.siteId, type: issue.type, ...(issue.path ? { path: issue.path } : {}) },
      orderBy: { firstSeenAt: 'desc' },
      take: 100,
      include: { session: { select: { id: true, browser: true, device: true, country: true } } },
    });
    return { ...issue, signals };
  }

  async updateBehaviorIssueStatus(id: string, tenantId: string, data: Record<string, unknown>): Promise<any> {
    const status = cleanString(data.status, 20)?.toUpperCase();
    if (!status || !['OPEN', 'IGNORED', 'RESOLVED'].includes(status)) {
      throw new BadRequestError('Valid status is required', ErrorCodes.VALIDATION_FAILED);
    }
    await this.getBehaviorIssue(id, tenantId);
    return db.websiteIssueGroup.update({ where: { id }, data: { status } });
  }

  async analyzeSession(sessionId: string, tenantId: string): Promise<any> {
    const session = await db.websiteSession.findFirst({
      where: { id: sessionId, tenantId },
      include: {
        events: { orderBy: { createdAt: 'asc' }, take: 2000 },
        recordings: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
    if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const signals = this.detectSignals(session);
    const saved = [];
    for (const signal of signals) {
      saved.push(await this.upsertBehaviorSignal(session, signal));
    }
    return { sessionId, signalCount: saved.length, signals: saved };
  }

  trackerScript() {
    return TRACKER_SCRIPT;
  }

  async vendorScript() {
    const fs = await import('fs/promises');
    const path = await import('path');
    const vendorPath = path.join(process.cwd(), 'node_modules', 'rrweb', 'dist', 'record', 'rrweb-record.min.js');
    return fs.readFile(vendorPath, 'utf8');
  }

  private async withMetrics(site: any) {
    const [sessions, visitors, pageViews, errors, avg] = await Promise.all([
      db.websiteSession.count({ where: { tenantId: site.tenantId, siteId: site.id } }),
      db.websiteVisitor.count({ where: { tenantId: site.tenantId, siteId: site.id } }),
      db.websiteEvent.count({ where: { tenantId: site.tenantId, siteId: site.id, type: 'page_view' } }),
      db.websiteEvent.count({ where: { tenantId: site.tenantId, siteId: site.id, type: { in: ['js_error', 'unhandled_rejection'] } } }),
      db.websiteSession.aggregate({ where: { tenantId: site.tenantId, siteId: site.id, durationMs: { not: null } }, _avg: { durationMs: true } }),
    ]);
    return {
      ...site,
      metrics: {
        totalSessions: sessions,
        uniqueVisitors: visitors,
        pageViews,
        jsErrors: errors,
        averageDurationMs: Math.round(avg._avg.durationMs || 0),
      },
    };
  }

  private async getActiveSite(trackingKey: unknown) {
    const key = cleanString(trackingKey, 120);
    if (!key) throw new BadRequestError('trackingKey is required', ErrorCodes.VALIDATION_FAILED);
    const site = await db.websiteAnalyticsSite.findUnique({ where: { trackingKey: key } });
    if (!site) throw new ForbiddenError('Unknown tracking key', ErrorCodes.AUTH_TOKEN_INVALID);
    if (!site.isActive) throw new ForbiddenError('Tracking site is inactive', ErrorCodes.AUTH_TOKEN_INVALID);
    return site;
  }

  private pathFromUrl(url: string | null) {
    if (!url) return null;
    try {
      return new URL(url.startsWith('http') ? url : `https://${url}`).pathname || '/';
    } catch {
      return null;
    }
  }

  private async aggregateHeatmapEvents(
    tenantId: string,
    siteId: string,
    snapshotId: string,
    path: string,
    dateFrom: Date,
    dateTo: Date,
    deviceType: string | null
  ): Promise<any> {
    const events = await db.websiteEvent.findMany({
      where: {
        tenantId,
        siteId,
        path,
        createdAt: { gte: dateFrom, lte: dateTo },
        type: { in: ['click', 'scroll', 'mouse_move'] },
        ...(deviceType ? { session: { device: { equals: deviceType, mode: 'insensitive' } } } : {}),
      },
      include: { session: { select: { device: true } } },
      orderBy: { createdAt: 'asc' },
      take: 10000,
    });

    const points: any[] = [];
    const scrollDepths: number[] = [];
    const selectorCounts = new Map<string, number>();
    let viewportWidth: number | null = null;
    let viewportHeight: number | null = null;

    for (const event of events) {
      viewportWidth ||= event.viewportWidth || null;
      viewportHeight ||= event.viewportHeight || null;
      const blockedSelectors = event?.payload?.element?.blocked === true;
      if (blockedSelectors) continue;
      if (event.type === 'click' || event.type === 'mouse_move') {
        const x = toInt(event.x);
        const y = toInt(event.y);
        const width = toInt(event.viewportWidth);
        const height = toInt(event.viewportHeight);
        if (x === null || y === null) continue;
        const type = event.type === 'click' ? 'CLICK' : 'ENGAGEMENT';
        const selector = eventSelector(event);
        if (type === 'CLICK' && selector) selectorCounts.set(selector, (selectorCounts.get(selector) || 0) + 1);
        points.push({
          tenantId,
          snapshotId,
          siteId,
          type,
          x,
          y,
          normalizedX: normalizeRatio(x, width),
          normalizedY: normalizeRatio(y, height),
          value: type === 'CLICK' ? 1 : 0.5,
          viewportWidth: width,
          viewportHeight: height,
          selector,
          createdAt: event.createdAt,
        });
      }
      if (event.type === 'scroll') {
        const depth = scrollDepth(event);
        if (depth === null) continue;
        scrollDepths.push(depth);
        points.push({
          tenantId,
          snapshotId,
          siteId,
          type: 'SCROLL',
          x: null,
          y: null,
          normalizedX: null,
          normalizedY: depth / 100,
          value: depth,
          viewportWidth: toInt(event.viewportWidth),
          viewportHeight: toInt(event.viewportHeight),
          selector: null,
          createdAt: event.createdAt,
        });
      }
    }

    if (points.length) {
      await db.websiteHeatmapPoint.createMany({ data: points });
    }

    const clickCount = points.filter((point) => point.type === 'CLICK').length;
    const engagementSampleCount = points.filter((point) => point.type === 'ENGAGEMENT').length;
    const maxScrollDepth = scrollDepths.length ? Math.max(...scrollDepths) : null;
    const avgScrollDepth = scrollDepths.length ? Math.round((scrollDepths.reduce((sum, value) => sum + value, 0) / scrollDepths.length) * 100) / 100 : null;
    const scrollBands = [25, 50, 75, 100].map((band) => ({
      depth: band,
      count: scrollDepths.filter((value) => value >= band).length,
      percentage: scrollDepths.length ? Math.round((scrollDepths.filter((value) => value >= band).length / scrollDepths.length) * 100) : 0,
    }));
    const topClickedAreas = Array.from(selectorCounts.entries())
      .sort((left, right) => right[1] - left[1])
      .slice(0, 10)
      .map(([selector, count]) => ({ selector, count }));

    return {
      clickCount,
      scrollSampleCount: scrollDepths.length,
      engagementSampleCount,
      maxScrollDepth,
      avgScrollDepth,
      viewportWidth,
      viewportHeight,
      scrollBands,
      topClickedAreas,
    };
  }

  private async getPublicSession(site: any, sessionKeyValue: unknown) {
    const sessionKey = this.requirePublicId(sessionKeyValue, 'sessionKey');
    const session = await db.websiteSession.findFirst({ where: { sessionKey, tenantId: site.tenantId, siteId: site.id } });
    if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return session;
  }

  private requirePublicId(value: unknown, field: string) {
    const id = cleanString(value, 160);
    if (!id || !/^[a-zA-Z0-9._:-]{8,160}$/.test(id)) {
      throw new BadRequestError(`${field} is required`, ErrorCodes.VALIDATION_FAILED);
    }
    return id;
  }

  private async upsertVisitor(site: any, anonymousId: string, metadata: unknown) {
    return db.websiteVisitor.upsert({
      where: { siteId_anonymousId: { siteId: site.id, anonymousId } },
      create: {
        tenantId: site.tenantId,
        siteId: site.id,
        anonymousId,
        metadata: safePayload(metadata),
      },
      update: {
        lastSeenAt: new Date(),
        metadata: safePayload(metadata),
      },
    });
  }

  private normalizeEvent(event: Record<string, unknown>, site: any, sessionId: string, visitorId: string) {
    const type = cleanString(event.type, 80) || 'event';
    const url = cleanString(event.url, 2000) || 'unknown';
    return {
      tenantId: site.tenantId,
      siteId: site.id,
      sessionId,
      visitorId,
      type,
      url,
      path: cleanString(event.path, 1000),
      title: cleanString(event.title, 300),
      x: toInt(event.x),
      y: toInt(event.y),
      scrollY: toInt(event.scrollY),
      viewportWidth: toInt(event.viewportWidth),
      viewportHeight: toInt(event.viewportHeight),
      payload: safePayload(event.payload),
      createdAt: event.createdAt ? new Date(String(event.createdAt)) : (event.payload as any)?.clientTime ? new Date(String((event.payload as any).clientTime)) : new Date(),
    };
  }

  private detectSignals(session: any) {
    const events = (session.events || []).slice().sort((a: any, b: any) => eventTime(a) - eventTime(b));
    const signals: any[] = [];
    const clicks = events.filter((event: any) => event.type === 'click');
    const pageViews = events.filter((event: any) => event.type === 'page_view');
    const scrolls = events.filter((event: any) => event.type === 'scroll');
    const errors = events.filter((event: any) => event.type === 'js_error' || event.type === 'unhandled_rejection');

    for (let index = 0; index < clicks.length; index += 1) {
      const cluster = [clicks[index]];
      for (let next = index + 1; next < clicks.length; next += 1) {
        if (eventTime(clicks[next]) - eventTime(clicks[index]) > 2000) break;
        if (clicks[next].path === clicks[index].path && distance(clicks[next], clicks[index]) <= 40) cluster.push(clicks[next]);
      }
      if (cluster.length >= 3) {
        signals.push(this.makeSignal(session, 'RAGE_CLICK', signalSeverity('RAGE_CLICK', cluster.length), cluster, {
          selector: eventSelector(cluster[0]),
          message: `${cluster.length} rapid clicks detected`,
          metadata: { clickCount: cluster.length, radiusPx: 40 },
        }));
        index += cluster.length - 1;
      }
    }

    for (const click of clicks) {
      const selector = eventSelector(click) || '';
      const tag = String(click.payload?.element?.tagName || '').toLowerCase();
      if (['body', 'html', 'main', 'section', 'article', 'div'].includes(tag) && !selector.startsWith('#') && !selector.startsWith('.')) continue;
      const t = eventTime(click);
      const followUp = events.some((event: any) => eventTime(event) > t && eventTime(event) <= t + 2000 && ['page_view', 'form_submit', 'custom', 'navigation'].includes(event.type));
      if (!followUp) {
        signals.push(this.makeSignal(session, 'DEAD_CLICK', 'MEDIUM', [click], {
          selector,
          message: 'Click had no meaningful follow-up within 2 seconds',
        }));
      }
    }

    for (let index = 1; index < pageViews.length; index += 1) {
      const current = pageViews[index];
      const previous = pageViews[index - 1];
      const next = pageViews[index + 1];
      if (!next) continue;
      const delta = eventTime(next) - eventTime(current);
      if (delta <= 5000 && next.url === previous.url) {
        signals.push(this.makeSignal(session, 'QUICK_BACK', signalSeverity('QUICK_BACK', delta), [current, next], {
          message: 'Visitor returned to the previous page quickly',
          metadata: { durationMs: delta, previousUrl: previous.url },
        }));
      }
    }

    if (scrolls.length >= 5) {
      let directionChanges = 0;
      let lastDirection = 0;
      let totalDistance = 0;
      for (let index = 1; index < scrolls.length; index += 1) {
        const diff = (toInt(scrolls[index].scrollY) || 0) - (toInt(scrolls[index - 1].scrollY) || 0);
        totalDistance += Math.abs(diff);
        const direction = Math.sign(diff);
        if (direction && lastDirection && direction !== lastDirection) directionChanges += 1;
        if (direction) lastDirection = direction;
      }
      const hasClick = clicks.some((click: any) => eventTime(click) >= eventTime(scrolls[0]) && eventTime(click) <= eventTime(scrolls[scrolls.length - 1]));
      if (directionChanges >= 3 || (!hasClick && scrolls.length >= 5)) {
        signals.push(this.makeSignal(session, 'EXCESSIVE_SCROLL', signalSeverity('EXCESSIVE_SCROLL', scrolls.length), scrolls.slice(0, 12), {
          message: 'Repeated scrolling suggests the visitor could not find what they needed',
          metadata: { directionChanges, scrollEvents: scrolls.length, totalDistance },
        }));
      }
    }

    for (const error of errors) {
      signals.push(this.makeSignal(session, 'JS_ERROR', 'HIGH', [error], {
        message: cleanString(error.payload?.message || error.payload?.source || 'JavaScript error', 500),
        metadata: { source: error.payload?.source, line: error.payload?.line, column: error.payload?.column, stack: error.payload?.stack },
      }));
    }

    for (const click of clicks) {
      const t = eventTime(click);
      const nearError = errors.find((error: any) => eventTime(error) >= t && eventTime(error) <= t + 3000);
      if (nearError) {
        signals.push(this.makeSignal(session, 'BROKEN_INTERACTION', 'HIGH', [click, nearError], {
          selector: eventSelector(click),
          message: 'Click was followed by a JavaScript error',
          metadata: { reason: 'click_then_js_error' },
        }));
      }
    }

    const deadBySelector = signals.filter((signal) => signal.type === 'DEAD_CLICK').reduce((map: Map<string, any[]>, signal: any) => {
      const key = signal.selector || signal.path || 'unknown';
      map.set(key, [...(map.get(key) || []), signal]);
      return map;
    }, new Map<string, any[]>());
    for (const [selector, group] of deadBySelector.entries()) {
      if (group.length >= 2) {
        signals.push(this.makeSignal(session, 'BROKEN_INTERACTION', 'HIGH', group.flatMap((signal) => signal.events), {
          selector,
          message: 'Repeated dead clicks on the same element',
          metadata: { reason: 'repeated_dead_clicks', count: group.length },
        }));
      }
    }

    const unique = new Map<string, any>();
    for (const signal of signals) unique.set(signal.fingerprint, signal);
    return Array.from(unique.values());
  }

  private makeSignal(session: any, type: string, severity: string, events: any[], extra: any = {}) {
    const first = events[0];
    const last = events[events.length - 1] || first;
    const selector = extra.selector || eventSelector(first);
    const message = extra.message || null;
    const fp = fingerprint([type, session.id, first.path, selector, message, events.map((event: any) => event.id).join(',')]);
    return {
      fingerprint: fp,
      type,
      severity,
      url: first.url || session.entryUrl || 'unknown',
      path: first.path || null,
      title: first.title || null,
      selector,
      message,
      eventIds: events.map((event: any) => event.id).filter(Boolean),
      firstSeenAt: new Date(eventTime(first)),
      lastSeenAt: new Date(eventTime(last)),
      metadata: extra.metadata || {},
      events,
    };
  }

  private async upsertBehaviorSignal(session: any, signal: any) {
    const recording = session.recordings?.[0] || null;
    const existing = await db.websiteBehaviorSignal.findFirst({
      where: {
        tenantId: session.tenantId,
        siteId: session.siteId,
        sessionId: session.id,
        type: signal.type,
        eventIds: { equals: signal.eventIds },
      },
    });
    const data = {
      tenantId: session.tenantId,
      siteId: session.siteId,
      sessionId: session.id,
      visitorId: session.visitorId || null,
      recordingId: recording?.id || null,
      type: signal.type,
      severity: signal.severity,
      url: signal.url,
      path: signal.path,
      title: signal.title,
      selector: signal.selector,
      message: signal.message,
      eventIds: signal.eventIds,
      firstSeenAt: signal.firstSeenAt,
      lastSeenAt: signal.lastSeenAt,
      metadata: { ...signal.metadata, fingerprint: signal.fingerprint },
    };
    const saved = existing
      ? await db.websiteBehaviorSignal.update({ where: { id: existing.id }, data })
      : await db.websiteBehaviorSignal.create({ data });
    await this.upsertIssueGroup(session, signal);
    return saved;
  }

  private async upsertIssueGroup(session: any, signal: any) {
    const fp = fingerprint([signal.type, session.siteId, signal.path, signal.selector, signal.message]);
    const signals = await db.websiteBehaviorSignal.findMany({
      where: { tenantId: session.tenantId, siteId: session.siteId, type: signal.type, path: signal.path, ...(signal.selector ? { selector: signal.selector } : {}) },
      select: { sessionId: true, visitorId: true },
    });
    const sessionIds = new Set(signals.map((item: any) => item.sessionId).filter(Boolean));
    const visitorIds = new Set(signals.map((item: any) => item.visitorId).filter(Boolean));
    return db.websiteIssueGroup.upsert({
      where: { tenantId_siteId_fingerprint: { tenantId: session.tenantId, siteId: session.siteId, fingerprint: fp } },
      create: {
        tenantId: session.tenantId,
        siteId: session.siteId,
        type: signal.type,
        fingerprint: fp,
        url: signal.url,
        path: signal.path,
        selector: signal.selector,
        message: signal.message,
        severity: signal.severity,
        occurrenceCount: Math.max(1, signals.length),
        affectedSessionCount: Math.max(1, sessionIds.size),
        affectedVisitorCount: Math.max(0, visitorIds.size),
        firstSeenAt: signal.firstSeenAt,
        lastSeenAt: signal.lastSeenAt,
        status: 'OPEN',
        metadata: signal.metadata || {},
      },
      update: {
        severity: signal.severity,
        occurrenceCount: Math.max(1, signals.length),
        affectedSessionCount: Math.max(1, sessionIds.size),
        affectedVisitorCount: Math.max(0, visitorIds.size),
        lastSeenAt: signal.lastSeenAt,
        metadata: signal.metadata || {},
      },
    });
  }
}

const TRACKER_SCRIPT = `(function(){try{if(window.__YSAnalytics)return;window.__YSAnalytics=true;var s=document.currentScript;var key=s&&s.getAttribute("data-tracking-key");if(!key||localStorage.getItem("ys_analytics_opt_out")==="1")return;var base=(s&&s.src?s.src:"").replace(/\\/tracker\\.js.*$/,"");var anon=localStorage.getItem("ys_analytics_visitor");if(!anon){anon="v_"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("ys_analytics_visitor",anon)}var sk=sessionStorage.getItem("ys_analytics_session");if(!sk){sk="s_"+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem("ys_analytics_session",sk)}var q=[],rq=[],timer=null,rtimer=null,rseq=1,recording=false,recordingId=null,privacy={recordingsEnabled:true,maskAllInputs:true,respectDoNotTrack:true,maskSelectors:[],blockSelectors:[]};function post(url,payload,beacon){var body=JSON.stringify(payload);if(beacon&&navigator.sendBeacon){try{if(navigator.sendBeacon(url,new Blob([body],{type:"application/json"})))return Promise.resolve({})}catch(_){}}return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:!!beacon}).then(function(r){return r.json().catch(function(){return{}})}).catch(function(){return{}})}function meta(el){if(!el||!el.tagName)return{};var tag=String(el.tagName).toLowerCase();var safe=!/input|textarea|select/i.test(tag)&&!el.isContentEditable;var text=safe?(el.innerText||el.textContent||"").replace(/\\s+/g," ").trim().slice(0,80):"";return{tagName:tag,id:el.id||"",className:String(el.className||"").slice(0,160),role:el.getAttribute("role")||"",ariaLabel:el.getAttribute("aria-label")||"",text:text}}function device(){return /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent)?"Mobile":/iPad|Tablet/i.test(navigator.userAgent)?"Tablet":"Desktop"}function docH(){return Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,document.documentElement.offsetHeight,document.body.offsetHeight,innerHeight)}function common(e){return Object.assign({trackingKey:key,anonymousId:anon,sessionKey:sk,url:location.href,path:location.pathname,title:document.title,referrer:document.referrer,viewportWidth:innerWidth,viewportHeight:innerHeight,userAgent:navigator.userAgent,device:device()},e||{})}function send(events,beacon){if(!events.length)return;post(base+"/collect",common({events:events}),beacon)}function flush(){var batch=q.splice(0,50);send(batch,false);if(q.length)schedule()}function schedule(){if(timer)return;timer=setTimeout(function(){timer=null;flush()},1500)}function push(e){var now=new Date().toISOString();e=e||{};e.payload=Object.assign({clientTime:now},e.payload||{});q.push(Object.assign({createdAt:now},e));schedule()}function page(nav){push({type:"page_view",url:location.href,path:location.pathname,title:document.title,payload:{navigationType:nav||"load"}})}function flushRecording(beacon){if(!recording||!rq.length)return;var batch=rq.splice(0,300);post(base+"/recordings/chunk",common({recordingId:recordingId,sequence:rseq++,events:batch}),beacon)}function scheduleRecording(){if(rtimer)return;rtimer=setTimeout(function(){rtimer=null;flushRecording(false)},3000)}function loadScript(src,cb){var el=document.createElement("script");el.async=true;el.src=src;el.onload=cb;el.onerror=function(){};(document.head||document.documentElement).appendChild(el)}function startRecording(){if(recording||privacy.recordingsEnabled===false)return;if(privacy.respectDoNotTrack!==false&&(navigator.doNotTrack==="1"||window.doNotTrack==="1"))return;post(base+"/recordings/start",common({metadata:{source:"tracker"}}),false).then(function(res){recording=true;recordingId=res.data&&res.data.id||res.id||null;function begin(){if(!window.rrweb||!window.rrweb.record)return;window.rrweb.record({emit:function(ev){rq.push(ev);if(rq.length>=120)flushRecording(false);else scheduleRecording()},maskAllInputs:privacy.maskAllInputs!==false,maskInputOptions:{password:true,email:true,tel:true,text:privacy.maskAllInputs!==false},maskTextSelector:'[data-ys-mask],'+(privacy.maskSelectors||[]).join(','),blockSelector:'[data-ys-ignore],'+(privacy.blockSelectors||[]).join(',')})}if(window.rrweb&&window.rrweb.record)begin();else loadScript(base+"/vendor/rrweb-record.js",begin)})}post(base+"/session/start",common({url:location.href}),false).then(function(res){var site=res.data&&res.data.site||res.site;if(site&&site.privacySettings)privacy=Object.assign(privacy,site.privacySettings);startRecording()});page("load");["pushState","replaceState"].forEach(function(n){var o=history[n];history[n]=function(){var r=o.apply(this,arguments);setTimeout(function(){page("history")},0);return r}});addEventListener("popstate",function(){page("popstate")});addEventListener("click",function(e){push({type:"click",x:e.clientX,y:e.clientY,payload:{element:meta(e.target)}})},true);var lastScroll=0,lastScrollY=scrollY;addEventListener("scroll",function(){var now=Date.now();if(now-lastScroll<1200)return;var direction=scrollY>lastScrollY?"down":scrollY<lastScrollY?"up":"none";lastScrollY=scrollY;lastScroll=now;push({type:"scroll",scrollY:scrollY,payload:{depth:Math.round((scrollY+innerHeight)/Math.max(docH(),1)*100),documentHeight:docH(),direction:direction}})},{passive:true});var lastMove=0;addEventListener("mousemove",function(e){var now=Date.now();if(now-lastMove<2000)return;lastMove=now;push({type:"mouse_move",x:e.clientX,y:e.clientY,payload:{clientX:e.clientX,clientY:e.clientY}})},{passive:true});addEventListener("error",function(e){push({type:"js_error",payload:{message:String(e.message||"").slice(0,300),source:e.filename||"",line:e.lineno||0,column:e.colno||0,stack:String(e.error&&e.error.stack||"").slice(0,1000)}})});addEventListener("unhandledrejection",function(e){push({type:"unhandled_rejection",payload:{message:String(e.reason&&e.reason.message||e.reason||"").slice(0,300),stack:String(e.reason&&e.reason.stack||"").slice(0,1000)}})});function endAll(){send(q.splice(0,50),true);flushRecording(true);post(base+"/recordings/end",common({recordingId:recordingId}),true);post(base+"/session/end",common({url:location.href}),true)}addEventListener("pagehide",endAll);addEventListener("beforeunload",endAll)}catch(_){}})();`;

export const websiteAnalyticsService = new WebsiteAnalyticsService();
