CREATE TABLE IF NOT EXISTS "CustomerSubscription" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "clientId" TEXT NOT NULL,
  "projectId" TEXT,
  "invoiceId" TEXT,
  "planName" TEXT NOT NULL DEFAULT 'Roofer CRM',
  "billingCycle" TEXT NOT NULL DEFAULT 'MONTHLY',
  "status" TEXT NOT NULL DEFAULT 'PENDING',
  "mrr" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "arr" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "startDate" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "renewalDate" TIMESTAMP(3) NOT NULL,
  "activatedAt" TIMESTAMP(3),
  "cancelledAt" TIMESTAMP(3),
  "notes" TEXT,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "CustomerSubscription_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerSubscription_tenantId_fkey'
  ) THEN
    ALTER TABLE "CustomerSubscription"
      ADD CONSTRAINT "CustomerSubscription_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerSubscription_clientId_fkey'
  ) THEN
    ALTER TABLE "CustomerSubscription"
      ADD CONSTRAINT "CustomerSubscription_clientId_fkey"
      FOREIGN KEY ("clientId") REFERENCES "Client"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerSubscription_projectId_fkey'
  ) THEN
    ALTER TABLE "CustomerSubscription"
      ADD CONSTRAINT "CustomerSubscription_projectId_fkey"
      FOREIGN KEY ("projectId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'CustomerSubscription_tenantId_clientId_projectId_key'
  ) THEN
    ALTER TABLE "CustomerSubscription"
      ADD CONSTRAINT "CustomerSubscription_tenantId_clientId_projectId_key"
      UNIQUE ("tenantId", "clientId", "projectId");
  END IF;
END $$;

CREATE INDEX IF NOT EXISTS "CustomerSubscription_tenantId_idx" ON "CustomerSubscription"("tenantId");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_clientId_idx" ON "CustomerSubscription"("clientId");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_projectId_idx" ON "CustomerSubscription"("projectId");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_invoiceId_idx" ON "CustomerSubscription"("invoiceId");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_status_idx" ON "CustomerSubscription"("status");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_renewalDate_idx" ON "CustomerSubscription"("renewalDate");
