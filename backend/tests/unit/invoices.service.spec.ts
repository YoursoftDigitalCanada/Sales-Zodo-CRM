const mockRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  recordPayment: jest.fn(),
  delete: jest.fn(),
};

const mockDb = {
  client: { findFirst: jest.fn(), update: jest.fn() },
  contact: { findFirst: jest.fn() },
  project: { findFirst: jest.fn() },
  quote: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  tenantSettings: { findUnique: jest.fn() },
  invoice: { findFirst: jest.fn(), update: jest.fn() },
  invoicePayment: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  customerSubscription: { findFirst: jest.fn(), update: jest.fn() },
};

jest.mock('../../src/modules/invoices/invoices.repository', () => ({
  invoicesRepository: mockRepository,
}));

jest.mock('../../src/config/database', () => ({ prisma: mockDb }));

jest.mock('../../src/modules/bookkeeping/bookkeeping.service', () => ({
  bookkeepingService: {
    syncInvoicePayment: jest.fn(),
    createInvoicePaymentReversal: jest.fn(),
  },
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('../../src/common/services/client-lifecycle.service', () => ({
  clientLifecycleService: {
    progressTo: jest.fn(),
    reinforceEngagement: jest.fn(),
  },
}));

jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: {},
}));

jest.mock('../../src/modules/communication-logs/communication-log.service', () => ({
  communicationLogService: { createSafe: jest.fn() },
}));

jest.mock('zod', () => require('../../node_modules/zod'), { virtual: true });

import { invoicesService } from '../../src/modules/invoices/invoices.service';
import { eventBus } from '../../src/common/events/event-bus';
import { bookkeepingService } from '../../src/modules/bookkeeping/bookkeeping.service';
import { CreateInvoiceSchema } from '../../../packages/contracts/invoice';

const baseInvoice = {
  id: 'invoice-1',
  tenantId: 'tenant-1',
  invoiceNumber: 'INV-1',
  status: 'DRAFT',
  clientId: 'client-1',
  contactId: 'contact-1',
  quoteId: 'quote-1',
  projectId: 'deal-1',
  contractId: 'contract-1',
  issueDate: new Date('2026-05-25T00:00:00.000Z'),
  dueDate: new Date('2026-06-24T00:00:00.000Z'),
  paidAt: null,
  sentAt: null,
  viewedAt: null,
  currency: 'CAD',
  subtotal: 1000,
  taxRate: 0,
  taxAmount: 0,
  discountAmount: 0,
  total: 1000,
  amountPaid: 0,
  amountDue: 1000,
  notes: null,
  terms: null,
  client: { id: 'client-1', clientName: 'Acme', primaryEmail: 'billing@example.com' },
  contact: { id: 'contact-1', contactName: 'Buyer', email: 'buyer@example.com', officePhone: null, mobilePhone: null },
  quote: { id: 'quote-1', quoteNumber: 'PR-1' },
  project: { id: 'deal-1', name: 'Expansion', projectNumber: 'D-1' },
  contract: { id: 'contract-1', contractNumber: 'CT-1', title: 'Services Contract' },
  items: [{ description: 'Implementation', quantity: 1, unitPrice: 1000, amount: 1000, taxRate: null, sortOrder: 0 }],
  payments: [],
  createdAt: new Date('2026-05-25T00:00:00.000Z'),
  updatedAt: new Date('2026-05-25T00:00:00.000Z'),
};

describe('InvoicesService Sales CRM readiness', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1' });
    mockDb.contact.findFirst.mockResolvedValue({ id: 'contact-1', companyId: 'client-1' });
    mockDb.project.findFirst.mockResolvedValue({ id: 'deal-1', clientId: 'client-1', contactId: 'contact-1' });
    mockDb.quote.findFirst.mockResolvedValue({ id: 'quote-1', clientId: 'client-1' });
    mockDb.contract.findFirst.mockResolvedValue({ id: 'contract-1', clientId: 'client-1', contactId: 'contact-1', quoteId: 'quote-1', projectId: 'deal-1' });
    mockDb.tenantSettings.findUnique.mockResolvedValue({ tenant: { name: 'Acme CRM', logo: null }, integrations: {} });
    mockRepository.create.mockResolvedValue(baseInvoice);
    mockRepository.findById.mockResolvedValue(baseInvoice);
    mockRepository.update.mockImplementation((_id, _tenantId, data) => Promise.resolve({ ...baseInvoice, ...data }));
    mockDb.invoice.findFirst.mockResolvedValue(baseInvoice);
    mockDb.invoice.update.mockResolvedValue(baseInvoice);
    mockDb.invoicePayment.findMany.mockResolvedValue([]);
  });

  it('creates invoices with tenant-validated company, contact, deal, proposal, and contract links', async () => {
    await invoicesService.create('tenant-1', {
      invoiceNumber: 'INV-1',
      clientId: 'client-1',
      contactId: 'contact-1',
      projectId: 'deal-1',
      quoteId: 'quote-1',
      contractId: 'contract-1',
      dueDate: '2026-06-24T00:00:00.000Z',
      currency: 'CAD',
      items: [{ description: 'Implementation', quantity: 1, unitPrice: 1000, amount: 1000 }],
    } as any);

    expect(mockRepository.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      clientId: 'client-1',
      contactId: 'contact-1',
      projectId: 'deal-1',
      quoteId: 'quote-1',
      contractId: 'contract-1',
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('invoice.created', expect.objectContaining({
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      contactId: 'contact-1',
      contractId: 'contract-1',
    }));
  });

  it('accepts browser string discount amounts and normalizes them before service use', () => {
    const parsed = CreateInvoiceSchema.safeParse({
      invoiceNumber: 'INV-DISCOUNT-1',
      clientId: '11111111-1111-4111-8111-111111111111',
      dueDate: '2026-06-24T00:00:00.000Z',
      currency: 'CAD',
      discountAmount: '25.50',
      items: [{ description: 'Implementation', quantity: 1, unitPrice: 1000, amount: 1000 }],
    });

    expect(parsed.success).toBe(true);
    if (parsed.success) {
      expect(parsed.data.discountAmount).toBe(25.5);
    }
  });

  it('rejects a billing contact that belongs to another company', async () => {
    mockDb.contact.findFirst.mockResolvedValue({ id: 'contact-1', companyId: 'client-other' });

    await expect(invoicesService.create('tenant-1', {
      invoiceNumber: 'INV-1',
      clientId: 'client-1',
      contactId: 'contact-1',
      dueDate: '2026-06-24T00:00:00.000Z',
      items: [{ description: 'Implementation', quantity: 1, unitPrice: 1000, amount: 1000 }],
    } as any)).rejects.toThrow('Contact does not belong to the selected company');
  });

  it('partial refunds recalculate invoice totals and create a bookkeeping reversal', async () => {
    const payment = {
      id: 'payment-1',
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      clientId: 'client-1',
      amount: 500,
      refundAmount: 0,
      status: 'SUCCESSFUL',
      invoice: baseInvoice,
    };
    mockDb.invoicePayment.findFirst.mockResolvedValue(payment);
    mockDb.invoicePayment.update.mockResolvedValue({ ...payment, status: 'PARTIALLY_REFUNDED', refundAmount: 125 });
    mockDb.invoicePayment.findMany.mockResolvedValue([{ ...payment, status: 'PARTIALLY_REFUNDED', refundAmount: 125 }]);

    await invoicesService.updatePaymentStatus('invoice-1', 'payment-1', 'tenant-1', { status: 'PARTIALLY_REFUNDED', refundAmount: 125 }, 'user-1');

    expect(bookkeepingService.createInvoicePaymentReversal).toHaveBeenCalledWith('tenant-1', 'payment-1', 125, 'PARTIALLY_REFUNDED', 'user-1');
    expect(mockDb.invoice.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id_tenantId: { id: 'invoice-1', tenantId: 'tenant-1' } },
      data: expect.objectContaining({ amountPaid: 375, amountDue: 625, status: 'PARTIALLY_PAID' }),
    }));
    expect(eventBus.emit).toHaveBeenCalledWith('payment.partiallyRefunded', expect.objectContaining({
      tenantId: 'tenant-1',
      paymentId: 'payment-1',
      refundAmount: 125,
    }));
  });
});
