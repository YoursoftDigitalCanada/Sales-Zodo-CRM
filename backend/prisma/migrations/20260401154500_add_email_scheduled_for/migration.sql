ALTER TABLE "Email"
ADD COLUMN "scheduledFor" TIMESTAMP(3);

CREATE INDEX "Email_scheduledFor_idx" ON "Email"("scheduledFor");
