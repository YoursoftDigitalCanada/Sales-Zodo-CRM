-- Sales CRM SaaS billing additions
ALTER TABLE "CustomerSubscription"
  ADD COLUMN IF NOT EXISTS "subscriptionNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "contactId" TEXT,
  ADD COLUMN IF NOT EXISTS "quoteId" TEXT,
  ADD COLUMN IF NOT EXISTS "pricingPlanId" TEXT,
  ADD COLUMN IF NOT EXISTS "seats" INTEGER NOT NULL DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "setupFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "discountAmount" DECIMAL(15,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "taxRate" DECIMAL(5,2) NOT NULL DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "paymentTerms" TEXT,
  ADD COLUMN IF NOT EXISTS "ownerId" TEXT,
  ADD COLUMN IF NOT EXISTS "pausedAt" TIMESTAMP(3);

ALTER TABLE "InvoicePayment"
  ADD COLUMN IF NOT EXISTS "paymentNumber" TEXT,
  ADD COLUMN IF NOT EXISTS "subscriptionId" TEXT,
  ADD COLUMN IF NOT EXISTS "status" TEXT NOT NULL DEFAULT 'SUCCESSFUL';

CREATE TABLE IF NOT EXISTS "PricingPlan" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "planName" TEXT NOT NULL,
  "monthlyPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "annualPrice" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "setupFee" DECIMAL(15,2) NOT NULL DEFAULT 0,
  "seatLimit" INTEGER,
  "includedFeatures" TEXT[] NOT NULL DEFAULT ARRAY[]::TEXT[],
  "isActive" BOOLEAN NOT NULL DEFAULT true,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "PricingPlan_pkey" PRIMARY KEY ("id")
);

CREATE UNIQUE INDEX IF NOT EXISTS "CustomerSubscription_tenantId_subscriptionNumber_key" ON "CustomerSubscription"("tenantId", "subscriptionNumber");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_contactId_idx" ON "CustomerSubscription"("contactId");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_quoteId_idx" ON "CustomerSubscription"("quoteId");
CREATE INDEX IF NOT EXISTS "CustomerSubscription_pricingPlanId_idx" ON "CustomerSubscription"("pricingPlanId");
CREATE UNIQUE INDEX IF NOT EXISTS "PricingPlan_tenantId_planName_key" ON "PricingPlan"("tenantId", "planName");
CREATE INDEX IF NOT EXISTS "PricingPlan_tenantId_idx" ON "PricingPlan"("tenantId");
CREATE INDEX IF NOT EXISTS "PricingPlan_isActive_idx" ON "PricingPlan"("isActive");
CREATE UNIQUE INDEX IF NOT EXISTS "InvoicePayment_tenantId_paymentNumber_key" ON "InvoicePayment"("tenantId", "paymentNumber");
CREATE INDEX IF NOT EXISTS "InvoicePayment_subscriptionId_idx" ON "InvoicePayment"("subscriptionId");
CREATE INDEX IF NOT EXISTS "InvoicePayment_status_idx" ON "InvoicePayment"("status");

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'PricingPlan_tenantId_fkey'
  ) THEN
    ALTER TABLE "PricingPlan"
      ADD CONSTRAINT "PricingPlan_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;
END $$;
