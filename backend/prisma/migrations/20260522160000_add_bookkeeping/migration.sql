CREATE TABLE "BookkeepingAccount" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "code" TEXT,
  "type" TEXT NOT NULL,
  "subtype" TEXT,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "openingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "currentBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "institutionName" TEXT,
  "accountNumberLast4" TEXT,
  "isBankAccount" BOOLEAN NOT NULL DEFAULT false,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingAccount_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingCategory" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "accountId" TEXT,
  "color" TEXT,
  "isSystem" BOOLEAN NOT NULL DEFAULT false,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingCategory_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingVendor" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "email" TEXT,
  "phone" TEXT,
  "website" TEXT,
  "address" TEXT,
  "taxId" TEXT,
  "notes" TEXT,
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingVendor_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingTransaction" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "transactionNumber" TEXT,
  "accountId" TEXT,
  "categoryId" TEXT,
  "vendorId" TEXT,
  "type" TEXT NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "description" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "transactionDate" TIMESTAMP(3) NOT NULL,
  "paymentMethod" TEXT,
  "reference" TEXT,
  "clientId" TEXT,
  "projectId" TEXT,
  "invoiceId" TEXT,
  "expenseId" TEXT,
  "fileId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'POSTED',
  "isReconciled" BOOLEAN NOT NULL DEFAULT false,
  "reconciledAt" TIMESTAMP(3),
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingTransaction_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingTransfer" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "fromAccountId" TEXT NOT NULL,
  "toAccountId" TEXT NOT NULL,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "transferDate" TIMESTAMP(3) NOT NULL,
  "reference" TEXT,
  "notes" TEXT,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingTransfer_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingJournalEntry" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entryNumber" TEXT NOT NULL,
  "description" TEXT NOT NULL,
  "entryDate" TIMESTAMP(3) NOT NULL,
  "sourceType" TEXT,
  "sourceId" TEXT,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "createdById" TEXT,
  "postedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingJournalEntry_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingJournalLine" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "journalEntryId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "debit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "credit" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "description" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "BookkeepingJournalLine_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingReconciliation" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "accountId" TEXT NOT NULL,
  "statementDate" TIMESTAMP(3) NOT NULL,
  "statementStartingBalance" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "statementEndingBalance" DECIMAL(15,2) NOT NULL,
  "systemEndingBalance" DECIMAL(15,2) NOT NULL,
  "difference" DECIMAL(15,2) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "reconciledAt" TIMESTAMP(3),
  "reconciledById" TEXT,
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingReconciliation_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "BookkeepingRecurringRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "type" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "amount" DECIMAL(15,2) NOT NULL,
  "currency" TEXT NOT NULL DEFAULT 'CAD',
  "accountId" TEXT,
  "categoryId" TEXT,
  "vendorId" TEXT,
  "clientId" TEXT,
  "projectId" TEXT,
  "frequency" TEXT NOT NULL,
  "nextRunAt" TIMESTAMP(3) NOT NULL,
  "endAt" TIMESTAMP(3),
  "lastRunAt" TIMESTAMP(3),
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "metadata" JSONB NOT NULL DEFAULT '{}',
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "BookkeepingRecurringRule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "BookkeepingAccount_tenantId_idx" ON "BookkeepingAccount"("tenantId");
CREATE INDEX "BookkeepingAccount_type_idx" ON "BookkeepingAccount"("type");
CREATE INDEX "BookkeepingAccount_isActive_idx" ON "BookkeepingAccount"("isActive");
CREATE UNIQUE INDEX "BookkeepingAccount_tenantId_name_key" ON "BookkeepingAccount"("tenantId", "name");

CREATE INDEX "BookkeepingCategory_tenantId_idx" ON "BookkeepingCategory"("tenantId");
CREATE INDEX "BookkeepingCategory_accountId_idx" ON "BookkeepingCategory"("accountId");
CREATE INDEX "BookkeepingCategory_type_idx" ON "BookkeepingCategory"("type");
CREATE UNIQUE INDEX "BookkeepingCategory_tenantId_name_type_key" ON "BookkeepingCategory"("tenantId", "name", "type");

CREATE INDEX "BookkeepingVendor_tenantId_idx" ON "BookkeepingVendor"("tenantId");
CREATE INDEX "BookkeepingVendor_isActive_idx" ON "BookkeepingVendor"("isActive");
CREATE UNIQUE INDEX "BookkeepingVendor_tenantId_name_key" ON "BookkeepingVendor"("tenantId", "name");

CREATE INDEX "BookkeepingTransaction_tenantId_idx" ON "BookkeepingTransaction"("tenantId");
CREATE INDEX "BookkeepingTransaction_accountId_idx" ON "BookkeepingTransaction"("accountId");
CREATE INDEX "BookkeepingTransaction_categoryId_idx" ON "BookkeepingTransaction"("categoryId");
CREATE INDEX "BookkeepingTransaction_vendorId_idx" ON "BookkeepingTransaction"("vendorId");
CREATE INDEX "BookkeepingTransaction_sourceType_sourceId_idx" ON "BookkeepingTransaction"("sourceType", "sourceId");
CREATE INDEX "BookkeepingTransaction_transactionDate_idx" ON "BookkeepingTransaction"("transactionDate");
CREATE INDEX "BookkeepingTransaction_tenantId_transactionDate_idx" ON "BookkeepingTransaction"("tenantId", "transactionDate");
CREATE INDEX "BookkeepingTransaction_tenantId_type_idx" ON "BookkeepingTransaction"("tenantId", "type");
CREATE INDEX "BookkeepingTransaction_tenantId_status_idx" ON "BookkeepingTransaction"("tenantId", "status");
CREATE UNIQUE INDEX "BookkeepingTransaction_tenantId_transactionNumber_key" ON "BookkeepingTransaction"("tenantId", "transactionNumber");
CREATE UNIQUE INDEX "BookkeepingTransaction_tenantId_sourceType_sourceId_key" ON "BookkeepingTransaction"("tenantId", "sourceType", "sourceId");

CREATE INDEX "BookkeepingTransfer_tenantId_idx" ON "BookkeepingTransfer"("tenantId");
CREATE INDEX "BookkeepingTransfer_fromAccountId_idx" ON "BookkeepingTransfer"("fromAccountId");
CREATE INDEX "BookkeepingTransfer_toAccountId_idx" ON "BookkeepingTransfer"("toAccountId");

CREATE INDEX "BookkeepingJournalEntry_tenantId_idx" ON "BookkeepingJournalEntry"("tenantId");
CREATE INDEX "BookkeepingJournalEntry_sourceType_sourceId_idx" ON "BookkeepingJournalEntry"("sourceType", "sourceId");
CREATE UNIQUE INDEX "BookkeepingJournalEntry_tenantId_entryNumber_key" ON "BookkeepingJournalEntry"("tenantId", "entryNumber");

CREATE INDEX "BookkeepingJournalLine_tenantId_idx" ON "BookkeepingJournalLine"("tenantId");
CREATE INDEX "BookkeepingJournalLine_journalEntryId_idx" ON "BookkeepingJournalLine"("journalEntryId");
CREATE INDEX "BookkeepingJournalLine_accountId_idx" ON "BookkeepingJournalLine"("accountId");

CREATE INDEX "BookkeepingReconciliation_tenantId_idx" ON "BookkeepingReconciliation"("tenantId");
CREATE INDEX "BookkeepingReconciliation_accountId_idx" ON "BookkeepingReconciliation"("accountId");

CREATE INDEX "BookkeepingRecurringRule_tenantId_idx" ON "BookkeepingRecurringRule"("tenantId");
CREATE INDEX "BookkeepingRecurringRule_accountId_idx" ON "BookkeepingRecurringRule"("accountId");
CREATE INDEX "BookkeepingRecurringRule_categoryId_idx" ON "BookkeepingRecurringRule"("categoryId");
CREATE INDEX "BookkeepingRecurringRule_vendorId_idx" ON "BookkeepingRecurringRule"("vendorId");
CREATE INDEX "BookkeepingRecurringRule_nextRunAt_idx" ON "BookkeepingRecurringRule"("nextRunAt");

ALTER TABLE "BookkeepingAccount" ADD CONSTRAINT "BookkeepingAccount_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingCategory" ADD CONSTRAINT "BookkeepingCategory_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingVendor" ADD CONSTRAINT "BookkeepingVendor_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingTransaction" ADD CONSTRAINT "BookkeepingTransaction_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingTransfer" ADD CONSTRAINT "BookkeepingTransfer_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingJournalEntry" ADD CONSTRAINT "BookkeepingJournalEntry_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingJournalLine" ADD CONSTRAINT "BookkeepingJournalLine_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingJournalLine" ADD CONSTRAINT "BookkeepingJournalLine_journalEntryId_fkey" FOREIGN KEY ("journalEntryId") REFERENCES "BookkeepingJournalEntry"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingReconciliation" ADD CONSTRAINT "BookkeepingReconciliation_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "BookkeepingRecurringRule" ADD CONSTRAINT "BookkeepingRecurringRule_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
