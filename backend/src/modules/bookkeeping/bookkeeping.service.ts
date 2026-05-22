import { prisma } from '../../config/database';
import { BadRequestError, NotFoundError } from '../../common/errors/HttpErrors';
import { ErrorCodes } from '../../common/errors/errorCodes';
import { activityLogger } from '../../common/services/activity-logger.service';
import { bookkeepingRepository } from './bookkeeping.repository';
import { serializeMoney, toDate, toNumber } from './bookkeeping.dto';

const DEFAULT_ACCOUNTS = [
  ['Cash', '1000', 'ASSET', 'Cash on hand', true],
  ['Bank Account', '1010', 'ASSET', 'Operating bank account', true],
  ['Accounts Receivable', '1200', 'ASSET', 'Customer receivables', false],
  ['Accounts Payable', '2000', 'LIABILITY', 'Vendor payables', false],
  ['Sales Revenue', '4000', 'INCOME', 'Sales revenue', false],
  ['Service Revenue', '4010', 'INCOME', 'Service revenue', false],
  ['Tax Collected', '2100', 'LIABILITY', 'Sales tax collected', false],
  ['Tax Paid', '1300', 'ASSET', 'Input tax credits', false],
  ['Cost of Goods Sold', '5000', 'EXPENSE', 'Direct costs', false],
  ['Office Expenses', '6100', 'EXPENSE', 'Office expenses', false],
  ['Software', '6110', 'EXPENSE', 'Software tools', false],
  ['Marketing', '6120', 'EXPENSE', 'Marketing spend', false],
  ['Travel', '6130', 'EXPENSE', 'Travel costs', false],
  ['Meals', '6140', 'EXPENSE', 'Meals and entertainment', false],
  ['Rent', '6150', 'EXPENSE', 'Rent', false],
  ['Utilities', '6160', 'EXPENSE', 'Utilities', false],
  ['Owner Equity', '3000', 'EQUITY', 'Owner equity', false],
] as const;

const DEFAULT_CATEGORIES = [
  ['Sales', 'INCOME', '#0EA5E9'],
  ['Services', 'INCOME', '#2563EB'],
  ['Subscriptions', 'INCOME', '#16A34A'],
  ['Other Income', 'INCOME', '#64748B'],
  ['Materials', 'EXPENSE', '#F97316'],
  ['Labor', 'EXPENSE', '#EF4444'],
  ['Software', 'EXPENSE', '#7C3AED'],
  ['Marketing', 'EXPENSE', '#EC4899'],
  ['Travel', 'EXPENSE', '#14B8A6'],
  ['Meals', 'EXPENSE', '#F59E0B'],
  ['Office Supplies', 'EXPENSE', '#64748B'],
  ['Rent', 'EXPENSE', '#8B5CF6'],
  ['Utilities', 'EXPENSE', '#06B6D4'],
  ['Insurance', 'EXPENSE', '#10B981'],
  ['Taxes', 'EXPENSE', '#DC2626'],
  ['Other Expense', 'EXPENSE', '#475569'],
] as const;

function db(): any {
  return prisma as any;
}

function requirePositiveAmount(amount: unknown) {
  const value = toNumber(amount);
  if (!Number.isFinite(value) || value <= 0) throw new BadRequestError('Amount must be greater than zero', ErrorCodes.INVALID_INPUT);
  return value;
}

function isDebitIncrease(type: string) {
  return type === 'ASSET' || type === 'EXPENSE';
}

function applyJournalAmount(accountType: string, debit: number, credit: number) {
  return isDebitIncrease(accountType) ? debit - credit : credit - debit;
}

function addMonths(date: Date, months: number) {
  const next = new Date(date);
  next.setMonth(next.getMonth() + months);
  return next;
}

function csvEscape(value: unknown) {
  const str = value === null || value === undefined ? '' : String(value);
  return `"${str.replace(/"/g, '""')}"`;
}

export class BookkeepingService {
  async setup(tenantId: string, actorUserId?: string) {
    const tenant = await prisma.tenant.findUnique({ where: { id: tenantId } });
    const currency = String((tenant?.settings as any)?.currency || 'CAD').toUpperCase();

    for (const [name, code, type, subtype, isBankAccount] of DEFAULT_ACCOUNTS) {
      const existing = await db().bookkeepingAccount.findFirst({ where: { tenantId, name } });
      if (!existing) {
        await db().bookkeepingAccount.create({
          data: {
            tenantId,
            name,
            code,
            type,
            subtype,
            currency,
            isBankAccount,
            isSystem: true,
            openingBalance: 0,
            currentBalance: 0,
          },
        });
      }
    }

    for (const [name, type, color] of DEFAULT_CATEGORIES) {
      const existing = await db().bookkeepingCategory.findFirst({ where: { tenantId, name } });
      if (!existing) {
        const account = await db().bookkeepingAccount.findFirst({ where: { tenantId, name: name === 'Subscriptions' ? 'Sales Revenue' : name, type } });
        await db().bookkeepingCategory.create({ data: { tenantId, name, type, color, accountId: account?.id, isSystem: true } });
      }
    }

    const [accounts, categories] = await Promise.all([
      db().bookkeepingAccount.count({ where: { tenantId } }),
      db().bookkeepingCategory.count({ where: { tenantId } }),
    ]);
    activityLogger.log({ tenantId, entityType: 'Bookkeeping', entityId: tenantId, action: 'CREATE', module: 'bookkeeping', description: 'Initialized bookkeeping defaults', userId: actorUserId });
    return { accounts, categories };
  }

  async sync(tenantId: string, actorUserId?: string) {
    await this.setup(tenantId, actorUserId);
    const payments = await db().invoicePayment.findMany({ where: { tenantId }, include: { invoice: true } });
    const expenses = await db().expense.findMany({ where: { tenantId } });
    let paymentCount = 0;
    let expenseCount = 0;
    for (const payment of payments) {
      await this.syncInvoicePayment(tenantId, payment.id);
      paymentCount += 1;
    }
    for (const expense of expenses) {
      await this.syncExpense(tenantId, expense.id);
      expenseCount += 1;
    }
    activityLogger.log({ tenantId, entityType: 'Bookkeeping', entityId: tenantId, action: 'UPDATE', module: 'bookkeeping', description: `Synced ${paymentCount} payments and ${expenseCount} expenses`, userId: actorUserId });
    return { payments: paymentCount, expenses: expenseCount };
  }

  async listAccounts(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingAccount', tenantId, query, ['name', 'code', 'subtype', 'institutionName']);
  }

  async createAccount(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const created = await bookkeepingRepository.create('bookkeepingAccount', {
      tenantId,
      ...data,
      openingBalance: toNumber(data.openingBalance),
      currentBalance: toNumber(data.openingBalance),
    });
    activityLogger.log({ tenantId, entityType: 'BookkeepingAccount', entityId: created.id, action: 'CREATE', module: 'bookkeeping', description: `Created bookkeeping account "${created.name}"`, userId: actorUserId });
    return created;
  }

  async getAccount(id: string, tenantId: string) {
    const record = await bookkeepingRepository.findById('bookkeepingAccount', id, tenantId);
    if (!record) throw new NotFoundError('Bookkeeping account not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return record;
  }

  async updateAccount(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    await this.getAccount(id, tenantId);
    const updated = await bookkeepingRepository.update('bookkeepingAccount', id, tenantId, data);
    activityLogger.log({ tenantId, entityType: 'BookkeepingAccount', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated bookkeeping account', userId: actorUserId });
    return updated;
  }

  async deleteAccount(id: string, tenantId: string, actorUserId?: string) {
    const account = await this.getAccount(id, tenantId);
    const txCount = await db().bookkeepingTransaction.count({ where: { tenantId, accountId: id } });
    const lineCount = await db().bookkeepingJournalLine.count({ where: { tenantId, accountId: id } });
    if (account.isSystem && (txCount > 0 || lineCount > 0)) throw new BadRequestError('System accounts with activity cannot be deleted', ErrorCodes.INVALID_INPUT);
    const result = await bookkeepingRepository.deactivate('bookkeepingAccount', id, tenantId);
    activityLogger.log({ tenantId, entityType: 'BookkeepingAccount', entityId: id, action: 'DELETE', module: 'bookkeeping', description: 'Deactivated bookkeeping account', userId: actorUserId });
    return result;
  }

  async listCategories(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingCategory', tenantId, query, ['name']);
  }

  async createCategory(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    if (data.accountId) await this.getAccount(data.accountId, tenantId);
    const created = await bookkeepingRepository.create('bookkeepingCategory', { tenantId, ...data });
    activityLogger.log({ tenantId, entityType: 'BookkeepingCategory', entityId: created.id, action: 'CREATE', module: 'bookkeeping', description: `Created category "${created.name}"`, userId: actorUserId });
    return created;
  }

  async updateCategory(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const existing = await bookkeepingRepository.findById('bookkeepingCategory', id, tenantId);
    if (!existing) throw new NotFoundError('Bookkeeping category not found', ErrorCodes.RESOURCE_NOT_FOUND);
    if (data.accountId) await this.getAccount(data.accountId, tenantId);
    const updated = await bookkeepingRepository.update('bookkeepingCategory', id, tenantId, data);
    activityLogger.log({ tenantId, entityType: 'BookkeepingCategory', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated category', userId: actorUserId });
    return updated;
  }

  async deleteCategory(id: string, tenantId: string) {
    const existing = await bookkeepingRepository.findById('bookkeepingCategory', id, tenantId);
    if (!existing) throw new NotFoundError('Bookkeeping category not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return bookkeepingRepository.deactivate('bookkeepingCategory', id, tenantId);
  }

  async listVendors(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingVendor', tenantId, query, ['name', 'email', 'phone', 'website']);
  }

  async createVendor(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const created = await bookkeepingRepository.create('bookkeepingVendor', { tenantId, ...data });
    activityLogger.log({ tenantId, entityType: 'BookkeepingVendor', entityId: created.id, action: 'CREATE', module: 'bookkeeping', description: `Created vendor "${created.name}"`, userId: actorUserId });
    return created;
  }

  async getVendor(id: string, tenantId: string) {
    const vendor = await bookkeepingRepository.findById('bookkeepingVendor', id, tenantId);
    if (!vendor) throw new NotFoundError('Vendor not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return vendor;
  }

  async updateVendor(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    await this.getVendor(id, tenantId);
    const updated = await bookkeepingRepository.update('bookkeepingVendor', id, tenantId, data);
    activityLogger.log({ tenantId, entityType: 'BookkeepingVendor', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated vendor', userId: actorUserId });
    return updated;
  }

  async deleteVendor(id: string, tenantId: string) {
    await this.getVendor(id, tenantId);
    return bookkeepingRepository.deactivate('bookkeepingVendor', id, tenantId);
  }

  async listTransactions(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingTransaction', tenantId, query, ['transactionNumber', 'description', 'reference']);
  }

  async getTransaction(id: string, tenantId: string) {
    const record = await bookkeepingRepository.findById('bookkeepingTransaction', id, tenantId);
    if (!record) throw new NotFoundError('Bookkeeping transaction not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return record;
  }

  private async validateTransactionLinks(tenantId: string, data: Record<string, any>) {
    if (data.accountId) await this.getAccount(data.accountId, tenantId);
    if (data.categoryId) {
      const category = await bookkeepingRepository.findById('bookkeepingCategory', data.categoryId, tenantId);
      if (!category) throw new BadRequestError('Category does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.vendorId) await this.getVendor(data.vendorId, tenantId);
    if (data.fileId) {
      const file = await prisma.file.findFirst({ where: { id: data.fileId, tenantId, deletedAt: null } });
      if (!file) throw new BadRequestError('Receipt file does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.invoiceId) {
      const invoice = await prisma.invoice.findFirst({ where: { id: data.invoiceId, tenantId } });
      if (!invoice) throw new BadRequestError('Invoice does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.expenseId) {
      const expense = await prisma.expense.findFirst({ where: { id: data.expenseId, tenantId } });
      if (!expense) throw new BadRequestError('Expense does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
  }

  async createTransaction(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const amount = requirePositiveAmount(data.amount);
    await this.validateTransactionLinks(tenantId, data);
    const transactionNumber = data.transactionNumber || await this.nextNumber(tenantId, 'BT');
    const created = await db().bookkeepingTransaction.create({
      data: {
        tenantId,
        transactionNumber,
        type: data.type,
        sourceType: data.sourceType || 'MANUAL',
        sourceId: data.sourceId || null,
        description: data.description,
        amount,
        currency: data.currency || 'CAD',
        transactionDate: toDate(data.transactionDate),
        paymentMethod: data.paymentMethod || null,
        reference: data.reference || null,
        status: data.status || 'POSTED',
        accountId: data.accountId || null,
        categoryId: data.categoryId || null,
        vendorId: data.vendorId || null,
        clientId: data.clientId || null,
        projectId: data.projectId || null,
        invoiceId: data.invoiceId || null,
        expenseId: data.expenseId || null,
        fileId: data.fileId || null,
        metadata: data.metadata || {},
        createdById: actorUserId || null,
      },
    });
    if (created.status === 'POSTED' && created.accountId) await this.applyTransactionBalance(created, 1);
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: created.id, action: 'CREATE', module: 'bookkeeping', description: `Posted ${created.type.toLowerCase()} transaction "${created.description}"`, userId: actorUserId, metadata: { amount } });
    return created;
  }

  async updateTransaction(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const existing = await this.getTransaction(id, tenantId);
    if (existing.status === 'VOID') throw new BadRequestError('Void transactions cannot be edited', ErrorCodes.INVALID_INPUT);
    await this.validateTransactionLinks(tenantId, data);
    if (existing.status === 'POSTED' && existing.accountId) await this.applyTransactionBalance(existing, -1);
    const updated = await db().bookkeepingTransaction.update({ where: { id }, data: { ...data, amount: data.amount !== undefined ? requirePositiveAmount(data.amount) : undefined, transactionDate: data.transactionDate ? toDate(data.transactionDate) : undefined } });
    if (updated.status === 'POSTED' && updated.accountId) await this.applyTransactionBalance(updated, 1);
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated bookkeeping transaction', userId: actorUserId });
    return updated;
  }

  async voidTransaction(id: string, tenantId: string, actorUserId?: string) {
    const existing = await this.getTransaction(id, tenantId);
    if (existing.status !== 'VOID' && existing.status === 'POSTED' && existing.accountId) await this.applyTransactionBalance(existing, -1);
    const updated = await db().bookkeepingTransaction.update({ where: { id }, data: { status: 'VOID', isReconciled: false } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: id, action: 'STATUS_CHANGE', module: 'bookkeeping', description: 'Voided bookkeeping transaction', userId: actorUserId });
    return updated;
  }

  async attachReceipt(id: string, tenantId: string, fileId: string, actorUserId?: string) {
    await this.validateTransactionLinks(tenantId, { fileId });
    const updated = await this.updateTransaction(id, tenantId, { fileId }, actorUserId);
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Attached receipt to transaction', userId: actorUserId, metadata: { fileId } });
    return updated;
  }

  async reconcileTransaction(id: string, tenantId: string, actorUserId?: string) {
    await this.getTransaction(id, tenantId);
    const updated = await db().bookkeepingTransaction.update({ where: { id }, data: { status: 'RECONCILED', isReconciled: true, reconciledAt: new Date() } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: id, action: 'STATUS_CHANGE', module: 'bookkeeping', description: 'Reconciled transaction', userId: actorUserId });
    return updated;
  }

  async unreconcileTransaction(id: string, tenantId: string) {
    await this.getTransaction(id, tenantId);
    return db().bookkeepingTransaction.update({ where: { id }, data: { status: 'POSTED', isReconciled: false, reconciledAt: null } });
  }

  private async applyTransactionBalance(tx: Record<string, any>, direction: 1 | -1) {
    const amount = toNumber(tx.amount) * direction;
    if (tx.type === 'EXPENSE' || tx.type === 'REFUND') await db().bookkeepingAccount.update({ where: { id: tx.accountId }, data: { currentBalance: { decrement: amount } } });
    else await db().bookkeepingAccount.update({ where: { id: tx.accountId }, data: { currentBalance: { increment: amount } } });
  }

  async createTransfer(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    if (data.fromAccountId === data.toAccountId) throw new BadRequestError('Transfer accounts must be different', ErrorCodes.INVALID_INPUT);
    await this.getAccount(data.fromAccountId, tenantId);
    await this.getAccount(data.toAccountId, tenantId);
    const amount = requirePositiveAmount(data.amount);
    const transfer = await db().$transaction(async (tx: any) => {
      const created = await tx.bookkeepingTransfer.create({ data: { tenantId, ...data, amount, transferDate: toDate(data.transferDate), createdById: actorUserId || null } });
      await tx.bookkeepingAccount.update({ where: { id: data.fromAccountId }, data: { currentBalance: { decrement: amount } } });
      await tx.bookkeepingAccount.update({ where: { id: data.toAccountId }, data: { currentBalance: { increment: amount } } });
      await tx.bookkeepingTransaction.createMany({ data: [
        { tenantId, transactionNumber: await this.nextNumber(tenantId, 'BT'), accountId: data.fromAccountId, type: 'TRANSFER', sourceType: 'TRANSFER', sourceId: `${created.id}:out`, description: `Transfer to account`, amount, currency: data.currency || 'CAD', transactionDate: toDate(data.transferDate), reference: data.reference || null, status: 'POSTED', createdById: actorUserId || null },
        { tenantId, transactionNumber: await this.nextNumber(tenantId, 'BT'), accountId: data.toAccountId, type: 'TRANSFER', sourceType: 'TRANSFER', sourceId: `${created.id}:in`, description: `Transfer from account`, amount, currency: data.currency || 'CAD', transactionDate: toDate(data.transferDate), reference: data.reference || null, status: 'POSTED', createdById: actorUserId || null },
      ] });
      return created;
    });
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransfer', entityId: transfer.id, action: 'CREATE', module: 'bookkeeping', description: 'Created bookkeeping transfer', userId: actorUserId, metadata: { amount } });
    return transfer;
  }

  async listTransfers(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingTransfer', tenantId, query, ['reference', 'notes']);
  }

  async listJournalEntries(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingJournalEntry', tenantId, query, ['entryNumber', 'description']);
  }

  async getJournalEntry(id: string, tenantId: string) {
    const entry = await db().bookkeepingJournalEntry.findFirst({ where: { id, tenantId }, include: { lines: true } });
    if (!entry) throw new NotFoundError('Journal entry not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return entry;
  }

  async createJournalEntry(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    this.assertBalanced(data.lines || []);
    for (const line of data.lines || []) await this.getAccount(line.accountId, tenantId);
    const entry = await db().bookkeepingJournalEntry.create({
      data: {
        tenantId,
        entryNumber: await this.nextNumber(tenantId, 'JE'),
        description: data.description,
        entryDate: toDate(data.entryDate),
        sourceType: data.sourceType || null,
        sourceId: data.sourceId || null,
        status: data.status || 'DRAFT',
        createdById: actorUserId || null,
        lines: { create: data.lines.map((line: any) => ({ tenantId, accountId: line.accountId, debit: toNumber(line.debit), credit: toNumber(line.credit), description: line.description || null })) },
      },
      include: { lines: true },
    });
    if (entry.status === 'POSTED') await this.applyJournal(entry, actorUserId);
    return entry;
  }

  async updateJournalEntry(id: string, tenantId: string, data: Record<string, any>) {
    const existing = await this.getJournalEntry(id, tenantId);
    if (existing.status === 'POSTED') throw new BadRequestError('Posted journal entries cannot be edited', ErrorCodes.INVALID_INPUT);
    if (data.lines) this.assertBalanced(data.lines);
    return db().$transaction(async (tx: any) => {
      await tx.bookkeepingJournalEntry.update({ where: { id }, data: { description: data.description, entryDate: data.entryDate ? toDate(data.entryDate) : undefined, sourceType: data.sourceType, sourceId: data.sourceId, status: data.status } });
      if (data.lines) {
        await tx.bookkeepingJournalLine.deleteMany({ where: { journalEntryId: id, tenantId } });
        await tx.bookkeepingJournalLine.createMany({ data: data.lines.map((line: any) => ({ tenantId, journalEntryId: id, accountId: line.accountId, debit: toNumber(line.debit), credit: toNumber(line.credit), description: line.description || null })) });
      }
      return tx.bookkeepingJournalEntry.findFirst({ where: { id, tenantId }, include: { lines: true } });
    });
  }

  async postJournalEntry(id: string, tenantId: string, actorUserId?: string) {
    const entry = await this.getJournalEntry(id, tenantId);
    if (entry.status === 'POSTED') return entry;
    this.assertBalanced(entry.lines);
    await this.applyJournal(entry, actorUserId);
    const updated = await db().bookkeepingJournalEntry.update({ where: { id }, data: { status: 'POSTED', postedAt: new Date() }, include: { lines: true } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingJournalEntry', entityId: id, action: 'STATUS_CHANGE', module: 'bookkeeping', description: 'Posted journal entry', userId: actorUserId });
    return updated;
  }

  async voidJournalEntry(id: string, tenantId: string, actorUserId?: string) {
    const entry = await this.getJournalEntry(id, tenantId);
    if (entry.status === 'POSTED') await this.applyJournal(entry, actorUserId, -1);
    return db().bookkeepingJournalEntry.update({ where: { id }, data: { status: 'VOID' }, include: { lines: true } });
  }

  private assertBalanced(lines: any[]) {
    const debit = serializeMoney(lines.reduce((sum, line) => sum + toNumber(line.debit), 0));
    const credit = serializeMoney(lines.reduce((sum, line) => sum + toNumber(line.credit), 0));
    if (debit <= 0 || credit <= 0 || debit !== credit) throw new BadRequestError('Journal entry must balance before posting', ErrorCodes.INVALID_INPUT);
  }

  private async applyJournal(entry: any, actorUserId?: string, direction: 1 | -1 = 1) {
    for (const line of entry.lines || []) {
      const account = await this.getAccount(line.accountId, entry.tenantId);
      const delta = applyJournalAmount(account.type, toNumber(line.debit), toNumber(line.credit)) * direction;
      if (delta >= 0) await db().bookkeepingAccount.update({ where: { id: account.id }, data: { currentBalance: { increment: delta } } });
      else await db().bookkeepingAccount.update({ where: { id: account.id }, data: { currentBalance: { decrement: Math.abs(delta) } } });
    }
    activityLogger.log({ tenantId: entry.tenantId, entityType: 'BookkeepingJournalEntry', entityId: entry.id, action: 'STATUS_CHANGE', module: 'bookkeeping', description: direction > 0 ? 'Applied journal entry balances' : 'Reversed journal entry balances', userId: actorUserId });
  }

  async listReconciliations(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingReconciliation', tenantId, query, ['notes']);
  }

  async getReconciliation(id: string, tenantId: string) {
    const record = await bookkeepingRepository.findById('bookkeepingReconciliation', id, tenantId);
    if (!record) throw new NotFoundError('Reconciliation not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return record;
  }

  async createReconciliation(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const account = await this.getAccount(data.accountId, tenantId);
    const selectedIds = Array.isArray(data.transactionIds) ? data.transactionIds : [];
    const selected = selectedIds.length ? await db().bookkeepingTransaction.findMany({ where: { tenantId, id: { in: selectedIds }, accountId: data.accountId, status: { not: 'VOID' } } }) : [];
    if (selected.length !== selectedIds.length) throw new BadRequestError('Reconciliation includes invalid transactions', ErrorCodes.INVALID_INPUT);
    const systemEndingBalance = toNumber(account.currentBalance);
    const difference = serializeMoney(toNumber(data.statementEndingBalance) - systemEndingBalance);
    return db().bookkeepingReconciliation.create({ data: { tenantId, accountId: data.accountId, statementDate: toDate(data.statementDate), statementStartingBalance: toNumber(data.statementStartingBalance), statementEndingBalance: toNumber(data.statementEndingBalance), systemEndingBalance, difference, status: 'DRAFT', notes: data.notes || null, metadata: { transactionIds: selectedIds } } });
  }

  async updateReconciliation(id: string, tenantId: string, data: Record<string, any>) {
    await this.getReconciliation(id, tenantId);
    return db().bookkeepingReconciliation.update({ where: { id }, data: { ...data, statementDate: data.statementDate ? toDate(data.statementDate) : undefined } });
  }

  async completeReconciliation(id: string, tenantId: string, actorUserId?: string) {
    const reconciliation = await this.getReconciliation(id, tenantId);
    const ids = Array.isArray(reconciliation.metadata?.transactionIds) ? reconciliation.metadata.transactionIds : [];
    if (toNumber(reconciliation.difference) !== 0) throw new BadRequestError('Reconciliation difference must be zero before completing', ErrorCodes.INVALID_INPUT);
    await db().bookkeepingTransaction.updateMany({ where: { tenantId, id: { in: ids }, accountId: reconciliation.accountId }, data: { isReconciled: true, status: 'RECONCILED', reconciledAt: new Date() } });
    const updated = await db().bookkeepingReconciliation.update({ where: { id }, data: { status: 'RECONCILED', reconciledAt: new Date(), reconciledById: actorUserId || null } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingReconciliation', entityId: id, action: 'STATUS_CHANGE', module: 'bookkeeping', description: 'Completed account reconciliation', userId: actorUserId });
    return updated;
  }

  async listRecurringRules(tenantId: string, query: Record<string, any>) {
    return bookkeepingRepository.list('bookkeepingRecurringRule', tenantId, query, ['name', 'description']);
  }

  async createRecurringRule(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    await this.validateTransactionLinks(tenantId, data);
    return db().bookkeepingRecurringRule.create({ data: { tenantId, ...data, amount: requirePositiveAmount(data.amount), nextRunAt: toDate(data.nextRunAt), endAt: data.endAt ? toDate(data.endAt) : null, createdById: actorUserId || null } });
  }

  async updateRecurringRule(id: string, tenantId: string, data: Record<string, any>) {
    const existing = await bookkeepingRepository.findById('bookkeepingRecurringRule', id, tenantId);
    if (!existing) throw new NotFoundError('Recurring rule not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return db().bookkeepingRecurringRule.update({ where: { id }, data: { ...data, amount: data.amount ? requirePositiveAmount(data.amount) : undefined, nextRunAt: data.nextRunAt ? toDate(data.nextRunAt) : undefined, endAt: data.endAt ? toDate(data.endAt) : undefined } });
  }

  async deleteRecurringRule(id: string, tenantId: string) {
    const existing = await bookkeepingRepository.findById('bookkeepingRecurringRule', id, tenantId);
    if (!existing) throw new NotFoundError('Recurring rule not found', ErrorCodes.RESOURCE_NOT_FOUND);
    return db().bookkeepingRecurringRule.update({ where: { id }, data: { isActive: false } });
  }

  async runDueRecurringRules(tenantId: string, actorUserId?: string) {
    const now = new Date();
    const rules = await db().bookkeepingRecurringRule.findMany({ where: { tenantId, isActive: true, nextRunAt: { lte: now }, OR: [{ endAt: null }, { endAt: { gte: now } }] } });
    const created = [];
    for (const rule of rules) {
      created.push(await this.createTransaction(tenantId, {
        accountId: rule.accountId,
        categoryId: rule.categoryId,
        vendorId: rule.vendorId,
        clientId: rule.clientId,
        projectId: rule.projectId,
        type: rule.type,
        description: rule.description || rule.name,
        amount: rule.amount,
        currency: rule.currency,
        transactionDate: now.toISOString(),
        sourceType: 'MANUAL',
        sourceId: null,
        metadata: { recurringRuleId: rule.id },
      }, actorUserId));
      const months = rule.frequency === 'WEEKLY' ? 0 : rule.frequency === 'QUARTERLY' ? 3 : rule.frequency === 'YEARLY' ? 12 : 1;
      const nextRunAt = rule.frequency === 'WEEKLY' ? new Date(now.getTime() + 7 * 86400000) : addMonths(now, months);
      await db().bookkeepingRecurringRule.update({ where: { id: rule.id }, data: { lastRunAt: now, nextRunAt } });
    }
    return { created: created.length };
  }

  async dashboard(tenantId: string) {
    await this.setupIfEmpty(tenantId);
    const now = new Date();
    const yearStart = new Date(now.getFullYear(), 0, 1);
    const transactions: any[] = await this.reportTransactions(tenantId, yearStart, now);
    const income = transactions.filter((tx: any) => tx.type === 'INCOME' && tx.status !== 'VOID').reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    const expenses = transactions.filter((tx: any) => tx.type === 'EXPENSE' && tx.status !== 'VOID').reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    const [accounts, unpaidInvoices, overdueInvoices, pendingExpenses, recentTransactions] = await Promise.all([
      db().bookkeepingAccount.findMany({ where: { tenantId, isActive: true } }),
      prisma.invoice.count({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] } as any } }),
      prisma.invoice.count({ where: { tenantId, dueDate: { lt: now }, status: { notIn: ['PAID', 'CANCELLED'] } as any } }),
      prisma.expense.count({ where: { tenantId, status: { in: ['DRAFT', 'PENDING', 'SUBMITTED'] } as any } }),
      db().bookkeepingTransaction.findMany({ where: { tenantId }, orderBy: { transactionDate: 'desc' }, take: 8 }),
    ]);
    const cashBalance = accounts.filter((a: any) => a.type === 'ASSET' && (a.isBankAccount || ['Cash', 'Bank Account'].includes(a.name))).reduce((sum: number, a: any) => sum + toNumber(a.currentBalance), 0);
    return {
      totals: {
        totalIncome: serializeMoney(income),
        totalExpenses: serializeMoney(expenses),
        netProfit: serializeMoney(income - expenses),
        cashBankBalance: serializeMoney(cashBalance),
        unpaidInvoices,
        overdueInvoices,
        pendingExpenses,
      },
      monthlyIncomeTrend: this.monthlyTrend(transactions, 'INCOME'),
      monthlyExpenseTrend: this.monthlyTrend(transactions, 'EXPENSE'),
      recentTransactions,
      topExpenseCategories: await this.topCategories(tenantId, 'EXPENSE', yearStart, now),
      topCustomersByIncome: await this.topCustomersByIncome(tenantId, yearStart, now),
      topVendorsBySpend: await this.topVendorsBySpend(tenantId, yearStart, now),
    };
  }

  async profitLoss(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const transactions: any[] = await this.reportTransactions(tenantId, from, to);
    const incomeRows = transactions.filter((tx: any) => tx.type === 'INCOME' && tx.status !== 'VOID');
    const expenseRows = transactions.filter((tx: any) => tx.type === 'EXPENSE' && tx.status !== 'VOID');
    const incomeTotal = incomeRows.reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    const expenseTotal = expenseRows.reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    return {
      dateFrom: from,
      dateTo: to,
      income: await this.groupByCategory(tenantId, incomeRows),
      expenses: await this.groupByCategory(tenantId, expenseRows),
      grossProfit: serializeMoney(incomeTotal),
      netProfit: serializeMoney(incomeTotal - expenseTotal),
      totals: { income: serializeMoney(incomeTotal), expenses: serializeMoney(expenseTotal) },
    };
  }

  async cashFlow(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const transactions: any[] = await this.reportTransactions(tenantId, from, to);
    const moneyIn = transactions.filter((tx: any) => tx.type === 'INCOME').reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    const moneyOut = transactions.filter((tx: any) => tx.type === 'EXPENSE' || tx.type === 'REFUND').reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    return { moneyIn: serializeMoney(moneyIn), moneyOut: serializeMoney(moneyOut), netCashMovement: serializeMoney(moneyIn - moneyOut), byMonth: this.cashFlowTrend(transactions) };
  }

  async taxSummary(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const [invoiceAgg, expenseAgg] = await Promise.all([
      prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: from, lte: to } }, _sum: { taxAmount: true, total: true } }),
      prisma.expense.aggregate({ where: { tenantId, paymentDate: { gte: from, lte: to } }, _sum: { amount: true } }),
    ]);
    const taxCollected = toNumber(invoiceAgg._sum.taxAmount);
    return { taxCollected: serializeMoney(taxCollected), taxPaid: 0, netTaxEstimate: serializeMoney(taxCollected), taxableSales: serializeMoney(invoiceAgg._sum.total), expenseBase: serializeMoney(expenseAgg._sum.amount) };
  }

  async balanceSheet(tenantId: string) {
    const accounts = await db().bookkeepingAccount.findMany({ where: { tenantId, isActive: true } });
    const grouped = ['ASSET', 'LIABILITY', 'EQUITY'].reduce((acc: Record<string, any>, type) => {
      const rows = accounts.filter((a: any) => a.type === type);
      acc[type.toLowerCase()] = { total: serializeMoney(rows.reduce((sum: number, a: any) => sum + toNumber(a.currentBalance), 0)), accounts: rows };
      return acc;
    }, {});
    return grouped;
  }

  async transactionsCsv(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const rows: any[] = await this.reportTransactions(tenantId, from, to);
    return [['Date', 'Number', 'Type', 'Description', 'Amount', 'Currency', 'Status', 'Source'].join(',')]
      .concat(rows.map((tx: any) => [tx.transactionDate?.toISOString?.() || tx.transactionDate, tx.transactionNumber, tx.type, tx.description, tx.amount, tx.currency, tx.status, tx.sourceType].map(csvEscape).join(',')))
      .join('\n');
  }

  async profitLossCsv(tenantId: string, query: Record<string, any>) {
    const report = await this.profitLoss(tenantId, query);
    const rows = [['Section', 'Category', 'Amount']];
    report.income.forEach((item: any) => rows.push(['Income', item.name, String(item.total)]));
    report.expenses.forEach((item: any) => rows.push(['Expense', item.name, String(item.total)]));
    rows.push(['Total', 'Net Profit', String(report.netProfit)]);
    return rows.map((row) => row.map(csvEscape).join(',')).join('\n');
  }

  async syncInvoicePayment(tenantId: string, paymentId: string) {
    await this.setupIfEmpty(tenantId);
    const payment = await db().invoicePayment.findFirst({ where: { id: paymentId, tenantId }, include: { invoice: true } });
    if (!payment) return null;
    const account = await this.defaultAccount(tenantId, 'Bank Account');
    const category = await this.defaultCategory(tenantId, 'Subscriptions', 'INCOME');
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'INVOICE_PAYMENT', sourceId: payment.id } });
    const data = {
      accountId: account?.id || null,
      categoryId: category?.id || null,
      type: 'INCOME',
      sourceType: 'INVOICE_PAYMENT',
      sourceId: payment.id,
      description: `Invoice payment ${payment.paymentNumber || payment.reference || payment.id}`,
      amount: toNumber(payment.amount),
      currency: payment.invoice?.currency || 'CAD',
      transactionDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || payment.paymentNumber || null,
      clientId: payment.clientId,
      projectId: payment.projectId,
      invoiceId: payment.invoiceId,
      status: payment.status === 'FAILED' ? 'VOID' : 'POSTED',
    };
    if (existing) return this.updateTransaction(existing.id, tenantId, data);
    return this.createTransaction(tenantId, data);
  }

  async syncExpense(tenantId: string, expenseId: string) {
    await this.setupIfEmpty(tenantId);
    const expense = await prisma.expense.findFirst({ where: { id: expenseId, tenantId } });
    if (!expense) return null;
    const account = await this.defaultAccount(tenantId, 'Bank Account');
    const categoryName = this.expenseCategoryName(String(expense.category || 'Other Expense'));
    const category = await this.defaultCategory(tenantId, categoryName, 'EXPENSE') || await this.defaultCategory(tenantId, 'Other Expense', 'EXPENSE');
    const vendor = expense.vendor ? await this.findOrCreateVendor(tenantId, expense.vendor) : null;
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'EXPENSE', sourceId: expense.id } });
    const data = {
      accountId: account?.id || null,
      categoryId: category?.id || null,
      vendorId: vendor?.id || null,
      type: 'EXPENSE',
      sourceType: 'EXPENSE',
      sourceId: expense.id,
      description: expense.title,
      amount: toNumber(expense.amount),
      currency: expense.currency || 'CAD',
      transactionDate: expense.paymentDate,
      paymentMethod: expense.paymentMethod,
      reference: expense.receiptNumber || null,
      expenseId: expense.id,
      status: expense.status === 'REJECTED' ? 'VOID' : 'POSTED',
    };
    if (existing) return this.updateTransaction(existing.id, tenantId, data);
    return this.createTransaction(tenantId, data);
  }

  private async setupIfEmpty(tenantId: string) {
    const count = await db().bookkeepingAccount.count({ where: { tenantId } });
    if (count === 0) await this.setup(tenantId);
  }

  private async nextNumber(tenantId: string, prefix: string) {
    const count = prefix === 'JE'
      ? await db().bookkeepingJournalEntry.count({ where: { tenantId } }).catch(() => 0)
      : await db().bookkeepingTransaction.count({ where: { tenantId } }).catch(() => 0);
    const entropy = Date.now().toString(36).slice(-4);
    return `${prefix}-${new Date().getFullYear()}-${String(count + 1).padStart(5, '0')}-${entropy}`;
  }

  private async defaultAccount(tenantId: string, name: string) {
    return db().bookkeepingAccount.findFirst({ where: { tenantId, name, isActive: true } });
  }

  private async defaultCategory(tenantId: string, name: string, type: string) {
    return db().bookkeepingCategory.findFirst({ where: { tenantId, name, type, isActive: true } });
  }

  private async findOrCreateVendor(tenantId: string, name: string) {
    const existing = await db().bookkeepingVendor.findFirst({ where: { tenantId, name } });
    return existing || db().bookkeepingVendor.create({ data: { tenantId, name, isActive: true } });
  }

  private expenseCategoryName(value: string) {
    const normalized = value.replace(/_/g, ' ').toLowerCase();
    if (normalized.includes('software')) return 'Software';
    if (normalized.includes('marketing')) return 'Marketing';
    if (normalized.includes('travel')) return 'Travel';
    if (normalized.includes('meal')) return 'Meals';
    if (normalized.includes('rent')) return 'Rent';
    if (normalized.includes('util')) return 'Utilities';
    if (normalized.includes('tax')) return 'Taxes';
    if (normalized.includes('labor')) return 'Labor';
    if (normalized.includes('material')) return 'Materials';
    return 'Other Expense';
  }

  private dateRange(query: Record<string, any>) {
    const now = new Date();
    const from = query.dateFrom ? new Date(query.dateFrom) : new Date(now.getFullYear(), 0, 1);
    const to = query.dateTo ? new Date(query.dateTo) : now;
    return { from, to };
  }

  private reportTransactions(tenantId: string, from: Date, to: Date): Promise<any[]> {
    return db().bookkeepingTransaction.findMany({ where: { tenantId, transactionDate: { gte: from, lte: to }, status: { not: 'VOID' } }, orderBy: { transactionDate: 'asc' } });
  }

  private monthlyTrend(transactions: any[], type: string) {
    const map = new Map<string, number>();
    transactions.filter((tx: any) => tx.type === type && tx.status !== 'VOID').forEach((tx: any) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + toNumber(tx.amount));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total: serializeMoney(total) }));
  }

  private cashFlowTrend(transactions: any[]) {
    const map = new Map<string, { in: number; out: number }>();
    transactions.forEach((tx: any) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = map.get(key) || { in: 0, out: 0 };
      if (tx.type === 'INCOME') current.in += toNumber(tx.amount);
      if (tx.type === 'EXPENSE' || tx.type === 'REFUND') current.out += toNumber(tx.amount);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([month, value]) => ({ month, moneyIn: serializeMoney(value.in), moneyOut: serializeMoney(value.out), net: serializeMoney(value.in - value.out) }));
  }

  private async groupByCategory(tenantId: string, transactions: any[]) {
    const categories = await db().bookkeepingCategory.findMany({ where: { tenantId, id: { in: transactions.map((tx: any) => tx.categoryId).filter(Boolean) } } });
    const names = new Map<string, string>(categories.map((category: any) => [String(category.id), String(category.name)]));
    const map = new Map<string, number>();
    transactions.forEach((tx: any) => {
      const name = names.get(tx.categoryId) || 'Uncategorized';
      map.set(name, (map.get(name) || 0) + toNumber(tx.amount));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total: serializeMoney(total) }));
  }

  private async topCategories(tenantId: string, type: string, from: Date, to: Date) {
    return this.groupByCategory(tenantId, (await this.reportTransactions(tenantId, from, to)).filter((tx: any) => tx.type === type));
  }

  private async topCustomersByIncome(tenantId: string, from: Date, to: Date) {
    const rows = await this.reportTransactions(tenantId, from, to);
    const clientIds = rows.filter((tx: any) => tx.type === 'INCOME' && tx.clientId).map((tx: any) => tx.clientId);
    const clients = await prisma.client.findMany({ where: { tenantId, id: { in: clientIds } }, select: { id: true, clientName: true, companyName: true } });
    const names = new Map<string, string>(clients.map((client: any) => [String(client.id), String(client.companyName || client.clientName || 'Unknown')]));
    const map = new Map<string, number>();
    rows.filter((tx: any) => tx.type === 'INCOME' && tx.clientId).forEach((tx: any) => map.set(names.get(tx.clientId) || 'Unknown', (map.get(names.get(tx.clientId) || 'Unknown') || 0) + toNumber(tx.amount)));
    return Array.from(map.entries()).map(([name, total]) => ({ name, total: serializeMoney(total) })).sort((a, b) => b.total - a.total).slice(0, 5);
  }

  private async topVendorsBySpend(tenantId: string, from: Date, to: Date) {
    const rows = await this.reportTransactions(tenantId, from, to);
    const vendorIds = rows.filter((tx: any) => tx.type === 'EXPENSE' && tx.vendorId).map((tx: any) => tx.vendorId);
    const vendors = await db().bookkeepingVendor.findMany({ where: { tenantId, id: { in: vendorIds } } });
    const names = new Map<string, string>(vendors.map((vendor: any) => [String(vendor.id), String(vendor.name)]));
    const map = new Map<string, number>();
    rows.filter((tx: any) => tx.type === 'EXPENSE' && tx.vendorId).forEach((tx: any) => map.set(names.get(tx.vendorId) || 'Unknown', (map.get(names.get(tx.vendorId) || 'Unknown') || 0) + toNumber(tx.amount)));
    return Array.from(map.entries()).map(([name, total]) => ({ name, total: serializeMoney(total) })).sort((a, b) => b.total - a.total).slice(0, 5);
  }
}

export const bookkeepingService = new BookkeepingService();
