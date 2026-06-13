import { prisma } from '../../../config/database';
import { BadRequestError, NotFoundError } from '../../../common/errors/HttpErrors';
import { ErrorCodes } from '../../../common/errors/errorCodes';
import { activityLogger } from '../../../common/services/activity-logger.service';
import { bookkeepingRepository } from './bookkeeping.repository';
import { serializeMoney, toDate, toNumber } from '../api/bookkeeping.dto';

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

const DEFAULT_CATEGORY_ACCOUNT_NAMES: Record<string, string> = {
  Sales: 'Sales Revenue',
  Services: 'Service Revenue',
  Subscriptions: 'Sales Revenue',
  'Other Income': 'Sales Revenue',
  Materials: 'Cost of Goods Sold',
  Labor: 'Cost of Goods Sold',
  Software: 'Software',
  Marketing: 'Marketing',
  Travel: 'Travel',
  Meals: 'Meals',
  'Office Supplies': 'Office Expenses',
  Rent: 'Rent',
  Utilities: 'Utilities',
  Insurance: 'Office Expenses',
  Taxes: 'Tax Paid',
  'Other Expense': 'Office Expenses',
};

function db(): any {
  return prisma as any;
}

// ─── Self-Healing Migration ──────────────────────────────────────────
// Adds missing columns/tables for the AI-Native Bookkeeping Engine.
// Runs once per server restart via $executeRawUnsafe with IF NOT EXISTS.
let _migrationApplied = false;
async function ensureSchemaUpToDate() {
  if (_migrationApplied) return;
  _migrationApplied = true;
  try {
    await prisma.$executeRawUnsafe(`
      -- Add new columns to BookkeepingTransaction
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "hash" TEXT;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "isTransfer" BOOLEAN NOT NULL DEFAULT false;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "matchedTransactionId" TEXT;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "journalEntryId" TEXT;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "importSessionId" TEXT;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "uploadedFileId" TEXT;
      ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "rawTransactionId" TEXT;
    `);
    await prisma.$executeRawUnsafe(`
      ALTER TABLE "BookkeepingAccount" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(15,2);
    `);
    // Create indexes (no-op if they exist)
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BookkeepingTransaction_hash_idx" ON "BookkeepingTransaction"("hash")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BookkeepingTransaction_importSessionId_idx" ON "BookkeepingTransaction"("importSessionId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BookkeepingTransaction_isTransfer_idx" ON "BookkeepingTransaction"("isTransfer")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "BookkeepingTransaction_rawTransactionId_key" ON "BookkeepingTransaction"("rawTransactionId")`);
    // Create new tables
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "ImportSession" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
        "tenantId" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'DRAFT',
        "name" TEXT, "notes" TEXT,
        "totalFiles" INTEGER NOT NULL DEFAULT 0, "totalRawTx" INTEGER NOT NULL DEFAULT 0,
        "totalCreated" INTEGER NOT NULL DEFAULT 0, "totalSkipped" INTEGER NOT NULL DEFAULT 0,
        "totalDupes" INTEGER NOT NULL DEFAULT 0, "createdById" TEXT,
        "completedAt" TIMESTAMP(3), "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "ImportSession" ADD CONSTRAINT IF NOT EXISTS "ImportSession_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportSession_tenantId_idx" ON "ImportSession"("tenantId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "ImportSession_status_idx" ON "ImportSession"("status")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "UploadedFile" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(), "tenantId" TEXT NOT NULL,
        "sessionId" TEXT NOT NULL, "accountId" TEXT, "fileName" TEXT NOT NULL,
        "originalName" TEXT NOT NULL, "provider" TEXT, "statementStart" TIMESTAMP(3),
        "statementEnd" TIMESTAMP(3), "checksum" TEXT NOT NULL,
        "rowCount" INTEGER NOT NULL DEFAULT 0, "processedCount" INTEGER NOT NULL DEFAULT 0,
        "duplicateCount" INTEGER NOT NULL DEFAULT 0, "status" TEXT NOT NULL DEFAULT 'PENDING',
        "errorMessage" TEXT, "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "UploadedFile" ADD CONSTRAINT IF NOT EXISTS "UploadedFile_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "UploadedFile" ADD CONSTRAINT IF NOT EXISTS "UploadedFile_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UploadedFile_tenantId_idx" ON "UploadedFile"("tenantId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "UploadedFile_sessionId_idx" ON "UploadedFile"("sessionId")`);
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "UploadedFile_tenantId_checksum_key" ON "UploadedFile"("tenantId", "checksum")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "RawTransaction" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(), "tenantId" TEXT NOT NULL,
        "sessionId" TEXT NOT NULL, "uploadedFileId" TEXT NOT NULL,
        "originalRow" JSONB NOT NULL, "normalizedData" JSONB NOT NULL, "hash" TEXT NOT NULL,
        "status" TEXT NOT NULL DEFAULT 'PENDING', "transactionId" TEXT,
        "aiCategory" TEXT, "aiVendor" TEXT, "aiConfidence" DOUBLE PRECISION,
        "aiTransactionType" TEXT, "aiReason" TEXT,
        "aiPossibleTransfer" BOOLEAN NOT NULL DEFAULT false, "matchedRawTxId" TEXT,
        "isTransfer" BOOLEAN NOT NULL DEFAULT false, "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
        "duplicateOfId" TEXT, "manualOverrides" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "RawTransaction_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "RawTransaction" ADD CONSTRAINT IF NOT EXISTS "RawTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "RawTransaction" ADD CONSTRAINT IF NOT EXISTS "RawTransaction_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`ALTER TABLE "RawTransaction" ADD CONSTRAINT IF NOT EXISTS "RawTransaction_uploadedFileId_fkey" FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE UNIQUE INDEX IF NOT EXISTS "RawTransaction_transactionId_key" ON "RawTransaction"("transactionId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RawTransaction_tenantId_idx" ON "RawTransaction"("tenantId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RawTransaction_sessionId_idx" ON "RawTransaction"("sessionId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RawTransaction_hash_idx" ON "RawTransaction"("hash")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "RawTransaction_status_idx" ON "RawTransaction"("status")`);
    await prisma.$executeRawUnsafe(`
      CREATE TABLE IF NOT EXISTS "BookkeepingAuditLog" (
        "id" TEXT NOT NULL DEFAULT gen_random_uuid(), "tenantId" TEXT NOT NULL,
        "entityType" TEXT NOT NULL, "entityId" TEXT NOT NULL, "action" TEXT NOT NULL,
        "beforeValue" JSONB, "afterValue" JSONB, "aiResponse" JSONB, "userId" TEXT,
        "metadata" JSONB NOT NULL DEFAULT '{}',
        "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
        CONSTRAINT "BookkeepingAuditLog_pkey" PRIMARY KEY ("id")
      )
    `);
    await prisma.$executeRawUnsafe(`ALTER TABLE "BookkeepingAuditLog" ADD CONSTRAINT IF NOT EXISTS "BookkeepingAuditLog_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE`).catch(() => {});
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BookkeepingAuditLog_tenantId_idx" ON "BookkeepingAuditLog"("tenantId")`);
    await prisma.$executeRawUnsafe(`CREATE INDEX IF NOT EXISTS "BookkeepingAuditLog_entityType_entityId_idx" ON "BookkeepingAuditLog"("entityType", "entityId")`);
    console.log('✅ Bookkeeping engine schema up to date');
  } catch (err) {
    console.error('⚠️ Bookkeeping schema migration warning (non-fatal):', (err as any)?.message);
    // Non-fatal — tables may already exist or DB might not be fully initialized
  }
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

function withSyncStatus(metadata: Record<string, any> | null | undefined, syncStatus: 'synced' | 'failed' | 'needs_review' | 'voided' | 'reversed') {
  return { ...(metadata || {}), syncStatus };
}

function isReconciled(tx: Record<string, any> | null | undefined) {
  return Boolean(tx && (tx.status === 'RECONCILED' || tx.isReconciled));
}

export class BookkeepingService {
  async setup(tenantId: string, actorUserId?: string) {
    await ensureSchemaUpToDate();
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
        const account = await db().bookkeepingAccount.findFirst({ where: { tenantId, name: DEFAULT_CATEGORY_ACCOUNT_NAMES[name] || name } });
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
    await ensureSchemaUpToDate();
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

  async deleteVendor(id: string, tenantId: string, actorUserId?: string) {
    await this.getVendor(id, tenantId);
    const deleted = await bookkeepingRepository.deactivate('bookkeepingVendor', id, tenantId);
    activityLogger.log({ tenantId, entityType: 'BookkeepingVendor', entityId: id, action: 'DELETE', module: 'bookkeeping', description: 'Deactivated vendor', userId: actorUserId });
    return deleted;
  }

  async listTransactions(tenantId: string, query: Record<string, any>) {
    await ensureSchemaUpToDate();
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
    if (data.paymentId || data.sourceType === 'INVOICE_PAYMENT') {
      const paymentId = data.paymentId || data.sourceId;
      if (paymentId) {
        const payment = await db().invoicePayment.findFirst({ where: { id: paymentId, tenantId } });
        if (!payment) throw new BadRequestError('Invoice payment does not belong to this tenant', ErrorCodes.INVALID_INPUT);
      }
    }
    if (data.expenseId) {
      const expense = await prisma.expense.findFirst({ where: { id: data.expenseId, tenantId } });
      if (!expense) throw new BadRequestError('Expense does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.sourceType === 'EXPENSE' && data.sourceId && data.sourceId !== data.expenseId) {
      const expense = await prisma.expense.findFirst({ where: { id: data.sourceId, tenantId } });
      if (!expense) throw new BadRequestError('Expense does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.clientId) {
      const client = await prisma.client.findFirst({ where: { id: data.clientId, tenantId } });
      if (!client) throw new BadRequestError('Client does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.companyId) {
      const company = await prisma.client.findFirst({ where: { id: data.companyId, tenantId } });
      if (!company) throw new BadRequestError('Company/account does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.contactId) {
      const contact = await (prisma as any).contact.findFirst({ where: { id: data.contactId, tenantId } });
      if (!contact) throw new BadRequestError('Contact does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
    if (data.projectId) {
      const project = await prisma.project.findFirst({ where: { id: data.projectId, tenantId } });
      if (!project) throw new BadRequestError('Deal/project does not belong to this tenant', ErrorCodes.INVALID_INPUT);
    }
  }

  async createTransaction(tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const amount = requirePositiveAmount(data.amount);
    await this.validateTransactionLinks(tenantId, data);
    if (data.sourceType && data.sourceId && data.skipSourceIdempotency !== true) {
      const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: data.sourceType, sourceId: data.sourceId } });
      if (existing) return existing;
    }
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
    if (isReconciled(existing)) throw new BadRequestError('Unreconcile this transaction before editing or voiding it.', ErrorCodes.INVALID_INPUT);
    await this.validateTransactionLinks(tenantId, data);
    if (existing.status === 'POSTED' && existing.accountId) await this.applyTransactionBalance(existing, -1);
    const updateData = {
      transactionNumber: data.transactionNumber,
      accountId: data.accountId,
      categoryId: data.categoryId,
      vendorId: data.vendorId,
      type: data.type,
      sourceType: data.sourceType,
      sourceId: data.sourceId,
      description: data.description,
      amount: data.amount !== undefined ? requirePositiveAmount(data.amount) : undefined,
      currency: data.currency,
      transactionDate: data.transactionDate ? toDate(data.transactionDate) : undefined,
      paymentMethod: data.paymentMethod,
      reference: data.reference,
      clientId: data.clientId,
      projectId: data.projectId,
      invoiceId: data.invoiceId,
      expenseId: data.expenseId,
      fileId: data.fileId,
      status: data.status,
      isReconciled: data.isReconciled,
      reconciledAt: data.reconciledAt,
      metadata: data.metadata,
    };
    const updated = await db().bookkeepingTransaction.update({ where: { id }, data: updateData });
    if (updated.status === 'POSTED' && updated.accountId) await this.applyTransactionBalance(updated, 1);
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated bookkeeping transaction', userId: actorUserId });
    return updated;
  }

  async voidTransaction(id: string, tenantId: string, actorUserId?: string) {
    const existing = await this.getTransaction(id, tenantId);
    if (isReconciled(existing)) throw new BadRequestError('Unreconcile this transaction before editing or voiding it.', ErrorCodes.INVALID_INPUT);
    if (existing.status === 'VOID') return existing;
    if (existing.status !== 'VOID' && existing.status === 'POSTED' && existing.accountId) await this.applyTransactionBalance(existing, -1);
    const updated = await db().bookkeepingTransaction.update({ where: { id }, data: { status: 'VOID', isReconciled: false, metadata: withSyncStatus(existing.metadata, 'voided') } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingTransaction', entityId: id, action: 'STATUS_CHANGE', module: 'bookkeeping', description: 'Voided bookkeeping transaction', userId: actorUserId });
    return updated;
  }

  async voidSourceTransaction(tenantId: string, sourceType: string, sourceId: string, actorUserId?: string) {
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType, sourceId } });
    if (!existing) return null;
    if (isReconciled(existing)) return this.createSourceReversalTransaction(tenantId, existing, toNumber(existing.amount), 'VOIDED', actorUserId);
    return this.voidTransaction(existing.id, tenantId, actorUserId);
  }

  private async reverseOrVoidSourceTransaction(tenantId: string, sourceType: string, sourceId: string, amount: number, reason: string, actorUserId?: string) {
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType, sourceId } });
    if (!existing) return null;
    if (isReconciled(existing)) {
      return this.createPaymentReversalTransaction(tenantId, existing, amount, reason, actorUserId);
    }
    return this.voidTransaction(existing.id, tenantId, actorUserId);
  }

  private async createPaymentReversalTransaction(tenantId: string, original: Record<string, any>, amount: number, reason: string, actorUserId?: string) {
    const reversalAmount = requirePositiveAmount(amount);
    const sourceId = `${original.sourceId}:${reason}:${serializeMoney(reversalAmount)}`;
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'INVOICE_PAYMENT_REVERSAL', sourceId } });
    if (existing) return existing;
    return this.createTransaction(tenantId, {
      accountId: original.accountId || null,
      categoryId: original.categoryId || null,
      type: 'REFUND',
      sourceType: 'INVOICE_PAYMENT_REVERSAL',
      sourceId,
      description: `Payment ${reason.toLowerCase().replace(/_/g, ' ')} for ${original.description || original.sourceId}`,
      amount: reversalAmount,
      currency: original.currency || 'CAD',
      transactionDate: new Date(),
      paymentMethod: original.paymentMethod || null,
      reference: original.reference || null,
      clientId: original.clientId || null,
      projectId: original.projectId || null,
      invoiceId: original.invoiceId || null,
      status: 'POSTED',
      metadata: withSyncStatus({ originalTransactionId: original.id, originalSourceType: original.sourceType, originalSourceId: original.sourceId, reason }, 'reversed'),
      skipSourceIdempotency: true,
    }, actorUserId);
  }

  private async createSourceReversalTransaction(tenantId: string, original: Record<string, any>, amount: number, reason: string, actorUserId?: string) {
    const reversalAmount = requirePositiveAmount(amount);
    const sourceType = `${original.sourceType || 'SOURCE'}_REVERSAL`;
    const sourceId = `${original.sourceId || original.id}:${reason}:${serializeMoney(reversalAmount)}`;
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType, sourceId } });
    if (existing) return existing;
    const type = original.type === 'INCOME' ? 'REFUND' : reason.includes('INCREASED') ? 'EXPENSE' : 'ADJUSTMENT';
    return this.createTransaction(tenantId, {
      accountId: original.accountId || null,
      categoryId: original.categoryId || null,
      vendorId: original.vendorId || null,
      type,
      sourceType,
      sourceId,
      description: `${original.type === 'INCOME' ? 'Revenue' : 'Expense'} ${reason.toLowerCase().replace(/_/g, ' ')} reversal for ${original.description || original.sourceId || original.id}`,
      amount: reversalAmount,
      currency: original.currency || 'CAD',
      transactionDate: new Date(),
      paymentMethod: original.paymentMethod || null,
      reference: original.reference || null,
      clientId: original.clientId || null,
      projectId: original.projectId || null,
      invoiceId: original.invoiceId || null,
      expenseId: original.expenseId || null,
      fileId: original.fileId || null,
      status: 'POSTED',
      metadata: withSyncStatus({ originalTransactionId: original.id, originalSourceType: original.sourceType, originalSourceId: original.sourceId, reason }, 'reversed'),
      skipSourceIdempotency: true,
    }, actorUserId);
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
    const created = await db().bookkeepingReconciliation.create({ data: { tenantId, accountId: data.accountId, statementDate: toDate(data.statementDate), statementStartingBalance: toNumber(data.statementStartingBalance), statementEndingBalance: toNumber(data.statementEndingBalance), systemEndingBalance, difference, status: 'DRAFT', notes: data.notes || null, metadata: { transactionIds: selectedIds } } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingReconciliation', entityId: created.id, action: 'CREATE', module: 'bookkeeping', description: 'Created account reconciliation draft', userId: actorUserId, metadata: { accountId: data.accountId, difference } });
    return created;
  }

  async updateReconciliation(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    await this.getReconciliation(id, tenantId);
    const updated = await db().bookkeepingReconciliation.update({ where: { id }, data: { ...data, statementDate: data.statementDate ? toDate(data.statementDate) : undefined } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingReconciliation', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated account reconciliation', userId: actorUserId });
    return updated;
  }

  async deleteReconciliation(id: string, tenantId: string, actorUserId?: string) {
    await this.getReconciliation(id, tenantId);
    const updated = await db().bookkeepingReconciliation.update({ where: { id }, data: { status: 'VOID' } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingReconciliation', entityId: id, action: 'DELETE', module: 'bookkeeping', description: 'Voided account reconciliation', userId: actorUserId });
    return updated;
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
    const created = await db().bookkeepingRecurringRule.create({ data: { tenantId, ...data, amount: requirePositiveAmount(data.amount), nextRunAt: toDate(data.nextRunAt), endAt: data.endAt ? toDate(data.endAt) : null, createdById: actorUserId || null } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingRecurringRule', entityId: created.id, action: 'CREATE', module: 'bookkeeping', description: `Created recurring ${created.type.toLowerCase()} rule "${created.name}"`, userId: actorUserId });
    return created;
  }

  async updateRecurringRule(id: string, tenantId: string, data: Record<string, any>, actorUserId?: string) {
    const existing = await bookkeepingRepository.findById('bookkeepingRecurringRule', id, tenantId);
    if (!existing) throw new NotFoundError('Recurring rule not found', ErrorCodes.RESOURCE_NOT_FOUND);
    await this.validateTransactionLinks(tenantId, data);
    const updated = await db().bookkeepingRecurringRule.update({ where: { id }, data: { ...data, amount: data.amount ? requirePositiveAmount(data.amount) : undefined, nextRunAt: data.nextRunAt ? toDate(data.nextRunAt) : undefined, endAt: data.endAt ? toDate(data.endAt) : undefined } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingRecurringRule', entityId: id, action: 'UPDATE', module: 'bookkeeping', description: 'Updated recurring rule', userId: actorUserId });
    return updated;
  }

  async deleteRecurringRule(id: string, tenantId: string, actorUserId?: string) {
    const existing = await bookkeepingRepository.findById('bookkeepingRecurringRule', id, tenantId);
    if (!existing) throw new NotFoundError('Recurring rule not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const updated = await db().bookkeepingRecurringRule.update({ where: { id }, data: { isActive: false } });
    activityLogger.log({ tenantId, entityType: 'BookkeepingRecurringRule', entityId: id, action: 'DELETE', module: 'bookkeeping', description: 'Deactivated recurring rule', userId: actorUserId });
    return updated;
  }

  async runDueRecurringRules(tenantId: string, actorUserId?: string) {
    const now = new Date();
    const rules = await db().bookkeepingRecurringRule.findMany({ where: { tenantId, isActive: true, nextRunAt: { lte: now }, OR: [{ endAt: null }, { endAt: { gte: now } }] } });
    const created = [];
    for (const rule of rules) {
      const scheduledFor = new Date(rule.nextRunAt);
      const sourceId = `${rule.id}:${scheduledFor.toISOString().slice(0, 10)}`;
      const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'RECURRING_RULE', sourceId } });
      if (!existing) {
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
          transactionDate: scheduledFor.toISOString(),
          sourceType: 'RECURRING_RULE',
          sourceId,
          metadata: { recurringRuleId: rule.id, scheduledFor: scheduledFor.toISOString() },
        }, actorUserId));
      }
      const months = rule.frequency === 'WEEKLY' ? 0 : rule.frequency === 'QUARTERLY' ? 3 : rule.frequency === 'YEARLY' ? 12 : 1;
      const nextRunAt = rule.frequency === 'WEEKLY' ? new Date(scheduledFor.getTime() + 7 * 86400000) : addMonths(scheduledFor, months);
      await db().bookkeepingRecurringRule.update({ where: { id: rule.id }, data: { lastRunAt: now, nextRunAt } });
    }
    return { created: created.length };
  }

  async dashboard(tenantId: string, query: Record<string, any> = {}) {
    await this.setupIfEmpty(tenantId);
    let from = new Date(0);
    let to = new Date(2100, 0, 1);
    
    if (query.dateFrom) from = new Date(query.dateFrom);
    if (query.dateTo) {
      to = new Date(query.dateTo);
      to.setUTCHours(23, 59, 59, 999);
    }
    
    // The ledger is the reporting source of truth. Invoice payments are already
    // synchronized into bookkeeping transactions and must not be counted twice.
    const transactions: any[] = await this.reportTransactions(tenantId, from, to);
    const income = transactions.reduce((sum: number, tx: any) => sum + this.incomeImpact(tx), 0);
    const expenses = transactions.reduce((sum: number, tx: any) => sum + this.expenseImpact(tx), 0);

    const [accounts, unpaidInvoices, overdueInvoices, pendingExpenses, recentTransactions] = await Promise.all([
      db().bookkeepingAccount.findMany({ where: { tenantId, isActive: true } }),
      prisma.invoice.count({ where: { tenantId, status: { in: ['SENT', 'OVERDUE', 'PARTIALLY_PAID'] } as any } }),
      prisma.invoice.count({ where: { tenantId, dueDate: { lt: new Date() }, status: { notIn: ['PAID', 'CANCELLED'] } as any } }),
      prisma.expense.count({ where: { tenantId, status: { in: ['DRAFT', 'PENDING_APPROVAL'] } as any } }),
      db().bookkeepingTransaction.findMany({ where: { tenantId }, orderBy: { transactionDate: 'desc' }, take: 8 }),
    ]);
    const bankAccountIds = new Set(accounts
      .filter((a: any) => a.type === 'ASSET' && (a.isBankAccount || ['Cash', 'Bank Account'].includes(a.name)))
      .map((a: any) => a.id));
    const cashBalance = transactions
      .filter((tx: any) => tx.accountId && bankAccountIds.has(tx.accountId))
      .reduce((sum: number, tx: any) => sum + this.cashInImpact(tx) - this.cashOutImpact(tx), 0);
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
      topExpenseCategories: await this.topCategories(tenantId, 'EXPENSE', from, to),
      topCustomersByIncome: await this.topCustomersByIncome(tenantId, from, to),
      topVendorsBySpend: await this.topVendorsBySpend(tenantId, from, to),
      importStats: await this.getImportStats(tenantId),
    };
  }

  async profitLoss(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const transactions: any[] = await this.reportTransactions(tenantId, from, to);
    const incomeRows = transactions.filter((tx: any) => this.incomeImpact(tx) !== 0);
    const expenseRows = transactions.filter((tx: any) => this.expenseImpact(tx) !== 0);
    const incomeTotal = incomeRows.reduce((sum: number, tx: any) => sum + this.incomeImpact(tx), 0);
    const expenseTotal = expenseRows.reduce((sum: number, tx: any) => sum + this.expenseImpact(tx), 0);
    return {
      dateFrom: from,
      dateTo: to,
      income: await this.groupByCategory(tenantId, incomeRows, (tx) => this.incomeImpact(tx)),
      expenses: await this.groupByCategory(tenantId, expenseRows, (tx) => this.expenseImpact(tx)),
      grossProfit: serializeMoney(incomeTotal),
      netProfit: serializeMoney(incomeTotal - expenseTotal),
      totals: { income: serializeMoney(incomeTotal), expenses: serializeMoney(expenseTotal) },
    };
  }

  async cashFlow(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const transactions: any[] = await this.reportTransactions(tenantId, from, to);
    const moneyIn = transactions.reduce((sum: number, tx: any) => sum + this.cashInImpact(tx), 0);
    const moneyOut = transactions.reduce((sum: number, tx: any) => sum + this.cashOutImpact(tx), 0);
    return { moneyIn: serializeMoney(moneyIn), moneyOut: serializeMoney(moneyOut), netCashMovement: serializeMoney(moneyIn - moneyOut), byMonth: this.cashFlowTrend(transactions) };
  }

  async taxSummary(tenantId: string, query: Record<string, any>) {
    const { from, to } = this.dateRange(query);
    const [invoiceAgg, expenseAgg, taxExpenseTransactions, taxCategories] = await Promise.all([
      prisma.invoice.aggregate({ where: { tenantId, issueDate: { gte: from, lte: to }, status: { not: 'CANCELLED' } as any }, _sum: { taxAmount: true, subtotal: true } }),
      prisma.expense.aggregate({ where: { tenantId, paymentDate: { gte: from, lte: to }, status: { in: ['APPROVED', 'REIMBURSED'] } as any }, _sum: { amount: true } }),
      this.reportTransactions(tenantId, from, to),
      db().bookkeepingCategory.findMany({ where: { tenantId, name: 'Taxes', type: 'EXPENSE', isActive: true } }),
    ]);
    const taxCollected = toNumber(invoiceAgg._sum.taxAmount);
    const taxCategoryIds = new Set<string>(taxCategories.map((category: any) => String(category.id)));
    const taxPaid = taxExpenseTransactions
      .filter((tx: any) => tx.type === 'EXPENSE' && tx.categoryId && taxCategoryIds.has(String(tx.categoryId)))
      .reduce((sum: number, tx: any) => sum + toNumber(tx.amount), 0);
    return {
      taxCollected: serializeMoney(taxCollected),
      taxPaid: serializeMoney(taxPaid),
      netTaxEstimate: serializeMoney(taxCollected - taxPaid),
      taxableSales: serializeMoney(invoiceAgg._sum.subtotal),
      expenseBase: serializeMoney(expenseAgg._sum.amount),
    };
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
    const payment = await db().invoicePayment.findFirst({ where: { id: paymentId, tenantId }, include: { invoice: { include: { items: true } } } });
    if (!payment) return this.voidSourceTransaction(tenantId, 'INVOICE_PAYMENT', paymentId);
    const account = await this.defaultAccount(tenantId, 'Bank Account');
    const category = await this.defaultCategory(tenantId, this.invoiceIncomeCategoryName(payment), 'INCOME')
      || await this.defaultCategory(tenantId, 'Sales', 'INCOME');
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'INVOICE_PAYMENT', sourceId: payment.id } });
    const paymentStatus = String(payment.status || '').toUpperCase();
    const refundAmount = toNumber(payment.refundAmount);
    const voidedPayment = ['FAILED', 'VOID', 'VOIDED', 'CANCELLED', 'CANCELED'].includes(paymentStatus);
    if (voidedPayment) {
      if (existing) return this.reverseOrVoidSourceTransaction(tenantId, 'INVOICE_PAYMENT', payment.id, toNumber(payment.amount), paymentStatus);
      return null;
    }
    if (paymentStatus === 'REFUNDED') {
      if (!existing) await this.createTransaction(tenantId, this.invoicePaymentTransactionData(payment, account, category));
      return this.createInvoicePaymentReversal(tenantId, payment.id, toNumber(payment.amount), 'REFUNDED');
    }
    if (paymentStatus === 'PARTIALLY_REFUNDED') {
      if (!existing) await this.createTransaction(tenantId, this.invoicePaymentTransactionData(payment, account, category));
      return this.createInvoicePaymentReversal(tenantId, payment.id, refundAmount, 'PARTIALLY_REFUNDED');
    }
    const data = this.invoicePaymentTransactionData(payment, account, category);
    if (existing) return this.updateTransaction(existing.id, tenantId, data);
    return this.createTransaction(tenantId, data);
  }

  private invoicePaymentTransactionData(payment: Record<string, any>, account: Record<string, any> | null, category: Record<string, any> | null) {
    return {
      accountId: account?.id || null,
      categoryId: category?.id || null,
      type: 'INCOME',
      sourceType: 'INVOICE_PAYMENT',
      sourceId: payment.id,
      description: `Invoice payment ${payment.invoice?.invoiceNumber || payment.paymentNumber || payment.reference || payment.id}`,
      amount: toNumber(payment.amount),
      currency: payment.invoice?.currency || 'CAD',
      transactionDate: payment.paymentDate,
      paymentMethod: payment.paymentMethod,
      reference: payment.reference || payment.paymentNumber || null,
      clientId: payment.clientId || payment.invoice?.clientId || null,
      projectId: payment.projectId || payment.invoice?.projectId || null,
      invoiceId: payment.invoiceId,
      status: 'POSTED',
      metadata: withSyncStatus({
        paymentId: payment.id,
        paymentStatus: payment.status || 'SUCCESSFUL',
        invoiceNumber: payment.invoice?.invoiceNumber || null,
        proposalId: payment.invoice?.quoteId || null,
        contractId: payment.invoice?.contractId || null,
      }, 'synced'),
      skipSourceIdempotency: true,
    };
  }

  async createInvoicePaymentReversal(tenantId: string, paymentId: string, amount: number, reason = 'REFUNDED', actorUserId?: string) {
    await this.setupIfEmpty(tenantId);
    const payment = await db().invoicePayment.findFirst({ where: { id: paymentId, tenantId }, include: { invoice: { include: { items: true } } } });
    if (!payment) throw new NotFoundError('Invoice payment not found', ErrorCodes.RESOURCE_NOT_FOUND);
    const original = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'INVOICE_PAYMENT', sourceId: payment.id } });
    if (!original) {
      const account = await this.defaultAccount(tenantId, 'Bank Account');
      const category = await this.defaultCategory(tenantId, this.invoiceIncomeCategoryName(payment), 'INCOME')
        || await this.defaultCategory(tenantId, 'Sales', 'INCOME');
      const created = await this.createTransaction(tenantId, this.invoicePaymentTransactionData(payment, account, category), actorUserId);
      return this.createPaymentReversalTransaction(tenantId, created, amount, reason, actorUserId);
    }
    return this.createPaymentReversalTransaction(tenantId, original, amount, reason, actorUserId);
  }

  async syncExpense(tenantId: string, expenseId: string) {
    await this.setupIfEmpty(tenantId);
    const expense = await prisma.expense.findFirst({ where: { id: expenseId, tenantId } });
    if (!expense) return this.voidSourceTransaction(tenantId, 'EXPENSE', expenseId);
    const account = await this.defaultAccount(tenantId, 'Bank Account');
    const categoryName = this.expenseCategoryName(String(expense.category || 'Other Expense'));
    const category = await this.defaultCategory(tenantId, categoryName, 'EXPENSE') || await this.defaultCategory(tenantId, 'Other Expense', 'EXPENSE');
    const vendor = expense.vendor ? await this.findOrCreateVendor(tenantId, expense.vendor) : null;
    const existing = await db().bookkeepingTransaction.findFirst({ where: { tenantId, sourceType: 'EXPENSE', sourceId: expense.id } });
    const expenseStatus = String(expense.status || '').toUpperCase();
    const shouldVoid = ['REJECTED', 'VOID', 'VOIDED', 'DELETED', 'CANCELLED', 'CANCELED'].includes(expenseStatus);
    const posted = ['APPROVED', 'PAID', 'REIMBURSED', 'POSTED'].includes(expenseStatus);
    const data = {
      accountId: account?.id || null,
      categoryId: category?.id || null,
      vendorId: vendor?.id || null,
      type: 'EXPENSE',
      sourceType: 'EXPENSE',
      sourceId: expense.id,
      description: expense.description || expense.title,
      amount: toNumber(expense.amount),
      currency: expense.currency || 'CAD',
      transactionDate: expense.paymentDate,
      paymentMethod: expense.paymentMethod,
      reference: expense.receiptNumber || null,
      expenseId: expense.id,
      status: shouldVoid ? 'VOID' : posted ? 'POSTED' : 'PENDING',
      metadata: withSyncStatus({
        expenseId: expense.id,
        expenseStatus: expense.status || null,
        expenseTitle: expense.title,
        vendor: expense.vendor || null,
        receiptNumber: expense.receiptNumber || null,
        isReimbursable: Boolean(expense.isReimbursable),
      }, shouldVoid ? 'voided' : posted ? 'synced' : 'needs_review'),
      skipSourceIdempotency: true,
    };
    if (existing) {
      if (shouldVoid) return this.voidSourceTransaction(tenantId, 'EXPENSE', expense.id);
      if (isReconciled(existing)) {
        const changedAmount = serializeMoney(toNumber(existing.amount) - toNumber(expense.amount));
        if (changedAmount !== 0) return this.createSourceReversalTransaction(tenantId, existing, Math.abs(changedAmount), changedAmount > 0 ? 'EXPENSE_REDUCED' : 'EXPENSE_INCREASED');
        return existing;
      }
      return this.updateTransaction(existing.id, tenantId, data);
    }
    if (shouldVoid) return null;
    return this.createTransaction(tenantId, data);
  }

  async setupIfEmpty(tenantId: string) {
    await ensureSchemaUpToDate();
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
    if (normalized.includes('insurance')) return 'Insurance';
    if (normalized.includes('office')) return 'Office Supplies';
    if (normalized.includes('labor')) return 'Labor';
    if (normalized.includes('salar')) return 'Labor';
    if (normalized.includes('material')) return 'Materials';
    return 'Other Expense';
  }

  private invoiceIncomeCategoryName(payment: Record<string, any>) {
    if (payment.subscriptionId) return 'Subscriptions';
    const descriptions = Array.isArray(payment.invoice?.items)
      ? payment.invoice.items.map((item: any) => String(item.description || '')).join(' ').toLowerCase()
      : '';
    if (descriptions.includes('subscription') || descriptions.includes('monthly') || descriptions.includes('recurring')) return 'Subscriptions';
    if (descriptions.includes('service') || descriptions.includes('consult') || descriptions.includes('support') || descriptions.includes('implementation')) return 'Services';
    return 'Sales';
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
    transactions.filter((tx: any) => type === 'INCOME' ? this.incomeImpact(tx) !== 0 : this.expenseImpact(tx) !== 0).forEach((tx: any) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      map.set(key, (map.get(key) || 0) + (type === 'INCOME' ? this.incomeImpact(tx) : this.expenseImpact(tx)));
    });
    return Array.from(map.entries()).map(([month, total]) => ({ month, total: serializeMoney(total) }));
  }

  private cashFlowTrend(transactions: any[]) {
    const map = new Map<string, { in: number; out: number }>();
    transactions.forEach((tx: any) => {
      const date = new Date(tx.transactionDate);
      const key = `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`;
      const current = map.get(key) || { in: 0, out: 0 };
      current.in += this.cashInImpact(tx);
      current.out += this.cashOutImpact(tx);
      map.set(key, current);
    });
    return Array.from(map.entries()).map(([month, value]) => ({ month, moneyIn: serializeMoney(value.in), moneyOut: serializeMoney(value.out), net: serializeMoney(value.in - value.out) }));
  }

  private async groupByCategory(tenantId: string, transactions: any[], amountFor: (tx: any) => number = (tx) => toNumber(tx.amount)) {
    const categories = await db().bookkeepingCategory.findMany({ where: { tenantId, id: { in: transactions.map((tx: any) => tx.categoryId).filter(Boolean) } } });
    const names = new Map<string, string>(categories.map((category: any) => [String(category.id), String(category.name)]));
    const map = new Map<string, number>();
    transactions.forEach((tx: any) => {
      const name = names.get(tx.categoryId) || 'Uncategorized';
      map.set(name, (map.get(name) || 0) + amountFor(tx));
    });
    return Array.from(map.entries()).map(([name, total]) => ({ name, total: serializeMoney(total) }));
  }

  private async topCategories(tenantId: string, type: string, from: Date, to: Date) {
    return this.groupByCategory(
      tenantId,
      (await this.reportTransactions(tenantId, from, to)).filter((tx: any) => type === 'INCOME' ? this.incomeImpact(tx) !== 0 : this.expenseImpact(tx) !== 0),
      (tx) => type === 'INCOME' ? this.incomeImpact(tx) : this.expenseImpact(tx),
    );
  }

  private async topCustomersByIncome(tenantId: string, from: Date, to: Date) {
    const rows = await this.reportTransactions(tenantId, from, to);
    const clientIds = rows.filter((tx: any) => this.incomeImpact(tx) !== 0 && tx.clientId).map((tx: any) => tx.clientId);
    const clients = await prisma.client.findMany({ where: { tenantId, id: { in: clientIds } }, select: { id: true, clientName: true, companyName: true } });
    const names = new Map<string, string>(clients.map((client: any) => [String(client.id), String(client.companyName || client.clientName || 'Unknown')]));
    const map = new Map<string, number>();
    rows.filter((tx: any) => this.incomeImpact(tx) !== 0 && tx.clientId).forEach((tx: any) => map.set(names.get(tx.clientId) || 'Unknown', (map.get(names.get(tx.clientId) || 'Unknown') || 0) + this.incomeImpact(tx)));
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

  private isIncomeRefund(tx: any) {
    if (tx.type !== 'REFUND') return false;
    const originalSourceType = String(tx.metadata?.originalSourceType || '');
    const sourceType = String(tx.sourceType || '');
    return originalSourceType === 'INVOICE_PAYMENT'
      || sourceType === 'INVOICE_PAYMENT_REVERSAL'
      || sourceType.startsWith('INVOICE_PAYMENT_');
  }

  private incomeImpact(tx: any) {
    if (tx.status === 'VOID') return 0;
    if (tx.type === 'INCOME') return toNumber(tx.amount);
    if (this.isIncomeRefund(tx)) return -toNumber(tx.amount);
    return 0;
  }

  private expenseImpact(tx: any) {
    if (tx.status === 'VOID') return 0;
    if (tx.type === 'EXPENSE' || tx.type === 'PAYROLL' || tx.type === 'TAX_PAYMENT') return toNumber(tx.amount);
    if ((tx.type === 'REFUND' && !this.isIncomeRefund(tx)) || tx.type === 'CASHBACK') return -toNumber(tx.amount);
    if (tx.type === 'ADJUSTMENT' && tx.metadata?.originalSourceType === 'EXPENSE') return -toNumber(tx.amount);
    return 0;
  }

  private cashInImpact(tx: any) {
    if (tx.status === 'VOID') return 0;
    if (tx.type === 'INCOME' || (tx.type === 'REFUND' && !this.isIncomeRefund(tx)) || tx.type === 'CASHBACK' || tx.type === 'OWNER_CONTRIBUTION' || tx.type === 'LOAN_PRINCIPAL') return toNumber(tx.amount);
    if (tx.type === 'ADJUSTMENT' && tx.metadata?.originalSourceType === 'EXPENSE') return toNumber(tx.amount);
    return 0;
  }

  private cashOutImpact(tx: any) {
    if (tx.status === 'VOID') return 0;
    if (tx.type === 'EXPENSE' || this.isIncomeRefund(tx) || tx.type === 'PAYROLL' || tx.type === 'TAX_PAYMENT' || tx.type === 'OWNER_DRAW' || tx.type === 'LOAN_PAYMENT' || tx.type === 'CREDIT_CARD_PAYMENT') return toNumber(tx.amount);
    return 0;
  }

  async importTransactions(tenantId: string, payload: any, actorUserId?: string) {
    const { accountsToCreate, vendorsToCreate, categoriesToCreate, transactions } = payload;
    const mappedAccounts: Record<string, string> = {};
    const mappedVendors: Record<string, string> = {};
    const mappedCategories: Record<string, string> = {};

    for (const acc of accountsToCreate || []) {
      let existing = await db().bookkeepingAccount.findFirst({ where: { tenantId, name: acc.name } });
      if (!existing) {
        existing = await this.createAccount(tenantId, { name: acc.name, type: acc.type, isBankAccount: acc.isBankAccount, openingBalance: 0 }, actorUserId);
      }
      mappedAccounts[acc.tempId] = existing.id;
    }

    for (const v of vendorsToCreate || []) {
      let existing = await db().bookkeepingVendor.findFirst({ where: { tenantId, name: v.name } });
      if (!existing) {
        existing = await this.createVendor(tenantId, { name: v.name }, actorUserId);
      }
      mappedVendors[v.tempId] = existing.id;
    }

    for (const c of categoriesToCreate || []) {
      let existing = await db().bookkeepingCategory.findFirst({ where: { tenantId, name: c.name, type: c.type } });
      if (!existing) {
        existing = await this.createCategory(tenantId, { name: c.name, type: c.type }, actorUserId);
      }
      mappedCategories[c.tempId] = existing.id;
    }

    let createdCount = 0;

    for (const tx of transactions || []) {
      const accountId = mappedAccounts[tx.accountId] || tx.accountId;
      const vendorId = mappedVendors[tx.vendorId] || tx.vendorId;
      const categoryId = mappedCategories[tx.categoryId] || tx.categoryId;

      if (!accountId) continue;

      await this.createTransaction(tenantId, {
        ...tx,
        accountId,
        vendorId: vendorId || null,
        categoryId: categoryId || null,
        skipSourceIdempotency: true
      }, actorUserId);

      createdCount++;
    }

    return { success: true, createdCount, newAccounts: (accountsToCreate || []).length, newVendors: (vendorsToCreate || []).length, newCategories: (categoriesToCreate || []).length };
  }


  async deleteTransaction(id: string, tenantId: string, actorUserId?: string) {
    const existing = await db().bookkeepingTransaction.findUnique({ where: { id, tenantId } });
    if (!existing) throw new Error('Transaction not found');
    if (isReconciled(existing)) {
      throw new BadRequestError('Unreconcile this transaction before deleting it.', ErrorCodes.INVALID_INPUT);
    }
    if (existing.sourceType && existing.sourceType !== 'MANUAL') {
      throw new BadRequestError('Synced transactions cannot be deleted. Void the transaction or update its source record instead.', ErrorCodes.INVALID_INPUT);
    }

    if (existing.accountId && existing.status === 'POSTED') await this.applyTransactionBalance(existing, -1);

    await db().bookkeepingTransaction.delete({ where: { id, tenantId } });
    activityLogger.log({
      tenantId,
      entityType: 'BookkeepingTransaction',
      entityId: id,
      action: 'DELETE',
      module: 'bookkeeping',
      description: `Deleted manual bookkeeping transaction "${existing.description}"`,
      userId: actorUserId,
      metadata: { amount: serializeMoney(existing.amount), type: existing.type },
    });
    return { success: true };
  }

  async bulkDeleteTransactions(ids: string[], tenantId: string, actorUserId?: string) {
    let deletedCount = 0;
    const skipped: Array<{ id: string; reason: string }> = [];
    for (const id of ids) {
      try {
        await this.deleteTransaction(id, tenantId, actorUserId);
        deletedCount++;
      } catch (err: any) {
        skipped.push({ id, reason: err?.message || 'Delete failed' });
      }
    }
    return { success: skipped.length === 0, deletedCount, skippedCount: skipped.length, skipped };
  }

  private async getImportStats(tenantId: string) {
    try {
      const [activeSessions, totalRawTxs, rawStatusCounts, importedFiles, transferCount] = await Promise.all([
        db().importSession.count({ where: { tenantId, status: { in: ['DRAFT', 'PROCESSING', 'REVIEW'] } } }).catch(() => 0),
        db().rawTransaction.count({ where: { tenantId } }).catch(() => 0),
        db().rawTransaction.groupBy({ by: ['status'], where: { tenantId }, _count: true }).catch(() => []),
        db().uploadedFile.count({ where: { tenantId } }).catch(() => 0),
        db().bookkeepingTransaction.count({ where: { tenantId, isTransfer: true } }).catch(() => 0),
      ]);

      const statusMap: Record<string, number> = {};
      for (const s of rawStatusCounts) statusMap[s.status] = s._count;

      const categorized = (statusMap['CATEGORIZED'] || 0) + (statusMap['MATCHED'] || 0) + (statusMap['FINALIZED'] || 0);
      const aiCategorizedPercent = totalRawTxs > 0 ? Math.round((categorized / totalRawTxs) * 100) : 0;

      return {
        pendingMatches: statusMap['PENDING_MATCH'] || statusMap['MATCHED'] || 0,
        internalTransfers: transferCount,
        aiCategorizedPercent,
        needsReview: statusMap['NEEDS_REVIEW'] || 0,
        duplicateTransactions: statusMap['SKIPPED'] || 0,
        creditCardRepayments: 0, // will be computed from transfer data in future
        importedFiles,
        activeSessions,
      };
    } catch {
      return {
        pendingMatches: 0, internalTransfers: 0, aiCategorizedPercent: 0,
        needsReview: 0, duplicateTransactions: 0, creditCardRepayments: 0,
        importedFiles: 0, activeSessions: 0,
      };
    }
  }
}

export const bookkeepingService = new BookkeepingService();
