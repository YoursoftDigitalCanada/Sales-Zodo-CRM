ALTER TABLE "Lead"
  ADD COLUMN IF NOT EXISTS "convertedToContactId" TEXT,
  ADD COLUMN IF NOT EXISTS "convertedToDealId" TEXT;

ALTER TABLE "Task"
  ADD COLUMN IF NOT EXISTS "leadId" TEXT,
  ADD COLUMN IF NOT EXISTS "referenceDoctype" TEXT,
  ADD COLUMN IF NOT EXISTS "referenceDocname" TEXT;

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lead_convertedToClientId_fkey'
  ) THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_convertedToClientId_fkey"
      FOREIGN KEY ("convertedToClientId") REFERENCES "Client"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lead_convertedToContactId_fkey'
  ) THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_convertedToContactId_fkey"
      FOREIGN KEY ("convertedToContactId") REFERENCES "Contact"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Lead_convertedToDealId_fkey'
  ) THEN
    ALTER TABLE "Lead"
      ADD CONSTRAINT "Lead_convertedToDealId_fkey"
      FOREIGN KEY ("convertedToDealId") REFERENCES "Project"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_constraint WHERE conname = 'Task_leadId_fkey'
  ) THEN
    ALTER TABLE "Task"
      ADD CONSTRAINT "Task_leadId_fkey"
      FOREIGN KEY ("leadId") REFERENCES "Lead"("id")
      ON DELETE SET NULL ON UPDATE CASCADE;
  END IF;
END $$;

UPDATE "Lead" l
SET "convertedToDealId" = p."id"
FROM "Project" p
WHERE l."convertedToDealId" IS NULL
  AND p."leadId" = l."id"
  AND p."tenantId" = l."tenantId";

UPDATE "Lead" l
SET "convertedToContactId" = c."id"
FROM "Contact" c
WHERE l."convertedToContactId" IS NULL
  AND l."convertedToClientId" IS NOT NULL
  AND c."companyId" = l."convertedToClientId"
  AND c."tenantId" = l."tenantId"
  AND (
    LOWER(c."email") = LOWER(COALESCE(l."email", ''))
    OR c."contactName" = CONCAT(l."firstName", ' ', l."lastName")
  );

CREATE INDEX IF NOT EXISTS "Lead_convertedToClientId_idx" ON "Lead"("convertedToClientId");
CREATE INDEX IF NOT EXISTS "Lead_convertedToContactId_idx" ON "Lead"("convertedToContactId");
CREATE INDEX IF NOT EXISTS "Lead_convertedToDealId_idx" ON "Lead"("convertedToDealId");
CREATE INDEX IF NOT EXISTS "Task_leadId_idx" ON "Task"("leadId");
CREATE INDEX IF NOT EXISTS "Task_referenceDoctype_referenceDocname_idx" ON "Task"("referenceDoctype", "referenceDocname");
