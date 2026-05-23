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
  invoice: { findFirst: jest.fn() },
  proposal: { findFirst: jest.fn() },
  quote: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  expense: { findFirst: jest.fn() },
  project: { findFirst: jest.fn() },
  client: { findFirst: jest.fn() },
  contact: { findFirst: jest.fn() },
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
    await documentsService.list('tenant-a', { search: 'proposal', categoryId: 'cat-1', documentType: 'pdf' });

    expect(mockDb.file.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        tenantId: 'tenant-a',
        deletedAt: null,
        documentMetadata: { is: { categoryId: 'cat-1', documentType: 'pdf' } },
      }),
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

  it('rejects unsupported linked entity types', async () => {
    mockDb.file.findFirst.mockResolvedValue({ id: 'file-1', tenantId: 'tenant-a', name: 'Contract.pdf', originalName: 'Contract.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [] });
    mockDb.documentMetadata.findUnique.mockResolvedValue(null);

    await expect(documentsService.link('file-1', 'tenant-a', { linkedEntityType: 'SecretThing', linkedEntityId: 'x-1' })).rejects.toThrow('Unsupported linked entity type');
  });

  it('rejects linked entities that do not belong to the tenant', async () => {
    mockDb.file.findFirst.mockResolvedValue({ id: 'file-1', tenantId: 'tenant-a', name: 'Invoice.pdf', originalName: 'Invoice.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [] });
    mockDb.documentMetadata.findUnique.mockResolvedValue(null);
    mockDb.invoice.findFirst.mockResolvedValue(null);

    await expect(documentsService.link('file-1', 'tenant-a', { linkedEntityType: 'Invoice', linkedEntityId: 'invoice-other' })).rejects.toThrow('Invoice does not belong to this tenant');
  });

  it('links proposal documents using Proposal metadata and tenant validation', async () => {
    mockDb.file.findFirst
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: 'Proposal.pdf', originalName: 'Proposal.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [] })
      .mockResolvedValueOnce({
        id: 'file-1',
        tenantId: 'tenant-a',
        name: 'Proposal.pdf',
        originalName: 'Proposal.pdf',
        mimeType: 'application/pdf',
        size: BigInt(100),
        tags: [],
        documentMetadata: { linkedEntityType: 'Proposal', linkedEntityId: 'proposal-1', documentType: 'pdf' },
      });
    mockDb.documentMetadata.findUnique.mockResolvedValue(null);
    mockDb.proposal.findFirst.mockResolvedValue({ id: 'proposal-1', tenantId: 'tenant-a' });
    mockDb.documentMetadata.upsert.mockResolvedValue({});

    await documentsService.link('file-1', 'tenant-a', { linkedEntityType: 'Proposal', linkedEntityId: 'proposal-1' });

    expect(mockDb.proposal.findFirst).toHaveBeenCalledWith({ where: { id: 'proposal-1', tenantId: 'tenant-a' } });
    expect(mockDb.documentMetadata.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ linkedEntityType: 'Proposal', linkedEntityId: 'proposal-1' }),
    }));
  });

  it('links quote documents against the Quote model separately from Proposal', async () => {
    mockDb.file.findFirst
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: 'Quote.pdf', originalName: 'Quote.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [] })
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: 'Quote.pdf', originalName: 'Quote.pdf', mimeType: 'application/pdf', size: BigInt(100), tags: [], documentMetadata: { linkedEntityType: 'Quote', linkedEntityId: 'quote-1' } });
    mockDb.documentMetadata.findUnique.mockResolvedValue(null);
    mockDb.quote.findFirst.mockResolvedValue({ id: 'quote-1', tenantId: 'tenant-a' });
    mockDb.documentMetadata.upsert.mockResolvedValue({});

    await documentsService.link('file-1', 'tenant-a', { linkedEntityType: 'Quote', linkedEntityId: 'quote-1' });

    expect(mockDb.quote.findFirst).toHaveBeenCalledWith({ where: { id: 'quote-1', tenantId: 'tenant-a' } });
    expect(mockDb.proposal.findFirst).not.toHaveBeenCalledWith({ where: { id: 'quote-1', tenantId: 'tenant-a' } });
    expect(mockDb.documentMetadata.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ linkedEntityType: 'Quote', linkedEntityId: 'quote-1' }),
    }));
  });

  it.each([
    ['Contract', 'contract', 'contract-1'],
    ['Invoice', 'invoice', 'invoice-1'],
    ['Expense', 'expense', 'expense-1'],
    ['Deal', 'project', 'deal-1'],
    ['Client', 'client', 'client-1'],
    ['Company', 'client', 'company-1'],
    ['Contact', 'contact', 'contact-1'],
  ])('valid %s document links validate against the tenant-scoped %s model', async (entityType, modelName, entityId) => {
    mockDb.file.findFirst
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: `${entityType}.pdf`, originalName: `${entityType}.pdf`, mimeType: 'application/pdf', size: BigInt(100), tags: [] })
      .mockResolvedValueOnce({ id: 'file-1', tenantId: 'tenant-a', name: `${entityType}.pdf`, originalName: `${entityType}.pdf`, mimeType: 'application/pdf', size: BigInt(100), tags: [], documentMetadata: { linkedEntityType: entityType, linkedEntityId: entityId } });
    mockDb.documentMetadata.findUnique.mockResolvedValue(null);
    const delegate = (mockDb as any)[modelName];
    delegate.findFirst.mockResolvedValue({ id: entityId, tenantId: 'tenant-a' });
    mockDb.documentMetadata.upsert.mockResolvedValue({});

    await documentsService.link('file-1', 'tenant-a', { linkedEntityType: entityType, linkedEntityId: entityId });

    expect(delegate.findFirst).toHaveBeenCalledWith({ where: { id: entityId, tenantId: 'tenant-a' } });
  });
});
