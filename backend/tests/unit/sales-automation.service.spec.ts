const mockDb = {
  salesAutomationRule: {
    findFirst: jest.fn(),
    create: jest.fn(),
    findMany: jest.fn(),
    update: jest.fn(),
    delete: jest.fn(),
  },
  salesAutomationRun: {
    findFirst: jest.fn(),
    create: jest.fn(),
    update: jest.fn(),
    findMany: jest.fn(),
  },
  salesReminderSchedule: {
    findFirst: jest.fn(),
    findMany: jest.fn(),
    upsert: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
  },
  automationIdempotencyKey: {
    create: jest.fn(),
    update: jest.fn(),
    updateMany: jest.fn(),
    findFirst: jest.fn(),
  },
  tenant: { findUnique: jest.fn() },
  lead: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  proposal: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn(), create: jest.fn() },
  invoice: { findFirst: jest.fn(), create: jest.fn() },
  invoicePayment: { findFirst: jest.fn() },
  task: { findFirst: jest.fn(), create: jest.fn() },
  project: { findFirst: jest.fn(), update: jest.fn() },
  client: { findFirst: jest.fn() },
  contact: { updateMany: jest.fn() },
  folder: { findFirst: jest.fn(), create: jest.fn() },
  employee: { findMany: jest.fn() },
};

jest.mock('../../src/config/database', () => ({ prisma: mockDb }));
jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));
jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notificationsService: { create: jest.fn() },
}));
jest.mock('../../src/modules/bookkeeping/bookkeeping.service', () => ({
  bookkeepingService: {
    syncInvoicePayment: jest.fn(),
    syncExpense: jest.fn(),
    createInvoicePaymentReversal: jest.fn(),
    voidSourceTransaction: jest.fn(),
  },
}));
jest.mock('../../src/modules/invoices/invoices.service', () => ({
  invoicesService: { saveInvoicePdfToDocuments: jest.fn() },
}));
jest.mock('../../src/modules/proposals/proposals.service', () => ({
  proposalsService: { saveProposalPdfToDocuments: jest.fn() },
}));
jest.mock('../../src/modules/contracts/contracts.service', () => ({
  contractsService: { saveContractPdfToDocuments: jest.fn() },
}));
jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: { sendTenantEmail: jest.fn() },
}));
jest.mock('../../src/common/services/client-lifecycle.service', () => ({
  clientLifecycleService: { progressTo: jest.fn() },
}));

import { salesAutomationService } from '../../src/modules/automation/sales-automation.service';

describe('SalesAutomationService', () => {
  const claimedKeys = new Set<string>();

  beforeEach(() => {
    jest.clearAllMocks();
    claimedKeys.clear();
    mockDb.salesAutomationRule.findFirst.mockResolvedValue(null);
    mockDb.salesAutomationRule.findMany.mockResolvedValue([]);
    mockDb.salesAutomationRule.create.mockImplementation(({ data }) => Promise.resolve({ id: `rule-${data.name}`, ...data }));
    mockDb.salesAutomationRun.findFirst.mockResolvedValue(null);
    mockDb.salesAutomationRun.create.mockImplementation(({ data }) => Promise.resolve({ id: 'run-1', ...data }));
    mockDb.salesAutomationRun.update.mockImplementation(({ data }) => Promise.resolve({ id: 'run-1', ...data }));
    mockDb.automationIdempotencyKey.create.mockImplementation(({ data }) => {
      const id = `${data.tenantId}:${data.key}`;
      if (claimedKeys.has(id)) {
        const error: any = new Error('Unique constraint failed on the fields: (`tenantId`,`key`)');
        error.code = 'P2002';
        return Promise.reject(error);
      }
      claimedKeys.add(id);
      return Promise.resolve({ id: `idem-${claimedKeys.size}`, ...data });
    });
    mockDb.automationIdempotencyKey.update.mockImplementation(({ data }) => Promise.resolve({ id: 'idem-1', ...data }));
    mockDb.automationIdempotencyKey.updateMany.mockImplementation(({ data }) => Promise.resolve({ count: 1, ...data }));
    mockDb.automationIdempotencyKey.findFirst.mockImplementation(({ where }) => {
      const id = `${where.tenantId}:${where.key}`;
      return Promise.resolve(claimedKeys.has(id) ? { id: 'idem-existing', ...where, status: 'COMPLETED', retryCount: 0 } : null);
    });
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', settings: {} });
    mockDb.task.findFirst.mockResolvedValue(null);
    mockDb.task.create.mockImplementation(({ data }) => Promise.resolve({ id: 'task-1', ...data }));
    mockDb.salesReminderSchedule.updateMany.mockResolvedValue({ count: 1 });
    mockDb.salesReminderSchedule.upsert.mockImplementation(({ create }) => Promise.resolve({ id: `${create.reminderType}-${create.channel}`, ...create }));
    mockDb.salesReminderSchedule.findMany.mockResolvedValue([]);
    mockDb.salesReminderSchedule.update.mockImplementation(({ data }) => Promise.resolve({ id: 'reminder-1', ...data }));
    mockDb.invoice.findFirst.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      invoiceNumber: 'INV-1',
      dueDate: new Date('2026-06-10T00:00:00.000Z'),
      amountDue: 500,
      total: 500,
      status: 'SENT',
      clientId: 'client-1',
      projectId: 'deal-1',
      client: { id: 'client-1', clientName: 'Acme', assignedOwnerId: 'employee-1', assignedOwner: { id: 'employee-1', userId: 'user-owner' } },
    });
    mockDb.invoicePayment.findFirst.mockResolvedValue({
      id: 'payment-1',
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      amount: 500,
      status: 'SUCCESSFUL',
      paymentDate: new Date('2026-06-01T00:00:00.000Z'),
    });
    mockDb.lead.findFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });
    mockDb.lead.findUnique.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1', email: 'lead@example.com' });
    mockDb.lead.update.mockImplementation(({ data }) => Promise.resolve({ id: 'lead-1', tenantId: 'tenant-1', ...data }));
    mockDb.proposal.findFirst.mockResolvedValue({
      id: 'proposal-1',
      tenantId: 'tenant-1',
      proposalNumber: 'PR-1',
      leadId: 'lead-1',
      quoteId: 'quote-1',
      clientId: 'client-1',
      contactId: 'contact-1',
      projectId: 'deal-1',
      deliveryMethod: 'email',
      lead: { id: 'lead-1', email: 'buyer@example.com', assignedToId: 'employee-1', assignedTo: { userId: 'user-1' } },
      quote: { id: 'quote-1', total: 1200, subtotal: 1200, taxAmount: 0, discountAmount: 0, currency: 'CAD', items: [] },
      client: { id: 'client-1', primaryEmail: 'buyer@example.com' },
      project: { id: 'deal-1', clientId: 'client-1', dealOwnerId: 'employee-1' },
    });
    mockDb.contract.findFirst.mockResolvedValue({
      id: 'contract-1',
      tenantId: 'tenant-1',
      contractNumber: 'CT-1',
      title: 'Sales Contract',
      clientId: 'client-1',
      projectId: 'deal-1',
      quoteId: 'quote-1',
      value: 1200,
      currency: 'CAD',
      client: { id: 'client-1', primaryEmail: 'buyer@example.com', email: 'buyer@example.com' },
      quote: { id: 'quote-1', total: 1200, subtotal: 1200, taxAmount: 0, discountAmount: 0, currency: 'CAD', items: [] },
      project: { id: 'deal-1', clientId: 'client-1', dealOwnerId: 'employee-1' },
      createdBy: { id: 'employee-1', userId: 'user-1', user: { id: 'user-1' } },
    });
    mockDb.contract.create.mockImplementation(({ data }) => Promise.resolve({ id: 'contract-created', ...data }));
    mockDb.invoice.create.mockImplementation(({ data }) => Promise.resolve({ id: 'invoice-created', ...data }));
    mockDb.project.findFirst.mockResolvedValue({
      id: 'deal-1',
      tenantId: 'tenant-1',
      name: 'Acme Expansion',
      dealStatus: 'Qualification',
      dealOwnerId: 'employee-1',
      clientId: 'client-1',
      expectedDealValue: 15000,
      probability: 25,
    });
    mockDb.project.update.mockImplementation(({ data }) => Promise.resolve({ id: 'deal-1', tenantId: 'tenant-1', ...data }));
    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1', tenantId: 'tenant-1', clientName: 'Acme', assignedOwnerId: 'employee-1', assignedOwner: { id: 'employee-1', userId: 'user-1' } });
    mockDb.contact.updateMany.mockResolvedValue({ count: 1 });
    mockDb.folder.findFirst.mockResolvedValue(null);
    mockDb.folder.create.mockImplementation(({ data }) => Promise.resolve({ id: 'folder-1', ...data }));
    mockDb.employee.findMany.mockResolvedValue([]);
  });

  it('seeds default rules only once for a tenant', async () => {
    const result = await salesAutomationService.seedDefaults('tenant-1', 'user-1');

    expect(result.created).toBeGreaterThan(0);
    expect(mockDb.salesAutomationRule.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', triggerType: 'invoice.sent', createdById: 'user-1' }),
    }));
  });

  it('schedules invoice reminders idempotently and cancels previous schedules first', async () => {
    await salesAutomationService.scheduleInvoiceReminders('tenant-1', 'invoice-1');

    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith({
      where: { tenantId: 'tenant-1', entityType: 'Invoice', entityId: 'invoice-1', status: 'SCHEDULED' },
      data: { status: 'CANCELLED', cancelledAt: expect.any(Date) },
    });
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(10);
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Invoice', entityId: 'invoice-1', reminderType: 'invoice.overdue.14d', channel: 'EMAIL' }),
    }));
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Invoice', entityId: 'invoice-1', reminderType: 'invoice.due.today', channel: 'EMAIL' }),
    }));
  });

  it('rejects cancelling another tenant reminder', async () => {
    mockDb.salesReminderSchedule.findFirst.mockResolvedValue(null);

    await expect(salesAutomationService.cancelReminder('tenant-1', 'reminder-other')).rejects.toThrow('Reminder not found');
    expect(mockDb.salesReminderSchedule.update).not.toHaveBeenCalled();
  });

  it('evaluates simple deterministic conditions without executing code', () => {
    expect(salesAutomationService.conditionsMatch({ status: { equals: 'SENT' }, amount: { greaterThan: 100 } }, { status: 'SENT', amount: 250 })).toBe(true);
    expect(salesAutomationService.conditionsMatch({ status: { notEquals: 'PAID' }, ownerId: { exists: true } }, { status: 'PAID', ownerId: 'owner-1' })).toBe(false);
  });

  it('keeps Sales CRM lead.created automation active without roofing language', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValueOnce([
      { id: 'rule-lead', conditions: {}, actions: ['create_followup_task'], runOncePerEntity: true },
    ]);

    await salesAutomationService.executeTrigger('lead.created', 'Lead', 'lead-1', {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      leadName: 'Acme Account',
      ownerId: 'employee-1',
      ownerUserId: 'user-1',
    });

    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        title: 'Follow up with Acme Account',
        description: expect.not.stringMatching(/roof|inspection|property|claim/i),
      }),
    }));
  });

  it('publishing the same lead.created event twice creates one follow-up task and one notification', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-lead', conditions: {}, actions: ['create_followup_task', 'notify_owner'], runOncePerEntity: false },
    ]);

    const event = {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      leadName: 'Acme Account',
      ownerId: 'employee-1',
      ownerUserId: 'user-1',
    };

    await salesAutomationService.executeTrigger('lead.created', 'Lead', 'lead-1', event);
    await salesAutomationService.executeTrigger('lead.created', 'Lead', 'lead-1', event);

    expect(mockDb.task.create).toHaveBeenCalledTimes(1);
    const { notificationsService } = require('../../src/modules/notifications/notifications.service');
    expect(notificationsService.create).toHaveBeenCalledTimes(1);
  });

  it('lead.qualified creates the default deal task once', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-qualified', conditions: {}, actions: ['create_default_deal_task', 'notify_owner'], runOncePerEntity: false },
    ]);
    mockDb.lead.findFirst.mockResolvedValue({
      id: 'lead-1',
      tenantId: 'tenant-1',
      firstName: 'Alex',
      lastName: 'Buyer',
      companyName: 'Acme',
      assignedToId: 'employee-1',
      convertedToClientId: 'client-1',
      convertedToDealId: 'deal-1',
    });

    const event = { tenantId: 'tenant-1', leadId: 'lead-1', leadName: 'Alex Buyer', ownerId: 'employee-1', ownerUserId: 'user-1' };
    await salesAutomationService.executeTrigger('lead.qualified', 'Lead', 'lead-1', event);
    await salesAutomationService.executeTrigger('lead.qualified', 'Lead', 'lead-1', event);

    expect(mockDb.task.create).toHaveBeenCalledTimes(1);
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ leadId: 'lead-1', clientId: 'client-1', projectId: 'deal-1' }),
    }));
  });

  it('stale lead creates reminder task and owner escalation notification', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-stale', conditions: {}, actions: ['create_stale_lead_task', 'notify_owner'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('lead.stale', 'Lead', 'lead-1', {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      leadName: 'Acme Account',
      ownerId: 'employee-1',
      ownerUserId: 'user-1',
      daysInactive: 7,
    });

    const { notificationsService } = require('../../src/modules/notifications/notifications.service');
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'lead-1:stale-lead' }),
    }));
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Lead needs follow-up',
      userId: 'user-1',
    }));
  });

  it('disqualified lead cancels reminders and creates nurture follow-up', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-disqualified', conditions: {}, actions: ['cancel_lead_reminders', 'create_nurture_followup'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('lead.disqualified', 'Lead', 'lead-1', {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      leadName: 'Acme Account',
      ownerId: 'employee-1',
      reason: 'Not a fit',
    });

    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Lead', entityId: 'lead-1', status: 'SCHEDULED' }),
    }));
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'lead-1:disqualified-nurture' }),
    }));
  });

  it('deal.created creates first task and document folder once', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-deal-created', conditions: {}, actions: ['create_first_deal_task', 'create_deal_document_folder'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', dealId: 'deal-1', projectId: 'deal-1', dealName: 'Acme Expansion', ownerId: 'employee-1', value: 15000 };

    await salesAutomationService.executeTrigger('deal.created', 'Deal', 'deal-1', event);
    await salesAutomationService.executeTrigger('deal.created', 'Deal', 'deal-1', event);

    expect(mockDb.task.create).toHaveBeenCalledTimes(1);
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ projectId: 'deal-1', referenceDocname: 'deal-1:first-deal-task' }),
    }));
    expect(mockDb.folder.create).toHaveBeenCalledTimes(1);
    expect(mockDb.folder.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Deal - Acme Expansion' }),
    }));
  });

  it('deal.stageChanged Discovery creates requirements and demo task', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-deal-stage', conditions: {}, actions: ['create_stage_followup_task'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('deal.stageChanged', 'Deal', 'deal-1', {
      tenantId: 'tenant-1',
      dealId: 'deal-1',
      dealName: 'Acme Expansion',
      newStageName: 'Discovery',
      ownerId: 'employee-1',
    });

    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        projectId: 'deal-1',
        referenceDocname: 'deal-1:discovery:requirements-demo-task',
        title: expect.stringContaining('Confirm requirements and demo plan'),
      }),
    }));
  });

  it('deal.stageChanged Proposal creates proposal task and reminders once', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-deal-stage', conditions: {}, actions: ['create_stage_followup_task', 'schedule_stage_reminder'], runOncePerEntity: false },
    ]);
    const event = { tenantId: 'tenant-1', dealId: 'deal-1', dealName: 'Acme Expansion', newStageName: 'Proposal Sent', ownerId: 'employee-1' };

    await salesAutomationService.executeTrigger('deal.stageChanged', 'Deal', 'deal-1', event);
    await salesAutomationService.executeTrigger('deal.stageChanged', 'Deal', 'deal-1', event);

    expect(mockDb.task.create).toHaveBeenCalledTimes(1);
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'deal-1:proposal-sent:proposal-task' }),
    }));
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(2);
  });

  it('deal.won triggers next workflow once', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-deal-won', conditions: {}, actions: ['start_customer_onboarding'], runOncePerEntity: false },
    ]);
    const event = { tenantId: 'tenant-1', dealId: 'deal-1', projectId: 'deal-1', dealName: 'Acme Expansion', ownerId: 'employee-1' };

    await salesAutomationService.executeTrigger('deal.won', 'Deal', 'deal-1', event);
    await salesAutomationService.executeTrigger('deal.won', 'Deal', 'deal-1', event);

    expect(mockDb.task.create).toHaveBeenCalledTimes(2);
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ clientId: 'client-1', referenceDocname: 'client-1:onboarding-started' }),
    }));
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'deal-1:won-next-workflow' }),
    }));
  });

  it('deal.lost cancels reminders and creates nurture task', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-deal-lost', conditions: {}, actions: ['cancel_deal_reminders', 'create_lost_nurture_task'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('deal.lost', 'Deal', 'deal-1', {
      tenantId: 'tenant-1',
      dealId: 'deal-1',
      dealName: 'Acme Expansion',
      lostReason: 'No budget',
      ownerId: 'employee-1',
    });

    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Deal', entityId: 'deal-1', status: 'SCHEDULED' }),
    }));
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'deal-1:lost-nurture-task' }),
    }));
  });

  it('deal.stale creates escalation task and manager notification', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-deal-stale', conditions: {}, actions: ['create_stale_deal_task', 'notify_owner'], runOncePerEntity: false },
    ]);
    mockDb.employee.findMany.mockResolvedValue([{ id: 'admin-1', userId: 'admin-user', user: { id: 'admin-user' } }]);

    await salesAutomationService.executeTrigger('deal.stale', 'Deal', 'deal-1', {
      tenantId: 'tenant-1',
      dealId: 'deal-1',
      dealName: 'Acme Expansion',
      ownerId: 'employee-1',
      ownerUserId: 'owner-user',
      daysInactive: 10,
      escalate: true,
    });

    const { notificationsService } = require('../../src/modules/notifications/notifications.service');
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'deal-1:stale-deal-task' }),
    }));
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'owner-user', title: 'Deal needs follow-up' }));
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({ userId: 'admin-user', title: 'Stalled deal needs attention' }));
  });

  it('test-trigger rejects cross-tenant deal automation', async () => {
    mockDb.project.findFirst.mockResolvedValueOnce(null);

    await expect(salesAutomationService.testTrigger('tenant-1', {
      triggerType: 'deal.created',
      entityType: 'Deal',
      entityId: 'deal-other',
    })).rejects.toThrow('Deal not found for this tenant');
    expect(mockDb.project.findFirst).toHaveBeenCalledWith({ where: { id: 'deal-other', tenantId: 'tenant-1' } });
  });

  it('same proposal.sent event creates only one reminder set', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal', conditions: {}, actions: ['schedule_proposal_followup'], runOncePerEntity: false },
    ]);
    mockDb.salesReminderSchedule.findFirst.mockImplementation(({ where }) => Promise.resolve({ id: `${where.reminderType}-${where.channel}`, ...where }));

    const event = { tenantId: 'tenant-1', proposalId: 'proposal-1', quoteNumber: 'P-1' };

    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', event);
    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', event);

    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(2);
  });

  it('disabled module does not run module automation side effects', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', settings: { enabledModules: ['automation', 'tasks', 'notifications'] } });
    const rule = { id: 'rule-proposal', triggerType: 'proposal.sent', conditions: {}, actions: ['save_proposal_document'], runOncePerEntity: false };
    mockDb.salesAutomationRule.findMany.mockResolvedValueOnce([rule]);

    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      leadId: 'lead-1',
    });

    const { proposalsService } = require('../../src/modules/proposals/proposals.service');
    expect(proposalsService.saveProposalPdfToDocuments).not.toHaveBeenCalled();
    expect(mockDb.salesAutomationRun.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'SKIPPED',
        output: expect.objectContaining({ reason: 'module_disabled', module: 'documents' }),
      }),
    }));
  });

  it('failed automation side effect is logged', async () => {
    const { proposalsService } = require('../../src/modules/proposals/proposals.service');
    proposalsService.saveProposalPdfToDocuments.mockRejectedValueOnce(new Error('PDF service unavailable'));
    const rule = { id: 'rule-proposal', triggerType: 'proposal.sent', conditions: {}, actions: ['save_proposal_document'], runOncePerEntity: false };
    mockDb.salesAutomationRule.findMany.mockResolvedValueOnce([rule]);

    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      leadId: 'lead-1',
    });

    expect(mockDb.salesAutomationRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        status: 'FAILED',
        error: 'PDF service unavailable',
        output: expect.objectContaining({ error: 'PDF service unavailable' }),
      }),
    }));
  });

  it('proposal.sent saves the proposal PDF document once through automation', async () => {
    const { proposalsService } = require('../../src/modules/proposals/proposals.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal-document', conditions: {}, actions: ['save_proposal_document'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', proposalId: 'proposal-1', quoteNumber: 'P-1', salesRepId: 'employee-1' };

    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', event);
    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', event);

    expect(proposalsService.saveProposalPdfToDocuments).toHaveBeenCalledTimes(1);
    expect(proposalsService.saveProposalPdfToDocuments).toHaveBeenCalledWith('tenant-1', 'proposal-1', 'employee-1', 'sent');
  });

  it('proposal.sent updates deal stage, sends email, and schedules reminders once', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal-sent', conditions: {}, actions: ['update_deal_stage', 'send_proposal_email', 'schedule_proposal_followup', 'notify_owner'], runOncePerEntity: false },
    ]);
    const event = {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      quoteNumber: 'PR-1',
      salesRepId: 'employee-1',
      recipientEmail: 'buyer@example.com',
      ownerUserId: 'user-1',
      deliveryMethod: 'email',
      proposalLink: '/proposal-view/proposal-1',
    };

    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', event);
    await salesAutomationService.executeTrigger('proposal.sent', 'Proposal', 'proposal-1', event);

    expect(mockDb.project.update).toHaveBeenCalledTimes(1);
    expect(mockDb.project.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'deal-1' },
      data: expect.objectContaining({ dealStatus: 'Proposal Sent', probability: 50 }),
    }));
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledTimes(1);
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      to: 'buyer@example.com',
      subject: 'Proposal PR-1 from your sales team',
      html: expect.not.stringMatching(/roof|roofing|shingles|underlayment|flashing|decking|inspection|insurance claim/i),
      text: expect.not.stringMatching(/roof|roofing|shingles|underlayment|flashing|decking|inspection|insurance claim/i),
    }));
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(2);
  });

  it('proposal.accepted saves an accepted proposal PDF without duplicating repeated events', async () => {
    const { proposalsService } = require('../../src/modules/proposals/proposals.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal-accepted-document', conditions: {}, actions: ['save_proposal_document'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', proposalId: 'proposal-1', salesRepId: 'employee-1' };

    await salesAutomationService.executeTrigger('proposal.accepted', 'Proposal', 'proposal-1', event);
    await salesAutomationService.executeTrigger('proposal.accepted', 'Proposal', 'proposal-1', event);

    expect(proposalsService.saveProposalPdfToDocuments).toHaveBeenCalledTimes(1);
    expect(proposalsService.saveProposalPdfToDocuments).toHaveBeenCalledWith('tenant-1', 'proposal-1', 'employee-1', 'accepted');
  });

  it('proposal.accepted creates contract and draft invoice according to tenant settings', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      settings: {
        proposalAutomation: {
          createContractOnAcceptance: true,
          createDraftInvoiceOnAcceptance: true,
        },
      },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal-accepted', conditions: {}, actions: ['mark_deal_won', 'create_onboarding_task'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('proposal.accepted', 'Proposal', 'proposal-1', {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      salesRepId: 'employee-1',
      ownerUserId: 'user-1',
      total: 1200,
    });
    await salesAutomationService.executeTrigger('proposal.accepted', 'Proposal', 'proposal-1', {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      salesRepId: 'employee-1',
      ownerUserId: 'user-1',
      total: 1200,
    });

    expect(mockDb.project.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'deal-1' },
      data: expect.objectContaining({ dealStatus: 'Won', probability: 100 }),
    }));
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Proposal', entityId: 'proposal-1', status: 'SCHEDULED' }),
    }));
    expect(mockDb.contract.create).toHaveBeenCalledTimes(1);
    expect(mockDb.invoice.create).toHaveBeenCalledTimes(1);
  });

  it('proposal.declined creates owner notification and follow-up task', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal-declined', conditions: {}, actions: ['create_declined_followup_task', 'notify_owner'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('proposal.declined', 'Proposal', 'proposal-1', {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      ownerUserId: 'user-1',
      reason: 'Needs pricing change',
    });

    const { notificationsService } = require('../../src/modules/notifications/notifications.service');
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'proposal-1:declined-followup-task' }),
    }));
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Proposal declined',
      userId: 'user-1',
    }));
  });

  it('proposal.expired cancels reminders and creates follow-up task', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-proposal-expired', conditions: {}, actions: ['cancel_proposal_reminders', 'create_expired_followup_task'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('proposal.expired', 'Proposal', 'proposal-1', {
      tenantId: 'tenant-1',
      proposalId: 'proposal-1',
      ownerUserId: 'user-1',
    });

    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Proposal', entityId: 'proposal-1', status: 'SCHEDULED' }),
    }));
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'proposal-1:expired-followup-task' }),
    }));
  });

  it('contract.signed saves signed contract PDF through tenant-scoped automation', async () => {
    const { contractsService } = require('../../src/modules/contracts/contracts.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-contract-document', conditions: {}, actions: ['save_contract_document'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('contract.signed', 'Contract', 'contract-1', {
      tenantId: 'tenant-2',
      contractId: 'contract-1',
      ownerUserId: 'user-2',
    });

    expect(contractsService.saveContractPdfToDocuments).toHaveBeenCalledWith('tenant-2', 'contract-1', 'user-2', 'signed');
  });

  it('contract.sent sends email and saves PDF once', async () => {
    const { contractsService } = require('../../src/modules/contracts/contracts.service');
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-contract-sent', conditions: {}, actions: ['send_contract_email', 'save_contract_document', 'schedule_contract_reminders'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', contractId: 'contract-1', contractNumber: 'CT-1', recipientEmail: 'buyer@example.com', ownerUserId: 'user-1' };
    await salesAutomationService.executeTrigger('contract.sent', 'Contract', 'contract-1', event);
    await salesAutomationService.executeTrigger('contract.sent', 'Contract', 'contract-1', event);

    expect(contractsService.saveContractPdfToDocuments).toHaveBeenCalledTimes(1);
    expect(contractsService.saveContractPdfToDocuments).toHaveBeenCalledWith('tenant-1', 'contract-1', 'user-1', 'sent');
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledTimes(1);
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      to: 'buyer@example.com',
      subject: 'Contract CT-1 ready for review',
    }));
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(2);
  });

  it('contract.signed saves signed PDF, creates invoice when enabled, and updates customer lifecycle', async () => {
    const { contractsService } = require('../../src/modules/contracts/contracts.service');
    const { clientLifecycleService } = require('../../src/common/services/client-lifecycle.service');
    mockDb.tenant.findUnique.mockResolvedValue({
      id: 'tenant-1',
      settings: { contractAutomation: { createDraftInvoiceOnSigned: true } },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-contract-signed', conditions: {}, actions: ['save_contract_document', 'create_invoice_draft', 'update_customer_lifecycle'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('contract.signed', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      ownerUserId: 'user-1',
    });
    await salesAutomationService.executeTrigger('contract.signed', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      ownerUserId: 'user-1',
    });

    expect(contractsService.saveContractPdfToDocuments).toHaveBeenCalledTimes(1);
    expect(contractsService.saveContractPdfToDocuments).toHaveBeenCalledWith('tenant-1', 'contract-1', 'user-1', 'signed');
    expect(mockDb.project.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'deal-1' },
      data: expect.objectContaining({ dealStatus: 'Won', probability: 100 }),
    }));
    expect(mockDb.invoice.create).toHaveBeenCalledTimes(1);
    expect(clientLifecycleService.progressTo).toHaveBeenCalledWith('client-1', 'tenant-1', 'ONBOARDING');
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Contract', entityId: 'contract-1', status: 'SCHEDULED' }),
    }));
  });

  it('contract.signed starts customer success onboarding once', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-contract-signed', conditions: {}, actions: ['start_customer_onboarding'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('contract.signed', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      ownerUserId: 'user-1',
    });
    await salesAutomationService.executeTrigger('contract.signed', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      ownerUserId: 'user-1',
    });

    const onboardingTasks = mockDb.task.create.mock.calls.filter(([arg]) => arg.data?.referenceDocname === 'client-1:onboarding-started');
    expect(onboardingTasks).toHaveLength(1);
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Customer', entityId: 'client-1', reminderType: 'customer.success.followup', channel: 'TASK' }),
    }));
  });

  it('invoice.paid starts customer success onboarding once', async () => {
    mockDb.invoice.findFirst.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      invoiceNumber: 'INV-1',
      amountDue: 0,
      status: 'PAID',
      clientId: 'client-1',
      projectId: 'deal-1',
      client: { id: 'client-1', clientName: 'Acme', assignedOwnerId: 'employee-1', assignedOwner: { id: 'employee-1', userId: 'user-1' } },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-invoice-paid', conditions: {}, actions: ['start_customer_onboarding'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('invoice.paid', 'Invoice', 'invoice-1', {
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      ownerUserId: 'user-1',
    });
    await salesAutomationService.executeTrigger('invoice.paid', 'Invoice', 'invoice-1', {
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      ownerUserId: 'user-1',
    });

    const onboardingTasks = mockDb.task.create.mock.calls.filter(([arg]) => arg.data?.referenceDocname === 'client-1:onboarding-started');
    expect(onboardingTasks).toHaveLength(1);
  });

  it('contract.signed and invoice.paid do not duplicate customer onboarding for the same customer', async () => {
    mockDb.invoice.findFirst.mockResolvedValue({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      invoiceNumber: 'INV-1',
      amountDue: 0,
      status: 'PAID',
      clientId: 'client-1',
      projectId: 'deal-1',
      client: { id: 'client-1', clientName: 'Acme', assignedOwnerId: 'employee-1', assignedOwner: { id: 'employee-1', userId: 'user-1' } },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-onboarding', conditions: {}, actions: ['start_customer_onboarding'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('contract.signed', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      ownerUserId: 'user-1',
    });
    await salesAutomationService.executeTrigger('invoice.paid', 'Invoice', 'invoice-1', {
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      ownerUserId: 'user-1',
    });

    const onboardingTasks = mockDb.task.create.mock.calls.filter(([arg]) => arg.data?.referenceDocname === 'client-1:onboarding-started');
    expect(onboardingTasks).toHaveLength(1);
  });

  it('cross-tenant customer success automation is blocked', async () => {
    mockDb.client.findFirst.mockResolvedValueOnce(null);
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-onboarding', conditions: {}, actions: ['start_customer_onboarding'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('deal.won', 'Deal', 'deal-1', {
      tenantId: 'tenant-1',
      dealId: 'deal-1',
      projectId: 'deal-1',
    });

    const onboardingTasks = mockDb.task.create.mock.calls.filter(([arg]) => arg.data?.referenceDocname === 'client-1:onboarding-started');
    expect(onboardingTasks).toHaveLength(0);
    expect(mockDb.salesAutomationRun.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'FAILED', error: 'Customer does not belong to this tenant' }),
    }));
  });

  it('contract.declined creates follow-up task and owner notification', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-contract-declined', conditions: {}, actions: ['create_contract_followup_task', 'notify_owner'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('contract.declined', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      reason: 'Terms not accepted',
      ownerUserId: 'user-1',
    });

    const { notificationsService } = require('../../src/modules/notifications/notifications.service');
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'contract-1:declined-followup-task' }),
    }));
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Contract declined',
      userId: 'user-1',
    }));
  });

  it('contract.expiring creates renewal task and owner reminder', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-contract-expiring', conditions: {}, actions: ['create_contract_renewal_task', 'notify_owner'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('contract.expiring', 'Contract', 'contract-1', {
      tenantId: 'tenant-1',
      contractId: 'contract-1',
      ownerUserId: 'user-1',
      daysUntilExpiry: 14,
    });

    const { notificationsService } = require('../../src/modules/notifications/notifications.service');
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ referenceDocname: 'contract-1:expiring-renewal-task' }),
    }));
    expect(notificationsService.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Contract expiring soon',
      userId: 'user-1',
    }));
  });

  it('invoice.created archives a draft PDF document once', async () => {
    const { invoicesService } = require('../../src/modules/invoices/invoices.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-invoice-created', conditions: {}, actions: ['save_invoice_pdf'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', invoiceId: 'invoice-1', invoiceNumber: 'INV-1', ownerUserId: 'user-1' };
    await salesAutomationService.executeTrigger('invoice.created', 'Invoice', 'invoice-1', event);
    await salesAutomationService.executeTrigger('invoice.created', 'Invoice', 'invoice-1', event);

    expect(invoicesService.saveInvoicePdfToDocuments).toHaveBeenCalledTimes(1);
    expect(invoicesService.saveInvoicePdfToDocuments).toHaveBeenCalledWith('tenant-1', 'invoice-1', 'user-1');
  });

  it('invoice.sent saves PDF and schedules the production reminder cadence once', async () => {
    const { invoicesService } = require('../../src/modules/invoices/invoices.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-invoice-sent', conditions: {}, actions: ['save_invoice_pdf', 'schedule_invoice_reminders'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', invoiceId: 'invoice-1', invoiceNumber: 'INV-1', ownerUserId: 'user-1' };
    await salesAutomationService.executeTrigger('invoice.sent', 'Invoice', 'invoice-1', event);
    await salesAutomationService.executeTrigger('invoice.sent', 'Invoice', 'invoice-1', event);

    expect(invoicesService.saveInvoicePdfToDocuments).toHaveBeenCalledTimes(1);
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(10);
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ reminderType: 'invoice.due.soon', channel: 'EMAIL' }),
    }));
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ reminderType: 'invoice.overdue.14d', channel: 'EMAIL' }),
    }));
  });

  it('payment.received syncs bookkeeping once and cancels reminders only when invoice is fully paid', async () => {
    const { bookkeepingService } = require('../../src/modules/bookkeeping/bookkeeping.service');
    mockDb.invoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      invoiceNumber: 'INV-1',
      amountDue: 0,
      status: 'PAID',
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-payment-received', conditions: {}, actions: ['sync_bookkeeping', 'cancel_invoice_reminders'], runOncePerEntity: false },
    ]);

    const event = { tenantId: 'tenant-1', invoiceId: 'invoice-1', paymentId: 'payment-1', status: 'PAID', ownerUserId: 'user-1' };
    await salesAutomationService.executeTrigger('payment.received', 'InvoicePayment', 'payment-1', event);
    await salesAutomationService.executeTrigger('payment.received', 'InvoicePayment', 'payment-1', event);

    expect(bookkeepingService.syncInvoicePayment).toHaveBeenCalledTimes(1);
    expect(bookkeepingService.syncInvoicePayment).toHaveBeenCalledWith('tenant-1', 'payment-1');
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Invoice', entityId: 'invoice-1', status: 'SCHEDULED' }),
    }));
  });

  it('partial payment keeps remaining reminders active and syncs bookkeeping', async () => {
    const { bookkeepingService } = require('../../src/modules/bookkeeping/bookkeeping.service');
    mockDb.invoice.findFirst.mockResolvedValueOnce({
      id: 'invoice-1',
      tenantId: 'tenant-1',
      invoiceNumber: 'INV-1',
      dueDate: new Date('2026-06-10T00:00:00.000Z'),
      amountDue: 250,
      total: 500,
      status: 'PARTIALLY_PAID',
      client: { assignedOwner: { userId: 'user-owner' } },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-partial-payment', conditions: {}, actions: ['sync_bookkeeping', 'schedule_invoice_reminders'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('payment.received', 'InvoicePayment', 'payment-1', {
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      paymentId: 'payment-1',
      status: 'PARTIALLY_PAID',
      ownerUserId: 'user-1',
    });

    expect(bookkeepingService.syncInvoicePayment).toHaveBeenCalledWith('tenant-1', 'payment-1');
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(10);
  });

  it('refund and partial refund create bookkeeping reversals without duplicating repeated events', async () => {
    const { bookkeepingService } = require('../../src/modules/bookkeeping/bookkeeping.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-refund', conditions: {}, actions: ['sync_bookkeeping_reversal'], runOncePerEntity: false },
    ]);

    const refundEvent = { tenantId: 'tenant-1', invoiceId: 'invoice-1', paymentId: 'payment-1', amount: 500 };
    await salesAutomationService.executeTrigger('payment.refunded', 'InvoicePayment', 'payment-1', refundEvent);
    await salesAutomationService.executeTrigger('payment.refunded', 'InvoicePayment', 'payment-1', refundEvent);

    const partialEvent = { tenantId: 'tenant-1', invoiceId: 'invoice-1', paymentId: 'payment-1', refundAmount: 125 };
    await salesAutomationService.executeTrigger('payment.partiallyRefunded', 'InvoicePayment', 'payment-1', partialEvent);

    expect(bookkeepingService.createInvoicePaymentReversal).toHaveBeenCalledTimes(2);
    expect(bookkeepingService.createInvoicePaymentReversal).toHaveBeenCalledWith('tenant-1', 'payment-1', 500, 'REFUNDED');
    expect(bookkeepingService.createInvoicePaymentReversal).toHaveBeenCalledWith('tenant-1', 'payment-1', 125, 'PARTIALLY_REFUNDED');
  });

  it('failed and voided payments use bookkeeping sync so revenue is corrected', async () => {
    const { bookkeepingService } = require('../../src/modules/bookkeeping/bookkeeping.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-payment-correction', conditions: {}, actions: ['sync_bookkeeping_reversal'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('payment.failed', 'InvoicePayment', 'payment-1', {
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      paymentId: 'payment-1',
    });
    await salesAutomationService.executeTrigger('payment.voided', 'InvoicePayment', 'payment-2', {
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      paymentId: 'payment-2',
    });

    expect(bookkeepingService.syncInvoicePayment).toHaveBeenCalledWith('tenant-1', 'payment-1');
    expect(bookkeepingService.syncInvoicePayment).toHaveBeenCalledWith('tenant-1', 'payment-2');
  });

  it('expense create/update/approve events sync bookkeeping once per event and expense', async () => {
    const { bookkeepingService } = require('../../src/modules/bookkeeping/bookkeeping.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-expense-sync', conditions: {}, actions: ['sync_bookkeeping_expense'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('expense.updated', 'Expense', 'expense-1', {
      tenantId: 'tenant-1',
      expenseId: 'expense-1',
      amount: 125,
      category: 'Software',
    });
    await salesAutomationService.executeTrigger('expense.updated', 'Expense', 'expense-1', {
      tenantId: 'tenant-1',
      expenseId: 'expense-1',
      amount: 125,
      category: 'Software',
    });

    expect(bookkeepingService.syncExpense).toHaveBeenCalledTimes(1);
    expect(bookkeepingService.syncExpense).toHaveBeenCalledWith('tenant-1', 'expense-1');
  });

  it('expense.deleted voids the source bookkeeping transaction once', async () => {
    const { bookkeepingService } = require('../../src/modules/bookkeeping/bookkeeping.service');
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-expense-delete', conditions: {}, actions: ['void_bookkeeping_expense'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('expense.deleted', 'Expense', 'expense-1', {
      tenantId: 'tenant-1',
      expenseId: 'expense-1',
    });
    await salesAutomationService.executeTrigger('expense.deleted', 'Expense', 'expense-1', {
      tenantId: 'tenant-1',
      expenseId: 'expense-1',
    });

    expect(bookkeepingService.voidSourceTransaction).toHaveBeenCalledTimes(1);
    expect(bookkeepingService.voidSourceTransaction).toHaveBeenCalledWith('tenant-1', 'EXPENSE', 'expense-1');
  });

  it('idempotency keys are tenant-scoped', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-lead', conditions: {}, actions: ['create_followup_task'], runOncePerEntity: false },
    ]);

    await salesAutomationService.executeTrigger('lead.created', 'Lead', 'lead-1', {
      tenantId: 'tenant-1',
      leadId: 'lead-1',
      leadName: 'Tenant One Lead',
      ownerId: 'employee-1',
    });
    await salesAutomationService.executeTrigger('lead.created', 'Lead', 'lead-1', {
      tenantId: 'tenant-2',
      leadId: 'lead-1',
      leadName: 'Tenant Two Lead',
      ownerId: 'employee-2',
    });

    expect(mockDb.task.create).toHaveBeenCalledTimes(2);
  });

  it('email reminder calls tenant mailer and marks reminder sent after delivery', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true, senderEmail: 'sales@example.com', senderName: 'Sales' });
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([
      {
        id: 'reminder-email-1',
        tenantId: 'tenant-1',
        entityType: 'Invoice',
        entityId: 'invoice-1',
        reminderType: 'invoice.due.today',
        channel: 'EMAIL',
        scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
        payload: { recipientEmail: 'customer@example.com', recipientName: 'Customer', ownerUserId: 'user-1', invoiceNumber: 'INV-1', amountDue: 500 },
      },
    ]);

    await salesAutomationService.processDueReminders(100, { workerId: 'worker-a' });

    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      preferredUserId: 'user-1',
      to: 'customer@example.com',
      subject: 'Invoice due today',
    }));
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith({
      where: { id: 'reminder-email-1', status: 'PROCESSING', claimedBy: 'worker-a' },
      data: { status: 'SENT', sentAt: expect.any(Date), lastError: null, processingStartedAt: null },
    });
  });

  it('failed email reminder marks reminder failed', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: false, error: 'smtp rejected' });
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([
      {
        id: 'reminder-email-2',
        tenantId: 'tenant-1',
        entityType: 'Invoice',
        entityId: 'invoice-1',
        reminderType: 'invoice.due.today',
        channel: 'EMAIL',
        scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
        payload: { recipientEmail: 'customer@example.com' },
      },
    ]);

    await salesAutomationService.processDueReminders(100, { workerId: 'worker-a' });

    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith({
      where: { id: 'reminder-email-2', status: 'PROCESSING', claimedBy: 'worker-a' },
      data: { status: 'FAILED', lastError: 'smtp rejected', processingStartedAt: null },
    });
    expect(mockDb.salesReminderSchedule.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'reminder-email-2' }),
      data: expect.objectContaining({ status: 'SENT' }),
    }));
  });

  it('task reminder still creates a task and marks sent', async () => {
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([
      {
        id: 'reminder-task-1',
        tenantId: 'tenant-1',
        entityType: 'Invoice',
        entityId: 'invoice-1',
        reminderType: 'invoice.overdue',
        channel: 'TASK',
        scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
        payload: {},
      },
    ]);

    await salesAutomationService.processDueReminders(100, { workerId: 'worker-a' });

    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', referenceDoctype: 'SalesReminderSchedule', referenceDocname: 'reminder-task-1' }),
    }));
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith({
      where: { id: 'reminder-task-1', status: 'PROCESSING', claimedBy: 'worker-a' },
      data: { status: 'SENT', sentAt: expect.any(Date), lastError: null, processingStartedAt: null },
    });
  });

  it('missing email recipient fails instead of silently marking sent', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([
      {
        id: 'reminder-email-3',
        tenantId: 'tenant-1',
        entityType: 'Invoice',
        entityId: 'invoice-1',
        reminderType: 'invoice.due.today',
        channel: 'EMAIL',
        scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
        payload: {},
      },
    ]);

    await salesAutomationService.processDueReminders(100, { workerId: 'worker-a' });

    expect(tenantMailerService.sendTenantEmail).not.toHaveBeenCalled();
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith({
      where: { id: 'reminder-email-3', status: 'PROCESSING', claimedBy: 'worker-a' },
      data: { status: 'FAILED', lastError: 'Email reminder is missing recipient email', processingStartedAt: null },
    });
  });

  it('email reminder delivery uses the reminder tenant scope', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true, senderEmail: 'sales@example.com', senderName: 'Sales' });
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([
      {
        id: 'reminder-email-tenant',
        tenantId: 'tenant-2',
        entityType: 'Proposal',
        entityId: 'proposal-1',
        reminderType: 'proposal.followup.2d',
        channel: 'EMAIL',
        scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
        payload: { recipientEmail: 'buyer@example.com', ownerUserId: 'user-2' },
      },
    ]);

    await salesAutomationService.processDueReminders(100, { workerId: 'worker-a' });

    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-2', preferredUserId: 'user-2' }));
  });

  it('two simulated workers cannot process the same reminder twice', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true });
    const dueReminder = {
      id: 'reminder-race',
      tenantId: 'tenant-1',
      entityType: 'Invoice',
      entityId: 'invoice-1',
      reminderType: 'invoice.due.today',
      channel: 'EMAIL',
      scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
      payload: { recipientEmail: 'customer@example.com' },
    };
    mockDb.salesReminderSchedule.findMany.mockResolvedValue([dueReminder]);
    let claimAttempts = 0;
    mockDb.salesReminderSchedule.updateMany.mockImplementation(({ data }) => {
      if (data.status === 'PROCESSING') {
        claimAttempts += 1;
        return Promise.resolve({ count: claimAttempts === 1 ? 1 : 0 });
      }
      return Promise.resolve({ count: 1 });
    });

    const first = await salesAutomationService.processDueReminders(100, { workerId: 'worker-a' });
    const second = await salesAutomationService.processDueReminders(100, { workerId: 'worker-b' });

    expect(first.processed).toBe(1);
    expect(second.processed).toBe(0);
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledTimes(1);
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ id: 'reminder-race' }),
      data: expect.objectContaining({ status: 'PROCESSING', claimedBy: 'worker-a' }),
    }));
  });

  it('claimed reminder is not picked by another worker before the processing timeout', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true });
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([]);

    const result = await salesAutomationService.processDueReminders(100, { workerId: 'worker-b' });

    expect(result.processed).toBe(0);
    expect(tenantMailerService.sendTenantEmail).not.toHaveBeenCalled();
    expect(mockDb.salesReminderSchedule.updateMany).not.toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PROCESSING', claimedBy: 'worker-b' }),
    }));
  });

  it('stuck PROCESSING reminder can be retried after timeout', async () => {
    const { tenantMailerService } = require('../../src/common/services/tenant-mailer.service');
    tenantMailerService.sendTenantEmail.mockResolvedValue({ sent: true });
    const oldProcessingStartedAt = new Date('2026-05-01T00:00:00.000Z');
    mockDb.salesReminderSchedule.findMany.mockResolvedValueOnce([
      {
        id: 'reminder-stuck',
        tenantId: 'tenant-1',
        entityType: 'Invoice',
        entityId: 'invoice-1',
        reminderType: 'invoice.due.today',
        channel: 'EMAIL',
        status: 'PROCESSING',
        claimedBy: 'dead-worker',
        processingStartedAt: oldProcessingStartedAt,
        scheduledFor: new Date('2026-05-01T00:00:00.000Z'),
        attemptCount: 1,
        payload: { recipientEmail: 'customer@example.com' },
      },
    ]);

    const result = await salesAutomationService.processDueReminders(100, { workerId: 'worker-retry', stuckAfterMs: 1 });

    expect(result.processed).toBe(1);
    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledTimes(1);
    expect(mockDb.salesReminderSchedule.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'reminder-stuck',
        OR: expect.arrayContaining([
          { status: 'PROCESSING', processingStartedAt: { lte: expect.any(Date) } },
        ]),
      }),
      data: expect.objectContaining({
        status: 'PROCESSING',
        claimedBy: 'worker-retry',
        attemptCount: { increment: 1 },
      }),
    }));
  });

  it('test-trigger defaults to dry-run and creates no side effects', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-lead', name: 'Lead follow-up', conditions: {}, actions: ['create_followup_task'], runOncePerEntity: false },
    ]);

    const result = await salesAutomationService.testTrigger('tenant-1', {
      triggerType: 'lead.created',
      entityType: 'Lead',
      entityId: 'lead-1',
      input: { leadName: 'Dry Run Lead', tenantId: 'spoofed-tenant' },
    }, 'user-1');

    expect(result).toEqual(expect.objectContaining({ mode: 'dry-run', executed: false, entityType: 'Lead', entityId: 'lead-1' }));
    expect(result.plannedActions.map((item: any) => item.action)).toEqual(expect.arrayContaining(['create_followup_task', 'notify_owner']));
    expect(mockDb.task.create).not.toHaveBeenCalled();
    expect(mockDb.salesReminderSchedule.upsert).not.toHaveBeenCalled();
    expect(mockDb.lead.findFirst).toHaveBeenCalledWith({ where: { id: 'lead-1', tenantId: 'tenant-1' } });
  });

  it('test-trigger rejects invalid entity types', async () => {
    await expect(salesAutomationService.testTrigger('tenant-1', {
      triggerType: 'lead.created',
      entityType: 'SecretRecord',
      entityId: 'secret-1',
    })).rejects.toThrow('Unsupported automation entity type');
  });

  it('test-trigger rejects cross-tenant or missing entities', async () => {
    mockDb.proposal.findFirst.mockResolvedValueOnce(null);

    await expect(salesAutomationService.testTrigger('tenant-1', {
      triggerType: 'proposal.sent',
      entityType: 'Proposal',
      entityId: 'proposal-other',
    })).rejects.toThrow('Proposal not found for this tenant');
    expect(mockDb.proposal.findFirst).toHaveBeenCalledWith({ where: { id: 'proposal-other', tenantId: 'tenant-1' } });
  });

  it('test-trigger execute mode creates real side effects only when explicitly requested', async () => {
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-lead', name: 'Lead follow-up', conditions: {}, actions: ['create_followup_task'], runOncePerEntity: false },
    ]);

    const result = await salesAutomationService.testTrigger('tenant-1', {
      triggerType: 'lead.created',
      entityType: 'Lead',
      entityId: 'lead-1',
      execute: true,
      input: { leadName: 'Execute Lead', ownerId: 'employee-1' },
    }, 'user-1');

    expect(result).toEqual(expect.objectContaining({ mode: 'execute', executed: true }));
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', leadId: 'lead-1', title: 'Follow up with Execute Lead' }),
    }));
    const { activityLogger } = require('../../src/common/services/activity-logger.service');
    expect(activityLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      module: 'automation',
      description: 'Executed automation test trigger "lead.created"',
    }));
  });

  it('failed idempotency keys can be retried through a tenant-scoped repair run', async () => {
    const key = 'tenant-1:lead.created:Lead:lead-1:first-followup-task';
    claimedKeys.add(`tenant-1:${key}`);
    let keyStatus = 'FAILED';
    let retryCount = 0;

    mockDb.salesAutomationRun.findFirst.mockResolvedValueOnce({
      id: 'run-failed',
      tenantId: 'tenant-1',
      triggerType: 'lead.created',
      entityType: 'Lead',
      entityId: 'lead-1',
      status: 'FAILED',
      error: 'temporary failure',
      input: {
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        leadName: 'Repair Lead',
        ownerId: 'employee-1',
        actionType: 'first-followup-task',
        idempotencyKey: key,
      },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-lead', name: 'Lead follow-up', conditions: {}, actions: ['create_followup_task'], runOncePerEntity: false },
    ]);
    mockDb.automationIdempotencyKey.findFirst.mockImplementation(({ where }) => {
      if (where.key === key) {
        return Promise.resolve({ id: 'idem-failed', tenantId: where.tenantId, key, status: keyStatus, retryCount, error: 'temporary failure' });
      }
      return Promise.resolve(null);
    });
    mockDb.automationIdempotencyKey.updateMany.mockImplementation(({ data }) => {
      keyStatus = data.status;
      retryCount += 1;
      return Promise.resolve({ count: 1 });
    });
    mockDb.automationIdempotencyKey.update.mockImplementation(({ data }) => {
      keyStatus = data.status;
      return Promise.resolve({ id: 'idem-failed', key, retryCount, ...data });
    });

    const result = await salesAutomationService.retryRun('tenant-1', 'run-failed', 'user-admin');

    expect(result).toEqual(expect.objectContaining({
      retried: true,
      runId: 'run-failed',
      idempotencyKey: key,
      idempotencyStatus: 'COMPLETED',
      retryCount: 1,
    }));
    expect(mockDb.automationIdempotencyKey.updateMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1', key, status: 'FAILED', retryCount: { lt: expect.any(Number) } }),
      data: expect.objectContaining({
        status: 'STARTED',
        retryCount: { increment: 1 },
        lastRetriedAt: expect.any(Date),
        error: null,
      }),
    }));
    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', leadId: 'lead-1', title: 'Follow up with Repair Lead' }),
    }));
  });

  it('enforces max retry limit for failed automation idempotency keys', async () => {
    const key = 'tenant-1:lead.created:Lead:lead-1:first-followup-task';
    mockDb.salesAutomationRun.findFirst.mockResolvedValueOnce({
      id: 'run-failed',
      tenantId: 'tenant-1',
      triggerType: 'lead.created',
      entityType: 'Lead',
      entityId: 'lead-1',
      status: 'FAILED',
      input: { idempotencyKey: key, leadId: 'lead-1' },
    });
    mockDb.automationIdempotencyKey.findFirst.mockResolvedValueOnce({
      id: 'idem-failed',
      tenantId: 'tenant-1',
      key,
      status: 'FAILED',
      retryCount: 3,
      error: 'still broken',
    });

    await expect(salesAutomationService.retryRun('tenant-1', 'run-failed', 'user-admin')).rejects.toThrow('Automation retry limit has been reached');
    expect(mockDb.task.create).not.toHaveBeenCalled();
  });

  it('blocks cross-tenant automation repair attempts', async () => {
    mockDb.salesAutomationRun.findFirst.mockResolvedValueOnce(null);

    await expect(salesAutomationService.retryRun('tenant-1', 'run-other-tenant', 'user-admin')).rejects.toThrow('Automation run not found');
    expect(mockDb.automationIdempotencyKey.updateMany).not.toHaveBeenCalled();
  });

  it('does not duplicate a partially completed side effect during retry', async () => {
    const key = 'tenant-1:lead.created:Lead:lead-1:first-followup-task';
    claimedKeys.add(`tenant-1:${key}`);
    let keyStatus = 'FAILED';
    let retryCount = 0;

    mockDb.salesAutomationRun.findFirst.mockResolvedValueOnce({
      id: 'run-failed',
      tenantId: 'tenant-1',
      triggerType: 'lead.created',
      entityType: 'Lead',
      entityId: 'lead-1',
      status: 'FAILED',
      input: {
        tenantId: 'tenant-1',
        leadId: 'lead-1',
        leadName: 'Existing Lead',
        ownerId: 'employee-1',
        idempotencyKey: key,
      },
    });
    mockDb.salesAutomationRule.findMany.mockResolvedValue([
      { id: 'rule-lead', name: 'Lead follow-up', conditions: {}, actions: ['create_followup_task'], runOncePerEntity: false },
    ]);
    mockDb.task.findFirst.mockResolvedValueOnce({ id: 'task-existing', tenantId: 'tenant-1', leadId: 'lead-1' });
    mockDb.automationIdempotencyKey.findFirst.mockImplementation(({ where }) => {
      if (where.key === key) return Promise.resolve({ id: 'idem-failed', tenantId: where.tenantId, key, status: keyStatus, retryCount, error: 'post-create failure' });
      return Promise.resolve(null);
    });
    mockDb.automationIdempotencyKey.updateMany.mockImplementation(() => {
      keyStatus = 'STARTED';
      retryCount += 1;
      return Promise.resolve({ count: 1 });
    });
    mockDb.automationIdempotencyKey.update.mockImplementation(({ data }) => {
      keyStatus = data.status;
      return Promise.resolve({ id: 'idem-failed', key, retryCount, ...data });
    });

    await salesAutomationService.retryRun('tenant-1', 'run-failed', 'user-admin');

    expect(mockDb.task.create).not.toHaveBeenCalled();
    expect(mockDb.automationIdempotencyKey.update).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'COMPLETED' }),
    }));
  });
});
