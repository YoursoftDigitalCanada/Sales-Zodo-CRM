const handlers: Record<string, Array<(payload: any) => Promise<void> | void>> = {};

const mockDb = {
  tenant: { findUnique: jest.fn() },
  proposal: { findFirst: jest.fn(), findUnique: jest.fn() },
  lead: { findFirst: jest.fn(), findUnique: jest.fn(), update: jest.fn() },
  signedContract: { updateMany: jest.fn() },
  projectStage: { findFirst: jest.fn() },
  invoice: { count: jest.fn() },
  fileFolder: { create: jest.fn() },
  employee: { findMany: jest.fn() },
};

const tenantMailerSend = jest.fn();
const smsSend = jest.fn();
const communicationCreate = jest.fn();
const taskCreate = jest.fn();
const calendarCreate = jest.fn();
const notificationCreate = jest.fn();
const activityLog = jest.fn();
const generatePdf = jest.fn();
const clientCreate = jest.fn();
const projectCreate = jest.fn();
const invoiceCreate = jest.fn();

jest.mock('../../src/config/database', () => ({ prisma: mockDb }));
jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: {
    on: jest.fn((event: string, handler: (payload: any) => Promise<void> | void) => {
      handlers[event] = handlers[event] || [];
      handlers[event].push(handler);
    }),
    emit: jest.fn(),
  },
}));
jest.mock('../../src/common/utils/logger', () => ({
  logger: { debug: jest.fn(), info: jest.fn(), warn: jest.fn(), error: jest.fn() },
}));
jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: { sendTenantEmail: tenantMailerSend },
}));
jest.mock('../../src/common/services/sms.service', () => ({
  smsService: { sendSms: smsSend },
}));
jest.mock('../../src/modules/communication-logs/communication-log.service', () => ({
  communicationLogService: { createSafe: communicationCreate },
}));
jest.mock('../../src/modules/tasks/tasks.service', () => ({
  tasksService: { create: taskCreate },
}));
jest.mock('../../src/modules/calendar/calendar.service', () => ({
  calendarService: { create: calendarCreate },
}));
jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notificationsService: { create: notificationCreate },
}));
jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: activityLog },
}));
jest.mock('../../src/modules/proposals/proposals.service', () => ({
  proposalsService: { generatePdf },
}));
jest.mock('../../src/modules/clients/clients.service', () => ({
  clientsService: { create: clientCreate },
}));
jest.mock('../../src/modules/projects/projects.service', () => ({
  projectsService: { create: projectCreate },
}));
jest.mock('../../src/modules/invoices/invoices.service', () => ({
  invoicesService: { create: invoiceCreate },
}));
jest.mock('../../src/modules/automation/automation-idempotency.service', () => ({
  automationIdempotencyService: {
    runOnce: jest.fn((_tenantId, _key, _meta, action) => action()),
  },
}));

import { stage4SendWorkflowService } from '../../src/modules/proposals/stage4-send-workflow.service';
import { stage5ConversionWorkflowService } from '../../src/modules/proposals/stage5-conversion-workflow.service';
import { proposalReminderService } from '../../src/modules/proposals/proposal-reminder.service';

const proposalSentEvent = {
  tenantId: 'tenant-sales',
  proposalId: 'proposal-1',
  quoteId: 'quote-1',
  quoteNumber: 'PR-1',
  leadId: 'lead-1',
  leadName: 'Acme Buyer',
  leadEmail: 'buyer@example.com',
  leadPhone: '+15555550100',
  salesRepId: 'employee-1',
  ownerUserId: 'user-1',
  deliveryMethod: 'email_sms',
  proposalLink: '/proposal-view/proposal-1',
  publicToken: 'token-1',
  total: 1200,
};

const proposalAcceptedEvent = {
  tenantId: 'tenant-sales',
  proposalId: 'proposal-1',
  quoteId: 'quote-1',
  quoteNumber: 'PR-1',
  leadId: 'lead-1',
  leadName: 'Acme Buyer',
  clientEmail: 'buyer@example.com',
  clientPhone: '+15555550100',
  salesRepId: 'employee-1',
  ownerUserId: 'user-1',
  total: 1200,
};

const flushPromises = () => new Promise<void>((resolve) => setImmediate(resolve));

describe('legacy proposal automation gate', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    for (const key of Object.keys(handlers)) delete handlers[key];
    (proposalReminderService as any).scheduledProposals?.clear();
    (proposalReminderService as any).sentReminders?.clear();

    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-sales', settings: { enabledModules: ['automation', 'proposals', 'emails'] } });
    mockDb.proposal.findFirst.mockResolvedValue({ id: 'proposal-1', status: 'SENT' });
    mockDb.proposal.findUnique.mockResolvedValue({
      id: 'proposal-1',
      quoteId: 'quote-1',
      quote: { items: [{ description: 'Line item', quantity: 1, unitPrice: 1200 }] },
    });
    mockDb.lead.findFirst.mockResolvedValue({ status: 'NEW' });
    mockDb.lead.findUnique.mockResolvedValue({
      id: 'lead-1',
      firstName: 'Acme',
      lastName: 'Buyer',
      email: 'buyer@example.com',
      phone: '+15555550100',
      assignedToId: 'employee-1',
      assignedTo: { id: 'employee-1', userId: 'user-1' },
      leadSource: { name: 'Website' },
      propertyAddress: '123 Main St',
    });
    mockDb.lead.update.mockResolvedValue({ id: 'lead-1', status: 'PROPOSAL' });
    mockDb.signedContract.updateMany.mockResolvedValue({ count: 1 });
    mockDb.projectStage.findFirst.mockResolvedValue({ id: 'stage-contract-signed' });
    mockDb.invoice.count.mockResolvedValue(0);
    mockDb.fileFolder.create.mockResolvedValue({ id: 'folder-1' });
    mockDb.employee.findMany.mockResolvedValue([{ userId: 'admin-user' }]);
    tenantMailerSend.mockResolvedValue({ sent: true });
    smsSend.mockResolvedValue(true);
    taskCreate.mockResolvedValue({ id: 'task-1' });
    calendarCreate.mockResolvedValue({ id: 'event-1' });
    notificationCreate.mockResolvedValue({ id: 'notification-1' });
    generatePdf.mockResolvedValue({ buffer: Buffer.from('pdf'), fileName: 'proposal.pdf' });
    clientCreate.mockResolvedValue({ id: 'client-1' });
    projectCreate.mockResolvedValue({ id: 'project-1', name: 'Roofing Project - Acme Buyer' });
    invoiceCreate.mockResolvedValue({ id: 'invoice-1' });
  });

  it('Sales CRM tenant does not execute legacy Stage 4 roofing proposal send workflow', async () => {
    stage4SendWorkflowService.initialize();

    handlers['proposal.sent'][0](proposalSentEvent);
    await flushPromises();

    expect(tenantMailerSend).not.toHaveBeenCalled();
    expect(smsSend).not.toHaveBeenCalled();
    expect(taskCreate).not.toHaveBeenCalled();
    expect(calendarCreate).not.toHaveBeenCalled();
    expect((proposalReminderService as any).scheduledProposals.size).toBe(0);
  });

  it('Sales CRM tenant does not schedule legacy roofing proposal reminders directly', async () => {
    await proposalReminderService.scheduleReminders({
      tenantId: 'tenant-sales',
      proposalId: 'proposal-1',
      leadId: 'lead-1',
      senderUserId: 'user-1',
      leadName: 'Acme Buyer',
      leadEmail: 'buyer@example.com',
      leadPhone: '+15555550100',
      proposalLink: '/proposal-view/proposal-1',
      sentAt: new Date(),
    });

    expect((proposalReminderService as any).scheduledProposals.size).toBe(0);
    expect(tenantMailerSend).not.toHaveBeenCalled();
  });

  it('Sales CRM tenant does not execute legacy Stage 5 roofing conversion workflow', async () => {
    stage5ConversionWorkflowService.initialize();

    handlers['proposal.accepted'][0](proposalAcceptedEvent);
    await flushPromises();

    expect(clientCreate).not.toHaveBeenCalled();
    expect(projectCreate).not.toHaveBeenCalled();
    expect(invoiceCreate).not.toHaveBeenCalled();
    expect(taskCreate).not.toHaveBeenCalledWith(expect.any(String), expect.objectContaining({
      title: expect.stringMatching(/Final inspection|Roof/i),
    }));
    expect(tenantMailerSend).not.toHaveBeenCalled();
  });

  it('roofing-enabled tenant can still execute legacy proposal workflow when explicitly enabled', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-roofing', settings: { enabledModules: ['roofing-automation'] } });
    stage4SendWorkflowService.initialize();

    handlers['proposal.sent'][0]({ ...proposalSentEvent, tenantId: 'tenant-roofing' });
    await flushPromises();
    await flushPromises();

    expect(tenantMailerSend).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-roofing',
      subject: expect.stringContaining('Roofing Proposal'),
    }));
    expect((proposalReminderService as any).scheduledProposals.size).toBe(1);
  });

  it('roofing-enabled tenant can still execute legacy Stage 5 workflow when explicitly enabled', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-roofing', settings: { enabledModules: ['roofing-automation'] } });
    stage5ConversionWorkflowService.initialize();

    handlers['proposal.accepted'][0]({ ...proposalAcceptedEvent, tenantId: 'tenant-roofing' });
    await flushPromises();
    await flushPromises();

    expect(projectCreate).toHaveBeenCalledWith('tenant-roofing', expect.objectContaining({
      name: expect.stringContaining('Roofing Project'),
    }), 'employee-1');
    expect(taskCreate).toHaveBeenCalledWith('tenant-roofing', expect.objectContaining({
      title: expect.stringContaining('Final inspection'),
    }));
    expect(tenantMailerSend).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-roofing',
      subject: expect.stringContaining('roofing project'),
    }));
  });

});
