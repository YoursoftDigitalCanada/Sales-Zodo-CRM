ALTER TABLE "Email"
ADD COLUMN "mailboxOwnerUserId" TEXT;

DROP INDEX IF EXISTS "Email_messageId_key";

CREATE INDEX "Email_messageId_idx" ON "Email"("messageId");
CREATE INDEX "Email_tenantId_mailboxOwnerUserId_idx" ON "Email"("tenantId", "mailboxOwnerUserId");
CREATE UNIQUE INDEX "Email_tenantId_mailboxOwnerUserId_messageId_key"
ON "Email"("tenantId", "mailboxOwnerUserId", "messageId");

ALTER TABLE "Email"
ADD CONSTRAINT "Email_mailboxOwnerUserId_fkey"
FOREIGN KEY ("mailboxOwnerUserId") REFERENCES "User"("id")
ON DELETE SET NULL
ON UPDATE CASCADE;

UPDATE "Email" AS "e"
SET "mailboxOwnerUserId" = "emp"."userId"
FROM "Employee" AS "emp"
WHERE "e"."sentById" = "emp"."id"
  AND "e"."mailboxOwnerUserId" IS NULL;
