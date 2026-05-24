const mockProjectsRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  update: jest.fn(),
  recalculateFinancials: jest.fn(),
};

const mockDb = {
  client: { findFirst: jest.fn(), update: jest.fn() },
  contact: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  contactDeal: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn() },
  lead: { findFirst: jest.fn(), update: jest.fn() },
  employee: { findFirst: jest.fn() },
  leadSource: { findFirst: jest.fn() },
  quote: { findFirst: jest.fn(), create: jest.fn() },
  proposal: { findFirst: jest.fn(), create: jest.fn() },
  project: { update: jest.fn() },
  task: { findFirst: jest.fn(), create: jest.fn() },
  calendarEvent: { findFirst: jest.fn(), create: jest.fn() },
  email: { findFirst: jest.fn(), create: jest.fn() },
};

const mockEventBus = { emit: jest.fn() };
const mockActivityLogger = { log: jest.fn() };
const mockLiveInvoiceSyncService = { syncProjectInvoiceDraft: jest.fn() };

jest.mock('../../src/config/database', () => ({ prisma: mockDb }));
jest.mock('../../src/modules/projects/projects.repository', () => ({
  projectsRepository: mockProjectsRepository,
}));
jest.mock('../../src/modules/projects/live-invoice-sync.service', () => ({
  liveInvoiceSyncService: mockLiveInvoiceSyncService,
}));
jest.mock('../../src/common/events/event-bus', () => ({ eventBus: mockEventBus }));
jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: mockActivityLogger,
}));

import { projectsService } from '../../src/modules/projects/projects.service';

function dealRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'deal-1',
    tenantId: 'tenant-1',
    name: 'Acme expansion',
    organizationName: 'Acme Software',
    clientId: 'client-1',
    contactId: 'contact-1',
    leadId: 'lead-1',
    dealOwnerId: 'employee-1',
    sourceId: 'source-1',
    dealStatus: 'Qualification',
    expectedDealValue: 10000,
    dealValue: 10000,
    contractValue: 10000,
    expectedClosureDate: new Date('2026-06-15T00:00:00.000Z'),
    status: 'ACTIVE',
    projectTasks: [],
    contacts: [{ contactId: 'contact-1', contact: { id: 'contact-1', contactName: 'Ava Buyer', email: 'ava@example.test' }, isPrimary: true }],
    ...overrides,
  } as any;
}

describe('Sales CRM deal pipeline hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1' });
    mockDb.contact.findFirst.mockResolvedValue({ id: 'contact-1', companyId: 'client-1' });
    mockDb.lead.findFirst.mockResolvedValue({ id: 'lead-1' });
    mockDb.employee.findFirst.mockResolvedValue({ id: 'employee-1' });
    mockDb.leadSource.findFirst.mockResolvedValue({ id: 'source-1' });
    mockDb.quote.findFirst.mockResolvedValue(null);
    mockDb.quote.create.mockResolvedValue({ id: 'quote-1', quoteNumber: 'QT-2026-0001' });
    mockDb.proposal.findFirst.mockResolvedValue(null);
    mockDb.proposal.create.mockResolvedValue({ id: 'proposal-1', proposalNumber: 'PR-2026-0001' });
    mockDb.project.update.mockResolvedValue(dealRecord());
    mockDb.task.findFirst.mockResolvedValue(null);
    mockDb.task.create.mockResolvedValue({ id: 'task-1' });
    mockDb.calendarEvent.findFirst.mockResolvedValue(null);
    mockDb.calendarEvent.create.mockResolvedValue({ id: 'event-1', startTime: new Date('2026-06-15T10:00:00.000Z') });
    mockDb.email.findFirst.mockResolvedValue(null);
    mockDb.email.create.mockResolvedValue({ id: 'email-1' });
    mockDb.contactDeal.findFirst.mockResolvedValue({ id: 'contact-deal-1', isPrimary: true, role: 'Decision Maker' });

    mockProjectsRepository.create.mockResolvedValue(dealRecord());
    mockProjectsRepository.update.mockResolvedValue(dealRecord({ dealStatus: 'Proposal Sent' }));
    mockProjectsRepository.findById.mockResolvedValue(dealRecord());
    mockProjectsRepository.recalculateFinancials.mockResolvedValue({});
    mockLiveInvoiceSyncService.syncProjectInvoiceDraft.mockResolvedValue({});
  });

  it('creates a tenant-scoped deal and emits a Sales CRM deal.created event', async () => {
    const deal = await projectsService.createDeal('tenant-1', {
      name: 'Acme expansion',
      clientId: 'client-1',
      contactId: 'contact-1',
      leadId: 'lead-1',
      dealOwnerId: 'employee-1',
      sourceId: 'source-1',
      expectedDealValue: 10000,
      dealStatus: 'Qualification',
    }, 'user-1');

    expect(deal.id).toBe('deal-1');
    expect(mockDb.client.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'client-1', tenantId: 'tenant-1' } }));
    expect(mockDb.contact.findFirst).toHaveBeenCalledWith(expect.objectContaining({ where: { id: 'contact-1', tenantId: 'tenant-1' } }));
    expect(mockProjectsRepository.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      name: 'Acme expansion',
      dealStatus: 'Qualification',
      projectType: 'OTHER',
    }), 'user-1');
    expect(mockEventBus.emit).toHaveBeenCalledWith('deal.created', expect.objectContaining({
      tenantId: 'tenant-1',
      dealId: 'deal-1',
      stageName: 'Qualification',
    }));
  });

  it('rejects cross-tenant deal relationships before creating side effects', async () => {
    mockDb.client.findFirst.mockResolvedValueOnce(null);

    await expect(projectsService.createDeal('tenant-1', {
      name: 'Bad deal',
      clientId: 'other-client',
      contactId: 'contact-1',
    })).rejects.toThrow('Linked account does not belong to this tenant');

    expect(mockProjectsRepository.create).not.toHaveBeenCalled();
  });

  it('requires a lost reason before marking a deal lost', async () => {
    mockProjectsRepository.findById.mockResolvedValueOnce(dealRecord({ lostReason: null }));

    await expect(projectsService.markDealLost('deal-1', 'tenant-1', {}, 'user-1'))
      .rejects.toThrow('Lost reason is required when a deal is marked Lost');
  });

  it('proposal stage automation creates proposal artifacts and tasks idempotently', async () => {
    mockProjectsRepository.findById
      .mockResolvedValueOnce(dealRecord({ dealStatus: 'Qualification' }))
      .mockResolvedValueOnce(dealRecord({ dealStatus: 'Proposal Sent' }))
      .mockResolvedValueOnce(dealRecord({ dealStatus: 'Proposal Sent' }))
      .mockResolvedValueOnce(dealRecord({ dealStatus: 'Proposal Sent' }))
      .mockResolvedValueOnce(dealRecord({ dealStatus: 'Proposal Sent' }))
      .mockResolvedValueOnce(dealRecord({ dealStatus: 'Proposal Sent' }));

    await projectsService.moveDealStage('deal-1', 'tenant-1', 'Proposal Sent', {}, 'user-1');

    expect(mockDb.quote.create).toHaveBeenCalledTimes(1);
    expect(mockDb.proposal.create).toHaveBeenCalledTimes(1);
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        title: expect.stringContaining('Follow up on proposal'),
        referenceDoctype: 'DealAutomation',
        referenceDocname: 'deal-1:proposal-follow-up',
      }),
    }));
    expect(JSON.stringify(mockDb.quote.create.mock.calls)).not.toMatch(/Roofer|roofing|inspection|claim/i);
    expect(JSON.stringify(mockDb.proposal.create.mock.calls)).not.toMatch(/Roofer|roofing|inspection|claim/i);

    mockDb.quote.findFirst.mockResolvedValue({ id: 'quote-1' });
    mockDb.proposal.findFirst.mockResolvedValue({ id: 'proposal-1' });
    mockDb.task.findFirst.mockResolvedValue({ id: 'task-1' });
    mockProjectsRepository.findById.mockResolvedValue(dealRecord({ dealStatus: 'Proposal Sent' }));

    await projectsService.moveDealStage('deal-1', 'tenant-1', 'Proposal Sent', {}, 'user-1');

    expect(mockDb.quote.create).toHaveBeenCalledTimes(1);
    expect(mockDb.proposal.create).toHaveBeenCalledTimes(1);
    expect(mockDb.task.create).toHaveBeenCalledTimes(1);
  });
});
