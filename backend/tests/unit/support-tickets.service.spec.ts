jest.mock('../../src/modules/support-tickets/support-tickets.repository', () => ({
  supportTicketsRepository: {
    create: jest.fn(),
  },
}));

jest.mock('../../src/common/services/mailer.service', () => ({
  mailerService: {
    sendMailWithConfig: jest.fn(),
  },
}));

jest.mock('../../src/modules/support-tickets/support-tickets.realtime', () => ({
  supportTicketsRealtimeService: {
    publishTicketEvent: jest.fn(),
  },
}));

jest.mock('../../src/config/database', () => ({
  prisma: {
    user: {
      findUnique: jest.fn(),
    },
    superAdmin: {
      findMany: jest.fn(),
    },
  },
}));

import { mailerService } from '../../src/common/services/mailer.service';
import { prisma } from '../../src/config/database';
import { supportTicketsRealtimeService } from '../../src/modules/support-tickets/support-tickets.realtime';
import { supportTicketsRepository } from '../../src/modules/support-tickets/support-tickets.repository';
import { supportTicketsService } from '../../src/modules/support-tickets/support-tickets.service';

const mockedRepository = supportTicketsRepository as jest.Mocked<typeof supportTicketsRepository>;
const mockedMailerService = mailerService as jest.Mocked<typeof mailerService>;
const mockedRealtimeService = supportTicketsRealtimeService as jest.Mocked<typeof supportTicketsRealtimeService>;
const mockedPrisma = prisma as unknown as {
  user: { findUnique: jest.Mock };
  superAdmin: { findMany: jest.Mock };
};

describe('SupportTicketsService', () => {
  beforeEach(() => {
    mockedRepository.create.mockReset();
    mockedMailerService.sendMailWithConfig.mockReset();
    mockedRealtimeService.publishTicketEvent.mockReset();
    mockedPrisma.user.findUnique.mockReset();
    mockedPrisma.superAdmin.findMany.mockReset();
  });

  it('creates a requester ticket, emails support, and emits realtime updates', async () => {
    const createdAt = new Date('2026-03-19T10:00:00.000Z');
    const ticket = {
      id: 'ticket-1',
      ticketNumber: 'TK-0001',
      subject: 'Need help with sync',
      description: 'My support ticket is not syncing to admin.',
      status: 'OPEN',
      priority: 'HIGH',
      category: 'Technical',
      requesterUserId: 'user-1',
      requesterName: 'Jane Doe',
      requesterEmail: 'jane@example.com',
      assignee: null,
      messagesCount: 0,
      tags: [],
      attachments: [],
      tenantId: 'tenant-1',
      tenant: {
        id: 'tenant-1',
        name: 'Acme Workspace',
        slug: 'acme-workspace',
      },
      messages: [],
      createdAt,
      updatedAt: createdAt,
      resolvedAt: null,
      deletedAt: null,
    };

    mockedPrisma.user.findUnique.mockResolvedValue({
      firstName: 'Jane',
      lastName: 'Doe',
      email: 'jane@example.com',
    });
    mockedPrisma.superAdmin.findMany.mockResolvedValue([
      {
        id: 'admin-1',
        firstName: 'Sam',
        lastName: 'Support',
        email: 'support@zodo.ca',
        role: 'Owner',
      },
    ]);
    mockedRepository.create.mockResolvedValue(ticket as any);
    mockedMailerService.sendMailWithConfig.mockResolvedValue(true);

    const result = await supportTicketsService.createTicket(
      'tenant-1',
      { userId: 'user-1', email: 'jane@example.com' },
      {
        subject: 'Need help with sync',
        description: 'My support ticket is not syncing to admin.',
        priority: 'HIGH',
        category: 'Technical',
      }
    );

    expect(mockedRepository.create).toHaveBeenCalledWith(
      'tenant-1',
      expect.objectContaining({
        userId: 'user-1',
        requesterName: 'Jane Doe',
        requesterEmail: 'jane@example.com',
      }),
      expect.objectContaining({
        subject: 'Need help with sync',
        priority: 'HIGH',
      })
    );
    expect(mockedMailerService.sendMailWithConfig).toHaveBeenCalledWith(
      expect.objectContaining({
        user: 'support@zodo.ca',
        senderEmail: 'support@zodo.ca',
      }),
      expect.objectContaining({
        to: 'support@zodo.ca',
        subject: expect.stringContaining('TK-0001'),
      })
    );
    expect(mockedRealtimeService.publishTicketEvent).toHaveBeenCalledWith(
      'ticket_created',
      {
        tenantId: 'tenant-1',
        requesterUserId: 'user-1',
        requesterEmail: 'jane@example.com',
      },
      expect.objectContaining({
        admin: expect.objectContaining({
          ticket: expect.objectContaining({
            ticketNumber: 'TK-0001',
            tenant: expect.objectContaining({
              name: 'Acme Workspace',
            }),
          }),
        }),
        requester: expect.objectContaining({
          ticket: expect.objectContaining({
            ticketNumber: 'TK-0001',
            requesterName: 'Jane Doe',
          }),
        }),
      })
    );
    expect(result).toMatchObject({
      ticketNumber: 'TK-0001',
      requesterName: 'Jane Doe',
      workspaceId: 'tenant-1',
    });
    expect(result).not.toHaveProperty('tenant');
  });
});
