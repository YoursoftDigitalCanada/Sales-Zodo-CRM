ALTER TABLE "Contract" ADD COLUMN IF NOT EXISTS "contactId" TEXT;

ALTER TABLE "Contract" DROP CONSTRAINT IF EXISTS "Contract_contactId_fkey";

ALTER TABLE "Contract" ADD CONSTRAINT "Contract_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Contract_contactId_idx" ON "Contract"("contactId");
