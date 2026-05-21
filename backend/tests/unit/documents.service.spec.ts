const mockDb = {
  documentCategory: {
    findMany: jest.fn(),
    createMany: jest.fn(),
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  documentMetadata: {
    findUnique: jest.fn(),
    upsert: jest.fn(),
    updateMany: jest.fn(),
  },
  file: {
    findMany: jest.fn(),
    count: jest.fn(),
    findFirst: jest.fn(),
    update: jest.fn(),
  },
};

jest.mock('../../src/config/database', () => ({
  prisma: mockDb,
}));

const mockFilesService = {
  upload: jest.fn(),
  delete: jest.fn(),
  createShareLink: jest.fn(),
  revokeShareLink: jest.fn(),
  download: jest.fn(),
};

jest.mock('../../src/modules/files/files.service', () => ({
  filesService: mockFilesService,
}));

import { documentsService } from '../../src/modules/documents/documents.service';

describe('DocumentsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.documentCategory.findMany.mockResolvedValue([]);
    mockDb.documentCategory.createMany.mockResolvedValue({ count: 9 });
    mockDb.file.count.mockResolvedValue(0);
    mockDb.file.findMany.mockResolvedValue([]);
  });

  it('seeds and lists categories under the current tenant', async () => {
    mockDb.documentCategory.findMany
      .mockResolvedValueOnce([])
      .mockResolvedValueOnce([{ id: 'cat-1', tenantId: 'tenant-a', name: 'Contracts', isSystem: true }]);

    const categories = await documentsService.categories('tenant-a');

    expect(mockDb.documentCategory.createMany).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.arrayContaining([expect.objectContaining({ tenantId: 'tenant-a', name: 'Contracts' })]),
      skipDuplicates: true,
    }));
    expect(categories[0].tenantId).toBe('tenant-a');
  });

  it('lists only files from the current tenant', async () => {
    await documentsService.list('tenant-a', { search: 'proposal' });

    expect(mockDb.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a', deletedAt: null }),
    }));
    expect(mockDb.file.count).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-a', deletedAt: null }),
    }));
  });

  it('upload creates a file then tenant-scoped document metadata', async () => {
    mockFilesService.upload.mockResolvedValue({ id: 'file-1' });
    mockDb.documentMetadata.findUnique.mockResolvedValue(null);
    mockDb.documentMetadata.upsert.mockResolvedValue({});
    mockDb.file.findFirst.mockResolvedValue({
      id: 'file-1',
      tenantId: 'tenant-a',
      name: 'Proposal.pdf',
      originalName: 'Proposal.pdf',
      mimeType: 'application/pdf',
      size: BigInt(100),
      documentMetadata: null,
      tags: [],
    });

    await documentsService.upload('tenant-a', { path: '/tmp/file', originalname: 'Proposal.pdf', mimetype: 'application/pdf', size: 100 } as any, {
      description: 'Sales proposal',
      documentType: 'pdf',
    });

    expect(mockFilesService.upload).toHaveBeenCalledWith('tenant-a', expect.any(Object), expect.any(Object));
    expect(mockDb.documentMetadata.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-a', fileId: 'file-1', documentType: 'pdf' }),
    }));
  });

  it('does not read documents from another tenant', async () => {
    mockDb.file.findFirst.mockResolvedValue(null);

    await expect(documentsService.get('file-1', 'tenant-a')).rejects.toThrow('Document not found');
    expect(mockDb.file.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'file-1', tenantId: 'tenant-a', deletedAt: null },
    }));
  });

  it('shares only after resolving the document in the current tenant', async () => {
    mockDb.file.findFirst
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: 'Contract.pdf', originalName: 'Contract.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [] })
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: 'Contract.pdf', originalName: 'Contract.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [], isShared: true, shareLink: 'token' });
    mockFilesService.createShareLink.mockResolvedValue({});

    await documentsService.share('file-1', 'tenant-a', { expiresInHours: 24 });

    expect(mockFilesService.createShareLink).toHaveBeenCalledWith('file-1', 'tenant-a', 24);
  });
});
