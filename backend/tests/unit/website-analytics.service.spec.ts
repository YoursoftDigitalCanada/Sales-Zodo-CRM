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
    websiteRecording: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteRecordingChunk: {
      findMany: jest.fn(),
      upsert: jest.fn(),
      aggregate: jest.fn(),
    },
    websiteHeatmapSnapshot: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    websiteHeatmapPoint: {
      findMany: jest.fn(),
      createMany: jest.fn(),
    },
    websiteBehaviorSignal: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteIssueGroup: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      upsert: jest.fn(),
      update: jest.fn(),
    },
  },
}));

process.env.RECORDING_STORAGE_PATH = '/private/tmp/ys-recording-tests';

import { prisma } from '../../src/config/database';
import { websiteAnalyticsService } from '../../src/modules/website-analytics/website-analytics.service';
import { recordingStorageService } from '../../src/modules/website-analytics/recording-storage.service';

const db = prisma as any;

describe('WebsiteAnalyticsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    db.websiteSession.count.mockResolvedValue(0);
    db.websiteVisitor.count.mockResolvedValue(0);
    db.websiteEvent.count.mockResolvedValue(0);
    db.websiteSession.aggregate.mockResolvedValue({ _avg: { durationMs: 0 } });
    db.websiteRecordingChunk.aggregate.mockResolvedValue({ _sum: { eventCount: 0, sizeBytes: 0 } });
    db.websiteHeatmapPoint.createMany.mockResolvedValue({ count: 0 });
    db.websiteBehaviorSignal.findMany.mockResolvedValue([]);
    db.websiteBehaviorSignal.findFirst.mockResolvedValue(null);
    db.websiteBehaviorSignal.create.mockImplementation(async ({ data }: any) => ({ id: `signal-${data.type}`, ...data }));
    db.websiteBehaviorSignal.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteIssueGroup.findMany.mockResolvedValue([]);
    db.websiteIssueGroup.findFirst.mockResolvedValue(null);
    db.websiteIssueGroup.upsert.mockImplementation(async ({ create, update }: any) => ({ id: 'issue-1', ...create, ...update }));
    db.websiteIssueGroup.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
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

  it('recording start creates a tenant-scoped recording', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', trackingKey: 'ys_key', isActive: true, privacySettings: { recordingsEnabled: true } });
    db.websiteSession.findFirst.mockResolvedValue({ id: 'session-1', tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1', sessionKey: 'session-123' });
    db.websiteRecording.findFirst.mockResolvedValue(null);
    db.websiteRecording.create.mockResolvedValue({ id: 'recording-1', tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', status: 'RECORDING' });

    await websiteAnalyticsService.startRecording({ trackingKey: 'ys_key', sessionKey: 'session-123' });

    expect(db.websiteRecording.create).toHaveBeenCalledWith({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', visitorId: 'visitor-1', status: 'RECORDING' }),
    });
  });

  it('chunk upload rejects invalid trackingKey', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue(null);

    await expect(websiteAnalyticsService.uploadRecordingChunk({
      trackingKey: 'bad',
      sessionKey: 'session-123',
      sequence: 1,
      events: [{ type: 2 }],
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('chunk upload rejects a session from another site', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', trackingKey: 'ys_key', isActive: true });
    db.websiteSession.findFirst.mockResolvedValue(null);

    await expect(websiteAnalyticsService.uploadRecordingChunk({
      trackingKey: 'ys_key',
      sessionKey: 'session-other',
      sequence: 1,
      events: [{ type: 2 }],
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('chunk upload writes gzipped file and metadata row', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', trackingKey: 'ys_key', isActive: true });
    db.websiteSession.findFirst.mockResolvedValue({ id: 'session-1', tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1', sessionKey: 'session-123' });
    db.websiteRecording.findFirst.mockResolvedValue({ id: 'recording-1', tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', eventCount: 0 });
    db.websiteRecordingChunk.upsert.mockResolvedValue({ id: 'chunk-1' });
    db.websiteRecordingChunk.aggregate.mockResolvedValue({ _sum: { eventCount: 1, sizeBytes: 80 } });
    db.websiteRecording.update.mockResolvedValue({});

    const result = await websiteAnalyticsService.uploadRecordingChunk({
      trackingKey: 'ys_key',
      sessionKey: 'session-123',
      sequence: 1,
      events: [{ type: 2, data: { href: 'https://example.com' } }],
    });

    expect(db.websiteRecordingChunk.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', recordingId: 'recording-1', sessionId: 'session-1', sequence: 1, storagePath: expect.stringMatching(/chunk-000001\.json\.gz$/) }),
    }));
    const storagePath = db.websiteRecordingChunk.upsert.mock.calls[0][0].create.storagePath;
    await expect(recordingStorageService.readChunk(storagePath)).resolves.toHaveLength(1);
    expect(result.accepted).toBe(1);
  });

  it('protected recordings list only returns current tenant recordings', async () => {
    db.websiteRecording.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.listRecordings('tenant-1', { siteId: 'site-1', isFavorite: 'true' });
    expect(db.websiteRecording.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', isFavorite: true }),
    }));
  });

  it('chunks endpoint cannot read another tenant recording', async () => {
    db.websiteRecording.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.getRecordingChunks('recording-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteRecording.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'recording-1', tenantId: 'tenant-2' } }));
  });

  it('favorite and labels cannot mutate another tenant recording', async () => {
    db.websiteRecording.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.setRecordingFavorite('recording-1', 'tenant-2', { isFavorite: true })).rejects.toMatchObject({ statusCode: 404 });
    await expect(websiteAnalyticsService.setRecordingLabels('recording-1', 'tenant-2', { labels: ['Hot'] })).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteRecording.update).not.toHaveBeenCalled();
  });

  it('share token works only when enabled', async () => {
    db.websiteRecording.findFirst.mockResolvedValueOnce({ id: 'recording-1', shareEnabled: true, shareToken: 'token-1' });
    await expect(websiteAnalyticsService.getSharedRecording('token-1')).resolves.toMatchObject({ id: 'recording-1' });
    db.websiteRecording.findFirst.mockResolvedValueOnce(null);
    await expect(websiteAnalyticsService.getSharedRecording('token-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('payload size limit is enforced for recording chunks', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', trackingKey: 'ys_key', isActive: true });
    db.websiteSession.findFirst.mockResolvedValue({ id: 'session-1', tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1', sessionKey: 'session-123' });
    db.websiteRecording.findFirst.mockResolvedValue({ id: 'recording-1', tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', eventCount: 0 });

    await expect(websiteAnalyticsService.uploadRecordingChunk({
      trackingKey: 'ys_key',
      sessionKey: 'session-123',
      sequence: 1,
      events: [{ type: 2, data: 'x'.repeat(recordingStorageService.maxChunkBytes) }],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('heatmap snapshot creation is tenant-scoped and only uses current tenant events', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', domain: 'example.com' });
    db.websiteHeatmapSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    db.websiteEvent.findMany.mockResolvedValue([]);
    db.websiteHeatmapSnapshot.update.mockResolvedValue({ id: 'snapshot-1', tenantId: 'tenant-1', siteId: 'site-1', status: 'READY' });

    await websiteAnalyticsService.createHeatmapSnapshot('tenant-1', {
      siteId: 'site-1',
      path: '/pricing',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-13T00:00:00.000Z',
    });

    expect(db.websiteAnalyticsSite.findFirst).toHaveBeenCalledWith({ where: { id: 'site-1', tenantId: 'tenant-1' } });
    expect(db.websiteEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', path: '/pricing' }),
    }));
  });

  it('one tenant cannot read another tenant heatmap snapshot', async () => {
    db.websiteHeatmapSnapshot.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.getHeatmapSnapshot('snapshot-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteHeatmapSnapshot.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'snapshot-1', tenantId: 'tenant-2' } }));
  });

  it('heatmap points endpoint is tenant-scoped', async () => {
    db.websiteHeatmapSnapshot.findFirst.mockResolvedValue({ id: 'snapshot-1', tenantId: 'tenant-1' });
    db.websiteHeatmapPoint.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.getHeatmapPoints('snapshot-1', 'tenant-1', { type: 'click' });
    expect(db.websiteHeatmapPoint.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { snapshotId: 'snapshot-1', tenantId: 'tenant-1', type: 'CLICK' },
    }));
  });

  it('click aggregation normalizes coordinates', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', domain: 'example.com' });
    db.websiteHeatmapSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    db.websiteEvent.findMany.mockResolvedValue([
      { id: 'event-1', tenantId: 'tenant-1', siteId: 'site-1', type: 'click', path: '/pricing', x: 50, y: 100, viewportWidth: 100, viewportHeight: 200, payload: { element: { id: 'buy' } }, createdAt: new Date() },
    ]);
    db.websiteHeatmapSnapshot.update.mockResolvedValue({ id: 'snapshot-1', clickCount: 1 });

    await websiteAnalyticsService.createHeatmapSnapshot('tenant-1', {
      siteId: 'site-1',
      path: '/pricing',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-13T00:00:00.000Z',
    });

    expect(db.websiteHeatmapPoint.createMany).toHaveBeenCalledWith({
      data: [expect.objectContaining({ type: 'CLICK', normalizedX: 0.5, normalizedY: 0.5, selector: '#buy' })],
    });
  });

  it('scroll aggregation calculates max and average scroll depth', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', domain: 'example.com' });
    db.websiteHeatmapSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    db.websiteEvent.findMany.mockResolvedValue([
      { id: 'event-1', type: 'scroll', scrollY: 100, viewportHeight: 100, payload: { documentHeight: 400 }, createdAt: new Date() },
      { id: 'event-2', type: 'scroll', scrollY: 300, viewportHeight: 100, payload: { documentHeight: 400 }, createdAt: new Date() },
    ]);
    db.websiteHeatmapSnapshot.update.mockResolvedValue({ id: 'snapshot-1' });

    await websiteAnalyticsService.createHeatmapSnapshot('tenant-1', {
      siteId: 'site-1',
      path: '/pricing',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-13T00:00:00.000Z',
    });

    expect(db.websiteHeatmapSnapshot.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ maxScrollDepth: 100, avgScrollDepth: 75 }),
    }));
  });

  it('device filter is applied during heatmap aggregation', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', domain: 'example.com' });
    db.websiteHeatmapSnapshot.create.mockResolvedValue({ id: 'snapshot-1' });
    db.websiteEvent.findMany.mockResolvedValue([]);
    db.websiteHeatmapSnapshot.update.mockResolvedValue({ id: 'snapshot-1' });

    await websiteAnalyticsService.createHeatmapSnapshot('tenant-1', {
      siteId: 'site-1',
      path: '/pricing',
      deviceType: 'mobile',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-13T00:00:00.000Z',
    });

    expect(db.websiteEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ session: { device: { equals: 'mobile', mode: 'insensitive' } } }),
    }));
  });

  it('invalid heatmap siteId and date inputs are rejected', async () => {
    await expect(websiteAnalyticsService.createHeatmapSnapshot('tenant-1', {
      path: '/pricing',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-13T00:00:00.000Z',
    })).rejects.toMatchObject({ statusCode: 400 });

    await expect(websiteAnalyticsService.createHeatmapSnapshot('tenant-1', {
      siteId: 'site-1',
      path: '/pricing',
      dateFrom: 'bad',
      dateTo: '2026-05-13T00:00:00.000Z',
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  const sessionWithEvents = (events: any[]) => ({
    id: 'session-1',
    tenantId: 'tenant-1',
    siteId: 'site-1',
    visitorId: 'visitor-1',
    entryUrl: 'https://example.com',
    events,
    recordings: [{ id: 'recording-1' }],
  });

  it('detects rage clicks', async () => {
    const base = new Date('2026-05-13T10:00:00.000Z').getTime();
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([
      { id: 'click-1', type: 'click', url: 'https://example.com/pricing', path: '/pricing', x: 120, y: 80, createdAt: new Date(base), payload: { element: { id: 'buy' } } },
      { id: 'click-2', type: 'click', url: 'https://example.com/pricing', path: '/pricing', x: 122, y: 83, createdAt: new Date(base + 300), payload: { element: { id: 'buy' } } },
      { id: 'click-3', type: 'click', url: 'https://example.com/pricing', path: '/pricing', x: 125, y: 84, createdAt: new Date(base + 900), payload: { element: { id: 'buy' } } },
    ]));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', type: 'RAGE_CLICK', severity: 'LOW', selector: '#buy', recordingId: 'recording-1' }),
    }));
  });

  it('detects dead clicks', async () => {
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([
      { id: 'click-1', type: 'click', url: 'https://example.com/pricing', path: '/pricing', x: 50, y: 40, createdAt: new Date(), payload: { element: { tagName: 'button', id: 'start-demo' } } },
    ]));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'DEAD_CLICK', severity: 'MEDIUM', selector: '#start-demo' }),
    }));
  });

  it('detects quick backs', async () => {
    const base = new Date('2026-05-13T10:00:00.000Z').getTime();
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([
      { id: 'pv-1', type: 'page_view', url: 'https://example.com/', path: '/', createdAt: new Date(base) },
      { id: 'pv-2', type: 'page_view', url: 'https://example.com/pricing', path: '/pricing', createdAt: new Date(base + 1000) },
      { id: 'pv-3', type: 'page_view', url: 'https://example.com/', path: '/', createdAt: new Date(base + 2200) },
    ]));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'QUICK_BACK', severity: 'HIGH' }),
    }));
  });

  it('detects excessive scrolling', async () => {
    const base = new Date('2026-05-13T10:00:00.000Z').getTime();
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([100, 700, 120, 900, 150, 1000].map((scrollY, index) => ({
      id: `scroll-${index}`,
      type: 'scroll',
      url: 'https://example.com/features',
      path: '/features',
      scrollY,
      createdAt: new Date(base + index * 1000),
      payload: { documentHeight: 2000 },
    }))));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'EXCESSIVE_SCROLL', severity: 'MEDIUM' }),
    }));
  });

  it('creates JS error signals and issue groups', async () => {
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([
      { id: 'err-1', type: 'js_error', url: 'https://example.com/pricing', path: '/pricing', createdAt: new Date(), payload: { message: 'Cannot read properties of undefined', stack: 'stack' } },
    ]));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'JS_ERROR', severity: 'HIGH', message: 'Cannot read properties of undefined' }),
    }));
    expect(db.websiteIssueGroup.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', type: 'JS_ERROR' }),
    }));
  });

  it('detects broken interactions', async () => {
    const base = new Date('2026-05-13T10:00:00.000Z').getTime();
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([
      { id: 'click-1', type: 'click', url: 'https://example.com/signup', path: '/signup', x: 10, y: 20, createdAt: new Date(base), payload: { element: { tagName: 'button', id: 'submit' } } },
      { id: 'err-1', type: 'js_error', url: 'https://example.com/signup', path: '/signup', createdAt: new Date(base + 800), payload: { message: 'Submit failed' } },
    ]));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'BROKEN_INTERACTION', severity: 'HIGH', selector: '#submit' }),
    }));
  });

  it('does not duplicate identical behavior signals when detection reruns', async () => {
    db.websiteBehaviorSignal.findFirst.mockResolvedValue({ id: 'existing-signal' });
    db.websiteSession.findFirst.mockResolvedValue(sessionWithEvents([
      { id: 'err-1', type: 'js_error', url: 'https://example.com/pricing', path: '/pricing', createdAt: new Date(), payload: { message: 'Boom' } },
    ]));

    await websiteAnalyticsService.analyzeSession('session-1', 'tenant-1');

    expect(db.websiteBehaviorSignal.create).not.toHaveBeenCalled();
    expect(db.websiteBehaviorSignal.update).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'existing-signal' } }));
  });

  it('one tenant cannot read another tenant behavior signal or issue', async () => {
    db.websiteBehaviorSignal.findFirst.mockResolvedValueOnce(null);
    await expect(websiteAnalyticsService.getBehaviorSignal('signal-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteBehaviorSignal.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'signal-1', tenantId: 'tenant-2' } }));

    db.websiteIssueGroup.findFirst.mockResolvedValueOnce(null);
    await expect(websiteAnalyticsService.getBehaviorIssue('issue-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteIssueGroup.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'issue-1', tenantId: 'tenant-2' } }));
  });

  it('issue status cannot be changed by another tenant', async () => {
    db.websiteIssueGroup.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.updateBehaviorIssueStatus('issue-1', 'tenant-2', { status: 'RESOLVED' })).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteIssueGroup.update).not.toHaveBeenCalled();
  });

  it('manual session analyze rejects cross-tenant sessions', async () => {
    db.websiteSession.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.analyzeSession('session-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteSession.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'session-1', tenantId: 'tenant-2' } }));
  });
});
