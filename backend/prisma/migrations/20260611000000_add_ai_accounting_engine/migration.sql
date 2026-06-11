-- AlterTable
ALTER TABLE "InvoiceItem" ALTER COLUMN "tenantId" SET DEFAULT '00000000-0000-0000-0000-000000000000';

-- AlterTable
ALTER TABLE "BookkeepingTransaction" ADD COLUMN     "merchantId" TEXT;

-- AlterTable
ALTER TABLE "RawTransaction" DROP COLUMN "aiPossibleTransfer",
DROP COLUMN "isDuplicate",
DROP COLUMN "isTransfer",
ADD COLUMN     "aiJournal" JSONB,
ADD COLUMN     "aiModelVersion" TEXT,
ADD COLUMN     "aiPromptVersion" TEXT,
ADD COLUMN     "decisionTimestamp" TIMESTAMP(3),
ADD COLUMN     "duplicateMatchedBy" TEXT,
ADD COLUMN     "duplicateReason" TEXT,
ADD COLUMN     "duplicateScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "duplicateVersion" INTEGER NOT NULL DEFAULT 1,
ADD COLUMN     "knowledgeVersion" TEXT,
ADD COLUMN     "matchedAccountId" TEXT,
ADD COLUMN     "merchantConfidence" DOUBLE PRECISION,
ADD COLUMN     "merchantVersion" TEXT,
ADD COLUMN     "requiresReview" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN     "taxTreatment" TEXT,
ADD COLUMN     "transferScore" INTEGER NOT NULL DEFAULT 0,
ADD COLUMN     "transferType" TEXT,
ADD COLUMN     "validationStatus" JSONB,
ADD COLUMN     "validationVersion" TEXT;

-- CreateTable
CREATE TABLE "BookkeepingMerchant" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "canonicalName" TEXT NOT NULL,
    "aliases" JSONB NOT NULL DEFAULT '[]',
    "defaultCategoryId" TEXT,
    "defaultVendorId" TEXT,
    "defaultTaxRule" TEXT,
    "defaultAccountId" TEXT,
    "defaultDepartment" TEXT,
    "defaultProject" TEXT,
    "recurringFrequency" TEXT,
    "averageAmount" DECIMAL(15,2),
    "averageInterval" INTEGER,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "timesSeen" INTEGER NOT NULL DEFAULT 1,
    "lastSeen" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "BookkeepingMerchant_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingAggregate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "version" INTEGER NOT NULL DEFAULT 0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "AccountingAggregate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "AccountingEvent" (
    "id" TEXT NOT NULL,
    "aggregateId" TEXT NOT NULL,
    "aggregateVersion" INTEGER NOT NULL,
    "eventType" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "payload" JSONB NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "causationId" TEXT,
    "correlationId" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "AccountingEvent_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "DashboardProjection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "data" JSONB NOT NULL,
    "lastEventId" TEXT,
    "lastEventTime" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "DashboardProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "LedgerProjection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "accountId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "balance" DECIMAL(15,2) NOT NULL,
    "totalDebits" DECIMAL(15,2) NOT NULL,
    "totalCredits" DECIMAL(15,2) NOT NULL,
    "lastEventId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "LedgerProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "CashFlowProjection" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "month" TEXT NOT NULL,
    "operatingIn" DECIMAL(15,2) NOT NULL,
    "operatingOut" DECIMAL(15,2) NOT NULL,
    "investingIn" DECIMAL(15,2) NOT NULL,
    "investingOut" DECIMAL(15,2) NOT NULL,
    "financingIn" DECIMAL(15,2) NOT NULL,
    "financingOut" DECIMAL(15,2) NOT NULL,
    "netCashFlow" DECIMAL(15,2) NOT NULL,
    "lastEventId" TEXT,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "CashFlowProjection_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "ruleType" TEXT NOT NULL,
    "pattern" TEXT NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantJournalPattern" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "template" JSONB NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 1.0,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantJournalPattern_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantTaxRule" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "taxRate" DOUBLE PRECISION NOT NULL,
    "taxCode" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantTaxRule_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantAlias" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "alias" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "MerchantAlias_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "MerchantStatistics" (
    "id" TEXT NOT NULL,
    "merchantId" TEXT NOT NULL,
    "seenCount" INTEGER NOT NULL DEFAULT 0,
    "totalAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
    "lastSeenAt" TIMESTAMP(3),
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "MerchantStatistics_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "BookkeepingMerchant_tenantId_idx" ON "BookkeepingMerchant"("tenantId");

-- CreateIndex
CREATE INDEX "BookkeepingMerchant_canonicalName_idx" ON "BookkeepingMerchant"("canonicalName");

-- CreateIndex
CREATE UNIQUE INDEX "BookkeepingMerchant_tenantId_canonicalName_key" ON "BookkeepingMerchant"("tenantId", "canonicalName");

-- CreateIndex
CREATE INDEX "AccountingAggregate_tenantId_idx" ON "AccountingAggregate"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingEvent_tenantId_idx" ON "AccountingEvent"("tenantId");

-- CreateIndex
CREATE INDEX "AccountingEvent_correlationId_idx" ON "AccountingEvent"("correlationId");

-- CreateIndex
CREATE INDEX "AccountingEvent_eventType_idx" ON "AccountingEvent"("eventType");

-- CreateIndex
CREATE UNIQUE INDEX "AccountingEvent_aggregateId_aggregateVersion_key" ON "AccountingEvent"("aggregateId", "aggregateVersion");

-- CreateIndex
CREATE UNIQUE INDEX "DashboardProjection_tenantId_key" ON "DashboardProjection"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "LedgerProjection_tenantId_accountId_month_key" ON "LedgerProjection"("tenantId", "accountId", "month");

-- CreateIndex
CREATE UNIQUE INDEX "CashFlowProjection_tenantId_month_key" ON "CashFlowProjection"("tenantId", "month");

-- CreateIndex
CREATE INDEX "MerchantRule_merchantId_idx" ON "MerchantRule"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantJournalPattern_merchantId_idx" ON "MerchantJournalPattern"("merchantId");

-- CreateIndex
CREATE INDEX "MerchantTaxRule_merchantId_idx" ON "MerchantTaxRule"("merchantId");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantAlias_merchantId_alias_key" ON "MerchantAlias"("merchantId", "alias");

-- CreateIndex
CREATE UNIQUE INDEX "MerchantStatistics_merchantId_key" ON "MerchantStatistics"("merchantId");

-- AddForeignKey
ALTER TABLE "BookkeepingMerchant" ADD CONSTRAINT "BookkeepingMerchant_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "BookkeepingTransaction" ADD CONSTRAINT "BookkeepingTransaction_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "BookkeepingMerchant"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingAggregate" ADD CONSTRAINT "AccountingAggregate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEvent" ADD CONSTRAINT "AccountingEvent_aggregateId_fkey" FOREIGN KEY ("aggregateId") REFERENCES "AccountingAggregate"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "AccountingEvent" ADD CONSTRAINT "AccountingEvent_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "DashboardProjection" ADD CONSTRAINT "DashboardProjection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "LedgerProjection" ADD CONSTRAINT "LedgerProjection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "CashFlowProjection" ADD CONSTRAINT "CashFlowProjection_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantRule" ADD CONSTRAINT "MerchantRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "BookkeepingMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantJournalPattern" ADD CONSTRAINT "MerchantJournalPattern_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "BookkeepingMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantTaxRule" ADD CONSTRAINT "MerchantTaxRule_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "BookkeepingMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantAlias" ADD CONSTRAINT "MerchantAlias_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "BookkeepingMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "MerchantStatistics" ADD CONSTRAINT "MerchantStatistics_merchantId_fkey" FOREIGN KEY ("merchantId") REFERENCES "BookkeepingMerchant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

