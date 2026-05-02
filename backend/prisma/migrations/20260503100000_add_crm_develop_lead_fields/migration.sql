ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "salutation" TEXT,
  ADD COLUMN IF NOT EXISTS "middleName" TEXT,
  ADD COLUMN IF NOT EXISTS "gender" TEXT,
  ADD COLUMN IF NOT EXISTS "mobileNo" TEXT,
  ADD COLUMN IF NOT EXISTS "organization" TEXT,
  ADD COLUMN IF NOT EXISTS "territory" TEXT,
  ADD COLUMN IF NOT EXISTS "annualRevenue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "converted" BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS "facebookLeadId" TEXT,
  ADD COLUMN IF NOT EXISTS "facebookFormId" TEXT,
  ADD COLUMN IF NOT EXISTS "lostReason" TEXT,
  ADD COLUMN IF NOT EXISTS "lostNotes" TEXT;

UPDATE "Lead"
SET "organization" = COALESCE("organization", "companyName"),
    "mobileNo" = COALESCE("mobileNo", "phone"),
    "converted" = CASE WHEN "convertedAt" IS NOT NULL THEN true ELSE "converted" END;
