ALTER TABLE "Client"
  ADD COLUMN IF NOT EXISTS "website" TEXT,
  ADD COLUMN IF NOT EXISTS "noOfEmployees" TEXT,
  ADD COLUMN IF NOT EXISTS "annualRevenue" DECIMAL(15, 2),
  ADD COLUMN IF NOT EXISTS "exchangeRate" DOUBLE PRECISION DEFAULT 1,
  ADD COLUMN IF NOT EXISTS "industry" TEXT,
  ADD COLUMN IF NOT EXISTS "territory" TEXT,
  ADD COLUMN IF NOT EXISTS "organizationAddress" TEXT;

UPDATE "Client"
SET "annualRevenue" = COALESCE("annualRevenue", "totalRevenue"),
    "organizationAddress" = COALESCE(
      "organizationAddress",
      NULLIF(
        concat_ws(', ', NULLIF("streetAddress", ''), NULLIF("city", ''), NULLIF("province", ''), NULLIF("postalCode", ''), NULLIF("country", '')),
        ''
      )
    ),
    "exchangeRate" = COALESCE("exchangeRate", 1)
WHERE "annualRevenue" IS NULL
   OR "organizationAddress" IS NULL
   OR "exchangeRate" IS NULL;

CREATE INDEX IF NOT EXISTS "Client_industry_idx" ON "Client"("industry");
CREATE INDEX IF NOT EXISTS "Client_territory_idx" ON "Client"("territory");
CREATE INDEX IF NOT EXISTS "Client_noOfEmployees_idx" ON "Client"("noOfEmployees");
