const handlers: Record<string, Array<(payload: any) => Promise<void> | void>> = {};

const mockDb = {
  tenant: { findUnique: jest.fn() },
  employee: { findFirst: jest.fn(), findMany: jest.fn() },
  project: {
    findFirst: jest.fn(),
    create: jest.fn(),
    count: jest.fn(),
  },
  lead: { findUnique: jest.fn() },
  folder: { findFirst: jest.fn(), create: jest.fn() },
};

const tasksCreate = jest.fn();
const foldersCreate = jest.fn();
const notificationCreate = jest.fn();

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
jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));
jest.mock('../../src/modules/notifications/notifications.service', () => ({
  notificationsService: { create: notificationCreate, sendPushNotification: jest.fn() },
}));
jest.mock('../../src/modules/tasks/tasks.service', () => ({
  tasksService: { create: tasksCreate, updateStatus: jest.fn() },
}));
jest.mock('../../src/modules/calendar/calendar.service', () => ({
  calendarService: { create: jest.fn() },
}));
jest.mock('../../src/modules/folders/folders.service', () => ({
  foldersService: { create: foldersCreate },
}));
jest.mock('../../src/common/services/client-lifecycle.service', () => ({
  clientLifecycleService: { progressTo: jest.fn(), reinforceEngagement: jest.fn() },
}));
jest.mock('../../src/modules/quotes/quotes.service', () => ({
  quotesService: { create: jest.fn() },
}));
jest.mock('../../src/modules/projects/projects.service', () => ({
  projectsService: {},
}));
jest.mock('../../src/modules/invoices/invoices.service', () => ({
  invoicesService: {},
}));
jest.mock('../../src/modules/leads/leads.service', () => ({
  leadsService: {},
}));
jest.mock('../../src/modules/files/files.service', () => ({
  filesService: {},
}));
jest.mock('../../src/modules/analytics/analytics.service', () => ({
  analyticsService: {},
}));
jest.mock('../../src/modules/analytics/analytics.repository', () => ({
  analyticsRepository: {},
}));
jest.mock('../../src/common/services/tenant-mailer.service', () => ({
  tenantMailerService: { sendTenantEmail: jest.fn() },
}));
jest.mock('../../src/common/services/sms.service', () => ({
  smsService: { sendSms: jest.fn() },
}));
jest.mock('../../src/modules/communication-logs/communication-log.service', () => ({
  communicationLogService: { createSafe: jest.fn() },
}));
jest.mock('../../src/modules/leads/estimation-workflow.service', () => ({
  estimationWorkflowService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/quotes/proposal-automation.service', () => ({
  proposalAutomationService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/leads/deal-conversion.service', () => ({
  dealConversionService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/leads/lead-automation.service', () => ({
  leadAutomationService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/proposals/stage3-workflow.service', () => ({
  stage3WorkflowService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/proposals/stage4-send-workflow.service', () => ({
  stage4SendWorkflowService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/proposals/proposal-reminder.service', () => ({
  proposalReminderService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/quotes/quote-signature-reminder.service', () => ({
  quoteSignatureReminderService: { initialize: jest.fn() },
}));
jest.mock('../../src/modules/projects/seed-project-stages', () => ({
  seedProjectStages: jest.fn(() => Promise.resolve()),
}));
jest.mock('../../src/modules/automation/sales-automation.service', () => ({
  salesAutomationService: { initialize: jest.fn() },
}));

import { AutomationService } from '../../src/modules/automation/automation.service';
import { isLegacyRoofingAutomationEnabled } from '../../src/modules/automation/legacy-automation.guard';

describe('legacy roofing automation guard', () => {
  let setIntervalSpy: jest.SpyInstance;

  beforeAll(() => {
    setIntervalSpy = jest.spyOn(global, 'setInterval').mockImplementation(() => 0 as unknown as NodeJS.Timeout);
  });

  afterAll(() => {
    setIntervalSpy.mockRestore();
  });

  beforeEach(() => {
    jest.clearAllMocks();
    Object.keys(handlers).forEach((key) => delete handlers[key]);
    mockDb.tenant.findUnique.mockResolvedValue({ settings: { enabledModules: ['leads', 'automation', 'finance'] } });
  });

  it('does not enable legacy roofing automation for normal Sales CRM modules', async () => {
    await expect(isLegacyRoofingAutomationEnabled('tenant-sales')).resolves.toBe(false);
  });

  it('enables legacy roofing automation only when explicitly configured', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ settings: { enabledModules: ['roofing-automation'] } });

    await expect(isLegacyRoofingAutomationEnabled('tenant-roof')).resolves.toBe(true);
  });

  it('Sales CRM lead.created does not create inspection/property/roofing tasks or folders', async () => {
    const service = new AutomationService();
    service.initialize();

    await handlers['lead.created'][0]({
      tenantId: 'tenant-sales',
      leadId: 'lead-1',
      leadName: 'Acme Roofing Co',
      serviceType: 'Storm/Hail Damage',
      propertyAddress: '123 Main St',
      ownerId: 'emp-1',
      ownerUserId: 'user-1',
    });

    expect(tasksCreate).not.toHaveBeenCalled();
    expect(foldersCreate).not.toHaveBeenCalled();
  });

  it('Sales CRM lead.converted does not create legacy roofing project records', async () => {
    const service = new AutomationService();
    service.initialize();

    await handlers['lead.converted'][0]({
      tenantId: 'tenant-sales',
      leadId: 'lead-1',
      leadName: 'Acme',
      clientId: 'client-1',
      clientType: 'Prospect',
      convertedByUserId: 'user-1',
      ownerUserId: 'owner-user',
    });

    expect(mockDb.project.create).not.toHaveBeenCalled();
  });

  it('runs legacy roofing lead automation only for explicitly enabled tenants', async () => {
    mockDb.tenant.findUnique.mockResolvedValue({ settings: { enabledModules: ['roofing-automation'] } });
    const service = new AutomationService();
    service.initialize();

    await handlers['lead.created'][0]({
      tenantId: 'tenant-roof',
      leadId: 'lead-1',
      leadName: 'Roof Lead',
      serviceType: 'Storm/Hail Damage',
      propertyAddress: '123 Main St',
      ownerId: 'emp-1',
      ownerUserId: 'user-1',
    });

    expect(tasksCreate).toHaveBeenCalledWith('tenant-roof', expect.objectContaining({
      description: expect.stringContaining('Schedule inspection'),
    }));
  });
});
