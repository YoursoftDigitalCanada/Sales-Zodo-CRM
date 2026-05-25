const mockNotificationsRepository = {
  create: jest.fn(),
  createMany: jest.fn(),
  findMany: jest.fn(),
  findById: jest.fn(),
  markAsRead: jest.fn(),
  markManyAsRead: jest.fn(),
  markAllAsRead: jest.fn(),
  delete: jest.fn(),
  getUnreadCount: jest.fn(),
  getCountByType: jest.fn(),
  deleteOlderThan: jest.fn(),
};

const mockPrisma = {
  user: {
    findFirst: jest.fn(),
    findUnique: jest.fn(),
  },
  tenantSettings: {
    findUnique: jest.fn(),
  },
};

jest.mock('../../src/modules/notifications/notifications.repository', () => ({
  notificationsRepository: mockNotificationsRepository,
}));

jest.mock('../../src/config/database', () => ({
  prisma: mockPrisma,
}));

jest.mock('../../src/modules/notifications/web-push.provider', () => ({
  WebPushProvider: jest.fn().mockImplementation(() => ({ send: jest.fn() })),
}));

import { notificationsService } from '../../src/modules/notifications/notifications.service';

describe('NotificationsService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockPrisma.user.findFirst.mockResolvedValue({ id: 'user-1' });
    mockNotificationsRepository.create.mockImplementation(({ userId, tenantId, title, message, type = 'INFO', actionUrl, actionLabel, metadata }) => Promise.resolve({
      id: 'notification-1',
      userId,
      tenantId,
      title,
      message,
      type,
      actionUrl,
      actionLabel,
      metadata,
      isRead: false,
      createdAt: new Date('2026-05-25T00:00:00.000Z'),
    }));
    mockNotificationsRepository.createMany.mockResolvedValue({ count: 2 });
    mockNotificationsRepository.markAsRead.mockResolvedValue({ count: 1 });
    mockNotificationsRepository.markManyAsRead.mockResolvedValue({ count: 2 });
  });

  it('creates tenant-scoped notifications and canonicalizes old invoice routes', async () => {
    const result = await notificationsService.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      title: 'Invoice Paid',
      message: 'Invoice INV-1 was paid.',
      actionUrl: '/invoices/invoice-1',
      metadata: { invoiceId: 'invoice-1' },
    });

    expect(mockPrisma.user.findFirst).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({
        id: 'user-1',
        OR: expect.arrayContaining([{ tenantId: 'tenant-1' }]),
      }),
    }));
    expect(mockNotificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      tenantId: 'tenant-1',
      userId: 'user-1',
      actionUrl: '/invoice/invoice-1',
      metadata: expect.objectContaining({ invoiceId: 'invoice-1' }),
    }));
    expect(result.actionUrl).toBe('/invoice/invoice-1');
  });

  it('rewrites legacy project notification language and routes to deals', async () => {
    await notificationsService.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      title: 'Project Status Updated',
      message: 'Alex changed project "Acme" status from Open to Won.',
      actionLabel: 'View Project',
      actionUrl: '/projects/deal-1',
      metadata: { projectId: 'deal-1' },
    });

    expect(mockNotificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      title: 'Deal Status Updated',
      message: 'Alex changed deal "Acme" status from Open to Won.',
      actionLabel: 'View Deal',
      actionUrl: '/deals?dealId=deal-1',
      metadata: expect.objectContaining({ projectId: 'deal-1', dealId: 'deal-1' }),
    }));
  });

  it('derives Sales CRM action URLs from linked metadata when no action URL is provided', async () => {
    await notificationsService.create({
      tenantId: 'tenant-1',
      userId: 'user-1',
      title: 'Proposal viewed',
      message: 'A proposal was viewed.',
      metadata: { proposalId: 'proposal-1' },
    });

    expect(mockNotificationsRepository.create).toHaveBeenCalledWith(expect.objectContaining({
      actionUrl: '/proposals?proposalId=proposal-1',
    }));
  });

  it('rejects cross-tenant notification recipients', async () => {
    mockPrisma.user.findFirst.mockResolvedValueOnce(null);

    await expect(notificationsService.create({
      tenantId: 'tenant-1',
      userId: 'user-other',
      title: 'Cross tenant',
      message: 'Should not be created',
    })).rejects.toThrow('Notification recipient does not belong to this tenant');
    expect(mockNotificationsRepository.create).not.toHaveBeenCalled();
  });

  it('marks only current-user current-tenant notifications as read', async () => {
    await notificationsService.markAsRead('notification-1', 'user-1', 'tenant-1');
    await notificationsService.markManyAsRead(['notification-1', 'notification-2'], 'user-1', 'tenant-1');

    expect(mockNotificationsRepository.markAsRead).toHaveBeenCalledWith('notification-1', 'user-1', 'tenant-1');
    expect(mockNotificationsRepository.markManyAsRead).toHaveBeenCalledWith(['notification-1', 'notification-2'], 'user-1', 'tenant-1');
  });
});
