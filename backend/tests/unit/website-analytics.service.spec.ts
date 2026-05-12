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
});
