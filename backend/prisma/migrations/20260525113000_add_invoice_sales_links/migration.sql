ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "contactId" TEXT;
ALTER TABLE "Invoice" ADD COLUMN IF NOT EXISTS "contractId" TEXT;

ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_contactId_fkey";
ALTER TABLE "Invoice" DROP CONSTRAINT IF EXISTS "Invoice_contractId_fkey";

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contactId_fkey"
  FOREIGN KEY ("contactId") REFERENCES "Contact"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "Invoice" ADD CONSTRAINT "Invoice_contractId_fkey"
  FOREIGN KEY ("contractId") REFERENCES "Contract"("id")
  ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX IF NOT EXISTS "Invoice_contactId_idx" ON "Invoice"("contactId");
CREATE INDEX IF NOT EXISTS "Invoice_contractId_idx" ON "Invoice"("contractId");
