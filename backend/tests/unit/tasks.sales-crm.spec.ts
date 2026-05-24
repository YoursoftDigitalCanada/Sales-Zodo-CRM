const mockTasksRepository = {
  create: jest.fn(),
  findById: jest.fn(),
  findMany: jest.fn(),
  update: jest.fn(),
  updateStatus: jest.fn(),
  delete: jest.fn(),
  employeeExists: jest.fn(),
  projectExists: jest.fn(),
  clientExists: jest.fn(),
  leadExists: jest.fn(),
  contactExists: jest.fn(),
  proposalExists: jest.fn(),
  contractExists: jest.fn(),
  invoiceExists: jest.fn(),
  assign: jest.fn(),
};

const mockActivityLogger = { log: jest.fn() };
const mockEventBus = { emit: jest.fn() };

jest.mock('../../src/modules/tasks/tasks.repository', () => ({
  tasksRepository: mockTasksRepository,
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: mockActivityLogger,
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: mockEventBus,
}));

import { tasksService } from '../../src/modules/tasks/tasks.service';
import { createTaskSchema } from '../../src/modules/tasks/tasks.validators';

function taskRecord(overrides: Record<string, unknown> = {}) {
  return {
    id: 'task-1',
    tenantId: 'tenant-1',
    title: 'Follow up with buyer',
    description: 'Confirm next step',
    status: 'TODO',
    priority: 'MEDIUM',
    dueDate: new Date('2026-05-26T00:00:00.000Z'),
    startDate: null,
    completedAt: null,
    estimatedTime: null,
    actualTime: null,
    assignedToId: 'employee-1',
    assignedTo: {
      id: 'employee-1',
      user: { firstName: 'Sam', lastName: 'Seller', email: 'sam@example.test' },
    },
    createdById: 'employee-1',
    createdBy: {
      id: 'employee-1',
      user: { firstName: 'Sam', lastName: 'Seller' },
    },
    projectId: 'deal-1',
    project: { id: 'deal-1', name: 'Expansion Deal' },
    clientId: 'client-1',
    client: { id: 'client-1', clientName: 'Acme Software' },
    leadId: 'lead-1',
    referenceDoctype: 'Contact',
    referenceDocname: 'contact-1',
    tags: [],
    subtasks: [],
    createdAt: new Date('2026-05-25T00:00:00.000Z'),
    updatedAt: new Date('2026-05-25T00:00:00.000Z'),
    ...overrides,
  } as any;
}

describe('Sales CRM task and activity hardening', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockTasksRepository.employeeExists.mockResolvedValue(true);
    mockTasksRepository.projectExists.mockResolvedValue(true);
    mockTasksRepository.clientExists.mockResolvedValue(true);
    mockTasksRepository.leadExists.mockResolvedValue(true);
    mockTasksRepository.contactExists.mockResolvedValue(true);
    mockTasksRepository.proposalExists.mockResolvedValue(true);
    mockTasksRepository.contractExists.mockResolvedValue(true);
    mockTasksRepository.invoiceExists.mockResolvedValue(true);
    mockTasksRepository.create.mockResolvedValue(taskRecord());
    mockTasksRepository.findById.mockResolvedValue(taskRecord());
    mockTasksRepository.update.mockResolvedValue(taskRecord({ title: 'Updated task' }));
    mockTasksRepository.updateStatus.mockResolvedValue(taskRecord({ status: 'DONE', completedAt: new Date('2026-05-25T12:00:00.000Z') }));
    mockTasksRepository.findMany.mockResolvedValue({ data: [taskRecord()], total: 1 });
  });

  it('validates required Sales CRM task fields and supported reference types', () => {
    const parsed = createTaskSchema.safeParse({
      body: {
        title: 'Call decision maker',
        description: 'Confirm proposal timeline',
        dueDate: '2026-05-26T00:00:00.000Z',
        assignedToId: '11111111-1111-4111-8111-111111111111',
        priority: 'HIGH',
        status: 'TODO',
        referenceDoctype: 'Contact',
        referenceDocname: '22222222-2222-4222-8222-222222222222',
      },
    });

    expect(parsed.success).toBe(true);
    expect(createTaskSchema.safeParse({
      body: {
        title: 'Invalid reference',
        referenceDoctype: 'Inspection',
        referenceDocname: 'legacy-1',
      },
    }).success).toBe(false);
    expect(createTaskSchema.safeParse({
      body: {
        title: 'Missing reference id',
        referenceDoctype: 'Contact',
      },
    }).success).toBe(false);
  });

  it('creates a tenant-scoped task and validates all related Sales CRM entities', async () => {
    await tasksService.create('tenant-1', {
      title: 'Follow up with buyer',
      assignedToId: 'employee-1',
      projectId: 'deal-1',
      clientId: 'client-1',
      leadId: 'lead-1',
      contactId: 'contact-1',
      referenceDoctype: 'Contact',
      referenceDocname: 'contact-1',
    } as any, 'employee-1');

    expect(mockTasksRepository.employeeExists).toHaveBeenCalledWith('employee-1', 'tenant-1');
    expect(mockTasksRepository.projectExists).toHaveBeenCalledWith('deal-1', 'tenant-1');
    expect(mockTasksRepository.clientExists).toHaveBeenCalledWith('client-1', 'tenant-1');
    expect(mockTasksRepository.leadExists).toHaveBeenCalledWith('lead-1', 'tenant-1');
    expect(mockTasksRepository.contactExists).toHaveBeenCalledWith('contact-1', 'tenant-1');
    expect(mockTasksRepository.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      referenceDoctype: 'Contact',
      referenceDocname: 'contact-1',
    }), 'employee-1');
    expect(mockActivityLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      entityType: 'Task',
      action: 'CREATE',
      module: 'tasks',
    }));
  });

  it('rejects cross-tenant related entities before task create/update', async () => {
    mockTasksRepository.clientExists.mockResolvedValueOnce(false);
    await expect(tasksService.create('tenant-1', {
      title: 'Bad org',
      clientId: 'other-client',
    } as any)).rejects.toThrow('Linked organization does not belong to this tenant');

    mockTasksRepository.clientExists.mockResolvedValue(true);
    mockTasksRepository.proposalExists.mockResolvedValueOnce(false);
    await expect(tasksService.create('tenant-1', {
      title: 'Bad proposal',
      referenceDoctype: 'Proposal',
      referenceDocname: 'other-proposal',
    } as any)).rejects.toThrow('Linked proposal does not belong to this tenant');
  });

  it('completes and cancels tasks with timeline activity and completion event', async () => {
    await tasksService.updateStatus('task-1', 'tenant-1', 'COMPLETED' as any, 'user-1');

    expect(mockTasksRepository.updateStatus).toHaveBeenCalledWith('task-1', 'tenant-1', 'COMPLETED');
    expect(mockEventBus.emit).toHaveBeenCalledWith('task.completed', expect.objectContaining({
      tenantId: 'tenant-1',
      taskId: 'task-1',
      completedByUserId: 'user-1',
    }));
    expect(mockActivityLogger.log).toHaveBeenCalledWith(expect.objectContaining({
      action: 'STATUS_CHANGE',
      metadata: expect.objectContaining({ newStatus: 'COMPLETED' }),
    }));

    mockEventBus.emit.mockClear();
    mockTasksRepository.updateStatus.mockResolvedValueOnce(taskRecord({ status: 'CANCELLED', completedAt: null }));
    await tasksService.updateStatus('task-1', 'tenant-1', 'CANCELLED' as any, 'user-1');
    expect(mockEventBus.emit).not.toHaveBeenCalledWith('task.completed', expect.anything());
  });

  it('lists tasks tenant-scoped and supports contact filters', async () => {
    await tasksService.getMany('tenant-1', { contactId: 'contact-1', page: 1, limit: 20 } as any);

    expect(mockTasksRepository.findMany).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({ contactId: 'contact-1' }),
      undefined,
    );
  });

  it('keeps automation-created task references intact for idempotent callers', async () => {
    await tasksService.create('tenant-1', {
      title: 'Automation follow-up',
      referenceDoctype: 'SalesAutomation',
      referenceDocname: 'tenant-1:lead.created:Lead:lead-1:first-followup-task',
    } as any, 'employee-1');

    expect(mockTasksRepository.create).toHaveBeenCalledWith('tenant-1', expect.objectContaining({
      referenceDoctype: 'SalesAutomation',
      referenceDocname: 'tenant-1:lead.created:Lead:lead-1:first-followup-task',
    }), 'employee-1');
  });
});
