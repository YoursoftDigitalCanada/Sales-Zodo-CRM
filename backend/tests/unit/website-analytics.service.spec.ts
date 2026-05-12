jest.mock('../../src/config/database', () => ({
  prisma: {
    websiteAnalyticsSite: {
      findMany: jest.fn(),
      create: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      update: jest.fn(),
      count: jest.fn(),
    },
    websiteVisitor: {
      count: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
    websiteSession: {
      count: jest.fn(),
      findMany: jest.fn(),
      findFirst: jest.fn(),
      findUnique: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      aggregate: jest.fn(),
    },
    websiteEvent: {
      count: jest.fn(),
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
  },
}));

import { prisma } from '../../src/config/database';
import { websiteAnalyticsService } from '../../src/modules/website-analytics/website-analytics.service';

const db = prisma as any;

describe('WebsiteAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.websiteSession.count.mockResolvedValue(0);
    db.websiteVisitor.count.mockResolvedValue(0);
    db.websiteEvent.count.mockResolvedValue(0);
    db.websiteSession.aggregate.mockResolvedValue({ _avg: { durationMs: 0 } });
  });

  it('creates a site under the trusted tenant and ignores spoofed tenantId', async () => {
    db.websiteAnalyticsSite.create.mockResolvedValue({
      id: 'site-1',
      tenantId: 'tenant-real',
      name: 'Main Site',
      domain: 'example.com',
      trackingKey: 'ys_key',
      isActive: true,
      privacySettings: {},
    });

    const result = await websiteAnalyticsService.createSite('tenant-real', {
      tenantId: 'tenant-spoof',
      name: 'Main Site',
      domain: 'https://www.example.com/pricing',
    });

    expect(db.websiteAnalyticsSite.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-real',
        domain: 'example.com',
      }),
    }));
    expect(result.tenantId).toBe('tenant-real');
  });

  it('filters site/session/event reads by tenant', async () => {
    db.websiteAnalyticsSite.findMany.mockResolvedValue([]);
    db.websiteSession.findMany.mockResolvedValue([]);
    db.websiteEvent.findMany.mockResolvedValue([]);

    await websiteAnalyticsService.listSites('tenant-1');
    await websiteAnalyticsService.listSessions('tenant-1', { siteId: 'site-1' });
    await websiteAnalyticsService.listEvents('tenant-1', { sessionId: 'session-1' });

    expect(db.websiteAnalyticsSite.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1' } }));
    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1', siteId: 'site-1' } }));
    expect(db.websiteEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1', sessionId: 'session-1' } }));
  });

  it('rejects public collect with an invalid tracking key', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue(null);

    await expect(websiteAnalyticsService.collect({
      trackingKey: 'missing-key',
      anonymousId: 'visitor-123',
      sessionKey: 'session-123',
      events: [{ type: 'page_view', url: 'https://example.com' }],
    })).rejects.toMatchObject({
      statusCode: 403,
      message: 'Unknown tracking key',
    });
  });

  it('public collect creates/updates visitor, session, and events for the site tenant', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue({
      id: 'site-1',
      tenantId: 'tenant-1',
      trackingKey: 'ys_key',
      isActive: true,
    });
    db.websiteVisitor.upsert.mockResolvedValue({ id: 'visitor-1' });
    db.websiteSession.create.mockResolvedValue({ id: 'session-1', hasJsError: false });
    db.websiteSession.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'session-1', siteId: 'site-1', visitorId: 'visitor-1', hasJsError: false });
    db.websiteEvent.createMany.mockResolvedValue({ count: 2 });
    db.websiteSession.update.mockResolvedValue({});
    db.websiteVisitor.update.mockResolvedValue({});

    const result = await websiteAnalyticsService.collect({
      trackingKey: 'ys_key',
      anonymousId: 'visitor-123',
      sessionKey: 'session-123',
      url: 'https://example.com',
      events: [
        { type: 'page_view', url: 'https://example.com', path: '/' },
        { type: 'click', url: 'https://example.com', x: 10, y: 20, payload: { element: { tagName: 'button' } } },
      ],
    });

    expect(db.websiteVisitor.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', anonymousId: 'visitor-123' }),
    }));
    expect(db.websiteSession.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1' }),
    }));
    expect(db.websiteEvent.createMany).toHaveBeenCalledWith({
      data: expect.arrayContaining([
        expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', type: 'page_view' }),
        expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', type: 'click' }),
      ]),
    });
    expect(result.accepted).toBe(2);
  });
});
