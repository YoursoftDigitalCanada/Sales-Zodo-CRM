ALTER TABLE "TaskTag"
ADD COLUMN "tenantId" TEXT;

UPDATE "TaskTag" AS "taskTag"
SET "tenantId" = "task"."tenantId"
FROM "Task" AS "task"
WHERE "taskTag"."taskId" = "task"."id";

ALTER TABLE "TaskTag"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "TaskTag"
ADD CONSTRAINT "TaskTag_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "TaskTag_tenantId_idx" ON "TaskTag"("tenantId");
CREATE UNIQUE INDEX "TaskTag_id_tenantId_key" ON "TaskTag"("id", "tenantId");


ALTER TABLE "CalendarEventAttendee"
ADD COLUMN "tenantId" TEXT;

UPDATE "CalendarEventAttendee" AS "attendee"
SET "tenantId" = "event"."tenantId"
FROM "CalendarEvent" AS "event"
WHERE "attendee"."eventId" = "event"."id";

ALTER TABLE "CalendarEventAttendee"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "CalendarEventAttendee"
ADD CONSTRAINT "CalendarEventAttendee_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "CalendarEventAttendee_tenantId_idx" ON "CalendarEventAttendee"("tenantId");
CREATE UNIQUE INDEX "CalendarEventAttendee_id_tenantId_key" ON "CalendarEventAttendee"("id", "tenantId");


ALTER TABLE "InvoiceItem"
ADD COLUMN "tenantId" TEXT;

UPDATE "InvoiceItem" AS "invoiceItem"
SET "tenantId" = "invoice"."tenantId"
FROM "Invoice" AS "invoice"
WHERE "invoiceItem"."invoiceId" = "invoice"."id";

ALTER TABLE "InvoiceItem"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "InvoiceItem"
ADD CONSTRAINT "InvoiceItem_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "InvoiceItem_tenantId_idx" ON "InvoiceItem"("tenantId");
CREATE UNIQUE INDEX "InvoiceItem_id_tenantId_key" ON "InvoiceItem"("id", "tenantId");


ALTER TABLE "QuoteItem"
ADD COLUMN "tenantId" TEXT;

UPDATE "QuoteItem" AS "quoteItem"
SET "tenantId" = "quote"."tenantId"
FROM "Quote" AS "quote"
WHERE "quoteItem"."quoteId" = "quote"."id";

ALTER TABLE "QuoteItem"
ALTER COLUMN "tenantId" SET NOT NULL;

ALTER TABLE "QuoteItem"
ADD CONSTRAINT "QuoteItem_tenantId_fkey"
FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id")
ON DELETE CASCADE
ON UPDATE CASCADE;

CREATE INDEX "QuoteItem_tenantId_idx" ON "QuoteItem"("tenantId");
CREATE UNIQUE INDEX "QuoteItem_id_tenantId_key" ON "QuoteItem"("id", "tenantId");
