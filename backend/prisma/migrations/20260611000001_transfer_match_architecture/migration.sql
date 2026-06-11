-- AlterTable
ALTER TABLE "BookkeepingTransaction" ADD COLUMN     "duplicateConfidence" DOUBLE PRECISION,
ADD COLUMN     "journalConfidence" DOUBLE PRECISION,
ADD COLUMN     "matchStatus" TEXT NOT NULL DEFAULT 'UNMATCHED',
ADD COLUMN     "merchantConfidence" DOUBLE PRECISION,
ADD COLUMN     "taxConfidence" DOUBLE PRECISION,
ADD COLUMN     "transferConfidence" DOUBLE PRECISION;

-- CreateTable
CREATE TABLE "TransferMatch" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "sourceTransactionId" TEXT NOT NULL,
    "destinationTransactionId" TEXT NOT NULL,
    "matchedAmount" DECIMAL(15,2) NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "matchType" TEXT NOT NULL DEFAULT 'AUTO',
    "status" TEXT NOT NULL DEFAULT 'ACTIVE',
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "TransferMatch_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "TransferMatch_tenantId_idx" ON "TransferMatch"("tenantId");

-- CreateIndex
CREATE UNIQUE INDEX "TransferMatch_sourceTransactionId_destinationTransactionId_key" ON "TransferMatch"("sourceTransactionId", "destinationTransactionId");

-- AddForeignKey
ALTER TABLE "TransferMatch" ADD CONSTRAINT "TransferMatch_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferMatch" ADD CONSTRAINT "TransferMatch_sourceTransactionId_fkey" FOREIGN KEY ("sourceTransactionId") REFERENCES "BookkeepingTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "TransferMatch" ADD CONSTRAINT "TransferMatch_destinationTransactionId_fkey" FOREIGN KEY ("destinationTransactionId") REFERENCES "BookkeepingTransaction"("id") ON DELETE CASCADE ON UPDATE CASCADE;

