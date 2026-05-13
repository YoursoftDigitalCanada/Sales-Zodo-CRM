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
      findFirst: jest.fn(),
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
    websiteAnalyticsSegment: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      updateMany: jest.fn(),
      delete: jest.fn(),
    },
    websiteSessionTag: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      delete: jest.fn(),
    },
    websiteVisitorIdentity: {
      upsert: jest.fn(),
    },
    websiteFunnel: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
      delete: jest.fn(),
    },
    websiteFunnelRun: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteJourneyPath: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websitePathAggregate: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteAiInsight: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteAiConversation: {
      findMany: jest.fn(),
      findFirst: jest.fn(),
      create: jest.fn(),
      update: jest.fn(),
    },
    websiteAiMessage: {
      findMany: jest.fn(),
      create: jest.fn(),
    },
  },
}));

process.env.RECORDING_STORAGE_PATH = '/private/tmp/ys-recording-tests';

jest.mock('../../src/modules/copilot/llm-adapter.service', () => ({
  llmAdapterService: {
    isAvailable: jest.fn(() => true),
    generate: jest.fn(async () => ({
      text: JSON.stringify({
        title: 'AI Insight',
        summary: 'Evidence-based summary',
        severity: 'MEDIUM',
        confidence: 0.82,
        recommendations: ['Review high-friction pages'],
      }),
      model: 'mock',
      tokensUsed: 20,
    })),
  },
}));

import { prisma } from '../../src/config/database';
import { llmAdapterService } from '../../src/modules/copilot/llm-adapter.service';
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
    db.websiteHeatmapSnapshot.findMany.mockResolvedValue([]);
    db.websiteHeatmapPoint.createMany.mockResolvedValue({ count: 0 });
    db.websiteBehaviorSignal.findMany.mockResolvedValue([]);
    db.websiteBehaviorSignal.findFirst.mockResolvedValue(null);
    db.websiteBehaviorSignal.create.mockImplementation(async ({ data }: any) => ({ id: `signal-${data.type}`, ...data }));
    db.websiteBehaviorSignal.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteIssueGroup.findMany.mockResolvedValue([]);
    db.websiteIssueGroup.findFirst.mockResolvedValue(null);
    db.websiteIssueGroup.upsert.mockImplementation(async ({ create, update }: any) => ({ id: 'issue-1', ...create, ...update }));
    db.websiteIssueGroup.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteAnalyticsSegment.findMany.mockResolvedValue([]);
    db.websiteAnalyticsSegment.findFirst.mockResolvedValue(null);
    db.websiteAnalyticsSegment.create.mockImplementation(async ({ data }: any) => ({ id: 'segment-1', ...data }));
    db.websiteAnalyticsSegment.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteAnalyticsSegment.updateMany.mockResolvedValue({ count: 0 });
    db.websiteAnalyticsSegment.delete.mockResolvedValue({});
    db.websiteSessionTag.findMany.mockResolvedValue([]);
    db.websiteSessionTag.findFirst.mockResolvedValue(null);
    db.websiteSessionTag.create.mockImplementation(async ({ data }: any) => ({ id: 'tag-1', ...data }));
    db.websiteSessionTag.delete.mockResolvedValue({});
    db.websiteVisitor.findFirst.mockResolvedValue(null);
    db.websiteVisitorIdentity.upsert.mockImplementation(async ({ create, update }: any) => ({ id: 'identity-1', ...create, ...update }));
    db.websiteFunnel.findMany.mockResolvedValue([]);
    db.websiteFunnel.findFirst.mockResolvedValue(null);
    db.websiteFunnel.create.mockImplementation(async ({ data }: any) => ({ id: 'funnel-1', ...data }));
    db.websiteFunnel.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteFunnel.delete.mockResolvedValue({});
    db.websiteFunnelRun.findMany.mockResolvedValue([]);
    db.websiteFunnelRun.findFirst.mockResolvedValue(null);
    db.websiteFunnelRun.create.mockImplementation(async ({ data }: any) => ({ id: 'run-1', ...data }));
    db.websiteFunnelRun.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteJourneyPath.findMany.mockResolvedValue([]);
    db.websiteJourneyPath.findFirst.mockResolvedValue(null);
    db.websiteJourneyPath.create.mockImplementation(async ({ data }: any) => ({ id: 'journey-1', ...data }));
    db.websiteJourneyPath.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websitePathAggregate.findMany.mockResolvedValue([]);
    db.websitePathAggregate.findFirst.mockResolvedValue(null);
    db.websitePathAggregate.create.mockImplementation(async ({ data }: any) => ({ id: 'aggregate-1', ...data }));
    db.websitePathAggregate.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteAiInsight.findMany.mockResolvedValue([]);
    db.websiteAiInsight.findFirst.mockResolvedValue(null);
    db.websiteAiInsight.create.mockImplementation(async ({ data }: any) => ({ id: 'ai-insight-1', createdAt: new Date(), updatedAt: new Date(), ...data }));
    db.websiteAiInsight.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteAiConversation.findMany.mockResolvedValue([]);
    db.websiteAiConversation.findFirst.mockResolvedValue(null);
    db.websiteAiConversation.create.mockImplementation(async ({ data }: any) => ({ id: 'conversation-1', createdAt: new Date(), updatedAt: new Date(), ...data }));
    db.websiteAiConversation.update.mockImplementation(async ({ where, data }: any) => ({ id: where.id, ...data }));
    db.websiteAiMessage.findMany.mockResolvedValue([]);
    db.websiteAiMessage.create.mockImplementation(async ({ data }: any) => ({ id: `message-${data.role}`, createdAt: new Date(), ...data }));
    (llmAdapterService.generate as jest.Mock).mockResolvedValue({
      text: JSON.stringify({
        title: 'AI Insight',
        summary: 'Evidence-based summary',
        severity: 'MEDIUM',
        confidence: 0.82,
        recommendations: ['Review high-friction pages'],
      }),
      model: 'mock',
      tokensUsed: 20,
    });
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

  it('saved segment CRUD is tenant-scoped', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' });
    const segment = await websiteAnalyticsService.createSegment('tenant-1', {
      siteId: 'site-1',
      name: 'High intent visitors',
      filters: { country: 'Canada', hasRageClick: true },
      tenantId: 'tenant-2',
    });

    expect(db.websiteAnalyticsSegment.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', name: 'High intent visitors' }),
    }));
    expect(segment.tenantId).toBe('tenant-1');

    db.websiteAnalyticsSegment.findFirst.mockResolvedValueOnce({ id: 'segment-1', tenantId: 'tenant-1' });
    await websiteAnalyticsService.getSegment('segment-1', 'tenant-1');
    expect(db.websiteAnalyticsSegment.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'segment-1', tenantId: 'tenant-1' } }));
  });

  it('one tenant cannot read update or delete another tenant segment', async () => {
    db.websiteAnalyticsSegment.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.getSegment('segment-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    await expect(websiteAnalyticsService.updateSegment('segment-1', 'tenant-2', { name: 'Nope' })).rejects.toMatchObject({ statusCode: 404 });
    await expect(websiteAnalyticsService.deleteSegment('segment-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    expect(db.websiteAnalyticsSegment.update).not.toHaveBeenCalled();
    expect(db.websiteAnalyticsSegment.delete).not.toHaveBeenCalled();
  });

  it('filter builder applies country browser device date and url filters', async () => {
    db.websiteSession.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.listSessions('tenant-1', {
      siteId: 'site-1',
      country: 'Canada',
      browser: 'Chrome',
      device: 'Desktop',
      dateFrom: '2026-05-01T00:00:00.000Z',
      dateTo: '2026-05-13T00:00:00.000Z',
      path: '/pricing',
    });

    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-1',
        siteId: 'site-1',
        country: { contains: 'Canada', mode: 'insensitive' },
        browser: { contains: 'Chrome', mode: 'insensitive' },
        device: { contains: 'Desktop', mode: 'insensitive' },
        startedAt: { gte: new Date('2026-05-01T00:00:00.000Z'), lte: new Date('2026-05-13T00:00:00.000Z') },
        OR: expect.any(Array),
      }),
    }));
  });

  it('behavior filters return matching sessions', async () => {
    db.websiteSession.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.listSessions('tenant-1', { hasRageClick: 'true', hasDeadClick: 'true' });
    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        behaviorSignals: { some: { type: { in: ['RAGE_CLICK', 'DEAD_CLICK'] } } },
      }),
    }));
  });

  it('tag CRUD is tenant-scoped', async () => {
    db.websiteSession.findFirst.mockResolvedValue({ id: 'session-1', tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1' });
    await websiteAnalyticsService.createSessionTag('session-1', 'tenant-1', { name: 'pricing-interest' });
    expect(db.websiteSessionTag.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', name: 'pricing-interest' }),
    }));

    db.websiteSessionTag.findFirst.mockResolvedValueOnce(null);
    await expect(websiteAnalyticsService.deleteSessionTag('session-1', 'tag-other', 'tenant-1')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('identity update is tenant-scoped', async () => {
    db.websiteVisitor.findFirst.mockResolvedValue({ id: 'visitor-1', tenantId: 'tenant-1', siteId: 'site-1' });
    await websiteAnalyticsService.updateVisitorIdentity('visitor-1', 'tenant-1', { externalUserId: 'user-123', traits: { plan: 'pro' } });
    expect(db.websiteVisitor.findFirst).toHaveBeenCalledWith({ where: { id: 'visitor-1', tenantId: 'tenant-1' } });
    expect(db.websiteVisitorIdentity.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1', externalUserId: 'user-123' }),
    }));
  });

  it('public identify rejects invalid trackingKey', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue(null);
    await expect(websiteAnalyticsService.collect({
      trackingKey: 'bad',
      anonymousId: 'visitor-1',
      sessionKey: 'session-1',
      events: [{ type: 'identify', externalUserId: 'user-123' }],
    })).rejects.toMatchObject({ statusCode: 403 });
  });

  it('public identify stores identity under correct tenant and site', async () => {
    db.websiteAnalyticsSite.findUnique.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1', trackingKey: 'ys_key', isActive: true });
    db.websiteVisitor.upsert.mockResolvedValue({ id: 'visitor-1' });
    db.websiteSession.create.mockResolvedValue({ id: 'session-1', hasJsError: false });
    db.websiteSession.findUnique.mockResolvedValueOnce(null).mockResolvedValueOnce({ id: 'session-1', siteId: 'site-1', visitorId: 'visitor-1', hasJsError: false });
    db.websiteEvent.createMany.mockResolvedValue({ count: 1 });
    db.websiteSession.update.mockResolvedValue({});
    db.websiteVisitor.update.mockResolvedValue({});

    await websiteAnalyticsService.collect({
      trackingKey: 'ys_key',
      anonymousId: 'visitor-1',
      sessionKey: 'session-1',
      events: [{ type: 'identify', externalUserId: 'user-123', payload: { traits: { plan: 'pro' } } }],
    });

    expect(db.websiteVisitorIdentity.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', visitorId: 'visitor-1', externalUserId: 'user-123' }),
    }));
  });

  it('custom events are stored and filterable', async () => {
    db.websiteEvent.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.listEvents('tenant-1', { customEventName: 'lead_created' });
    expect(db.websiteEvent.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ type: 'custom_event', payload: { path: ['eventName'], equals: 'lead_created' } }),
    }));
  });

  it('payload sanitization rejects dangerous keys and oversized payloads', async () => {
    await expect(websiteAnalyticsService.createSegment('tenant-1', {
      name: 'Unsafe',
      filters: JSON.parse('{"__proto__":"bad"}'),
    })).rejects.toMatchObject({ statusCode: 400 });

    await expect(websiteAnalyticsService.createSegment('tenant-1', {
      name: 'Too large',
      filters: { blob: 'x'.repeat(25_000) },
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('funnel CRUD is tenant-scoped', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' });
    const funnel = await websiteAnalyticsService.createFunnel('tenant-1', {
      siteId: 'site-1',
      name: 'Pricing conversion',
      steps: [{ name: 'Pricing', type: 'page', operator: 'contains', value: '/pricing' }],
    });
    expect(db.websiteFunnel.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', name: 'Pricing conversion' }),
    }));
    expect(funnel.tenantId).toBe('tenant-1');

    db.websiteFunnel.findFirst.mockResolvedValueOnce({ id: 'funnel-1', tenantId: 'tenant-1', siteId: 'site-1' });
    await websiteAnalyticsService.getFunnel('funnel-1', 'tenant-1');
    expect(db.websiteFunnel.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'funnel-1', tenantId: 'tenant-1' } }));
  });

  it('one tenant cannot access another tenant funnels or runs', async () => {
    db.websiteFunnel.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.getFunnel('funnel-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
    db.websiteFunnelRun.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.getFunnelRun('run-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('funnel run calculates ordered conversion and drop-off correctly', async () => {
    const base = new Date('2026-05-13T10:00:00.000Z').getTime();
    db.websiteFunnel.findFirst.mockResolvedValue({
      id: 'funnel-1',
      tenantId: 'tenant-1',
      siteId: 'site-1',
      steps: [
        { name: 'Pricing', type: 'page', operator: 'contains', value: '/pricing' },
        { name: 'Lead Created', type: 'custom_event', operator: 'equals', value: 'lead_created' },
      ],
    });
    db.websiteSession.findMany.mockResolvedValue([
      {
        id: 'session-converted',
        startedAt: new Date(base),
        entryUrl: '/pricing',
        exitUrl: '/thanks',
        events: [
          { id: 'pv-1', type: 'page_view', path: '/pricing', url: 'https://example.com/pricing', createdAt: new Date(base) },
          { id: 'ce-1', type: 'custom_event', path: '/pricing', url: 'https://example.com/pricing', payload: { eventName: 'lead_created' }, createdAt: new Date(base + 5000) },
        ],
        behaviorSignals: [],
        tags: [],
      },
      {
        id: 'session-drop',
        startedAt: new Date(base),
        entryUrl: '/pricing',
        exitUrl: '/pricing',
        events: [{ id: 'pv-2', type: 'page_view', path: '/pricing', url: 'https://example.com/pricing', createdAt: new Date(base) }],
        behaviorSignals: [],
        tags: [],
      },
    ]);

    await websiteAnalyticsService.runFunnel('funnel-1', 'tenant-1', { dateFrom: '2026-05-01T00:00:00.000Z', dateTo: '2026-05-13T23:59:59.000Z' });
    const readyUpdate = db.websiteFunnelRun.update.mock.calls.find((call: any[]) => call[0].data.status === 'READY')?.[0];
    expect(readyUpdate.data.totalEntrants).toBe(2);
    expect(readyUpdate.data.totalConversions).toBe(1);
    expect(readyUpdate.data.results.dropOffSessionsByStep['1']).toContain('session-drop');
  });

  it('page path and custom event funnel steps work', async () => {
    db.websiteFunnel.findFirst.mockResolvedValue({
      id: 'funnel-1',
      tenantId: 'tenant-1',
      siteId: 'site-1',
      steps: [
        { name: 'Feature', type: 'page', operator: 'contains', value: '/features' },
        { name: 'Signup', type: 'custom_event', operator: 'equals', value: 'signup' },
      ],
    });
    db.websiteSession.findMany.mockResolvedValue([{
      id: 'session-1',
      startedAt: new Date(),
      entryUrl: '/features',
      events: [
        { type: 'page_view', path: '/features', url: 'https://example.com/features', createdAt: new Date() },
        { type: 'custom_event', payload: { eventName: 'signup' }, url: 'https://example.com/features', createdAt: new Date(Date.now() + 1000) },
      ],
      behaviorSignals: [],
      tags: [],
    }]);

    await websiteAnalyticsService.runFunnel('funnel-1', 'tenant-1', {});
    const readyUpdate = db.websiteFunnelRun.update.mock.calls.find((call: any[]) => call[0].data.status === 'READY')?.[0];
    expect(readyUpdate.data.totalConversions).toBe(1);
  });

  it('segment filters are applied to funnel runs', async () => {
    db.websiteFunnel.findFirst.mockResolvedValue({ id: 'funnel-1', tenantId: 'tenant-1', siteId: 'site-1', steps: [{ name: 'Pricing', type: 'page', operator: 'contains', value: '/pricing' }] });
    db.websiteAnalyticsSegment.findFirst.mockResolvedValue({ id: 'segment-1', tenantId: 'tenant-1', filters: { country: 'Canada' } });
    db.websiteSession.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.runFunnel('funnel-1', 'tenant-1', { segmentId: 'segment-1' });
    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ country: { contains: 'Canada', mode: 'insensitive' } }),
    }));
  });

  it('journey path extraction works and aggregates paths tenant-safely', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' });
    db.websiteSession.findMany.mockResolvedValue([{
      id: 'session-1',
      tenantId: 'tenant-1',
      siteId: 'site-1',
      visitorId: 'visitor-1',
      startedAt: new Date(),
      durationMs: 2000,
      events: [
        { type: 'page_view', path: '/', url: 'https://example.com/', createdAt: new Date() },
        { type: 'page_view', path: '/pricing', url: 'https://example.com/pricing', createdAt: new Date() },
        { type: 'custom_event', payload: { eventName: 'lead_created' }, url: 'https://example.com/pricing', createdAt: new Date() },
      ],
      behaviorSignals: [],
    }]);

    await websiteAnalyticsService.analyzeJourneys('tenant-1', { siteId: 'site-1' });
    expect(db.websiteJourneyPath.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', sessionId: 'session-1', converted: true, conversionEvent: 'lead_created' }),
    }));
    expect(db.websitePathAggregate.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', occurrenceCount: 1, conversionCount: 1 }),
    }));
  });

  it('path aggregates and run sessions endpoints are tenant-scoped', async () => {
    db.websitePathAggregate.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.listJourneyAggregates('tenant-1', { siteId: 'site-1' });
    expect(db.websitePathAggregate.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: { tenantId: 'tenant-1', siteId: 'site-1' } }));

    db.websiteFunnelRun.findFirst.mockResolvedValue({ id: 'run-1', tenantId: 'tenant-1', siteId: 'site-1', results: { convertedSessions: ['session-1'], dropOffSessionsByStep: {} } });
    db.websiteSession.findMany.mockResolvedValue([]);
    await websiteAnalyticsService.listFunnelRunSessions('run-1', 'tenant-1', { converted: 'true' });
    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1', id: { in: ['session-1'] } }) }));
  });

  it('invalid funnel step definitions are rejected', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' });
    await expect(websiteAnalyticsService.createFunnel('tenant-1', {
      siteId: 'site-1',
      name: 'Bad funnel',
      steps: [{ name: 'Bad', type: 'unknown', operator: 'contains', value: 'x' }],
    })).rejects.toMatchObject({ statusCode: 400 });
  });

  it('generates tenant-scoped AI insights with redacted context', async () => {
    db.websiteAnalyticsSite.findFirst.mockResolvedValue({ id: 'site-1', tenantId: 'tenant-1' });
    db.websiteSession.findMany.mockResolvedValue([
      { id: 'session-1', entryUrl: '/pricing', exitUrl: '/signup', browser: 'Chrome', device: 'desktop', country: 'CA', durationMs: 120000, pageCount: 3, eventCount: 8, hasJsError: false },
    ]);
    db.websiteIssueGroup.findMany.mockResolvedValue([{ id: 'issue-1', tenantId: 'tenant-1', siteId: 'site-1', type: 'RAGE_CLICK', severity: 'HIGH', occurrenceCount: 4 }]);

    const result = await websiteAnalyticsService.generateAiInsight('tenant-1', {
      type: 'TREND_SUMMARY',
      siteId: 'site-1',
      filters: { email: 'person@example.com', phone: '4165551212' },
    }, 'user-1');

    expect(result).toMatchObject({ tenantId: 'tenant-1', siteId: 'site-1', type: 'TREND_SUMMARY' });
    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1' }) }));
    expect(db.websiteAiInsight.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ createdById: 'user-1' }) }));
    const contextSummary = (llmAdapterService.generate as jest.Mock).mock.calls[0][0].contextSummary;
    expect(contextSummary).not.toContain('person@example.com');
    expect(contextSummary).not.toContain('4165551212');
  });

  it('rejects AI insight generation for another tenant source', async () => {
    db.websiteSession.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.generateAiInsight('tenant-1', {
      type: 'SESSION_SUMMARY',
      sourceType: 'SESSION',
      sourceId: 'session-other',
    })).rejects.toMatchObject({ statusCode: 404 });
  });

  it('rejects cross-tenant AI session and recording summaries', async () => {
    db.websiteSession.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.summarizeAiSession('session-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });

    db.websiteRecording.findFirst.mockResolvedValue(null);
    await expect(websiteAnalyticsService.summarizeAiRecording('recording-1', 'tenant-2')).rejects.toMatchObject({ statusCode: 404 });
  });

  it('lists and updates AI insights within tenant scope', async () => {
    db.websiteAiInsight.findMany.mockResolvedValue([{ id: 'ai-1', tenantId: 'tenant-1', status: 'GENERATED', type: 'BEHAVIOR_INSIGHT' }]);
    await websiteAnalyticsService.listAiInsights('tenant-1', { siteId: 'site-1', type: 'BEHAVIOR_INSIGHT', severity: 'HIGH', status: 'GENERATED' });
    expect(db.websiteAiInsight.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: { tenantId: 'tenant-1', siteId: 'site-1', type: 'BEHAVIOR_INSIGHT', severity: 'HIGH', status: 'GENERATED' },
    }));

    db.websiteAiInsight.findFirst.mockResolvedValue({ id: 'ai-1', tenantId: 'tenant-1' });
    await websiteAnalyticsService.updateAiInsightStatus('ai-1', 'tenant-1', { status: 'ARCHIVED' });
    expect(db.websiteAiInsight.update).toHaveBeenCalledWith({ where: { id: 'ai-1' }, data: { status: 'ARCHIVED' } });
  });

  it('keeps AI chat context tenant-scoped', async () => {
    db.websiteAiConversation.findFirst.mockResolvedValue({ id: 'conversation-1', tenantId: 'tenant-1', siteId: 'site-1', filters: {} });
    db.websiteSession.findMany.mockResolvedValue([{ id: 'session-1', entryUrl: '/pricing', pageCount: 1, eventCount: 2, hasJsError: false }]);

    await websiteAnalyticsService.createAiMessage('conversation-1', 'tenant-1', { content: 'Which recordings should I watch first?' });

    expect(db.websiteSession.findMany).toHaveBeenCalledWith(expect.objectContaining({ where: expect.objectContaining({ tenantId: 'tenant-1', siteId: 'site-1' }) }));
    expect(db.websiteAiMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', role: 'USER' }) }));
    expect(db.websiteAiMessage.create).toHaveBeenCalledWith(expect.objectContaining({ data: expect.objectContaining({ tenantId: 'tenant-1', role: 'ASSISTANT' }) }));
  });

  it('bounds AI prompt payload size', async () => {
    db.websiteSession.findMany.mockResolvedValue(Array.from({ length: 20 }, (_, index) => ({
      id: `session-${index}`,
      entryUrl: `/pricing-${index}-${'x'.repeat(2000)}`,
      pageCount: 3,
      eventCount: 10,
      hasJsError: false,
    })));

    await websiteAnalyticsService.generateAiInsight('tenant-1', { type: 'TREND_SUMMARY' });
    const contextSummary = (llmAdapterService.generate as jest.Mock).mock.calls[0][0].contextSummary;
    expect(Buffer.byteLength(contextSummary, 'utf8')).toBeLessThanOrEqual(18000);
  });
});
