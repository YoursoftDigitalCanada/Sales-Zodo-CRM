import { SupportTicketsRealtimeService } from '../../src/modules/support-tickets/support-tickets.realtime';

function createMockResponse() {
  return {
    status: jest.fn().mockReturnThis(),
    setHeader: jest.fn(),
    flushHeaders: jest.fn(),
    write: jest.fn(),
    end: jest.fn(),
  };
}

describe('SupportTicketsRealtimeService', () => {
  it('delivers events to admin streams and only the matching requester stream', () => {
    const realtime = new SupportTicketsRealtimeService();
    const adminResponse = createMockResponse();
    const matchingRequesterResponse = createMockResponse();
    const otherRequesterResponse = createMockResponse();

    const disconnectAdmin = realtime.subscribeAdmin(adminResponse as any);
    const disconnectMatchingRequester = realtime.subscribeRequester(matchingRequesterResponse as any, {
      tenantId: 'tenant-1',
      userId: 'user-1',
      email: 'owner@workspace.test',
    });
    const disconnectOtherRequester = realtime.subscribeRequester(otherRequesterResponse as any, {
      tenantId: 'tenant-2',
      userId: 'user-2',
      email: 'other@workspace.test',
    });

    realtime.publishTicketEvent(
      'ticket_updated',
      {
        tenantId: 'tenant-1',
        requesterUserId: 'user-1',
        requesterEmail: 'owner@workspace.test',
      },
      {
        admin: { ticket: { id: 'ticket-1', ticketNumber: 'TK-0001' } },
        requester: { ticket: { id: 'ticket-1', ticketNumber: 'TK-0001' } },
      }
    );

    expect(adminResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: ticket_updated'));
    expect(matchingRequesterResponse.write).toHaveBeenCalledWith(expect.stringContaining('event: ticket_updated'));
    expect(otherRequesterResponse.write).not.toHaveBeenCalledWith(expect.stringContaining('event: ticket_updated'));

    disconnectAdmin();
    disconnectMatchingRequester();
    disconnectOtherRequester();
  });
});
