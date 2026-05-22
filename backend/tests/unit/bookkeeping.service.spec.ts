const mockDb = {
  tenant: { findUnique: jest.fn() },
  file: { findFirst: jest.fn() },
  invoice: { findFirst: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  expense: { findFirst: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  client: { findMany: jest.fn() },
  bookkeepingAccount: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  bookkeepingCategory: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  bookkeepingVendor: { findFirst: jest.fn(), create: jest.fn() },
  bookkeepingTransaction: { create: jest.fn(), findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  bookkeepingJournalEntry: { count: jest.fn(), create: jest.fn() },
};

jest.mock('../../src/config/database', () => ({ prisma: mockDb }));
jest.mock('../../src/common/services/activity-logger.service', () => ({
  activityLogger: { log: jest.fn() },
}));

import { bookkeepingService } from '../../src/modules/bookkeeping/bookkeeping.service';

describe('BookkeepingService', () => {
  beforeEach(() => {
    jest.clearAllMocks();
    mockDb.tenant.findUnique.mockResolvedValue({ id: 'tenant-1', settings: { currency: 'CAD' } });
    mockDb.bookkeepingAccount.count.mockResolvedValue(0);
    mockDb.bookkeepingAccount.findMany.mockResolvedValue([]);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue(null);
    mockDb.bookkeepingAccount.create.mockImplementation(({ data }) => Promise.resolve({ id: `acct-${data.name}`, ...data }));
    mockDb.bookkeepingAccount.update.mockResolvedValue({});
    mockDb.bookkeepingCategory.findFirst.mockResolvedValue(null);
    mockDb.bookkeepingCategory.create.mockImplementation(({ data }) => Promise.resolve({ id: `cat-${data.name}`, ...data }));
    mockDb.bookkeepingCategory.count.mockResolvedValue(0);
    mockDb.bookkeepingTransaction.count.mockResolvedValue(0);
    mockDb.bookkeepingTransaction.findFirst.mockResolvedValue(null);
    mockDb.bookkeepingTransaction.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', ...data }));
  });

  it('sets up default accounts and categories under the current tenant', async () => {
    await bookkeepingService.setup('tenant-1', 'user-1');

    expect(mockDb.bookkeepingAccount.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Bank Account', currency: 'CAD' }),
    }));
    expect(mockDb.bookkeepingCategory.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', name: 'Subscriptions', type: 'INCOME' }),
    }));
  });

  it('creates a posted income transaction and increases the selected account balance', async () => {
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });

    await bookkeepingService.createTransaction('tenant-1', {
      accountId: 'account-1',
      type: 'INCOME',
      description: 'Invoice payment',
      amount: 250,
      currency: 'CAD',
      transactionDate: '2026-05-22',
      status: 'POSTED',
    }, 'user-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ tenantId: 'tenant-1', amount: 250, sourceType: 'MANUAL' }),
    }));
    expect(mockDb.bookkeepingAccount.update).toHaveBeenCalledWith({
      where: { id: 'account-1' },
      data: { currentBalance: { increment: 250 } },
    });
  });

  it('rejects unbalanced journal entries before posting', async () => {
    await expect(bookkeepingService.createJournalEntry('tenant-1', {
      description: 'Bad entry',
      entryDate: '2026-05-22',
      lines: [
        { accountId: 'account-1', debit: 100, credit: 0 },
        { accountId: 'account-2', debit: 0, credit: 50 },
      ],
    })).rejects.toThrow('Journal entry must balance');
  });
});
