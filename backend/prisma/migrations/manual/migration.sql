-- AI-Native Bookkeeping Engine Migration
-- Adds new columns to existing tables and creates 4 new tables

-- ============================================================================
-- 1. Add new columns to BookkeepingTransaction
-- ============================================================================
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "hash" TEXT;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "confidenceScore" DOUBLE PRECISION;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "isTransfer" BOOLEAN NOT NULL DEFAULT false;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "matchedTransactionId" TEXT;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "journalEntryId" TEXT;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "importSessionId" TEXT;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "uploadedFileId" TEXT;
ALTER TABLE "BookkeepingTransaction" ADD COLUMN IF NOT EXISTS "rawTransactionId" TEXT;

-- Indexes for BookkeepingTransaction
CREATE INDEX IF NOT EXISTS "BookkeepingTransaction_hash_idx" ON "BookkeepingTransaction"("hash");
CREATE INDEX IF NOT EXISTS "BookkeepingTransaction_importSessionId_idx" ON "BookkeepingTransaction"("importSessionId");
CREATE INDEX IF NOT EXISTS "BookkeepingTransaction_isTransfer_idx" ON "BookkeepingTransaction"("isTransfer");
CREATE UNIQUE INDEX IF NOT EXISTS "BookkeepingTransaction_rawTransactionId_key" ON "BookkeepingTransaction"("rawTransactionId");

-- ============================================================================
-- 2. Add creditLimit to BookkeepingAccount
-- ============================================================================
ALTER TABLE "BookkeepingAccount" ADD COLUMN IF NOT EXISTS "creditLimit" DECIMAL(15,2);

-- ============================================================================
-- 3. Create ImportSession table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "ImportSession" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'DRAFT',
    "name" TEXT,
    "notes" TEXT,
    "totalFiles" INTEGER NOT NULL DEFAULT 0,
    "totalRawTx" INTEGER NOT NULL DEFAULT 0,
    "totalCreated" INTEGER NOT NULL DEFAULT 0,
    "totalSkipped" INTEGER NOT NULL DEFAULT 0,
    "totalDupes" INTEGER NOT NULL DEFAULT 0,
    "createdById" TEXT,
    "completedAt" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "ImportSession_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "ImportSession" ADD CONSTRAINT "ImportSession_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "ImportSession_tenantId_idx" ON "ImportSession"("tenantId");
CREATE INDEX IF NOT EXISTS "ImportSession_status_idx" ON "ImportSession"("status");
CREATE INDEX IF NOT EXISTS "ImportSession_tenantId_status_idx" ON "ImportSession"("tenantId", "status");

-- ============================================================================
-- 4. Create UploadedFile table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "UploadedFile" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "accountId" TEXT,
    "fileName" TEXT NOT NULL,
    "originalName" TEXT NOT NULL,
    "provider" TEXT,
    "statementStart" TIMESTAMP(3),
    "statementEnd" TIMESTAMP(3),
    "checksum" TEXT NOT NULL,
    "rowCount" INTEGER NOT NULL DEFAULT 0,
    "processedCount" INTEGER NOT NULL DEFAULT 0,
    "duplicateCount" INTEGER NOT NULL DEFAULT 0,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "errorMessage" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "UploadedFile_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "UploadedFile" ADD CONSTRAINT "UploadedFile_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "UploadedFile_tenantId_idx" ON "UploadedFile"("tenantId");
CREATE INDEX IF NOT EXISTS "UploadedFile_sessionId_idx" ON "UploadedFile"("sessionId");
CREATE INDEX IF NOT EXISTS "UploadedFile_checksum_idx" ON "UploadedFile"("checksum");
CREATE UNIQUE INDEX IF NOT EXISTS "UploadedFile_tenantId_checksum_key" ON "UploadedFile"("tenantId", "checksum");

-- ============================================================================
-- 5. Create RawTransaction table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "RawTransaction" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "uploadedFileId" TEXT NOT NULL,
    "originalRow" JSONB NOT NULL,
    "normalizedData" JSONB NOT NULL,
    "hash" TEXT NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'PENDING',
    "transactionId" TEXT,
    "aiCategory" TEXT,
    "aiVendor" TEXT,
    "aiConfidence" DOUBLE PRECISION,
    "aiTransactionType" TEXT,
    "aiReason" TEXT,
    "aiPossibleTransfer" BOOLEAN NOT NULL DEFAULT false,
    "matchedRawTxId" TEXT,
    "isTransfer" BOOLEAN NOT NULL DEFAULT false,
    "isDuplicate" BOOLEAN NOT NULL DEFAULT false,
    "duplicateOfId" TEXT,
    "manualOverrides" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "RawTransaction_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_sessionId_fkey"
    FOREIGN KEY ("sessionId") REFERENCES "ImportSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "RawTransaction" ADD CONSTRAINT "RawTransaction_uploadedFileId_fkey"
    FOREIGN KEY ("uploadedFileId") REFERENCES "UploadedFile"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE UNIQUE INDEX IF NOT EXISTS "RawTransaction_transactionId_key" ON "RawTransaction"("transactionId");
CREATE INDEX IF NOT EXISTS "RawTransaction_tenantId_idx" ON "RawTransaction"("tenantId");
CREATE INDEX IF NOT EXISTS "RawTransaction_sessionId_idx" ON "RawTransaction"("sessionId");
CREATE INDEX IF NOT EXISTS "RawTransaction_uploadedFileId_idx" ON "RawTransaction"("uploadedFileId");
CREATE INDEX IF NOT EXISTS "RawTransaction_hash_idx" ON "RawTransaction"("hash");
CREATE INDEX IF NOT EXISTS "RawTransaction_status_idx" ON "RawTransaction"("status");
CREATE INDEX IF NOT EXISTS "RawTransaction_tenantId_hash_idx" ON "RawTransaction"("tenantId", "hash");

-- ============================================================================
-- 6. Create BookkeepingAuditLog table
-- ============================================================================
CREATE TABLE IF NOT EXISTS "BookkeepingAuditLog" (
    "id" TEXT NOT NULL DEFAULT gen_random_uuid(),
    "tenantId" TEXT NOT NULL,
    "entityType" TEXT NOT NULL,
    "entityId" TEXT NOT NULL,
    "action" TEXT NOT NULL,
    "beforeValue" JSONB,
    "afterValue" JSONB,
    "aiResponse" JSONB,
    "userId" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "BookkeepingAuditLog_pkey" PRIMARY KEY ("id")
);

ALTER TABLE "BookkeepingAuditLog" ADD CONSTRAINT "BookkeepingAuditLog_tenantId_fkey"
    FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "BookkeepingAuditLog_tenantId_idx" ON "BookkeepingAuditLog"("tenantId");
CREATE INDEX IF NOT EXISTS "BookkeepingAuditLog_entityType_entityId_idx" ON "BookkeepingAuditLog"("entityType", "entityId");
CREATE INDEX IF NOT EXISTS "BookkeepingAuditLog_tenantId_entityType_idx" ON "BookkeepingAuditLog"("tenantId", "entityType");
CREATE INDEX IF NOT EXISTS "BookkeepingAuditLog_createdAt_idx" ON "BookkeepingAuditLog"("createdAt");

-- Done!
SELECT 'Migration complete: AI-Native Bookkeeping Engine' AS result;
