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
    findFirst: jest.fn(),
  },
  lead: { findFirst: jest.fn() },
  proposal: { findFirst: jest.fn() },
  contract: { findFirst: jest.fn() },
  invoice: { findFirst: jest.fn() },
  invoicePayment: { findFirst: jest.fn() },
  task: { findFirst: jest.fn(), create: jest.fn() },
  project: { findFirst: jest.fn(), update: jest.fn() },
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
  bookkeepingService: { syncInvoicePayment: jest.fn() },
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
    mockDb.automationIdempotencyKey.findFirst.mockImplementation(({ where }) => {
      const id = `${where.tenantId}:${where.key}`;
      return Promise.resolve(claimedKeys.has(id) ? { id: 'idem-existing', ...where } : null);
    });
    mockDb.task.findFirst.mockResolvedValue(null);
    mockDb.task.create.mockImplementation(({ data }) => Promise.resolve({ id: 'task-1', ...data }));
    mockDb.salesReminderSchedule.updateMany.mockResolvedValue({ count: 0 });
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
      client: { assignedOwner: { userId: 'user-owner' } },
    });
    mockDb.lead.findFirst.mockResolvedValue({ id: 'lead-1', tenantId: 'tenant-1' });
    mockDb.proposal.findFirst.mockResolvedValue({ id: 'proposal-1', tenantId: 'tenant-1' });
    mockDb.contract.findFirst.mockResolvedValue({ id: 'contract-1', tenantId: 'tenant-1' });
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
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledTimes(4);
    expect(mockDb.salesReminderSchedule.upsert).toHaveBeenCalledWith(expect.objectContaining({
      create: expect.objectContaining({ tenantId: 'tenant-1', entityType: 'Invoice', entityId: 'invoice-1', reminderType: 'invoice.overdue' }),
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
        payload: { recipientEmail: 'customer@example.com', recipientName: 'Customer', ownerUserId: 'user-1', invoiceNumber: 'INV-1', amountDue: 500 },
      },
    ]);

    await salesAutomationService.processDueReminders();

    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      preferredUserId: 'user-1',
      to: 'customer@example.com',
      subject: 'Invoice due today',
    }));
    expect(mockDb.salesReminderSchedule.update).toHaveBeenCalledWith({ where: { id: 'reminder-email-1' }, data: { status: 'SENT', sentAt: expect.any(Date) } });
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
        payload: { recipientEmail: 'customer@example.com' },
      },
    ]);

    await salesAutomationService.processDueReminders();

    expect(mockDb.salesReminderSchedule.update).toHaveBeenCalledWith({ where: { id: 'reminder-email-2' }, data: { status: 'FAILED' } });
    expect(mockDb.salesReminderSchedule.update).not.toHaveBeenCalledWith({ where: { id: 'reminder-email-2' }, data: expect.objectContaining({ status: 'SENT' }) });
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
        payload: {},
      },
    ]);

    await salesAutomationService.processDueReminders();

    expect(mockDb.task.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', referenceDoctype: 'SalesReminderSchedule', referenceDocname: 'reminder-task-1' }),
    }));
    expect(mockDb.salesReminderSchedule.update).toHaveBeenCalledWith({ where: { id: 'reminder-task-1' }, data: { status: 'SENT', sentAt: expect.any(Date) } });
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
        payload: {},
      },
    ]);

    await salesAutomationService.processDueReminders();

    expect(tenantMailerService.sendTenantEmail).not.toHaveBeenCalled();
    expect(mockDb.salesReminderSchedule.update).toHaveBeenCalledWith({ where: { id: 'reminder-email-3' }, data: { status: 'FAILED' } });
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
        payload: { recipientEmail: 'buyer@example.com', ownerUserId: 'user-2' },
      },
    ]);

    await salesAutomationService.processDueReminders();

    expect(tenantMailerService.sendTenantEmail).toHaveBeenCalledWith(expect.objectContaining({ tenantId: 'tenant-2', preferredUserId: 'user-2' }));
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
});
