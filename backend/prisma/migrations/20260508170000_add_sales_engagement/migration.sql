CREATE TABLE IF NOT EXISTS "EmailTemplate" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "templateName" TEXT NOT NULL,
  "subject" TEXT NOT NULL,
  "body" TEXT NOT NULL,
  "category" TEXT NOT NULL DEFAULT 'Cold Outreach',
  "variables" TEXT[] NOT NULL DEFAULT ARRAY['contactName','companyName','repName','proposalLink','planName']::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "EmailTemplate_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesSequence" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sequenceName" TEXT NOT NULL,
  "targetType" TEXT NOT NULL DEFAULT 'Lead',
  "status" TEXT NOT NULL DEFAULT 'DRAFT',
  "steps" JSONB NOT NULL DEFAULT '[]',
  "ownerId" TEXT,
  "startDate" TIMESTAMP(3),
  "stopCondition" TEXT NOT NULL DEFAULT 'reply received',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesSequence_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesSequenceEnrollment" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "sequenceId" TEXT NOT NULL,
  "targetType" TEXT NOT NULL,
  "targetId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'ACTIVE',
  "currentStep" INTEGER NOT NULL DEFAULT 0,
  "startedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "stoppedAt" TIMESTAMP(3),
  "stopReason" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesSequenceEnrollment_pkey" PRIMARY KEY ("id")
);

CREATE TABLE IF NOT EXISTS "SalesCall" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "leadId" TEXT,
  "contactId" TEXT,
  "projectId" TEXT,
  "clientId" TEXT,
  "callerId" TEXT,
  "direction" TEXT NOT NULL DEFAULT 'Outbound',
  "outcome" TEXT NOT NULL,
  "duration" INTEGER,
  "callNotes" TEXT,
  "nextAction" TEXT,
  "followUpDate" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesCall_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "EmailTemplate_tenantId_templateName_key" ON "EmailTemplate"("tenantId", "templateName");
CREATE INDEX IF NOT EXISTS "EmailTemplate_tenantId_idx" ON "EmailTemplate"("tenantId");
CREATE INDEX IF NOT EXISTS "EmailTemplate_category_idx" ON "EmailTemplate"("category");
CREATE INDEX IF NOT EXISTS "EmailTemplate_isActive_idx" ON "EmailTemplate"("isActive");

CREATE UNIQUE INDEX IF NOT EXISTS "SalesSequence_tenantId_sequenceName_key" ON "SalesSequence"("tenantId", "sequenceName");
CREATE INDEX IF NOT EXISTS "SalesSequence_tenantId_idx" ON "SalesSequence"("tenantId");
CREATE INDEX IF NOT EXISTS "SalesSequence_status_idx" ON "SalesSequence"("status");
CREATE INDEX IF NOT EXISTS "SalesSequence_targetType_idx" ON "SalesSequence"("targetType");
CREATE INDEX IF NOT EXISTS "SalesSequence_ownerId_idx" ON "SalesSequence"("ownerId");

CREATE UNIQUE INDEX IF NOT EXISTS "SalesSequenceEnrollment_tenantId_sequenceId_targetType_targetId_key" ON "SalesSequenceEnrollment"("tenantId", "sequenceId", "targetType", "targetId");
CREATE INDEX IF NOT EXISTS "SalesSequenceEnrollment_tenantId_idx" ON "SalesSequenceEnrollment"("tenantId");
CREATE INDEX IF NOT EXISTS "SalesSequenceEnrollment_sequenceId_idx" ON "SalesSequenceEnrollment"("sequenceId");
CREATE INDEX IF NOT EXISTS "SalesSequenceEnrollment_targetType_targetId_idx" ON "SalesSequenceEnrollment"("targetType", "targetId");
CREATE INDEX IF NOT EXISTS "SalesSequenceEnrollment_status_idx" ON "SalesSequenceEnrollment"("status");

CREATE INDEX IF NOT EXISTS "SalesCall_tenantId_idx" ON "SalesCall"("tenantId");
CREATE INDEX IF NOT EXISTS "SalesCall_leadId_idx" ON "SalesCall"("leadId");
CREATE INDEX IF NOT EXISTS "SalesCall_contactId_idx" ON "SalesCall"("contactId");
CREATE INDEX IF NOT EXISTS "SalesCall_projectId_idx" ON "SalesCall"("projectId");
CREATE INDEX IF NOT EXISTS "SalesCall_clientId_idx" ON "SalesCall"("clientId");
CREATE INDEX IF NOT EXISTS "SalesCall_callerId_idx" ON "SalesCall"("callerId");
CREATE INDEX IF NOT EXISTS "SalesCall_outcome_idx" ON "SalesCall"("outcome");
CREATE INDEX IF NOT EXISTS "SalesCall_followUpDate_idx" ON "SalesCall"("followUpDate");

ALTER TABLE "EmailTemplate" ADD CONSTRAINT "EmailTemplate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesSequence" ADD CONSTRAINT "SalesSequence_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesSequenceEnrollment" ADD CONSTRAINT "SalesSequenceEnrollment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesSequenceEnrollment" ADD CONSTRAINT "SalesSequenceEnrollment_sequenceId_fkey" FOREIGN KEY ("sequenceId") REFERENCES "SalesSequence"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "SalesCall" ADD CONSTRAINT "SalesCall_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
