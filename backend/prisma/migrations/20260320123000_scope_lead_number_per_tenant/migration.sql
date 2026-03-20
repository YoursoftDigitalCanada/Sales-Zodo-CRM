DROP INDEX IF EXISTS "Lead_leadNumber_key";

CREATE UNIQUE INDEX "Lead_tenantId_leadNumber_key" ON "Lead"("tenantId", "leadNumber");
