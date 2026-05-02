ALTER TABLE "Project"
  ADD COLUMN IF NOT EXISTS "organization" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationName" TEXT,
  ADD COLUMN IF NOT EXISTS "nextStep" TEXT,
  ADD COLUMN IF NOT EXISTS "dealStatus" TEXT DEFAULT 'Qualification',
  ADD COLUMN IF NOT EXISTS "dealOwnerId" TEXT,
  ADD COLUMN IF NOT EXISTS "probability" DECIMAL(5, 2),
  ADD COLUMN IF NOT EXISTS "expectedDealValue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "dealValue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "expectedClosureDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "closedDate" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "sourceId" TEXT,
  ADD COLUMN IF NOT EXISTS "leadName" TEXT,
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "noOfEmployees" TEXT,
  ADD COLUMN IF NOT EXISTS "jobTitle" TEXT,
  ADD COLUMN IF NOT EXISTS "territory" TEXT,
  ADD COLUMN IF NOT EXISTS "exchangeRate" DECIMAL(12, 6) DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "annualRevenue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "salutation" TEXT,
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "email" TEXT,
  ADD COLUMN IF NOT EXISTS "mobileNo" TEXT,
  ADD COLUMN IF NOT EXISTS "phone" TEXT,
  ADD COLUMN IF NOT EXISTS "gender" TEXT,
  ADD COLUMN IF NOT EXISTS "contactId" TEXT,
  ADD COLUMN IF NOT EXISTS "total" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "netTotal" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "lostReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lostNotes" TEXT;

UPDATE "Project"
SET "organization" = COALESCE("organization", "name"),
    "organizationName" = COALESCE("organizationName", "name"),
    "dealValue" = COALESCE("dealValue", "contractValue", "budget"),
    "expectedDealValue" = COALESCE("expectedDealValue", "contractValue", "budget"),
    "expectedClosureDate" = COALESCE("expectedClosureDate", "estimatedEndDate"),
    "closedDate" = CASE WHEN "status" IN ('COMPLETED', 'CANCELLED') THEN COALESCE("closedDate", "actualEndDate", "updatedAt") ELSE "closedDate" END,
    "dealStatus" = COALESCE(
      "dealStatus",
      CASE
        WHEN "status" = 'COMPLETED' THEN 'Won'
        WHEN "status" = 'CANCELLED' THEN 'Lost'
        WHEN "status" IN ('ACTIVE', 'IN_PROGRESS', 'APPROVED', 'SCHEDULED') THEN 'Negotiation'
        ELSE 'Qualification'
      END
    ),
    "probability" = COALESCE(
      "probability",
      CASE
        WHEN "status" = 'COMPLETED' THEN 100
        WHEN "status" = 'CANCELLED' THEN 0
        WHEN "status" IN ('ACTIVE', 'IN_PROGRESS', 'APPROVED', 'SCHEDULED') THEN 60
        ELSE 25
      END
    );

CREATE INDEX IF NOT EXISTS "Project_dealStatus_idx" ON "Project"("dealStatus");
CREATE INDEX IF NOT EXISTS "Project_dealOwnerId_idx" ON "Project"("dealOwnerId");
CREATE INDEX IF NOT EXISTS "Project_sourceId_idx" ON "Project"("sourceId");
CREATE INDEX IF NOT EXISTS "Project_expectedClosureDate_idx" ON "Project"("expectedClosureDate");
