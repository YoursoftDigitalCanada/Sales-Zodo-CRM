-- Sales CRM automation rules, runs, and reminder schedules.

CREATE TABLE "SalesAutomationRule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "name" TEXT NOT NULL,
  "description" TEXT,
  "triggerType" TEXT NOT NULL,
  "conditions" JSONB NOT NULL DEFAULT '{}',
  "actions" JSONB NOT NULL DEFAULT '[]',
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "priority" INTEGER NOT NULL DEFAULT 100,
  "runOncePerEntity" BOOLEAN NOT NULL DEFAULT false,
  "createdById" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesAutomationRule_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesAutomationRun" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "ruleId" TEXT,
  "triggerType" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "startedAt" TIMESTAMP(3),
  "finishedAt" TIMESTAMP(3),
  "error" TEXT,
  "input" JSONB NOT NULL DEFAULT '{}',
  "output" JSONB NOT NULL DEFAULT '{}',
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "SalesAutomationRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "SalesReminderSchedule" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "entityType" TEXT NOT NULL,
  "entityId" TEXT NOT NULL,
  "reminderType" TEXT NOT NULL,
  "scheduledFor" TIMESTAMP(3) NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'SCHEDULED',
  "channel" TEXT NOT NULL DEFAULT 'NOTIFICATION',
  "payload" JSONB NOT NULL DEFAULT '{}',
  "sentAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,
  CONSTRAINT "SalesReminderSchedule_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "SalesAutomationRule_tenantId_idx" ON "SalesAutomationRule"("tenantId");
CREATE INDEX "SalesAutomationRule_triggerType_idx" ON "SalesAutomationRule"("triggerType");
CREATE INDEX "SalesAutomationRule_tenantId_triggerType_idx" ON "SalesAutomationRule"("tenantId", "triggerType");

CREATE INDEX "SalesAutomationRun_tenantId_idx" ON "SalesAutomationRun"("tenantId");
CREATE INDEX "SalesAutomationRun_ruleId_idx" ON "SalesAutomationRun"("ruleId");
CREATE INDEX "SalesAutomationRun_triggerType_idx" ON "SalesAutomationRun"("triggerType");
CREATE INDEX "SalesAutomationRun_entityType_entityId_idx" ON "SalesAutomationRun"("entityType", "entityId");
CREATE INDEX "SalesAutomationRun_tenantId_entityType_entityId_idx" ON "SalesAutomationRun"("tenantId", "entityType", "entityId");

CREATE INDEX "SalesReminderSchedule_tenantId_idx" ON "SalesReminderSchedule"("tenantId");
CREATE INDEX "SalesReminderSchedule_entityType_entityId_idx" ON "SalesReminderSchedule"("entityType", "entityId");
CREATE INDEX "SalesReminderSchedule_scheduledFor_idx" ON "SalesReminderSchedule"("scheduledFor");
CREATE INDEX "SalesReminderSchedule_status_idx" ON "SalesReminderSchedule"("status");
CREATE INDEX "SalesReminderSchedule_tenantId_scheduledFor_status_idx" ON "SalesReminderSchedule"("tenantId", "scheduledFor", "status");
CREATE INDEX "SalesReminderSchedule_tenantId_entityType_entityId_idx" ON "SalesReminderSchedule"("tenantId", "entityType", "entityId");
CREATE UNIQUE INDEX "SalesReminderSchedule_tenantId_entityType_entityId_reminderType_channel_key" ON "SalesReminderSchedule"("tenantId", "entityType", "entityId", "reminderType", "channel");
