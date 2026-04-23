ALTER TABLE "LeadInspection"
DROP CONSTRAINT "LeadInspection_leadId_fkey";

ALTER TABLE "LeadInspection"
ALTER COLUMN "leadId" DROP NOT NULL,
ADD COLUMN "clientId" TEXT;

ALTER TABLE "LeadInspection"
ADD CONSTRAINT "LeadInspection_leadId_fkey"
FOREIGN KEY ("leadId") REFERENCES "Lead"("id") ON DELETE SET NULL ON UPDATE CASCADE;

ALTER TABLE "LeadInspection"
ADD CONSTRAINT "LeadInspection_clientId_fkey"
FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

CREATE INDEX "LeadInspection_clientId_idx" ON "LeadInspection"("clientId");
