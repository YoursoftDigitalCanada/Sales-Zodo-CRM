-- CreateTable
CREATE TABLE "WebsiteHeatmapSnapshot" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT NOT NULL,
    "deviceType" TEXT,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "clickCount" INTEGER NOT NULL DEFAULT 0,
    "scrollSampleCount" INTEGER NOT NULL DEFAULT 0,
    "engagementSampleCount" INTEGER NOT NULL DEFAULT 0,
    "maxScrollDepth" INTEGER,
    "avgScrollDepth" DOUBLE PRECISION,
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "storagePath" TEXT,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteHeatmapSnapshot_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteHeatmapPoint" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "snapshotId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "x" INTEGER,
    "y" INTEGER,
    "normalizedX" DOUBLE PRECISION,
    "normalizedY" DOUBLE PRECISION,
    "value" DOUBLE PRECISION NOT NULL DEFAULT 1,
    "viewportWidth" INTEGER,
    "viewportHeight" INTEGER,
    "selector" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,

    CONSTRAINT "WebsiteHeatmapPoint_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteHeatmapSnapshot_tenantId_idx" ON "WebsiteHeatmapSnapshot"("tenantId");
CREATE INDEX "WebsiteHeatmapSnapshot_siteId_idx" ON "WebsiteHeatmapSnapshot"("siteId");
CREATE INDEX "WebsiteHeatmapSnapshot_tenantId_siteId_path_idx" ON "WebsiteHeatmapSnapshot"("tenantId", "siteId", "path");
CREATE INDEX "WebsiteHeatmapSnapshot_tenantId_siteId_dateFrom_dateTo_idx" ON "WebsiteHeatmapSnapshot"("tenantId", "siteId", "dateFrom", "dateTo");

CREATE INDEX "WebsiteHeatmapPoint_tenantId_idx" ON "WebsiteHeatmapPoint"("tenantId");
CREATE INDEX "WebsiteHeatmapPoint_siteId_idx" ON "WebsiteHeatmapPoint"("siteId");
CREATE INDEX "WebsiteHeatmapPoint_snapshotId_idx" ON "WebsiteHeatmapPoint"("snapshotId");
CREATE INDEX "WebsiteHeatmapPoint_snapshotId_type_idx" ON "WebsiteHeatmapPoint"("snapshotId", "type");

-- AddForeignKey
ALTER TABLE "WebsiteHeatmapSnapshot" ADD CONSTRAINT "WebsiteHeatmapSnapshot_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteHeatmapSnapshot" ADD CONSTRAINT "WebsiteHeatmapSnapshot_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteHeatmapPoint" ADD CONSTRAINT "WebsiteHeatmapPoint_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteHeatmapPoint" ADD CONSTRAINT "WebsiteHeatmapPoint_snapshotId_fkey" FOREIGN KEY ("snapshotId") REFERENCES "WebsiteHeatmapSnapshot"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteHeatmapPoint" ADD CONSTRAINT "WebsiteHeatmapPoint_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
