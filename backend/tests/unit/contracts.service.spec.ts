const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
};

const mockDb = {
  client: { findFirst: jest.fn() },
  contact: { findFirst: jest.fn() },
  quote: { findFirst: jest.fn() },
  project: { findFirst: jest.fn() },
  invoice: { count: jest.fn(), findFirst: jest.fn() },
  file: { findFirst: jest.fn() },
  documentMetadata: { updateMany: jest.fn() },
  tenantSettings: { findUnique: jest.fn() },
};

jest.mock('../../src/modules/contracts/contracts.repository', () => ({
  contractsRepository: mockRepository,
}));

jest.mock('../../src/config/database', () => ({
  prisma: mockDb,
}));

jest.mock('../../src/modules/invoices/invoices.service', () => ({
  invoicesService: { create: jest.fn() },
}));

jest.mock('../../src/modules/documents/documents.service', () => ({
  documentsService: {
    get: jest.fn(),
    categories: jest.fn(),
    update: jest.fn(),
  },
}));

jest.mock('../../src/modules/files/files.service', () => ({
  filesService: { create: jest.fn() },
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: { sendTenantEmail: jest.fn() },
}));

import { contractsService } from '../../src/modules/contracts/contracts.service';
import { eventBus } from '../../src/common/events/event-bus';
import { invoicesService } from '../../src/modules/invoices/invoices.service';
import { documentsService } from '../../src/modules/documents/documents.service';
import { tenantMailerService } from '../../src/common/services/tenant-mailer.service';

const baseContract = {
  id: 'contract-1',
  tenantId: 'tenant-1',
  contractNumber: 'CT-00001',
  title: 'Sales Contract',
  description: null,
  status: 'DRAFT',
  clientId: 'client-1',
  client: { id: 'client-1', clientName: 'Acme', primaryEmail: 'buyer@example.com' },
  contactId: 'contact-1',
  contact: { id: 'contact-1', contactName: 'Buyer Person', email: 'buyer@example.com', companyId: 'client-1' },
  quoteId: 'quote-1',
  projectId: 'deal-1',
  value: 2500,
  currency: 'CAD',
  startDate: new Date('2026-05-01T00:00:00.000Z'),
  endDate: new Date('2026-06-01T00:00:00.000Z'),
  signedAt: null,
  terms: 'Standard terms',
  notes: null,
  createdAt: new Date('2026-05-01T00:00:00.000Z'),
  updatedAt: new Date('2026-05-01T00:00:00.000Z'),
  createdBy: { id: 'employee-1', userId: 'user-1' },
  quote: {
    id: 'quote-1',
    quoteNumber: 'PR-1',
    items: [{ description: 'Implementation', quantity: 1, unitPrice: 2500, total: 2500 }],
  },
};

describe('ContractsService Sales CRM readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1' });
    mockDb.contact.findFirst.mockResolvedValue({ id: 'contact-1', companyId: 'client-1' });
    mockDb.quote.findFirst.mockResolvedValue({ id: 'quote-1' });
    mockDb.project.findFirst.mockResolvedValue({ id: 'deal-1' });
    mockDb.invoice.count.mockResolvedValue(7);
    mockDb.tenantSettings.findUnique.mockResolvedValue({ tenant: { name: 'Acme Workspace' }, integrations: { companyName: 'Acme Workspace' } });
    (tenantMailerService.sendTenantEmail as jest.Mock).mockResolvedValue({
      sent: true,
      senderEmail: 'sales@example.com',
      senderName: 'Sales',
      messageId: 'message-1',
    });
  });

  it('send emails through the tenant mailer and emits contract.sent with tenant-scoped context', async () => {
    mockRepository.findById.mockResolvedValue(baseContract);
    mockRepository.updateStatus.mockResolvedValue({ ...baseContract, status: 'SENT' });
    jest.spyOn(contractsService, 'generatePdf').mockResolvedValueOnce({
      buffer: Buffer.from('contract-pdf'),
      fileName: 'contract-CT-00001.pdf',
    });

    const result = await contractsService.send('contract-1', 'tenant-1', 'employee-1');

    expect(result.status).toBe('SENT');
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      preferredUserId: 'employee-1',
      to: 'buyer@example.com',
      subject: 'Contract CT-00001 from Acme Workspace',
      relatedEntityType: 'Contract',
      relatedEntityId: 'contract-1',
      attachments: [expect.objectContaining({ filename: 'contract-CT-00001.pdf', contentType: 'application/pdf' })],
    }));
    expect(mockRepository.updateStatus).toHaveBeenCalledWith('contract-1', 'tenant-1', 'SENT');
    expect(eventBus.emit).toHaveBeenCalledWith('contract.sent', expect.objectContaining({
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      contactId: 'contact-1',
      recipientEmail: 'buyer@example.com',
      ownerUserId: 'user-1',
      emailAlreadySent: true,
    }));
  });

  it('sign and decline emit the correct automation events once per action call', async () => {
    mockRepository.updateStatus
      .mockResolvedValueOnce({ ...baseContract, status: 'ACTIVE', signedAt: new Date('2026-05-02T00:00:00.000Z') })
      .mockResolvedValueOnce({ ...baseContract, status: 'CANCELLED' });

    await contractsService.sign('contract-1', 'tenant-1', 'employee-1');
    await contractsService.decline('contract-1', 'tenant-1', 'employee-1', 'Budget paused');

    expect(eventBus.emit).toHaveBeenCalledWith('contract.signed', expect.objectContaining({ tenantId: 'tenant-1', contractId: 'contract-1' }));
    expect(eventBus.emit).toHaveBeenCalledWith('contract.declined', expect.objectContaining({ tenantId: 'tenant-1', contractId: 'contract-1' }));
  });

  it('saveContractPdfToDocuments is idempotent when a contract document already exists', async () => {
    mockRepository.findById.mockResolvedValue(baseContract);
    mockDb.file.findFirst.mockResolvedValue({ id: 'file-1', tenantId: 'tenant-1' });
    (documentsService.get as jest.Mock).mockResolvedValue({ id: 'file-1' });

    const document = await contractsService.saveContractPdfToDocuments('tenant-1', 'contract-1', 'employee-1', 'sent');

    expect(document).toEqual({ id: 'file-1' });
    expect(documentsService.get).toHaveBeenCalledWith('file-1', 'tenant-1');
  });

  it('createInvoiceFromContract creates a tenant-scoped invoice from contract line items once', async () => {
    mockRepository.findById.mockResolvedValue(baseContract);
    mockDb.invoice.findFirst.mockResolvedValue(null);
    (invoicesService.create as jest.Mock).mockResolvedValue({ id: 'invoice-1' });

    await contractsService.createInvoiceFromContract('contract-1', 'tenant-1');

    expect(invoicesService.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      clientId: 'client-1',
      quoteId: 'quote-1',
      projectId: 'deal-1',
      notes: 'Contract: CT-00001',
      items: [expect.objectContaining({ description: 'Implementation', amount: 2500 })],
    }));
  });

  it('create rejects cross-tenant linked clients', async () => {
    mockDb.client.findFirst.mockResolvedValue(null);

    await expect(contractsService.create('tenant-1', {
      title: 'Bad Contract',
      clientId: 'client-other',
      value: 100,
      startDate: '2026-05-01',
      endDate: '2026-06-01',
    } as any)).rejects.toThrow('Client does not exist for this tenant.');
  });

  it('create rejects a contact from another selected company', async () => {
    mockDb.contact.findFirst.mockResolvedValue({ id: 'contact-1', companyId: 'client-other' });

    await expect(contractsService.create('tenant-1', {
      title: 'Bad Contact Contract',
      clientId: 'client-1',
      contactId: 'contact-1',
      value: 100,
      startDate: '2026-05-01',
      endDate: '2026-06-01',
    } as any)).rejects.toThrow('Contact does not belong to the selected company.');
  });
});
