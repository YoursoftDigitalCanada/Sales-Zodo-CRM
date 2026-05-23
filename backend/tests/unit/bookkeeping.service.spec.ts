const mockDb = {
  tenant: { findUnique: jest.fn() },
  file: { findFirst: jest.fn() },
  invoice: { findFirst: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  invoicePayment: { findFirst: jest.fn(), update: jest.fn(), findMany: jest.fn() },
  expense: { findFirst: jest.fn(), count: jest.fn(), aggregate: jest.fn() },
  client: { findFirst: jest.fn(), findMany: jest.fn() },
  project: { findFirst: jest.fn() },
  bookkeepingAccount: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  bookkeepingCategory: { findFirst: jest.fn(), create: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  bookkeepingVendor: { findFirst: jest.fn(), create: jest.fn(), update: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  bookkeepingTransaction: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn(), count: jest.fn(), findMany: jest.fn() },
  bookkeepingJournalEntry: { count: jest.fn(), create: jest.fn() },
  bookkeepingReconciliation: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
  bookkeepingRecurringRule: { create: jest.fn(), update: jest.fn(), findFirst: jest.fn(), findMany: jest.fn(), count: jest.fn() },
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
    mockDb.bookkeepingVendor.findFirst.mockResolvedValue({ id: 'vendor-1', tenantId: 'tenant-1', name: 'Vendor One' });
    mockDb.bookkeepingVendor.create.mockImplementation(({ data }) => Promise.resolve({ id: 'vendor-1', ...data }));
    mockDb.bookkeepingVendor.update.mockImplementation(({ data }) => Promise.resolve({ id: 'vendor-1', tenantId: 'tenant-1', ...data }));
    mockDb.bookkeepingVendor.findMany.mockResolvedValue([]);
    mockDb.bookkeepingVendor.count.mockResolvedValue(0);
    mockDb.bookkeepingTransaction.count.mockResolvedValue(0);
    mockDb.bookkeepingTransaction.findFirst.mockResolvedValue(null);
    mockDb.bookkeepingTransaction.findMany.mockResolvedValue([]);
    mockDb.bookkeepingTransaction.create.mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', ...data }));
    mockDb.bookkeepingTransaction.update.mockImplementation(({ data }) => Promise.resolve({ id: 'tx-1', tenantId: 'tenant-1', ...data }));
    mockDb.bookkeepingReconciliation.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rec-1', ...data }));
    mockDb.bookkeepingReconciliation.findFirst.mockResolvedValue({ id: 'rec-1', tenantId: 'tenant-1', accountId: 'account-1', difference: 0, metadata: { transactionIds: [] } });
    mockDb.bookkeepingReconciliation.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rec-1', tenantId: 'tenant-1', ...data }));
    mockDb.bookkeepingRecurringRule.create.mockImplementation(({ data }) => Promise.resolve({ id: 'rule-1', ...data }));
    mockDb.bookkeepingRecurringRule.findFirst.mockResolvedValue({ id: 'rule-1', tenantId: 'tenant-1' });
    mockDb.bookkeepingRecurringRule.findMany.mockResolvedValue([]);
    mockDb.bookkeepingRecurringRule.update.mockImplementation(({ data }) => Promise.resolve({ id: 'rule-1', tenantId: 'tenant-1', ...data }));
    mockDb.invoice.findFirst.mockResolvedValue({ id: 'invoice-1', tenantId: 'tenant-1', currency: 'CAD' });
    mockDb.invoicePayment.findFirst.mockResolvedValue({
      id: 'payment-1',
      tenantId: 'tenant-1',
      invoiceId: 'invoice-1',
      amount: 250,
      status: 'SUCCESSFUL',
      paymentDate: new Date('2026-05-22T00:00:00.000Z'),
      paymentMethod: 'CARD',
      paymentNumber: 'PAY-1',
      reference: 'ref-1',
      invoice: { id: 'invoice-1', tenantId: 'tenant-1', currency: 'CAD' },
    });
    mockDb.invoicePayment.update.mockImplementation(({ data }) => Promise.resolve({ id: 'payment-1', tenantId: 'tenant-1', invoiceId: 'invoice-1', amount: 250, ...data }));
    mockDb.invoicePayment.findMany.mockResolvedValue([]);
    mockDb.expense.findFirst.mockResolvedValue({
      id: 'expense-1',
      tenantId: 'tenant-1',
      title: 'Software subscription',
      category: 'SOFTWARE',
      amount: 75,
      currency: 'CAD',
      paymentDate: new Date('2026-05-22T00:00:00.000Z'),
      paymentMethod: 'CARD',
      vendor: 'Vendor One',
      receiptNumber: 'R-1',
      status: 'APPROVED',
    });
    mockDb.client.findFirst.mockResolvedValue({ id: 'client-1', tenantId: 'tenant-1' });
    mockDb.project.findFirst.mockResolvedValue({ id: 'project-1', tenantId: 'tenant-1' });
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

  it('rejects transactions linked to a client from another tenant', async () => {
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.client.findFirst.mockResolvedValue(null);

    await expect(bookkeepingService.createTransaction('tenant-1', {
      accountId: 'account-1',
      clientId: 'client-other',
      type: 'INCOME',
      description: 'Cross tenant client',
      amount: 100,
      transactionDate: '2026-05-22',
    })).rejects.toThrow('Client does not belong to this tenant');
  });

  it('blocks voiding reconciled transactions until they are unreconciled', async () => {
    mockDb.bookkeepingTransaction.findFirst.mockResolvedValue({
      id: 'tx-1',
      tenantId: 'tenant-1',
      status: 'RECONCILED',
      isReconciled: true,
      accountId: 'account-1',
    });

    await expect(bookkeepingService.voidTransaction('tx-1', 'tenant-1')).rejects.toThrow('Unreconcile this transaction');
    expect(mockDb.bookkeepingTransaction.update).not.toHaveBeenCalled();
  });

  it('syncs the same invoice payment into only one bookkeeping transaction', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.bookkeepingCategory.findFirst.mockResolvedValue({ id: 'category-1', tenantId: 'tenant-1', name: 'Subscriptions', type: 'INCOME' });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({
        id: 'tx-1',
        tenantId: 'tenant-1',
        sourceType: 'INVOICE_PAYMENT',
        sourceId: 'payment-1',
        status: 'POSTED',
        accountId: null,
      })
      .mockResolvedValueOnce({
        id: 'tx-1',
        tenantId: 'tenant-1',
        sourceType: 'INVOICE_PAYMENT',
        sourceId: 'payment-1',
        status: 'POSTED',
        accountId: null,
      });

    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');
    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledTimes(1);
    expect(mockDb.bookkeepingTransaction.update).toHaveBeenCalledTimes(1);
    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        sourceType: 'INVOICE_PAYMENT',
        sourceId: 'payment-1',
      }),
    }));
  });

  it('keeps vendors tenant-scoped', async () => {
    mockDb.bookkeepingVendor.findFirst.mockResolvedValue(null);

    await expect(bookkeepingService.getVendor('vendor-other', 'tenant-1')).rejects.toThrow('Vendor not found');
    expect(mockDb.bookkeepingVendor.findFirst).toHaveBeenCalledWith({ where: { id: 'vendor-other', tenantId: 'tenant-1' } });
  });

  it('calculates reconciliation difference from statement and account balances', async () => {
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', currentBalance: 1000 });

    await bookkeepingService.createReconciliation('tenant-1', {
      accountId: 'account-1',
      statementDate: '2026-05-23',
      statementStartingBalance: 900,
      statementEndingBalance: 975,
      transactionIds: [],
    }, 'user-1');

    expect(mockDb.bookkeepingReconciliation.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        accountId: 'account-1',
        systemEndingBalance: 1000,
        difference: -25,
        metadata: { transactionIds: [] },
      }),
    }));
  });

  it('blocks cross-tenant reconciliation transaction ids', async () => {
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', currentBalance: 1000 });
    mockDb.bookkeepingTransaction.findMany.mockResolvedValue([]);

    await expect(bookkeepingService.createReconciliation('tenant-1', {
      accountId: 'account-1',
      statementDate: '2026-05-23',
      statementEndingBalance: 1000,
      transactionIds: ['tx-other'],
    })).rejects.toThrow('Reconciliation includes invalid transactions');
  });

  it('creates a due recurring transaction once for the same scheduled run', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.bookkeepingCategory.findFirst.mockResolvedValue({ id: 'category-1', tenantId: 'tenant-1', type: 'EXPENSE' });
    mockDb.bookkeepingRecurringRule.findMany.mockResolvedValue([
      {
        id: 'rule-1',
        tenantId: 'tenant-1',
        type: 'EXPENSE',
        name: 'Software subscription',
        amount: 50,
        currency: 'CAD',
        accountId: 'account-1',
        categoryId: 'category-1',
        frequency: 'MONTHLY',
        nextRunAt: new Date('2026-05-01T00:00:00.000Z'),
        endAt: null,
        isActive: true,
      },
    ]);
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'tx-existing', tenantId: 'tenant-1', sourceType: 'RECURRING_RULE', sourceId: 'rule-1:2026-05-01' });

    await bookkeepingService.runDueRecurringRules('tenant-1', 'user-1');
    await bookkeepingService.runDueRecurringRules('tenant-1', 'user-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledTimes(1);
    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        sourceType: 'RECURRING_RULE',
        sourceId: 'rule-1:2026-05-01',
      }),
    }));
  });

  it('rejects receipt files from another tenant', async () => {
    mockDb.file.findFirst.mockResolvedValue(null);

    await expect(bookkeepingService.attachReceipt('tx-1', 'tenant-1', 'file-other')).rejects.toThrow('Receipt file does not belong to this tenant');
    expect(mockDb.file.findFirst).toHaveBeenCalledWith({ where: { id: 'file-other', tenantId: 'tenant-1', deletedAt: null } });
  });

  it('exports transactions using the current tenant scope', async () => {
    mockDb.bookkeepingTransaction.findMany.mockResolvedValue([{ transactionDate: new Date('2026-05-23T00:00:00.000Z'), transactionNumber: 'BT-1', type: 'INCOME', description: 'Payment', amount: 100, currency: 'CAD', status: 'POSTED', sourceType: 'MANUAL' }]);

    const csv = await bookkeepingService.transactionsCsv('tenant-1', { dateFrom: '2026-05-01', dateTo: '2026-05-31' });

    expect(mockDb.bookkeepingTransaction.findMany).toHaveBeenCalledWith(expect.objectContaining({
      where: expect.objectContaining({ tenantId: 'tenant-1' }),
    }));
    expect(csv).toContain('BT-1');
  });

  it('failed payment voids the source bookkeeping transaction when unreconciled', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.invoicePayment.findFirst.mockResolvedValue({ id: 'payment-1', tenantId: 'tenant-1', invoiceId: 'invoice-1', amount: 250, status: 'FAILED', invoice: { currency: 'CAD' } });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: null })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: null })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: null });

    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');

    expect(mockDb.bookkeepingTransaction.update).toHaveBeenCalledWith({ where: { id: 'tx-1' }, data: { status: 'VOID', isReconciled: false, metadata: { syncStatus: 'voided' } } });
  });

  it('refunded payment creates a refund reversal transaction', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.invoicePayment.findFirst.mockResolvedValue({ id: 'payment-1', tenantId: 'tenant-1', invoiceId: 'invoice-1', amount: 250, status: 'REFUNDED', refundAmount: 250, invoice: { currency: 'CAD' } });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: 'account-1', amount: 250, currency: 'CAD', description: 'Invoice payment', invoiceId: 'invoice-1' })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: 'account-1', amount: 250, currency: 'CAD', description: 'Invoice payment', invoiceId: 'invoice-1' })
      .mockResolvedValueOnce(null);

    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        type: 'REFUND',
        sourceType: 'INVOICE_PAYMENT_REVERSAL',
        sourceId: 'payment-1:REFUNDED:250',
        amount: 250,
      }),
    }));
  });

  it('partial refund creates a reversal for only the refunded amount', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.invoicePayment.findFirst.mockResolvedValue({ id: 'payment-1', tenantId: 'tenant-1', invoiceId: 'invoice-1', amount: 250, status: 'PARTIALLY_REFUNDED', refundAmount: 75, invoice: { currency: 'CAD' } });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: 'account-1', amount: 250, currency: 'CAD', description: 'Invoice payment', invoiceId: 'invoice-1' })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: 'account-1', amount: 250, currency: 'CAD', description: 'Invoice payment', invoiceId: 'invoice-1' })
      .mockResolvedValueOnce(null);

    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'REFUND', sourceId: 'payment-1:PARTIALLY_REFUNDED:75', amount: 75 }),
    }));
  });

  it('voided payment voids source bookkeeping transaction', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.invoicePayment.findFirst.mockResolvedValue({ id: 'payment-1', tenantId: 'tenant-1', invoiceId: 'invoice-1', amount: 250, status: 'VOIDED', invoice: { currency: 'CAD' } });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: null })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: null })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'POSTED', accountId: null });

    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');

    expect(mockDb.bookkeepingTransaction.update).toHaveBeenCalledWith({ where: { id: 'tx-1' }, data: { status: 'VOID', isReconciled: false, metadata: { syncStatus: 'voided' } } });
  });

  it('reconciled failed payment creates reversal instead of silently mutating the reconciled transaction', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.invoicePayment.findFirst.mockResolvedValue({ id: 'payment-1', tenantId: 'tenant-1', invoiceId: 'invoice-1', amount: 250, status: 'FAILED', invoice: { currency: 'CAD' } });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'RECONCILED', isReconciled: true, accountId: 'account-1', amount: 250, currency: 'CAD', description: 'Invoice payment', invoiceId: 'invoice-1' })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'INVOICE_PAYMENT', sourceId: 'payment-1', status: 'RECONCILED', isReconciled: true, accountId: 'account-1', amount: 250, currency: 'CAD', description: 'Invoice payment', invoiceId: 'invoice-1' })
      .mockResolvedValueOnce(null);

    await bookkeepingService.syncInvoicePayment('tenant-1', 'payment-1');

    expect(mockDb.bookkeepingTransaction.update).not.toHaveBeenCalledWith({ where: { id: 'tx-1' }, data: expect.objectContaining({ status: 'VOID' }) });
    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ type: 'REFUND', sourceType: 'INVOICE_PAYMENT_REVERSAL', sourceId: 'payment-1:FAILED:250' }),
    }));
  });

  it('approved expense creates a synced expense transaction once', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.bookkeepingCategory.findFirst.mockResolvedValue({ id: 'category-1', tenantId: 'tenant-1', name: 'Software', type: 'EXPENSE' });
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce(null)
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'EXPENSE', sourceId: 'expense-1', status: 'POSTED', accountId: 'account-1' })
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'EXPENSE', sourceId: 'expense-1', status: 'POSTED', accountId: 'account-1', amount: 75 });

    await bookkeepingService.syncExpense('tenant-1', 'expense-1');
    await bookkeepingService.syncExpense('tenant-1', 'expense-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledTimes(1);
    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        tenantId: 'tenant-1',
        type: 'EXPENSE',
        sourceType: 'EXPENSE',
        sourceId: 'expense-1',
        amount: 75,
        status: 'POSTED',
        metadata: expect.objectContaining({ syncStatus: 'synced' }),
      }),
    }));
  });

  it('draft expense creates a pending needs-review transaction', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.expense.findFirst.mockResolvedValueOnce({
      id: 'expense-1',
      tenantId: 'tenant-1',
      title: 'Draft expense',
      category: 'SOFTWARE',
      amount: 75,
      currency: 'CAD',
      paymentDate: new Date('2026-05-22T00:00:00.000Z'),
      paymentMethod: 'CARD',
      status: 'DRAFT',
    });
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.bookkeepingCategory.findFirst.mockResolvedValue({ id: 'category-1', tenantId: 'tenant-1', name: 'Software', type: 'EXPENSE' });
    mockDb.bookkeepingTransaction.findFirst.mockResolvedValue(null);

    await bookkeepingService.syncExpense('tenant-1', 'expense-1');

    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({ status: 'PENDING', metadata: expect.objectContaining({ syncStatus: 'needs_review' }) }),
    }));
  });

  it('updated expense updates unreconciled source transaction safely', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.bookkeepingCategory.findFirst.mockResolvedValue({ id: 'category-1', tenantId: 'tenant-1', name: 'Software', type: 'EXPENSE' });
    mockDb.bookkeepingTransaction.findFirst.mockResolvedValueOnce({
      id: 'tx-1',
      tenantId: 'tenant-1',
      sourceType: 'EXPENSE',
      sourceId: 'expense-1',
      status: 'POSTED',
      accountId: 'account-1',
      amount: 50,
    }).mockResolvedValueOnce({
      id: 'tx-1',
      tenantId: 'tenant-1',
      sourceType: 'EXPENSE',
      sourceId: 'expense-1',
      status: 'POSTED',
      accountId: 'account-1',
      amount: 50,
    });

    await bookkeepingService.syncExpense('tenant-1', 'expense-1');

    expect(mockDb.bookkeepingTransaction.update).toHaveBeenCalledWith(expect.objectContaining({
      where: { id: 'tx-1' },
      data: expect.objectContaining({ amount: 75, metadata: expect.objectContaining({ syncStatus: 'synced' }) }),
    }));
  });

  it('deleted expense reverses safely when source transaction is reconciled', async () => {
    mockDb.bookkeepingAccount.count.mockResolvedValue(1);
    mockDb.bookkeepingAccount.findFirst.mockResolvedValue({ id: 'account-1', tenantId: 'tenant-1', name: 'Bank Account', type: 'ASSET' });
    mockDb.expense.findFirst.mockResolvedValueOnce(null);
    mockDb.bookkeepingTransaction.findFirst
      .mockResolvedValueOnce({ id: 'tx-1', tenantId: 'tenant-1', sourceType: 'EXPENSE', sourceId: 'expense-1', status: 'RECONCILED', isReconciled: true, accountId: 'account-1', amount: 75, currency: 'CAD', description: 'Software subscription', expenseId: 'expense-1' })
      .mockResolvedValueOnce(null);

    await bookkeepingService.syncExpense('tenant-1', 'expense-1');

    expect(mockDb.bookkeepingTransaction.update).not.toHaveBeenCalledWith({ where: { id: 'tx-1' }, data: expect.objectContaining({ status: 'VOID' }) });
    expect(mockDb.bookkeepingTransaction.create).toHaveBeenCalledWith(expect.objectContaining({
      data: expect.objectContaining({
        type: 'ADJUSTMENT',
        sourceType: 'EXPENSE_REVERSAL',
        sourceId: 'expense-1:VOIDED:75',
        metadata: expect.objectContaining({ syncStatus: 'reversed' }),
      }),
    }));
  });

  it('source idempotency prevents duplicate active bookkeeping entries', async () => {
    mockDb.bookkeepingTransaction.findFirst.mockResolvedValueOnce({ id: 'tx-existing', tenantId: 'tenant-1', sourceType: 'CUSTOM_SOURCE', sourceId: 'source-1', status: 'POSTED' });

    const result = await bookkeepingService.createTransaction('tenant-1', {
      type: 'INCOME',
      sourceType: 'CUSTOM_SOURCE',
      sourceId: 'source-1',
      description: 'Idempotent source',
      amount: 100,
      transactionDate: '2026-05-22',
    });

    expect(result.id).toBe('tx-existing');
    expect(mockDb.bookkeepingTransaction.create).not.toHaveBeenCalled();
  });

  it('payment reversal lookup is tenant-scoped', async () => {
    mockDb.invoicePayment.findFirst.mockResolvedValue(null);

    await expect(bookkeepingService.createInvoicePaymentReversal('tenant-1', 'payment-other', 50)).rejects.toThrow('Invoice payment not found');
    expect(mockDb.invoicePayment.findFirst).toHaveBeenCalledWith({ where: { id: 'payment-other', tenantId: 'tenant-1' }, include: { invoice: true } });
  });
});
