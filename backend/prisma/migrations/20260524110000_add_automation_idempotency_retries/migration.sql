-- Track controlled retries for failed automation idempotency keys.
ALTER TABLE "AutomationIdempotencyKey"
  ADD COLUMN "retryCount" INTEGER NOT NULL DEFAULT 0,
  ADD COLUMN "lastRetriedAt" TIMESTAMP(3);

CREATE INDEX "AutomationIdempotencyKey_status_idx" ON "AutomationIdempotencyKey"("status");
CREATE INDEX "AutomationIdempotencyKey_tenantId_status_idx" ON "AutomationIdempotencyKey"("tenantId", "status");
