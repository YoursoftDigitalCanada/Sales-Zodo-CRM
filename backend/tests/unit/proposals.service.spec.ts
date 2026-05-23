const mockRepository = {
  findById: jest.fn(),
};

jest.mock('../../src/modules/proposals/proposals.repository', () => ({
  proposalsRepository: mockRepository,
}));

jest.mock('@prisma/client', () => ({
  PrismaClient: jest.fn().mockImplementation(() => ({})),
}));

jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

jest.mock('../../src/common/events/event-bus', () => ({
  eventBus: { emit: jest.fn() },
}));

import { ProposalsService } from '../../src/modules/proposals/proposals.service';

describe('ProposalsService tenant isolation', () => {
  beforeEach(() => {
    jest.clearAllMocks();
  });

  it('proposal PDF generation uses tenant-scoped proposal lookup', async () => {
    mockRepository.findById.mockResolvedValue(null);
    const service = new ProposalsService();

    await expect(service.generatePdf('proposal-other-tenant', 'tenant-1')).rejects.toThrow('Proposal not found');
    expect(mockRepository.findById).toHaveBeenCalledWith('proposal-other-tenant', 'tenant-1');
  });
});
