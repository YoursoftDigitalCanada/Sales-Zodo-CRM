const mockLeadsRepository = {
  findById: jest.fn(),
};

const mockLeadsService = {
  updateStatus: jest.fn(),
  updateStatusWithReason: jest.fn(),
};

jest.mock('../../src/config/database', () => ({
  prisma: {
    employee: { findUnique: jest.fn() },
  },
}));

jest.mock('../../src/modules/leads/leads.repository', () => ({
  leadsRepository: mockLeadsRepository,
}));

jest.mock('../../src/modules/leads/leads.service', () => ({
  leadsService: mockLeadsService,
}));

jest.mock('../../src/modules/notifications/notifications.manager', () => ({
  notificationManager: {
    notifyLeadAssigned: jest.fn(),
    createNotification: jest.fn(),
  },
}));

import { LeadStatus } from '@prisma/client';
import { leadsManager } from '../../src/modules/leads/leads.manager';

describe('LeadsManager status updates', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockLeadsRepository.findById.mockResolvedValue({
      id: 'lead-1',
      tenantId: 'tenant-1',
      status: 'NEW',
    });
    mockLeadsService.updateStatus.mockResolvedValue({
      id: 'lead-1',
      status: 'QUALIFIED',
      convertedToDealId: 'deal-1',
    });
    mockLeadsService.updateStatusWithReason.mockResolvedValue({
      id: 'lead-1',
      status: 'LOST',
    });
  });

  it('uses the normal status path for QUALIFIED so deal creation runs', async () => {
    const result = await leadsManager.updateLeadStatus(
      {} as any,
      'lead-1',
      'tenant-1',
      'QUALIFIED' as LeadStatus,
    );

    expect(mockLeadsService.updateStatus).toHaveBeenCalledWith('lead-1', 'tenant-1', 'QUALIFIED');
    expect(mockLeadsService.updateStatusWithReason).not.toHaveBeenCalled();
    expect(result.convertedToDealId).toBe('deal-1');
  });

  it('uses the reason-aware path when closure metadata is supplied', async () => {
    await leadsManager.updateLeadStatus(
      {} as any,
      'lead-1',
      'tenant-1',
      'LOST' as LeadStatus,
      { closureReason: 'Not a fit' },
    );

    expect(mockLeadsService.updateStatusWithReason).toHaveBeenCalledWith('lead-1', 'tenant-1', {
      status: 'LOST',
      closureReason: 'Not a fit',
      duplicateOfLeadId: undefined,
      reactivateAt: undefined,
    });
    expect(mockLeadsService.updateStatus).not.toHaveBeenCalled();
  });
});
