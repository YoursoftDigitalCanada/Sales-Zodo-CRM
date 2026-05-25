const mockFilesRepository = {
  findByShareLink: jest.fn(),
  create: jest.fn(),
};

jest.mock('../../src/modules/files/files.repository', () => ({
  filesRepository: mockFilesRepository,
}));

const mockDb = {
  folder: { findFirst: jest.fn() },
  project: { findFirst: jest.fn() },
  client: { findFirst: jest.fn() },
  lead: { findFirst: jest.fn() },
  quote: { findFirst: jest.fn() },
};

jest.mock('../../src/config/database', () => ({
  prisma: mockDb,
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
  readFileSync: jest.fn(() => Buffer.from('file-bytes')),
}));

import { filesService } from '../../src/modules/files/files.service';

describe('FilesService shared downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.folder.findFirst.mockResolvedValue({ id: 'folder-1' });
    mockDb.project.findFirst.mockResolvedValue({ id: 'deal-1' });
    mockDb.client.findFirst.mockResolvedValue({ id: 'company-1' });
    mockDb.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
    mockDb.quote.findFirst.mockResolvedValue({ id: 'quote-1' });
  });

  it('only looks up actively shared, non-deleted files by share link', async () => {
    mockFilesRepository.findByShareLink.mockResolvedValue({
      id: 'file-1',
      tenantId: 'tenant-a',
      isShared: true,
      path: '/tmp/file.pdf',
      originalName: 'Invoice.pdf',
      mimeType: 'application/pdf',
    });

    const result = await filesService.downloadByShareLink('token-1');

    expect(mockFilesRepository.findByShareLink).toHaveBeenCalledWith('token-1');
    expect(result).toEqual({ filePath: '/tmp/file.pdf', fileName: 'Invoice.pdf', mimeType: 'application/pdf' });
  });

  it('blocks disabled share links even if a stale token is present', async () => {
    mockFilesRepository.findByShareLink.mockResolvedValue({
      id: 'file-1',
      tenantId: 'tenant-a',
      isShared: false,
      shareLink: 'token-1',
      path: '/tmp/file.pdf',
      originalName: 'Invoice.pdf',
      mimeType: 'application/pdf',
    });

    await expect(filesService.downloadByShareLink('token-1')).rejects.toThrow('Share link is disabled');
  });

  it('blocks expired share links', async () => {
    mockFilesRepository.findByShareLink.mockResolvedValue({
      id: 'file-1',
      tenantId: 'tenant-a',
      isShared: true,
      shareExpiresAt: new Date('2020-01-01T00:00:00.000Z'),
      path: '/tmp/file.pdf',
      originalName: 'Invoice.pdf',
      mimeType: 'application/pdf',
    });

    await expect(filesService.downloadByShareLink('token-1')).rejects.toThrow('Share link has expired');
  });

  it('rejects upload folders that do not belong to the tenant', async () => {
    mockDb.folder.findFirst.mockResolvedValue(null);

    await expect(filesService.upload('tenant-a', {
      path: '/tmp/file.pdf',
      originalname: 'Proposal.pdf',
      mimetype: 'application/pdf',
      size: 10,
    } as any, { folderId: 'folder-other', uploadedById: 'user-1' })).rejects.toThrow('Folder does not belong to this tenant');

    expect(mockFilesRepository.create).not.toHaveBeenCalled();
  });

  it('validates upload links and stores the uploader on the file', async () => {
    mockFilesRepository.create.mockResolvedValue({
      id: 'file-1',
      tenantId: 'tenant-a',
      name: 'Proposal.pdf',
      originalName: 'Proposal.pdf',
      mimeType: 'application/pdf',
      size: BigInt(10),
      path: '/tmp/file.pdf',
      extension: '.pdf',
      checksum: 'checksum',
      folderId: 'folder-1',
      isStarred: false,
      isShared: false,
      shareLink: null,
      shareExpiresAt: null,
      tags: [],
      createdAt: new Date('2026-01-01T00:00:00.000Z'),
      updatedAt: new Date('2026-01-01T00:00:00.000Z'),
      deletedAt: null,
      uploadedById: 'user-1',
    });

    const result = await filesService.upload('tenant-a', {
      path: '/tmp/file.pdf',
      originalname: 'Proposal.pdf',
      mimetype: 'application/pdf',
      size: 10,
    } as any, { folderId: 'folder-1', uploadedById: 'user-1' });

    expect(mockDb.folder.findFirst).toHaveBeenCalledWith({ where: { id: 'folder-1', tenantId: 'tenant-a', deletedAt: null }, select: { id: true } });
    expect(mockFilesRepository.create).toHaveBeenCalledWith('tenant-a', expect.objectContaining({
      folderId: 'folder-1',
      uploadedById: 'user-1',
    }));
    expect(result.uploadedById).toBe('user-1');
  });
});
