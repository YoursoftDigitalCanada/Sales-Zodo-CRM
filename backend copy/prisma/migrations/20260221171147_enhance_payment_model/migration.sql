/*
  Warnings:

  - Added the required column `clientId` to the `InvoicePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `tenantId` to the `InvoicePayment` table without a default value. This is not possible if the table is not empty.
  - Added the required column `updatedAt` to the `InvoicePayment` table without a default value. This is not possible if the table is not empty.

*/
-- AlterEnum
ALTER TYPE "PaymentMethod" ADD VALUE 'E_TRANSFER';

-- AlterTable
ALTER TABLE "InvoicePayment" ADD COLUMN     "clientId" TEXT NOT NULL,
ADD COLUMN     "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
ADD COLUMN     "tenantId" TEXT NOT NULL,
ADD COLUMN     "updatedAt" TIMESTAMP(3) NOT NULL,
ALTER COLUMN "invoiceId" DROP NOT NULL;

-- CreateIndex
CREATE INDEX "InvoicePayment_clientId_idx" ON "InvoicePayment"("clientId");

-- CreateIndex
CREATE INDEX "InvoicePayment_tenantId_idx" ON "InvoicePayment"("tenantId");

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE RESTRICT ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "InvoicePayment" ADD CONSTRAINT "InvoicePayment_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
