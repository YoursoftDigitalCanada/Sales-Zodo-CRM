ALTER TABLE "Contact"
  ADD COLUMN IF NOT EXISTS "firstName" TEXT,
  ADD COLUMN IF NOT EXISTS "lastName" TEXT,
  ADD COLUMN IF NOT EXISTS "relationshipStatus" TEXT DEFAULT 'Active',
  ADD COLUMN IF NOT EXISTS "roleInBuyingProcess" TEXT,
  ADD COLUMN IF NOT EXISTS "seniorityLevel" TEXT,
  ADD COLUMN IF NOT EXISTS "buyingAuthorityScore" TEXT,
  ADD COLUMN IF NOT EXISTS "secondaryEmail" TEXT,
  ADD COLUMN IF NOT EXISTS "alternatePhone" TEXT,
  ADD COLUMN IF NOT EXISTS "preferredContactMethod" TEXT,
  ADD COLUMN IF NOT EXISTS "timeZone" TEXT,
  ADD COLUMN IF NOT EXISTS "notes" TEXT,
  ADD COLUMN IF NOT EXISTS "tags" TEXT[] DEFAULT ARRAY[]::TEXT[],
  ADD COLUMN IF NOT EXISTS "assignedToId" TEXT,
  ADD COLUMN IF NOT EXISTS "lastContactedAt" TIMESTAMP(3),
  ADD COLUMN IF NOT EXISTS "totalInteractions" INTEGER DEFAULT 0,
  ADD COLUMN IF NOT EXISTS "lastActivityType" TEXT;

UPDATE "Contact"
SET "firstName" = COALESCE("firstName", NULLIF(split_part("contactName", ' ', 1), '')),
    "lastName" = COALESCE("lastName", NULLIF(trim(substr("contactName", length(split_part("contactName", ' ', 1)) + 1)), '')),
    "alternatePhone" = COALESCE("alternatePhone", "mobilePhone"),
    "lastContactedAt" = COALESCE("lastContactedAt", "updatedAt")
WHERE "firstName" IS NULL
   OR "lastName" IS NULL
   OR "alternatePhone" IS NULL
   OR "lastContactedAt" IS NULL;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Contact_assignedToId_fkey'
  ) THEN
    ALTER TABLE "Contact"
      ADD CONSTRAINT "Contact_assignedToId_fkey"
      FOREIGN KEY ("assignedToId") REFERENCES "Employee"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS "ContactDeal" (
  "id" TEXT NOT NULL,
  "tenantId" TEXT NOT NULL,
  "contactId" TEXT NOT NULL,
  "dealId" TEXT NOT NULL,
  "role" TEXT,
  "isPrimary" BOOLEAN NOT NULL DEFAULT false,
  "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  "updatedAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
  CONSTRAINT "ContactDeal_pkey" PRIMARY KEY ("id")
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactDeal_tenantId_fkey'
  ) THEN
    ALTER TABLE "ContactDeal"
      ADD CONSTRAINT "ContactDeal_tenantId_fkey"
      FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactDeal_contactId_fkey'
  ) THEN
    ALTER TABLE "ContactDeal"
      ADD CONSTRAINT "ContactDeal_contactId_fkey"
      FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactDeal_dealId_fkey'
  ) THEN
    ALTER TABLE "ContactDeal"
      ADD CONSTRAINT "ContactDeal_dealId_fkey"
      FOREIGN KEY ("dealId") REFERENCES "Project"("id")
      ON DELETE CASCADE ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'ContactDeal_contactId_dealId_key'
  ) THEN
    ALTER TABLE "ContactDeal"
      ADD CONSTRAINT "ContactDeal_contactId_dealId_key" UNIQUE ("contactId", "dealId");
  END IF;
END $$;

INSERT INTO "ContactDeal" ("id", "tenantId", "contactId", "dealId", "role", "isPrimary", "createdAt", "updatedAt")
SELECT md5(random()::text || clock_timestamp()::text || p."id" || c."id"),
       p."tenantId",
       c."id",
       p."id",
       'Decision Maker',
       true,
       CURRENT_TIMESTAMP,
       CURRENT_TIMESTAMP
FROM "Project" p
JOIN "Contact" c ON c."id" = p."contactId" AND c."tenantId" = p."tenantId"
ON CONFLICT ("contactId", "dealId") DO NOTHING;

CREATE INDEX IF NOT EXISTS "Contact_assignedToId_idx" ON "Contact"("assignedToId");
CREATE INDEX IF NOT EXISTS "Contact_relationshipStatus_idx" ON "Contact"("relationshipStatus");
CREATE INDEX IF NOT EXISTS "Contact_roleInBuyingProcess_idx" ON "Contact"("roleInBuyingProcess");
CREATE INDEX IF NOT EXISTS "Contact_seniorityLevel_idx" ON "Contact"("seniorityLevel");
CREATE INDEX IF NOT EXISTS "ContactDeal_tenantId_idx" ON "ContactDeal"("tenantId");
CREATE INDEX IF NOT EXISTS "ContactDeal_contactId_idx" ON "ContactDeal"("contactId");
CREATE INDEX IF NOT EXISTS "ContactDeal_dealId_idx" ON "ContactDeal"("dealId");
CREATE INDEX IF NOT EXISTS "ContactDeal_role_idx" ON "ContactDeal"("role");
