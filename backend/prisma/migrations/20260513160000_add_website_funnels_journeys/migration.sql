CREATE TABLE "WebsiteFunnel" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "name" TEXT NOT NULL,
    "description" TEXT,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "segmentId" TEXT,
    "isActive" BOOLEAN NOT NULL DEFAULT true,
    "createdById" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteFunnel_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteFunnelRun" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "funnelId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "dateFrom" TIMESTAMP(3) NOT NULL,
    "dateTo" TIMESTAMP(3) NOT NULL,
    "segmentFilters" JSONB NOT NULL DEFAULT '{}',
    "totalEntrants" INTEGER NOT NULL DEFAULT 0,
    "totalConversions" INTEGER NOT NULL DEFAULT 0,
    "conversionRate" DOUBLE PRECISION NOT NULL DEFAULT 0,
    "results" JSONB NOT NULL DEFAULT '{}',
    "status" TEXT NOT NULL DEFAULT 'PROCESSING',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsiteFunnelRun_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsiteJourneyPath" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sessionId" TEXT,
    "visitorId" TEXT,
    "pathHash" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "stepCount" INTEGER NOT NULL DEFAULT 0,
    "durationMs" INTEGER,
    "converted" BOOLEAN NOT NULL DEFAULT false,
    "conversionEvent" TEXT,
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    CONSTRAINT "WebsiteJourneyPath_pkey" PRIMARY KEY ("id")
);

CREATE TABLE "WebsitePathAggregate" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "pathHash" TEXT NOT NULL,
    "steps" JSONB NOT NULL DEFAULT '[]',
    "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
    "conversionCount" INTEGER NOT NULL DEFAULT 0,
    "avgDurationMs" INTEGER,
    "dateFrom" TIMESTAMP(3),
    "dateTo" TIMESTAMP(3),
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,
    CONSTRAINT "WebsitePathAggregate_pkey" PRIMARY KEY ("id")
);

CREATE INDEX "WebsiteFunnel_tenantId_idx" ON "WebsiteFunnel"("tenantId");
CREATE INDEX "WebsiteFunnel_siteId_idx" ON "WebsiteFunnel"("siteId");
CREATE INDEX "WebsiteFunnel_tenantId_siteId_idx" ON "WebsiteFunnel"("tenantId", "siteId");

CREATE INDEX "WebsiteFunnelRun_tenantId_idx" ON "WebsiteFunnelRun"("tenantId");
CREATE INDEX "WebsiteFunnelRun_siteId_idx" ON "WebsiteFunnelRun"("siteId");
CREATE INDEX "WebsiteFunnelRun_funnelId_idx" ON "WebsiteFunnelRun"("funnelId");
CREATE INDEX "WebsiteFunnelRun_tenantId_siteId_idx" ON "WebsiteFunnelRun"("tenantId", "siteId");
CREATE INDEX "WebsiteFunnelRun_funnelId_createdAt_idx" ON "WebsiteFunnelRun"("funnelId", "createdAt");

CREATE INDEX "WebsiteJourneyPath_tenantId_idx" ON "WebsiteJourneyPath"("tenantId");
CREATE INDEX "WebsiteJourneyPath_siteId_idx" ON "WebsiteJourneyPath"("siteId");
CREATE INDEX "WebsiteJourneyPath_sessionId_idx" ON "WebsiteJourneyPath"("sessionId");
CREATE INDEX "WebsiteJourneyPath_visitorId_idx" ON "WebsiteJourneyPath"("visitorId");
CREATE INDEX "WebsiteJourneyPath_tenantId_siteId_idx" ON "WebsiteJourneyPath"("tenantId", "siteId");
CREATE INDEX "WebsiteJourneyPath_tenantId_siteId_createdAt_idx" ON "WebsiteJourneyPath"("tenantId", "siteId", "createdAt");
CREATE INDEX "WebsiteJourneyPath_tenantId_siteId_pathHash_idx" ON "WebsiteJourneyPath"("tenantId", "siteId", "pathHash");

CREATE INDEX "WebsitePathAggregate_tenantId_idx" ON "WebsitePathAggregate"("tenantId");
CREATE INDEX "WebsitePathAggregate_siteId_idx" ON "WebsitePathAggregate"("siteId");
CREATE INDEX "WebsitePathAggregate_tenantId_siteId_idx" ON "WebsitePathAggregate"("tenantId", "siteId");
CREATE INDEX "WebsitePathAggregate_tenantId_siteId_pathHash_idx" ON "WebsitePathAggregate"("tenantId", "siteId", "pathHash");

ALTER TABLE "WebsiteFunnel" ADD CONSTRAINT "WebsiteFunnel_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteFunnel" ADD CONSTRAINT "WebsiteFunnel_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteFunnelRun" ADD CONSTRAINT "WebsiteFunnelRun_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteFunnelRun" ADD CONSTRAINT "WebsiteFunnelRun_funnelId_fkey" FOREIGN KEY ("funnelId") REFERENCES "WebsiteFunnel"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteFunnelRun" ADD CONSTRAINT "WebsiteFunnelRun_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteJourneyPath" ADD CONSTRAINT "WebsiteJourneyPath_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteJourneyPath" ADD CONSTRAINT "WebsiteJourneyPath_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteJourneyPath" ADD CONSTRAINT "WebsiteJourneyPath_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebsiteJourneyPath" ADD CONSTRAINT "WebsiteJourneyPath_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebsitePathAggregate" ADD CONSTRAINT "WebsitePathAggregate_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsitePathAggregate" ADD CONSTRAINT "WebsitePathAggregate_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
