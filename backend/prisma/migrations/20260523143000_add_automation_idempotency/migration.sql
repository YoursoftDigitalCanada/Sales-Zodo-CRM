CREATE TABLE "AutomationIdempotencyKey" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "key" TEXT NOT NULL,
  "eventName" TEXT,
  "entityType" TEXT,
  "entityId" TEXT,
  "actionType" TEXT NOT NULL,
  "status" TEXT NOT NULL DEFAULT 'STARTED',
  "result" JSONB NOT NULL DEFAULT '{}',
  "error" TEXT,
  "completedAt" TIMESTAMP(3),
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL,

  CONSTRAINT "AutomationIdempotencyKey_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "AutomationIdempotencyKey_tenantId_idx" ON "AutomationIdempotencyKey"("tenantId");
CREATE INDEX "AutomationIdempotencyKey_eventName_idx" ON "AutomationIdempotencyKey"("eventName");
CREATE INDEX "AutomationIdempotencyKey_entityType_entityId_idx" ON "AutomationIdempotencyKey"("entityType", "entityId");
CREATE INDEX "AutomationIdempotencyKey_tenantId_entityType_entityId_idx" ON "AutomationIdempotencyKey"("tenantId", "entityType", "entityId");
CREATE UNIQUE INDEX "AutomationIdempotencyKey_tenantId_key_key" ON "AutomationIdempotencyKey"("tenantId", "key");
