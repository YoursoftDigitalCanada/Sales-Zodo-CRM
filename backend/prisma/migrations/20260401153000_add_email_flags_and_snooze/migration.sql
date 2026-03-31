ALTER TABLE "Email"
ADD COLUMN "isImportant" BOOLEAN NOT NULL DEFAULT false,
ADD COLUMN "snoozedUntil" TIMESTAMP(3);

CREATE INDEX "Email_isImportant_idx" ON "Email"("isImportant");
CREATE INDEX "Email_snoozedUntil_idx" ON "Email"("snoozedUntil");
