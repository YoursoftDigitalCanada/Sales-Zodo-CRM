-- Add atomic processing claim metadata for sales automation reminders.
ALTER TABLE "SalesReminderSchedule"
  ADD COLUMN "claimedAt" TIMESTAMP(3),
  ADD COLUMN "claimedBy" TEXT,
  ADD COLUMN "processingStartedAt" TIMESTAMP(3),
  ADD COLUMN "lastError" TEXT,
  ADD COLUMN "attemptCount" INTEGER NOT NULL DEFAULT 0;

CREATE INDEX "SalesReminderSchedule_processingStartedAt_idx" ON "SalesReminderSchedule"("processingStartedAt");
CREATE INDEX "SalesReminderSchedule_tenantId_status_processingStartedAt_idx" ON "SalesReminderSchedule"("tenantId", "status", "processingStartedAt");
