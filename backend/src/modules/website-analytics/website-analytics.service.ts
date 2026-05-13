import crypto from 'crypto';
import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { encryptSecret, decryptSecret } from '../../common/utils/secret-crypto';
import { recordingStorageService } from './recording-storage.service';
import { llmAdapterService } from '../copilot/llm-adapter.service';
import { websiteAnalyticsLiveBroadcaster } from './live-broadcaster.service';

const db = prisma as any;
const MAX_EVENTS_PER_BATCH = 50;
const MAX_BODY_BYTES = 120_000;
const MAX_PAYLOAD_BYTES = 20_000;
const MAX_AI_CONTEXT_BYTES = 18_000;
const MAX_RRWEB_EVENTS_PER_CHUNK = 500;
const LIVE_ACTIVE_MS = 2 * 60 * 1000;
const DANGEROUS_KEYS = new Set(['__proto__', 'constructor', 'prototype']);

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

function safePublicPayload(value: unknown, maxKeys = 40) {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {};
  if (jsonSize(value) > MAX_PAYLOAD_BYTES) {
    throw new BadRequestError('Analytics payload is too large', ErrorCodes.VALIDATION_FAILED);
  }
  const output: Record<string, unknown> = {};
  for (const [key, rawValue] of Object.entries(value as Record<string, unknown>).slice(0, maxKeys)) {
    if (DANGEROUS_KEYS.has(key)) {
      throw new BadRequestError('Payload contains unsafe keys', ErrorCodes.VALIDATION_FAILED);
    }
    const safeKey = key.replace(/[^a-zA-Z0-9_.-]/g, '').slice(0, 80);
    if (!safeKey) continue;
    if (typeof rawValue === 'string') output[safeKey] = rawValue.slice(0, 500);
    else if (typeof rawValue === 'number' || typeof rawValue === 'boolean' || rawValue === null) output[safeKey] = rawValue;
    else if (typeof rawValue === 'object') output[safeKey] = safePayload(rawValue);
  }
  return output;
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
    trackingEnabled: true,
    consentMode: false,
    requireConsentForRecording: true,
    requireConsentForCookies: false,
    maskInputs: true,
    recordingsEnabled: true,
    heatmapsEnabled: true,
    aiProcessingEnabled: true,
    maskAllInputs: true,
    maskTextByDefault: false,
    respectDoNotTrack: true,
    maskSelectors: [],
    blockSelectors: [],
    allowedDomains: [],
    blockedCountries: [],
    dataRetentionDays: 30,
    recordingRetentionDays: 30,
    ipAnonymizationEnabled: true,
    piiRedactionEnabled: true,
    retentionDays: 30,
    ...(input || {}),
  };
}

function hostnameFromUrl(value: unknown) {
  const raw = cleanString(value, 2000);
  if (!raw) return null;
  try {
    return new URL(raw.startsWith('http') ? raw : `https://${raw}`).hostname.replace(/^www\./i, '').toLowerCase();
  } catch {
    return null;
  }
}

function validateWebhookUrl(value: unknown) {
  const raw = cleanString(value, 2000);
  if (!raw) throw new BadRequestError('Webhook URL is required', ErrorCodes.VALIDATION_FAILED);
  let parsed: URL;
  try { parsed = new URL(raw); } catch { throw new BadRequestError('Webhook URL is invalid', ErrorCodes.VALIDATION_FAILED); }
  if (!['http:', 'https:'].includes(parsed.protocol)) throw new BadRequestError('Webhook URL must use http or https', ErrorCodes.VALIDATION_FAILED);
  const host = parsed.hostname.toLowerCase();
  const isLocal = host === 'localhost' || host === '127.0.0.1' || host === '0.0.0.0' || host === '::1' || host.endsWith('.local');
  const isPrivate = /^10\./.test(host) || /^192\.168\./.test(host) || /^172\.(1[6-9]|2\d|3[0-1])\./.test(host) || /^169\.254\./.test(host);
  if ((isLocal || isPrivate) && process.env.WEBSITE_ANALYTICS_ALLOW_PRIVATE_WEBHOOKS !== 'true') {
    throw new BadRequestError('Private or local webhook URLs are not allowed', ErrorCodes.VALIDATION_FAILED);
  }
  return parsed.toString();
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

function stringArray(value: unknown) {
  if (Array.isArray(value)) return value.map((item) => cleanString(item, 100)).filter(Boolean) as string[];
  const item = cleanString(value, 100);
  return item ? [item] : [];
}

function dateRangeWhere(field: string, filters: Record<string, unknown>) {
  const range: Record<string, Date> = {};
  const from = filters.dateFrom || filters.startDate;
  const to = filters.dateTo || filters.endDate;
  if (from) range.gte = new Date(String(from));
  if (to) range.lte = new Date(String(to));
  return Object.keys(range).length ? { [field]: range } : {};
}

function hashEmail(value: unknown) {
  const email = cleanString(value, 320)?.toLowerCase();
  if (!email) return null;
  return crypto.createHash('sha256').update(email).digest('hex');
}

function average(values: number[]) {
  const nums = values.filter((value) => Number.isFinite(value));
  return nums.length ? Math.round(nums.reduce((sum, value) => sum + value, 0) / nums.length) : 0;
}

function median(values: number[]) {
  const nums = values.filter((value) => Number.isFinite(value)).sort((a, b) => a - b);
  if (!nums.length) return 0;
  const mid = Math.floor(nums.length / 2);
  return nums.length % 2 ? nums[mid] : Math.round((nums[mid - 1] + nums[mid]) / 2);
}

function redactPII(value: unknown): unknown {
  if (typeof value === 'string') {
    return value
      .replace(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/gi, '[redacted-email]')
      .replace(/(?:\+?\d[\d\s().-]{7,}\d)/g, '[redacted-phone]')
      .slice(0, 2000);
  }
  if (Array.isArray(value)) return value.slice(0, 100).map(redactPII);
  if (value && typeof value === 'object') {
    const output: Record<string, unknown> = {};
    for (const [key, item] of Object.entries(value as Record<string, unknown>).slice(0, 80)) {
      if (/email|phone|password|token|secret/i.test(key)) output[key] = '[redacted]';
      else output[key] = redactPII(item);
    }
    return output;
  }
  return value;
}

function compactJson(value: unknown, max = MAX_AI_CONTEXT_BYTES) {
  const redacted = redactPII(value);
  const text = JSON.stringify(redacted);
  return text.length > max ? text.slice(0, max) : text;
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

  async listSegments(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    return db.websiteAnalyticsSegment.findMany({
      where,
      orderBy: [{ isDefault: 'desc' }, { createdAt: 'desc' }],
      take: Math.min(Number(query.limit || 100), 500),
      include: { site: { select: { id: true, name: true, domain: true } } },
    });
  }

  async createSegment(tenantId: string, data: Record<string, unknown>, createdById?: string | null) {
    const name = cleanString(data.name, 120);
    if (!name) throw new BadRequestError('Segment name is required', ErrorCodes.VALIDATION_FAILED);
    const siteId = cleanString(data.siteId, 120);
    if (siteId) await this.getSite(siteId, tenantId);
    const segment = await db.websiteAnalyticsSegment.create({
      data: {
        tenantId,
        siteId,
        name,
        description: cleanString(data.description, 500),
        filters: safePublicPayload(data.filters || {}),
        isDefault: Boolean(data.isDefault),
        isShared: Boolean(data.isShared),
        createdById: createdById || cleanString(data.createdById, 120),
      },
    });
    if (segment.isDefault) await this.clearOtherDefaultSegments(tenantId, segment.id, siteId);
    return segment;
  }

  async getSegment(id: string, tenantId: string) {
    const segment = await db.websiteAnalyticsSegment.findFirst({ where: { id, tenantId }, include: { site: { select: { id: true, name: true, domain: true } } } });
    if (!segment) throw new NotFoundError('Website analytics segment not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return segment;
  }

  async updateSegment(id: string, tenantId: string, data: Record<string, unknown>) {
    await this.getSegment(id, tenantId);
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) {
      const name = cleanString(data.name, 120);
      if (!name) throw new BadRequestError('Segment name is required', ErrorCodes.VALIDATION_FAILED);
      update.name = name;
    }
    if (data.description !== undefined) update.description = cleanString(data.description, 500);
    if (data.filters !== undefined) update.filters = safePublicPayload(data.filters || {});
    if (data.isDefault !== undefined) update.isDefault = Boolean(data.isDefault);
    if (data.isShared !== undefined) update.isShared = Boolean(data.isShared);
    if (data.siteId !== undefined) {
      const siteId = cleanString(data.siteId, 120);
      if (siteId) await this.getSite(siteId, tenantId);
      update.siteId = siteId;
    }
    const segment = await db.websiteAnalyticsSegment.update({ where: { id }, data: update });
    if (segment.isDefault) await this.clearOtherDefaultSegments(tenantId, segment.id, segment.siteId);
    return segment;
  }

  async deleteSegment(id: string, tenantId: string) {
    await this.getSegment(id, tenantId);
    return db.websiteAnalyticsSegment.delete({ where: { id } });
  }

  async getFilterOptions(tenantId: string, query: Record<string, unknown> = {}) {
    const baseWhere: Record<string, any> = { tenantId, ...dateRangeWhere('startedAt', query) };
    if (query.siteId) baseWhere.siteId = String(query.siteId);
    const [sessions, events, tags, recordings, signals] = await Promise.all([
      db.websiteSession.findMany({ where: baseWhere, select: { country: true, browser: true, os: true, device: true, entryUrl: true, referrer: true }, take: 5000 }),
      db.websiteEvent.findMany({ where: { tenantId, ...(query.siteId ? { siteId: String(query.siteId) } : {}), ...dateRangeWhere('createdAt', query) }, select: { type: true, path: true, url: true, payload: true }, take: 5000 }),
      db.websiteSessionTag.findMany({ where: { tenantId, ...(query.siteId ? { siteId: String(query.siteId) } : {}) }, select: { name: true }, take: 1000 }),
      db.websiteRecording.findMany({ where: { tenantId, ...(query.siteId ? { siteId: String(query.siteId) } : {}) }, select: { labels: true }, take: 1000 }),
      db.websiteBehaviorSignal.findMany({ where: { tenantId, ...(query.siteId ? { siteId: String(query.siteId) } : {}) }, select: { type: true }, take: 1000 }),
    ]);
    const uniq = (items: Array<unknown>) => Array.from(new Set(items.filter(Boolean).map(String))).sort();
    return {
      countries: uniq(sessions.map((item: any) => item.country)),
      browsers: uniq(sessions.map((item: any) => item.browser)),
      operatingSystems: uniq(sessions.map((item: any) => item.os)),
      devices: uniq(sessions.map((item: any) => item.device)),
      pages: uniq(events.map((item: any) => item.path || this.pathFromUrl(item.url)).concat(sessions.map((item: any) => this.pathFromUrl(item.entryUrl)))),
      referrers: uniq(sessions.map((item: any) => item.referrer)),
      tags: uniq(tags.map((item: any) => item.name)),
      labels: uniq(recordings.flatMap((item: any) => Array.isArray(item.labels) ? item.labels : [])),
      customEvents: uniq(events.filter((item: any) => item.type === 'custom_event').map((item: any) => item.payload?.eventName)),
      behaviorTypes: uniq(signals.map((item: any) => item.type)),
    };
  }

  async listFunnels(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    return db.websiteFunnel.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: { site: { select: { id: true, name: true, domain: true } }, runs: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async createFunnel(tenantId: string, data: Record<string, unknown>, createdById?: string | null) {
    const siteId = cleanString(data.siteId, 120);
    if (!siteId) throw new BadRequestError('siteId is required', ErrorCodes.VALIDATION_FAILED);
    await this.getSite(siteId, tenantId);
    const name = cleanString(data.name, 120);
    if (!name) throw new BadRequestError('Funnel name is required', ErrorCodes.VALIDATION_FAILED);
    const steps = this.validateFunnelSteps(data.steps);
    const funnel = await db.websiteFunnel.create({
      data: {
        tenantId,
        siteId,
        name,
        description: cleanString(data.description, 500),
        steps,
        segmentId: cleanString(data.segmentId, 120),
        isActive: data.isActive === undefined ? true : Boolean(data.isActive),
        createdById: createdById || cleanString(data.createdById, 120),
      },
    });
    return funnel;
  }

  async getFunnel(id: string, tenantId: string) {
    const funnel = await db.websiteFunnel.findFirst({
      where: { id, tenantId },
      include: { site: { select: { id: true, name: true, domain: true } }, runs: { orderBy: { createdAt: 'desc' }, take: 5 } },
    });
    if (!funnel) throw new NotFoundError('Website funnel not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return funnel;
  }

  async updateFunnel(id: string, tenantId: string, data: Record<string, unknown>) {
    await this.getFunnel(id, tenantId);
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) {
      const name = cleanString(data.name, 120);
      if (!name) throw new BadRequestError('Funnel name is required', ErrorCodes.VALIDATION_FAILED);
      update.name = name;
    }
    if (data.description !== undefined) update.description = cleanString(data.description, 500);
    if (data.steps !== undefined) update.steps = this.validateFunnelSteps(data.steps);
    if (data.segmentId !== undefined) update.segmentId = cleanString(data.segmentId, 120);
    if (data.isActive !== undefined) update.isActive = Boolean(data.isActive);
    return db.websiteFunnel.update({ where: { id }, data: update });
  }

  async deleteFunnel(id: string, tenantId: string) {
    await this.getFunnel(id, tenantId);
    return db.websiteFunnel.delete({ where: { id } });
  }

  async runFunnel(id: string, tenantId: string, data: Record<string, unknown> = {}) {
    const funnel = await this.getFunnel(id, tenantId);
    const dateFrom = data.dateFrom ? new Date(String(data.dateFrom)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = data.dateTo ? new Date(String(data.dateTo)) : new Date();
    if (Number.isNaN(dateFrom.getTime()) || Number.isNaN(dateTo.getTime()) || dateTo < dateFrom) {
      throw new BadRequestError('Valid date range is required', ErrorCodes.VALIDATION_FAILED);
    }
    const segmentFilters = await this.resolveFunnelFilters(tenantId, funnel, data);
    const run = await db.websiteFunnelRun.create({
      data: { tenantId, funnelId: funnel.id, siteId: funnel.siteId, dateFrom, dateTo, segmentFilters, status: 'PROCESSING' },
    });
    try {
      const sessions = await this.loadFunnelSessions(tenantId, funnel.siteId, dateFrom, dateTo, segmentFilters);
      const results = this.analyzeFunnelSessions(funnel.steps || [], sessions);
      return db.websiteFunnelRun.update({
        where: { id: run.id },
        data: {
          status: 'READY',
          totalEntrants: results.totalEntrants,
          totalConversions: results.totalConversions,
          conversionRate: results.conversionRate,
          results,
        },
      });
    } catch (error) {
      await db.websiteFunnelRun.update({ where: { id: run.id }, data: { status: 'FAILED', results: { error: error instanceof Error ? error.message : 'Funnel analysis failed' } } }).catch(() => null);
      throw error;
    }
  }

  async listFunnelRuns(id: string, tenantId: string) {
    await this.getFunnel(id, tenantId);
    return db.websiteFunnelRun.findMany({ where: { tenantId, funnelId: id }, orderBy: { createdAt: 'desc' }, take: 100 });
  }

  async getFunnelRun(id: string, tenantId: string) {
    const run = await db.websiteFunnelRun.findFirst({ where: { id, tenantId }, include: { funnel: true, site: { select: { id: true, name: true, domain: true } } } });
    if (!run) throw new NotFoundError('Website funnel run not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return run;
  }

  async listFunnelRunSessions(id: string, tenantId: string, query: Record<string, unknown> = {}) {
    const run = await this.getFunnelRun(id, tenantId);
    const results = run.results || {};
    let ids = String(query.converted) === 'true'
      ? (results.convertedSessions || [])
      : String(query.droppedOff) === 'true'
        ? Object.values(results.dropOffSessionsByStep || {}).flat()
        : [...(results.convertedSessions || []), ...Object.values(results.dropOffSessionsByStep || {}).flat()];
    if (query.stepIndex !== undefined) ids = (results.dropOffSessionsByStep || {})[String(query.stepIndex)] || [];
    ids = Array.from(new Set(ids)).slice(0, 200);
    if (!ids.length) return [];
    return db.websiteSession.findMany({
      where: { tenantId, siteId: run.siteId, id: { in: ids } },
      include: { recordings: { select: { id: true, status: true }, take: 1 }, visitor: { include: { identity: true } }, tags: true },
      orderBy: { startedAt: 'desc' },
    });
  }

  async analyzeJourneys(tenantId: string, data: Record<string, unknown> = {}) {
    const siteId = cleanString(data.siteId, 120);
    if (!siteId) throw new BadRequestError('siteId is required', ErrorCodes.VALIDATION_FAILED);
    await this.getSite(siteId, tenantId);
    const dateFrom = data.dateFrom ? new Date(String(data.dateFrom)) : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    const dateTo = data.dateTo ? new Date(String(data.dateTo)) : new Date();
    const filters = await this.resolveFilters(tenantId, { ...data, siteId, dateFrom: dateFrom.toISOString(), dateTo: dateTo.toISOString() });
    const where = this.buildSessionWhere(tenantId, filters);
    const sessions = await db.websiteSession.findMany({
      where,
      include: { events: { orderBy: { createdAt: 'asc' }, take: 1000 }, behaviorSignals: true },
      orderBy: { startedAt: 'asc' },
      take: Math.min(Number(data.limit || 500), 2000),
    });
    const paths = [];
    for (const session of sessions) {
      const path = this.extractJourneyPath(session);
      if (!path.steps.length) continue;
      const saved = await this.upsertJourneyPath(tenantId, siteId, session, path);
      paths.push(saved);
    }
    await this.aggregateJourneyPaths(tenantId, siteId, paths, dateFrom, dateTo);
    return { siteId, analyzedSessions: sessions.length, pathCount: paths.length };
  }

  async listJourneyPaths(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.converted !== undefined) where.converted = this.booleanFilter(query.converted);
    if (query.minStepCount) where.stepCount = { gte: Number(query.minStepCount) };
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(String(query.dateFrom));
      if (query.dateTo) where.createdAt.lte = new Date(String(query.dateTo));
    }
    return db.websiteJourneyPath.findMany({ where, orderBy: { createdAt: 'desc' }, take: Math.min(Number(query.limit || 100), 500) });
  }

  async getJourneyPath(id: string, tenantId: string) {
    const path = await db.websiteJourneyPath.findFirst({ where: { id, tenantId }, include: { session: { include: { behaviorSignals: true, recordings: { take: 1 } } }, visitor: { include: { identity: true } } } });
    if (!path) throw new NotFoundError('Website journey path not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return path;
  }

  async listJourneyAggregates(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    return db.websitePathAggregate.findMany({ where, orderBy: { occurrenceCount: 'desc' }, take: Math.min(Number(query.limit || 100), 500) });
  }

  async getSessionJourney(sessionId: string, tenantId: string) {
    const session = await this.getSession(sessionId, tenantId);
    const existing = await db.websiteJourneyPath.findFirst({ where: { tenantId, sessionId }, orderBy: { createdAt: 'desc' } });
    if (existing) return existing;
    const hydrated = await db.websiteSession.findFirst({ where: { id: session.id, tenantId }, include: { events: { orderBy: { createdAt: 'asc' } }, behaviorSignals: true } });
    if (!hydrated) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return this.upsertJourneyPath(tenantId, session.siteId, hydrated, this.extractJourneyPath(hydrated));
  }

  async listAiInsights(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, any> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.type) where.type = String(query.type).toUpperCase();
    if (query.severity) where.severity = String(query.severity).toUpperCase();
    if (query.status) where.status = String(query.status).toUpperCase();
    if (query.sourceType) where.sourceType = String(query.sourceType).toUpperCase();
    if (query.sourceId) where.sourceId = String(query.sourceId);
    if (query.dateFrom || query.dateTo) {
      where.createdAt = {};
      if (query.dateFrom) where.createdAt.gte = new Date(String(query.dateFrom));
      if (query.dateTo) where.createdAt.lte = new Date(String(query.dateTo));
    }
    return db.websiteAiInsight.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: { site: { select: { id: true, name: true, domain: true } } },
    });
  }

  async generateAiInsight(tenantId: string, data: Record<string, unknown> = {}, createdById?: string | null) {
    const type = cleanString(data.type, 60)?.toUpperCase() || 'RECOMMENDATION';
    const sourceType = cleanString(data.sourceType, 60)?.toUpperCase() || null;
    const sourceId = cleanString(data.sourceId, 120);
    const siteId = cleanString(data.siteId, 120);
    if (siteId) await this.getSite(siteId, tenantId);
    const context = await this.buildAiContext(tenantId, { ...data, siteId, sourceType, sourceId });
    const ai = await this.generateAiText(type, context, String(data.prompt || 'Generate concise analytics insights and recommendations.'));
    const parsed = this.parseAiInsight(ai, type, context);
    return db.websiteAiInsight.create({
      data: {
        tenantId,
        siteId: context.siteId || siteId || null,
        type,
        title: parsed.title,
        summary: parsed.summary,
        severity: parsed.severity,
        confidence: parsed.confidence,
        sourceType,
        sourceId,
        filters: safePublicPayload(data.filters || {}),
        evidence: context.citations,
        recommendations: parsed.recommendations,
        status: 'GENERATED',
        createdById: createdById || cleanString(data.createdById, 120),
      },
    });
  }

  async getAiInsight(id: string, tenantId: string) {
    const insight = await db.websiteAiInsight.findFirst({ where: { id, tenantId }, include: { site: { select: { id: true, name: true, domain: true } } } });
    if (!insight) throw new NotFoundError('Website AI insight not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return insight;
  }

  async updateAiInsightStatus(id: string, tenantId: string, data: Record<string, unknown>) {
    await this.getAiInsight(id, tenantId);
    const status = cleanString(data.status, 20)?.toUpperCase();
    if (!status || !['GENERATED', 'DISMISSED', 'ARCHIVED'].includes(status)) throw new BadRequestError('Valid AI insight status is required', ErrorCodes.VALIDATION_FAILED);
    return db.websiteAiInsight.update({ where: { id }, data: { status } });
  }

  async summarizeAiSession(sessionId: string, tenantId: string, createdById?: string | null) {
    await this.getSession(sessionId, tenantId);
    return this.generateAiInsight(tenantId, { type: 'SESSION_SUMMARY', sourceType: 'SESSION', sourceId: sessionId }, createdById);
  }

  async summarizeAiRecording(recordingId: string, tenantId: string, createdById?: string | null) {
    const recording = await this.getRecording(recordingId, tenantId);
    return this.generateAiInsight(tenantId, { type: 'RECORDING_SUMMARY', sourceType: 'RECORDING', sourceId: recordingId, siteId: recording.siteId }, createdById);
  }

  async listAiConversations(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    return db.websiteAiConversation.findMany({
      where,
      orderBy: { updatedAt: 'desc' },
      take: Math.min(Number(query.limit || 50), 200),
      include: { messages: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
  }

  async createAiConversation(tenantId: string, data: Record<string, unknown> = {}, createdById?: string | null) {
    const siteId = cleanString(data.siteId, 120);
    if (siteId) await this.getSite(siteId, tenantId);
    return db.websiteAiConversation.create({
      data: {
        tenantId,
        siteId,
        title: cleanString(data.title, 160) || 'Website analytics chat',
        filters: safePublicPayload(data.filters || {}),
        createdById: createdById || cleanString(data.createdById, 120),
      },
    });
  }

  async listAiMessages(conversationId: string, tenantId: string) {
    await this.getAiConversation(conversationId, tenantId);
    return db.websiteAiMessage.findMany({ where: { tenantId, conversationId }, orderBy: { createdAt: 'asc' }, take: 200 });
  }

  async createAiMessage(conversationId: string, tenantId: string, data: Record<string, unknown> = {}) {
    const conversation = await this.getAiConversation(conversationId, tenantId);
    const content = cleanString(data.content || data.message, 4000);
    if (!content) throw new BadRequestError('Message content is required', ErrorCodes.VALIDATION_FAILED);
    const userMessage = await db.websiteAiMessage.create({ data: { tenantId, conversationId, role: 'USER', content } });
    const context = await this.buildAiContext(tenantId, { siteId: conversation.siteId, filters: conversation.filters, prompt: content });
    const history = await db.websiteAiMessage.findMany({ where: { tenantId, conversationId }, orderBy: { createdAt: 'asc' }, take: 12 });
    const ai = await llmAdapterService.generate({
      systemPrompt: this.aiSystemPrompt(),
      userMessage: content,
      contextSummary: compactJson(context),
      history: history.map((msg: any) => ({ role: msg.role === 'ASSISTANT' ? 'assistant' : 'user', content: msg.content })),
      maxTokens: 800,
      temperature: 0.25,
    });
    const fallback = this.deterministicAiAnswer(content, context);
    const assistant = await db.websiteAiMessage.create({
      data: {
        tenantId,
        conversationId,
        role: 'ASSISTANT',
        content: ai?.text || fallback,
        citations: context.citations,
        metadata: { aiAvailable: llmAdapterService.isAvailable(), model: ai?.model || 'deterministic' },
      },
    });
    await db.websiteAiConversation.update({ where: { id: conversationId }, data: { updatedAt: new Date(), title: conversation.title || content.slice(0, 80) } }).catch(() => null);
    return { userMessage, assistant };
  }

  async listIntegrations(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, unknown> = { tenantId };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.provider) where.provider = String(query.provider).toUpperCase();
    return db.websiteAnalyticsIntegration.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: { site: { select: { id: true, name: true, domain: true } } },
    });
  }

  async createIntegration(tenantId: string, data: Record<string, unknown>, createdById?: string | null) {
    const provider = cleanString(data.provider, 60)?.toUpperCase();
    if (!provider) throw new BadRequestError('Integration provider is required', ErrorCodes.VALIDATION_FAILED);
    const name = cleanString(data.name, 120) || provider.replace(/_/g, ' ');
    const siteId = cleanString(data.siteId, 120);
    if (siteId) await this.getSite(siteId, tenantId);
    const config = this.normalizeIntegrationConfig(provider, data.config || {});
    const secretConfig = this.normalizeSecretConfig(data.secretConfig || {});
    return db.websiteAnalyticsIntegration.create({
      data: { tenantId, siteId, provider, name, status: 'DISCONNECTED', config, secretConfig, createdById: createdById || cleanString(data.createdById, 120) },
    });
  }

  async getIntegration(id: string, tenantId: string) {
    const integration = await db.websiteAnalyticsIntegration.findFirst({ where: { id, tenantId }, include: { site: { select: { id: true, name: true, domain: true } } } });
    if (!integration) throw new NotFoundError('Website analytics integration not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return integration;
  }

  async updateIntegration(id: string, tenantId: string, data: Record<string, unknown>) {
    const existing = await this.getIntegration(id, tenantId);
    const update: Record<string, unknown> = {};
    if (data.name !== undefined) update.name = cleanString(data.name, 120) || existing.name;
    if (data.status !== undefined) update.status = cleanString(data.status, 30)?.toUpperCase() || existing.status;
    if (data.siteId !== undefined) {
      const siteId = cleanString(data.siteId, 120);
      if (siteId) await this.getSite(siteId, tenantId);
      update.siteId = siteId;
    }
    if (data.config !== undefined) update.config = this.normalizeIntegrationConfig(existing.provider, data.config || {});
    if (data.secretConfig !== undefined) update.secretConfig = this.normalizeSecretConfig(data.secretConfig || {});
    return db.websiteAnalyticsIntegration.update({ where: { id }, data: update });
  }

  async deleteIntegration(id: string, tenantId: string) {
    await this.getIntegration(id, tenantId);
    return db.websiteAnalyticsIntegration.delete({ where: { id } });
  }

  async listIntegrationDeliveries(id: string, tenantId: string, query: Record<string, unknown> = {}) {
    await this.getIntegration(id, tenantId);
    return db.websiteAnalyticsWebhookDelivery.findMany({
      where: { tenantId, integrationId: id },
      orderBy: { createdAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
    });
  }

  async testIntegration(id: string, tenantId: string) {
    const integration = await this.getIntegration(id, tenantId);
    const delivery = await this.createWebhookDelivery(integration, 'integration.test', { test: true, at: new Date().toISOString() });
    return this.dispatchWebhookDelivery(integration, delivery);
  }

  async exportVisitor(tenantId: string, data: Record<string, unknown>) {
    const visitor = await this.findVisitorForPrivacy(tenantId, data);
    const [sessions, events, recordings, tags, identity] = await Promise.all([
      db.websiteSession.findMany({ where: { tenantId, visitorId: visitor.id }, take: 1000 }),
      db.websiteEvent.findMany({ where: { tenantId, visitorId: visitor.id }, take: 5000 }),
      db.websiteRecording.findMany({ where: { tenantId, visitorId: visitor.id }, select: { id: true, siteId: true, sessionId: true, status: true, eventCount: true, durationMs: true, startedAt: true, endedAt: true, sizeBytes: true, labels: true }, take: 1000 }),
      db.websiteSessionTag.findMany({ where: { tenantId, visitorId: visitor.id }, take: 1000 }),
      db.websiteVisitorIdentity.findFirst({ where: { tenantId, visitorId: visitor.id } }),
    ]);
    return { visitor, identity, sessions, events, recordings, tags, exportedAt: new Date().toISOString() };
  }

  async deleteVisitor(tenantId: string, data: Record<string, unknown>) {
    const visitor = await this.findVisitorForPrivacy(tenantId, data);
    const recordings = await db.websiteRecording.findMany({ where: { tenantId, visitorId: visitor.id }, include: { chunks: true } });
    for (const recording of recordings) {
      for (const chunk of recording.chunks || []) await recordingStorageService.deleteChunk(chunk.storagePath).catch(() => null);
    }
    const [events, sessions, tags, identity, visitorDelete] = await Promise.all([
      db.websiteEvent.deleteMany({ where: { tenantId, visitorId: visitor.id } }),
      db.websiteSession.deleteMany({ where: { tenantId, visitorId: visitor.id } }),
      db.websiteSessionTag.deleteMany({ where: { tenantId, visitorId: visitor.id } }),
      db.websiteVisitorIdentity.deleteMany({ where: { tenantId, visitorId: visitor.id } }),
      db.websiteVisitor.delete({ where: { id: visitor.id } }).catch(() => null),
    ]);
    return { visitorId: visitor.id, deleted: { events: events.count, sessions: sessions.count, tags: tags.count, identities: identity.count, visitor: Boolean(visitorDelete) } };
  }

  async deleteSessionPrivacy(sessionId: string, tenantId: string) {
    const session = await this.getSession(sessionId, tenantId);
    const recordings = await db.websiteRecording.findMany({ where: { tenantId, sessionId }, include: { chunks: true } });
    for (const recording of recordings) {
      for (const chunk of recording.chunks || []) await recordingStorageService.deleteChunk(chunk.storagePath).catch(() => null);
    }
    const [events, signals, tags] = await Promise.all([
      db.websiteEvent.deleteMany({ where: { tenantId, sessionId } }),
      db.websiteBehaviorSignal.deleteMany({ where: { tenantId, sessionId } }),
      db.websiteSessionTag.deleteMany({ where: { tenantId, sessionId } }),
    ]);
    await db.websiteSession.delete({ where: { id: session.id } });
    return { sessionId, deleted: { events: events.count, behaviorSignals: signals.count, tags: tags.count } };
  }

  async anonymizeSession(sessionId: string, tenantId: string) {
    const session = await this.getSession(sessionId, tenantId);
    await db.websiteEvent.updateMany({ where: { tenantId, sessionId }, data: { visitorId: null, payload: {} } });
    return db.websiteSession.update({
      where: { id: session.id },
      data: { visitorId: session.visitorId, ipHash: null, userAgent: null, country: null, metadata: { anonymized: true }, referrer: null },
    });
  }

  async retentionPreview(tenantId: string, query: Record<string, unknown> = {}) {
    const siteId = cleanString(query.siteId, 120);
    const sites = siteId ? [await this.getSite(siteId, tenantId)] : await db.websiteAnalyticsSite.findMany({ where: { tenantId } });
    const previews = [];
    for (const site of sites) {
      const privacy = defaultPrivacySettings(site.privacySettings || {});
      const cutoff = new Date(Date.now() - Number(privacy.dataRetentionDays || privacy.retentionDays || 30) * 24 * 60 * 60 * 1000);
      const recordingCutoff = new Date(Date.now() - Number(privacy.recordingRetentionDays || privacy.retentionDays || 30) * 24 * 60 * 60 * 1000);
      previews.push({
        siteId: site.id,
        sessions: await db.websiteSession.count({ where: { tenantId, siteId: site.id, startedAt: { lt: cutoff } } }),
        events: await db.websiteEvent.count({ where: { tenantId, siteId: site.id, createdAt: { lt: cutoff } } }),
        recordings: await db.websiteRecording.count({ where: { tenantId, siteId: site.id, createdAt: { lt: recordingCutoff } } }),
        heatmaps: await db.websiteHeatmapSnapshot.count({ where: { tenantId, siteId: site.id, createdAt: { lt: cutoff } } }),
      });
    }
    return previews;
  }

  async runRetentionCleanup(tenantId: string, data: Record<string, unknown> = {}) {
    const preview = await this.retentionPreview(tenantId, data);
    const results = [];
    for (const item of preview) {
      const site = await this.getSite(item.siteId, tenantId);
      const privacy = defaultPrivacySettings(site.privacySettings || {});
      const cutoff = new Date(Date.now() - Number(privacy.dataRetentionDays || privacy.retentionDays || 30) * 24 * 60 * 60 * 1000);
      const recordingCutoff = new Date(Date.now() - Number(privacy.recordingRetentionDays || privacy.retentionDays || 30) * 24 * 60 * 60 * 1000);
      const recordings = await db.websiteRecording.findMany({ where: { tenantId, siteId: site.id, createdAt: { lt: recordingCutoff } }, include: { chunks: true } });
      for (const recording of recordings) for (const chunk of recording.chunks || []) await recordingStorageService.deleteChunk(chunk.storagePath).catch(() => null);
      const [events, sessions, heatmaps, recordingDelete] = await Promise.all([
        db.websiteEvent.deleteMany({ where: { tenantId, siteId: site.id, createdAt: { lt: cutoff } } }),
        db.websiteSession.deleteMany({ where: { tenantId, siteId: site.id, startedAt: { lt: cutoff } } }),
        db.websiteHeatmapSnapshot.deleteMany({ where: { tenantId, siteId: site.id, createdAt: { lt: cutoff } } }),
        db.websiteRecording.deleteMany({ where: { tenantId, siteId: site.id, createdAt: { lt: recordingCutoff } } }),
      ]);
      results.push({ siteId: site.id, deleted: { events: events.count, sessions: sessions.count, heatmaps: heatmaps.count, recordings: recordingDelete.count } });
    }
    return { cleanedAt: new Date().toISOString(), results };
  }

  async reportOverview(tenantId: string, query: Record<string, unknown> = {}) {
    const filters = await this.resolveFilters(tenantId, query);
    const sessionWhere = this.buildSessionWhere(tenantId, filters);
    const eventWhere = this.buildEventWhere(tenantId, filters);
    const [sessions, visitors, pageViews, avg, recordings, issues, funnels, customEvents] = await Promise.all([
      db.websiteSession.count({ where: sessionWhere }),
      db.websiteVisitor.count({ where: { tenantId, ...(filters.siteId ? { siteId: String(filters.siteId) } : {}) } }),
      db.websiteEvent.count({ where: { ...eventWhere, type: 'page_view' } }),
      db.websiteSession.aggregate({ where: { ...sessionWhere, durationMs: { not: null } }, _avg: { durationMs: true } }),
      db.websiteRecording.count({ where: { tenantId, ...(filters.siteId ? { siteId: String(filters.siteId) } : {}) } }),
      db.websiteIssueGroup.count({ where: { tenantId, ...(filters.siteId ? { siteId: String(filters.siteId) } : {}) } }),
      db.websiteFunnelRun.findMany({ where: { tenantId, ...(filters.siteId ? { siteId: String(filters.siteId) } : {}) }, take: 20, orderBy: { createdAt: 'desc' } }),
      db.websiteEvent.count({ where: { ...eventWhere, type: 'custom_event' } }),
    ]);
    return { sessions, uniqueVisitors: visitors, pageViews, averageDurationMs: Math.round(avg._avg.durationMs || 0), recordings, behaviorIssues: issues, funnelConversions: funnels.reduce((sum: number, run: any) => sum + (run.totalConversions || 0), 0), customEvents };
  }

  async reportPages(tenantId: string, query: Record<string, unknown> = {}) {
    const events = await db.websiteEvent.findMany({ where: { ...this.buildEventWhere(tenantId, await this.resolveFilters(tenantId, query)), type: 'page_view' }, select: { path: true, url: true }, take: 5000 });
    const map = new Map<string, number>();
    events.forEach((event: any) => map.set(event.path || this.pathFromUrl(event.url) || 'unknown', (map.get(event.path || this.pathFromUrl(event.url) || 'unknown') || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 100).map(([path, pageViews]) => ({ path, pageViews }));
  }

  async reportBreakdown(tenantId: string, query: Record<string, unknown>, field: 'referrer' | 'country' | 'device' | 'browser') {
    const sessions = await db.websiteSession.findMany({ where: this.buildSessionWhere(tenantId, await this.resolveFilters(tenantId, query)), select: { [field]: true } as any, take: 5000 });
    const map = new Map<string, number>();
    sessions.forEach((session: any) => map.set(session[field] || 'Unknown', (map.get(session[field] || 'Unknown') || 0) + 1));
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]).slice(0, 100).map(([name, sessions]) => ({ name, sessions }));
  }

  async reportBehavior(tenantId: string, query: Record<string, unknown> = {}) {
    const filters = await this.resolveFilters(tenantId, query);
    return db.websiteIssueGroup.findMany({ where: { tenantId, ...(filters.siteId ? { siteId: String(filters.siteId) } : {}) }, orderBy: { occurrenceCount: 'desc' }, take: 100 });
  }

  async reportTechnical(tenantId: string, query: Record<string, unknown> = {}) {
    const filters = await this.resolveFilters(tenantId, query);
    return db.websiteEvent.findMany({ where: { ...this.buildEventWhere(tenantId, filters), type: { in: ['js_error', 'unhandled_rejection'] } }, orderBy: { createdAt: 'desc' }, take: 200 });
  }

  async reportConversions(tenantId: string, query: Record<string, unknown> = {}) {
    const filters = await this.resolveFilters(tenantId, query);
    return db.websiteFunnelRun.findMany({ where: { tenantId, ...(filters.siteId ? { siteId: String(filters.siteId) } : {}) }, orderBy: { createdAt: 'desc' }, take: 100, include: { funnel: true } });
  }

  async storageUsage(tenantId: string, query: Record<string, unknown> = {}) {
    const where = { tenantId, ...(query.siteId ? { siteId: String(query.siteId) } : {}) };
    const [recordingBytes, recordingCount, eventCount, sessionCount] = await Promise.all([
      db.websiteRecording.aggregate({ where, _sum: { sizeBytes: true } }),
      db.websiteRecording.count({ where }),
      db.websiteEvent.count({ where }),
      db.websiteSession.count({ where }),
    ]);
    return { recordingBytes: recordingBytes._sum.sizeBytes || 0, recordingCount, eventCount, sessionCount };
  }

  async ingestionHealth(tenantId: string, query: Record<string, unknown> = {}) {
    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const where = { tenantId, ...(query.siteId ? { siteId: String(query.siteId) } : {}) };
    const [events24h, sessions24h, failedDeliveries] = await Promise.all([
      db.websiteEvent.count({ where: { ...where, createdAt: { gte: since } } }),
      db.websiteSession.count({ where: { ...where, startedAt: { gte: since } } }),
      db.websiteAnalyticsWebhookDelivery.count({ where: { tenantId, status: 'FAILED' } }),
    ]);
    return { status: 'OK', events24h, sessions24h, failedDeliveries, checkedAt: new Date().toISOString() };
  }

  async reprocessSession(sessionId: string, tenantId: string) {
    return this.analyzeSession(sessionId, tenantId);
  }

  async rebuildHeatmap(snapshotId: string, tenantId: string) {
    const snapshot = await this.getHeatmapSnapshot(snapshotId, tenantId);
    await db.websiteHeatmapPoint.deleteMany?.({ where: { tenantId, snapshotId } });
    const aggregate = await this.aggregateHeatmapEvents(tenantId, snapshot.siteId, snapshot.id, snapshot.path, snapshot.dateFrom, snapshot.dateTo, snapshot.deviceType);
    return db.websiteHeatmapSnapshot.update({
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
        metadata: { topClickedAreas: aggregate.topClickedAreas, scrollBands: aggregate.scrollBands },
      },
    });
  }

  async recalculateFunnel(runId: string, tenantId: string) {
    const run = await this.getFunnelRun(runId, tenantId);
    return this.runFunnel(run.funnelId, tenantId, { dateFrom: run.dateFrom, dateTo: run.dateTo, filters: run.segmentFilters });
  }

  async getLiveOverview(tenantId: string, query: Record<string, unknown> = {}) {
    const sessions = await this.getActiveLiveStates(tenantId, query);
    const visitors = new Set(sessions.map((session: any) => session.visitorId).filter(Boolean));
    const pageCounts = new Map<string, number>();
    sessions.forEach((session: any) => {
      const key = session.currentPath || this.pathFromUrl(session.currentUrl) || '/';
      pageCounts.set(key, (pageCounts.get(key) || 0) + 1);
    });
    return {
      activeSessionCount: sessions.length,
      activeVisitors: visitors.size,
      topCurrentPages: Array.from(pageCounts.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([path, count]) => ({ path, count })),
      liveErrorsCount: sessions.filter((session: any) => session.hasJsError).length,
      liveBehaviorAlertsCount: sessions.filter((session: any) => session.hasBehaviorSignal).length,
      activeRecordingsCount: sessions.filter((session: any) => session.isRecording).length,
      generatedAt: new Date().toISOString(),
    };
  }

  async listLiveSessions(tenantId: string, query: Record<string, unknown> = {}) {
    return this.getActiveLiveStates(tenantId, query);
  }

  async liveHeartbeat(data: Record<string, unknown>, headers: Record<string, any> = {}, remoteAddress?: string) {
    if (jsonSize(data) > MAX_BODY_BYTES) throw new BadRequestError('Live payload is too large', ErrorCodes.VALIDATION_FAILED);
    const site = await this.getActiveSite(data.trackingKey);
    this.enforcePublicPrivacy(site, data);
    const session = await this.getPublicSession(site, data.sessionKey);
    const state = await this.upsertLiveState(site, session, {
      ...data,
      lastEventType: 'heartbeat',
      userAgent: data.userAgent || headers['user-agent'],
      ipHash: hashIp(getClientIp(headers, remoteAddress) || undefined),
    });
    this.publishLive('session.updated', site.tenantId, site.id, state);
    this.publishLive('overview.updated', site.tenantId, site.id, await this.getLiveOverview(site.tenantId, { siteId: site.id }));
    return { active: true, sessionId: session.id, lastEventAt: state.lastEventAt };
  }

  async liveEvent(data: Record<string, unknown>, headers: Record<string, any> = {}, remoteAddress?: string) {
    const result = await this.collect(data, headers, remoteAddress);
    return { accepted: result.accepted, sessionId: result.sessionId };
  }

  async listSessions(tenantId: string, query: Record<string, unknown>) {
    const filters = await this.resolveFilters(tenantId, query);
    const where = this.buildSessionWhere(tenantId, filters);
    const sessions = await db.websiteSession.findMany({
      where,
      orderBy: { startedAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: { site: { select: { id: true, name: true, domain: true } }, visitor: { include: { identity: true } }, tags: true },
    });
    return sessions;
  }

  async getSession(id: string, tenantId: string) {
    const session = await db.websiteSession.findFirst({
      where: { id, tenantId },
      include: {
        site: { select: { id: true, name: true, domain: true } },
        visitor: { include: { identity: true } },
        tags: true,
        events: { orderBy: { createdAt: 'asc' }, take: 500 },
      },
    });
    if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return session;
  }

  async listEvents(tenantId: string, query: Record<string, unknown>) {
    const filters = await this.resolveFilters(tenantId, query);
    const where = this.buildEventWhere(tenantId, filters);
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
    const filters = await this.resolveFilters(tenantId, query);
    const where: Record<string, any> = { tenantId };
    if (filters.siteId) where.siteId = String(filters.siteId);
    if (filters.path) where.path = this.stringMatch(filters.path);
    if (filters.url) where.url = this.stringMatch(filters.url);
    if (query.deviceType && query.deviceType !== 'all') where.deviceType = String(query.deviceType).toLowerCase();
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) where.createdAt.lte = new Date(String(filters.dateTo));
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
    const filters = await this.resolveFilters(tenantId, query);
    const where: Record<string, any> = { tenantId };
    if (filters.siteId) where.siteId = String(filters.siteId);
    if (filters.isFavorite !== undefined) where.isFavorite = this.booleanFilter(filters.isFavorite);
    const labels = stringArray(filters.labels || filters.label);
    if (labels.length) where.labels = { array_contains: labels };
    if (filters.minDuration || filters.maxDuration) {
      where.durationMs = {};
      if (filters.minDuration) where.durationMs.gte = Number(filters.minDuration);
      if (filters.maxDuration) where.durationMs.lte = Number(filters.maxDuration);
    }
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) where.createdAt.lte = new Date(String(filters.dateTo));
    }
    const sessionWhere = this.buildSessionWhere(tenantId, filters);
    delete sessionWhere.tenantId;
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
    const publicPrivacy = this.enforcePublicPrivacy(site, data);
    const privacy = defaultPrivacySettings(site.privacySettings || {});
    if (privacy.recordingsEnabled === false) {
      throw new ForbiddenError('Recordings are disabled for this site', ErrorCodes.AUTH_TOKEN_INVALID);
    }
    if (publicPrivacy.requireConsentForRecording && publicPrivacy.consentMode && data.consent !== 'granted') {
      throw new ForbiddenError('Recording consent is required for this site', ErrorCodes.AUTH_TOKEN_INVALID);
    }
    const session = await this.getPublicSession(site, data.sessionKey);
    const existing = await db.websiteRecording.findFirst({
      where: { tenantId: site.tenantId, siteId: site.id, sessionId: session.id },
    });
    if (existing) return existing;
    const recording = await db.websiteRecording.create({
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
    await db.websiteLiveSessionState.update({ where: { sessionId: session.id }, data: { isRecording: true, lastEventType: 'recording_start', lastEventAt: new Date() } }).catch(() => null);
    this.publishLive('recording.started', site.tenantId, site.id, { recordingId: recording.id, sessionId: session.id, startedAt: recording.startedAt });
    return recording;
  }

  async uploadRecordingChunk(data: Record<string, unknown>) {
    const site = await this.getActiveSite(data.trackingKey);
    this.enforcePublicPrivacy(site, data);
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
    this.enforcePublicPrivacy(site, data);
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
    await db.websiteLiveSessionState.update({ where: { sessionId: session.id }, data: { isRecording: false, lastEventType: 'recording_end', lastEventAt: endedAt } }).catch(() => null);
    this.publishLive('recording.ended', site.tenantId, site.id, { recordingId: updated.id, sessionId: session.id, endedAt: updated.endedAt, status: updated.status });
    await this.analyzeSession(session.id, site.tenantId).catch(() => null);
    return updated;
  }

  async startSession(data: Record<string, unknown>, headers: Record<string, any> = {}, remoteAddress?: string) {
    const site = await this.getActiveSite(data.trackingKey);
    this.enforcePublicPrivacy(site, data);
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
    await this.upsertLiveState(site, session, { ...data, lastEventType: 'session_start' }).catch(() => null);
    this.publishLive('session.started', site.tenantId, site.id, { sessionId: session.id, currentUrl: entryUrl, currentPath: this.pathFromUrl(entryUrl), visitorId: visitor.id });
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
    this.enforcePublicPrivacy(site, data);
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
    await db.websiteLiveSessionState.update({ where: { sessionId: session.id }, data: { lastEventType: 'session_end', lastEventAt: endedAt, currentUrl: cleanString(data.url || data.exitUrl, 2000) || session.exitUrl } }).catch(() => null);
    this.publishLive('session.ended', site.tenantId, site.id, { sessionId: session.id, endedAt: endedAt.toISOString(), currentUrl: cleanString(data.url || data.exitUrl, 2000) || session.exitUrl });
    await this.analyzeSession(session.id, site.tenantId).catch(() => null);
    return updated;
  }

  async collect(data: Record<string, unknown>, headers: Record<string, any> = {}, remoteAddress?: string) {
    if (jsonSize(data) > MAX_BODY_BYTES) throw new BadRequestError('Analytics payload is too large', ErrorCodes.VALIDATION_FAILED);
    const site = await this.getActiveSite(data.trackingKey);
    const privacy = this.enforcePublicPrivacy(site, data);
    const anonymousId = this.requirePublicId(data.anonymousId, 'anonymousId');
    const sessionKey = this.requirePublicId(data.sessionKey, 'sessionKey');
    const visitor = await this.upsertVisitor(site, anonymousId, data.metadata);
    const sessionStart = await this.startSession({ ...data, anonymousId, sessionKey }, headers, remoteAddress);
    const session = await db.websiteSession.findUnique({ where: { id: sessionStart.sessionId } });
    const incomingRaw = Array.isArray(data.events) ? data.events : [data];
    const incoming = privacy.heatmapsEnabled === false
      ? incomingRaw.filter((event: any) => !['click', 'scroll', 'mouse_move'].includes(event?.type))
      : incomingRaw;
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
    await this.processPublicSpecialEvents(site, sessionStart.sessionId, visitor.id, incoming);
    const updatedSession = {
      ...(session || {}),
      id: sessionStart.sessionId,
      tenantId: site.tenantId,
      siteId: site.id,
      visitorId: visitor.id,
      pageCount: (session?.pageCount || 0) + pageViews,
      eventCount: (session?.eventCount || 0) + events.length,
      hasJsError: hasJsError || session?.hasJsError,
      exitUrl: lastUrl || session?.exitUrl,
      startedAt: session?.startedAt || new Date(),
    };
    const state = await this.upsertLiveState(site, updatedSession, {
      ...events[events.length - 1],
      lastEventType: events[events.length - 1]?.type || 'event',
      pageCount: updatedSession.pageCount,
      eventCount: updatedSession.eventCount,
      hasJsError: updatedSession.hasJsError,
    }).catch(() => null);
    if (state) this.publishLive('session.updated', site.tenantId, site.id, state);
    for (const event of events.slice(-10)) {
      this.publishLive(event.type === 'js_error' || event.type === 'unhandled_rejection' ? 'error.received' : 'event.received', site.tenantId, site.id, {
        sessionId: sessionStart.sessionId,
        visitorId: visitor.id,
        type: event.type,
        url: event.url,
        path: event.path,
        title: event.title,
        createdAt: event.createdAt,
        payload: event.type === 'js_error' || event.type === 'unhandled_rejection' || event.type === 'custom_event' ? event.payload : undefined,
      });
    }
    this.publishLive('overview.updated', site.tenantId, site.id, await this.getLiveOverview(site.tenantId, { siteId: site.id }));
    if (events.some((event: any) => event.type === 'js_error' || event.type === 'unhandled_rejection')) {
      await this.analyzeSession(sessionStart.sessionId, site.tenantId).catch(() => null);
    }
    return { accepted: events.length, siteId: site.id, sessionId: sessionStart.sessionId };
  }

  async listSessionTags(id: string, tenantId: string): Promise<any> {
    const session = await this.getSession(id, tenantId);
    return db.websiteSessionTag.findMany({ where: { tenantId, sessionId: session.id }, orderBy: { createdAt: 'desc' } });
  }

  async createSessionTag(id: string, tenantId: string, data: Record<string, unknown>, createdById?: string | null): Promise<any> {
    const session = await this.getSession(id, tenantId);
    const name = cleanString(data.name || data.tagName, 80);
    if (!name) throw new BadRequestError('Tag name is required', ErrorCodes.VALIDATION_FAILED);
    const existing = await db.websiteSessionTag.findFirst({ where: { tenantId, sessionId: session.id, name } });
    if (existing) return existing;
    return db.websiteSessionTag.create({
      data: {
        tenantId,
        siteId: session.siteId,
        sessionId: session.id,
        visitorId: session.visitorId || null,
        name,
        color: cleanString(data.color, 20),
        createdById: createdById || cleanString(data.createdById, 120),
      },
    });
  }

  async deleteSessionTag(sessionId: string, tagId: string, tenantId: string): Promise<any> {
    await this.getSession(sessionId, tenantId);
    const tag = await db.websiteSessionTag.findFirst({ where: { id: tagId, sessionId, tenantId } });
    if (!tag) throw new NotFoundError('Session tag not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return db.websiteSessionTag.delete({ where: { id: tagId } });
  }

  async getVisitorIdentity(visitorId: string, tenantId: string): Promise<any> {
    const visitor = await db.websiteVisitor.findFirst({
      where: { id: visitorId, tenantId },
      include: { identity: true },
    });
    if (!visitor) throw new NotFoundError('Website visitor not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return visitor.identity || null;
  }

  async updateVisitorIdentity(visitorId: string, tenantId: string, data: Record<string, unknown>): Promise<any> {
    const visitor = await db.websiteVisitor.findFirst({ where: { id: visitorId, tenantId } });
    if (!visitor) throw new NotFoundError('Website visitor not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return this.upsertIdentity({
      tenantId,
      siteId: visitor.siteId,
      visitorId: visitor.id,
      externalUserId: cleanString(data.externalUserId, 200),
      traits: safePublicPayload(data.traits || {}),
      email: (data as any).email,
    });
  }

  async listBehaviorSignals(tenantId: string, query: Record<string, unknown>): Promise<any> {
    const filters = await this.resolveFilters(tenantId, query);
    const where: Record<string, any> = { tenantId };
    if (filters.siteId) where.siteId = String(filters.siteId);
    const behaviorTypes = stringArray(filters.behaviorTypes || filters.type).map((item) => item.toUpperCase());
    if (behaviorTypes.length) where.type = { in: behaviorTypes };
    if (filters.severity) where.severity = String(filters.severity).toUpperCase();
    if (filters.path) where.path = this.stringMatch(filters.path);
    if (filters.url) where.url = this.stringMatch(filters.url);
    if (filters.dateFrom || filters.dateTo) {
      where.firstSeenAt = {};
      if (filters.dateFrom) where.firstSeenAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) where.firstSeenAt.lte = new Date(String(filters.dateTo));
    }
    const sessionWhere = this.buildSessionWhere(tenantId, filters);
    delete sessionWhere.tenantId;
    if (Object.keys(sessionWhere).length) where.session = sessionWhere;
    if (filters.hasRecording !== undefined) where.recordingId = this.booleanFilter(filters.hasRecording) ? { not: null } : null;
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
    const filters = await this.resolveFilters(tenantId, query);
    const where: Record<string, any> = { tenantId };
    if (filters.siteId) where.siteId = String(filters.siteId);
    const behaviorTypes = stringArray(filters.behaviorTypes || filters.type).map((item) => item.toUpperCase());
    if (behaviorTypes.length) where.type = { in: behaviorTypes };
    if (filters.severity) where.severity = String(filters.severity).toUpperCase();
    if (filters.status) where.status = String(filters.status).toUpperCase();
    if (filters.path) where.path = this.stringMatch(filters.path);
    if (filters.url) where.url = this.stringMatch(filters.url);
    if (filters.dateFrom || filters.dateTo) {
      where.lastSeenAt = {};
      if (filters.dateFrom) where.lastSeenAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) where.lastSeenAt.lte = new Date(String(filters.dateTo));
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
    if (saved.length) {
      await db.websiteLiveSessionState.update({ where: { sessionId: session.id }, data: { hasBehaviorSignal: true, lastEventType: 'behavior_signal', lastEventAt: new Date() } }).catch(() => null);
      for (const signal of saved.slice(-10)) this.publishLive('behavior.detected', tenantId, session.siteId, signal);
      this.publishLive('overview.updated', tenantId, session.siteId, await this.getLiveOverview(tenantId, { siteId: session.siteId }));
    }
    return { sessionId, signalCount: saved.length, signals: saved };
  }

  trackerScript() {
    return TRACKER_SCRIPT
      .replace('if(!key||localStorage.getItem("ys_analytics_opt_out")==="1")return;',
        'if(!key||localStorage.getItem("ys_analytics_opt_out")==="1")return;var consent=localStorage.getItem("ys_analytics_consent")||"granted";')
      .replace('function common(e){return Object.assign({trackingKey:key,anonymousId:anon,sessionKey:sk,url:location.href,path:location.pathname,title:document.title,referrer:document.referrer,viewportWidth:innerWidth,viewportHeight:innerHeight,userAgent:navigator.userAgent,device:device()},e||{})}',
        'function common(e){return Object.assign({trackingKey:key,anonymousId:anon,sessionKey:sk,consent:consent,url:location.href,path:location.pathname,title:document.title,referrer:document.referrer,viewportWidth:innerWidth,viewportHeight:innerHeight,userAgent:navigator.userAgent,device:device()},e||{})}')
      .replace('timer=setTimeout(function(){timer=null;flush()},1500)',
        'timer=setTimeout(function(){timer=null;flush()},750)')
      .replace('var batch=rq.splice(0,300);',
        'var batch=rq.splice(0,120);')
      .replace('if(rq.length>=120)flushRecording(false);else scheduleRecording()',
        'if(rq.length>=40)flushRecording(false);else scheduleRecording()')
      .replace('rtimer=setTimeout(function(){rtimer=null;flushRecording(false)},3000)',
        'rtimer=setTimeout(function(){rtimer=null;flushRecording(false)},1000)')
      .replace('function push(e){var now=new Date().toISOString();e=e||{};e.payload=Object.assign({clientTime:now},e.payload||{});q.push(Object.assign({createdAt:now},e));schedule()}',
        'function push(e){if(consent==="denied")return;var now=new Date().toISOString();e=e||{};e.payload=Object.assign({clientTime:now},e.payload||{});q.push(Object.assign({createdAt:now},e));schedule()}')
      .replace('function api(method,a,b){if(method==="event")push({type:"custom_event",payload:{eventName:String(a||"").slice(0,120),data:safe(b)}});if(method==="identify")push({type:"identify",externalUserId:String(a||"").slice(0,200),payload:{traits:safe(b)}});if(method==="tag")push({type:"session_tag",name:String(a||"").slice(0,80),payload:safe(b)})}',
        'function api(method,a,b){if(method==="consent"){consent=a==="granted"?"granted":"denied";localStorage.setItem("ys_analytics_consent",consent);if(consent==="granted")boot();return}if(method==="optOut"){localStorage.setItem("ys_analytics_opt_out","1");consent="denied";return}if(method==="optIn"){localStorage.removeItem("ys_analytics_opt_out");consent="granted";localStorage.setItem("ys_analytics_consent","granted");boot();return}if(method==="event")push({type:"custom_event",payload:{eventName:String(a||"").slice(0,120),data:safe(b)}});if(method==="identify")push({type:"identify",externalUserId:String(a||"").slice(0,200),payload:{traits:safe(b)}});if(method==="tag")push({type:"session_tag",name:String(a||"").slice(0,80),payload:safe(b)})}')
      .replace('post(base+"/session/start",common({url:location.href}),false).then(function(res){var site=res.data&&res.data.site||res.site;if(site&&site.privacySettings)privacy=Object.assign(privacy,site.privacySettings);startRecording()});page("load");',
        'var booted=false;function boot(){if(booted||consent==="denied")return;booted=true;post(base+"/session/start",common({url:location.href}),false).then(function(res){var site=res.data&&res.data.site||res.site;if(site&&site.privacySettings){privacy=Object.assign(privacy,site.privacySettings);if(privacy.trackingEnabled===false)return;if(privacy.consentMode===true&&consent!=="granted"){booted=false;return}}liveHeartbeat("visible",false);setInterval(function(){if(document.visibilityState!=="hidden")liveHeartbeat("visible",false)},10000);startRecording()});page("load")}boot();')
      .replace('post(base+"/recordings/start",common({metadata:{source:"tracker"}}),false).then(function(res){recording=true;recordingId=res.data&&res.data.id||res.id||null;function begin(){',
        'post(base+"/recordings/start",common({metadata:{source:"tracker"}}),false).then(function(res){recordingId=res.data&&res.data.id||res.id||null;if(!recordingId){recording=false;setTimeout(startRecording,5000);return}recording=true;liveHeartbeat("visible",false);function begin(){')
      .replace('function begin(){if(!window.rrweb||!window.rrweb.record)return;',
        'function begin(){var rec=window.rrweb&&window.rrweb.record||window.rrwebRecord&&window.rrwebRecord.record||window.rrwebRecord;if(typeof rec!=="function"){recording=false;setTimeout(startRecording,5000);return}')
      .replace('window.rrweb.record({emit:function(ev){rq.push(ev);if(rq.length>=120)flushRecording(false);else scheduleRecording()},',
        'rec({emit:function(ev){rq.push(ev);if(rq.length>=120)flushRecording(false);else scheduleRecording()},')
      .replace('window.rrweb.record({emit:function(ev){rq.push(ev);if(rq.length>=40)flushRecording(false);else scheduleRecording()},',
        'rec({emit:function(ev){rq.push(ev);if(rq.length>=40)flushRecording(false);else scheduleRecording()},')
      .replace("maskTextSelector:'[data-ys-mask],'+(privacy.maskSelectors||[]).join(','),blockSelector:'[data-ys-ignore],'+(privacy.blockSelectors||[]).join(',')",
        "maskTextSelector:['[data-ys-mask]'].concat(privacy.maskSelectors||[]).filter(Boolean).join(','),blockSelector:['[data-ys-ignore]'].concat(privacy.blockSelectors||[]).filter(Boolean).join(',')")
      .replace('function send(events,beacon){if(!events.length)return;post(base+"/collect",common({events:events}),beacon)}',
        'function liveHeartbeat(status,beacon){post(base+"/live/heartbeat",common({currentUrl:location.href,currentPath:location.pathname,currentTitle:document.title,visibilityState:document.visibilityState||status||"visible"}),!!beacon)}function send(events,beacon){if(!events.length)return;post(base+"/collect",common({events:events}),beacon)}')
      .replace('function endAll(){send(q.splice(0,50),true);flushRecording(true);post(base+"/recordings/end",common({recordingId:recordingId}),true);post(base+"/session/end",common({url:location.href}),true)}',
        'function endAll(){liveHeartbeat("hidden",true);send(q.splice(0,50),true);flushRecording(true);post(base+"/recordings/end",common({recordingId:recordingId}),true);post(base+"/session/end",common({url:location.href}),true)}');
  }

  async vendorScript() {
    const fs = await import('fs/promises');
    const path = await import('path');
    const vendorPath = path.join(process.cwd(), 'node_modules', 'rrweb', 'dist', 'record', 'rrweb-record.min.js');
    return fs.readFile(vendorPath, 'utf8');
  }

  private async resolveFilters(tenantId: string, query: Record<string, unknown>) {
    const segmentId = cleanString(query.segmentId, 120);
    const queryFilters = { ...query };
    delete queryFilters.segmentId;
    if (!segmentId) return queryFilters;
    const segment = await db.websiteAnalyticsSegment.findFirst({ where: { id: segmentId, tenantId } });
    if (!segment) throw new NotFoundError('Website analytics segment not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return { ...(segment.filters || {}), ...queryFilters };
  }

  private buildSessionWhere(tenantId: string, filters: Record<string, unknown>) {
    const where: Record<string, any> = { tenantId };
    if (filters.siteId) where.siteId = String(filters.siteId);
    if (filters.country) where.country = this.stringMatch(filters.country);
    if (filters.browser) where.browser = this.stringMatch(filters.browser);
    if (filters.os) where.os = this.stringMatch(filters.os);
    if (filters.device) where.device = this.stringMatch(filters.device);
    if (filters.referrer) where.referrer = this.stringMatch(filters.referrer);
    if (filters.path) where.OR = [{ entryUrl: this.stringMatch(filters.path) }, { exitUrl: this.stringMatch(filters.path) }];
    if (filters.url) where.OR = [{ entryUrl: this.stringMatch(filters.url) }, { exitUrl: this.stringMatch(filters.url) }];
    if (filters.hasJsError !== undefined || filters.errors !== undefined) where.hasJsError = this.booleanFilter(filters.hasJsError ?? filters.errors);
    if (filters.dateFrom || filters.dateTo) {
      where.startedAt = {};
      if (filters.dateFrom) where.startedAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) where.startedAt.lte = new Date(String(filters.dateTo));
    }
    if (filters.minDuration || filters.maxDuration) {
      where.durationMs = {};
      if (filters.minDuration) where.durationMs.gte = Number(filters.minDuration);
      if (filters.maxDuration) where.durationMs.lte = Number(filters.maxDuration);
    }
    if (filters.minPageCount || filters.maxPageCount) {
      where.pageCount = {};
      if (filters.minPageCount) where.pageCount.gte = Number(filters.minPageCount);
      if (filters.maxPageCount) where.pageCount.lte = Number(filters.maxPageCount);
    }
    if (filters.minEventCount || filters.maxEventCount) {
      where.eventCount = {};
      if (filters.minEventCount) where.eventCount.gte = Number(filters.minEventCount);
      if (filters.maxEventCount) where.eventCount.lte = Number(filters.maxEventCount);
    }
    const tags = stringArray(filters.tags || filters.tag);
    if (tags.length) where.tags = { some: { name: { in: tags } } };
    if (filters.visitorId) where.visitorId = String(filters.visitorId);
    if (filters.externalUserId || filters.userId) where.visitor = { identity: { externalUserId: String(filters.externalUserId || filters.userId) } };
    if (filters.customEventName) where.events = { some: { type: 'custom_event', payload: { path: ['eventName'], equals: String(filters.customEventName) } } };
    const behaviorTypes = this.behaviorTypesFromFilters(filters);
    if (behaviorTypes.length) where.behaviorSignals = { some: { type: { in: behaviorTypes } } };
    if (filters.hasRecording !== undefined) where.recordings = this.booleanFilter(filters.hasRecording) ? { some: {} } : { none: {} };
    return where;
  }

  private buildEventWhere(tenantId: string, filters: Record<string, unknown>) {
    const where: Record<string, any> = { tenantId };
    if (filters.siteId) where.siteId = String(filters.siteId);
    if (filters.path) where.path = this.stringMatch(filters.path);
    if (filters.url) where.url = this.stringMatch(filters.url);
    if (filters.dateFrom || filters.dateTo) {
      where.createdAt = {};
      if (filters.dateFrom) where.createdAt.gte = new Date(String(filters.dateFrom));
      if (filters.dateTo) where.createdAt.lte = new Date(String(filters.dateTo));
    }
    if (filters.customEventName) {
      where.type = 'custom_event';
      where.payload = { path: ['eventName'], equals: String(filters.customEventName) };
    }
    const sessionWhere = this.buildSessionWhere(tenantId, filters);
    delete sessionWhere.tenantId;
    delete sessionWhere.siteId;
    if (Object.keys(sessionWhere).length) where.session = sessionWhere;
    return where;
  }

  private behaviorTypesFromFilters(filters: Record<string, unknown>) {
    const types = stringArray(filters.behaviorTypes).map((item) => item.toUpperCase());
    if (this.booleanFilter(filters.hasRageClick)) types.push('RAGE_CLICK');
    if (this.booleanFilter(filters.hasDeadClick)) types.push('DEAD_CLICK');
    if (this.booleanFilter(filters.hasQuickBack)) types.push('QUICK_BACK');
    if (this.booleanFilter(filters.hasExcessiveScroll)) types.push('EXCESSIVE_SCROLL');
    return Array.from(new Set(types));
  }

  private stringMatch(value: unknown) {
    const raw = cleanString(value, 1000) || '';
    if (raw.startsWith('=')) return raw.slice(1);
    return { contains: raw, mode: 'insensitive' };
  }

  private booleanFilter(value: unknown) {
    return value === true || value === 'true' || value === '1' || value === 1;
  }

  private async clearOtherDefaultSegments(tenantId: string, id: string, siteId?: string | null) {
    await db.websiteAnalyticsSegment.updateMany?.({
      where: { tenantId, id: { not: id }, siteId: siteId || null },
      data: { isDefault: false },
    });
  }

  private async processPublicSpecialEvents(site: any, sessionId: string, visitorId: string, incoming: any[]) {
    for (const event of incoming.slice(0, MAX_EVENTS_PER_BATCH)) {
      if (event?.type === 'identify') {
        await this.upsertIdentity({
          tenantId: site.tenantId,
          siteId: site.id,
          visitorId,
          externalUserId: cleanString(event.externalUserId || event.userId || event.payload?.externalUserId, 200),
          traits: safePublicPayload(event.traits || event.payload?.traits || event.payload || {}),
          email: event.email || event.payload?.email,
        });
      }
      if (event?.type === 'session_tag') {
        const name = cleanString(event.name || event.tagName || event.payload?.name, 80);
        if (name) {
          const existing = await db.websiteSessionTag.findFirst({ where: { tenantId: site.tenantId, siteId: site.id, sessionId, name } });
          if (!existing) {
            await db.websiteSessionTag.create({ data: { tenantId: site.tenantId, siteId: site.id, sessionId, visitorId, name, color: cleanString(event.color || event.payload?.color, 20) } });
          }
        }
      }
    }
  }

  private async upsertIdentity(input: { tenantId: string; siteId: string; visitorId: string; externalUserId?: string | null; traits?: Record<string, unknown>; email?: unknown }) {
    const now = new Date();
    const emailHash = hashEmail(input.email || input.traits?.email);
    const traits = { ...(input.traits || {}) };
    delete (traits as any).email;
    return db.websiteVisitorIdentity.upsert({
      where: { tenantId_siteId_visitorId: { tenantId: input.tenantId, siteId: input.siteId, visitorId: input.visitorId } },
      create: {
        tenantId: input.tenantId,
        siteId: input.siteId,
        visitorId: input.visitorId,
        externalUserId: input.externalUserId,
        emailHash,
        traits,
        firstIdentifiedAt: now,
        lastIdentifiedAt: now,
      },
      update: {
        externalUserId: input.externalUserId || undefined,
        emailHash: emailHash || undefined,
        traits,
        lastIdentifiedAt: now,
      },
    });
  }

  private validateFunnelSteps(input: unknown) {
    if (!Array.isArray(input) || input.length < 1) {
      throw new BadRequestError('At least one funnel step is required', ErrorCodes.VALIDATION_FAILED);
    }
    if (jsonSize(input) > MAX_PAYLOAD_BYTES) {
      throw new BadRequestError('Funnel steps payload is too large', ErrorCodes.VALIDATION_FAILED);
    }
    const allowedTypes = new Set(['page', 'custom_event', 'click', 'behavior_signal', 'tag', 'js_error']);
    const allowedOperators = new Set(['contains', 'equals', 'exact', 'selector']);
    return input.slice(0, 12).map((step: any, index) => {
      const name = cleanString(step?.name, 120) || `Step ${index + 1}`;
      const type = cleanString(step?.type, 40);
      const operator = cleanString(step?.operator, 40) || 'contains';
      const value = cleanString(step?.value, 500);
      if (!type || !allowedTypes.has(type)) throw new BadRequestError('Invalid funnel step type', ErrorCodes.VALIDATION_FAILED);
      if (!allowedOperators.has(operator)) throw new BadRequestError('Invalid funnel step operator', ErrorCodes.VALIDATION_FAILED);
      if (type !== 'js_error' && !value) throw new BadRequestError('Funnel step value is required', ErrorCodes.VALIDATION_FAILED);
      return {
        name,
        type,
        operator,
        value,
        withinMinutes: step?.withinMinutes ? Math.max(1, Math.min(1440, Number(step.withinMinutes))) : null,
        required: step?.required !== false,
      };
    });
  }

  private async resolveFunnelFilters(tenantId: string, funnel: any, data: Record<string, unknown>) {
    const base = funnel.segmentId ? await this.resolveFilters(tenantId, { segmentId: funnel.segmentId }) : {};
    const override = data.segmentId ? await this.resolveFilters(tenantId, { segmentId: data.segmentId }) : {};
    return { ...base, ...override, ...safePublicPayload(data.filters || {}) };
  }

  private async loadFunnelSessions(tenantId: string, siteId: string, dateFrom: Date, dateTo: Date, filters: Record<string, unknown>) {
    const where = this.buildSessionWhere(tenantId, {
      ...filters,
      siteId,
      dateFrom: dateFrom.toISOString(),
      dateTo: dateTo.toISOString(),
    });
    return db.websiteSession.findMany({
      where,
      include: {
        events: { orderBy: { createdAt: 'asc' }, take: 1000 },
        behaviorSignals: { orderBy: { firstSeenAt: 'asc' }, take: 200 },
        tags: true,
        recordings: { select: { id: true, status: true }, take: 1 },
        visitor: { include: { identity: true } },
      },
      orderBy: { startedAt: 'asc' },
      take: 2000,
    });
  }

  private analyzeFunnelSessions(steps: any[], sessions: any[]) {
    const stepStats = steps.map((step, index) => ({ index, name: step.name, entrants: 0, dropOffs: 0, conversions: 0, avgTimeFromPreviousMs: 0, medianTimeFromPreviousMs: 0 }));
    const times: number[][] = steps.map(() => []);
    const convertedSessions: string[] = [];
    const dropOffSessionsByStep: Record<string, string[]> = {};
    const topDropOffPages = new Map<string, number>();

    for (const session of sessions) {
      let cursor = 0;
      let lastTime: number | null = null;
      let reached = -1;
      for (let index = 0; index < steps.length; index += 1) {
        const match = this.findStepMatch(session, steps[index], cursor, lastTime);
        if (!match) break;
        stepStats[index].entrants += 1;
        if (lastTime !== null) times[index].push(match.time - lastTime);
        lastTime = match.time;
        cursor = match.eventIndex + 1;
        reached = index;
      }
      if (reached === steps.length - 1) {
        convertedSessions.push(session.id);
      } else if (reached >= 0 || steps.length) {
        const dropIndex = Math.max(0, reached + 1);
        stepStats[dropIndex].dropOffs += 1;
        dropOffSessionsByStep[String(dropIndex)] = [...(dropOffSessionsByStep[String(dropIndex)] || []), session.id];
        const page = session.exitUrl || session.entryUrl || 'unknown';
        topDropOffPages.set(page, (topDropOffPages.get(page) || 0) + 1);
      }
    }
    stepStats.forEach((step, index) => {
      step.conversions = index === steps.length - 1 ? convertedSessions.length : (stepStats[index + 1]?.entrants || 0);
      step.avgTimeFromPreviousMs = average(times[index]);
      step.medianTimeFromPreviousMs = median(times[index]);
    });
    const totalEntrants = stepStats[0]?.entrants || 0;
    const totalConversions = convertedSessions.length;
    return {
      totalEntrants,
      totalConversions,
      conversionRate: totalEntrants ? Math.round((totalConversions / totalEntrants) * 10000) / 100 : 0,
      steps: stepStats,
      convertedSessions,
      dropOffSessionsByStep,
      topDropOffPages: Array.from(topDropOffPages.entries()).sort((a, b) => b[1] - a[1]).slice(0, 10).map(([page, count]) => ({ page, count })),
    };
  }

  private findStepMatch(session: any, step: any, startIndex: number, lastTime: number | null) {
    const timeline = this.sessionTimeline(session);
    const withinMs = step.withinMinutes ? Number(step.withinMinutes) * 60 * 1000 : null;
    for (let index = startIndex; index < timeline.length; index += 1) {
      const item = timeline[index];
      if (lastTime !== null && withinMs && item.time - lastTime > withinMs) return null;
      if (this.matchesFunnelStep(item, step)) return { eventIndex: index, time: item.time, item };
    }
    return null;
  }

  private sessionTimeline(session: any) {
    const events = (session.events || []).map((event: any) => ({ kind: 'event', event, time: eventTime(event) }));
    const signals = (session.behaviorSignals || []).map((signal: any) => ({ kind: 'behavior_signal', signal, time: new Date(signal.firstSeenAt).getTime() }));
    const tags = (session.tags || []).map((tag: any) => ({ kind: 'tag', tag, time: new Date(tag.createdAt || session.startedAt).getTime() }));
    return [...events, ...signals, ...tags].sort((a, b) => a.time - b.time);
  }

  private matchesFunnelStep(item: any, step: any) {
    if (step.type === 'behavior_signal') return item.kind === 'behavior_signal' && this.valueMatches(item.signal.type, step.value, step.operator);
    if (step.type === 'tag') return item.kind === 'tag' && this.valueMatches(item.tag.name, step.value, step.operator);
    const event = item.event;
    if (!event) return false;
    if (step.type === 'page') return event.type === 'page_view' && (this.valueMatches(event.path, step.value, step.operator) || this.valueMatches(event.url, step.value, step.operator));
    if (step.type === 'custom_event') return event.type === 'custom_event' && this.valueMatches(event.payload?.eventName, step.value, step.operator);
    if (step.type === 'click') return event.type === 'click' && this.valueMatches(eventSelector(event), step.value, step.operator);
    if (step.type === 'js_error') return event.type === 'js_error' || event.type === 'unhandled_rejection';
    return false;
  }

  private valueMatches(actual: unknown, expected: unknown, operator = 'contains') {
    const a = String(actual || '').toLowerCase();
    const e = String(expected || '').toLowerCase();
    if (!e && operator !== 'exists') return false;
    if (operator === 'equals' || operator === 'exact' || operator === 'selector') return a === e;
    return a.includes(e);
  }

  private extractJourneyPath(session: any) {
    const steps = (session.events || [])
      .filter((event: any) => event.type === 'page_view' || event.type === 'custom_event')
      .map((event: any) => ({
        type: event.type === 'page_view' ? 'page' : 'custom_event',
        label: event.type === 'page_view' ? (event.path || this.pathFromUrl(event.url) || event.url) : event.payload?.eventName || 'custom_event',
        url: event.url,
        path: event.path,
        at: event.createdAt,
      }))
      .filter((step: any, index: number, list: any[]) => index === 0 || step.label !== list[index - 1].label)
      .slice(0, 50);
    const conversion = steps.find((step: any) => ['lead_created', 'signup', 'checkout_complete', 'purchase'].includes(String(step.label).toLowerCase()));
    const durationMs = session.durationMs || (session.endedAt ? duration(new Date(session.startedAt), new Date(session.endedAt)) : null);
    return {
      steps,
      pathHash: fingerprint(steps.map((step: any) => step.label)),
      durationMs,
      converted: Boolean(conversion),
      conversionEvent: conversion?.label || null,
    };
  }

  private async upsertJourneyPath(tenantId: string, siteId: string, session: any, path: any) {
    const existing = await db.websiteJourneyPath.findFirst({ where: { tenantId, siteId, sessionId: session.id } });
    const data = {
      tenantId,
      siteId,
      sessionId: session.id,
      visitorId: session.visitorId || null,
      pathHash: path.pathHash,
      steps: path.steps,
      stepCount: path.steps.length,
      durationMs: path.durationMs,
      converted: path.converted,
      conversionEvent: path.conversionEvent,
    };
    return existing ? db.websiteJourneyPath.update({ where: { id: existing.id }, data }) : db.websiteJourneyPath.create({ data });
  }

  private async aggregateJourneyPaths(tenantId: string, siteId: string, paths: any[], dateFrom: Date, dateTo: Date) {
    const byHash = new Map<string, any[]>();
    paths.forEach((path) => byHash.set(path.pathHash, [...(byHash.get(path.pathHash) || []), path]));
    for (const [pathHash, group] of byHash.entries()) {
      const first = group[0];
      const data = {
        tenantId,
        siteId,
        pathHash,
        steps: first.steps,
        occurrenceCount: group.length,
        conversionCount: group.filter((path) => path.converted).length,
        avgDurationMs: average(group.map((path) => path.durationMs || 0)),
        dateFrom,
        dateTo,
      };
      const existing = await db.websitePathAggregate.findFirst({ where: { tenantId, siteId, pathHash } });
      if (existing) await db.websitePathAggregate.update({ where: { id: existing.id }, data });
      else await db.websitePathAggregate.create({ data });
    }
  }

  private async getAiConversation(id: string, tenantId: string) {
    const conversation = await db.websiteAiConversation.findFirst({ where: { id, tenantId } });
    if (!conversation) throw new NotFoundError('Website AI conversation not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return conversation;
  }

  private async buildAiContext(tenantId: string, input: Record<string, any>) {
    const siteId = cleanString(input.siteId, 120) || null;
    const filters = await this.resolveFilters(tenantId, { ...(input.filters || {}), ...(siteId ? { siteId } : {}) });
    const sourceType = cleanString(input.sourceType, 60)?.toUpperCase() || null;
    const sourceId = cleanString(input.sourceId, 120);
    const context: Record<string, any> = { tenantId: '[tenant-scoped]', siteId, filters: redactPII(filters), citations: [] as any[] };

    if (sourceType && sourceId) await this.attachAiSourceContext(tenantId, sourceType, sourceId, context);

    const baseWhere = { tenantId, ...(siteId ? { siteId } : {}) };
    const [sessions, issues, signals, heatmaps, runs, paths, segments] = await Promise.all([
      db.websiteSession.findMany({ where: this.buildSessionWhere(tenantId, filters), select: { id: true, entryUrl: true, exitUrl: true, browser: true, device: true, country: true, durationMs: true, pageCount: true, eventCount: true, hasJsError: true }, orderBy: { startedAt: 'desc' }, take: 20 }),
      db.websiteIssueGroup.findMany({ where: baseWhere, orderBy: { occurrenceCount: 'desc' }, take: 10 }),
      db.websiteBehaviorSignal.findMany({ where: baseWhere, orderBy: { firstSeenAt: 'desc' }, take: 20 }),
      db.websiteHeatmapSnapshot.findMany({ where: baseWhere, orderBy: { createdAt: 'desc' }, take: 5 }),
      db.websiteFunnelRun.findMany({ where: baseWhere, orderBy: { createdAt: 'desc' }, take: 5 }),
      db.websitePathAggregate.findMany({ where: baseWhere, orderBy: { occurrenceCount: 'desc' }, take: 10 }),
      db.websiteAnalyticsSegment.findMany({ where: { tenantId, ...(siteId ? { siteId } : {}) }, orderBy: { createdAt: 'desc' }, take: 10 }),
    ]);
    context.sessions = sessions;
    context.behaviorIssues = issues;
    context.behaviorSignals = signals.map((signal: any) => ({ id: signal.id, type: signal.type, severity: signal.severity, path: signal.path, selector: signal.selector, message: signal.message }));
    context.heatmaps = heatmaps.map((h: any) => ({ id: h.id, path: h.path, clickCount: h.clickCount, avgScrollDepth: h.avgScrollDepth, topClickedAreas: h.metadata?.topClickedAreas || [] }));
    context.funnelRuns = runs.map((run: any) => ({ id: run.id, funnelId: run.funnelId, conversionRate: run.conversionRate, totalEntrants: run.totalEntrants, totalConversions: run.totalConversions, steps: run.results?.steps || [] }));
    context.journeyPaths = paths.map((path: any) => ({ id: path.id, steps: path.steps, occurrenceCount: path.occurrenceCount, conversionCount: path.conversionCount }));
    context.segments = segments.map((segment: any) => ({ id: segment.id, name: segment.name }));
    context.citations.push(
      ...sessions.map((item: any) => ({ type: 'SESSION', id: item.id })),
      ...issues.map((item: any) => ({ type: 'BEHAVIOR_ISSUE', id: item.id })),
      ...runs.map((item: any) => ({ type: 'FUNNEL_RUN', id: item.id })),
      ...heatmaps.map((item: any) => ({ type: 'HEATMAP', id: item.id })),
    );
    const redactedContext = redactPII(context) as Record<string, any>;
    if (Buffer.byteLength(JSON.stringify(redactedContext), 'utf8') > MAX_AI_CONTEXT_BYTES) {
      return {
        tenantId: '[tenant-scoped]',
        siteId: redactedContext.siteId,
        filters: redactedContext.filters,
        source: redactedContext.source ? { type: redactedContext.source.type, id: redactedContext.source.id, note: 'Source context truncated for prompt safety.' } : undefined,
        sessions: (redactedContext.sessions || []).slice(0, 8),
        behaviorIssues: (redactedContext.behaviorIssues || []).slice(0, 8),
        behaviorSignals: (redactedContext.behaviorSignals || []).slice(0, 8),
        heatmaps: (redactedContext.heatmaps || []).slice(0, 3),
        funnelRuns: (redactedContext.funnelRuns || []).slice(0, 3),
        journeyPaths: (redactedContext.journeyPaths || []).slice(0, 5),
        segments: (redactedContext.segments || []).slice(0, 5),
        citations: redactedContext.citations || [],
        truncated: true,
      };
    }
    return redactedContext;
  }

  private async attachAiSourceContext(tenantId: string, sourceType: string, sourceId: string, context: Record<string, any>) {
    if (sourceType === 'SESSION') {
      const session = await db.websiteSession.findFirst({ where: { id: sourceId, tenantId }, include: { events: { orderBy: { createdAt: 'asc' }, take: 80 }, behaviorSignals: true, tags: true, recordings: { take: 1 } } });
      if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
      context.siteId ||= session.siteId;
      context.source = { type: sourceType, id: sourceId, session: this.safeSessionTimeline(session) };
      context.citations.push({ type: 'SESSION', id: sourceId });
    } else if (sourceType === 'RECORDING') {
      const recording = await db.websiteRecording.findFirst({ where: { id: sourceId, tenantId }, include: { session: { include: { events: { orderBy: { createdAt: 'asc' }, take: 80 }, behaviorSignals: true } } } });
      if (!recording) throw new NotFoundError('Recording not found', ErrorCodes.RESOURCE_NOT_FOUND);
      context.siteId ||= recording.siteId;
      context.source = { type: sourceType, id: sourceId, recording: { id: recording.id, durationMs: recording.durationMs, eventCount: recording.eventCount, session: this.safeSessionTimeline(recording.session) } };
      context.citations.push({ type: 'RECORDING', id: sourceId }, { type: 'SESSION', id: recording.sessionId });
    } else if (sourceType === 'BEHAVIOR_ISSUE') {
      const issue = await db.websiteIssueGroup.findFirst({ where: { id: sourceId, tenantId } });
      if (!issue) throw new NotFoundError('Behavior issue not found', ErrorCodes.RESOURCE_NOT_FOUND);
      context.siteId ||= issue.siteId;
      context.source = { type: sourceType, id: sourceId, issue };
      context.citations.push({ type: 'BEHAVIOR_ISSUE', id: sourceId });
    } else if (sourceType === 'FUNNEL_RUN') {
      const run = await db.websiteFunnelRun.findFirst({ where: { id: sourceId, tenantId }, include: { funnel: true } });
      if (!run) throw new NotFoundError('Website funnel run not found', ErrorCodes.RESOURCE_NOT_FOUND);
      context.siteId ||= run.siteId;
      context.source = { type: sourceType, id: sourceId, run };
      context.citations.push({ type: 'FUNNEL_RUN', id: sourceId });
    } else if (sourceType === 'HEATMAP') {
      const heatmap = await db.websiteHeatmapSnapshot.findFirst({ where: { id: sourceId, tenantId } });
      if (!heatmap) throw new NotFoundError('Heatmap snapshot not found', ErrorCodes.RESOURCE_NOT_FOUND);
      context.siteId ||= heatmap.siteId;
      context.source = { type: sourceType, id: sourceId, heatmap };
      context.citations.push({ type: 'HEATMAP', id: sourceId });
    } else if (sourceType === 'JOURNEY') {
      const journey = await db.websiteJourneyPath.findFirst({ where: { id: sourceId, tenantId } });
      if (!journey) throw new NotFoundError('Website journey path not found', ErrorCodes.RESOURCE_NOT_FOUND);
      context.siteId ||= journey.siteId;
      context.source = { type: sourceType, id: sourceId, journey };
      context.citations.push({ type: 'JOURNEY', id: sourceId });
    }
  }

  private safeSessionTimeline(session: any) {
    return {
      id: session?.id,
      entryUrl: session?.entryUrl,
      exitUrl: session?.exitUrl,
      durationMs: session?.durationMs,
      pageCount: session?.pageCount,
      eventCount: session?.eventCount,
      hasJsError: session?.hasJsError,
      tags: (session?.tags || []).map((tag: any) => tag.name),
      behaviorSignals: (session?.behaviorSignals || []).map((signal: any) => ({ id: signal.id, type: signal.type, severity: signal.severity, path: signal.path, selector: signal.selector })),
      events: (session?.events || []).filter((event: any) => ['page_view', 'custom_event', 'click', 'js_error', 'unhandled_rejection'].includes(event.type)).map((event: any) => ({
        id: event.id,
        type: event.type,
        path: event.path,
        title: event.title,
        selector: eventSelector(event),
        eventName: event.payload?.eventName,
        message: event.payload?.message,
        createdAt: event.createdAt,
      })),
    };
  }

  private async generateAiText(type: string, context: any, prompt: string) {
    const llm = await llmAdapterService.generate({
      systemPrompt: this.aiSystemPrompt(),
      userMessage: `${prompt}\nReturn JSON with title, summary, severity, confidence, recommendations.`,
      contextSummary: compactJson(context),
      maxTokens: 900,
      temperature: 0.25,
    });
    return llm?.text || '';
  }

  private aiSystemPrompt() {
    return `You are an AI analyst for Website Analytics inside Zodo CRM. Use only the supplied tenant-scoped context. Be concise, evidence-based, and actionable. Do not invent data. Do not expose PII. Cite source IDs in recommendations when possible. If data is insufficient, say so. Separate facts from recommendations.`;
  }

  private parseAiInsight(text: string, type: string, context: any) {
    try {
      const json = JSON.parse(text.replace(/^```json/i, '').replace(/```$/i, '').trim());
      return {
        title: cleanString(json.title, 160) || this.defaultAiTitle(type),
        summary: cleanString(json.summary, 3000) || this.deterministicAiAnswer(type, context),
        severity: cleanString(json.severity, 20)?.toUpperCase() || this.inferSeverity(context),
        confidence: Number(json.confidence || 0.72),
        recommendations: Array.isArray(json.recommendations) ? json.recommendations.slice(0, 8).map((item: any) => String(item).slice(0, 300)) : this.defaultRecommendations(context),
      };
    } catch {
      return {
        title: this.defaultAiTitle(type),
        summary: text || this.deterministicAiAnswer(type, context),
        severity: this.inferSeverity(context),
        confidence: llmAdapterService.isAvailable() ? 0.7 : 0.55,
        recommendations: this.defaultRecommendations(context),
      };
    }
  }

  private defaultAiTitle(type: string) {
    return type.toLowerCase().replace(/_/g, ' ').replace(/\b\w/g, (letter) => letter.toUpperCase());
  }

  private deterministicAiAnswer(prompt: string, context: any) {
    const issueCount = context.behaviorIssues?.length || 0;
    const sessionCount = context.sessions?.length || 0;
    const funnel = context.funnelRuns?.[0];
    const drop = funnel?.steps?.sort?.((a: any, b: any) => (b.dropOffs || 0) - (a.dropOffs || 0))?.[0];
    return [
      `Facts: ${sessionCount} recent sessions and ${issueCount} behavior issue groups are in the selected context.`,
      funnel ? `Latest funnel conversion rate is ${funnel.conversionRate}% from ${funnel.totalEntrants} entrants.` : null,
      drop ? `Largest funnel drop-off appears at "${drop.name}" with ${drop.dropOffs} drop-offs.` : null,
      context.source ? `Source reviewed: ${context.source.type} ${context.source.id}.` : null,
      'Recommendation: review high-severity behavior issues first, then inspect linked recordings for the highest-friction pages.',
    ].filter(Boolean).join('\n');
  }

  private inferSeverity(context: any) {
    if ((context.behaviorIssues || []).some((issue: any) => issue.severity === 'HIGH')) return 'HIGH';
    if ((context.behaviorSignals || []).some((signal: any) => signal.severity === 'HIGH')) return 'HIGH';
    return (context.behaviorIssues?.length || 0) > 3 ? 'MEDIUM' : 'LOW';
  }

  private defaultRecommendations(context: any) {
    const recs = ['Watch recordings tied to high-severity behavior signals.', 'Prioritize pages with repeated rage clicks, dead clicks, or JS errors.'];
    const funnel = context.funnelRuns?.[0];
    if (funnel) recs.push('Review the largest funnel drop-off step and compare sessions that converted versus dropped off.');
    if (context.heatmaps?.[0]) recs.push('Compare heatmap click concentration with the primary call-to-action placement.');
    return recs;
  }

  private activeSince() {
    return new Date(Date.now() - LIVE_ACTIVE_MS);
  }

  private async getActiveLiveStates(tenantId: string, query: Record<string, unknown> = {}) {
    const where: Record<string, any> = { tenantId, lastEventAt: { gte: this.activeSince() } };
    if (query.siteId) where.siteId = String(query.siteId);
    if (query.path) where.currentPath = this.stringMatch(query.path);
    if (query.page) where.currentPath = this.stringMatch(query.page);
    if (query.browser) where.browser = this.stringMatch(query.browser);
    if (query.device) where.device = this.stringMatch(query.device);
    if (query.country) where.country = this.stringMatch(query.country);
    if (query.hasJsError !== undefined) where.hasJsError = this.booleanFilter(query.hasJsError);
    if (query.hasBehaviorSignal !== undefined) where.hasBehaviorSignal = this.booleanFilter(query.hasBehaviorSignal);
    return db.websiteLiveSessionState.findMany({
      where,
      orderBy: { lastEventAt: 'desc' },
      take: Math.min(Number(query.limit || 100), 500),
      include: {
        site: { select: { id: true, name: true, domain: true } },
        session: { include: { recordings: { orderBy: { createdAt: 'desc' }, take: 1 }, visitor: { include: { identity: true } } } },
      },
    });
  }

  private normalizeIntegrationConfig(provider: string, value: unknown) {
    const config = safePublicPayload(value);
    if (provider === 'CUSTOM_WEBHOOK') {
      config.webhookUrl = validateWebhookUrl((config as any).webhookUrl);
      config.events = stringArray((config as any).events).length ? stringArray((config as any).events) : ['session.started', 'behavior.detected', 'js_error.detected'];
    }
    return config;
  }

  private normalizeSecretConfig(value: unknown) {
    const input = safePublicPayload(value);
    const output: Record<string, unknown> = {};
    for (const [key, raw] of Object.entries(input)) {
      output[key] = typeof raw === 'string' ? encryptSecret(raw) : raw;
    }
    return output;
  }

  private async createWebhookDelivery(integration: any, eventType: string, payload: Record<string, unknown>) {
    return db.websiteAnalyticsWebhookDelivery.create({
      data: { tenantId: integration.tenantId, integrationId: integration.id, eventType, payload: safePayload(payload), status: 'PENDING' },
    });
  }

  private async dispatchWebhookDelivery(integration: any, delivery: any) {
    if (integration.provider !== 'CUSTOM_WEBHOOK') {
      return db.websiteAnalyticsWebhookDelivery.update({ where: { id: delivery.id }, data: { status: 'SENT', attempts: { increment: 1 }, lastAttemptAt: new Date(), responseStatus: 200, responseBody: 'Setup instructions only for this provider.' } });
    }
    const webhookUrl = validateWebhookUrl(integration.config?.webhookUrl);
    const secret = decryptSecret(integration.secretConfig?.signingSecret || '');
    const body = JSON.stringify(delivery.payload || {});
    const headers: Record<string, string> = { 'Content-Type': 'application/json' };
    if (secret) headers['X-YS-Signature'] = crypto.createHmac('sha256', secret).update(body).digest('hex');
    try {
      const response = await fetch(webhookUrl, { method: 'POST', headers, body, signal: AbortSignal.timeout(5000) } as any);
      const text = await response.text().catch(() => '');
      return db.websiteAnalyticsWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status: response.ok ? 'SENT' : 'FAILED', attempts: { increment: 1 }, lastAttemptAt: new Date(), responseStatus: response.status, responseBody: text.slice(0, 1000) },
      });
    } catch (error: any) {
      return db.websiteAnalyticsWebhookDelivery.update({
        where: { id: delivery.id },
        data: { status: 'FAILED', attempts: { increment: 1 }, lastAttemptAt: new Date(), responseBody: String(error?.message || error).slice(0, 1000) },
      });
    }
  }

  private async findVisitorForPrivacy(tenantId: string, data: Record<string, unknown>) {
    const visitorId = cleanString(data.visitorId, 120);
    const externalUserId = cleanString(data.externalUserId, 200);
    let visitor = visitorId ? await db.websiteVisitor.findFirst({ where: { id: visitorId, tenantId } }) : null;
    if (!visitor && externalUserId) {
      const identity = await db.websiteVisitorIdentity.findFirst({ where: { tenantId, externalUserId }, include: { visitor: true } });
      visitor = identity?.visitor || null;
    }
    if (!visitor) throw new NotFoundError('Website visitor not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return visitor;
  }

  private async upsertLiveState(site: any, session: any, data: Record<string, unknown>) {
    const userAgent = cleanString(data.userAgent || session.userAgent, 1000);
    const parsed = parseUserAgent(userAgent);
    const currentUrl = cleanString(data.url || data.currentUrl || session.exitUrl || session.entryUrl, 2000);
    const currentPath = cleanString(data.path || data.currentPath, 1000) || this.pathFromUrl(currentUrl);
    const lastEventType = cleanString(data.lastEventType || data.type, 80);
    const hasJsError = Boolean(data.hasJsError || session.hasJsError || lastEventType === 'js_error' || lastEventType === 'unhandled_rejection');
    const stateData = {
      tenantId: site.tenantId,
      siteId: site.id,
      sessionId: session.id,
      visitorId: session.visitorId || null,
      currentUrl,
      currentPath,
      currentTitle: cleanString(data.title || data.currentTitle, 300),
      referrer: cleanString(data.referrer || session.referrer, 2000),
      browser: cleanString(data.browser || session.browser, 80) || parsed.browser,
      os: cleanString(data.os || session.os, 80) || parsed.os,
      device: cleanString(data.device || session.device, 80) || parsed.device,
      country: cleanString(data.country || session.country, 80),
      isRecording: Boolean(data.isRecording),
      lastEventType,
      lastEventAt: new Date(),
      startedAt: session.startedAt || new Date(),
      pageCount: Number(data.pageCount || session.pageCount || 0),
      eventCount: Number(data.eventCount || session.eventCount || 0),
      hasJsError,
      hasBehaviorSignal: Boolean(data.hasBehaviorSignal),
      metadata: safePayload(data.metadata),
    };
    return db.websiteLiveSessionState.upsert({
      where: { sessionId: session.id },
      create: stateData,
      update: {
        currentUrl: stateData.currentUrl,
        currentPath: stateData.currentPath,
        currentTitle: stateData.currentTitle,
        referrer: stateData.referrer,
        browser: stateData.browser,
        os: stateData.os,
        device: stateData.device,
        country: stateData.country,
        isRecording: stateData.isRecording,
        lastEventType: stateData.lastEventType,
        lastEventAt: stateData.lastEventAt,
        pageCount: stateData.pageCount,
        eventCount: stateData.eventCount,
        hasJsError: stateData.hasJsError,
        hasBehaviorSignal: data.hasBehaviorSignal === undefined ? undefined : stateData.hasBehaviorSignal,
        metadata: stateData.metadata,
      },
    });
  }

  private publishLive(type: string, tenantId: string, siteId: string, payload: Record<string, unknown>) {
    websiteAnalyticsLiveBroadcaster.publish({
      type,
      tenantId,
      siteId,
      payload: redactPII(payload) as Record<string, unknown>,
    });
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

  private enforcePublicPrivacy(site: any, data: Record<string, unknown>) {
    const privacy = defaultPrivacySettings(site.privacySettings || {});
    if (privacy.trackingEnabled === false) throw new ForbiddenError('Tracking is disabled for this site', ErrorCodes.AUTH_TOKEN_INVALID);
    if (privacy.consentMode === true && data.consent !== 'granted') throw new ForbiddenError('Consent is required before tracking', ErrorCodes.AUTH_TOKEN_INVALID);
    const allowed = stringArray(privacy.allowedDomains);
    if (allowed.length) {
      const host = hostnameFromUrl(data.url || data.entryUrl || data.currentUrl);
      const normalized = allowed.map((item) => item.replace(/^https?:\/\//i, '').replace(/^www\./i, '').toLowerCase());
      if (!host || !normalized.some((domain) => host === domain || host.endsWith(`.${domain}`))) {
        throw new ForbiddenError('Tracking origin is not allowed for this site', ErrorCodes.AUTH_TOKEN_INVALID);
      }
    }
    const blockedCountries = stringArray(privacy.blockedCountries).map((item) => item.toLowerCase());
    const country = cleanString(data.country, 80)?.toLowerCase();
    if (country && blockedCountries.includes(country)) throw new ForbiddenError('Tracking is blocked in this country', ErrorCodes.AUTH_TOKEN_INVALID);
    return privacy;
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
    const payload = safePayload(event.payload);
    if (type === 'identify') {
      delete (payload as any).email;
      if ((payload as any).traits) delete (payload as any).traits.email;
    }
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
      payload,
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

const TRACKER_SCRIPT = `(function(){try{if(window.__YSAnalytics)return;var pre=window.ysAnalytics&&window.ysAnalytics.q||[];window.__YSAnalytics=true;var s=document.currentScript;var key=s&&s.getAttribute("data-tracking-key");if(!key||localStorage.getItem("ys_analytics_opt_out")==="1")return;var base=(s&&s.src?s.src:"").replace(/\\/tracker\\.js.*$/,"");var anon=localStorage.getItem("ys_analytics_visitor");if(!anon){anon="v_"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("ys_analytics_visitor",anon)}var sk=sessionStorage.getItem("ys_analytics_session");if(!sk){sk="s_"+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem("ys_analytics_session",sk)}var q=[],rq=[],timer=null,rtimer=null,rseq=1,recording=false,recordingId=null,privacy={recordingsEnabled:true,maskAllInputs:true,respectDoNotTrack:true,maskSelectors:[],blockSelectors:[]};function post(url,payload,beacon){var body=JSON.stringify(payload);if(beacon&&navigator.sendBeacon){try{if(navigator.sendBeacon(url,new Blob([body],{type:"application/json"})))return Promise.resolve({})}catch(_){}}return fetch(url,{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:!!beacon}).then(function(r){return r.json().catch(function(){return{}})}).catch(function(){return{}})}function safe(o){var out={},n=0;if(!o||typeof o!=="object")return out;Object.keys(o).slice(0,40).forEach(function(k){if(k==="__proto__"||k==="constructor"||k==="prototype")return;var v=o[k];if(typeof v==="string")out[k]=v.slice(0,500);else if(typeof v==="number"||typeof v==="boolean"||v===null)out[k]=v;else if(v&&typeof v==="object"&&n++<10)out[k]=safe(v)});return out}function meta(el){if(!el||!el.tagName)return{};var tag=String(el.tagName).toLowerCase();var safeText=!/input|textarea|select/i.test(tag)&&!el.isContentEditable;var text=safeText?(el.innerText||el.textContent||"").replace(/\\s+/g," ").trim().slice(0,80):"";return{tagName:tag,id:el.id||"",className:String(el.className||"").slice(0,160),role:el.getAttribute("role")||"",ariaLabel:el.getAttribute("aria-label")||"",text:text}}function device(){return /Mobi|Android|iPhone|iPod/i.test(navigator.userAgent)?"Mobile":/iPad|Tablet/i.test(navigator.userAgent)?"Tablet":"Desktop"}function docH(){return Math.max(document.documentElement.scrollHeight,document.body.scrollHeight,document.documentElement.offsetHeight,document.body.offsetHeight,innerHeight)}function common(e){return Object.assign({trackingKey:key,anonymousId:anon,sessionKey:sk,url:location.href,path:location.pathname,title:document.title,referrer:document.referrer,viewportWidth:innerWidth,viewportHeight:innerHeight,userAgent:navigator.userAgent,device:device()},e||{})}function send(events,beacon){if(!events.length)return;post(base+"/collect",common({events:events}),beacon)}function flush(){var batch=q.splice(0,50);send(batch,false);if(q.length)schedule()}function schedule(){if(timer)return;timer=setTimeout(function(){timer=null;flush()},1500)}function push(e){var now=new Date().toISOString();e=e||{};e.payload=Object.assign({clientTime:now},e.payload||{});q.push(Object.assign({createdAt:now},e));schedule()}function api(method,a,b){if(method==="event")push({type:"custom_event",payload:{eventName:String(a||"").slice(0,120),data:safe(b)}});if(method==="identify")push({type:"identify",externalUserId:String(a||"").slice(0,200),payload:{traits:safe(b)}});if(method==="tag")push({type:"session_tag",name:String(a||"").slice(0,80),payload:safe(b)})}window.ysAnalytics=api;for(var pi=0;pi<pre.length;pi++)api.apply(null,pre[pi]);function page(nav){push({type:"page_view",url:location.href,path:location.pathname,title:document.title,payload:{navigationType:nav||"load"}})}function flushRecording(beacon){if(!recording||!rq.length)return;var batch=rq.splice(0,300);post(base+"/recordings/chunk",common({recordingId:recordingId,sequence:rseq++,events:batch}),beacon)}function scheduleRecording(){if(rtimer)return;rtimer=setTimeout(function(){rtimer=null;flushRecording(false)},3000)}function loadScript(src,cb){var el=document.createElement("script");el.async=true;el.src=src;el.onload=cb;el.onerror=function(){};(document.head||document.documentElement).appendChild(el)}function startRecording(){if(recording||privacy.recordingsEnabled===false)return;if(privacy.respectDoNotTrack!==false&&(navigator.doNotTrack==="1"||window.doNotTrack==="1"))return;post(base+"/recordings/start",common({metadata:{source:"tracker"}}),false).then(function(res){recording=true;recordingId=res.data&&res.data.id||res.id||null;function begin(){if(!window.rrweb||!window.rrweb.record)return;window.rrweb.record({emit:function(ev){rq.push(ev);if(rq.length>=120)flushRecording(false);else scheduleRecording()},maskAllInputs:privacy.maskAllInputs!==false,maskInputOptions:{password:true,email:true,tel:true,text:privacy.maskAllInputs!==false},maskTextSelector:'[data-ys-mask],'+(privacy.maskSelectors||[]).join(','),blockSelector:'[data-ys-ignore],'+(privacy.blockSelectors||[]).join(',')})}if(window.rrweb&&window.rrweb.record)begin();else loadScript(base+"/vendor/rrweb-record.js",begin)})}post(base+"/session/start",common({url:location.href}),false).then(function(res){var site=res.data&&res.data.site||res.site;if(site&&site.privacySettings)privacy=Object.assign(privacy,site.privacySettings);startRecording()});page("load");["pushState","replaceState"].forEach(function(n){var o=history[n];history[n]=function(){var r=o.apply(this,arguments);setTimeout(function(){page("history")},0);return r}});addEventListener("popstate",function(){page("popstate")});addEventListener("click",function(e){push({type:"click",x:e.clientX,y:e.clientY,payload:{element:meta(e.target)}})},true);var lastScroll=0,lastScrollY=scrollY;addEventListener("scroll",function(){var now=Date.now();if(now-lastScroll<1200)return;var direction=scrollY>lastScrollY?"down":scrollY<lastScrollY?"up":"none";lastScrollY=scrollY;lastScroll=now;push({type:"scroll",scrollY:scrollY,payload:{depth:Math.round((scrollY+innerHeight)/Math.max(docH(),1)*100),documentHeight:docH(),direction:direction}})},{passive:true});var lastMove=0;addEventListener("mousemove",function(e){var now=Date.now();if(now-lastMove<2000)return;lastMove=now;push({type:"mouse_move",x:e.clientX,y:e.clientY,payload:{clientX:e.clientX,clientY:e.clientY}})},{passive:true});addEventListener("error",function(e){push({type:"js_error",payload:{message:String(e.message||"").slice(0,300),source:e.filename||"",line:e.lineno||0,column:e.colno||0,stack:String(e.error&&e.error.stack||"").slice(0,1000)}})});addEventListener("unhandledrejection",function(e){push({type:"unhandled_rejection",payload:{message:String(e.reason&&e.reason.message||e.reason||"").slice(0,300),stack:String(e.reason&&e.reason.stack||"").slice(0,1000)}})});function endAll(){send(q.splice(0,50),true);flushRecording(true);post(base+"/recordings/end",common({recordingId:recordingId}),true);post(base+"/session/end",common({url:location.href}),true)}addEventListener("pagehide",endAll);addEventListener("beforeunload",endAll)}catch(_){}})();`;

export const websiteAnalyticsService = new WebsiteAnalyticsService();
