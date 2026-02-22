-- AlterTable
ALTER TABLE "File" ADD COLUMN     "clientId" TEXT;

-- CreateIndex
CREATE INDEX "File_clientId_idx" ON "File"("clientId");

-- AddForeignKey
ALTER TABLE "File" ADD CONSTRAINT "File_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;
