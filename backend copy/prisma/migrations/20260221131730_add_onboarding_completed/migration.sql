-- AlterTable
ALTER TABLE "Tenant" ADD COLUMN     "onboardingCompleted" BOOLEAN NOT NULL DEFAULT false;

-- CreateTable
CREATE TABLE "RoofEstimate" (
    "id" TEXT NOT NULL,
    "address" TEXT NOT NULL,
    "latitude" DOUBLE PRECISION NOT NULL,
    "longitude" DOUBLE PRECISION NOT NULL,
    "satelliteImageUrl" TEXT,
    "roofAreaSqft" DOUBLE PRECISION NOT NULL,
    "confidence" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "processingTimeSec" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "aiModel" TEXT NOT NULL DEFAULT 'yolov8n-seg-cpu',
    "pricePerSqft" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "manualAdjustment" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "totalEstimate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "snowMode" BOOLEAN NOT NULL DEFAULT false,
    "notes" TEXT,
    "pdfUrl" TEXT,
    "tenantId" TEXT NOT NULL,
    "clientId" TEXT,
    "createdBy" TEXT NOT NULL,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoofEstimate_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "RoofEstimateSettings" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "defaultPricePerSqft" DOUBLE PRECISION NOT NULL DEFAULT 5.50,
    "currency" TEXT NOT NULL DEFAULT 'CAD',
    "snowModeDefault" BOOLEAN NOT NULL DEFAULT true,
    "companyName" TEXT,
    "companyLogo" TEXT,
    "companyPhone" TEXT,
    "companyEmail" TEXT,
    "companyAddress" TEXT,
    "pdfFooterText" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "RoofEstimateSettings_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "RoofEstimate_tenantId_idx" ON "RoofEstimate"("tenantId");

-- CreateIndex
CREATE INDEX "RoofEstimate_clientId_idx" ON "RoofEstimate"("clientId");

-- CreateIndex
CREATE INDEX "RoofEstimate_createdAt_idx" ON "RoofEstimate"("createdAt");

-- CreateIndex
CREATE UNIQUE INDEX "RoofEstimateSettings_tenantId_key" ON "RoofEstimateSettings"("tenantId");

-- AddForeignKey
ALTER TABLE "RoofEstimate" ADD CONSTRAINT "RoofEstimate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoofEstimate" ADD CONSTRAINT "RoofEstimate_clientId_fkey" FOREIGN KEY ("clientId") REFERENCES "Client"("id") ON DELETE SET NULL ON UPDATE CASCADE;

-- AddForeignKey
ALTER TABLE "RoofEstimateSettings" ADD CONSTRAINT "RoofEstimateSettings_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
