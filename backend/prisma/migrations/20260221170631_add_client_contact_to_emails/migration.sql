-- AlterTable
ALTER TABLE "Email" ADD COLUMN     "clientId" TEXT,
ADD COLUMN     "contactId" TEXT;

-- CreateIndex
CREATE INDEX "Email_clientId_idx" ON "Email"("clientId");

-- CreateIndex
CREATE INDEX "Email_contactId_idx" ON "Email"("contactId");

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "Email" ADD CONSTRAINT "Email_contactId_fkey" FOREIGN KEY ("contactId") REFERENCES "Contact"("id") ON DELETE SET NULL ON UPDATE CASCADE;
