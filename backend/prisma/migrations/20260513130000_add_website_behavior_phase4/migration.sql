-- CreateTable
CREATE TABLE "WebsiteBehaviorSignal" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "sessionId" TEXT NOT NULL,
    "visitorId" TEXT,
    "recordingId" TEXT,
    "type" TEXT NOT NULL,
    "severity" TEXT NOT NULL,
    "url" TEXT NOT NULL,
    "path" TEXT,
    "title" TEXT,
    "selector" TEXT,
    "message" TEXT,
    "eventIds" JSONB NOT NULL DEFAULT '[]',
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteBehaviorSignal_pkey" PRIMARY KEY ("id")
);

-- CreateTable
CREATE TABLE "WebsiteIssueGroup" (
    "id" TEXT NOT NULL,
    "tenantId" TEXT NOT NULL,
    "siteId" TEXT NOT NULL,
    "type" TEXT NOT NULL,
    "fingerprint" TEXT NOT NULL,
    "url" TEXT,
    "path" TEXT,
    "selector" TEXT,
    "message" TEXT,
    "severity" TEXT NOT NULL,
    "occurrenceCount" INTEGER NOT NULL DEFAULT 0,
    "affectedSessionCount" INTEGER NOT NULL DEFAULT 0,
    "affectedVisitorCount" INTEGER NOT NULL DEFAULT 0,
    "firstSeenAt" TIMESTAMP(3) NOT NULL,
    "lastSeenAt" TIMESTAMP(3) NOT NULL,
    "status" TEXT NOT NULL DEFAULT 'OPEN',
    "metadata" JSONB NOT NULL DEFAULT '{}',
    "createdAt" TIMESTAMP(3) NOT NULL DEFAULT CURRENT_TIMESTAMP,
    "updatedAt" TIMESTAMP(3) NOT NULL,

    CONSTRAINT "WebsiteIssueGroup_pkey" PRIMARY KEY ("id")
);

-- CreateIndex
CREATE INDEX "WebsiteBehaviorSignal_tenantId_idx" ON "WebsiteBehaviorSignal"("tenantId");
CREATE INDEX "WebsiteBehaviorSignal_siteId_idx" ON "WebsiteBehaviorSignal"("siteId");
CREATE INDEX "WebsiteBehaviorSignal_sessionId_idx" ON "WebsiteBehaviorSignal"("sessionId");
CREATE INDEX "WebsiteBehaviorSignal_visitorId_idx" ON "WebsiteBehaviorSignal"("visitorId");
CREATE INDEX "WebsiteBehaviorSignal_type_idx" ON "WebsiteBehaviorSignal"("type");
CREATE INDEX "WebsiteBehaviorSignal_severity_idx" ON "WebsiteBehaviorSignal"("severity");
CREATE INDEX "WebsiteBehaviorSignal_firstSeenAt_idx" ON "WebsiteBehaviorSignal"("firstSeenAt");
CREATE INDEX "WebsiteBehaviorSignal_lastSeenAt_idx" ON "WebsiteBehaviorSignal"("lastSeenAt");
CREATE INDEX "WebsiteBehaviorSignal_tenantId_siteId_type_idx" ON "WebsiteBehaviorSignal"("tenantId", "siteId", "type");

CREATE UNIQUE INDEX "WebsiteIssueGroup_tenantId_siteId_fingerprint_key" ON "WebsiteIssueGroup"("tenantId", "siteId", "fingerprint");
CREATE INDEX "WebsiteIssueGroup_tenantId_idx" ON "WebsiteIssueGroup"("tenantId");
CREATE INDEX "WebsiteIssueGroup_siteId_idx" ON "WebsiteIssueGroup"("siteId");
CREATE INDEX "WebsiteIssueGroup_type_idx" ON "WebsiteIssueGroup"("type");
CREATE INDEX "WebsiteIssueGroup_severity_idx" ON "WebsiteIssueGroup"("severity");
CREATE INDEX "WebsiteIssueGroup_firstSeenAt_idx" ON "WebsiteIssueGroup"("firstSeenAt");
CREATE INDEX "WebsiteIssueGroup_lastSeenAt_idx" ON "WebsiteIssueGroup"("lastSeenAt");
CREATE INDEX "WebsiteIssueGroup_tenantId_siteId_type_idx" ON "WebsiteIssueGroup"("tenantId", "siteId", "type");
CREATE INDEX "WebsiteIssueGroup_tenantId_siteId_status_idx" ON "WebsiteIssueGroup"("tenantId", "siteId", "status");

-- AddForeignKey
ALTER TABLE "WebsiteBehaviorSignal" ADD CONSTRAINT "WebsiteBehaviorSignal_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteBehaviorSignal" ADD CONSTRAINT "WebsiteBehaviorSignal_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteBehaviorSignal" ADD CONSTRAINT "WebsiteBehaviorSignal_sessionId_fkey" FOREIGN KEY ("sessionId") REFERENCES "WebsiteSession"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteBehaviorSignal" ADD CONSTRAINT "WebsiteBehaviorSignal_visitorId_fkey" FOREIGN KEY ("visitorId") REFERENCES "WebsiteVisitor"("id") ON DELETE SET NULL ON UPDATE CASCADE;
ALTER TABLE "WebsiteIssueGroup" ADD CONSTRAINT "WebsiteIssueGroup_tenantId_fkey" FOREIGN KEY ("tenantId") REFERENCES "Tenant"("id") ON DELETE CASCADE ON UPDATE CASCADE;
ALTER TABLE "WebsiteIssueGroup" ADD CONSTRAINT "WebsiteIssueGroup_siteId_fkey" FOREIGN KEY ("siteId") REFERENCES "WebsiteAnalyticsSite"("id") ON DELETE CASCADE ON UPDATE CASCADE;
