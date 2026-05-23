const mockFilesRepository = {
  findByShareLink: jest.fn(),
};

jest.mock('../../src/modules/files/files.repository', () => ({
  filesRepository: mockFilesRepository,
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock('fs', () => ({
  existsSync: jest.fn(() => true),
}));

import { filesService } from '../../src/modules/files/files.service';

describe('FilesService shared downloads', () => {
  beforeEach(() => {
    jest.clearAllMocks();
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
});
