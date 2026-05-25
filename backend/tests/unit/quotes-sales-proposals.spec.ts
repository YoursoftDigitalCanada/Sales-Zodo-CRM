const mockPrisma = {
  quote: {
    findFirst: jest.fn(),
    update: jest.fn(),
  },
  employee: {
    findUnique: jest.fn(),
  },
  user: {
    findUnique: jest.fn(),
  },
  tenantSettings: {
    findUnique: jest.fn(),
  },
  roofEstimate: {
    findFirst: jest.fn(),
  },
  roofEstimateSettings: {
    findUnique: jest.fn(),
  },
};

const mockRepositoryUpdate = jest.fn();
const mockMailerSend = jest.fn();
const mockScheduleReminder = jest.fn();
const mockCancelReminder = jest.fn();
const mockLegacyGuard = jest.fn();

jest.mock('../../src/config/database', () => ({ prisma: mockPrisma }));
jest.mock('../../src/modules/quotes/quotes.repository', () => ({
  quotesRepository: {
    update: mockRepositoryUpdate,
    findById: jest.fn(),
  },
}));
jest.mock('../../src/modules/quotes/quote-schema-compat', () => ({
  buildQuoteSelect: jest.fn(async (select) => select),
  stripUnsupportedQuoteSignatureFields: jest.fn(async (data) => data),
}));
jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: { sendTenantEmail: mockMailerSend },
}));
jest.mock('../../src/modules/quotes/quote-signature-reminder.service', () => ({
  quoteSignatureReminderService: {
    cancelReminder: mockCancelReminder,
    scheduleReminder: mockScheduleReminder,
  },
}));
jest.mock('../../src/modules/automation/legacy-automation.guard', () => ({
  isLegacyRoofingAutomationEnabled: mockLegacyGuard,
}));
jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));
jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));
jest.mock('../../src/modules/files/files.repository', () => ({
  filesRepository: { create: jest.fn() },
}));
jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notificationsService: { create: jest.fn() },
}));

import { quotesService } from '../../src/modules/quotes/quotes.service';

const forbiddenSalesTerms = /roof|roofing|shingles|underlayment|flashing|decking|inspection|insurance claim|job site/i;

describe('Quotes-backed proposal send path', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLegacyGuard.mockResolvedValue(false);
    mockPrisma.employee.findUnique.mockResolvedValue({ userId: 'user-1' });
    mockPrisma.tenantSettings.findUnique.mockResolvedValue({
      tenant: { name: 'Acme Sales', logo: null },
      integrations: { companyName: 'Acme Sales', companyEmail: 'sales@example.com' },
    });
    mockPrisma.quote.findFirst.mockResolvedValue({
      id: 'quote-1',
      tenantId: 'tenant-1',
      quoteNumber: 'PR-2026-0001',
      status: 'DRAFT',
      issueDate: new Date('2026-05-01T00:00:00.000Z'),
      validUntil: new Date('2026-06-01T00:00:00.000Z'),
      currency: 'CAD',
      subtotal: 1000,
      taxRate: 0,
      taxAmount: 0,
      discountAmount: 0,
      total: 1000,
      notes: 'CRM implementation and onboarding',
      terms: 'Net 30',
      clientId: 'client-1',
      leadId: null,
      roofEstimateId: 'legacy-roof-estimate-1',
      createdById: 'employee-1',
      contractVersion: 0,
      client: {
        id: 'client-1',
        clientName: 'Acme Buyer',
        companyName: 'Acme Buyer Co',
        primaryEmail: 'buyer@example.com',
        primaryPhone: null,
        streetAddress: '100 Main St',
        city: 'Toronto',
        province: 'ON',
        postalCode: 'M5V 1A1',
        country: 'Canada',
      },
      lead: null,
      items: [
        { description: 'Sales CRM implementation', quantity: 1, unitPrice: 1000, total: 1000, sortOrder: 0 },
      ],
      roofEstimate: {
        id: 'legacy-roof-estimate-1',
        address: 'Hidden legacy address',
        roofAreaSqft: 1234,
        roofType: 'Hidden legacy type',
        takeoffs: [],
      },
      projects: [],
    });
    mockRepositoryUpdate.mockImplementation((_id, _tenantId, data) => Promise.resolve({
      ...mockPrisma.quote.findFirst.mock.results[0]?.value,
      id: 'quote-1',
      tenantId: 'tenant-1',
      quoteNumber: 'PR-2026-0001',
      status: data.status || 'SENT',
      client: { id: 'client-1', clientName: 'Acme Buyer' },
      leadId: null,
      items: [{ description: 'Sales CRM implementation', quantity: 1, unitPrice: 1000, total: 1000, sortOrder: 0 }],
      total: 1000,
      publicToken: data.publicToken,
      sentAt: data.sentAt,
      contractVersion: data.contractVersion,
    }));
    mockMailerSend.mockResolvedValue({ sent: true });
  });

  it('sends generic Sales CRM proposal email copy and skips legacy roof attachments', async () => {
    await quotesService.sendQuote('quote-1', 'tenant-1', 'employee-1');

    expect(mockLegacyGuard).toHaveBeenCalledWith('tenant-1');
    expect(mockPrisma.roofEstimate.findFirst).not.toHaveBeenCalled();
    expect(mockMailerSend).toHaveBeenCalledTimes(1);
    expect(mockMailerSend).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      to: 'buyer@example.com',
      subject: 'Proposal PR-2026-0001 ready for signature',
      html: expect.not.stringMatching(forbiddenSalesTerms),
      text: expect.not.stringMatching(forbiddenSalesTerms),
      attachments: undefined,
    }));
    expect(mockScheduleReminder).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      quoteId: 'quote-1',
      recipientEmail: 'buyer@example.com',
    }));
  });
});
