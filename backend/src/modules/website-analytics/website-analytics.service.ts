import crypto from 'crypto';
import { prisma } from '../../config/database';
import { BadRequestError, ForbiddenError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';

const db = prisma as any;
const MAX_EVENTS_PER_BATCH = 50;
const MAX_BODY_BYTES = 120_000;
const MAX_PAYLOAD_BYTES = 20_000;

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
        privacySettings: safePayload(data.privacySettings, { maskInputs: true }),
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
    if (data.privacySettings !== undefined) update.privacySettings = safePayload(data.privacySettings, { maskInputs: true });
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
    return { siteId: site.id, tenantId: site.tenantId, visitorId: visitor.id, sessionId: session.id, sessionKey };
  }

  async endSession(data: Record<string, unknown>) {
    const site = await this.getActiveSite(data.trackingKey);
    const sessionKey = this.requirePublicId(data.sessionKey, 'sessionKey');
    const session = await db.websiteSession.findFirst({ where: { sessionKey, siteId: site.id } });
    if (!session) throw new NotFoundError('Website session not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const endedAt = new Date();
    return db.websiteSession.update({
      where: { id: session.id },
      data: {
        endedAt,
        durationMs: duration(session.startedAt, endedAt),
        exitUrl: cleanString(data.url || data.exitUrl, 2000) || session.exitUrl,
      },
    });
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
    return { accepted: events.length, siteId: site.id, sessionId: sessionStart.sessionId };
  }

  trackerScript() {
    return TRACKER_SCRIPT;
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
      createdAt: event.createdAt ? new Date(String(event.createdAt)) : new Date(),
    };
  }
}

const TRACKER_SCRIPT = `(function(){try{if(window.__YSAnalytics)return;window.__YSAnalytics=true;var s=document.currentScript;var key=s&&s.getAttribute("data-tracking-key");if(!key||localStorage.getItem("ys_analytics_opt_out")==="1")return;var base=(s&&s.src?s.src:"").replace(/\\/tracker\\.js.*$/,"");var anon=localStorage.getItem("ys_analytics_visitor");if(!anon){anon="v_"+Math.random().toString(36).slice(2)+Date.now().toString(36);localStorage.setItem("ys_analytics_visitor",anon)}var sk=sessionStorage.getItem("ys_analytics_session");if(!sk){sk="s_"+Math.random().toString(36).slice(2)+Date.now().toString(36);sessionStorage.setItem("ys_analytics_session",sk)}var q=[];var timer=null;function meta(el){if(!el||!el.tagName)return{};var tag=String(el.tagName).toLowerCase();var safe=!/input|textarea|select/i.test(tag)&&!el.isContentEditable;var text=safe?(el.innerText||el.textContent||"").replace(/\\s+/g," ").trim().slice(0,80):"";return{tagName:tag,id:el.id||"",className:String(el.className||"").slice(0,160),text:text}}function common(e){return Object.assign({trackingKey:key,anonymousId:anon,sessionKey:sk,url:location.href,path:location.pathname,title:document.title,referrer:document.referrer,viewportWidth:innerWidth,viewportHeight:innerHeight,userAgent:navigator.userAgent},e||{})}function send(events,beacon){if(!events.length)return;var body=JSON.stringify(common({events:events}));if(beacon&&navigator.sendBeacon){try{var ok=navigator.sendBeacon(base+"/collect",new Blob([body],{type:"application/json"}));if(ok)return}catch(_){}}fetch(base+"/collect",{method:"POST",headers:{"Content-Type":"application/json"},body:body,keepalive:true}).catch(function(){})}function flush(){var batch=q.splice(0,50);send(batch,false);if(q.length)schedule()}function schedule(){if(timer)return;timer=setTimeout(function(){timer=null;flush()},1500)}function push(e){q.push(Object.assign({createdAt:new Date().toISOString()},e));schedule()}function page(){push({type:"page_view",url:location.href,path:location.pathname,title:document.title})}fetch(base+"/session/start",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(common({url:location.href})),keepalive:true}).catch(function(){});page();["pushState","replaceState"].forEach(function(n){var o=history[n];history[n]=function(){var r=o.apply(this,arguments);setTimeout(page,0);return r}});addEventListener("popstate",page);addEventListener("click",function(e){push({type:"click",x:e.clientX,y:e.clientY,payload:{element:meta(e.target)}})},true);var lastScroll=0;addEventListener("scroll",function(){var now=Date.now();if(now-lastScroll<1200)return;lastScroll=now;push({type:"scroll",scrollY:scrollY,payload:{depth:Math.round((scrollY+innerHeight)/Math.max(document.body.scrollHeight,1)*100)}})},{passive:true});var lastMove=0;addEventListener("mousemove",function(e){var now=Date.now();if(now-lastMove<2000)return;lastMove=now;push({type:"mouse_move",x:e.clientX,y:e.clientY})},{passive:true});addEventListener("error",function(e){push({type:"js_error",payload:{message:String(e.message||"").slice(0,300),source:e.filename||"",line:e.lineno||0,column:e.colno||0}})});addEventListener("unhandledrejection",function(e){push({type:"unhandled_rejection",payload:{message:String(e.reason&&e.reason.message||e.reason||"").slice(0,300)}})});addEventListener("beforeunload",function(){send(q.splice(0,50),true);navigator.sendBeacon&&navigator.sendBeacon(base+"/session/end",new Blob([JSON.stringify(common({url:location.href}))],{type:"application/json"}))})}catch(_){}})();`;

export const websiteAnalyticsService = new WebsiteAnalyticsService();
